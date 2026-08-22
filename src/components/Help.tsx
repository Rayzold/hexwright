import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { MONO, SERIF } from "../ui/styles";

interface Section {
  icon: string;
  title: string;
  lines: string[];
}

const SECTIONS: Section[] = [
  {
    icon: "⚒",
    title: "Forge — build the world",
    lines: [
      "Left panel: pick a seed and extent, set the dials (climate, wetness, uplift, watercourses, habitation, wild sites, menace), then press Forge the world.",
      "Region preset generates a world in the image of one of the 14 regions.",
      "Right panel — Terrain brush: pick a ground, choose a brush Size, or turn on Fill to flood an area. Click or drag on the map.",
      "Stamps: place cities, holdings, and sites. Select clears the tool so you can pick things up.",
      "Inspector: click a holding or a hex to read and edit it — name, kind, souls, allegiance, threat, and whether a site is cleared.",
      "Realms: add nations, recolor them, and Paint to claim hexes; borders follow your brush.",
    ],
  },
  {
    icon: "⌛",
    title: "Table — run the journey",
    lines: [
      "Set the Pace, Season, and Weather. Roll weather gives a season-appropriate roll; the Observatory line forecasts what's likely.",
      "Plotting: choose By hand (straight legs) or Find the way (cheapest path), then click hexes on the map to lay a route. Drag a waypoint to bend it.",
      "March the way advances the calendar, lifts the fog along the road, and rolls the encounter checks into the log.",
      "Roll an encounter gives a table result for the party's ground. The party token and its trail track where you've been.",
      "Reckoning shows the in-world date, weekday, season, and the next holiday.",
    ],
  },
  {
    icon: "👁",
    title: "Sight & the map",
    lines: [
      "Sight toggles Warden (you see everything) and Party (unexplored hexes stay under fog).",
      "Pan by dragging with the middle mouse button, or holding Space and dragging. The wheel zooms toward the cursor.",
      "The Key (bottom-right of the map) explains the marker shapes.",
    ],
  },
  {
    icon: "🗂",
    title: "Atlas, Worlds & shortcuts",
    lines: [
      "Atlas lists every holding by realm — rename, recolor realms, filter by allegiance, or remove a holding.",
      "Worlds: save and load named worlds, export or import a file, export a PNG, copy a share link, or load a premade map.",
      "Undo / redo with Ctrl+Z and Ctrl+Shift+Z. Your work autosaves in this browser.",
    ],
  },
];

export function Help() {
  const open = useStore((s) => s.helpOpen);
  const setHelp = useStore((s) => s.setHelp);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setHelp]);

  if (!open) return null;

  return (
    <div
      onClick={() => setHelp(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16,13,10,0.6)",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: "100%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: "#1b1712",
          border: "1px solid #322a20",
          borderRadius: 4,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            padding: "18px 22px",
            borderBottom: "1px solid #2b241c",
          }}
        >
          <span
            style={{
              fontFamily: SERIF,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.14em",
              color: "#f0e7d6",
            }}
          >
            HEXWRIGHT
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: "#8a7f6c", textTransform: "uppercase" }}>
            how to use
          </span>
          <button
            className="hx-hover-btn"
            onClick={() => setHelp(false)}
            aria-label="Close guide"
            style={{
              marginLeft: "auto",
              width: 28,
              height: 28,
              background: "#241f19",
              color: "#cfc4b0",
              border: "1px solid #3a3025",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "18px 22px 24px" }}>
          <p style={{ fontSize: 13, color: "#c9bda7", lineHeight: 1.6, margin: "0 0 18px" }}>
            Hexwright generates a hex overworld you can hand-edit, then uses it at the
            table to plot travel, mark the days, and run encounters. Switch between the
            two modes with the toggle at the top-left.
          </p>
          {SECTIONS.map((s) => (
            <div key={s.title} style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  marginBottom: 9,
                }}
              >
                <span style={{ fontSize: 15 }}>{s.icon}</span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: "#c9a24a",
                    textTransform: "uppercase",
                  }}
                >
                  {s.title}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {s.lines.map((l, i) => (
                  <li key={i} style={{ fontSize: 12, color: "#b7ab95", lineHeight: 1.55 }}>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
