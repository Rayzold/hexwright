// Per-biome random-encounter tables, flavoured for the Scarred Lands
// (arcane-tech blight, nanites, salvage, scar-touched beasts). These turn the
// x-in-6 encounter odds into an actual result the referee can read aloud.

import type { BiomeKey } from "./types";

const WATER = [
  "A derelict hull drifts on the current, cargo lashings still taut.",
  "Something large surfaces just long enough to look at you.",
  "A storm the Observatory never called rolls in off the horizon.",
  "Pirates flying no colors, closing to hail — or to board.",
];

export const ENCOUNTERS: Record<BiomeKey, string[]> = {
  deep: WATER,
  ocean: WATER,
  shallow: WATER,
  beach: [
    "Salvage washed up on the tide, and someone else wants it too.",
    "The tide pulls the wrong way, against a wind that isn't there.",
    "Smugglers mid-landing; hands drift toward knives.",
    "A stranded leviathan, still breathing, still watching.",
  ],
  grass: [
    "A merchant caravan on the Salt Road, wary of raiders.",
    "A surveyor's drone, still logging the terrain a century too late.",
    "A herd bolts past, startled by something you cannot see.",
    "Frontier militia, polite but insistent about papers.",
    "A field of dead crops humming faintly with buried nanites.",
  ],
  savanna: [
    "Scar-touched cats stalk the tall grass in a widening ring.",
    "Nomad outriders trade water for news and size up your gear.",
    "A downed sky-mooring, half-picked and still creaking.",
    "Dust on the horizon — a warband, or the weather turning.",
    "A lone Ashenborn walking away from something they won't name.",
  ],
  desert: [
    "A salt pilgrim who has not spoken in days falls into step.",
    "A buried relay tower vents steam through the dunes.",
    "Glass fused into the shape of a scream underfoot.",
    "Raiders on lean mounts demand a toll for the passage.",
    "A mirage that answers, softly, when you call to it.",
  ],
  forest: [
    "Wardens of the living wood, and they do not blink.",
    "A tree grown around old machinery that is still warm.",
    "Something paces you, just past the tree line, patient.",
    "A shrine hung with line-name tokens, freshly tied.",
    "The dead who never fully left, walking quietly home.",
  ],
  jungle: [
    "Prism growth flowers bright enough to blind at noon.",
    "A predator mimics your comrades' voices from the canopy.",
    "Vines tighten the moment the party stops moving.",
    "A ruin swallowed whole, its doors still locked from within.",
    "Fever-bright spores drift on the heavy, wet air.",
  ],
  taiga: [
    "A trapper's line, sprung on something far too large.",
    "Boreal silence — then wingbeats, low and heavy.",
    "A frozen relay flashes an old rescue code, over and over.",
    "Wolves, thinner and bolder than the season should allow.",
    "Smoke from a camp that has no business being here.",
  ],
  tundra: [
    "A herd migrates hard ahead of a storm you can't yet see.",
    "A body preserved mid-stride, eyes open, decades old.",
    "The wind carries a signal, not a sound, from the north.",
    "Hunters of the far north appear, quietly sizing you up.",
    "Ice that plainly remembers being a road.",
  ],
  swamp: [
    "Lights beneath the water answer the questions you think.",
    "A drowned warren stirs, roused by the party's passage.",
    "A pilgrim sinks slowly into the mire, and seems glad of it.",
    "Gas rises and shows each of you what you buried.",
    "Something vast turns over in the mud and settles again.",
  ],
  hills: [
    "An orewrought survey team, jealous and armed over their seam.",
    "A cairn stands where there was none yesterday.",
    "Bandits with the high ground and all the patience they need.",
    "A windmill turns steadily, grinding nothing at all.",
    "A fault line breathes warm, machine-scented air.",
  ],
  mountains: [
    "A rockfall — and, too late, you see it was aimed.",
    "Aeonbound miners cross your path on a shift that never ends.",
    "A dragon-line beast rides the thermals above the ridge.",
    "The pass ahead is sealed by fresh, deliberate stone.",
    "Thin air, and voices in it that use your names.",
  ],
  snow: [
    "A whiteout closes in and scatters the party.",
    "Something lopes parallel to the trail, matching your pace.",
    "A frozen caravan, its cargo untouched, its people gone.",
    "The cold gets into the machines first, then into you.",
    "A beacon fails and flares between the snow squalls.",
  ],
  scar: [
    "Reality thins; your shadow arrives a beat after you do.",
    "A scar-beast, wrong in ways the tongue can't hold, tests the air.",
    "Nanite mist rolls through, rewriting whatever it touches.",
    "A machine-god's dead hand, vast and half-buried, still twitches.",
    "The Scarring replays itself, silent, around and through you.",
    "A survivor staggers out who is mostly not, anymore.",
  ],
};

/** Roll a random encounter for a biome. */
export function rollEncounter(biome: BiomeKey, rng: () => number): string {
  const table = ENCOUNTERS[biome] || ENCOUNTERS.grass;
  return table[Math.floor(rng() * table.length)];
}
