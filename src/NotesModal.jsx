// NotesModal.jsx — list of comment pins (director / designer notes) with resolve ticks and CSV export.
import { useState } from "react";
import { COLORS, FONT_UI } from "./constants.js";
import { Btn } from "./ui.jsx";

export default function NotesModal({ elements, setElements, onPick, onClose }) {
  const [hideDone, setHideDone] = useState(false);
  const pins = elements.filter((e) => e.type === "pin").sort((a, b) => (a.n || 0) - (b.n || 0));
  const shown = hideDone ? pins.filter((p) => !p.resolved) : pins;
  const toggle = (id) => setElements((els) => els.map((e) => (e.id === id ? { ...e, resolved: !e.resolved } : e)));
  const csv = () => {
    const q = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
    const rows = [["#", "Note", "From", "Added", "Resolved"], ...pins.map((p) => [p.n, p.label, p.author, p.created ? new Date(p.created).toISOString().slice(0, 10) : "", p.resolved ? "yes" : "no"])];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" })); a.download = "plot-notes.csv"; a.click();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 560, maxWidth: "94vw", maxHeight: "84vh", display: "flex", flexDirection: "column", color: COLORS.text, fontFamily: FONT_UI }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.accent, fontWeight: "bold", letterSpacing: 1, fontSize: 13 }}>💬 NOTES ON THE PLOT</span>
          <div style={{ flex: 1 }} />
          <label style={{ fontSize: 11, color: COLORS.textDim }}><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide resolved</label>
          <Btn onClick={csv}>⬇ CSV</Btn>
          <button onClick={onClose} style={{ background: "transparent", color: COLORS.textDim, border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 14, overflow: "auto" }}>
          <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 10, lineHeight: 1.5 }}>Use the 💬 tool (or press C) and click the plot to drop a pin. Pins live in the Notes layer, so hiding that layer hides them, and they are saved in the JSON and share links.</div>
          {!shown.length && <div style={{ fontSize: 12, color: COLORS.textDim }}>{pins.length ? "All notes are resolved." : "No notes yet."}</div>}
          {shown.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}55`, opacity: p.resolved ? 0.55 : 1 }}>
              <input type="checkbox" checked={!!p.resolved} onChange={() => toggle(p.id)} title="Resolved" style={{ marginTop: 3 }} />
              <div style={{ flex: 1, fontSize: 12 }}><b style={{ color: "#ffcc33" }}>{p.n}</b> {p.label}
                <div style={{ fontSize: 10, color: COLORS.textDim }}>{p.author || "—"}{p.created ? ` · ${new Date(p.created).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}</div></div>
              <Btn onClick={() => onPick(p.id)}>Select</Btn>
            </div>))}
        </div>
      </div>
    </div>
  );
}
