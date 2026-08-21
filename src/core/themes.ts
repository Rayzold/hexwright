import type { BiomeKey, ThemeKey } from "./types";

export interface MapTheme {
  paper: string;
  ink: string;
  grid: string;
  coast: string;
  river: string;
  road: string;
  border: string;
  fog: string;
  label: string;
  halo: string;
  site: string;
  // per-biome fills
  deep: string;
  ocean: string;
  shallow: string;
  beach: string;
  grass: string;
  savanna: string;
  desert: string;
  forest: string;
  jungle: string;
  taiga: string;
  tundra: string;
  swamp: string;
  hills: string;
  mountains: string;
  snow: string;
  scar: string;
}

export const THEMES: Record<ThemeKey, MapTheme> = {
  parchment: {
    paper: "#e9dfc4",
    ink: "#4a3b28",
    grid: "rgba(74,59,40,0.16)",
    coast: "#5c4a33",
    river: "#7d9fae",
    road: "#8b6a44",
    border: "#a35a34",
    fog: "rgba(22,18,14,0.86)",
    label: "#3b2f22",
    halo: "rgba(233,223,196,0.85)",
    site: "#3b2f22",
    deep: "#9fb6c0",
    ocean: "#b3c7cd",
    shallow: "#c6d5d6",
    beach: "#eee2c1",
    grass: "#cdd3a2",
    savanna: "#dbcf99",
    desert: "#e7dca4",
    forest: "#a9bd8d",
    jungle: "#8fae7c",
    taiga: "#a0b49d",
    tundra: "#d0d1c3",
    swamp: "#a8ae86",
    hills: "#c5bb90",
    mountains: "#b2a78d",
    snow: "#efece2",
    scar: "#d98a5c",
  },
  dusk: {
    paper: "#131a21",
    ink: "#c8d4dd",
    grid: "rgba(200,212,221,0.10)",
    coast: "#7b93a4",
    river: "#5c8ea8",
    road: "#9c8358",
    border: "#c4703f",
    fog: "rgba(4,7,10,0.88)",
    label: "#e7eef4",
    halo: "rgba(11,16,21,0.85)",
    site: "#e7eef4",
    deep: "#111b26",
    ocean: "#182734",
    shallow: "#213543",
    beach: "#4e4a38",
    grass: "#3d4f38",
    savanna: "#514c30",
    desert: "#5c5540",
    forest: "#2e4432",
    jungle: "#28432f",
    taiga: "#31453e",
    tundra: "#4a534f",
    swamp: "#38412e",
    hills: "#4a4636",
    mountains: "#555044",
    snow: "#8b8f8a",
    scar: "#7a3a28",
  },
};

/** Fill color for a biome under a theme. */
export function biomeColor(theme: MapTheme, b: BiomeKey): string {
  return theme[b] || theme.grass;
}
