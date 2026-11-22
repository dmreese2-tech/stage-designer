// ConstructionModal.jsx — construction output UI for Stage Designer.
// All components are module-scope (no components defined inside render) to avoid input-focus remounts.
import { COLORS, FONT_UI, FONT_DISPLAY } from "./constants.js";
import { useMemo, useState } from "react";
import { buildAll, planAll, cutListCSV, ftIn, templateOptions, TEMPLATE_LABELS, LUMBER, DEFAULT_SHOP, CHECK_ITEMS, unconfirmed, saveShop, BUILD_STAGES, stageProgress } from "./construction.js";
import { svgPiece, svgSheetLayout, boardBarHTML, printHTML, svgIso, stepFigures } from "./constructionDraw.js";
import { sheetsDXF, partsDXF } from "./constructionDXF.js";
import { WsFrame, useViewport } from "./layout.jsx";

const C = { onAccent: COLORS.onAccent, bg: COLORS.bg, panel: COLORS.panel, border: COLORS.border, accent: COLORS.accent, text: COLORS.text, dim: COLORS.textDim, warn: "#ffcc66" };
const field = { background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 6px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", width: "100%" };
const lab = { fontSize: 9, color: C.dim, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 };
const btn = (active) => ({ background: active ? COLORS.accentDim : "transparent", color: active ? COLORS.text : C.dim, border: `1px solid ${active ? C.accent : C.border}`, borderRadius: 5, padding: "5px 11px", cursor: "pointer", fontSize: 12, fontFamily: FONT_DISPLAY, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" });

function download(name, text, type = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
}

function NumField({ label, value, onChange, step = 1, min = 0, width }) {
  return (
    <div style={{ width }}>
      <div style={lab}>{label}</div>
      <input type="number" value={value ?? ""} step={step} min={min} onChange={(e) => onChange(e.target.value === "" ? "" : +e.target.value)} style={field} />
    </div>
  );
}

function PieceDetail({ pc, onPatch }) {
  const el = pc.el, c = el.construction || {};
  const opts = templateOptions(el);
  const lowPieces = ["platform", "wagon", "platform_tri", "stairs"];
  const heightLabel = pc.template === "stairs" ? "Total rise (in)" : lowPieces.includes(pc.template) ? "Deck height (in)" : "Height (in)";
  const defH = lowPieces.includes(pc.template) ? (el.elevation > 0 ? el.elevation : 24) : pc.template === "softgoods" ? 144 : 96;
  const exploded = svgIso(pc, { explode: true, labels: true, w: 460 });
  const figs = stepFigures(pc);
  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        {opts.length > 1 && (
          <div style={{ width: 150 }}>
            <div style={lab}>Template</div>
            <select value={pc.template} onChange={(e) => onPatch({ template: e.target.value })} style={field}>
              {opts.map((o) => <option key={o} value={o}>{TEMPLATE_LABELS[o]}</option>)}
            </select>
          </div>
        )}
        {pc.template !== "practical" && (<NumField label={heightLabel} width={110} value={c.heightIn ?? defH} onChange={(v) => onPatch({ heightIn: v || undefined })} />)}
        {pc.template === "practical" && (<>
          <NumField label="Bulb (W)" width={90} value={c.watts ?? ""} onChange={(v) => onPatch({ watts: v || undefined })} />
          <NumField label="Cord (ft)" width={90} value={c.cordFt ?? ""} onChange={(v) => onPatch({ cordFt: v || undefined })} />
          <div style={{ width: 90 }}><div style={lab}>Channel</div><input value={c.channel ?? ""} onChange={(e) => onPatch({ channel: e.target.value || undefined })} style={field} /></div>
          <div style={{ width: 160 }}>
            <div style={lab}>Control</div>
            <select value={c.control || ""} onChange={(e) => onPatch({ control: e.target.value || undefined })} style={field}>
              <option value="">Shop default</option><option>Inline dimmer</option><option>Switch</option><option>Dimmer-rack circuit</option>
            </select>
          </div>
        </>)}
        {pc.template === "softgoods" && <NumField label="Fullness (×)" width={100} step={0.1} value={c.fullness ?? ""} onChange={(v) => onPatch({ fullness: v || undefined })} />}
        {pc.template === "arch_flat" && <NumField label="Arch rise (in)" width={110} value={c.archRise ?? ""} onChange={(v) => onPatch({ archRise: v || undefined })} />}
        {(pc.template === "door_flat" || pc.template === "arch_flat") && (<>
          <NumField label="Opening W (in)" width={110} value={c.openW ?? ""} onChange={(v) => onPatch({ openW: v || undefined })} />
          <NumField label="Opening H (in)" width={110} value={c.openH ?? ""} onChange={(v) => onPatch({ openH: v || undefined })} />
          <div style={{ width: 130 }}>
            <div style={lab}>Frame style</div>
            <select value={c.style || ""} onChange={(e) => onPatch({ style: e.target.value || undefined })} style={field}>
              <option value="">Shop default</option><option value="broadway">Broadway</option><option value="hollywood">Hollywood</option>
            </select>
          </div>
        </>)}
        {pc.template === "wall_run" && (
          <div style={{ width: 130 }}>
            <div style={lab}>Frame style</div>
            <select value={c.style || ""} onChange={(e) => onPatch({ style: e.target.value || undefined })} style={field}>
              <option value="">Shop default</option><option value="broadway">Broadway</option><option value="hollywood">Hollywood</option>
            </select>
          </div>
        )}
        <label style={{ display: "flex", alignItems: "flex-end", gap: 6, fontSize: 11, color: C.dim, paddingBottom: 5 }}>
          <input type="checkbox" checked={!!c.skip} onChange={(e) => onPatch({ skip: e.target.checked })} /> Don't build
        </label>
      </div>
      {pc.warnings.map((w, i) => <div key={i} style={{ background: "#3a2e10", border: `1px solid ${C.warn}`, color: C.warn, borderRadius: 4, padding: "5px 9px", fontSize: 11, marginBottom: 6 }}>⚠ {w}</div>)}
      <div style={{ background: "#fff", borderRadius: 6, padding: 8, display: "flex", justifyContent: "center", marginBottom: 10, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: svgPiece(pc) }} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead><tr style={{ background: C.bg }}>{["Part", "Name", "Material", "Qty", "Length / size", "Notes"].map((h) => <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontSize: 9, color: C.dim, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
        <tbody>
          {pc.lumber.map((p) => <tr key={p.key} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "4px 8px", color: C.accent, fontWeight: "bold" }}>{p.letter}</td><td style={{ padding: "4px 8px" }}>{p.name}</td><td style={{ padding: "4px 8px", color: C.dim }}>{p.material}</td><td style={{ padding: "4px 8px" }}>{p.qty}</td><td style={{ padding: "4px 8px" }}>{ftIn(p.len)}</td><td style={{ padding: "4px 8px", color: C.dim }}>{p.note}</td></tr>)}
          {pc.sheets.map((p) => <tr key={p.key} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "4px 8px", color: C.accent, fontWeight: "bold" }}>{p.letter}</td><td style={{ padding: "4px 8px" }}>{p.name}</td><td style={{ padding: "4px 8px", color: C.dim }}>{p.material}</td><td style={{ padding: "4px 8px" }}>{p.qty}</td><td style={{ padding: "4px 8px" }}>{ftIn(p.w)} × {ftIn(p.h)}</td><td style={{ padding: "4px 8px", color: C.dim }}>{p.note}</td></tr>)}
          {pc.misc.map((m, i) => <tr key={"m" + i} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "4px 8px", color: C.dim }}>—</td><td style={{ padding: "4px 8px" }}>{m.name}</td><td style={{ padding: "4px 8px", color: C.dim }}>hardware / finish</td><td style={{ padding: "4px 8px" }}>{m.qty}</td><td style={{ padding: "4px 8px" }}>{m.unit}</td><td style={{ padding: "4px 8px", color: C.dim }}>{m.note}</td></tr>)}
        </tbody>
      </table>
      <ul style={{ margin: "8px 0 0 18px", fontSize: 11, color: C.dim }}>{pc.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      {exploded && (<>
        <div style={{ ...lab, marginTop: 16 }}>Exploded view</div>
        <div style={{ background: "#fff", borderRadius: 6, padding: 8, display: "flex", justifyContent: "center" }} dangerouslySetInnerHTML={{ __html: exploded }} />
      </>)}
      {figs.length > 0 && (<>
        <div style={{ ...lab, marginTop: 16 }}>Assembly steps</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>
          {figs.map((f) => (
            <div key={f.n} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, background: C.bg }}>
              <div style={{ fontSize: 11, marginBottom: 6 }}><b style={{ color: C.accent }}>{f.n}.</b> {f.text}</div>
              {f.svg && <div style={{ background: "#fff", borderRadius: 4 }} dangerouslySetInnerHTML={{ __html: f.svg }} />}
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}

function StageDots({ el }) {
  const st = el.construction?.stages || {};
  return <span style={{ letterSpacing: 1, fontSize: 10, color: C.accent }}>{BUILD_STAGES.map(([k]) => (st[k] ? "●" : "○")).join("")}</span>;
}

function StatusTab({ result, patchEl, setSelId, setTab }) {
  const total = result.pieces.length * BUILD_STAGES.length;
  const done = result.pieces.reduce((n, p) => n + stageProgress(p.el), 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const setStage = (pc, k, on) => patchEl(pc.elId, { stages: { ...(pc.el.construction?.stages || {}), [k]: on } });
  const setAll = (k, on) => result.pieces.forEach((pc) => setStage(pc, k, on));
  if (!result.pieces.length) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>No pieces to track yet.</div>;
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 10, background: C.bg, borderRadius: 5, border: `1px solid ${C.border}`, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: C.accent }} /></div>
        <div style={{ fontSize: 12 }}><b>{pct}%</b> <span style={{ color: C.dim }}>({done} of {total} steps)</span></div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.bg }}>
            {["Piece", "Name", "Size"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 9, color: C.dim, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
            {BUILD_STAGES.map(([k, l]) => (
              <th key={k} style={{ padding: "6px 10px", fontSize: 9, color: C.dim, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, textAlign: "center" }}>
                {l}<div style={{ fontSize: 9, textTransform: "none" }}><span style={{ cursor: "pointer", color: C.accent }} onClick={() => setAll(k, true)}>all</span> · <span style={{ cursor: "pointer", color: C.accent }} onClick={() => setAll(k, false)}>none</span></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.pieces.map((pc) => (
            <tr key={pc.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "5px 10px", color: C.accent, fontWeight: "bold", cursor: "pointer" }} onClick={() => { setSelId(pc.elId); setTab("pieces"); }}>{pc.id}</td>
              <td style={{ padding: "5px 10px" }}>{pc.name}</td>
              <td style={{ padding: "5px 10px", color: C.dim, fontSize: 11 }}>{pc.dims}</td>
              {BUILD_STAGES.map(([k]) => <td key={k} style={{ textAlign: "center" }}><input type="checkbox" checked={!!pc.el.construction?.stages?.[k]} onChange={(e) => setStage(pc, k, e.target.checked)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PiecesTab({ result, selId, setSelId, patchEl }) {
  const pc = result.pieces.find((p) => p.elId === selId) || result.pieces[0];
  if (!result.pieces.length && !result.others.length) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>No set pieces in the plot yet. Place flats, platforms, stairs or walls first.</div>;
  const phone = useViewport() === "phone";
  const [detail, setDetail] = useState(false);
  return (
    <div style={{ display: "flex", gap: 14, height: "100%" }}>
      <div style={{ width: phone ? "100%" : 230, overflowY: "auto", flexShrink: 0, display: phone && detail ? "none" : "block" }}>
        {result.pieces.map((p) => (
          <div key={p.id} onClick={() => { setSelId(p.elId); setDetail(true); }} style={{ minHeight: phone ? 48 : 0, boxSizing: "border-box", padding: "6px 8px", marginBottom: 4, borderRadius: 4, cursor: "pointer", background: pc && pc.id === p.id ? C.bg : "transparent", border: `1px solid ${pc && pc.id === p.id ? C.accent : C.border}` }}>
            <div style={{ fontSize: 12 }}><b style={{ color: C.accent }}>{p.id}</b> {p.name} {p.warnings.length > 0 && <span style={{ color: C.warn }}>⚠</span>} <StageDots el={p.el} /></div>
            <div style={{ fontSize: 10, color: C.dim }}>{TEMPLATE_LABELS[p.template]} · {p.dims}</div>
          </div>
        ))}
        {result.others.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 10, color: C.dim }}>
            <div style={lab}>Not generated ({result.others.length})</div>
            {result.others.map((o, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", gap: 6 }}>
                <span>{o.el.label || o.el.type}</span>
                {o.reason === "Skipped by you" ? <span style={{ cursor: "pointer", color: C.accent }} onClick={() => patchEl(o.el.id, { skip: false })}>restore</span> : <span title={o.reason}>—</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingRight: 4, display: phone && !detail ? "none" : "block" }}>
        {phone && <button onClick={() => setDetail(false)} style={{ ...btn(false), minHeight: 44, marginBottom: 10 }}>← All pieces</button>}
        {pc ? (<>
          <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 2 }}><span style={{ color: C.accent }}>{pc.id}</span> · {pc.name}</div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 10 }}>{TEMPLATE_LABELS[pc.template]} — {pc.dims}</div>
          <PieceDetail pc={pc} onPatch={(patch) => patchEl(pc.elId, patch)} />
        </>) : <div style={{ color: C.dim, padding: 30 }}>Nothing to build — all pieces are skipped or have no template.</div>}
      </div>
    </div>
  );
}

function CutListTab({ plan, shop }) {
  if (!plan.lumber.length && !plan.sheets.length) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>No parts yet.</div>;
  return (
    <div style={{ overflowY: "auto", height: "100%", paddingRight: 4 }}>
      {plan.lumber.map((l) => (
        <div key={l.material} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: C.accent, marginBottom: 6 }}>
            {l.material} — {Object.entries(l.byStock).sort((a, b) => a[0] - b[0]).map(([s, n]) => `${n} × ${s}'`).join(", ")} <span style={{ color: C.dim, fontWeight: "normal", fontSize: 11 }}>· waste {l.wastePct}%</span>
          </div>
          {l.boards.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 66, fontSize: 10, color: C.dim, whiteSpace: "nowrap" }}>#{i + 1} · {b.stock}'</div>
              <div style={{ flex: 1, color: "#111" }} dangerouslySetInnerHTML={{ __html: boardBarHTML(b) }} />
            </div>
          ))}
          {l.bad.length > 0 && <div style={{ color: C.warn, fontSize: 11 }}>⚠ Too long for the longest stock: {l.bad.map((p) => `${p.pieceId}${p.letter} ${ftIn(p.len)}`).join(", ")}</div>}
        </div>
      ))}
      {plan.sheets.map((s) => (
        <div key={s.material} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: C.accent, marginBottom: 6 }}>{s.material} — {s.count} sheet(s) <span style={{ color: C.dim, fontWeight: "normal", fontSize: 11 }}>· {s.utilPct}% used</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {s.sheets.map((sh, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: C.dim }}><div dangerouslySetInnerHTML={{ __html: svgSheetLayout(sh, shop) }} />Sheet {i + 1}</div>)}
          </div>
          {s.oversize.length > 0 && <div style={{ color: C.warn, fontSize: 11 }}>⚠ {s.oversize.length} part(s) larger than a sheet.</div>}
        </div>
      ))}
    </div>
  );
}

