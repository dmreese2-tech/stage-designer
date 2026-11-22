// ScenesView.jsx — workspace page for scenes: the scene list, the shift list between scenes, and which pieces move.
import { useState, useMemo } from "react";
import { COLORS, FONT_UI, FONT_DISPLAY } from "./constants.js";
import { WsFrame, ghost, primary, ctl } from "./layout.jsx";
import { computeShifts, shiftCSV, cueControlCSV, sceneTitle, canMove, isMoving } from "./scenes.js";

const lab = { fontSize: 11, color: COLORS.textDim, marginBottom: 4 };
const field = { width: "100%", boxSizing: "border-box", background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "6px 8px", fontSize: 13, fontFamily: FONT_UI };
const card = { background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, marginBottom: 10 };
const th = { textAlign: "left", padding: "6px 8px", fontSize: 11, color: COLORS.textDim, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" };
const td = { padding: "6px 8px", fontSize: 12, borderBottom: `1px solid ${COLORS.border}55`, verticalAlign: "top" };

function SceneRow({ s, idx, count, current, movingCount, onGo, onUpdate, onDelete, onMove }) {
  const [open, setOpen] = useState(false);
  const set = (k) => (e) => onUpdate(s.id, { [k]: e.target.value });
  return (
    <div style={{ ...card, borderColor: current ? COLORS.accent : COLORS.border }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontFamily: FONT_DISPLAY, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, fontSize: 14 }}>
            Sc {s.scene || "?"}{s.name ? ` — ${s.name}` : ""}{current && <span style={{ marginLeft: 8, fontSize: 11, color: COLORS.accent }}>CURRENT</span>}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textDim }}>{[s.cue && `Cue ${s.cue}`, s.crew && `Crew: ${s.crew}`, `${movingCount} moving piece${movingCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</div>
        </div>
        <button style={current ? ghost() : primary()} onClick={() => onGo(s.id)}>{current ? "Open in plan" : "Go to scene"}</button>
        <button style={ghost()} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Done" : "Edit"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          <label><div style={lab}>Act</div><input style={field} value={s.act || ""} onChange={set("act")} /></label>
          <label><div style={lab}>Scene</div><input style={field} value={s.scene || ""} onChange={set("scene")} /></label>
          <label style={{ gridColumn: "span 2" }}><div style={lab}>Name</div><input style={field} value={s.name || ""} onChange={set("name")} placeholder="Kitchen" /></label>
          <label><div style={lab}>Cue number</div><input style={field} value={s.cue || ""} onChange={set("cue")} placeholder="Q14" /></label>
          <label style={{ gridColumn: "span 2" }}><div style={lab}>Shift crew</div><input style={field} value={s.crew || ""} onChange={set("crew")} placeholder="Names or roles" /></label>
          <label style={{ gridColumn: "1 / -1" }}><div style={lab}>Notes for the shift</div><textarea rows={2} style={field} value={s.notes || ""} onChange={set("notes")} /></label>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={ghost()} disabled={idx === 0} onClick={() => onMove(s.id, -1)}>Move earlier</button>
            <button style={ghost()} disabled={idx === count - 1} onClick={() => onMove(s.id, 1)}>Move later</button>
            <div style={{ flex: 1 }} />
            <button style={ghost({ color: COLORS.danger, borderColor: COLORS.danger })} onClick={() => { if (window.confirm(`Delete scene "${sceneTitle(s)}"? Piece positions stored for this scene are lost.`)) onDelete(s.id); }}>Delete scene</button>
          </div>
        </div>)}
    </div>
  );
}

export default function ScenesView({ scenes, activeId, elements, setElements, stageW, stageH, grid, projectInfo, onStart, onAdd, onGo, onUpdate, onDelete, onMove }) {
  const [tab, setTab] = useState(scenes.length ? "scenes" : "scenes");
  const shifts = useMemo(() => computeShifts(scenes, elements, stageW, stageH, grid), [scenes, elements, stageW, stageH, grid]);
  const movers = elements.filter(isMoving);
  const pieces = elements.filter(canMove).sort((a, b) => (a.label || a.type).localeCompare(b.label || b.type));
  const download = (cue) => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([cue ? cueControlCSV(shifts) : shiftCSV(shifts)], { type: "text/csv" }));
    a.download = `${projectInfo?.title || "show"}-${cue ? "cuecontrol" : "shifts"}.csv`; a.click();
  };
  const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const print = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const body = shifts.map((sh) => `<h3>${esc(sceneTitle(sh.from))} &rarr; ${esc(sceneTitle(sh.to))}${sh.to.cue ? " &middot; Cue " + esc(sh.to.cue) : ""}</h3>` +
      (sh.to.crew ? `<p><b>Crew:</b> ${esc(sh.to.crew)}</p>` : "") + (sh.to.notes ? `<p>${esc(sh.to.notes)}</p>` : "") +
      (sh.rows.length ? `<table><tr><th>Item</th><th>Action</th><th>From</th><th>To</th></tr>${sh.rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.action}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td></tr>`).join("")}</table>` : "<p><i>No moving pieces change.</i></p>")).join("");
    w.document.write(`<html><head><title>Shift list</title><style>body{font-family:sans-serif;margin:16px}table{border-collapse:collapse;width:100%;margin-bottom:12px}td,th{border:1px solid #999;padding:4px 8px;text-align:left;font-size:13px}h3{margin:16px 0 4px}@page{margin:12mm}</style></head><body><h2>${esc(projectInfo?.title || "Untitled")} — Shift list</h2>${body}</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  };
  const acts = [];
  scenes.forEach((s, i) => { let g = acts.find((a) => a.act === s.act); if (!g) { g = { act: s.act, items: [] }; acts.push(g); } g.items.push({ s, i }); });
  const tabs = [["scenes", `Scenes${scenes.length ? ` (${scenes.length})` : ""}`], ["shifts", "Shift list"], ["pieces", `Moving pieces (${movers.length})`]];
  return (
    <WsFrame title="Scenes and shifts" tabs={tabs} tab={tab} setTab={setTab}
      actions={tab === "shifts" && shifts.length ? [{ label: "CueControl CSV", onClick: () => download(true) }, { label: "CSV", onClick: () => download(false) }] : []}
      main={tab === "shifts" && shifts.length ? { label: "Print", onClick: print } : tab === "scenes" && scenes.length ? { label: "Add scene", onClick: onAdd, title: "New scene after the current one, starting from where everything is now" } : null}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {tab === "scenes" && (!scenes.length ? (
          <div style={{ ...card, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>One layout per scene</div>
            <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.6, marginBottom: 14 }}>Mark the pieces that move (Moving pieces tab, or the checkbox in a piece's Properties). Start scenes, then add a scene for each set change and move those pieces. Everything else stays put in every scene. The Shift list works out what moves between scenes.</div>
            <button style={primary({ margin: "0 auto" })} onClick={onStart}>Start with the current layout as Act 1, Scene 1</button>
          </div>
        ) : acts.map((g) => (
          <div key={g.act}>
            <div style={{ fontFamily: FONT_DISPLAY, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.accent, fontSize: 13, margin: "6px 0 8px" }}>Act {g.act || "?"}</div>
            {g.items.map(({ s, i }) => <SceneRow key={s.id} s={s} idx={i} count={scenes.length} current={s.id === activeId} movingCount={Object.keys(s.pose || {}).length} onGo={onGo} onUpdate={onUpdate} onDelete={onDelete} onMove={onMove} />)}
          </div>)))}
        {tab === "shifts" && (!scenes.length ? <div style={{ color: COLORS.textDim, padding: 24, textAlign: "center" }}>Start scenes first.</div>
          : scenes.length < 2 ? <div style={{ color: COLORS.textDim, padding: 24, textAlign: "center" }}>Add a second scene to see what moves between them.</div>
          : shifts.map((sh) => (
            <div key={sh.to.id} style={card}>
              <div style={{ fontFamily: FONT_DISPLAY, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, fontSize: 13 }}>{sceneTitle(sh.from)} → {sceneTitle(sh.to)}</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, margin: "2px 0 8px" }}>{[sh.to.cue && `Cue ${sh.to.cue}`, sh.to.crew && `Crew: ${sh.to.crew}`, sh.to.notes].filter(Boolean).join(" · ") || "No cue or crew set"}</div>
              {sh.rows.length === 0 ? <div style={{ fontSize: 12, color: COLORS.textDim }}>No moving pieces change.</div> : (
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Item", "Action", "From", "To"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{sh.rows.map((r) => <tr key={r.id}><td style={td}>{r.name}</td><td style={td}>{r.action}</td><td style={td}>{r.from}</td><td style={td}>{r.to}</td></tr>)}</tbody>
                </table></div>)}
            </div>)))}
        {tab === "pieces" && (<>
          <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.6, marginBottom: 10 }}>Tick the pieces that move between scenes (wagons, rolling units, flown battens, furniture). Unticked pieces are stationary: moving one changes it in every scene.</div>
          {pieces.length === 0 && <div style={{ color: COLORS.textDim, padding: 24, textAlign: "center" }}>Nothing to tick yet. Add set pieces or battens to the plot.</div>}
          {pieces.map((el) => (
            <label key={el.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "8px 12px", minHeight: 44 }}>
              <input type="checkbox" checked={isMoving(el)} onChange={(e) => setElements((prev) => prev.map((x) => (x.id === el.id ? { ...x, motion: e.target.checked ? "moving" : undefined } : x)))} style={{ width: 20, height: 20 }} />
              <span style={{ flex: 1, minWidth: 0 }}>{el.label || el.type}</span>
              <span style={{ fontSize: 12, color: COLORS.textDim }}>{el.type === "batten" ? "Batten (fly)" : el.type}</span>
            </label>))}
        </>)}
      </div>
    </WsFrame>
  );
}
