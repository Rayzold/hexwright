// Hand-authored campaign map: New Grandia / The Scarred Lands.
// A 70x50 map divided into a 5x5 grid (columns 1-5, rows A-E). Every hex is
// painted to the referee's layout; the named regions and holdings are placed by
// hand. Loaded from the Worlds menu (Premade section).

import { CAMPAIGN_START_DAY } from "../core/travel";
import type { BiomeKey, MapObject, ObjectType, SaveFile } from "../core/types";

const W = 70;
const H = 50;
const CELL_W = 14; // 5 columns
const CELL_H = 10; // 5 rows

/** Deterministic 0..1 hash noise for a hex. */
function noise(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * Biome for a hex, from its grid cell. Cell boundaries are jittered a little so
 * the regions don't read as hard rectangles.
 *
 *      col1        col2        col3(Scar)   col4          col5
 *  A   frozen      frozen      frozen/Thnd  mountains     mountains
 *  B   frzn mtns   mtn→plains  Scar top     plains        plains (Fur Wehn)
 *  C   mtns+trees  plains      Scar center  New Grandia   volcano
 *  D   lush forest Wyldermoore Scar bottom  plains        volcanic
 *  E   forest      forest/plns The Bog      desert        mountains
 */
function biomeAt(c: number, r: number): BiomeKey {
  const jx = (noise(c * 3 + 1, r * 7 + 5) - 0.5) * 3.2;
  const jy = (noise(c * 5 + 9, r * 2 + 3) - 0.5) * 2.2;
  const cc = Math.max(0, Math.min(4, Math.floor((c + jx) / CELL_W)));
  const cr = Math.max(0, Math.min(4, Math.floor((r + jy) / CELL_H)));
  const fx = (c - cc * CELL_W) / CELL_W;
  const fy = (r - cr * CELL_H) / CELL_H;
  const n = noise(c * 13 + 2, r * 11 + 8);

  // The Scar — a blighted band down column 3, rows B/C/D.
  if (cc === 2 && cr >= 1 && cr <= 3) {
    if (n < 0.12) return "mountains"; // rocky veins
    if (n > 0.93 && cr === 2) return "hills";
    return "scar";
  }

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
    if (cc === 3) return n < 0.14 ? "forest" : "grass";
    if (cc === 4) return n < 0.1 ? "forest" : "grass";
  }
  // Row C.
  if (cr === 2) {
    if (cc === 0) return n < 0.4 ? "forest" : "mountains"; // mountains + trees
    if (cc === 1) return n < 0.12 ? "forest" : "grass";
    if (cc === 3) return n < 0.1 ? "forest" : "grass"; // New Grandia plains
    if (cc === 4) return n < 0.28 ? "scar" : "mountains"; // volcanic
  }
  // Row D.
  if (cr === 3) {
    if (cc === 0) return n < 0.5 ? "jungle" : "forest"; // lush
    if (cc === 1) return n < 0.2 ? "jungle" : "forest"; // Wyldermoore
    if (cc === 3) return n < 0.12 ? "forest" : "grass";
    if (cc === 4) return n < 0.35 ? "scar" : "mountains"; // volcanic
  }
  // Row E — the southern belt.
  if (cr === 4) {
    if (cc === 0) return n < 0.15 ? "jungle" : "forest";
    if (cc === 1) return fx < 0.5 ? (n < 0.15 ? "jungle" : "forest") : "grass";
    if (cc === 2) return n < 0.12 ? "grass" : "swamp"; // The Bog
    if (cc === 3) return n < 0.1 ? "hills" : "desert";
    if (cc === 4) return fy < 0.3 || n < 0.2 ? "snow" : "mountains";
  }
  return "grass";
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
  // The four cities and the named powers
  { type: "city", name: "Thundermount", c: 34, r: 8, pop: 30000, notes: "The most advanced city, raised on a crystalline ore mountain." },
  { type: "city", name: "New Grandia", c: 48, r: 25, pop: 42000, notes: "The Free City. Seat of the Council of Elders." },
  { type: "tower", name: "The Grand Observatory", c: 52, r: 22, pop: 400, notes: "Scientific and military watch; it predicts the weather." },
  { type: "city", name: "Fur Wehn", c: 62, r: 15, pop: 16000, notes: "The far east — Wehnfolk, powerful and reclusive." },
  { type: "city", name: "Wyldermoore", c: 20, r: 35, pop: 15000, notes: "A living-wood city; the dead never fully leave." },
  { type: "city", name: "Memento", c: 34, r: 40, pop: 22000, notes: "City of alleys below, ruled by the Dawn and Dusk councils." },

  // The Scar
  { type: "lair", name: "Heart of the Scar", c: 34, r: 25, allegiance: "hostile", threat: 5, notes: "The epicenter of the Scarring, wrapped in perpetual mist." },
  { type: "ruin", name: "The Ashen Reliquary", c: 34, r: 14, allegiance: "neutral", threat: 2, notes: "A ruin at the northern lip of the Scar." },

  // The Celestial Volcano
  { type: "monument", name: "The Celestial Volcano", c: 65, r: 27, allegiance: "neutral", threat: 3, notes: "The Throne in the Volcano; its Lords are at war." },
  { type: "lair", name: "The Throne", c: 66, r: 33, allegiance: "hostile", threat: 5, notes: "A warring Lord holds the caldera." },

  // The Bog
  { type: "cave", name: "The Submerged Ruins", c: 37, r: 46, allegiance: "neutral", threat: 2, notes: "Lights beneath the Bog answer when called." },
  { type: "lair", name: "The Drowned Warren", c: 31, r: 46, allegiance: "hostile", threat: 3 },

  // Frontier holdings and sites
  { type: "town", name: "Ashreach", c: 48, r: 15, pop: 2400, notes: "A plains town on the eastern road." },
  { type: "town", name: "Motefall", c: 48, r: 35, pop: 1900, notes: "A plains town south of the Scar." },
  { type: "fort", name: "Vergehold", c: 20, r: 24, pop: 300, notes: "A frontier fort watching the western passes." },
  { type: "village", name: "Gristwend", c: 30, r: 30, pop: 320 },
  { type: "ruin", name: "The Rusted Vault", c: 48, r: 45, allegiance: "neutral", threat: 1, notes: "A pre-Scarring vault half-buried in the desert." },
  { type: "shrine", name: "The Silent Fane", c: 20, r: 45, allegiance: "neutral", threat: 1 },
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
      size: "large",
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