function BuyListTab({ plan, shop }) {
  const rows = [];
  plan.lumber.forEach((l) => Object.entries(l.byStock).sort((a, b) => a[0] - b[0]).forEach(([s, n]) => rows.push({ k: l.material + s, mat: l.material, stock: `${s}'`, qty: n, cost: l.cost != null ? (l.cost * n * s) / l.totalFt : null })));
  plan.sheets.forEach((s) => rows.push({ k: "s" + s.material, mat: s.material, stock: `${shop.sheetW / 12}'×${shop.sheetL / 12}' sheet`, qty: s.count, cost: s.cost }));
  plan.misc.forEach((m, i) => rows.push({ k: "m" + i, mat: m.name, stock: m.unit, qty: m.qty, cost: null, note: m.notes }));
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr style={{ background: C.bg }}>{["Material", "Stock", "Qty", "Est. cost", "Notes"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 9, color: C.dim, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.k} style={{ borderBottom: `1px solid ${C.border}` }}><td style={{ padding: "5px 10px" }}>{r.mat}</td><td style={{ padding: "5px 10px", color: C.dim }}>{r.stock}</td><td style={{ padding: "5px 10px", fontWeight: "bold" }}>{r.qty}</td><td style={{ padding: "5px 10px", color: C.dim }}>{r.cost != null ? "$" + r.cost.toFixed(2) : "—"}</td><td style={{ padding: "5px 10px", color: C.dim, fontSize: 10 }}>{r.note || ""}</td></tr>)}</tbody>
      </table>
      <div style={{ marginTop: 12, fontSize: 12, color: C.dim }}>{plan.cost ? <>Estimated lumber + sheet total: <b style={{ color: C.text }}>${plan.cost.toFixed(2)}</b></> : "Add prices under Shop Standards for a cost estimate."}</div>
    </div>
  );
}

