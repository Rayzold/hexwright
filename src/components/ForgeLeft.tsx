import { useStore } from "../store/useStore";
import {
  MONO,
  chip,
  emberBtn,
  fieldLabel,
  hairline,
  inputStyle,
  sectionHeader,
} from "../ui/styles";
import type { Layers } from "../core/types";

function climateWord(v: number) {
  return v < 30 ? "frigid" : v < 46 ? "cool" : v < 62 ? "temperate" : v < 80 ? "warm" : "torrid";
}
function wetWord(v: number) {
  return v < 30 ? "arid" : v < 55 ? "moderate" : v < 78 ? "lush" : "drenched";
}
function upliftWord(v: number) {
  return v < 30 ? "worn" : v < 60 ? "rolling" : "jagged";
}
function riverWord(v: number) {
  return v < 30 ? "sparse" : v < 65 ? "many" : "braided";
}
function settleWord(v: number) {
  return v < 25 ? "wilderness" : v < 55 ? "frontier" : "settled";
}
function poiWord(v: number) {
  return v < 25 ? "few" : v < 60 ? "scattered" : "haunted";
}

interface SliderRow {
  key: "sea" | "climate" | "wet" | "mountains" | "rivers" | "settlements" | "pois";
  label: string;
  min: number;
  max: number;
  read: (v: number) => string;
}

const SLIDERS: SliderRow[] = [
  { key: "sea", label: "Sea level", min: 15, max: 70, read: (v) => v + "%" },
  { key: "climate", label: "Climate", min: 0, max: 100, read: climateWord },
  { key: "wet", label: "Wetness", min: 0, max: 100, read: wetWord },
  { key: "mountains", label: "Uplift", min: 0, max: 100, read: upliftWord },
  { key: "rivers", label: "Watercourses", min: 0, max: 100, read: riverWord },
  { key: "settlements", label: "Habitation", min: 0, max: 100, read: settleWord },
  { key: "pois", label: "Wild sites", min: 0, max: 100, read: poiWord },
];

const LAYER_CHIPS: { key: keyof Layers; label: string }[] = [
  { key: "grid", label: "Hex grid" },
  { key: "rivers", label: "Rivers" },
  { key: "roads", label: "Roads" },
  { key: "borders", label: "Realms" },
  { key: "labels", label: "Names" },
];

export function ForgeLeft() {
  const params = useStore((s) => s.params);
  const layers = useStore((s) => s.layers);
  const setParam = useStore((s) => s.setParam);
  const setHexMiles = useStore((s) => s.setHexMiles);
  const setEdge = useStore((s) => s.setEdge);
  const reroll = useStore((s) => s.reroll);
  const regenerate = useStore((s) => s.regenerate);
  const toggleLayer = useStore((s) => s.toggleLayer);

  return (
    <div>
      <div style={{ ...sectionHeader, marginBottom: 12 }}>The Forge</div>

      <label style={fieldLabel}>Seed word</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <input
          type="text"
          value={params.seed}
          onChange={(e) => setParam("seed", e.target.value)}
          style={{ ...inputStyle, flex: "1 1 auto", minWidth: 0 }}
        />
        <button
          className="hx-hover-btn"
          title="New seed"
          onClick={reroll}
          style={{
            flex: "0 0 auto",
            background: "#241f19",
            color: "#cfc4b0",
            border: "1px solid #3a3025",
            borderRadius: 3,
            fontSize: 12,
            padding: "0 9px",
            cursor: "pointer",
          }}
        >
          ↻
        </button>
      </div>

      <label style={fieldLabel}>Extent</label>
      <select
        value={params.size}
        onChange={(e) => setParam("size", e.target.value as typeof params.size)}
        style={{ ...inputStyle, marginBottom: 14 }}
      >
        <option value="small">Region — 30 × 22</option>
        <option value="medium">Kingdom — 46 × 32</option>
        <option value="large">Continent — 70 × 50</option>
      </select>

      <label style={fieldLabel}>Edge of the map</label>
      <select
        value={params.edge}
        onChange={(e) => setEdge(e.target.value as typeof params.edge)}
        style={{ ...inputStyle, marginBottom: 14 }}
      >
        <option value="sea">Sea-girt — ocean all round</option>
        <option value="open">Unsurveyed — land runs off the edge</option>
      </select>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 18,
        }}
      >
        <label style={{ fontSize: 11, color: "#9a8f7c", flex: "1 1 auto" }}>
          Miles per hex
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={params.hexMiles}
          onChange={(e) => setHexMiles(e.target.value)}
          style={{
            width: 62,
            background: "#100d0a",
            border: "1px solid #3a3025",
            borderRadius: 3,
            color: "#e6ddcd",
            fontSize: 12,
            padding: "5px 7px",
            textAlign: "right",
          }}
        />
      </div>

      <div style={{ ...hairline, margin: "0 0 16px" }} />

      {SLIDERS.map((sl) => (
        <div key={sl.key}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#9a8f7c",
              marginBottom: 6,
            }}
          >
            <span>{sl.label}</span>
            <span style={{ fontFamily: MONO, color: "#c9bda7" }}>
              {sl.read(params[sl.key])}
            </span>
          </div>
          <input
            type="range"
            min={sl.min}
            max={sl.max}
            value={params[sl.key]}
            onChange={(e) => setParam(sl.key, Number(e.target.value))}
            style={{ width: "100%", marginBottom: 15 }}
          />
        </div>
      ))}

      <button
        className="hx-ember"
        style={{ ...emberBtn, marginTop: 3 }}
        onClick={regenerate}
      >
        Forge the world
      </button>
      <div
        style={{
          fontSize: 10,
          color: "#6f6656",
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        Reforging redraws terrain and rebuilds generated holdings. Anything you
        placed by hand is kept.
      </div>

      <div style={{ ...hairline, margin: "20px 0 14px" }} />

      <div style={sectionHeader}>Layers</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {LAYER_CHIPS.map((lc) => (
          <button
            key={lc.key}
            style={chip(layers[lc.key])}
            onClick={() => toggleLayer(lc.key)}
          >
            {lc.label}
          </button>
        ))}
      </div>
    </div>
  );
}
