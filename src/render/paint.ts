// Canvas cartography pass — biome fills, grid, coastline, borders, rivers,
// roads, the unsurveyed edge band, and fog. Ported from the prototype's paint().
// Returns a cache key; skips all work when the key is unchanged.

import { CORNERS, center, nbrs } from "../core/hex";
import { THEMES, biomeColor } from "../core/themes";
import type { BiomeKey, Layers, ThemeKey, ViewKey, World } from "../core/types";

export interface PaintOpts {
  theme: ThemeKey;
  view: ViewKey;
  layers: Layers;
  revealed: Set<number> | null;
  fogV: number;
  paintV: number;
}

export function paintKey(world: World, o: PaintOpts): string {
  return [
    o.theme,
    o.view,
    o.fogV,
    o.paintV,
    world.edge,
    world.seedName,
    world.n,
    world.hexMiles,
    o.layers.grid,
    o.layers.rivers,
    o.layers.roads,
    o.layers.borders,
  ].join("|");
}

/** Paint the world onto the canvas. Returns the key painted, or prevKey if skipped. */
export function paintCanvas(
  cv: HTMLCanvasElement,
  world: World,
  o: PaintOpts,
  prevKey: string | null
): string {
  const key = paintKey(world, o);
  if (key === prevKey) return prevKey;

  const T = THEMES[o.theme] || THEMES.parchment;
  const [pw, ph] = world.px;
  const dpr = 2;
  if (cv.width !== pw * dpr) {
    cv.width = pw * dpr;
    cv.height = ph * dpr;
  }
  const g = cv.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, pw, ph);
  g.fillStyle = T.paper;
  g.fillRect(0, 0, pw, ph);

  const { w, h, n } = world;

  // --- biome fills, one path per biome ---
  const groups: Record<string, number[]> = {};
  for (let i = 0; i < n; i++) {
    const b = world.biome[i];
    (groups[b] || (groups[b] = [])).push(i);
  }
  for (const b in groups) {
    g.fillStyle = biomeColor(T, b as BiomeKey);
    g.beginPath();
    for (const i of groups[b]) {
      const [x, y] = center(i, w);
      g.moveTo(x + CORNERS[0][0], y + CORNERS[0][1]);
      for (let k = 1; k < 6; k++) g.lineTo(x + CORNERS[k][0], y + CORNERS[k][1]);
      g.closePath();
    }
    g.fill();
  }

  // --- hex grid ---
  if (o.layers.grid) {
    g.strokeStyle = T.grid;
    g.lineWidth = 0.4;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const [x, y] = center(i, w);
      g.moveTo(x + CORNERS[0][0], y + CORNERS[0][1]);
      for (let k = 1; k < 6; k++) g.lineTo(x + CORNERS[k][0], y + CORNERS[k][1]);
      g.closePath();
    }
    g.stroke();
  }

  // --- coastline ---
  const openEdge = world.edge === "open";
  g.strokeStyle = T.coast;
  g.lineWidth = 1.05;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    if (!world.land[i]) continue;
    const c = i % w;
    const r = (i - c) / w;
    const [x, y] = center(i, w);
    const nb = nbrs(c, r);
    for (let k = 0; k < 6; k++) {
      const [nc, nr] = nb[k];
      const out = nc < 0 || nr < 0 || nc >= w || nr >= h;
      if (out && openEdge) continue;
      if (out || !world.land[nr * w + nc]) {
        const a = CORNERS[k];
        const b2 = CORNERS[(k + 1) % 6];
        g.moveTo(x + a[0], y + a[1]);
        g.lineTo(x + b2[0], y + b2[1]);
      }
    }
  }
  g.stroke();

  // --- realm borders ---
  if (o.layers.borders) {
    g.strokeStyle = T.border;
    g.lineWidth = 1.6;
    g.setLineDash([3.2, 2.4]);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const own = world.owner[i];
      if (own < 0) continue;
      const c = i % w;
      const r = (i - c) / w;
      const [x, y] = center(i, w);
      const nb = nbrs(c, r);
      for (let k = 0; k < 6; k++) {
        const [nc, nr] = nb[k];
        const out = nc < 0 || nr < 0 || nc >= w || nr >= h;
        const oo = out ? -1 : world.owner[nr * w + nc];
        if (oo !== own && !(out || !world.land[nr * w + nc])) {
          const a = CORNERS[k];
          const b2 = CORNERS[(k + 1) % 6];
          g.moveTo(x + a[0], y + a[1]);
          g.lineTo(x + b2[0], y + b2[1]);
        }
      }
    }
    g.stroke();
    g.setLineDash([]);
  }

  // --- rivers ---
  if (o.layers.rivers) {
    g.strokeStyle = T.river;
    g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      if (!world.river[i]) continue;
      const j = world.next[i];
      if (j < 0) continue;
      const [x1, y1] = center(i, w);
      const [x2, y2] = center(j, w);
      g.lineWidth = Math.min(3.4, 0.7 + Math.sqrt(world.flow[i]) * 0.42);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }
  }

  // --- roads (precomputed in generation) ---
  if (o.layers.roads) {
    g.strokeStyle = T.road;
    g.lineCap = "round";
    g.lineWidth = 1.5;
    g.setLineDash([]);
    for (const seg of world.roads) {
      if (seg.length < 2) continue;
      g.beginPath();
      seg.forEach((i, k) => {
        const [x, y] = center(i, w);
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      g.stroke();
    }
  }

  // --- unsurveyed edge band ---
  if (openEdge) {
    for (let ring = 0; ring < 3; ring++) {
      g.fillStyle = T.fog;
      g.globalAlpha = [0.72, 0.4, 0.18][ring];
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const c = i % w;
        const r = (i - c) / w;
        const d = Math.min(c, r, w - 1 - c, h - 1 - r);
        if (d !== ring) continue;
        const [x, y] = center(i, w);
        g.moveTo(x + CORNERS[0][0], y + CORNERS[0][1]);
        for (let k = 1; k < 6; k++)
          g.lineTo(x + CORNERS[k][0], y + CORNERS[k][1]);
        g.closePath();
      }
      g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = T.label;
    g.font = "italic 15px 'Cormorant Garamond', serif";
    g.textAlign = "center";
    g.globalAlpha = 0.5;
    g.fillText("unsurveyed", pw / 2, 22);
    g.fillText("unsurveyed", pw / 2, ph - 12);
    g.globalAlpha = 1;
  }

  // --- player-facing fog ---
  if (o.view === "players" && o.revealed) {
    const rev = o.revealed;
    g.fillStyle = T.fog;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      if (rev.has(i)) continue;
      const [x, y] = center(i, w);
      g.moveTo(x + CORNERS[0][0], y + CORNERS[0][1]);
      for (let k = 1; k < 6; k++) g.lineTo(x + CORNERS[k][0], y + CORNERS[k][1]);
      g.closePath();
    }
    g.fill();
  }

  return key;
}