function StockField({ value, onCommit }) {
  const [txt, setTxt] = useState(value.join(", "));
  const commit = () => { const a = txt.split(",").map((x) => parseFloat(x)).filter((x) => x > 0); if (a.length) onCommit(a); else setTxt(value.join(", ")); };
  return <input value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} style={field} />;
}

function ShopTab({ shop, setShop }) {
  const set = (k, v) => setShop({ ...shop, [k]: v });
  const sel = (k, label, options) => (
    <div><div style={lab}>{label}</div><select value={shop[k]} onChange={(e) => set(k, e.target.value)} style={field}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
  );
  const num = (k, label, step = 1) => <NumField label={label} step={step} value={shop[k]} onChange={(v) => set(k, v === "" ? 0 : v)} />;
  const txt = (k, label) => <div><div style={lab}>{label}</div><input value={shop[k]} onChange={(e) => set(k, e.target.value)} style={field} /></div>;
  const lumberKeys = Object.keys(LUMBER);
  const mats = ["1x3", "1x4", "1x6", "2x4", "2x6", "2x12", shop.facing, shop.deck, shop.stairPanel, shop.bendSkin, shop.braceLumber].filter((v, i, a) => v && a.indexOf(v) === i);
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 18 };
  const h = (t) => <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, margin: "4px 0 8px" }}>{t}</div>;
  return (
    <div style={{ overflowY: "auto", height: "100%", paddingRight: 4 }}>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>Every shop builds a little differently. These defaults drive all templates; change them to match yours. Saved with the project JSON and in this browser.</div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 16, background: C.bg }}>
        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 4 }}>DEFAULTS TO CHECK ({unconfirmed(shop)} of {CHECK_ITEMS.length} not yet confirmed)</div>
        {unconfirmed(shop) > 0 && <button type="button" onClick={() => set("confirmed", Object.fromEntries(CHECK_ITEMS.map(([k]) => [k, true])))} style={{ ...field, width: "auto", cursor: "pointer", margin: "4px 0 8px", color: C.accent }}>Confirm all defaults as they are</button>}
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>These starting values come from public references and general practice, not from your shop. Tick each one after you have compared it with a build you trust, and change the setting below if it differs.</div>
        {CHECK_ITEMS.map(([k, label, val, note]) => (
          <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11, padding: "3px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={!!shop.confirmed?.[k]} onChange={(e) => set("confirmed", { ...(shop.confirmed || {}), [k]: e.target.checked })} style={{ marginTop: 2 }} />
            <span><b>{label}</b>: {val(shop)} <span style={{ color: C.dim }}>— {note}</span></span>
          </label>
        ))}
      </div>
      {h("FLATS")}
      <div style={grid}>
        {sel("flatStyle", "Default flat style", ["broadway", "hollywood"])}
        {sel("broadwayLumber", "Broadway frame", lumberKeys.slice(0, 3))}
        {num("broadwayToggle", "Broadway toggle max (in)")}
        {sel("hollywoodLumber", "Hollywood frame", lumberKeys.slice(0, 3))}
        {num("hollywoodToggle", "Hollywood toggle max (in)")}
        {txt("facing", "Facing / block material")}
        {txt("cover", "Soft cover")}
        {num("flatMaxW", "Wall run: max flat width (in)")}
        {num("doorW", "Door opening W (in)")}
        {num("doorH", "Door opening H (in)")}
      </div>
      {h("PLATFORMS & STAIRS")}
      <div style={grid}>
        {sel("platformFrame", "Platform frame", ["2x4", "2x6"])}
        {sel("legLumber", "Legs", ["2x4", "2x6"])}
        {txt("deck", "Deck material")}
        {num("deckT", "Deck thickness (in)", 0.125)}
        {num("joistSpacing", "Joist spacing o.c. (in)")}
        {num("maxRiser", "Max riser (in)", 0.125)}
        {num("treadRun", "Tread run (in)", 0.25)}
        {num("casterH", "Wagon caster height (in)", 0.25)}
        {sel("stringerLumber", "Stringers", ["2x12", "2x6"])}
        {txt("stairPanel", "Tread / riser material")}
      </div>
      {h("STOCK & CUTTING")}
      <div style={grid}>
        <div><div style={lab}>Board lengths (ft, comma separated)</div><StockField value={shop.stockLengths} onCommit={(a) => set("stockLengths", a)} /></div>
        {num("kerf", "Saw kerf (in)", 0.0625)}
        {num("endTrim", "End trim per board (in)", 0.0625)}
        {num("sheetW", "Sheet width (in)")}
        {num("sheetL", "Sheet length (in)")}
        {num("sheetKerf", "Sheet kerf (in)", 0.0625)}
      </div>
      {h("PRICES (lumber: $ per linear ft · sheets: $ per sheet)")}
      <div style={grid}>
        {mats.map((m) => (
          <div key={m}><div style={lab}>{m}</div><input type="number" step="0.01" value={shop.prices?.[m] ?? ""} onChange={(e) => set("prices", { ...shop.prices, [m]: e.target.value === "" ? undefined : +e.target.value })} style={field} /></div>
        ))}
      </div>
      {h("PRACTICAL LAMPS")}
      <div style={grid}>
        {num("practicalWatts", "Bulb wattage (W)")}
        {num("practicalCordFt", "Cord length (ft)")}
        {txt("practicalBulb", "Bulb type")}
        {sel("practicalControl", "Control", ["Inline dimmer", "Switch", "Dimmer-rack circuit"])}
      </div>
      {h("PLATFORMS, LEGS AND BRACING")}
      <div style={grid}>
        {num("legSpacing", "Max leg spacing (in)")}
        {num("wagonMidMax", "Wagon: 4 casters up to (in)")}
        {num("wagonLongMax", "Wagon: 6 casters up to (in)")}
        <div><div style={lab}>Leg braces</div><label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, padding: "6px 0" }}><input type="checkbox" checked={!!shop.braceLegs} onChange={(e) => set("braceLegs", e.target.checked)} /> Add diagonal braces</label></div>
        {num("braceMinHeight", "Brace platforms from (in high)")}
        {sel("braceLumber", "Brace lumber", lumberKeys)}
        {num("triLegSpan", "Triangle: mid-leg if a side over (in)")}
        {num("triHypLegSpan", "Triangle: mid-leg if hypotenuse over (in)")}
      </div>
      {h("STAIRS, FLAT HARDWARE AND FASTENERS")}
      <div style={grid}>
        {num("stringerNarrow", "2 stringers up to width (in)")}
        {num("stringerSpacing", "Stringer spacing when wider (in)")}
        {num("stringerAllow", "Stringer extra length (in)")}
        {num("cornerBlock", "Corner block leg (in)", 0.5)}
        {num("keystoneW", "Keystone width (in)", 0.5)}
        {num("keystoneH", "Keystone length (in)", 0.5)}
        {num("screwsPerJoint", "Screws per joint")}
        {num("screwWaste", "Screw waste factor", 0.05)}
        {num("deckScrewsPerSqFt", "Deck screws per sq ft")}
      </div>
      {h("CURVED FLATS, COLUMNS AND SOFT GOODS")}
      <div style={grid}>
        {num("studSpacing", "Curved flat stud spacing (in)")}
        {num("skinOverlap", "Skin seam overlap (in)", 0.25)}
        {num("minBendRadius", "Warn below bend radius (in)")}
        {num("columnMinDia", "Warn below column diameter (in)")}
        {num("stiffenerCount", "Column stiffeners")}
        {num("seamAllow", "Fabric seam allowance (in)", 0.25)}
        {num("fabricWaste", "Fabric waste (%)")}
        {num("tieSpacing", "Tie spacing (in)")}
        {num("ribSpacing", "Rib spacing (in)")}
        {num("ribW", "Rib band width (in)", 0.25)}
        {txt("bendSkin", "Bending skin material")}
        {num("fabricW", "Fabric width (in)")}
        {num("fullnessGather", "Fullness for legs and travelers (×)", 0.1)}
        {num("hemTop", "Heading allowance (in)")}
        {num("hemBottom", "Bottom hem allowance (in)")}
      </div>
      <button style={btn(false)} onClick={() => setShop(JSON.parse(JSON.stringify(DEFAULT_SHOP)))}>Reset to defaults</button>
    </div>
  );
}

