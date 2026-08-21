import { useEffect, useMemo, useRef, useState } from "react";
import { BIOMES } from "../core/biomes";
import { S, SQ3, center, hexAt, hexPoints } from "../core/hex";
import { THEMES } from "../core/themes";
import { route as computeRoute } from "../core/travel";
import {
  DANGER,
  LABELED_TYPES,
  OBJECT_TYPES,
  hostileThreatMap,
} from "../core/objectTypes";
import type { MapObject, World } from "../core/types";
import { paintCanvas, type PaintOpts } from "../render/paint";
import { clearMapRefs, setMapRefs } from "../render/mapExport";
import { ACCENT, useStore } from "../store/useStore";
import { MONO } from "../ui/styles";

interface Mark {
  id: string;
  x: number;
  y: number;
  shape: "circle" | "square" | "poly";
  r: number;
  rInner: number;
  poly?: string;
  fill: string;
  stroke: string;
  ring: string | null; // hostile danger ring color
  opacity: number; // dimmed when cleared
  label: string | null;
  labelSize: number;
  labelX: number;
}

function squarePts(r: number): string {
  return `-${r},-${r} ${r},-${r} ${r},${r} -${r},${r}`;
}

function buildMarks(
  world: World,
  objects: MapObject[],
  view: string,
  revealed: Set<number> | null,
  selectedId: string | null,
  showLabels: boolean,
  themeKey: "parchment" | "dusk"
): Mark[] {
  const T = THEMES[themeKey];
  const hidden = view === "players" && revealed;
  const marks: Mark[] = [];
  for (const o of objects) {
    if (o.hex >= world.n) continue;
    if (hidden && !revealed!.has(o.hex)) continue;
    const meta = OBJECT_TYPES[o.type];
    if (!meta) continue;
    const [x, y] = center(o.hex, world.w);
    const isSite = meta.category === "site";
    const selected = selectedId === o.id;
    const hostile = o.allegiance === "hostile";
    marks.push({
      id: o.id,
      x,
      y,
      shape: meta.shape,
      r: meta.r,
      rInner: meta.inner,
      poly: meta.shape === "square" ? squarePts(meta.r) : meta.poly,
      fill: selected ? ACCENT : isSite ? T.site : T.paper,
      stroke: selected ? ACCENT : hostile ? DANGER : T.ink,
      ring: hostile && !selected ? DANGER : null,
      opacity: o.cleared ? 0.4 : 1,
      label:
        showLabels && LABELED_TYPES.has(o.type) ? o.name : null,
      labelSize: o.type === "city" ? 9.4 : 7.8,
      labelX: meta.r + 3,
    });
  }
  return marks;
}

