import { BIOMES } from "../core/biomes";
import type { BiomeKey, ObjectType } from "../core/types";
import { useStore } from "../store/useStore";
import {
  MONO,
  SERIF,
  fieldLabel,
  hairline,
  inputStyle,
  sectionHeader,
  toolBtn,
} from "../ui/styles";

const BRUSHES: { tool: string; label: string }[] = [
  { tool: "t:grass", label: "Grassland" },
  { tool: "t:forest", label: "Forest" },
  { tool: "t:hills", label: "Hills" },
  { tool: "t:mountains", label: "Mountains" },
  { tool: "t:swamp", label: "Marsh" },
  { tool: "t:desert", label: "Desert" },
  { tool: "t:snow", label: "Snowcap" },
  { tool: "t:ocean", label: "Water" },
];

const STAMPS: { tool: string; label: string }[] = [
  { tool: "city", label: "City" },
  { tool: "town", label: "Town" },
  { tool: "village", label: "Village" },
  { tool: "keep", label: "Keep" },
  { tool: "ruin", label: "Ruin" },
  { tool: "dungeon", label: "Dungeon" },
  { tool: "camp", label: "Camp" },
  { tool: "", label: "Select" },
];

const wellCaption: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 8,
  letterSpacing: "0.16em",
  color: "#7d7361",
  textTransform: "uppercase",
  marginBottom: 3,
};

