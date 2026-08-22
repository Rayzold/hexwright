import { useStore } from "../store/useStore";
import { MONO, SERIF, tab } from "../ui/styles";
import { WorldsMenu } from "./WorldsMenu";

const zoomBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  background: "#241f19",
  color: "#cfc4b0",
  border: "1px solid #3a3025",
  borderRadius: 3,
  fontSize: 14,
  lineHeight: 1,
  cursor: "pointer",
};

export function Header() {
  const mode = useStore((s) => s.mode);
  const view = useStore((s) => s.view);
  const zoom = useStore((s) => s.zoom);
  const theme = useStore((s) => s.theme);
  const setMode = useStore((s) => s.setMode);
  const setView = useStore((s) => s.setView);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.undoStack.length > 0);
  const canRedo = useStore((s) => s.redoStack.length > 0);
  const toggleAtlas = useStore((s) => s.toggleAtlas);
  const atlasOpen = useStore((s) => s.atlasOpen);
  const setHelp = useStore((s) => s.setHelp);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "0 18px",
        height: 54,
        flex: "0 0 auto",
        borderBottom: "1px solid #322a20",
        background: "#1b1712",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span
          style={{
            fontFamily: SERIF,
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "#f0e7d6",
          }}
        >
          HEXWRIGHT
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "#8a7f6c",
            textTransform: "uppercase",
          }}
        >
          survey &amp; passage
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          background: "#100d0a",
          border: "1px solid #322a20",
          borderRadius: 3,
        }}
      >
        <button style={tab(mode === "forge")} onClick={() => setMode("forge")}>
          Forge
        </button>
        <button style={tab(mode === "table")} onClick={() => setMode("table")}>
          Table
        </button>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        <button
          className="hx-hover-btn"
          style={{ ...zoomBtn, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "default" }}
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↶
        </button>
        <button
          className="hx-hover-btn"
          style={{ ...zoomBtn, opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "default" }}
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          ↷
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: "auto",
        }}
      >
        <button
          className="hx-hover-btn"
          style={{
            ...zoomBtn,
            width: "auto",
            padding: "0 12px",
            fontSize: 9,
            fontFamily: MONO,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            border: "1px solid " + (atlasOpen ? "#8a4a24" : "#3a3025"),
            background: atlasOpen ? "#3a2016" : "#241f19",
            color: atlasOpen ? "#f0c9a8" : "#cfc4b0",
          }}
          onClick={toggleAtlas}
          title="Atlas — all holdings by realm"
        >
          Atlas
        </button>
        <button
          className="hx-hover-btn"
          style={{ ...zoomBtn, width: "auto", padding: "0 10px", fontSize: 12 }}
          onClick={toggleTheme}
          title={theme === "parchment" ? "Parchment map — switch to dusk" : "Dusk map — switch to parchment"}
        >
          {theme === "parchment" ? "☀" : "☾"}
        </button>
        <button
          className="hx-hover-btn"
          style={{ ...zoomBtn, width: "auto", padding: "0 10px", fontSize: 13 }}
          onClick={() => setHelp(true)}
          title="How to use Hexwright"
          aria-label="Open the guide"
        >
          ?
        </button>
        <WorldsMenu />
        <div style={{ width: 1, height: 22, background: "#322a20", margin: "0 2px" }} />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.16em",
            color: "#7d7361",
            textTransform: "uppercase",
          }}
        >
          Sight
        </span>
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            background: "#100d0a",
            border: "1px solid #322a20",
            borderRadius: 3,
          }}
        >
          <button style={tab(view === "gm")} onClick={() => setView("gm")}>
            Warden
          </button>
          <button style={tab(view === "players")} onClick={() => setView("players")}>
            Party
          </button>
        </div>
        <div style={{ width: 1, height: 22, background: "#322a20", margin: "0 6px" }} />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "#9a8f7c",
            minWidth: 44,
            textAlign: "right",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="hx-hover-btn"
          style={zoomBtn}
          onClick={zoomOut}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          className="hx-hover-btn"
          style={zoomBtn}
          onClick={zoomIn}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </header>
  );
}
