import type { CSSProperties } from "react";

export const MONO = "'IBM Plex Mono', monospace";
export const SERIF = "'Cormorant Garamond', serif";

/** Segmented-control button (header toggles, route mode). */
export function tab(on: boolean): CSSProperties {
  return {
    padding: "6px 15px",
    border: "none",
    borderRadius: 2,
    cursor: "pointer",
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    background: on ? "#3a3025" : "transparent",
    color: on ? "#f0e7d6" : "#8a7f6c",
  };
}

/** Layer toggle chip. */
export function chip(on: boolean): CSSProperties {
  return {
    padding: "5px 9px",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 10,
    border: "1px solid " + (on ? "#5c4a33" : "#2f281f"),
    background: on ? "#2f2720" : "transparent",
    color: on ? "#e6ddcd" : "#7d7361",
  };
}

/** Brush / stamp button. */
export function toolBtn(on: boolean): CSSProperties {
  return {
    padding: "8px 6px",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 11,
    border: "1px solid " + (on ? "#8a4a24" : "#3a3025"),
    background: on ? "#3a2016" : "#241f19",
    color: on ? "#f0c9a8" : "#cfc4b0",
  };
}

/** Uppercase tracked section header. */
export const sectionHeader: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: "0.2em",
  color: "#7d7361",
  textTransform: "uppercase",
  marginBottom: 10,
};

/** Field label. */
export const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#9a8f7c",
  marginBottom: 5,
};

/** Text/number input & select. */
export const inputStyle: CSSProperties = {
  width: "100%",
  background: "#100d0a",
  border: "1px solid #3a3025",
  borderRadius: 3,
  color: "#e6ddcd",
  fontSize: 12,
  padding: "6px 8px",
};

export const hairline: CSSProperties = {
  height: 1,
  background: "#2b241c",
};

/** Secondary utility button (Clear way, Reveal all, ...). */
export const secondaryBtn: CSSProperties = {
  flex: "1 1 0",
  padding: 7,
  background: "#241f19",
  color: "#cfc4b0",
  border: "1px solid #3a3025",
  borderRadius: 3,
  fontSize: 11,
  cursor: "pointer",
};

/** Primary ember button (Forge, March). */
export const emberBtn: CSSProperties = {
  width: "100%",
  padding: 10,
  background: "#b8511f",
  color: "#fdf3e2",
  border: "none",
  borderRadius: 3,
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};