export function ForgeRight() {
  const tool = useStore((s) => s.tool);
  const pickTool = useStore((s) => s.pickTool);
  const world = useStore((s) => s.world);
  const objects = useStore((s) => s.objects);
  const selected = useStore((s) => s.selected);
  const revealed = useStore((s) => s.revealed);
  const patchSel = useStore((s) => s.patchSel);
  const deleteSel = useStore((s) => s.deleteSel);
  const onRealmName = useStore((s) => s.onRealmName);
  useStore((s) => s.paintV); // re-render when terrain painted

  const brushHint = tool.startsWith("t:")
    ? "Painting " +
      BIOMES[tool.slice(2) as BiomeKey].name.toLowerCase() +
      ". Click or drag across the map. Reforging keeps what you painted."
    : "Pick a ground to repaint hexes. Water erases rivers and blocks travel on foot.";

  const toolHint =
    tool && !tool.startsWith("t:")
      ? "Click any hex to raise a " + tool + ". Drag an existing one to move it."
      : "Click a holding to inspect it, or drag it to another hex.";

  const labelOf = (i: number): string => {
    if (!world) return "—";
    const c = i % world.w;
    const r = (i - c) / world.w;
    return String(c + 1).padStart(2, "0") + "." + String(r + 1).padStart(2, "0");
  };

  const selObj =
    selected && selected.kind === "object"
      ? objects.find((o) => o.id === selected.id) || null
      : null;

  const realmSentence = (hex: number): string => {
    if (!world) return "";
    const owner = world.owner[hex];
    const realm = owner >= 0 ? world.realms[owner] : null;
    return realm
      ? "Within " + realm.name + ", seat at " + realm.seat + "."
      : "Beyond any realm's writ.";
  };

  return (
    <div>
      <div style={sectionHeader}>Terrain brush</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {BRUSHES.map((b) => (
          <button key={b.tool} style={toolBtn(tool === b.tool)} onClick={() => pickTool(b.tool)}>
            {b.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#6f6656", lineHeight: 1.5, marginBottom: 18 }}>
        {brushHint}
      </div>

      <div style={sectionHeader}>Stamps</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {STAMPS.map((st) => (
          <button
            key={st.label}
            style={toolBtn(st.tool === "" ? !tool : tool === st.tool)}
            onClick={() => pickTool(st.tool)}
          >
            {st.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#6f6656", lineHeight: 1.5, marginBottom: 18 }}>
        {toolHint}
      </div>

      <div style={{ ...hairline, margin: "0 0 14px" }} />

      <div style={{ ...sectionHeader, marginBottom: 12 }}>Inspector</div>

      {!selected && (
        <div
          style={{
            border: "1px dashed #3a3025",
            borderRadius: 3,
            padding: "18px 14px",
            textAlign: "center",
            fontSize: 11,
            color: "#7d7361",
            lineHeight: 1.6,
          }}
        >
          Nothing selected. Click a holding to name it, or a hex to read the ground.
        </div>
      )}

      {selObj && world && (
        <div>
          <label style={fieldLabel}>Name</label>
          <input
            type="text"
            value={selObj.name}
            onChange={(e) => patchSel({ name: e.target.value })}
            style={{ ...inputStyle, fontSize: 13, padding: "7px 9px", marginBottom: 12 }}
          />

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: "1 1 0", minWidth: 0 }}>
              <label style={fieldLabel}>Kind</label>
              <select
                value={selObj.type}
                onChange={(e) => patchSel({ type: e.target.value as ObjectType })}
                style={{ ...inputStyle, padding: "6px 7px" }}
              >
                <option value="city">City</option>
                <option value="town">Town</option>
                <option value="village">Village</option>
                <option value="keep">Keep</option>
                <option value="ruin">Ruin</option>
                <option value="dungeon">Dungeon</option>
                <option value="camp">Camp</option>
              </select>
            </div>
            <div style={{ flex: "0 0 104px" }}>
              <label style={fieldLabel}>Souls</label>
              <input
                type="number"
                min={0}
                step={50}
                value={selObj.pop}
                onChange={(e) => patchSel({ pop: Math.max(0, Number(e.target.value) || 0) })}
                style={{ ...inputStyle, padding: "6px 7px", textAlign: "right" }}
              />
            </div>
          </div>

          <label style={fieldLabel}>Warden's notes</label>
          <textarea
            value={selObj.notes}
            onChange={(e) => patchSel({ notes: e.target.value })}
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              background: "#2b241c",
              border: "1px solid #2b241c",
              borderRadius: 3,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div style={{ background: "#201b15", padding: "8px 10px" }}>
              <div style={wellCaption}>Hex</div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: "#e6ddcd" }}>
                {labelOf(selObj.hex)}
              </div>
            </div>
            <div style={{ background: "#201b15", padding: "8px 10px" }}>
              <div style={wellCaption}>Ground</div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: "#e6ddcd" }}>
                {BIOMES[world.biome[selObj.hex]].name}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#8e8471", lineHeight: 1.6, marginBottom: 12 }}>
            {realmSentence(selObj.hex)}
          </div>

          <button
            className="hx-raze"
            onClick={deleteSel}
            style={{
              width: "100%",
              padding: 9,
              background: "transparent",
              color: "#b06a4a",
              border: "1px solid #4a3428",
              borderRadius: 3,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Raze this holding
          </button>
        </div>
      )}

      {selected && selected.kind === "hex" && world && (
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 26, color: "#f0e7d6", marginBottom: 2 }}>
            {BIOMES[world.biome[selected.i]].name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#7d7361", marginBottom: 14 }}>
            Hex {labelOf(selected.i)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {hexFacts(selected.i).map((f) => (
              <div
                key={f.k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  paddingBottom: 6,
                  borderBottom: "1px solid #241f19",
                }}
              >
                <span style={{ fontSize: 11, color: "#8e8471" }}>{f.k}</span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "#d6cab4",
                    textAlign: "right",
                  }}
                >
                  {f.v}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#8e8471", lineHeight: 1.6, marginTop: 14 }}>
            {realmSentence(selected.i)}
          </div>
        </div>
      )}

      <div style={{ ...hairline, margin: "20px 0 14px" }} />
      <div style={sectionHeader}>Gazetteer</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {world?.realms.map((r, k) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                flex: "0 0 auto",
                background: r.color,
              }}
            />
            <input
              className="hx-realm-name"
              type="text"
              value={r.name}
              onChange={(e) => onRealmName(k, e.target.value)}
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #2b241c",
                color: "#d6cab4",
                fontFamily: SERIF,
                fontSize: 15,
                padding: "3px 0",
              }}
            />
            <span
              style={{ fontFamily: MONO, fontSize: 10, color: "#7d7361", flex: "0 0 auto" }}
            >
              {r.hexes} hex · {r.seat}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: "#6f6656", marginTop: 14, lineHeight: 1.6 }}>
        {tally()}
      </div>
    </div>
  );

  // eslint-disable-next-line no-inner-declarations
  function hexFacts(i: number): { k: string; v: string }[] {
    if (!world) return [];
    const b = world.biome[i];
    const cost = BIOMES[b].cost;
    const hh = world.land[i] ? (world.el[i] - world.sea) / (1 - world.sea) : 0;
    return [
      {
        k: "Movement cost",
        v:
          cost === null
            ? "water — ship only"
            : "×" + cost.toFixed(1) + " (" + (cost * world.hexMiles).toFixed(0) + " travel mi)",
      },
      {
        k: "Encounter odds",
        v: Math.max(1, Math.round(BIOMES[b].wild * 0.42 * 6)) + "-in-6",
      },
      {
        k: "Elevation",
        v: world.land[i] ? Math.round(hh * 100) + "% of relief" : "below sea level",
      },
      {
        k: "Water",
        v: world.river[i]
          ? "river, flow " + Math.round(world.flow[i])
          : BIOMES[b].water
            ? "open water"
            : "dry",
      },
      {
        k: "Charted",
        v: revealed && revealed.has(i) ? "known to the party" : "unexplored",
      },
    ];
  }

  function tally(): string {
    if (!world) return "";
    const counts = objects.reduce<Record<string, number>>((a, o) => {
      a[o.type] = (a[o.type] || 0) + 1;
      return a;
    }, {});
    let landCount = 0;
    for (let i = 0; i < world.n; i++) landCount += world.land[i];
    return (
      landCount +
      " land hexes · " +
      Math.round((landCount / world.n) * 100) +
      "% dry · " +
      (counts.city || 0) +
      " cities, " +
      (counts.town || 0) +
      " towns, " +
      (counts.village || 0) +
      " villages, " +
      ((counts.ruin || 0) +
        (counts.dungeon || 0) +
        (counts.camp || 0) +
        (counts.keep || 0)) +
      " wild sites"
    );
  }
}
