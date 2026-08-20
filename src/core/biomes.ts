import type { BiomeKey } from "./types";

export interface BiomeDef {
  name: string;
  /** Movement cost; null means impassable except by ship. */
  cost: number | null;
  wild: number;
  water?: boolean;
}

export const BIOMES: Record<BiomeKey, BiomeDef> = {
  deep: { name: "Deep water", cost: null, wild: 0.3, water: true },
  ocean: { name: "Open sea", cost: null, wild: 0.3, water: true },
  shallow: { name: "Shoal", cost: null, wild: 0.25, water: true },
  beach: { name: "Strand", cost: 1.0, wild: 0.2 },
  grass: { name: "Grassland", cost: 1.0, wild: 0.25 },
  savanna: { name: "Savanna", cost: 1.1, wild: 0.3 },
  desert: { name: "Desert", cost: 1.6, wild: 0.45 },
  forest: { name: "Forest", cost: 1.5, wild: 0.4 },
  jungle: { name: "Jungle", cost: 2.4, wild: 0.6 },
  taiga: { name: "Boreal wood", cost: 1.6, wild: 0.4 },
  tundra: { name: "Tundra", cost: 1.4, wild: 0.3 },
  swamp: { name: "Marsh", cost: 2.2, wild: 0.55 },
  hills: { name: "Hills", cost: 1.9, wild: 0.35 },
  mountains: { name: "Mountains", cost: 3.2, wild: 0.5 },
  snow: { name: "Snowcap", cost: 2.8, wild: 0.5 },
};
