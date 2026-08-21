import { useMemo, useState } from "react";
import {
  ALLEGIANCE_COLOR,
  OBJECT_TYPES,
  SETTLEMENT_TYPES,
  SITE_TYPES,
} from "../core/objectTypes";
import type { Allegiance, MapObject, ObjectType, Realm } from "../core/types";
import { useStore } from "../store/useStore";
import { MONO, SERIF } from "../ui/styles";

const TYPE_ORDER: ObjectType[] = [...SETTLEMENT_TYPES, ...SITE_TYPES];
const orderOf = (t: ObjectType) => {
  const i = TYPE_ORDER.indexOf(t);
  return i < 0 ? 99 : i;
};

const ALLEGIANCE_FILTERS: ("all" | Allegiance)[] = [
  "all",
  "friendly",
  "neutral",
  "hostile",
];

interface Group {
  realm: Realm | null;
  objects: MapObject[];
}

const nameInput: React.CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid #2b241c",
  color: "#e6ddcd",
  fontFamily: SERIF,
  fontSize: 14,
  padding: "3px 0",
};

export function Atlas() {
  const atlasOpen = useStore((s) => s.atlasOpen);
  const toggleAtlas = useStore((s) => s.toggleAtlas);
  const world = useStore((s) => s.world);
  const objects = useStore((s) => s.objects);
  const renameObject = useStore((s) => s.renameObject);
  const onRealmName = useStore((s) => s.onRealmName);
  const deleteObject = useStore((s) => s.deleteObject);
  const hydrate = useStore((s) => s.hydrate);
  const [query, setQuery] = useState("");
  const [allegFilter, setAllegFilter] = useState<"all" | Allegiance>("all");

  const groups = useMemo<Group[]>(() => {
    if (!world) return [];
    const byRealm = new Map<number, MapObject[]>();
    const unclaimed: MapObject[] = [];
    for (const o of objects) {
      if (o.hex >= world.n) continue;
      const owner = world.owner[o.hex];
      if (owner >= 0 && world.realms[owner]) {
        const arr = byRealm.get(owner) || [];
        arr.push(o);
        byRealm.set(owner, arr);
      } else {
        unclaimed.push(o);
      }
    }
    const sortObjs = (a: MapObject, b: MapObject) =>
      orderOf(a.type) - orderOf(b.type) || a.name.localeCompare(b.name);
    const out: Group[] = world.realms.map((r) => ({
      realm: r,
      objects: (byRealm.get(r.id) || []).sort(sortObjs),
    }));
    if (unclaimed.length)
      out.push({ realm: null, objects: unclaimed.sort(sortObjs) });
    return out;
  }, [world, objects]);

  if (!atlasOpen) return null;

  const q = query.trim().toLowerCase();
  const match = (o: MapObject) =>
    (!q || o.name.toLowerCase().includes(q)) &&
    (allegFilter === "all" || o.allegiance === allegFilter);

  const labelOf = (hex: number): string => {
    if (!world) return "—";
    const c = hex % world.w;
    const r = (hex - c) / world.w;
    return (
      String(c + 1).padStart(2, "0") + "." + String(r + 1).padStart(2, "0")
    );
  };

  const focusHex = (hex: number) => {
    hydrate({ selected: { kind: "hex", i: hex } });
  };

  const totalHoldings = objects.length;

  return (
    <>
      <div
        onClick={toggleAtlas}
        style={{
          position: "fixed",
          inset: "54px 0 0 0",
          background: "rgba(16,13,10,0.45)",
          zIndex: 30,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 54,
          right: 0,
          bottom: 0,
          width: 380,
          maxWidth: "92vw",
          background: "#1b1712",
          borderLeft: "1px solid #322a20",
          zIndex: 31,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid #2b241c",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#7d7361",
              textTransform: "uppercase",
            }}
          >
            Atlas
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: "#6f6656" }}>
            {totalHoldings} holdings · {world?.realms.length ?? 0} realms
          </span>
          <button
            className="hx-hover-btn"
            onClick={toggleAtlas}
            aria-label="Close atlas"
            style={{
              marginLeft: "auto",
              width: 26,
              height: 26,
              background: "#241f19",
              color: "#cfc4b0",
              border: "1px solid #3a3025",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "10px 16px", borderBottom: "1px solid #2b241c" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            style={{
              width: "100%",
              background: "#100d0a",
              border: "1px solid #3a3025",
              borderRadius: 3,
              color: "#e6ddcd",
              fontSize: 12,
              padding: "6px 8px",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 2,
              marginTop: 8,
              padding: 3,
              background: "#100d0a",
              border: "1px solid #322a20",
              borderRadius: 3,
            }}
          >
            {ALLEGIANCE_FILTERS.map((a) => {
              const on = allegFilter === a;
              return (
                <button
                  key={a}
                  onClick={() => setAllegFilter(a)}
                  style={{
                    flex: "1 1 0",
                    padding: "4px 6px",
                    border: "none",
                    borderRadius: 2,
                    cursor: "pointer",
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: on ? "#3a3025" : "transparent",
                    color: on ? "#f0e7d6" : "#8a7f6c",
                  }}
                >
                  {a === "all" ? "All" : a}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "6px 16px 24px" }}>
          {groups.map((grp, gi) => {
            const shown = grp.objects.filter(match);
            const filtering = !!q || allegFilter !== "all";
            if (filtering && shown.length === 0) return null;
            return (
              <div key={grp.realm ? grp.realm.id : "unclaimed-" + gi} style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      flex: "0 0 auto",
                      background: grp.realm ? grp.realm.color : "#4a3b28",
                    }}
                  />
                  {grp.realm ? (
                    <input
                      className="hx-realm-name"
                      type="text"
                      value={grp.realm.name}
                      onChange={(e) => onRealmName(grp.realm!.id, e.target.value)}
                      style={{ ...nameInput, fontSize: 16, color: "#f0e7d6" }}
                    />
                  ) : (
                    <span
                      style={{ flex: "1 1 auto", fontFamily: SERIF, fontSize: 16, color: "#9a8f7c" }}
                    >
                      Unclaimed lands
                    </span>
                  )}
                  <span style={{ fontFamily: MONO, fontSize: 10, color: "#7d7361" }}>
                    {grp.objects.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 19 }}>
                  {shown.map((o) => (
                    <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span
                        title={o.allegiance}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          flex: "0 0 auto",
                          background: ALLEGIANCE_COLOR[o.allegiance],
                          opacity: o.cleared ? 0.4 : 1,
                        }}
                      />
                      <input
                        className="hx-realm-name"
                        type="text"
                        value={o.name}
                        onChange={(e) => renameObject(o.id, e.target.value)}
                        style={{
                          ...nameInput,
                          textDecoration: o.cleared ? "line-through" : "none",
                          opacity: o.cleared ? 0.6 : 1,
                        }}
                      />
                      <button
                        onClick={() => focusHex(o.hex)}
                        title="Show on map"
                        style={{
                          flex: "0 0 auto",
                          background: "transparent",
                          border: "none",
                          color: "#7d7361",
                          fontFamily: MONO,
                          fontSize: 10,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {OBJECT_TYPES[o.type].label} · {labelOf(o.hex)}
                        {o.threat ? " · T" + o.threat : ""}
                      </button>
                      <button
                        onClick={() => deleteObject(o.id)}
                        title="Remove"
                        aria-label={"Remove " + o.name}
                        style={{
                          flex: "0 0 auto",
                          background: "transparent",
                          border: "none",
                          color: "#7d5b52",
                          fontSize: 12,
                          cursor: "pointer",
                          padding: "0 2px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
