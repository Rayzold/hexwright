// Hand-authored campaign map: New Grandia / The Scarred Lands.
// A 100x72 map divided into a 5x5 grid (columns 1-5, rows A-E). Region
// boundaries are domain-warped so they read as rounded blobs rather than
// rectangles, and the Scar is drawn as a tall central oval. Every hex is
// painted; the named regions and holdings are placed by hand.

import { vnoise } from "../core/rng";
import { CAMPAIGN_START_DAY } from "../core/travel";
import type { BiomeKey, MapObject, ObjectType, SaveFile } from "../core/types";

const W = 100;
const H = 72;

/** Deterministic 0..1 hash noise for a hex (crisp, per-hex variation). */
function noise(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Low-frequency domain warp — pushes cell boundaries into rounded lobes. */
const WARP = 10;
function warp(c: number, r: number): [number, number] {
  const wx = (vnoise(c * 0.08, r * 0.08, 7) - 0.5) * 2 * WARP;
  const wy = (vnoise(c * 0.08 + 40, r * 0.08 + 40, 13) - 0.5) * 2 * WARP;
  return [c + wx, r + wy];
}

// The Scar — a tall oval near the map centre, with an organic wobbly edge.
const SCAR = { cx: 50, cy: 36, rx: 13, ry: 23 };
function inScar(c: number, r: number): boolean {
  const ex = (c - SCAR.cx) / SCAR.rx;
  const ey = (c === SCAR.cx && r === SCAR.cy ? 0 : (r - SCAR.cy) / SCAR.ry);
  const d = ex * ex + ey * ey;
  const edge = 1 + (vnoise(c * 0.12 + 3, r * 0.12 + 3, 21) - 0.5) * 0.5;
  return d < edge;
}

/**
 * Biome for a hex, from its (warped) grid cell.
 *
 *      col1        col2        col3         col4          col5
 *  A   frozen      frozen      frozen/Thnd  mountains     mountains
 *  B   frzn mtns   mtn→plains  plains       plains        plains (Fur Wehn)
 *  C   mtns+trees  plains      plains       New Grandia   volcano
 *  D   lush forest Wyldermoore plains       plains        volcanic
 *  E   forest      forest/plns The Bog      desert        mountains
 *
 * The Scar oval overlays columns 2–3, rows B–D.
 */
function biomeAt(c: number, r: number): BiomeKey {
  const n = noise(c * 13 + 2, r * 11 + 8);

  // The Scar takes precedence over the base region.
  if (inScar(c, r)) {
    if (n < 0.12) return "mountains"; // rocky veins
    if (n > 0.9) return "hills";
    return "scar";
  }

  const [cw, rw] = warp(c, r);
  const ccF = (cw / W) * 5;
  const crF = (rw / H) * 5;
  const cc = Math.max(0, Math.min(4, Math.floor(ccF)));
  const cr = Math.max(0, Math.min(4, Math.floor(crF)));
  const fx = ccF - cc;
  const fy = crF - cr;

  // Row A — the frozen north edge.
  if (cr === 0) {
    if (cc <= 1) return n < 0.22 ? "tundra" : "snow";
    if (cc === 2) return fy >= 0.55 ? "mountains" : "snow"; // Thundermount slopes
    return fy < 0.3 || n < 0.2 ? "snow" : "mountains";
  }
  // Row B.
  if (cr === 1) {
    if (cc === 0) return fy < 0.3 || n < 0.25 ? "snow" : "mountains";
    if (cc === 1) return fy < 0.45 ? "mountains" : n < 0.15 ? "forest" : "grass";
    if (cc === 2) return n < 0.14 ? "forest" : "grass";
    if (cc === 3) return n < 0.14 ? "forest" : "grass";
    return n < 0.1 ? "forest" : "grass"; // B5 Fur Wehn
  }
  // Row C.
  if (cr === 2) {
    if (cc === 0) return n < 0.4 ? "forest" : "mountains"; // mountains + trees
    if (cc === 1) return n < 0.12 ? "forest" : "grass";
    if (cc === 2) return n < 0.1 ? "forest" : "grass";
    if (cc === 3) return n < 0.1 ? "forest" : "grass"; // New Grandia plains
    return n < 0.28 ? "scar" : "mountains"; // C5 volcanic
  }
  // Row D.
  if (cr === 3) {
    if (cc === 0) return n < 0.5 ? "jungle" : "forest"; // lush
    if (cc === 1) return n < 0.2 ? "jungle" : "forest"; // Wyldermoore
    if (cc === 2) return n < 0.12 ? "forest" : "grass";
    if (cc === 3) return n < 0.12 ? "forest" : "grass";
    return n < 0.35 ? "scar" : "mountains"; // D5 volcanic
  }
  // Row E — the southern belt.
  if (cc === 0) return n < 0.15 ? "jungle" : "forest";
  if (cc === 1) return fx < 0.5 ? (n < 0.15 ? "jungle" : "forest") : "grass";
  if (cc === 2) return n < 0.12 ? "grass" : "swamp"; // The Bog
  if (cc === 3) return n < 0.1 ? "hills" : "desert";
  return fy < 0.3 || n < 0.2 ? "snow" : "mountains"; // E5
}

const idx = (c: number, r: number) => r * W + c;

interface ObjSpec {
  type: ObjectType;
  name: string;
  c: number;
  r: number;
  pop?: number;
  allegiance?: MapObject["allegiance"];
  threat?: number;
  notes?: string;
}

const OBJ_SPECS: ObjSpec[] = [
  // The named powers
  { type: "city", name: "Thundermount", c: 50, r: 11, pop: 30000, notes: "The most advanced city, raised on a crystalline ore mountain." },
  { type: "city", name: "New Grandia", c: 70, r: 36, pop: 42000, notes: "The Free City. Seat of the Council of Elders." },
  { type: "tower", name: "The Grand Observatory", c: 75, r: 31, pop: 400, notes: "Scientific and military watch; it predicts the weather." },
  { type: "city", name: "Fur Wehn", c: 90, r: 22, pop: 16000, notes: "The far east — Wehnfolk, powerful and reclusive." },
  { type: "city", name: "Wyldermoore", c: 30, r: 50, pop: 15000, notes: "A living-wood city; the dead never fully leave." },
  { type: "city", name: "Memento", c: 50, r: 58, pop: 22000, notes: "City of alleys below, ruled by the Dawn and Dusk councils." },

  // The Scar (the oval down the centre)
  { type: "lair", name: "Heart of the Scar", c: 50, r: 36, allegiance: "hostile", threat: 5, notes: "The epicenter of the Scarring, wrapped in perpetual mist." },
  { type: "ruin", name: "The Ashen Reliquary", c: 50, r: 20, allegiance: "neutral", threat: 2, notes: "A ruin near the northern lip of the Scar." },

  // The Celestial Volcano (east flank)
  { type: "monument", name: "The Celestial Volcano", c: 92, r: 40, allegiance: "neutral", threat: 3, notes: "The Throne in the Volcano; its Lords are at war." },
  { type: "lair", name: "The Throne", c: 94, r: 47, allegiance: "hostile", threat: 5, notes: "A warring Lord holds the caldera." },

  // The Bog (E3)
  { type: "cave", name: "The Submerged Ruins", c: 53, r: 64, allegiance: "neutral", threat: 2, notes: "Lights beneath the Bog answer when called." },
  { type: "lair", name: "The Drowned Warren", c: 45, r: 64, allegiance: "hostile", threat: 3 },

  // Frontier holdings and sites
  { type: "town", name: "Ashreach", c: 70, r: 22, pop: 2400, notes: "A plains town on the eastern road." },
  { type: "town", name: "Motefall", c: 70, r: 50, pop: 1900, notes: "A plains town south of the Scar." },
  { type: "fort", name: "Vergehold", c: 30, r: 34, pop: 300, notes: "A frontier fort watching the western passes." },
  { type: "village", name: "Gristwend", c: 40, r: 44, pop: 320 },
  { type: "ruin", name: "The Rusted Vault", c: 70, r: 64, allegiance: "neutral", threat: 1, notes: "A pre-Scarring vault half-buried in the desert." },
  { type: "shrine", name: "The Silent Fane", c: 12, r: 64, allegiance: "neutral", threat: 1 },
];

function makeObject(spec: ObjSpec, k: number): MapObject {
  return {
    id: "pm" + k,
    gen: false,
    type: spec.type,
    name: spec.name,
    hex: idx(spec.c, spec.r),
    pop: spec.pop ?? 0,
    notes: spec.notes ?? "",
    allegiance: spec.allegiance ?? "friendly",
    threat: spec.threat ?? 0,
    cleared: false,
  };
}

/** Build the New Grandia save file. */
export function buildNewGrandiaSave(): SaveFile {
  const paint: Record<number, BiomeKey> = {};
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      paint[idx(c, r)] = biomeAt(c, r);
    }
  }
  const objects = OBJ_SPECS.map(makeObject);
  return {
    version: 1,
    params: {
      seed: "New Grandia",
      size: "huge",
      hexMiles: 8,
      sea: 42,
      climate: 48,
      wet: 52,
      mountains: 60,
      rivers: 40,
      settlements: 20,
      pois: 10,
      menace: 20,
      edge: "sea",
      nameStyle: "scarred",
    },
    paint,
    objects,
    realmNames: {},
    party: { speed: "foot", march: false, season: "embers", weather: "clear" },
    day: CAMPAIGN_START_DAY,
    journal: [],
    revealed: [],
    // Realms are procedural, so the border layer is left off for this hand map.
    layers: { grid: true, rivers: true, roads: true, borders: false, labels: true },
    theme: "parchment",
  };
}
