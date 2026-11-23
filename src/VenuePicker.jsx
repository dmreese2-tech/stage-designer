import { useState } from "react";
import { COLORS, VENUE_CONFIGS, DEFAULT_VENUE } from "./constants.js";
import { loadLibrary } from "./venueLibrary.js";
import { Dialog, primary, ghost } from "./layout.jsx";

// Shown when a new plan starts: pick a saved venue, start from a built-in layout, or create a venue.
export function venueFromPreset(p) {
  return {
    ...DEFAULT_VENUE, config: p.config, roomW: p.roomW, roomH: p.roomH, stageOffX: p.stageOffX, stageOffY: p.stageOffY,
    audience: JSON.parse(JSON.stringify(p.audience)),
    curvedApron: p.curvedApron || false, apronRadius: p.apronRadius || 17.75, apronDepth: p.apronDepth || 4.833,
    notch: p.notch || false, notchW: p.notchW || 13.875, notchD: p.notchD || 4.5,
  };
}

export function VenuePicker({ onPick, onCreate, onSkip }) {
  const [lib] = useState(loadLibrary);
  const row = (key, title, sub, onUse) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${COLORS.border}55` }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{title}<div style={{ fontSize: 11, color: COLORS.textDim }}>{sub}</div></div>
      <button type="button" onClick={onUse} style={ghost({ height: 36, padding: "0 14px", border: `1px solid ${COLORS.border}`, color: COLORS.text })}>Use</button>
    </div>
  );
  const head = (t) => <div style={{ fontSize: 10, letterSpacing: 1, color: COLORS.accent, margin: "14px 0 4px" }}>{t}</div>;
  return (
    <Dialog title="Choose a venue" width={560} onClose={onSkip}
      footer={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", width: "100%" }}>
        <button type="button" onClick={onSkip} style={ghost({ height: 40, padding: "0 14px", color: COLORS.textDim })}>Skip for now</button>
        <button type="button" onClick={onCreate} style={primary({ height: 40, padding: "0 16px" })}>Create a new venue</button>
      </div>}>
      <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>Pick the room you are designing for. Stage size, room shape and seating come with it, and you can change any of it later.</div>
      {lib.length > 0 && <>{head("YOUR SAVED VENUES")}
        {lib.map((v) => row("lib:" + v.name, v.name, `stage ${v.stageW}' × ${v.stageH}', room ${v.venue.roomW}' × ${v.venue.roomH}'`, () => onPick({ name: v.name, venue: v.venue, stageW: v.stageW, stageH: v.stageH })))}</>}
      {head("STARTING LAYOUTS")}
      {Object.entries(VENUE_CONFIGS).map(([k, p]) => row(k, p.label, p.desc || `stage ${p.stageW}' × ${p.stageH}'`, () => onPick({ name: p.label, venue: venueFromPreset(p), stageW: p.stageW, stageH: p.stageH })))}
    </Dialog>
  );
}
