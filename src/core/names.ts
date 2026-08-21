// Procedural name generation — syllable tables joined. Ported from the prototype.
import type { NameStyle } from "./types";

export const SYL_A = [
  "ael", "bar", "cor", "dun", "eth", "fal", "gor", "hal", "ith", "kel",
  "lor", "mar", "nor", "orm", "pel", "quen", "ras", "sel", "tor", "val",
  "wyr", "zan", "brim", "cald", "drov", "esk", "grim", "hesp", "kirn", "loth",
];
export const SYL_B = [
  "mere", "ford", "hollow", "reach", "spire", "gate", "watch", "fell", "moor",
  "hearth", "barrow", "stead", "crag", "vale", "wick", "haven", "march", "hold",
  "run", "bridge", "keep", "cross", "deep", "rest",
];
export const REALM_B = [
  "Dominion", "Reach", "Marches", "Concord", "Hegemony", "Freeholds",
  "Protectorate", "League", "Cantons", "Suzerainty",
];
export const SITE_A = [
  "Sunken", "Whispering", "Broken", "Ashen", "Hollow", "Weeping", "Iron",
  "Pale", "Thorned", "Drowned", "Gilded", "Forsaken",
];
export const SITE_B = [
  "Abbey", "Barrow", "Cairn", "Cistern", "Fane", "Menhir", "Obelisk",
  "Sepulchre", "Warren", "Ziggurat", "Bastion", "Mine",
];
export const MENACE_A = [
  "Bloodfang", "Black", "Gloom", "Rotting", "Screaming", "Cinder", "Grave",
  "Venom", "Skull", "Bone", "Ravening", "Dread",
];
export const MENACE_B = [
  "Warren", "Hollow", "Nest", "Lair", "Den", "Pit", "Roost", "Hive",
  "Warcamp", "Fastness", "Maw", "Barrows",
];

// --- Scarred Lands flavour (original stock evoking the setting's arcane-tech
// blight; does not reuse any roster NPC names). ---
export const SCAR_A = [
  "Ash", "Ember", "Cinder", "Glass", "Thread", "Vault", "Rift", "Scar",
  "Drift", "Mote", "Echo", "Wehn", "Slag", "Verge", "Lume", "Cog",
  "Shard", "Pale", "Hollow", "Grist", "Kiln", "Vane", "Sable", "Brack",
  "Tarn", "Fen", "Wyr", "Gral", "Ory", "Nix",
];
export const SCAR_B = [
  "reach", "hold", "mote", "vault", "spire", "gate", "watch", "fall",
  "mire", "forge", "mark", "wend", "crux", "run", "barrow", "grave",
  "light", "rest", "deep", "works", "weald", "verge", "coil", "shen",
];
export const SCAR_SITE_A = [
  "Sundered", "Nanite", "Hollow", "Echoing", "Glassed", "Ashen",
  "Fractured", "Silent", "Wired", "Rusted", "Drowned", "Forsaken",
];
export const SCAR_SITE_B = [
  "Relay", "Reliquary", "Conduit", "Spire", "Vault", "Fane",
  "Cradle", "Loom", "Foundry", "Warren", "Beacon", "Machine",
];
export const SCAR_REALM_B = [
  "Dominion", "Reach", "Concord", "Hegemony", "Freeholds", "Protectorate",
  "Compact", "Combine", "Enclave", "Reclamation",
];

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function placeName(rng: () => number, style: NameStyle = "classic"): string {
  return style === "scarred"
    ? cap(pick(rng, SCAR_A)) + pick(rng, SCAR_B)
    : cap(pick(rng, SYL_A)) + pick(rng, SYL_B);
}

export function siteName(rng: () => number, style: NameStyle = "classic"): string {
  return style === "scarred"
    ? "The " + pick(rng, SCAR_SITE_A) + " " + pick(rng, SCAR_SITE_B)
    : "The " + pick(rng, SITE_A) + " " + pick(rng, SITE_B);
}

export function lairName(rng: () => number): string {
  return "The " + pick(rng, MENACE_A) + " " + pick(rng, MENACE_B);
}

export function realmName(rng: () => number, style: NameStyle = "classic"): string {
  return style === "scarred"
    ? cap(pick(rng, SCAR_A)) + " " + pick(rng, SCAR_REALM_B)
    : cap(pick(rng, SYL_A)) + " " + pick(rng, REALM_B);
}
