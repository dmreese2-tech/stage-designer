import { GRID, COLORS, GEL_PRESETS, FIXTURE_DEFS } from "./constants.js";
import { fmtTrim } from "./units.js";
import { Btn } from "./ui.jsx";
import { generateInstrumentSchedulePDF } from "./pdf.js";
import { Dialog } from "./layout.jsx";
// modals.jsx — project info and channel/batten schedule dialogs.
  // ── Project info modal ────────────────────────────────────────────────────
export function ProjectInfoModal({ projectInfo, setProjectInfo, onClose }) {
  return (
    <Dialog title="Project information" width={440} onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn active onClick={onClose}>Save</Btn></>}>
      {[["Production Title","title"],["Venue","venue"],["Lighting Designer","designer"],["Director","director"],["Revision #","revision"]].map(([lbl,key])=>(
        <label key={key} style={{ display:"block", marginBottom:12 }}>
          <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:4 }}>{lbl}</div>
          <input value={projectInfo[key]||""} onChange={e=>setProjectInfo(p=>({...p,[key]:e.target.value}))}
            style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"6px 8px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
        </label>
      ))}
    </Dialog>
  );
}

// ── Channel Schedule modal ────────────────────────────────────────────────
export function ScheduleModal({ projectInfo, elements, stageW, stageH, lightingEls, battens, setSelected, onClose, setSidebarTab }) {
  return (
    <Dialog title={`Instrument schedule — ${projectInfo.title||"Untitled"}`} width={860} tall onClose={onClose}
      actions={<Btn active onClick={()=>generateInstrumentSchedulePDF(elements, stageW, stageH, projectInfo)}>Print / PDF</Btn>}>
      <div style={{ overflowX:"auto" }}>
          {lightingEls.length === 0
            ? <div style={{ textAlign:"center", padding:40, color:COLORS.textDim }}>No lighting fixtures in plot yet.</div>
            : <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:COLORS.bg }}>
                    {["Ch","Dimmer","Fixture Type","Label","Batten","Gel","Angle","X (ft)","Y (ft)","Notes"].map(h=>(
                      <th key={h} style={{ padding:"6px 10px", textAlign:"left", color:COLORS.textDim, fontSize:9, textTransform:"uppercase", letterSpacing:0.5, borderBottom:`1px solid ${COLORS.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lightingEls.map(f=>{
                    const gel = GEL_PRESETS.find(g=>g.code===f.gelCode)||{code:"Open",name:"Open White",hex:"#fff"};
                    const batten = battens.find(b=>b.id===f.battenId);
                    return (
                      <tr key={f.id} onClick={()=>{setSelected(f.id);onClose();setSidebarTab("props");}}
                        style={{ cursor:"pointer", borderBottom:`1px solid ${COLORS.border}` }}
                        onMouseEnter={e=>e.currentTarget.style.background=COLORS.bg}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"5px 10px", fontWeight:"bold", color:COLORS.accent }}>{f.channel}</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{f.dimmer||"—"}</td>
                        <td style={{ padding:"5px 10px" }}>{FIXTURE_DEFS[f.type]?.label||f.type}</td>
                        <td style={{ padding:"5px 10px", color:COLORS.text }}>{f.label}</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{batten?.label||"—"}</td>
                        <td style={{ padding:"5px 10px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <div style={{ width:12, height:12, borderRadius:"50%", background:gel.hex, border:"1px solid #666", flexShrink:0 }}/>
                            <span style={{ color:COLORS.textDim, fontSize:10 }}>{gel.code}</span>
                          </div>
                        </td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{f.focusAngle}°</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{((f.x||0)/GRID).toFixed(1)}'</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{((f.y||0)/GRID).toFixed(1)}'</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{f.notes||""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          }
          {battens.length > 0 && (
            <>
              <div style={{ fontSize:10, color:COLORS.accent, letterSpacing:1, marginTop:20, marginBottom:8, borderTop:`1px solid ${COLORS.border}`, paddingTop:12 }}>BATTEN SCHEDULE</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:COLORS.bg }}>
                    {["Name","Range","DS Depth","Trim Height","Fixtures"].map(h=>(
                      <th key={h} style={{ padding:"6px 10px", textAlign:"left", color:COLORS.textDim, fontSize:9, textTransform:"uppercase", borderBottom:`1px solid ${COLORS.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {battens.map(b=>{
                    const fx = lightingEls.filter(f=>f.battenId===b.id);
                    const x1ft = ((b.x1)/GRID).toFixed(1), x2ft = ((b.x2)/GRID).toFixed(1);
                    const yft = ((b.y1)/GRID).toFixed(1);
                    return (
                      <tr key={b.id} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                        <td style={{ padding:"5px 10px", fontWeight:"bold", color:COLORS.batten }}>{b.label}</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{x1ft}' → {x2ft}'</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{yft}'</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{fmtTrim(b.trim)||"—"}</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{fx.length>0?fx.map(f=>`Ch ${f.channel}`).join(", "):"None assigned"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
      </div>
    </Dialog>
  );
}

