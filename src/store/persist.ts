// localStorage persistence — named world slots plus an autosave.
// A save only needs params + hand edits; the world grids regenerate from params.

import { computeRoads } from "../core/worldgen";
import { buildWorld } from "../core/worldgen";
import type { BiomeKey, SaveFile } from "../core/types";
import type { HexState } from "./useStore";

const SLOTS_KEY = "hexwright.saves.v1";
const AUTOSAVE_KEY = "hexwright.autosave.v1";

export interface SlotMeta {
  name: string;
  savedAt: number;
  seed: string;
}

interface SlotRecord {
  savedAt: number;
  file: SaveFile;
}

/** Build the serializable save payload from current store state. */
export function serialize(s: HexState): SaveFile {
  return {
    version: 1,
    params: s.params,
    paint: s.paint,
    objects: s.objects,
    realmNames: s.realmNames,
    party: s.party,
    day: s.day,
    journal: s.journal,
    revealed: s.revealed ? Array.from(s.revealed) : [],
    layers: s.layers,
    theme: s.theme,
  };
}

/**
 * Reconstruct a store patch from a save file. World grids are regenerated from
 * params; saved objects (with their edits) are restored verbatim and roads
 * recomputed from them.
 */
export function deserialize(file: SaveFile): Partial<HexState> {
  const keep = {
    paint: file.paint || {},
    realmNames: file.realmNames || {},
    objects: file.objects || [],
  };
  const { world } = buildWorld(file.params, keep);
  // Override with the saved objects so edits to generated holdings survive.
  const objects = file.objects || [];
  world.roads = computeRoads(world, objects);
  world.hexMiles = file.params.hexMiles;
  return {
    params: { ...file.params },
    paint: (file.paint || {}) as Record<number, BiomeKey>,
    realmNames: file.realmNames || {},
    world,
    objects,
    party: file.party,
    day: file.day,
    journal: file.journal || [],
    revealed: new Set<number>(file.revealed || []),
    layers: file.layers,
    theme: file.theme,
    selected: null,
    waypoints: [],
    hover: null,
    drag: null,
  };
}

function readSlots(): Record<string, SlotRecord> {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SlotRecord>) : {};
  } catch {
    return {};
  }
}

function writeSlots(slots: Record<string, SlotRecord>): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

export function listSlots(): SlotMeta[] {
  const slots = readSlots();
  return Object.keys(slots)
    .map((name) => ({
      name,
      savedAt: slots[name].savedAt,
      seed: slots[name].file.params.seed,
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function saveSlot(name: string, s: HexState): void {
  const slots = readSlots();
  slots[name] = { savedAt: Date.now(), file: serialize(s) };
  writeSlots(slots);
}

export function readSlot(name: string): SaveFile | null {
  const slots = readSlots();
  return slots[name] ? slots[name].file : null;
}

export function deleteSlot(name: string): void {
  const slots = readSlots();
  delete slots[name];
  writeSlots(slots);
}

export function writeAutosave(s: HexState): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serialize(s)));
  } catch {
    /* quota or serialization failure — ignore, autosave is best-effort */
  }
}

export function readAutosave(): SaveFile | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveFile) : null;
  } catch {
    return null;
  }
}

/** Download the current world as a portable .hexwright.json file. */
export function exportToFile(s: HexState): void {
  const file = serialize(s);
  const safe = (file.params.seed || "world").replace(/[^\w.-]+/g, "_");
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe + ".hexwright.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Read and validate a world file chosen from disk. */
export async function importFromFile(file: File): Promise<SaveFile> {
  const text = await file.text();
  const parsed = JSON.parse(text) as SaveFile;
  if (!parsed || typeof parsed !== "object" || !parsed.params) {
    throw new Error("Not a Hexwright world file.");
  }
  return parsed;
}
