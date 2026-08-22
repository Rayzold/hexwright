import { useState, type ReactNode } from "react";
import { MONO } from "../ui/styles";

/**
 * A section header with an optional "?" that toggles a one-line contextual hint.
 * Matches the tracked-uppercase look used across the panels.
 */
export function SectionTitle({
  children,
  hint,
  marginBottom = 10,
}: {
  children: ReactNode;
  hint?: string;
  marginBottom?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: hint && open ? 8 : marginBottom }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.2em",
            color: "#7d7361",
            textTransform: "uppercase",
          }}
        >
          {children}
        </span>
        {hint && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="What's this?"
            title="What's this?"
            style={{
              width: 14,
              height: 14,
              lineHeight: "12px",
              textAlign: "center",
              padding: 0,
              borderRadius: "50%",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 9,
              border: "1px solid " + (open ? "#5c4a33" : "#3a3025"),
              background: open ? "#2f2720" : "transparent",
              color: open ? "#c9bda7" : "#7d7361",
            }}
          >
            ?
          </button>
        )}
      </div>
      {hint && open && (
        <div style={{ fontSize: 10, color: "#8e8471", lineHeight: 1.5, marginTop: 5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
