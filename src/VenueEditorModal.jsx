import { useState } from "react";
import { Dialog, useViewport } from "./layout.jsx";
import { COLORS, VENUE_CONFIGS } from "./constants.js";
import { loadLibrary, saveLibrary, parseVenueFile, libraryFile, upsert } from "./venueLibrary.js";
// VenueEditorModal.jsx — venue / room / audience / vomitory editor.
  // ── Venue Editor modal ────────────────────────────────────────────────────
export function VenueEditorModal({ venue, stageW, stageH, setStageW, setStageH, onClose, onApply }) {
  const phone = useViewport() === "phone";
    const [draft, setDraft] = useState({ ...venue });
    const [activeTab, setActiveTab] = useState("config");
    const [editingZone, setEditingZone] = useState(null);
    const [editingVom, setEditingVom] = useState(null);
    const [lib, setLib] = useState(loadLibrary), [libName, setLibName] = useState(venue.name || ""), [libMsg, setLibMsg] = useState("");
    const commitLib = (next, msg) => { setLib(next); setLibMsg(saveLibrary(next) ? msg : "Could not save: browser storage is full or blocked."); };
    const dl = (text, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; a.click(); };

    const upd = (k, v) => setDraft(d => ({ ...d, [k]: v }));
    const applyPreset = (presetKey) => {
      const p = VENUE_CONFIGS[presetKey];
      setDraft(d => ({
        ...d, config: p.config,
        roomW: p.roomW, roomH: p.roomH,
        stageOffX: p.stageOffX, stageOffY: p.stageOffY,
        audience: JSON.parse(JSON.stringify(p.audience)),
        // Shape features
        curvedApron: p.curvedApron || false,
        apronRadius: p.apronRadius || 17.75,
        apronDepth:  p.apronDepth  || 4.833,
        notch:       p.notch       || false,
        notchW:      p.notchW      || 13.875,
        notchD:      p.notchD      || 4.5,
      }));
      setStageW(p.stageW); setStageH(p.stageH);
    };

    const previewScale = 3.5;
    const pW = draft.roomW * previewScale, pH = draft.roomH * previewScale;
    const sX = (draft.stageOffX||0)*previewScale, sY = (draft.stageOffY||0)*previewScale;
    const sSW = stageW * previewScale, sSH = stageH * previewScale;

    const tabStyle = (id) => ({
      padding: "7px 14px", background: activeTab===id ? COLORS.bg : "transparent",
      color: activeTab===id ? COLORS.accent : COLORS.textDim, border:"none", cursor:"pointer",
      whiteSpace:"nowrap", flex:"none", fontSize:11, fontFamily:"inherit", borderBottom: activeTab===id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
    });
    const fieldStyle = { width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 7px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" };
    const labelStyle = { fontSize:9, color:COLORS.textDim, marginBottom:3, textTransform:"uppercase", letterSpacing:0.5 };

    return (
      <Dialog title="Venue space editor" width={780} tall pad={0} scroll={false} onClose={onClose}
        footer={<>
          <button onClick={onClose} style={{ padding:"7px 18px", background:"transparent", color:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cancel</button>
          <button onClick={()=>onApply(draft)} style={{ padding:"7px 20px", background:COLORS.accent, color:COLORS.onAccent, border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:"bold" }}>✓ Apply Venue</button>
        </>}>
          {/* Tabs */}
          <div className="sd-scroll-x" style={{ display:"flex", borderBottom:`1px solid ${COLORS.border}`, flexShrink:0, background:COLORS.raised }}>
            {[["config","Configuration"],["room","Room Shape"],["audience","Seating"],["access","Access"],["library","Library"]].map(([id,lbl])=>(
              <button key={id} style={tabStyle(id)} onClick={()=>setActiveTab(id)}>{lbl}</button>
            ))}
          </div>

          <div style={{ display:"flex", flex:1, minHeight:0, overflow:"hidden" }}>

            {/* Left: controls */}
            <div style={{ flex:1, overflowY:"auto", padding:18 }}>

              {/* ── Config tab ── */}
              {activeTab === "config" && (
                <div>
                  <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:12 }}>Choose a staging configuration preset to set up your room quickly. You can customize everything after.</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
                    {Object.entries(VENUE_CONFIGS).map(([key,cfg])=>(
                      <div key={key} onClick={()=>applyPreset(key)}
                        style={{ padding:"10px 12px", background: draft.config===key ? "#1a2a3a" : COLORS.bg,
                          border:`1px solid ${draft.config===key ? COLORS.accent : COLORS.border}`,
                          borderRadius:6, cursor:"pointer", transition:"all 0.15s" }}
                        onMouseEnter={e=>{ if(draft.config!==key) e.currentTarget.style.borderColor=COLORS.hover; }}
                        onMouseLeave={e=>{ if(draft.config!==key) e.currentTarget.style.borderColor=COLORS.border; }}>
                        <div style={{ fontSize:12, fontWeight:"bold", color: draft.config===key ? COLORS.accent : COLORS.text }}>{cfg.label}</div>
                        <div style={{ fontSize:10, color:COLORS.textDim, marginTop:2 }}>{cfg.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8, letterSpacing:1 }}>STAGE DIMENSIONS</div>
                  <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                    {[["Stage Width (ft)","stageW",stageW,setStageW],["Stage Depth (ft)","stageH",stageH,setStageH]].map(([lbl,key,val,setter])=>(
                      <div key={key} style={{ flex:1 }}>
                        <div style={labelStyle}>{lbl}</div>
                        <input type="number" value={val} min={8} max={300} onChange={e=>setter(+e.target.value)} style={fieldStyle}/>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8, letterSpacing:1 }}>ROOM DIMENSIONS</div>
                  <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                    {[["Room Width (ft)","roomW"],["Room Depth (ft)","roomH"]].map(([lbl,key])=>(
                      <div key={key} style={{ flex:1 }}>
                        <div style={labelStyle}>{lbl}</div>
                        <input type="number" value={draft[key]||60} min={10} max={500} onChange={e=>upd(key,+e.target.value)} style={fieldStyle}/>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8, letterSpacing:1 }}>STAGE POSITION WITHIN ROOM</div>
                  <div style={{ display:"flex", gap:10, marginBottom:8 }}>
                    {[["Offset from SR Wall (ft)","stageOffX"],["Offset from US Wall (ft)","stageOffY"]].map(([lbl,key])=>(
                      <div key={key} style={{ flex:1 }}>
                        <div style={labelStyle}>{lbl}</div>
                        <input type="number" value={draft[key]||0} min={0} max={100} onChange={e=>upd(key,+e.target.value)} style={fieldStyle}/>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <div style={labelStyle}>Total House Seats</div>
                    <input type="number" value={draft.houseSeats||0} min={0} max={5000} onChange={e=>upd("houseSeats",+e.target.value)} style={{ ...fieldStyle, width:120 }}/>
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <div style={labelStyle}>Upstage Orientation</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {[["N","Top (default)"],["S","Bottom"],["W","Left"],["E","Right"]].map(([v,lbl])=>(
                        <button key={v} onClick={()=>upd("orientation",v)}
                          style={{ flex:1, padding:"5px 4px", fontSize:10, background:draft.orientation===v?COLORS.accentDim:"transparent", color:draft.orientation===v?COLORS.text:COLORS.textDim, border:`1px solid ${draft.orientation===v?COLORS.accent:COLORS.border}`, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:COLORS.text, cursor:"pointer" }}>
                      <input type="checkbox" checked={draft.showRoom!==false} onChange={e=>upd("showRoom",e.target.checked)}/> Show room outline
                    </label>
                    <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:COLORS.text, cursor:"pointer" }}>
                      <input type="checkbox" checked={draft.showAudience!==false} onChange={e=>upd("showAudience",e.target.checked)}/> Show audience zones
                    </label>
                  </div>

                  {/* ── Stage shape ── */}
                  <div style={{ fontSize:9, color:COLORS.accent, marginBottom:8, letterSpacing:1 }}>STAGE SHAPE</div>

                  {/* Curved apron */}
                  <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:12, marginBottom:10 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:COLORS.text, cursor:"pointer", marginBottom: draft.curvedApron ? 12 : 0 }}>
                      <input type="checkbox" checked={!!draft.curvedApron} onChange={e=>upd("curvedApron",e.target.checked)}/>
                      <span style={{ fontWeight:"bold" }}>Curved Downstage Apron</span>
                    </label>
                    {draft.curvedApron && (
                      <div style={{ display:"flex", gap:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>ARC RADIUS (ft)</div>
                          <input type="number" value={draft.apronRadius??17.75} min={5} max={100} step={0.25}
                            onChange={e=>upd("apronRadius",+e.target.value)}
                            style={{ width:"100%", background:COLORS.panel, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Default = 17.75</div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>DEPTH AT CENTER (ft)</div>
                          <input type="number" value={draft.apronDepth??4.833} min={0.5} max={20} step={0.083}
                            onChange={e=>upd("apronDepth",+e.target.value)}
                            style={{ width:"100%", background:COLORS.panel, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Default = 4.83 (4'10")</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* US Notch */}
                  <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:12, marginBottom:10 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:COLORS.text, cursor:"pointer", marginBottom: draft.notch ? 12 : 0 }}>
                      <input type="checkbox" checked={!!draft.notch} onChange={e=>upd("notch",e.target.checked)}/>
                      <span style={{ fontWeight:"bold" }}>Upstage Recessed Section</span>
                    </label>
                    {draft.notch && (
                      <div style={{ display:"flex", gap:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>RECESSED CENTER WIDTH (ft)</div>
                          <input type="number" value={draft.notchW??13.875} min={1} max={50} step={0.083}
                            onChange={e=>upd("notchW",+e.target.value)}
                            style={{ width:"100%", background:COLORS.panel, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Default = 13.875 (13'10½") — center section</div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>WING STEP DEPTH (ft)</div>
                          <input type="number" value={draft.notchD??4.5} min={0.5} max={20} step={0.083}
                            onChange={e=>upd("notchD",+e.target.value)}
                            style={{ width:"100%", background:COLORS.panel, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Default = 4.5 (4'6") — how far wings step DS</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Room tab ── */}
              {activeTab === "room" && (
                <div>
                  <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:14 }}>Customize room colors and appearance.</div>
                  <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                    <div style={{ flex:1 }}>
                      <div style={labelStyle}>Room Fill Color</div>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input type="color" value={draft.roomColor||"#111118"} onChange={e=>upd("roomColor",e.target.value)} style={{ width:48, height:32, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", background:"none" }}/>
                        <input value={draft.roomColor||"#111118"} onChange={e=>upd("roomColor",e.target.value)} style={{ ...fieldStyle, flex:1 }}/>
                      </div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={labelStyle}>Room Border Color</div>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <input type="color" value={draft.roomBorderColor||"#3a3a5a"} onChange={e=>upd("roomBorderColor",e.target.value)} style={{ width:48, height:32, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", background:"none" }}/>
                        <input value={draft.roomBorderColor||"#3a3a5a"} onChange={e=>upd("roomBorderColor",e.target.value)} style={{ ...fieldStyle, flex:1 }}/>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={labelStyle}>Default Audience Zone Color</div>
                    <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:16 }}>
                      <input type="color" value={draft.audienceColor||"#1a2a1a"} onChange={e=>upd("audienceColor",e.target.value)} style={{ width:48, height:32, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", background:"none" }}/>
                      <input value={draft.audienceColor||"#1a2a1a"} onChange={e=>upd("audienceColor",e.target.value)} style={{ ...fieldStyle, flex:1 }}/>
                    </div>
                  </div>
                  <div style={{ padding:12, background:COLORS.bg, borderRadius:6, fontSize:11, color:COLORS.textDim, border:`1px solid ${COLORS.border}` }}>
                    Tip: For non-rectangular rooms (L-shaped, hexagonal, etc.), use the Wall drawing tool on the canvas to draw the room boundary as architectural walls on the Set layer.
                  </div>
                </div>
              )}

              {/* ── Audience / Seating tab ── */}
              {activeTab === "audience" && (
                <div>
                  <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:12 }}>Define audience seating zones. Each zone appears as a shaded rectangle with seat row lines.</div>
                  <button onClick={()=>{
                    const newZone = { x:2, y: (draft.roomH||50)-15, w: (draft.roomW||50)-4, h:12, label:`Zone ${(draft.audience||[]).length+1}`, seats:80, color:"" };
                    upd("audience", [...(draft.audience||[]), newZone]);
                    setEditingZone((draft.audience||[]).length);
                  }} style={{ marginBottom:12, padding:"7px 14px", background:COLORS.accent, color:COLORS.onAccent, border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
                    + Add Seating Zone
                  </button>

                  {(draft.audience||[]).length === 0 && (
                    <div style={{ color:COLORS.textDim, fontSize:11, padding:20, textAlign:"center" }}>No seating zones defined yet.</div>
                  )}

                  {(draft.audience||[]).map((az,i)=>(
                    <div key={i} style={{ background:COLORS.bg, border:`1px solid ${editingZone===i?COLORS.accent:COLORS.border}`, borderRadius:6, padding:12, marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <div style={{ flex:1, fontSize:12, fontWeight:"bold", color:COLORS.text }}>{az.label}</div>
                        <button onClick={()=>setEditingZone(editingZone===i?null:i)} style={{ fontSize:10, padding:"3px 8px", background:"transparent", color:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}>
                          {editingZone===i?"▲ Collapse":"▼ Edit"}
                        </button>
                        <button onClick={()=>{ const a=[...draft.audience]; a.splice(i,1); upd("audience",a); if(editingZone===i)setEditingZone(null); }}
                          style={{ fontSize:10, padding:"3px 8px", background:"#3a1010", color:COLORS.accent, border:`1px solid ${COLORS.accentDim}`, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                      </div>
                      {editingZone===i && (
                        <div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                            {[["Label","label","text"],["Seat Count","seats","number"],["X from SR (ft)","x","number"],["Y from US (ft)","y","number"],["Width (ft)","w","number"],["Height (ft)","h","number"]].map(([lbl,key,type])=>(
                              <div key={key}>
                                <div style={labelStyle}>{lbl}</div>
                                <input type={type} value={az[key]??""} onChange={e=>{
                                  const a=[...draft.audience];
                                  a[i]={...a[i],[key]:type==="number"?+e.target.value:e.target.value};
                                  upd("audience",a);
                                }} style={fieldStyle}/>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop:8 }}>
                            <div style={labelStyle}>Zone Color (leave blank for default)</div>
                            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                              <input type="color" value={az.color||draft.audienceColor||"#1a2a1a"} onChange={e=>{ const a=[...draft.audience]; a[i]={...a[i],color:e.target.value}; upd("audience",a); }}
                                style={{ width:40, height:28, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", background:"none" }}/>
                              <button onClick={()=>{ const a=[...draft.audience]; a[i]={...a[i],color:""}; upd("audience",a); }}
                                style={{ fontSize:10, padding:"3px 8px", background:"transparent", color:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}>Reset to default</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Library tab: saved venues, export / import ── */}
              {activeTab === "library" && (
                <div>
                  <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:12, lineHeight:1.5 }}>Save this room and stage as a named venue, load it into any plot, or share it as a file with another designer or put the file in your shared drive. Venues are kept in this browser.</div>
                  <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                    <input value={libName} onChange={e=>setLibName(e.target.value)} placeholder="Venue name" style={{ ...fieldStyle, width:220 }}/>
                    <button onClick={()=>{ if (!libName.trim()) { setLibMsg("Type a name first."); return; } commitLib(upsert(lib, { name: libName.trim(), venue: JSON.parse(JSON.stringify({ ...draft, name: libName.trim() })), stageW, stageH }), `Saved "${libName.trim()}".`); }}
                      style={{ padding:"6px 12px", background:COLORS.accent, color:COLORS.onAccent, border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Save current venue</button>
                    <label style={{ padding:"6px 12px", border:`1px solid ${COLORS.border}`, borderRadius:5, cursor:"pointer", fontSize:12, color:COLORS.text }}>Import file…
                      <input type="file" accept=".json" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ try { const found=parseVenueFile(ev.target.result, f.name.replace(/\.json$/i,"")); if(!found.length) throw 0; commitLib(found.reduce((a,v)=>upsert(a,v), lib), `Imported ${found.length} venue(s).`); } catch { setLibMsg("That file has no venue in it."); } }; r.readAsText(f); e.target.value=""; }}/>
                    </label>
                    <button disabled={!lib.length} onClick={()=>dl(libraryFile(lib), "venue-library.json")} style={{ padding:"6px 12px", background:"transparent", color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:5, cursor:lib.length?"pointer":"default", opacity:lib.length?1:0.5, fontSize:12, fontFamily:"inherit" }}>Export all</button>
                  </div>
                  {libMsg && <div style={{ fontSize:11, color:COLORS.accent, marginBottom:10 }}>{libMsg}</div>}
                  {!lib.length && <div style={{ color:COLORS.textDim, fontSize:11, padding:16, textAlign:"center" }}>No saved venues yet.</div>}
                  {lib.map(v => (
                    <div key={v.name} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:`1px solid ${COLORS.border}55` }}>
                      <div style={{ flex:1, fontSize:12 }}>{v.name}<div style={{ fontSize:10, color:COLORS.textDim }}>stage {v.stageW}' × {v.stageH}', room {v.venue.roomW}' × {v.venue.roomH}', {(v.venue.audience||[]).length} seating zone(s)</div></div>
                      <button onClick={()=>{ setDraft({ ...JSON.parse(JSON.stringify(v.venue)) }); setStageW(v.stageW); setStageH(v.stageH); setLibName(v.name); setLibMsg(`Loaded "${v.name}". Press Apply to use it.`); }} style={{ padding:"4px 10px", background:"transparent", color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Load</button>
                      <button onClick={()=>dl(libraryFile([v]), `${v.name.replace(/[^\w-]+/g,"_")}.venue.json`)} style={{ padding:"4px 10px", background:"transparent", color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Export</button>
                      <button onClick={()=>commitLib(lib.filter(x=>x.name!==v.name), `Removed "${v.name}".`)} style={{ padding:"4px 10px", background:"transparent", color:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Delete</button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Access / Vomitories tab ── */}
              {activeTab === "access" && (
                <div>
                  <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:12 }}>Add vomitory entrances / exits cut through the room walls. Position is expressed as a fraction (0=SR/US edge, 1=SL/DS edge).</div>
                  <button onClick={()=>{
                    const newV = { wall:"S", pos:0.5, w:4, label:`Vom ${(draft.vomitories||[]).length+1}` };
                    upd("vomitories", [...(draft.vomitories||[]), newV]);
                    setEditingVom((draft.vomitories||[]).length);
                  }} style={{ marginBottom:12, padding:"7px 14px", background:COLORS.accent, color:COLORS.onAccent, border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
                    + Add Vomitory
                  </button>

                  {(draft.vomitories||[]).length === 0 && (
                    <div style={{ color:COLORS.textDim, fontSize:11, padding:20, textAlign:"center" }}>No vomitories defined.</div>
                  )}

                  {(draft.vomitories||[]).map((vom,i)=>(
                    <div key={i} style={{ background:COLORS.bg, border:`1px solid ${editingVom===i?COLORS.accent:COLORS.border}`, borderRadius:6, padding:12, marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: editingVom===i?8:0 }}>
                        <div style={{ flex:1, fontSize:12, color:COLORS.text }}>{vom.label||`Vom ${i+1}`} — Wall: {vom.wall}</div>
                        <button onClick={()=>setEditingVom(editingVom===i?null:i)} style={{ fontSize:10, padding:"3px 8px", background:"transparent", color:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}>
                          {editingVom===i?"▲":"▼ Edit"}
                        </button>
                        <button onClick={()=>{ const v=[...draft.vomitories]; v.splice(i,1); upd("vomitories",v); }}
                          style={{ fontSize:10, padding:"3px 8px", background:"#3a1010", color:COLORS.accent, border:`1px solid ${COLORS.accentDim}`, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                      </div>
                      {editingVom===i && (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          <div>
                            <div style={labelStyle}>Label</div>
                            <input value={vom.label||""} onChange={e=>{ const v=[...draft.vomitories]; v[i]={...v[i],label:e.target.value}; upd("vomitories",v); }} style={fieldStyle}/>
                          </div>
                          <div>
                            <div style={labelStyle}>Wall</div>
                            <select value={vom.wall} onChange={e=>{ const v=[...draft.vomitories]; v[i]={...v[i],wall:e.target.value}; upd("vomitories",v); }} style={fieldStyle}>
                              <option value="N">North (Upstage)</option>
                              <option value="S">South (Downstage)</option>
                              <option value="W">West (SR)</option>
                              <option value="E">East (SL)</option>
                            </select>
                          </div>
                          <div>
                            <div style={labelStyle}>Position (0–1)</div>
                            <input type="number" min={0} max={1} step={0.05} value={vom.pos??0.5} onChange={e=>{ const v=[...draft.vomitories]; v[i]={...v[i],pos:+e.target.value}; upd("vomitories",v); }} style={fieldStyle}/>
                          </div>
                          <div>
                            <div style={labelStyle}>Opening Width (ft)</div>
                            <input type="number" min={2} max={30} value={vom.w??4} onChange={e=>{ const v=[...draft.vomitories]; v[i]={...v[i],w:+e.target.value}; upd("vomitories",v); }} style={fieldStyle}/>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: live preview */}
            <div style={{ width:220, borderLeft:`1px solid ${COLORS.border}`, padding:14, background:COLORS.bg, display:phone?"none":"flex", flexDirection:"column", gap:10, flexShrink:0 }}>
              <div style={{ fontSize:9, color:COLORS.textDim, letterSpacing:1, marginBottom:4 }}>LIVE PREVIEW</div>
              <svg width={pW} height={pH} style={{ border:`1px solid ${COLORS.border}`, borderRadius:4, display:"block", maxWidth:"100%" }}>
                {/* Room */}
                <rect x={0} y={0} width={pW} height={pH} fill={draft.roomColor||"#111118"} stroke={draft.roomBorderColor||"#3a3a5a"} strokeWidth={2}/>
                {/* Audience zones */}
                {(draft.audience||[]).map((az,i)=>(
                  <rect key={i} x={az.x*previewScale} y={az.y*previewScale} width={az.w*previewScale} height={az.h*previewScale}
                    fill={az.color||draft.audienceColor||"#1a2a1a"} stroke="#3a5a3a" strokeWidth={1}/>
                ))}
                {/* Audience labels */}
                {(draft.audience||[]).map((az,i)=>(
                  <text key={i} x={(az.x+az.w/2)*previewScale} y={(az.y+az.h/2)*previewScale} fill="#4a7a4a" fontSize={7} textAnchor="middle" dominantBaseline="middle">{az.label}</text>
                ))}
                {/* Stage */}
                {(() => {
                  const psD = (draft.apronDepth||4.833)*previewScale;
                  const psR = (sSW*sSW/4 + psD*psD)/(2*psD);
                  const pnW = (draft.notchW||13.875)*previewScale;
                  const pnD = (draft.notchD||4.5)*previewScale;
                  const pnX1 = sX+(sSW-pnW)/2, pnX2 = sX+(sSW+pnW)/2;
                  let pd;
                  if (draft.curvedApron && draft.notch) {
                    pd = `M ${sX},${sY+pnD} L ${pnX1},${sY+pnD} L ${pnX1},${sY} L ${pnX2},${sY} L ${pnX2},${sY+pnD} L ${sX+sSW},${sY+pnD} L ${sX+sSW},${sY+sSH} A ${psR},${psR} 0 0,1 ${sX},${sY+sSH} Z`;
                  } else if (draft.curvedApron) {
                    pd = `M ${sX},${sY} L ${sX+sSW},${sY} L ${sX+sSW},${sY+sSH} A ${psR},${psR} 0 0,1 ${sX},${sY+sSH} Z`;
                  } else if (draft.notch) {
                    pd = `M ${sX},${sY+pnD} L ${pnX1},${sY+pnD} L ${pnX1},${sY} L ${pnX2},${sY} L ${pnX2},${sY+pnD} L ${sX+sSW},${sY+pnD} L ${sX+sSW},${sY+sSH} L ${sX},${sY+sSH} Z`;
                  } else {
                    pd = `M ${sX},${sY} L ${sX+sSW},${sY} L ${sX+sSW},${sY+sSH} L ${sX},${sY+sSH} Z`;
                  }
                  return <path d={pd} fill={COLORS.stage} stroke={COLORS.stageEdge} strokeWidth={2}/>;
                })()}
                <text x={sX+sSW/2} y={sY+sSH/2} fill={COLORS.stageEdge} fontSize={7} textAnchor="middle" dominantBaseline="middle">STAGE</text>
                {/* Plasterline — downstage edge of the main deck, where the apron begins */}
                <line x1={sX} y1={sY+sSH} x2={sX+sSW} y2={sY+sSH} stroke={COLORS.stageEdge} strokeWidth={1.5} strokeDasharray="4,3"/>
              </svg>
              <div style={{ fontSize:9, color:COLORS.textDim, lineHeight:1.6 }}>
                Room: {draft.roomW}' × {draft.roomH}'<br/>
                Stage: {stageW}' × {stageH}'<br/>
                Seats: {draft.houseSeats||0}<br/>
                Config: {VENUE_CONFIGS[draft.config]?.label||draft.config}
              </div>
              {/* Quick audience adder */}
              <div style={{ marginTop:"auto", fontSize:9, color:COLORS.textDim }}>
                Audience zones: {(draft.audience||[]).length}
              </div>
            </div>
          </div>
      </Dialog>
    );
  };

