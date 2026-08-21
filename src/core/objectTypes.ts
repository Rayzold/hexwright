import type { Allegiance, MapObject, ObjectType } from "./types";

export type MarkShape = "circle" | "square" | "poly";

export interface TypeMeta {
  label: string;
  /** settlements get roads and a filled-paper glyph; sites get a colored polygon. */
  category: "settlement" | "site";
  road: boolean;
  shape: MarkShape;
  /** outer radius (circle/square) */
  r: number;
  /** inner dot radius (settlements) */
  inner: number;
  /** polygon points (sites), centered on origin */
  poly?: string;
  defaultAllegiance: Allegiance;
}

export const OBJECT_TYPES: Record<ObjectType, TypeMeta> = {
  city: { label: "City", category: "settlement", road: true, shape: "circle", r: 5, inner: 2, defaultAllegiance: "friendly" },
  town: { label: "Town", category: "settlement", road: true, shape: "circle", r: 3.8, inner: 1.3, defaultAllegiance: "friendly" },
  village: { label: "Village", category: "settlement", road: true, shape: "circle", r: 2.7, inner: 1.3, defaultAllegiance: "friendly" },
  keep: { label: "Keep", category: "settlement", road: true, shape: "circle", r: 3.8, inner: 1.3, defaultAllegiance: "friendly" },
  fort: { label: "Fort", category: "settlement", road: true, shape: "square", r: 3.7, inner: 1.3, defaultAllegiance: "neutral" },
  tower: { label: "Tower", category: "settlement", road: true, shape: "circle", r: 2.8, inner: 1.1, defaultAllegiance: "neutral" },
  ruin: { label: "Ruin", category: "site", road: false, shape: "poly", r: 4, inner: 0, poly: "-4,-4 4,-4 4,4 -4,4", defaultAllegiance: "neutral" },
  dungeon: { label: "Dungeon", category: "site", road: false, shape: "poly", r: 5, inner: 0, poly: "0,-5 4.4,0 0,5 -4.4,0", defaultAllegiance: "neutral" },
  camp: { label: "Camp", category: "site", road: false, shape: "poly", r: 4.6, inner: 0, poly: "0,-4.6 4.2,4 -4.2,4", defaultAllegiance: "neutral" },
  lair: { label: "Lair", category: "site", road: false, shape: "poly", r: 5, inner: 0, poly: "0,-5 4.8,-1.5 3,4.5 -3,4.5 -4.8,-1.5", defaultAllegiance: "hostile" },
  shrine: { label: "Shrine", category: "site", road: false, shape: "poly", r: 5, inner: 0, poly: "0,-5.2 4,-1.6 4,4.4 -4,4.4 -4,-1.6", defaultAllegiance: "neutral" },
  cave: { label: "Cave", category: "site", road: false, shape: "poly", r: 4.6, inner: 0, poly: "-4.4,4 -4.4,-0.5 0,-4.8 4.4,-0.5 4.4,4 1.8,4 1.8,0.6 -1.8,0.6 -1.8,4", defaultAllegiance: "neutral" },
  monument: { label: "Monument", category: "site", road: false, shape: "poly", r: 5, inner: 0, poly: "-1.8,-5 1.8,-5 1.2,5 -1.2,5", defaultAllegiance: "neutral" },
};

export const SETTLEMENT_TYPES: ObjectType[] = (
  Object.keys(OBJECT_TYPES) as ObjectType[]
).filter((t) => OBJECT_TYPES[t].category === "settlement");

export const SITE_TYPES: ObjectType[] = (
  Object.keys(OBJECT_TYPES) as ObjectType[]
).filter((t) => OBJECT_TYPES[t].category === "site");

/** Types that get a place label on the map when the Names layer is on. */
export const LABELED_TYPES = new Set<ObjectType>([
  "city", "town", "keep", "fort", "tower", "dungeon", "lair", "shrine", "monument",
]);

export function isSettlement(type: ObjectType): boolean {
  return OBJECT_TYPES[type]?.category === "settlement";
}

export function hasRoads(type: ObjectType): boolean {
  return !!OBJECT_TYPES[type]?.road;
}

export const ALLEGIANCE_COLOR: Record<Allegiance, string> = {
  friendly: "#5f8a72",
  neutral: "#9a8f7c",
  hostile: "#c0402f",
};

export const ALLEGIANCE_LABEL: Record<Allegiance, string> = {
  friendly: "Friendly",
  neutral: "Neutral",
  hostile: "Hostile",
};

/** The crimson used for hostile rings and danger markers on the map. */
export const DANGER = "#c0402f";

/** Map of hex -> summed threat of active (uncleared) hostile objects there. */
export function hostileThreatMap(objects: MapObject[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const o of objects) {
    if (o.allegiance === "hostile" && !o.cleared) {
      m.set(o.hex, (m.get(o.hex) || 0) + o.threat);
    }
  }
  return m;
}

/**
 * Fill missing fields on an object loaded from an older save or a hand-authored
 * file, so the extended model is always complete.
 */
export function normalizeObject(o: Partial<MapObject>): MapObject {
  const type = (o.type && OBJECT_TYPES[o.type] ? o.type : "ruin") as ObjectType;
  return {
    id: o.id ?? "o" + Math.random().toString(36).slice(2),
    gen: o.gen ?? false,
    type,
    name: o.name ?? "",
    hex: o.hex ?? 0,
    pop: o.pop ?? 0,
    notes: o.notes ?? "",
    allegiance: o.allegiance ?? OBJECT_TYPES[type].defaultAllegiance,
    threat: o.threat ?? 0,
    cleared: o.cleared ?? false,
  };
}
