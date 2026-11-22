import { beamInfo } from "./lighting.js";
import { useState, useRef } from "react";
import { GRID, COLORS, GEL_PRESETS, FIXTURE_DEFS, SET_DEFS, LAYERS, MOUNTS } from "./constants.js";
import { parseFtIn, fmtFtIn } from "./units.js";
// panels.jsx — properties, group-selection and underlay panels, plus the feet-inches input.
// Controlled text field that accepts feet-and-inches. value is in feet; onCommit gets feet.
export function FtInInput({ value, onCommit, width = 70, placeholder }) {
  const [txt, setTxt] = useState(null);
  const shown = txt ?? (value === "" || value === null || value === undefined ? "" : fmtFtIn(value));
  const commit = () => {
    if (txt === null) return;
    const v = parseFtIn(txt);
    if (txt.trim() === "") onCommit(null); else if (v !== null) onCommit(v);
    setTxt(null);
  };
  return (
    <input type="text" value={shown} placeholder={placeholder} onChange={e=>setTxt(e.target.value)} onBlur={commit}
      onKeyDown={e=>{ if (e.key==="Enter") { e.currentTarget.blur(); } else if (e.key==="Escape") setTxt(null); }}
      style={{ width, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:11, fontFamily:"inherit", boxSizing:"border-box" }}/>
  );
}

// ── Bounding box of any element, in canvas units (used by the box-select tool) ──
// ── Ground-plan image underlay with scale calibration ─────────────────────────
export function UnderlayPanel({ underlay, setUnderlay, calib, setCalib, stageW, stageH }) {
  const fileRef = useRef(null);
  const btn = { background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"6px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit", width:"100%" };
  const load = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = stageW * GRID, h = w * img.naturalHeight / img.naturalWidth;   // starts as wide as the stage; calibrate to correct it
        setUnderlay({ src: rd.result, x:0, y:0, w, h, opacity:0.5, rot:0, visible:true });
      };
      img.onerror = () => alert("That image could not be read.");
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  return (
    <div style={{ marginTop:18 }}>
      <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:6 }}>GROUND-PLAN UNDERLAY</div>
      <input ref={fileRef} type="file" accept="image/*" onChange={load} style={{ display:"none" }}/>
      {!underlay ? (
        <>
          <button onClick={()=>fileRef.current?.click()} style={btn}>Load floor-plan image</button>
          <div style={{ fontSize:9, color:COLORS.textDim, marginTop:4, lineHeight:1.4 }}>Trace a scanned plan or photo. After loading, use Calibrate to set the real scale.</div>
        </>
      ) : (
        <>
          <div style={{ display:"flex", gap:4, marginBottom:6 }}>
            <button onClick={()=>setCalib(calib ? null : { pts:[] })} style={{ ...btn, background:calib?COLORS.accentDim:COLORS.bg, color:calib?COLORS.text:COLORS.text }}>{calib ? `Click point ${calib.pts.length+1} of 2 (cancel)` : "Calibrate scale"}</button>
          </div>
          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:6, lineHeight:1.4 }}>Calibrate: click two points on the image whose real distance you know (a wall, a door width), then type the distance.</div>
          <div style={{ fontSize:9, color:COLORS.textDim }}>OPACITY</div>
          <input type="range" min="0.1" max="1" step="0.05" value={underlay.opacity} onChange={e=>setUnderlay(u=>({...u, opacity:+e.target.value}))} style={{ width:"100%" }}/>
          <div style={{ display:"flex", gap:6, margin:"6px 0" }}>
            {[["X","x"],["Y","y"]].map(([l,k])=>(
              <div key={k}><div style={{ fontSize:9, color:COLORS.textDim }}>{l} (ft-in)</div>
                <FtInInput width={74} value={underlay[k]/GRID} onCommit={v=>setUnderlay(u=>({...u,[k]:(v||0)*GRID}))}/></div>
            ))}
            <div><div style={{ fontSize:9, color:COLORS.textDim }}>Rotate °</div>
              <input type="number" value={underlay.rot||0} onChange={e=>setUnderlay(u=>({...u, rot:+e.target.value}))} style={{ width:52, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:11, fontFamily:"inherit" }}/></div>
          </div>
          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:6 }}>Image width: {fmtFtIn(underlay.w/GRID)}</div>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={()=>setUnderlay(u=>({...u, visible:u.visible===false}))} style={btn}>{underlay.visible===false ? "Show" : "Hide"}</button>
            <button onClick={()=>setUnderlay(null)} style={{ ...btn, color:COLORS.accent }}>Remove</button>
          </div>
        </>
      )}
    </div>
  );
}