export default function ConstructionModal({ elements, setElements, shop, setShop: setShopProp, projectInfo, grid = 20, selectedId, onClose }) {
  const [tab, setTab] = useState("pieces");
  const setShop = (s) => { saveShop(s); setShopProp(s); };
  const [selId, setSelId] = useState(selectedId || null);
  const result = useMemo(() => buildAll(elements, shop, grid), [elements, shop, grid]);
  const plan = useMemo(() => planAll(result, shop), [result, shop]);
  const patchEl = (id, patch) => setElements((prev) => prev.map((e) => (e.id === id ? { ...e, construction: { ...(e.construction || {}), ...patch } } : e)));
  const doPrint = () => { const w = window.open("", "_blank"); if (w) { w.document.write(printHTML(result, plan, shop, projectInfo)); w.document.close(); } };
  const tabs = [["pieces", `Pieces (${result.pieces.length})`], ["cuts", "Cut List"], ["buy", "Buy List"], ["status", "Build Status"], ["shop", unconfirmed(shop) ? `Shop Standards (${unconfirmed(shop)} to check)` : "Shop Standards"]];
  const name = projectInfo?.title || "cut-list";
  return (
    <WsFrame title={`Build — ${projectInfo?.title || "Untitled"}`} tabs={tabs} tab={tab} setTab={setTab} scroll={false}
      actions={[
        { label: "CSV", onClick: () => download(`${name}-cutlist.csv`, cutListCSV(result, plan)) },
        { label: "Part outlines", title: "True outlines of curved ribs, column rings, arch corners and triangle decks, one of each part, for CNC / laser", onClick: () => download(`${name}-parts.dxf`, partsDXF(result), "application/dxf") },
        { label: "DXF", title: "Sheet-goods cut layouts for CNC / laser", onClick: () => download(`${name}-sheets.dxf`, sheetsDXF(plan, shop), "application/dxf") },
      ]}
      main={{ label: "Print / PDF", onClick: doPrint }}>
      <div style={{ height: "100%", padding: 14, boxSizing: "border-box", overflow: "hidden" }}>
        {tab === "pieces" && <PiecesTab result={result} selId={selId} setSelId={setSelId} patchEl={patchEl} />}
        {tab === "cuts" && <CutListTab plan={plan} shop={shop} />}
        {tab === "buy" && <BuyListTab plan={plan} shop={shop} />}
        {tab === "status" && <StatusTab result={result} patchEl={patchEl} setSelId={setSelId} setTab={setTab} />}
        {tab === "shop" && <ShopTab shop={shop} setShop={setShop} />}
      </div>
    </WsFrame>
  );
}
