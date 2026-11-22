// NotesModal.jsx — list of comment pins (director / designer notes) with resolve ticks and CSV export.
import { useState } from "react";
import { COLORS, FONT_UI } from "./constants.js";
import { Btn } from "./ui.jsx";
import { WsFrame } from "./layout.jsx";

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
    <WsFrame title="Notes on the plot" actions={[{ label: hideDone ? "Show resolved" : "Hide resolved", onClick: () => setHideDone((h) => !h) }]} main={{ label: "CSV", onClick: csv }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 10, lineHeight: 1.5 }}>Use the tool (or press C) and click the plot to drop a pin. Pins live in the Notes layer, so hiding that layer hides them, and they are saved in the JSON and share links.</div>
          {!shown.length && <div style={{ fontSize: 12, color: COLORS.textDim }}>{pins.length ? "All notes are resolved." : "No notes yet."}</div>}
          {shown.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}55`, opacity: p.resolved ? 0.55 : 1 }}>
              <input type="checkbox" checked={!!p.resolved} onChange={() => toggle(p.id)} title="Resolved" style={{ marginTop: 3 }} />
              <div style={{ flex: 1, fontSize: 12 }}><b style={{ color: "#ffcc33" }}>{p.n}</b> {p.label}
                <div style={{ fontSize: 10, color: COLORS.textDim }}>{p.author || "—"}{p.created ? ` · ${new Date(p.created).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}</div></div>
              <Btn onClick={() => onPick(p.id)}>Show</Btn>
            </div>))}
      </div>
    </WsFrame>
  );
}
