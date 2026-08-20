import { useEffect, useRef } from "react";
import { ForgeLeft } from "./components/ForgeLeft";
import { ForgeRight } from "./components/ForgeRight";
import { Header } from "./components/Header";
import { MapStage } from "./components/MapStage";
import { TableLeft } from "./components/TableLeft";
import { TableRight } from "./components/TableRight";
import { deserialize, readAutosave, writeAutosave } from "./store/persist";
import { parseShareParams } from "./store/shareUrl";
import { useStore } from "./store/useStore";

const panelBase: React.CSSProperties = {
  background: "#1b1712",
  overflowY: "auto",
  padding: "16px 15px 28px",
};

function CollapseHandle({
  side,
  open,
  onClick,
}: {
  side: "left" | "right";
  open: boolean;
  onClick: () => void;
}) {
  // chevron points toward the action: collapse (into the panel) or expand (out)
  const glyph =
    side === "left" ? (open ? "‹" : "›") : open ? "›" : "‹";
  const style: React.CSSProperties = {
    width: 18,
    alignSelf: "stretch",
    flex: "0 0 18px",
    background: "#1b1712",
    color: "#7d7361",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    padding: 0,
  };
  if (side === "left") style.borderRight = "1px solid #322a20";
  else style.borderLeft = "1px solid #322a20";
  return (
    <button
      className="hx-hover-btn"
      onClick={onClick}
      title={open ? "Collapse panel" : "Expand panel"}
      style={style}
    >
      {glyph}
    </button>
  );
}

export default function App() {
  const mode = useStore((s) => s.mode);
  const leftOpen = useStore((s) => s.leftOpen);
  const rightOpen = useStore((s) => s.rightOpen);
  const toggleLeft = useStore((s) => s.toggleLeft);
  const toggleRight = useStore((s) => s.toggleRight);
  const didInit = useRef(false);

  // --- initial load: autosave if present, else a fresh world ---
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // A share link's params win over the autosave and generate that world.
    const shared = parseShareParams(window.location.search);
    if (shared) {
      useStore.setState((s) => ({ params: { ...s.params, ...shared } }));
      useStore.getState().build(false);
      // strip the query so later edits/reloads use the autosave
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // collapse the side panels if we open on a narrow screen
    if (window.innerWidth < 900) useStore.getState().setPanels(false, false);

    const save = readAutosave();
    if (save) {
      try {
        useStore.getState().hydrate(deserialize(save));
        useStore.setState((s) => ({ fitV: s.fitV + 1 }));
        return;
      } catch {
        /* fall through to a fresh build */
      }
    }
    useStore.getState().build(false);
  }, []);

  // --- autosave (debounced) when a *persisted* slice changes ---
  // Only these fields end up in a save file, so transient state (hover, drag,
  // zoom, selection) must not re-arm the timer or we'd never settle while the
  // pointer moves.
  useEffect(() => {
    let t: number | undefined;
    const snap = () => {
      const s = useStore.getState();
      return [
        s.params,
        s.paint,
        s.objects,
        s.realmNames,
        s.party,
        s.day,
        s.journal,
        s.revealed,
        s.layers,
        s.theme,
      ];
    };
    let prev = snap();
    const unsub = useStore.subscribe((s) => {
      if (!s.world) return;
      const next = snap();
      const changed = next.some((v, i) => v !== prev[i]);
      if (!changed) return;
      prev = next;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => writeAutosave(useStore.getState()), 600);
    });
    return () => {
      if (t) window.clearTimeout(t);
      unsub();
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        background: "#16120e",
        color: "#e6ddcd",
        overflow: "hidden",
      }}
    >
      <Header />
      <div style={{ display: "flex", flex: "1 1 auto", minHeight: 0 }}>
        {leftOpen && (
          <aside
            style={{
              ...panelBase,
              width: 268,
              flex: "0 0 268px",
              borderRight: "1px solid #322a20",
            }}
          >
            {mode === "forge" ? <ForgeLeft /> : <TableLeft />}
          </aside>
        )}
        <CollapseHandle side="left" open={leftOpen} onClick={toggleLeft} />

        <MapStage />

        <CollapseHandle side="right" open={rightOpen} onClick={toggleRight} />
        {rightOpen && (
          <aside
            style={{
              ...panelBase,
              width: 316,
              flex: "0 0 316px",
              borderLeft: "1px solid #322a20",
            }}
          >
            {mode === "forge" ? <ForgeRight /> : <TableRight />}
          </aside>
        )}
      </div>
    </div>
  );
}
