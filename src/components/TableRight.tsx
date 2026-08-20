import { useMemo } from "react";
import { BIOMES } from "../core/biomes";
import { THEMES, biomeColor } from "../core/themes";
import type { BiomeKey } from "../core/types";
import { dateStr, pace, route as computeRoute } from "../core/travel";
import { useStore } from "../store/useStore";
import { MONO, SERIF, emberBtn, hairline, sectionHeader } from "../ui/styles";

const wellCaption: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 8,
  letterSpacing: "0.16em",
  color: "#7d7361",
  textTransform: "uppercase",
  marginBottom: 3,
};
const wellValue: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 15,
  color: "#e6ddcd",
};
const well: React.CSSProperties = { background: "#201b15", padding: "9px 11px" };

export function TableRight() {
  const world = useStore((s) => s.world);
  const waypoints = useStore((s) => s.waypoints);
  const routeMode = useStore((s) => s.routeMode);
  const party = useStore((s) => s.party);
  const day = useStore((s) => s.day);
  const journal = useStore((s) => s.journal);
  const theme = useStore((s) => s.theme);
  const paintV = useStore((s) => s.paintV);
  const march = useStore((s) => s.march);

  const T = THEMES[theme];

  const r = useMemo(() => {
    if (!world) return null;
    return computeRoute(world, waypoints, routeMode, party.speed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, waypoints, routeMode, party.speed, paintV, world?.hexMiles]);

  const hasCells = !!(r && r.cells);
  const blocked = !!(r && r.blocked);
  const noRoute = !r || (waypoints.length === 1);

  let daysBig = "—";
  let arrival = "—";
  let hexCount = "0";
  let pathMiles = "—";
  let crowMiles = "—";
  let effPace = "—";
  let checkCount = "0";
  let checkLabel = "";
  let terrainBreak: { key: BiomeKey; color: string; name: string; detail: string }[] = [];

  if (hasCells && r && world) {
    const days = (r.cost as number) / pace(party);
    daysBig = days < 10 ? days.toFixed(1) : String(Math.round(days));
    arrival = dateStr(day + Math.max(1, Math.ceil(days)));
    hexCount = String(r.cells!.length - 1);
    pathMiles = Math.round(r.pathMiles as number) + " mi";
    crowMiles = Math.round(r.crow as number) + " mi";
    effPace = pace(party).toFixed(0) + " mi/day";
    const total = Math.max(1, r.cells!.length - 1);
    const counts = r.counts as Partial<Record<BiomeKey, number>>;
    terrainBreak = (Object.keys(counts) as BiomeKey[])
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
      .slice(0, 6)
      .map((k) => ({
        key: k,
        color: biomeColor(T, k),
        name: BIOMES[k].name,
        detail:
          (counts[k] || 0) +
          " hex · ×" +
          (BIOMES[k].cost === null ? "1.0" : (BIOMES[k].cost as number).toFixed(1)) +
          " · " +
          Math.round(((counts[k] || 0) / total) * 100) +
          "%",
      }));
    const checks = Math.max(1, Math.ceil(days)) * 2;
    checkCount = checks + " × 2/day";
    const inSix = Math.max(1, Math.round((r.wild as number) * 0.42 * 6));
    checkLabel =
      inSix + "-in-6 on the wildest ground crossed. Roll twice a day, dawn and dusk.";
  } else if (blocked) {
    daysBig = "—";
    arrival = "no way through";
    checkLabel =
      "No passable road between those hexes at this pace. Try travelling by ship, or set a waypoint around the obstacle.";
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ ...sectionHeader, marginBottom: 12 }}>Passage</div>

        {noRoute && !blocked && (
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
            No way plotted. Click a hex on the map to set the party down.
          </div>
        )}

        {(hasCells || blocked) && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
              <span style={{ fontFamily: SERIF, fontSize: 42, lineHeight: 1, color: "#f0e7d6" }}>
                {daysBig}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#9a8f7c" }}>
                days on the road
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#a8583a", marginBottom: 16 }}>
              {blocked ? arrival : "Arrives " + arrival}
            </div>

            {hasCells && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                    background: "#2b241c",
                    border: "1px solid #2b241c",
                    borderRadius: 3,
                    overflow: "hidden",
                    marginBottom: 14,
                  }}
                >
                  <div style={well}>
                    <div style={wellCaption}>Hexes</div>
                    <div style={wellValue}>{hexCount}</div>
                  </div>
                  <div style={well}>
                    <div style={wellCaption}>Along the way</div>
                    <div style={wellValue}>{pathMiles}</div>
                  </div>
                  <div style={well}>
                    <div style={wellCaption}>As the crow flies</div>
                    <div style={wellValue}>{crowMiles}</div>
                  </div>
                  <div style={well}>
                    <div style={wellCaption}>Effective pace</div>
                    <div style={wellValue}>{effPace}</div>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    color: "#7d7361",
                    textTransform: "uppercase",
                    marginBottom: 7,
                  }}
                >
                  Ground crossed
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    marginBottom: 14,
                  }}
                >
                  {terrainBreak.map((t) => (
                    <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          flex: "0 0 auto",
                          background: t.color,
                        }}
                      />
                      <span style={{ fontSize: 11, color: "#c9bda7", flex: "1 1 auto" }}>
                        {t.name}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: "#8e8471" }}>
                        {t.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div
              style={{
                border: "1px solid #2b241c",
                borderRadius: 3,
                padding: "10px 11px",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    color: "#7d7361",
                    textTransform: "uppercase",
                  }}
                >
                  Encounter checks
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "#e6ddcd" }}>
                  {checkCount}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#8e8471", lineHeight: 1.55 }}>{checkLabel}</div>
            </div>

            {hasCells && party.march && (
              <div
                style={{
                  border: "1px solid #4a3428",
                  background: "#241610",
                  borderRadius: 3,
                  padding: "9px 11px",
                  fontSize: 11,
                  color: "#c98a63",
                  lineHeight: 1.5,
                }}
              >
                Forced march: one level of exhaustion per day beyond the first, saving throw at dusk.
              </div>
            )}

            {hasCells && (
              <>
                <button
                  className="hx-ember"
                  style={{ ...emberBtn, marginTop: 12 }}
                  onClick={march}
                >
                  March the way
                </button>
                <div style={{ fontSize: 10, color: "#6f6656", marginTop: 7, lineHeight: 1.5 }}>
                  Advances the calendar, lifts the fog along the road, and rolls the checks into the log.
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ ...hairline, margin: "0 0 14px" }} />
      <div style={sectionHeader}>Log</div>
      {journal.length === 0 && (
        <div style={{ fontSize: 11, color: "#6f6656", lineHeight: 1.6 }}>
          Nothing yet. Marches are recorded here.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {journal.map((j, idx) => (
          <div key={idx} style={{ borderLeft: "2px solid #3a3025", padding: "0 0 0 10px" }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "#7d7361", marginBottom: 2 }}>
              {j.when}
            </div>
            <div style={{ fontSize: 12, color: "#c9bda7", lineHeight: 1.5 }}>{j.text}</div>
            <div style={{ fontSize: 11, color: j.tone, lineHeight: 1.5, marginTop: 2 }}>
              {j.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
