// Procedural name generation — syllable tables joined. Ported from the prototype.

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

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function placeName(rng: () => number): string {
  return cap(pick(rng, SYL_A)) + pick(rng, SYL_B);
}

export function siteName(rng: () => number): string {
  return "The " + pick(rng, SITE_A) + " " + pick(rng, SITE_B);
}

export function realmName(rng: () => number): string {
  return cap(pick(rng, SYL_A)) + " " + pick(rng, REALM_B);
}
