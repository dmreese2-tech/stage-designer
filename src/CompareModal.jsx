// CompareModal.jsx — compare the current plan with an earlier saved JSON file (revision compare).
import { useState } from "react";
import { COLORS, GRID, SET_DEFS, FIXTURE_DEFS, FONT_UI } from "./constants.js";
import { Btn } from "./ui.jsx";
import { Dialog } from "./layout.jsx";
import { fmtFtIn } from "./units.js";

const FIELDS = [["x", "x", 1], ["y", "y", 1], ["w", "width", 1], ["h", "depth", 1], ["x1", "x1", 1], ["y1", "y1", 1], ["x2", "x2", 1], ["y2", "y2", 1],
  ["rotation", "rotation", 0], ["elevation", "elevation (in)", 0], ["height", "height (in)", 0], ["trim", "trim", 0], ["gelCode", "colour", 0], ["channel", "channel", 0],
  ["dimmer", "dimmer", 0], ["universe", "universe", 0], ["address", "address", 0], ["label", "label", 0], ["color", "paint colour", 0]];
const nameOf = (e) => e.label || SET_DEFS[e.type]?.label || FIXTURE_DEFS[e.type]?.label || e.type;
const show = (v, px) => (v === undefined || v === null || v === "" ? "none" : px ? fmtFtIn(v / GRID) : String(v));

export function diffPlans(oldEls, newEls) {
  const o = new Map(oldEls.map((e) => [e.id, e])), n = new Map(newEls.map((e) => [e.id, e]));
  const added = newEls.filter((e) => !o.has(e.id)), removed = oldEls.filter((e) => !n.has(e.id)), changed = [];
  newEls.forEach((e) => {
    const p = o.get(e.id); if (!p) return;
    const ch = [];
    FIELDS.forEach(([k, lbl, px]) => {
      const a = p[k], b = e[k];
      if (px ? Math.abs((a ?? 0) - (b ?? 0)) > 1 : (a ?? "") !== (b ?? "")) ch.push(`${lbl}: ${show(a, px)} → ${show(b, px)}`);
    });
    if (ch.length) changed.push({ el: e, ch });
  });
  return { added, removed, changed };
}

export default function CompareModal({ elements, onClose }) {
  const [res, setRes] = useState(null), [name, setName] = useState(""), [err, setErr] = useState("");
  const load = (e) => {
    const f = e.target.files?.[0]; if (!f) return; setName(f.name); setErr("");
    const r = new FileReader();
    r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (!Array.isArray(d.elements)) throw 0; setRes(diffPlans(d.elements, elements)); } catch { setErr("That file isn't a Stage Designer JSON plan."); setRes(null); } };
    r.readAsText(f); e.target.value = "";
  };
  const sec = (t, c) => <div style={{ fontSize: 11, color: c, margin: "10px 0 4px", letterSpacing: 1 }}>{t}</div>;
  return (
    <Dialog title="Compare with an earlier plan" width={640} tall onClose={onClose}>
      <div>
          <label style={{ display: "inline-block" }}><Btn onClick={(e) => e.currentTarget.nextSibling.click()}>Choose an earlier JSON file…</Btn><input type="file" accept=".json" onChange={load} style={{ display: "none" }} /></label>
          {name && <span style={{ fontSize: 11, color: COLORS.textDim, marginLeft: 8 }}>{name}</span>}
          {err && <div style={{ color: "#ff6677", fontSize: 12, marginTop: 8 }}>{err}</div>}
          <div style={{ fontSize: 10, color: COLORS.textDim, margin: "8px 0", lineHeight: 1.5 }}>Shows what changed between that file and the plan on screen, matched by item ID. Moves under one pixel are ignored. Items copied into a new file under fresh IDs show as removed plus added.</div>
          {res && (<>
            <div style={{ fontSize: 12 }}>{res.added.length} added · {res.removed.length} removed · {res.changed.length} changed</div>
            {res.added.length > 0 && sec("ADDED", "#7fd67f")}{res.added.map((e) => <div key={e.id} style={{ fontSize: 11 }}>+ {nameOf(e)}</div>)}
            {res.removed.length > 0 && sec("REMOVED", "#ff6677")}{res.removed.map((e) => <div key={e.id} style={{ fontSize: 11 }}>− {nameOf(e)}</div>)}
            {res.changed.length > 0 && sec("CHANGED", "#ffcc66")}{res.changed.map(({ el, ch }) => <div key={el.id} style={{ fontSize: 11, marginBottom: 4 }}>{nameOf(el)}<div style={{ color: COLORS.textDim, paddingLeft: 12 }}>{ch.join(" · ")}</div></div>)}
            {!res.added.length && !res.removed.length && !res.changed.length && <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 8 }}>No differences found.</div>}
          </>)}
      </div>
    </Dialog>
  );
}
