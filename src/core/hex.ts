// Hex geometry — pointy-top, odd-row offset layout. Ported from the prototype.

export const S = 11;
export const SQ3 = Math.sqrt(3);

/** Corner offsets [dx, dy] for the 6 hex corners, at radius S. */
export const CORNERS: [number, number][] = [];
for (let ci = 0; ci < 6; ci++) {
  const ca = (Math.PI / 180) * (60 * ci - 90);
  CORNERS.push([S * Math.cos(ca), S * Math.sin(ca)]);
}

/** Pixel center of hex index `i` on a grid `w` wide. */
export function center(i: number, w: number): [number, number] {
  const c = i % w;
  const r = (i - c) / w;
  return [S * SQ3 * (c + 0.5 * (r & 1)) + S, S * 1.5 * r + S];
}

/** SVG polygon points string for hex `i`. */
export function hexPoints(i: number, w: number): string {
  const [x, y] = center(i, w);
  return CORNERS.map(
    (p) => (x + p[0]).toFixed(1) + "," + (y + p[1]).toFixed(1)
  ).join(" ");
}

/** Neighbor offset coordinates for hex at col/row, honouring row parity. */
export function nbrs(c: number, r: number): [number, number][] {
  const odd = r & 1;
  return odd
    ? [
        [c + 1, r - 1],
        [c + 1, r],
        [c + 1, r + 1],
        [c, r + 1],
        [c - 1, r],
        [c, r - 1],
      ]
    : [
        [c, r - 1],
        [c + 1, r],
        [c, r + 1],
        [c - 1, r + 1],
        [c - 1, r],
        [c - 1, r - 1],
      ];
}

/** Nearest hex index to pixel (mx, my). Candidate-scans the 3x3 offset block. */
export function hexAt(
  mx: number,
  my: number,
  w: number,
  h: number
): number | null {
  const r0 = Math.round((my - S) / (S * 1.5));
  let best: number | null = null;
  let bd = 1e9;
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    if (r < 0 || r >= h) continue;
    const c0 = Math.round((mx - S - S * SQ3 * 0.5 * (r & 1)) / (S * SQ3));
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      if (c < 0 || c >= w) continue;
      const i = r * w + c;
      const [x, y] = center(i, w);
      const d = (x - mx) * (x - mx) + (y - my) * (y - my);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
  }
  return best;
}

// ---- cube coordinates (for straight hex lines) ----

export function toCube(c: number, r: number): [number, number, number] {
  const x = c - (r - (r & 1)) / 2;
  const z = r;
  return [x, -x - z, z];
}

export function fromCube(x: number, z: number): [number, number] {
  return [x + (z - (z & 1)) / 2, z];
}

export function cubeRound(
  x: number,
  y: number,
  z: number
): [number, number, number] {
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return [rx, ry, rz];
}
