import type { SaveFile } from "../core/types";
import { buildNewGrandiaSave } from "./newGrandia";

export interface PremadeMap {
  id: string;
  name: string;
  blurb: string;
  build: () => SaveFile;
}

export const PREMADE_MAPS: PremadeMap[] = [
  {
    id: "new-grandia",
    name: "New Grandia",
    blurb: "The Scarred Lands — the campaign map, 5×5 regions.",
    build: buildNewGrandiaSave,
  },
];
