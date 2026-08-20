import { useEffect, useRef } from "react";
import { ForgeLeft } from "./components/ForgeLeft";
import { ForgeRight } from "./components/ForgeRight";
import { Header } from "./components/Header";
import { MapStage } from "./components/MapStage";
import { TableLeft } from "./components/TableLeft";
import { TableRight } from "./components/TableRight";
import { deserialize, readAutosave, writeAutosave } from "./store/persist";
import { useStore } from "./store/useStore";

const panelBase: React.CSSProperties = {
  background: "#1b1712",
  overflowY: "auto",
  padding: "16px 15px 28px",
};

export default function App() {
  const mode = useStore((s) => s.mode);
  const didInit = useRef(false);

  // --- initial load: autosave if present, else a fresh world ---
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
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

        <MapStage />

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
      </div>
    </div>
  );
}
