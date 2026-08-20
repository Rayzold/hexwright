// PNG export: composite the terrain <canvas> with a rasterized copy of the
// interactive <svg> overlay onto one canvas and download it.

interface MapRefs {
  canvas: HTMLCanvasElement;
  svg: SVGSVGElement;
  pw: number;
  ph: number;
  seed: string;
}

let refs: MapRefs | null = null;

export function setMapRefs(r: MapRefs): void {
  refs = r;
}

export function clearMapRefs(): void {
  refs = null;
}

export function canExportMap(): boolean {
  return refs !== null;
}

/** Composite terrain + overlay to a PNG and trigger a download. */
export async function exportMapPNG(): Promise<void> {
  if (!refs) return;
  const { canvas, svg, pw, ph, seed } = refs;
  const dpr = 2;
  const out = document.createElement("canvas");
  out.width = pw * dpr;
  out.height = ph * dpr;
  const g = out.getContext("2d");
  if (!g) return;

  // terrain (the source canvas is already at pw*dpr)
  g.drawImage(canvas, 0, 0);

  // rasterize a sized clone of the SVG overlay
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(pw));
  clone.setAttribute("height", String(ph));
  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 =
    "data:image/svg+xml;base64," +
    btoa(unescape(encodeURIComponent(xml)));

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      g.drawImage(img, 0, 0, pw * dpr, ph * dpr);
      resolve();
    };
    img.onerror = () => resolve(); // still export terrain if overlay fails
    img.src = svg64;
  });

  const safe = (seed || "map").replace(/[^\w.-]+/g, "_");
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safe + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