export function elBounds(el) {
  if (el.x1 !== undefined) {
    return { l:Math.min(el.x1,el.x2)-3, r:Math.max(el.x1,el.x2)+3, t:Math.min(el.y1,el.y2)-3, b:Math.max(el.y1,el.y2)+3 };
  }
  if (el.type === "pin") return { l:el.x-12, r:el.x+12, t:el.y-28, b:el.y };
  if (el.type === "textlabel") {
    const h = el.fontSize || 14, w = (el.label || "Label").length * h * 0.6;
    return { l:el.x - w/2, r:el.x + w/2, t:el.y - h, b:el.y };
  }
  const rad = (el.rotation || 0) * Math.PI / 180, w = el.w || 0, h = el.h || 0;
  const hx = (Math.abs(w*Math.cos(rad)) + Math.abs(h*Math.sin(rad))) / 2;
  const hy = (Math.abs(w*Math.sin(rad)) + Math.abs(h*Math.cos(rad))) / 2;
  return { l:(el.x||0)-hx, r:(el.x||0)+hx, t:(el.y||0)-hy, b:(el.y||0)+hy };
}

// ── Panel shown while several elements are selected ───────────────────────
export function GroupPanel({ ids, elements, onCopy, onDuplicate, onDelete, onClear, moveZ, onAlign, onDistribute }) {
  const picked = elements.filter(e => ids.includes(e.id));
  const counts = {};
  picked.forEach(e => {
    const name = e.type === "wall" ? "Wall" : e.type === "batten" ? "Batten" : e.type === "textlabel" ? "Text label" : e.type === "pin" ? "Comment pin"
      : e.category === "lighting" ? (FIXTURE_DEFS[e.type]?.label || e.type) : (SET_DEFS[e.type]?.label || e.type);
    counts[name] = (counts[name] || 0) + 1;
  });
  const btn = { background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" };
  return (
    <div style={{ flex:1, overflowY:"auto", padding:10 }}>
      <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8, letterSpacing:1 }}>GROUP SELECTION</div>
      <div style={{ fontSize:14, fontWeight:"bold", color:COLORS.text, marginBottom:6 }}>{picked.length} items selected</div>
      <div style={{ marginBottom:10 }}>
        {Object.entries(counts).map(([name,n]) => (
          <div key={name} style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:COLORS.textDim, padding:"2px 0" }}>
            <span>{name}</span><span>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:COLORS.textDim, lineHeight:1.5, marginBottom:10 }}>
        Drag any selected item to move them all. Arrow keys nudge the group. Shift+click adds or removes an item.
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={onCopy} style={{ ...btn, flex:1 }}>⎘ Copy</button>
        <button onClick={onDuplicate} style={{ ...btn, flex:1 }}>⧉ Duplicate</button>
      </div>
      <div style={{ marginTop:10 }}>
        <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>ARRANGE  ( ] [ )</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          {[["⤒ To Front","front"],["↑ Forward","forward"],["↓ Backward","backward"],["⤓ To Back","back"]].map(([lbl,mode])=>(
            <button key={mode} onClick={()=>moveZ(mode)} style={{ ...btn, padding:"5px 0", fontSize:10 }}>{lbl}</button>
          ))}
        </div>
      </div>
      <div style={{ marginTop:10 }}>
        <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>ALIGN</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
          {[["⇤ Left","left"],["⇔ Centre","hcenter"],["⇥ Right","right"],["⤒ Top","top"],["⇕ Middle","vcenter"],["⤓ Bottom","bottom"]].map(([lbl,mode])=>(
            <button key={mode} onClick={()=>onAlign(mode)} style={{ ...btn, padding:"5px 0", fontSize:10 }}>{lbl}</button>
          ))}
        </div>
        <div style={{ fontSize:9, color:COLORS.textDim, margin:"8px 0 3px" }}>DISTRIBUTE EVENLY{picked.length < 3 ? "  (needs 3+)" : ""}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
          <button disabled={picked.length<3} onClick={()=>onDistribute("x")} style={{ ...btn, padding:"5px 0", fontSize:10, opacity:picked.length<3?0.4:1 }}>↔ Horizontally</button>
          <button disabled={picked.length<3} onClick={()=>onDistribute("y")} style={{ ...btn, padding:"5px 0", fontSize:10, opacity:picked.length<3?0.4:1 }}>↕ Vertically</button>
        </div>
      </div>
      <button onClick={onClear} style={{ ...btn, marginTop:10, width:"100%" }}>Deselect</button>
      <button onClick={onDelete}
        style={{ marginTop:6, width:"100%", background:"#3a1010", color:COLORS.accent, border:`1px solid ${COLORS.accentDim}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
        Delete {picked.length} Items
      </button>
    </div>
  );
}

// ── Properties panel content ──────────────────────────────────────────────
export function PropsPanel({ allEls, selEl, updateEl, battens, setElements, setSelected, selected, copySelected, pasteClipboard, duplicateSelected, hasClipboard, moveZ }) {
    if (!selEl) return (
      <div style={{ padding:16, fontSize:11, color:COLORS.textDim, textAlign:"center", marginTop:20 }}>
        Select an element to edit its properties
      </div>
    );

    if (selEl.type === "pin") return (
      <div style={{ flex:1, overflowY:"auto", padding:10 }}>
        <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8, letterSpacing:1 }}>COMMENT PIN {selEl.n || ""}</div>
        <div style={{ fontSize:9, color:COLORS.textDim }}>Note</div>
        <textarea value={selEl.label||""} rows={5} onChange={e=>updateEl("label", e.target.value)} style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box", marginBottom:8 }}/>
        <div style={{ fontSize:9, color:COLORS.textDim }}>From</div>
        <input value={selEl.author||""} onChange={e=>updateEl("author", e.target.value)} style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box", marginBottom:8 }}/>
        <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:12, marginBottom:10 }}><input type="checkbox" checked={!!selEl.resolved} onChange={e=>updateEl("resolved", e.target.checked)}/> Resolved</label>
        {selEl.created && <div style={{ fontSize:10, color:COLORS.textDim }}>Added {new Date(selEl.created).toLocaleString([], { dateStyle:"medium", timeStyle:"short" })}</div>}
      </div>
    );
    const isBatten = selEl.type === "batten";
    const isLight = selEl.category === "lighting";
    const isText = selEl.type === "textlabel";

    return (
      <div style={{ flex:1, overflowY:"auto", padding:10 }}>
        <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8, letterSpacing:1 }}>ELEMENT PROPERTIES</div>
        {selEl.category !== "lighting" && !isText && (
          <label title="Moving pieces can sit somewhere different in each scene. Stationary pieces stay put in every scene." style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, margin:"0 0 10px", padding:"6px 8px", border:`1px solid ${selEl.motion==="moving"?COLORS.accent:COLORS.border}`, borderRadius:4, cursor:"pointer" }}>
            <input type="checkbox" checked={selEl.motion==="moving"} onChange={e=>updateEl("motion", e.target.checked ? "moving" : undefined)}/> Moves between scenes</label>)}

        {/* Label / name */}
        {[
          ["Label / Name","label","text"],
          ...(isLight ? [
            ["Channel #","channel","number"],
            ["Dimmer","dimmer","text"],
            ["DMX universe","universe","number"],
            ["DMX address","address","number"],
            ["Focus Angle °","focusAngle","number"],
            ["Wattage (W)","watts","number"],
            ["Weight (lb)","weightLb","number"],
            ["Colour frame (in, 0 = none)","frameIn","number"],
          ] : []),
          ...(isBatten ? [["Load capacity (lb)","capacityLb","number"]] : []),
          ...(!isBatten ? [["Rotation °","rotation","number"]] : []),
          ...(isText ? [["Font Size","fontSize","number"]] : []),
        ].map(([lbl,key,type])=>(
          <div key={key} style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl}</div>
            <input type={type} value={selEl[key]??""} onChange={e=>updateEl(key, type==="number"?+e.target.value:e.target.value)}
              style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
        ))}

        {isLight && (() => { const bi = beamInfo(selEl, allEls || []); return (
          <div style={{ fontSize:10, color:COLORS.textDim, marginBottom:8, lineHeight:1.5, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 7px" }}>
            Hang height {bi.height.toFixed(1)} ft · throw {bi.throwFt.toFixed(1)} ft{bi.angle ? ` · beam ≈ ${bi.dia.toFixed(1)} ft wide` : ""}{bi.aimed ? "" : " (no aim point set, assuming straight down)"}
          </div>); })()}

        {/* Width / Height (ft) — converted from internal px units, same pattern as Position */}
        {!isBatten && !isText && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>FOOTPRINT ON PLAN (ft-in)</div>
            <div style={{ display:"flex", gap:6 }}>
              {[["Width","w"],["Depth","h"]].map(([lbl,key])=>(
                <div key={key}>
                  <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl}</div>
                  <FtInInput width={74} value={(selEl[key]||0)/GRID} onCommit={v=>updateEl(key, Math.max(1, (v||0)*GRID))}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Height: vertical size of an upright piece, used by 3D and Build */}
        {!isBatten && !isText && !isLight && !["platform","tri_platform","stairs"].includes(selEl.type) && selEl.category==="set" && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim }}>HEIGHT (ft-in, vertical)</div>
            <FtInInput width={74} value={selEl.height>0 ? selEl.height/12 : ""} placeholder={"8'"} onCommit={v=>updateEl("height", v ? Math.round(v*12*8)/8 : undefined)}/>
            <span style={{ fontSize:9, color:COLORS.textDim, marginLeft:6 }}>blank = default for this item</span>
          </div>
        )}

        {/* Elevation — height of the top surface above the stage floor, in inches */}
        {!isBatten && !isText && !isLight && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim }}>{["platform","tri_platform","stairs"].includes(selEl.type) ? "HEIGHT (in, top of deck)" : "RAISED OFF FLOOR (in)"}</div>
            <input type="number" min="0" step="1" value={selEl.elevation ?? 0}
              onChange={e=>updateEl("elevation", Math.max(0, +e.target.value))}
              style={{ width:58, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:11, fontFamily:"inherit" }}/>
            <span style={{ fontSize:9, color:COLORS.textDim, marginLeft:6 }}>0 = on stage floor</span>
          </div>
        )}

        {/* Color */}
        {!isLight && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim }}>Color</div>
            <input type="color" value={selEl.color||"#888888"} onChange={e=>updateEl("color",e.target.value)}
              style={{ width:"100%", height:30, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer" }}/>
          </div>
        )}

        {/* Gel assignment for lighting */}
        {isLight && (
          <>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>GEL COLOR</div>
              <select value={selEl.gelCode||"Open"} onChange={e=>updateEl("gelCode",e.target.value)}
                style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:11, fontFamily:"inherit" }}>
                {GEL_PRESETS.map(g=><option key={g.code} value={g.code}>{g.code} — {g.name}</option>)}
              </select>
              {selEl.gelCode && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:GEL_PRESETS.find(g=>g.code===selEl.gelCode)?.hex||"#888", border:"1px solid #555" }}/>
                  <span style={{ fontSize:10, color:COLORS.textDim }}>{GEL_PRESETS.find(g=>g.code===selEl.gelCode)?.name}</span>
                </div>
              )}
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, color:COLORS.textDim }}>Show Beam</div>
              <button onClick={()=>updateEl("focused",!selEl.focused)}
                style={{ background:selEl.focused?COLORS.accentDim:COLORS.bg, color:selEl.focused?COLORS.text:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 14px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
                {selEl.focused?"On":"Off"}
              </button>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, color:COLORS.textDim }}>ASSIGN TO BATTEN</div>
              <select value={selEl.battenId||""} onChange={e=>updateEl("battenId",e.target.value||null)}
                style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:11, fontFamily:"inherit" }}>
                <option value="">— None —</option>
                {battens.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Notes */}
        {!isText && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim }}>Notes</div>
            <textarea value={selEl.notes||""} onChange={e=>updateEl("notes",e.target.value)} rows={2}
              style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:11, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
        )}

        {/* Layer */}
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:9, color:COLORS.textDim }}>Layer</div>
          <select value={selEl.layer||"set"} onChange={e=>updateEl("layer",e.target.value)}
            style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:11, fontFamily:"inherit" }}>
            {LAYERS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>

        {/* Lighting mount, mount height and aim point (data for the 3D view and focus charts) */}
        {isLight && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim }}>MOUNT</div>
            <select value={selEl.mount||"batten"} onChange={e=>updateEl("mount",e.target.value)}
              style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:11, fontFamily:"inherit", marginBottom:6 }}>
              {MOUNTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <div style={{ fontSize:9, color:COLORS.textDim }}>MOUNT HEIGHT (ft-in)</div>
            <FtInInput width={74} value={selEl.z ?? ""} placeholder="from batten" onCommit={v=>updateEl("z", v)}/>
            <div style={{ fontSize:9, color:COLORS.textDim, margin:"6px 0 2px" }}>AIM POINT (ft-in, plan X / Y)</div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <FtInInput width={66} value={selEl.aim ? selEl.aim.x/GRID : ""} placeholder="X" onCommit={v=>updateEl("aim", v===null ? null : { x:v*GRID, y:selEl.aim?.y ?? selEl.y })}/>
              <FtInInput width={66} value={selEl.aim ? selEl.aim.y/GRID : ""} placeholder="Y" onCommit={v=>updateEl("aim", v===null ? null : { x:selEl.aim?.x ?? selEl.x, y:v*GRID })}/>
            </div>
            {selEl.aim && <button onClick={()=>updateEl("aim",null)} style={{ marginTop:4, fontSize:10, background:"transparent", color:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"2px 8px", cursor:"pointer", fontFamily:"inherit" }}>Clear aim point</button>}
          </div>
        )}

        {/* Position */}
        {!isBatten && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>POSITION (ft-in)</div>
            <div style={{ display:"flex", gap:6 }}>
              {[["X","x"],["Y","y"]].map(([lbl,key])=>(
                <div key={key}>
                  <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl}</div>
                  <FtInInput width={74} value={(selEl[key]||0)/GRID} onCommit={v=>updateEl(key,(v||0)*GRID)}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batten position — endpoints + depth, editable numerically as well as by dragging */}
        {isBatten && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>POSITION (ft)</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[["X1 (SR)","x1"],["X2 (SL)","x2"]].map(([lbl,key])=>(
                <div key={key}>
                  <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl}</div>
                  <FtInInput width={74} value={(selEl[key]||0)/GRID} onCommit={v=>updateEl(key,(v||0)*GRID)}/>
                </div>
              ))}
              <div>
                <div style={{ fontSize:9, color:COLORS.textDim }}>Depth (Y)</div>
                <FtInInput width={74} value={(selEl.y1||0)/GRID} onCommit={v=>{ const px=(v||0)*GRID; updateEl("y1",px); updateEl("y2",px); }}/>
              </div>
              <div>
                <div style={{ fontSize:9, color:COLORS.textDim }}>Trim height</div>
                <FtInInput width={74} value={typeof selEl.trim==="number" ? selEl.trim : parseFtIn(selEl.trim)} placeholder={"e.g. 18'6\""} onCommit={v=>updateEl("trim", v)}/>
              </div>
            </div>
            <div style={{ fontSize:9, color:COLORS.textDim, marginTop:5 }}>
              Length: {(Math.hypot((selEl.x2||0)-(selEl.x1||0), (selEl.y2||0)-(selEl.y1||0))/GRID).toFixed(1)}'
            </div>
            <div style={{ fontSize:9, color:COLORS.textDim, marginTop:3 }}>
              Tip: drag the pipe on the canvas to move it, or drag the gold endpoint handles to resize.
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:6, marginTop:12 }}>
          <button onClick={copySelected}
            style={{ flex:1, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
            ⎘ Copy
          </button>
          <button onClick={duplicateSelected}
            style={{ flex:1, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
            ⧉ Duplicate
          </button>
        </div>
        {hasClipboard && (
          <button onClick={pasteClipboard}
            style={{ marginTop:6, width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
            Paste Copy
          </button>
        )}

        {/* Stacking order */}
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>ARRANGE  ( ] forward · [ back · Shift = all the way )</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
            {[["⤒ To Front","front"],["↑ Forward","forward"],["↓ Backward","backward"],["⤓ To Back","back"]].map(([lbl,mode])=>(
              <button key={mode} onClick={()=>moveZ(mode)}
                style={{ background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 0", cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <button onClick={()=>{setElements(prev=>prev.filter(e=>e.id!==selected));setSelected(null);}}
          style={{ marginTop:6, width:"100%", background:"#3a1010", color:COLORS.accent, border:`1px solid ${COLORS.accentDim}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
          Delete Element
        </button>
      </div>
    );
  };

