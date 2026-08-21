import { useStore } from "../store/useStore";
import {
  CAMPAIGN_START_DAY,
  SEASON_LABEL,
  dateStr,
  holidayOn,
  nextHoliday,
  seasonOfDay,
  weekdayStr,
} from "../core/travel";
import {
  MONO,
  SERIF,
  fieldLabel,
  hairline,
  inputStyle,
  secondaryBtn,
  sectionHeader,
  tab,
} from "../ui/styles";

export function TableLeft() {
  const party = useStore((s) => s.party);
  const setParty = useStore((s) => s.setParty);
  const toggleMarch = useStore((s) => s.toggleMarch);
  const day = useStore((s) => s.day);
  const routeMode = useStore((s) => s.routeMode);
  const setRouteMode = useStore((s) => s.setRouteMode);
  const clearRoute = useStore((s) => s.clearRoute);
  const popWaypoint = useStore((s) => s.popWaypoint);
  const revealAll = useStore((s) => s.revealAll);
  const hideAll = useStore((s) => s.hideAll);
  const revealed = useStore((s) => s.revealed);
  const world = useStore((s) => s.world);

  const plotHint =
    routeMode === "manual"
      ? "Click hexes in order and the party walks the straight line between them. Drag any waypoint to redraw a leg."
      : "Click a start and an end; the cheapest way through the terrain is found for you. Drag a waypoint to force it elsewhere.";

  const fogLabel = revealed && world
    ? revealed.size + " of " + world.n + " hexes charted · the Party view honours the fog"
    : "";

  return (
    <div>
      <div style={{ ...sectionHeader, marginBottom: 12 }}>The Party</div>

      <label style={fieldLabel}>Pace</label>
      <select
        value={party.speed}
        onChange={(e) => setParty("speed", e.target.value as typeof party.speed)}
        style={{ ...inputStyle, marginBottom: 13 }}
      >
        <option value="foot">On foot — 24 mi/day</option>
        <option value="mounted">Mounted — 36 mi/day</option>
        <option value="ship">By ship — 48 mi/day</option>
      </select>

      <div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <label style={fieldLabel}>Season</label>
          <select
            value={party.season}
            onChange={(e) => setParty("season", e.target.value as typeof party.season)}
            style={{ ...inputStyle, padding: "6px 7px" }}
          >
            <option value="twilight">Twilight</option>
            <option value="mists">Mists</option>
            <option value="embers">Embers</option>
            <option value="gloom">Gloom</option>
          </select>
        </div>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <label style={fieldLabel}>Weather</label>
          <select
            value={party.weather}
            onChange={(e) => setParty("weather", e.target.value as typeof party.weather)}
            style={{ ...inputStyle, padding: "6px 7px" }}
          >
            <option value="clear">Clear</option>
            <option value="rain">Rain</option>
            <option value="fog">Fog</option>
            <option value="ashfall">Ashfall</option>
            <option value="snow">Snow</option>
            <option value="storm">Storm</option>
            <option value="crystalstorm">Crystal storm</option>
          </select>
        </div>
      </div>

      <button
        onClick={toggleMarch}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "8px 10px",
          borderRadius: 3,
          cursor: "pointer",
          fontSize: 11,
          lineHeight: 1.4,
          border: "1px solid " + (party.march ? "#8a4a24" : "#3a3025"),
          background: party.march ? "#3a2016" : "#241f19",
          color: party.march ? "#f0c9a8" : "#9a8f7c",
        }}
      >
        Forced march — +25% pace, exhaustion at dusk
      </button>

      <div style={{ ...hairline, margin: "16px 0 14px" }} />

      <div style={{ ...sectionHeader, marginBottom: 10 }}>Reckoning</div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 20,
          color: "#f0e7d6",
          marginBottom: 3,
          whiteSpace: "nowrap",
        }}
      >
        {dateStr(day)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: "#7d7361", marginBottom: 4 }}>
        {weekdayStr(day)} · Campaign day {day - (CAMPAIGN_START_DAY - 1)}
      </div>
      {(() => {
        const today = holidayOn(day);
        const nh = nextHoliday(day);
        return (
          <div style={{ fontSize: 10, color: "#8e8471", lineHeight: 1.5, marginBottom: 14 }}>
            {SEASON_LABEL[seasonOfDay(day)]}
            {today ? (
              <>
                {" · "}
                <span style={{ color: "#c9a24a" }}>{today}</span> (today)
              </>
            ) : (
              " · " + nh.name + " in " + nh.inDays + "d"
            )}
          </div>
        );
      })()}

      <div style={{ ...hairline, margin: "0 0 14px" }} />

      <div style={{ ...sectionHeader, marginBottom: 8 }}>Plotting</div>
      <div style={{ fontSize: 11, color: "#8e8471", lineHeight: 1.65, marginBottom: 10 }}>
        {plotHint}
      </div>
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          background: "#100d0a",
          border: "1px solid #322a20",
          borderRadius: 3,
          marginBottom: 10,
        }}
      >
        <button style={tab(routeMode === "manual")} onClick={() => setRouteMode("manual")}>
          By hand
        </button>
        <button style={tab(routeMode === "auto")} onClick={() => setRouteMode("auto")}>
          Find the way
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button className="hx-hover-btn" style={secondaryBtn} onClick={clearRoute}>
          Clear way
        </button>
        <button className="hx-hover-btn" style={secondaryBtn} onClick={popWaypoint}>
          Undo leg
        </button>
      </div>

      <div style={{ ...hairline, margin: "0 0 14px" }} />

      <div style={{ ...sectionHeader, marginBottom: 8 }}>Fog</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="hx-hover-btn" style={secondaryBtn} onClick={revealAll}>
          Reveal all
        </button>
        <button className="hx-hover-btn" style={secondaryBtn} onClick={hideAll}>
          Shroud all
        </button>
      </div>
      <div style={{ fontSize: 10, color: "#6f6656", marginTop: 8, lineHeight: 1.5 }}>
        {fogLabel}
      </div>
    </div>
  );
}
