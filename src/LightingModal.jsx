// LightingModal.jsx — lighting paperwork: patch, load vs batten capacity, power, colour cut list, equipment key, CSV export.
import { useState, useMemo } from "react";
import { COLORS, FIXTURE_DEFS, GRID, FONT_UI } from "./constants.js";
import { DEFAULT_HEIGHT_IN } from "./stage.js";
import { Btn } from "./ui.jsx";
import { gelHex, trimFt, isFixture, specOf, loadSummary, colourCuts, equipmentKey, autoNumberChannels, autoAddress, patchConflicts, patchCSV, beamInfo, mountHeightFt } from "./lighting.js";

const th = { textAlign: "left", padding: "4px 8px", fontSize: 10, color: COLORS.textDim, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" };
const td = { padding: "4px 8px", fontSize: 11, borderBottom: `1px solid ${COLORS.border}33` };
const label = (l) => FIXTURE_DEFS[l.type]?.label || l.type;

export default function LightingModal({ stageW = 36, stageH = 27, elements, setElements, projectInfo, onClose }) {
  const [tab, setTab] = useState("patch");
  const [volts, setVolts] = useState(120);
  const lights = useMemo(() => elements.filter(isFixture).sort((a, b) => (a.channel || 9999) - (b.channel || 9999)), [elements]);
  const load = useMemo(() => loadSummary(elements, volts), [elements, volts]);
  const cuts = useMemo(() => colourCuts(elements), [elements]);
  const key = useMemo(() => equipmentKey(elements, label), [elements]);
  const bad = useMemo(() => patchConflicts(elements), [elements]);
  const bl = (id) => elements.find((e) => e.id === id)?.label || "";
  const download = () => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([patchCSV(elements, label)], { type: "text/csv" }));
    a.download = `${projectInfo?.title || "lighting"}-patch.csv`; a.click();
  };
  const set = (id, k, v) => setElements((els) => els.map((e) => (e.id === id ? { ...e, [k]: v } : e)));
  const tabs = [["patch", "Patch"], ["load", "Load & power"], ["colour", "Colour cuts"], ["key", "Equipment key"], ["focus", "Focus chart"], ["section", "Side section"]];
  const inp = { width: 58, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 3, padding: "2px 4px", fontSize: 11, fontFamily: "inherit" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 900, maxWidth: "96vw", height: "86vh", display: "flex", flexDirection: "column", color: COLORS.text, fontFamily: FONT_UI }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap" }}>
          <span style={{ color: COLORS.accent, fontWeight: "bold", letterSpacing: 1, fontSize: 13 }}>💡 LIGHTING PAPERWORK</span>
          {tabs.map(([id, l]) => <Btn key={id} active={tab === id} onClick={() => setTab(id)}>{l}</Btn>)}
          <div style={{ flex: 1 }} />
          <Btn onClick={download}>⬇ Patch CSV</Btn>
          <button onClick={onClose} style={{ background: "transparent", color: COLORS.textDim, border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
          <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Wattage, weight and footprint start from generic values for each fixture type. Set the real numbers for your inventory in each fixture's Properties.
          </div>
          {tab === "patch" && (<>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <Btn onClick={() => setElements((e) => autoNumberChannels(e))} title="Numbers channels from stage right to left on each batten, downstage battens first">Auto-number channels</Btn>
              <Btn onClick={() => setElements((e) => autoAddress(e))} title="Assigns DMX universe and address in channel order">Auto-assign DMX addresses</Btn>
              {bad.size > 0 && <span style={{ color: "#ff6677", fontSize: 11, alignSelf: "center" }}>⚠ {bad.size} fixtures share DMX addresses</span>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Ch", "Dimmer", "Univ", "Addr", "Footprint", "Position", "Type", "W", "Colour", "Hang ft", "Throw ft"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{lights.map((l) => { const sp = specOf(l), bi = beamInfo(l, elements); return (
                <tr key={l.id} style={bad.has(l.id) ? { background: "#ff335522" } : null}>
                  <td style={td}><input type="number" style={inp} value={l.channel ?? ""} onChange={(e) => set(l.id, "channel", e.target.value === "" ? undefined : +e.target.value)} /></td>
                  <td style={td}><input style={inp} value={l.dimmer ?? ""} onChange={(e) => set(l.id, "dimmer", e.target.value)} /></td>
                  <td style={td}><input type="number" style={{ ...inp, width: 44 }} value={l.universe ?? ""} onChange={(e) => set(l.id, "universe", e.target.value === "" ? undefined : +e.target.value)} /></td>
                  <td style={td}><input type="number" style={{ ...inp, width: 52 }} value={l.address ?? ""} onChange={(e) => set(l.id, "address", e.target.value === "" ? undefined : +e.target.value)} /></td>
                  <td style={td}>{sp.footprint}</td><td style={td}>{bl(l.battenId) || "—"}</td><td style={td}>{label(l)}</td>
                  <td style={td}>{sp.watts}</td><td style={td}>{l.gelCode && l.gelCode !== "Open" ? l.gelCode : "—"}</td>
                  <td style={td}>{mountHeightFt(l, elements).toFixed(1)}</td><td style={td}>{bi.throwFt.toFixed(1)}</td>
                </tr>); })}</tbody>
            </table>
            {!lights.length && <div style={{ color: COLORS.textDim, fontSize: 12 }}>No fixtures on the plot yet.</div>}
          </>)}
          {tab === "load" && (<>
            <label style={{ fontSize: 11, color: COLORS.textDim }}>Supply voltage <select value={volts} onChange={(e) => setVolts(+e.target.value)} style={{ ...inp, width: 70 }}><option value={120}>120 V</option><option value={208}>208 V</option><option value={230}>230 V</option></select></label>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
              <thead><tr>{["Batten", "Fixtures", "Weight (lb)", "Capacity (lb)", "Watts", "Amps"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {load.rows.map((r) => (<tr key={r.id} style={r.over ? { background: "#ff335533" } : null}>
                  <td style={td}>{r.label}</td><td style={td}>{r.count}</td><td style={td}>{r.lb}{r.over ? " ⚠ over" : ""}</td>
                  <td style={td}>{r.capacity ?? <span style={{ color: COLORS.textDim }}>not set</span>}</td><td style={td}>{r.watts}</td><td style={td}>{r.amps.toFixed(1)}</td></tr>))}
                {load.loose.count > 0 && <tr><td style={td}>Not on a batten</td><td style={td}>{load.loose.count}</td><td style={td}>{load.loose.lb}</td><td style={td}>—</td><td style={td}>{load.loose.watts}</td><td style={td}>{(load.loose.watts / volts).toFixed(1)}</td></tr>}
                <tr style={{ fontWeight: "bold" }}><td style={td}>Total</td><td style={td}>{load.count}</td><td style={td}>{load.rows.reduce((s, r) => s + r.lb, 0) + load.loose.lb}</td><td style={td} /><td style={td}>{load.totalWatts}</td><td style={td}>{load.totalAmps.toFixed(1)}</td></tr>
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 8, lineHeight: 1.5 }}>Set a batten's load capacity in its Properties to get an over-capacity warning. Totals are connected load, so check them against your dimmer racks and circuits. Weights exclude cable, clamps and accessories.</div>
          </>)}
          {tab === "colour" && (<>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Colour", "Name", "Frame (in)", "Cuts needed", "Cuts per 20×24 in sheet", "Sheets"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{cuts.map((c) => <tr key={c.code + c.frame}><td style={td}>{c.code}</td><td style={td}>{c.name}</td><td style={td}>{c.frame}</td><td style={td}>{c.qty}</td><td style={td}>{c.perSheet}</td><td style={td}>{c.sheets}</td></tr>)}</tbody>
            </table>
            {!cuts.length && <div style={{ color: COLORS.textDim, fontSize: 12 }}>No coloured fixtures with a colour frame size set.</div>}
            <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 8 }}>Sheet size is assumed to be 20×24 in, with the frame cut square. Adjust for your supplier's roll or sheet.</div>
          </>)}
          {tab === "focus" && (<>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Ch", "Position", "Type", "Colour", "Aim: from centre line", "Aim: from downstage edge", "Throw ft", "Beam ft", "Notes"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{lights.map((l) => { const bi = beamInfo(l, elements); const ax = l.aim ? l.aim.x / GRID - stageW / 2 : null, ay = l.aim ? stageH - l.aim.y / GRID : null; return (
                <tr key={l.id}><td style={td}>{l.channel ?? ""}</td><td style={td}>{bl(l.battenId) || "—"}</td><td style={td}>{label(l)}</td><td style={td}>{l.gelCode && l.gelCode !== "Open" ? l.gelCode : "—"}</td>
                  <td style={td}>{ax === null ? <span style={{ color: COLORS.textDim }}>no aim set</span> : `${Math.abs(ax).toFixed(1)} ft ${ax < -0.05 ? "SR" : ax > 0.05 ? "SL" : "CL"}`}</td>
                  <td style={td}>{ay === null ? "—" : `${ay.toFixed(1)} ft`}</td><td style={td}>{bi.throwFt.toFixed(1)}</td><td style={td}>{bi.angle ? bi.dia.toFixed(1) : "—"}</td><td style={td}>{l.notes || ""}</td></tr>); })}</tbody>
            </table>
            <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 8 }}>Set each fixture's aim point on the plot (Properties). Distances are measured from the centre line and from the downstage edge of the stage rectangle. Stage right is the actor's right, facing the audience.</div>
          </>)}
          {tab === "section" && <SectionView elements={elements} stageW={stageW} stageH={stageH} />}
          {tab === "key" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Instrument", "Qty", "Watts each", "Weight each (lb)"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{key.map((k) => <tr key={k.type}><td style={td}>{k.name}</td><td style={td}>{k.qty}</td><td style={td}>{k.watts}</td><td style={td}>{k.lb}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Side elevation looking from stage right: downstage on the right, battens at trim, fixtures with their aim lines.
function SectionView({ elements, stageW, stageH }) {
  const W = 820, H = 380, padL = 30, padB = 30, maxH = 26;
  const sx = (W - padL - 20) / stageH, sy = (H - padB - 10) / maxH;
  const X = (yFt) => padL + (stageH - yFt) * sx, Y = (hFt) => H - padB - hFt * sy;
  const lights = elements.filter(isFixture), battens = elements.filter((e) => e.type === "batten");
  const pieces = elements.filter((e) => e.category === "set" && e.x1 === undefined && e.type !== "textlabel");
  const hOf = (e) => ((e.height > 0 ? e.height : DEFAULT_HEIGHT_IN[e.type] ?? 30) + 0) / 12 + (e.elevation || 0) / 12 * (["platform", "tri_platform", "stairs"].includes(e.type) ? 0 : 1);
  const topOf = (e) => (["platform", "tri_platform", "stairs"].includes(e.type) ? (e.elevation || 0) / 12 : hOf(e));
  const botOf = (e) => (["platform", "tri_platform", "stairs"].includes(e.type) ? 0 : (e.elevation || 0) / 12);
  const mono = { fontFamily: FONT_UI, fontSize: 9, fill: COLORS.textDim };
  return (<>
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 4 }}>
      {Array.from({ length: Math.floor(maxH / 5) + 1 }, (_, i) => i * 5).map((h) => <g key={h}><line x1={padL} x2={W - 10} y1={Y(h)} y2={Y(h)} stroke={COLORS.border} strokeDasharray="2 4" /><text x={4} y={Y(h) + 3} {...mono}>{h}'</text></g>)}
      <line x1={padL} x2={X(0)} y1={Y(0)} y2={Y(0)} stroke="#8a8a4a" strokeWidth={2} />
      <text x={padL} y={H - 8} {...mono}>US wall</text><text x={X(0) - 30} y={H - 8} {...mono}>DS edge</text>
      {pieces.map((e) => { const wFt = Math.max(0.2, (e.h || 0) / GRID), cy = (e.y || 0) / GRID; const r = ((e.rotation || 0) % 180 + 180) % 180; const half = (r === 90 ? (e.w || 0) : (e.h || 0)) / GRID / 2;
        const y0 = cy - Math.max(half, 0.1), y1 = cy + Math.max(half, 0.1); return <rect key={e.id} x={X(y1)} y={Y(topOf(e))} width={Math.max(2, (y1 - y0) * sx)} height={Math.max(2, (topOf(e) - botOf(e)) * sy)} fill={e.color || "#8b7355"} opacity={0.75} stroke="#000" strokeWidth={0.5} />; })}
      {battens.map((b) => { const h = trimFt(b) || 18, y = ((b.y1 + b.y2) / 2) / GRID; return <g key={b.id}><line x1={X(y) - 14} x2={X(y) + 14} y1={Y(h)} y2={Y(h)} stroke="#7f9ab5" strokeWidth={3} /><text x={X(y) - 8} y={Y(h) - 6} {...mono}>{b.label || ""} {h}'</text></g>; })}
      {lights.map((l) => { const h = mountHeightFt(l, elements), y = l.y / GRID, bi = beamInfo(l, elements), ay = l.aim ? l.aim.y / GRID : y, col = gelHex(l.gelCode);
        return <g key={l.id}><line x1={X(y)} y1={Y(h)} x2={X(ay)} y2={Y(Math.min(5.5, h))} stroke={col} strokeOpacity={0.6} strokeWidth={1} /><circle cx={X(y)} cy={Y(h)} r={3.5} fill={col} stroke="#000" strokeWidth={0.5} /></g>; })}
    </svg>
    <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 6, lineHeight: 1.5 }}>Looking from stage right, downstage on the right. Battens show at trim height, fixtures at their hang height with a line to the aim point at head height (5'6"). Set pieces show their depth and height. Check clearances against your fly-system limits.</div>
  </>);
}