export function MapStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyRef = useRef<string | null>(null);
  const zoomRef = useRef(1);
  const [legendOpen, setLegendOpen] = useState(false);
  const spaceRef = useRef(false);
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const pannedRef = useRef(false);

  const world = useStore((s) => s.world);
  const zoom = useStore((s) => s.zoom);
  const theme = useStore((s) => s.theme);
  const view = useStore((s) => s.view);
  const layers = useStore((s) => s.layers);
  const revealed = useStore((s) => s.revealed);
  const fogV = useStore((s) => s.fogV);
  const paintV = useStore((s) => s.paintV);
  const fitV = useStore((s) => s.fitV);
  const objects = useStore((s) => s.objects);
  const selected = useStore((s) => s.selected);
  const hover = useStore((s) => s.hover);
  const waypoints = useStore((s) => s.waypoints);
  const routeMode = useStore((s) => s.routeMode);
  const party = useStore((s) => s.party);
  const mode = useStore((s) => s.mode);

  // --- canvas paint ---
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !world) return;
    const opts: PaintOpts = { theme, view, layers, revealed, fogV, paintV };
    keyRef.current = paintCanvas(cv, world, opts, keyRef.current);
    if (svgRef.current) {
      setMapRefs({
        canvas: cv,
        svg: svgRef.current,
        pw: world.px[0],
        ph: world.px[1],
        seed: world.seedName,
      });
    }
  }, [world, theme, view, layers, revealed, fogV, paintV]);

  useEffect(() => clearMapRefs, []);

  // --- auto-fit after generation / load ---
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !world) return;
    const [pw, ph] = world.px;
    const avail = [
      Math.max(120, el.clientWidth - 36),
      Math.max(120, el.clientHeight - 36),
    ];
    const z = Math.max(
      0.35,
      Math.min(1.4, +Math.min(avail[0] / pw, avail[1] / ph).toFixed(2))
    );
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      any = false;
    for (let i = 0; i < world.n; i++) {
      if (!world.land[i]) continue;
      any = true;
      const [x, y] = center(i, world.w);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (!any) {
      minX = 0;
      maxX = pw;
      minY = 0;
      maxY = ph;
    }
    useStore.getState().setZoom(z);
    requestAnimationFrame(() => {
      const cx = ((minX + maxX) / 2) * z + 18;
      const cy = ((minY + maxY) / 2) * z + 18;
      el.scrollLeft = Math.max(0, cx - el.clientWidth / 2);
      el.scrollTop = Math.max(0, cy - el.clientHeight / 2);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitV]);

  // --- window mouseup ends any drag (release outside the map) ---
  useEffect(() => {
    const onUp = () => useStore.getState().endDrag();
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // keep a ref to the latest zoom for the native wheel handler
  zoomRef.current = zoom;

  // --- drag-to-pan (middle mouse, or space + left) and wheel zoom ---
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceRef.current) {
        spaceRef.current = true;
        el.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceRef.current = false;
        el.style.cursor = "";
      }
    };

    // capture phase so a pan gesture pre-empts the SVG interaction handlers
    const onDownCapture = (e: MouseEvent) => {
      const pan = e.button === 1 || (e.button === 0 && spaceRef.current);
      if (!pan) return;
      e.preventDefault();
      e.stopPropagation();
      panRef.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
      pannedRef.current = false;
      el.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      const p = panRef.current;
      if (!p) return;
      pannedRef.current = true;
      el.scrollLeft = p.sl - (e.clientX - p.x);
      el.scrollTop = p.st - (e.clientY - p.y);
    };
    // swallow the click that fires right after a left-drag pan
    const onClickCapture = (e: MouseEvent) => {
      if (pannedRef.current) {
        pannedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onUp = () => {
      if (panRef.current) {
        panRef.current = null;
        el.style.cursor = spaceRef.current ? "grab" : "";
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const z = zoomRef.current;
      // world-pixel point under the cursor (inner div has an 18px margin)
      const wx = (el.scrollLeft + mx - 18) / z;
      const wy = (el.scrollTop + my - 18) / z;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nz = Math.max(0.5, Math.min(2.4, +(z * factor).toFixed(2)));
      if (nz === z) return;
      useStore.getState().setZoom(nz);
      requestAnimationFrame(() => {
        el.scrollLeft = wx * nz + 18 - mx;
        el.scrollTop = wy * nz + 18 - my;
      });
    };

    el.addEventListener("mousedown", onDownCapture, true);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      el.removeEventListener("mousedown", onDownCapture, true);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // --- derived route ---
  const routeRes = useMemo(() => {
    if (!world || mode !== "table") return null;
    return computeRoute(
      world,
      waypoints,
      routeMode,
      party.speed,
      hostileThreatMap(objects)
    );
    // paintV included so brush edits recost the route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, waypoints, routeMode, party.speed, paintV, world?.hexMiles, objects]);

  const marks = useMemo(() => {
    if (!world) return [];
    const selId =
      selected && selected.kind === "object" ? selected.id : null;
    return buildMarks(world, objects, view, revealed, selId, layers.labels, theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, objects, view, revealed, selected, layers.labels, theme, paintV]);

  if (!world) {
    return (
      <main
        ref={stageRef}
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          overflow: "auto",
          background: "#100d0a",
          position: "relative",
        }}
      />
    );
  }

  const [pw, ph] = world.px;
  const T = THEMES[theme];

  const svgPoint = (e: React.MouseEvent): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const b = svg.getBoundingClientRect();
    const mx = (e.clientX - b.left) / zoom;
    const my = (e.clientY - b.top) / zoom;
    return hexAt(mx, my, world.w, world.h);
  };

  const routePoints =
    routeRes && routeRes.cells
      ? routeRes.cells
          .map((i) => {
            const [x, y] = center(i, world.w);
            return x.toFixed(1) + "," + y.toFixed(1);
          })
          .join(" ")
      : "";

  const selPoints =
    selected && selected.kind === "hex"
      ? hexPoints(selected.i, world.w)
      : selected && selected.kind === "object"
        ? (() => {
            const o = objects.find((x) => x.id === selected.id);
            return o ? hexPoints(o.hex, world.w) : "";
          })()
        : "";

  const hoverPoints =
    hover !== null && hover < world.n ? hexPoints(hover, world.w) : "";

  const label = (i: number): string => {
    const c = i % world.w;
    const r = (i - c) / world.w;
    return (
      String(c + 1).padStart(2, "0") + "." + String(r + 1).padStart(2, "0")
    );
  };
  let hoverLabel = "—";
  if (hover !== null && hover < world.n) {
    const o = objects.find((x) => x.hex === hover);
    hoverLabel =
      label(hover) +
      " · " +
      BIOMES[world.biome[hover]].name +
      (o ? " · " + o.name : "");
  }

  const scaleBarW = (S * SQ3 * 5 * zoom).toFixed(0);

  return (
    <main
      ref={stageRef}
      style={{
        flex: "1 1 auto",
        minWidth: 0,
        overflow: "auto",
        background: "#100d0a",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          width: Math.round(pw * zoom),
          height: Math.round(ph * zoom),
          margin: 18,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${pw} ${ph}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          onClick={(e) => {
            const i = svgPoint(e);
            if (i !== null) useStore.getState().mapClick(i);
          }}
          onMouseDown={(e) => {
            const i = svgPoint(e);
            if (i !== null) useStore.getState().beginBrush(i);
          }}
          onMouseMove={(e) => {
            const i = svgPoint(e);
            if (i !== null) useStore.getState().pointerMove(i);
          }}
          onMouseLeave={() => {
            useStore.getState().hoverHex(null);
            useStore.getState().endDrag();
          }}
          onMouseUp={() => useStore.getState().endDrag()}
        >
          <polyline
            points={routePoints}
            fill="none"
            stroke="#16120e"
            strokeWidth={4.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.5}
          />
          <polyline
            points={routePoints}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="7 4"
          />

          {waypoints.map((i, n) => {
            const [x, y] = center(i, world.w);
            return (
              <g
                key={n}
                transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
                style={{ cursor: "grab" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  useStore.getState().waypointDown(n);
                }}
              >
                <circle r={7.5} fill="#16120e" opacity={0.55} />
                <circle r={5.2} fill={ACCENT} stroke="#fdf3e2" strokeWidth={1.4} />
                <text
                  y={2.8}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={6.4}
                  fontWeight={600}
                  fill="#fdf3e2"
                  style={{ pointerEvents: "none" }}
                >
                  {n + 1}
                </text>
              </g>
            );
          })}

          {marks.map((m) => (
            <g
              key={m.id}
              transform={`translate(${m.x.toFixed(1)},${m.y.toFixed(1)})`}
              style={{ cursor: "pointer" }}
              opacity={m.opacity}
              onClick={(e) => {
                e.stopPropagation();
                useStore.getState().selectObject(m.id);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                useStore.getState().objectDown(m.id);
              }}
            >
              <circle r={9} fill="transparent" />
              {m.ring && (
                <circle
                  r={m.r + 2.6}
                  fill="none"
                  stroke={m.ring}
                  strokeWidth={1.2}
                  opacity={0.85}
                />
              )}
              {m.shape === "circle" ? (
                <>
                  <circle r={m.r} fill={m.fill} stroke={m.stroke} strokeWidth={1.1} />
                  <circle r={m.rInner} fill={m.stroke} />
                </>
              ) : m.shape === "square" ? (
                <>
                  <polygon points={m.poly} fill={m.fill} stroke={m.stroke} strokeWidth={1.1} />
                  <circle r={m.rInner} fill={m.stroke} />
                </>
              ) : (
                <polygon points={m.poly} fill={m.fill} stroke={m.stroke} strokeWidth={1.1} />
              )}
              {m.label && (
                <text
                  x={m.labelX}
                  y={2.6}
                  textAnchor="start"
                  fontFamily="Cormorant Garamond, serif"
                  fontSize={m.labelSize}
                  fontWeight={600}
                  fill={T.label}
                  stroke={T.halo}
                  strokeWidth={2.4}
                  paintOrder="stroke"
                  letterSpacing={0.4}
                  style={{ pointerEvents: "none" }}
                >
                  {m.label}
                </text>
              )}
            </g>
          ))}

          {selPoints && (
            <polygon points={selPoints} fill="none" stroke={ACCENT} strokeWidth={1.8} />
          )}
          {hoverPoints && (
            <polygon
              points={hoverPoints}
              fill="rgba(255,255,255,0.12)"
              stroke={T.ink}
              strokeWidth={1.1}
            />
          )}
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          left: 14,
          bottom: 14,
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "rgba(16, 13, 10, 0.9)",
            border: "1px solid #322a20",
            borderRadius: 3,
            padding: "8px 11px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: scaleBarW + "px",
                height: 3,
                background: "#c9bda7",
                borderLeft: "1px solid #c9bda7",
                borderRight: "1px solid #c9bda7",
              }}
            />
            <span style={{ fontFamily: MONO, fontSize: 10, color: "#c9bda7" }}>
              {world.hexMiles * 5} mi · 1 hex = {world.hexMiles} mi
            </span>
          </div>
        </div>
        <div
          style={{
            background: "rgba(16, 13, 10, 0.9)",
            border: "1px solid #322a20",
            borderRadius: 3,
            padding: "8px 11px",
            fontFamily: MONO,
            fontSize: 10,
            color: "#9a8f7c",
          }}
        >
          {hoverLabel}
        </div>
      </div>

      <MapLegend open={legendOpen} onToggle={() => setLegendOpen((v) => !v)} theme={T} />
    </main>
  );
}

function MapLegend({
  open,
  onToggle,
  theme,
}: {
  open: boolean;
  onToggle: () => void;
  theme: { paper: string; ink: string; site: string };
}) {
  const glyph = (child: React.ReactNode) => (
    <svg width={16} height={16} viewBox="-8 -8 16 16" style={{ flex: "0 0 auto" }}>
      {child}
    </svg>
  );
  const rows: [React.ReactNode, string][] = [
    [glyph(<><circle r={4.2} fill={theme.paper} stroke={theme.ink} strokeWidth={1.1} /><circle r={1.6} fill={theme.ink} /></>), "Settlement"],
    [glyph(<><polygon points="-4,-4 4,-4 4,4 -4,4" fill={theme.paper} stroke={theme.ink} strokeWidth={1.1} /><circle r={1.4} fill={theme.ink} /></>), "Fort"],
    [glyph(<polygon points="0,-5 4.4,0 0,5 -4.4,0" fill={theme.site} stroke={theme.ink} strokeWidth={1.1} />), "Dungeon / site"],
    [glyph(<polygon points="0,-5 4.8,-1.5 3,4.5 -3,4.5 -4.8,-1.5" fill={theme.site} stroke={DANGER} strokeWidth={1.1} />), "Lair"],
    [glyph(<circle r={5} fill="none" stroke={DANGER} strokeWidth={1.2} />), "Hostile"],
  ];
  return (
    <div
      style={{
        position: "absolute",
        right: 14,
        bottom: 14,
        pointerEvents: "auto",
      }}
    >
      {open && (
        <div
          style={{
            marginBottom: 6,
            background: "rgba(16, 13, 10, 0.94)",
            border: "1px solid #322a20",
            borderRadius: 3,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {rows.map(([g, label], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {g}
              <span style={{ fontFamily: MONO, fontSize: 10, color: "#c9bda7" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onToggle}
        style={{
          background: "rgba(16, 13, 10, 0.9)",
          border: "1px solid #322a20",
          borderRadius: 3,
          padding: "6px 10px",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#9a8f7c",
          cursor: "pointer",
        }}
      >
        {open ? "Key ▾" : "Key ▴"}
      </button>
    </div>
  );
}
