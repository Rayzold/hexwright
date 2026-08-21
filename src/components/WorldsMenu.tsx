import { useEffect, useRef, useState } from "react";
import {
  deleteSlot,
  deserialize,
  exportToFile,
  importFromFile,
  listSlots,
  readSlot,
  saveSlot,
  type SlotMeta,
} from "../store/persist";
import { exportMapPNG } from "../render/mapExport";
import { PREMADE_MAPS } from "../premade";
import type { SaveFile } from "../core/types";
import { buildShareUrl } from "../store/shareUrl";
import { useStore } from "../store/useStore";
import { MONO } from "../ui/styles";

const trigger: React.CSSProperties = {
  background: "#241f19",
  color: "#cfc4b0",
  border: "1px solid #3a3025",
  borderRadius: 3,
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "6px 10px",
  cursor: "pointer",
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

export function WorldsMenu() {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<SlotMeta[]>([]);
  const [name, setName] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const seed = useStore((s) => s.params.seed);
  const hydrate = useStore((s) => s.hydrate);

  const refresh = () => setSlots(listSlots());

  useEffect(() => {
    if (open) {
      refresh();
      setName(seed);
    }
  }, [open, seed]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const doSave = () => {
    const n = name.trim() || seed;
    saveSlot(n, useStore.getState());
    refresh();
  };
  const doLoad = (slotName: string) => {
    const file = readSlot(slotName);
    if (!file) return;
    hydrate(deserialize(file));
    // trigger a re-fit of the loaded map
    hydrate({ fitV: useStore.getState().fitV + 1 });
    setOpen(false);
  };
  const doDelete = (slotName: string) => {
    deleteSlot(slotName);
    refresh();
  };
  const [copied, setCopied] = useState(false);
  const doLoadPremade = (build: () => SaveFile) => {
    hydrate(deserialize(build()));
    hydrate({ fitV: useStore.getState().fitV + 1 });
    setOpen(false);
  };
  const doExport = () => exportToFile(useStore.getState());
  const doExportPNG = () => exportMapPNG();
  const doCopyLink = async () => {
    const url = buildShareUrl(useStore.getState().params);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this world link:", url);
    }
  };
  const doImport = async (file: File) => {
    try {
      const parsed = await importFromFile(file);
      hydrate(deserialize(parsed));
      hydrate({ fitV: useStore.getState().fitV + 1 });
      setOpen(false);
    } catch (err) {
      alert(
        "Couldn't read that file — " +
          (err instanceof Error ? err.message : "unknown error.")
      );
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button style={trigger} onClick={() => setOpen((o) => !o)}>
        Worlds ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 268,
            background: "#1b1712",
            border: "1px solid #322a20",
            borderRadius: 3,
            padding: 12,
            zIndex: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "#7d7361",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Premade worlds
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {PREMADE_MAPS.map((m) => (
              <button
                key={m.id}
                onClick={() => doLoadPremade(m.build)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "#201b15",
                  border: "1px solid #2b241c",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, color: "#d6cab4" }}>{m.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "#7d7361", marginTop: 2 }}>
                  {m.blurb}
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "#7d7361",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Save this world
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="World name"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                background: "#100d0a",
                border: "1px solid #3a3025",
                borderRadius: 3,
                color: "#e6ddcd",
                fontSize: 12,
                padding: "6px 8px",
              }}
            />
            <button
              className="hx-ember"
              style={{
                flex: "0 0 auto",
                background: "#b8511f",
                color: "#fdf3e2",
                border: "none",
                borderRadius: 3,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0 12px",
                cursor: "pointer",
              }}
              onClick={doSave}
            >
              Save
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button
              className="hx-hover-btn"
              style={{
                flex: "1 1 0",
                padding: "6px 8px",
                background: "#241f19",
                color: "#cfc4b0",
                border: "1px solid #3a3025",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
              }}
              onClick={doExport}
            >
              Export file
            </button>
            <button
              className="hx-hover-btn"
              style={{
                flex: "1 1 0",
                padding: "6px 8px",
                background: "#241f19",
                color: "#cfc4b0",
                border: "1px solid #3a3025",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
              }}
              onClick={() => fileRef.current?.click()}
            >
              Import file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = "";
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button
              className="hx-hover-btn"
              style={{
                flex: "1 1 0",
                padding: "6px 8px",
                background: "#241f19",
                color: "#cfc4b0",
                border: "1px solid #3a3025",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
              }}
              onClick={doExportPNG}
            >
              Export PNG
            </button>
            <button
              className="hx-hover-btn"
              style={{
                flex: "1 1 0",
                padding: "6px 8px",
                background: "#241f19",
                color: copied ? "#f0c9a8" : "#cfc4b0",
                border: "1px solid #3a3025",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
              }}
              onClick={doCopyLink}
            >
              {copied ? "Link copied ✓" : "Copy share link"}
            </button>
          </div>

          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "#7d7361",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Saved worlds
          </div>
          {slots.length === 0 ? (
            <div style={{ fontSize: 11, color: "#6f6656", lineHeight: 1.6 }}>
              None saved yet. Your progress is autosaved in this browser.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {slots.map((slot) => (
                <div
                  key={slot.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    background: "#201b15",
                    border: "1px solid #2b241c",
                    borderRadius: 3,
                  }}
                >
                  <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#d6cab4",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {slot.name}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: "#7d7361" }}>
                      {slot.seed} · {timeAgo(slot.savedAt)}
                    </div>
                  </div>
                  <button
                    className="hx-hover-btn"
                    style={{
                      background: "#241f19",
                      color: "#cfc4b0",
                      border: "1px solid #3a3025",
                      borderRadius: 3,
                      fontSize: 10,
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                    onClick={() => doLoad(slot.name)}
                  >
                    Load
                  </button>
                  <button
                    className="hx-raze"
                    style={{
                      background: "transparent",
                      color: "#b06a4a",
                      border: "1px solid #4a3428",
                      borderRadius: 3,
                      fontSize: 10,
                      padding: "4px 7px",
                      cursor: "pointer",
                    }}
                    onClick={() => doDelete(slot.name)}
                    aria-label={"Delete " + slot.name}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
