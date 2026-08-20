// Shareable world links: encode the generation params in the URL query so a
// link reproduces the same world (grids regenerate deterministically).

import type { EdgeKey, Params, SizeKey } from "../core/types";

const NUM_KEYS: (keyof Params)[] = [
  "hexMiles",
  "sea",
  "climate",
  "wet",
  "mountains",
  "rivers",
  "settlements",
  "pois",
];

export function buildShareUrl(params: Params): string {
  const q = new URLSearchParams();
  q.set("seed", params.seed);
  q.set("size", params.size);
  q.set("edge", params.edge);
  for (const k of NUM_KEYS) q.set(k, String(params[k]));
  const base =
    window.location.origin + window.location.pathname;
  return base + "?" + q.toString();
}

/** Parse generation params from a query string, or null if none are present. */
export function parseShareParams(search: string): Partial<Params> | null {
  const q = new URLSearchParams(search);
  if (!q.has("seed") && !q.has("size")) return null;
  const out: Partial<Params> = {};
  const seed = q.get("seed");
  if (seed) out.seed = seed;
  const size = q.get("size");
  if (size === "small" || size === "medium" || size === "large")
    out.size = size as SizeKey;
  const edge = q.get("edge");
  if (edge === "sea" || edge === "open") out.edge = edge as EdgeKey;
  for (const k of NUM_KEYS) {
    const v = q.get(k);
    if (v !== null && v !== "" && !Number.isNaN(Number(v))) {
      out[k] = Number(v) as never;
    }
  }
  return Object.keys(out).length ? out : null;
}
