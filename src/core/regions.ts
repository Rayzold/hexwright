// Region presets — bias generation toward the feel of each of the 14 Scarred
// Lands regions. Each preset sets a fitting seed name and the flavour sliders
// (climate/wetness/uplift/watercourses/habitation/wild sites/menace); it leaves
// size, edge, miles-per-hex, and naming untouched so the referee keeps control.

import type { Params } from "./types";

export interface RegionPreset {
  id: string;
  name: string;
  blurb: string;
  /** partial generation params to merge (seed + flavour sliders). */
  params: Partial<Params>;
}

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: "grandia",
    name: "New Grandia",
    blurb: "The Free City and its temperate hinterland.",
    params: { seed: "New Grandia", climate: 55, wet: 50, mountains: 45, rivers: 55, settlements: 72, pois: 40, menace: 20 },
  },
  {
    id: "memento",
    name: "Memento",
    blurb: "City of alleys below — dim, crowded, watched.",
    params: { seed: "Memento", climate: 40, wet: 55, mountains: 50, rivers: 50, settlements: 66, pois: 55, menace: 38 },
  },
  {
    id: "thundermount",
    name: "Thundermount",
    blurb: "The most advanced city on a crystalline ore mountain.",
    params: { seed: "Thundermount", climate: 30, wet: 40, mountains: 90, rivers: 45, settlements: 42, pois: 55, menace: 40 },
  },
  {
    id: "wyldermoore",
    name: "Wyldermoore",
    blurb: "A living-wood city where the dead never fully leave.",
    params: { seed: "Wyldermoore", climate: 60, wet: 85, mountains: 35, rivers: 68, settlements: 46, pois: 62, menace: 38 },
  },
  {
    id: "scar",
    name: "The Scar",
    blurb: "The immense canyon at the epicenter, wrapped in perpetual mist.",
    params: { seed: "The Scar", climate: 45, wet: 66, mountains: 72, rivers: 30, settlements: 20, pois: 82, menace: 72 },
  },
  {
    id: "volcano",
    name: "The Celestial Volcano",
    blurb: "The Throne in the Volcano, its Lords at war.",
    params: { seed: "Celestial Volcano", climate: 92, wet: 18, mountains: 88, rivers: 22, settlements: 26, pois: 60, menace: 76 },
  },
  {
    id: "brimstone",
    name: "The Brimstone Ruin",
    blurb: "Decommissioned, still powered, still watched.",
    params: { seed: "Brimstone Ruin", climate: 80, wet: 15, mountains: 55, rivers: 20, settlements: 22, pois: 72, menace: 56 },
  },
  {
    id: "observatory",
    name: "The Grand Observatory",
    blurb: "The cold highland watch that predicts the weather.",
    params: { seed: "Grand Observatory", climate: 34, wet: 45, mountains: 76, rivers: 40, settlements: 34, pois: 46, menace: 24 },
  },
  {
    id: "otherside",
    name: "The Otherside",
    blurb: "Black stone and ash, where the Lords make war.",
    params: { seed: "The Otherside", climate: 55, wet: 18, mountains: 62, rivers: 18, settlements: 15, pois: 66, menace: 82 },
  },
  {
    id: "outer",
    name: "The Outer Lands",
    blurb: "Between civilization and the deep wilds.",
    params: { seed: "Outer Lands", climate: 50, wet: 50, mountains: 50, rivers: 50, settlements: 30, pois: 56, menace: 56 },
  },
  {
    id: "bog",
    name: "The Bog",
    blurb: "Submerged ruins and lights that respond; the center is unreached.",
    params: { seed: "The Bog", climate: 55, wet: 95, mountains: 20, rivers: 82, settlements: 26, pois: 70, menace: 50 },
  },
  {
    id: "furwehn",
    name: "Fur Wehn",
    blurb: "The far east — Wehnfolk, powerful and reclusive.",
    params: { seed: "Fur Wehn", climate: 40, wet: 55, mountains: 55, rivers: 55, settlements: 32, pois: 52, menace: 30 },
  },
  {
    id: "datasphere",
    name: "The Datasphere",
    blurb: "The pre-Scarring information network — 108 Wonders.",
    params: { seed: "Datasphere", climate: 50, wet: 40, mountains: 45, rivers: 45, settlements: 22, pois: 92, menace: 46 },
  },
  {
    id: "factory",
    name: "Factory of Aeons",
    blurb: "The heart of Thundermount, pre-Scarring, and it never stops.",
    params: { seed: "Factory of Aeons", climate: 45, wet: 35, mountains: 86, rivers: 40, settlements: 40, pois: 62, menace: 52 },
  },
];

export function regionById(id: string): RegionPreset | undefined {
  return REGION_PRESETS.find((r) => r.id === id);
}
