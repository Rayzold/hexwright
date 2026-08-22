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
    id: "land-of-the-scar",
    name: "Land of the Scar",
    blurb: "The Scarred Lands campaign map — 5×5 regions, the Scar at its heart.",
    build: buildNewGrandiaSave,
  },
];
