import { useState, useRef, useCallback, useEffect } from "react";

// ── constants ────────────────────────────────────────────────────────────────
const GRID = 20;
const snap = (v) => Math.round(v / GRID) * GRID;

const COLORS = {
  bg: "#1a1a2e", panel: "#16213e", border: "#0f3460",
  accent: "#e94560", accentDim: "#a03040",
  stage: "#2a2a1a", stageEdge: "#5a5a3a",
  text: "#e8e0d0", textDim: "#8a8070",
  grid: "#5a6a8a", selected: "#ffd700", hover: "#88aaff",
  batten: "#4a6a8a",
};

// Standard Rosco gel colors (abbreviated)
const GEL_PRESETS = [
  { code: "R02",  name: "Bastard Amber",    hex: "#e8b870" },
  { code: "R08",  name: "Pale Gold",        hex: "#f0d080" },
  { code: "R26",  name: "Bright Red",       hex: "#cc2020" },
  { code: "R27",  name: "Medium Red",       hex: "#aa1818" },
  { code: "R39",  name: "Skelton Exotic",   hex: "#e87040" },
  { code: "R51",  name: "Surprise Pink",    hex: "#e880a0" },
  { code: "R58",  name: "Deep Lavender",    hex: "#8040c0" },
  { code: "R68",  name: "Sky Blue",         hex: "#4090d0" },
  { code: "R74",  name: "Night Blue",       hex: "#102080" },
  { code: "R80",  name: "Primary Blue",     hex: "#2030c0" },
  { code: "R88",  name: "Lime Green",       hex: "#60d040" },
  { code: "R90",  name: "Dark Yellow Green",hex: "#80a020" },
  { code: "R99",  name: "Chocolate",        hex: "#603010" },
  { code: "R312", name: "Canary",           hex: "#f0e040" },
  { code: "R315", name: "Pale Violet",      hex: "#c090e0" },
  { code: "R343", name: "Deep Purple",      hex: "#400080" },
  { code: "L201", name: "Full CT Orange",   hex: "#e09040" },
  { code: "L202", name: "Half CT Orange",   hex: "#f0b870" },
  { code: "L203", name: "Quarter CT Orange",hex: "#f8d8a0" },
  { code: "Open", name: "Open White",       hex: "#ffffff" },
  { code: "None", name: "No Gel",           hex: "#444444" },
];

const FIXTURE_DEFS = {
  ellipsoidal: { label:"Ellipsoidal",  shape:"ellipse",  color:"#ffdd44", w:28, h:40 },
  fresnel:     { label:"Fresnel",      shape:"circle",   color:"#44aaff", w:36, h:36 },
  par:         { label:"PAR Can",      shape:"rect",     color:"#ff8844", w:24, h:36 },
  led_wash:    { label:"LED Wash",     shape:"rect",     color:"#aa44ff", w:40, h:28 },
  spotlight:   { label:"Follow Spot",  shape:"triangle", color:"#ffffff", w:30, h:42 },
  strobe:      { label:"Strobe",       shape:"rect",     color:"#ccccff", w:40, h:20 },
  hazer:       { label:"Hazer",        shape:"cloud",    color:"#aaddff", w:48, h:32 },
  moving_head: { label:"Moving Head",  shape:"diamond",  color:"#ff44ff", w:30, h:30 },
  strip_light: { label:"Strip Light",  shape:"strip",    color:"#ffee88", w:80, h:16 },
};

const BATTEN_DEFS = {
  batten: { label: "Batten / Pipe", color: "#4a6a8a" },
};

const SET_DEFS = {
  flat:      { label:"Flat",          color:"#8b7355", w:4,   h:80  },
  door_flat: { label:"Door Flat",     color:"#7a6245", w:4,   h:80  },
  platform:  { label:"Platform",      color:"#6b5e45", w:60,  h:40  },
  chair:     { label:"Chair",         color:"#5a4f3a", w:24,  h:24  },
  table:     { label:"Table",         color:"#6b5a3a", w:60,  h:30  },
  sofa:      { label:"Sofa",          color:"#5a4a4a", w:80,  h:32  },
  bed:       { label:"Bed",           color:"#4a4a5a", w:60,  h:80  },
  door:      { label:"Door (swing)",  color:"#8a7060", w:36,  h:4   },
  window:    { label:"Window",        color:"#6080a0", w:48,  h:4   },
  backdrop:  { label:"Backdrop",      color:"#2a3a4a", w:200, h:4   },
  leg_drape: { label:"Leg Drape",     color:"#1a1a2a", w:8,   h:120 },
  scrim:     { label:"Scrim",         color:"#3a4a5a", w:200, h:4   },
  stairs:    { label:"Stairs",        color:"#7a6a4a", w:40,  h:40  },
  podium:    { label:"Podium",        color:"#6a5a4a", w:30,  h:30  },
};

const TOOLS = [
  { id:"select",  icon:"↖",  label:"Select (S)"   },
  { id:"pan",     icon:"✋", label:"Pan (P)"      },
  { id:"wall",    icon:"▬",  label:"Draw Wall (W)" },
  { id:"batten",  icon:"═",  label:"Add Batten (B)"},
  { id:"label",   icon:"T",  label:"Text Label (L)"},
  { id:"delete",  icon:"✕",  label:"Delete (D)"   },
];

const LAYERS = [
  { id:"lighting",   label:"⚡ Lighting",   color:"#ffdd44" },
  { id:"battens",    label:"═  Battens",    color:"#4a6a8a" },
  { id:"set",        label:"🏠 Set",         color:"#8b7355" },
  { id:"softgoods",  label:"🎭 Soft Goods",  color:"#2a3a4a" },
  { id:"practicals", label:"💡 Practicals",  color:"#ff8844" },
  { id:"notes",      label:"📝 Notes",       color:"#88cc88" },
];

// ── Venue configuration presets ───────────────────────────────────────────────
const VENUE_CONFIGS = {
  burgdorff: {
    label: "Burgdorff Center",
    icon: "🏛",
    desc: "Burgdorff Center, Maplewood NJ — curved DS apron, recessed US center section",
    stageW: 35.5, stageH: 26.5,
    roomW: 36, roomH: 32,
    stageOffX: 0, stageOffY: 0,
    audience: [],
    config: "burgdorff",
    curvedApron: true, apronRadius: 17.75, apronDepth: 4.833,
    notch: true, notchW: 13.875, notchD: 4.5,
  },
  blackbox: {
    label: "Black Box / Flexible",
    icon: "⬛",
    desc: "Fully flexible space, no fixed stage/audience relationship",
    stageW: 40, stageH: 30,
    roomW: 60, roomH: 55,
    stageOffX: 10, stageOffY: 12,
    audience: [],
    config: "blackbox",
  },
  proscenium: {
    label: "Proscenium",
    icon: "🎭",
    desc: "Traditional stage with arch, audience faces one direction",
    stageW: 50, stageH: 30,
    roomW: 60, roomH: 70,
    stageOffX: 5, stageOffY: 5,
    audience: [{ x:5, y:37, w:50, h:28, label:"House", seats:400 }],
    config: "proscenium",
  },
  thrust: {
    label: "Thrust",
    icon: "🔲",
    desc: "Stage extends into audience, seating on three sides",
    stageW: 30, stageH: 30,
    roomW: 60, roomH: 60,
    stageOffX: 15, stageOffY: 5,
    audience: [
      { x:0,  y:5,  w:14, h:30, label:"SR House",   seats:80  },
      { x:46, y:5,  w:14, h:30, label:"SL House",   seats:80  },
      { x:5,  y:37, w:50, h:18, label:"DS House",   seats:120 },
    ],
    config: "thrust",
  },
  traverse: {
    label: "Traverse",
    icon: "⬌",
    desc: "Stage runs through the middle, audience on both sides",
    stageW: 40, stageH: 18,
    roomW: 60, roomH: 50,
    stageOffX: 10, stageOffY: 16,
    audience: [
      { x:2,  y:14, w:7,  h:22, label:"SR House", seats:60 },
      { x:51, y:14, w:7,  h:22, label:"SL House", seats:60 },
    ],
    config: "traverse",
  },
  arena: {
    label: "Arena / In-the-Round",
    icon: "⭕",
    desc: "Stage in the center, audience surrounds on all sides",
    stageW: 24, stageH: 24,
    roomW: 60, roomH: 60,
    stageOffX: 18, stageOffY: 18,
    audience: [
      { x:2,  y:18, w:15, h:24, label:"SR House",  seats:80  },
      { x:43, y:18, w:15, h:24, label:"SL House",  seats:80  },
      { x:18, y:2,  w:24, h:15, label:"US House",  seats:80  },
      { x:18, y:43, w:24, h:15, label:"DS House",  seats:80  },
    ],
    config: "arena",
  },
  endstage: {
    label: "End Stage",
    icon: "▬",
    desc: "Simple raised platform at one end, no proscenium arch",
    stageW: 40, stageH: 16,
    roomW: 55, roomH: 60,
    stageOffX: 7, stageOffY: 5,
    audience: [{ x:5, y:23, w:45, h:32, label:"House", seats:200 }],
    config: "endstage",
  },
  courtyard: {
    label: "Courtyard / L-shaped",
    icon: "🔳",
    desc: "Stage in a corner with audience wrapping two sides",
    stageW: 30, stageH: 30,
    roomW: 60, roomH: 60,
    stageOffX: 5, stageOffY: 5,
    audience: [
      { x:37, y:5,  w:20, h:30, label:"SL House",  seats:80  },
      { x:5,  y:37, w:52, h:20, label:"DS House",  seats:120 },
    ],
    config: "courtyard",
  },
};

const DEFAULT_VENUE = {
  config: "burgdorff",
  // Burgdorff Center room: 36' wide x ~32' deep wall-to-wall
  roomW: 36, roomH: 32,
  stageOffX: 0, stageOffY: 0,
  roomShape: "rect",
  roomPoints: [],
  audience: [],
  showRoom: true,
  showAudience: true,
  roomColor: "#111118",
  roomBorderColor: "#3a3a5a",
  audienceColor: "#1a2a1a",
  houseSeats: 0,
  orientation: "N",
  vomitories: [],
  // Curved downstage apron (from ground plan):
  // 17'9" radius arc, 4'10" deep at center DS
  curvedApron: true,
  apronRadius: 17.75,
  apronDepth: 4.833,
  // Upstage recessed center section: 13'10.5" wide, wings step forward 4'6"
  notch: true,
  notchW: 13.875,
  notchD: 4.5,
};

let _id = 1;
const uid = () => `el_${_id++}`;

// ── SVG Fixture renderer ──────────────────────────────────────────────────────
function FixtureSVG({ def, x, y, rotation=0, color, focused=false, focusAngle=45, selected, gelHex }) {
  const hw = def.w/2, hh = def.h/2;
  const stroke = selected ? COLORS.selected : focused ? "#88ffaa" : "#222";
  const sw = selected ? 2.5 : 1.5;
  const fill = gelHex && gelHex !== "#444444" ? gelHex : color;

  let shape;
  if (def.shape === "ellipse") {
    shape = <ellipse cx={0} cy={0} rx={hw} ry={hh} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  } else if (def.shape === "circle") {
    shape = <circle cx={0} cy={0} r={hw} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  } else if (def.shape === "triangle") {
    shape = <polygon points={`0,${-hh} ${-hw},${hh} ${hw},${hh}`} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  } else if (def.shape === "diamond") {
    shape = <polygon points={`0,${-hh} ${hw},0 0,${hh} ${-hw},0`} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  } else if (def.shape === "strip") {
    shape = <g>
      <rect x={-hw} y={-hh} width={def.w} height={def.h} fill={fill} stroke={stroke} strokeWidth={sw}/>
      {[-hw*0.6,-hw*0.2,hw*0.2,hw*0.6].map((cx,i)=>(
        <circle key={i} cx={cx} cy={0} r={hh*0.6} fill="rgba(255,255,200,0.4)" stroke="rgba(0,0,0,0.3)" strokeWidth={0.5}/>
      ))}
    </g>;
  } else if (def.shape === "cloud") {
    shape = <g>
      <ellipse cx={0} cy={4} rx={hw*0.7} ry={hh*0.5} fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx={-hw*0.35} cy={0} r={hh*0.45} fill={fill} stroke={stroke} strokeWidth={sw}/>
      <circle cx={hw*0.35} cy={0} r={hh*0.45} fill={fill} stroke={stroke} strokeWidth={sw}/>
    </g>;
  } else {
    shape = <rect x={-hw} y={-hh} width={def.w} height={def.h} fill={fill} stroke={stroke} strokeWidth={sw}/>;
  }

  const beamLen = 90;
  const halfA = (focusAngle/2)*(Math.PI/180);
  const bx1 = -Math.tan(halfA)*beamLen, bx2 = Math.tan(halfA)*beamLen;
  const beamFill = gelHex && gelHex !== "#444444"
    ? gelHex.replace("#","") 
    : "ffff80";
  const beamColor = gelHex && gelHex !== "#444444" ? gelHex : "#ffff80";

  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`}>
      {focused && (
        <polygon
          points={`0,${hh} ${bx1},${hh+beamLen} ${bx2},${hh+beamLen}`}
          fill={beamColor.replace(")"," / 0.12)").replace("rgb","rgba")||"rgba(255,255,128,0.12)"}
          stroke={beamColor}
          strokeWidth={1} strokeDasharray="4,3" opacity={0.6}
        />
      )}
      {shape}
      <line x1={0} y1={-hh} x2={0} y2={hh} stroke="rgba(0,0,0,0.25)" strokeWidth={1}/>
    </g>
  );
}

// ── Set piece renderer ────────────────────────────────────────────────────────
function SetPieceSVG({ def, x, y, rotation=0, color, selected, label }) {
  const hw = def.w/2, hh = def.h/2;
  const stroke = selected ? COLORS.selected : "#111";
  const sw = selected ? 2.5 : 1;
  const isDoor = label?.toLowerCase().includes("door");
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`}>
      <rect x={-hw} y={-hh} width={def.w} height={def.h} fill={color} stroke={stroke} strokeWidth={sw} rx={2}/>
      {isDoor && <path d={`M${-hw},${-hh} A${def.w},${def.w} 0 0 1 ${hw},${-hh}`} fill="none" stroke={stroke} strokeWidth={1} strokeDasharray="3,2"/>}
      {label?.toLowerCase().includes("stairs") && [0.25,0.5,0.75].map(t=>(
        <line key={t} x1={-hw} y1={-hh+def.h*t} x2={hw} y2={-hh+def.h*t} stroke={stroke} strokeWidth={0.8}/>
      ))}
    </g>
  );
}

// ── Batten renderer ───────────────────────────────────────────────────────────
function BattenSVG({ el, selected }) {
  const x1 = el.x1 ?? el.x - el.length*GRID/2;
  const y1 = el.y1 ?? el.y;
  const x2 = el.x2 ?? el.x + el.length*GRID/2;
  const y2 = el.y2 ?? el.y;
  const stroke = selected ? COLORS.selected : COLORS.batten;
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={selected?5:3} strokeLinecap="round"/>
      <line x1={x1} y1={y1-8} x2={x1} y2={y1+8} stroke={stroke} strokeWidth={1.5}/>
      <line x1={x2} y1={y2-8} x2={x2} y2={y2+8} stroke={stroke} strokeWidth={1.5}/>
      {selected && <text x={mx} y={my-12} fill={COLORS.selected} fontSize={10} textAnchor="middle">{el.label || "Batten"}</text>}
    </g>
  );
}

// ── Text label renderer ───────────────────────────────────────────────────────
function TextLabelSVG({ el, selected }) {
  return (
    <g>
      <text x={el.x} y={el.y} fill={selected ? COLORS.selected : el.color || COLORS.text}
        fontSize={el.fontSize || 14} textAnchor="middle" fontFamily="Courier New, monospace"
        style={{ cursor:"move" }}>
        {el.label || "Label"}
      </text>
      {selected && <circle cx={el.x} cy={el.y-4} r={3} fill={COLORS.selected} opacity={0.6}/>}
    </g>
  );
}

// ── PDF generation (pure JS, no server) ──────────────────────────────────────
function generateInstrumentSchedulePDF(elements, stageW, stageH, projectInfo) {
  const fixtures = elements
    .filter(e => e.category === "lighting" && e.type !== "hazer")
    .sort((a,b) => (a.channel||999)-(b.channel||999));

  const battens = elements.filter(e => e.type === "batten");

  // Build minimal PDF manually
  const lines = [];
  const objs = [];
  let objN = 1;

  const addObj = (content) => {
    objs.push({ id: objN++, content });
  };

  // We'll use a simpler approach: generate an HTML table and use window.print()
  // Open a new window with print-ready HTML
  const now = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});

  const tableRows = fixtures.map(f => {
    const batten = battens.find(b => b.id === f.battenId);
    const gel = GEL_PRESETS.find(g => g.code === f.gelCode) || { code:"Open", name:"Open White", hex:"#ffffff" };
    const xFt = ((f.x||0)/GRID).toFixed(1);
    const yFt = ((f.y||0)/GRID).toFixed(1);
    return `
      <tr>
        <td style="text-align:center;font-weight:bold">${f.channel ?? ""}</td>
        <td>${f.dimmer ?? ""}</td>
        <td>${f.label || FIXTURE_DEFS[f.type]?.label || f.type}</td>
        <td>${batten ? batten.label || "Batten" : ""}</td>
        <td style="text-align:center">
          <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${gel.hex};border:1px solid #555;vertical-align:middle;margin-right:4px"></span>
          ${gel.code}
        </td>
        <td>${gel.name}</td>
        <td style="text-align:center">${f.focusAngle ?? 45}°</td>
        <td style="text-align:center">${xFt}'</td>
        <td style="text-align:center">${yFt}'</td>
        <td>${f.notes ?? ""}</td>
      </tr>`;
  }).join("");

  const battenRows = battens.map(b => {
    const fixturesOnBatten = fixtures.filter(f => f.battenId === b.id);
    const x1ft = ((b.x1 ?? b.x - b.length*GRID/2)/GRID).toFixed(1);
    const x2ft = ((b.x2 ?? b.x + b.length*GRID/2)/GRID).toFixed(1);
    const yft = ((b.y1 ?? b.y)/GRID).toFixed(1);
    return `
      <tr>
        <td>${b.label || "Batten"}</td>
        <td>${x1ft}' → ${x2ft}'</td>
        <td>${yft}'</td>
        <td>${b.trim ?? ""}</td>
        <td>${fixturesOnBatten.length} fixture${fixturesOnBatten.length !== 1 ? "s":""}:
          ${fixturesOnBatten.map(f=>`Ch ${f.channel}`).join(", ")}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Instrument Schedule — ${projectInfo.title || "Stage Design"}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:"Helvetica Neue",Arial,sans-serif; font-size:10pt; color:#111; background:#fff; }
  .page { width:11in; padding:0.5in; }
  @media print { .page { width:100%; padding:0.4in; } .no-print{display:none} }

  /* Title block */
  .title-block { border:2px solid #222; margin-bottom:16px; }
  .title-main { display:flex; border-bottom:1px solid #222; }
  .title-main .show { flex:1; padding:10px 12px; border-right:1px solid #222; }
  .title-main .show h1 { font-size:18pt; font-weight:900; letter-spacing:1px; }
  .title-main .show .sub { font-size:10pt; color:#555; margin-top:2px; }
  .title-meta { display:flex; }
  .meta-cell { padding:6px 12px; border-right:1px solid #222; min-width:140px; }
  .meta-cell:last-child { border-right:none; }
  .meta-cell .key { font-size:7pt; text-transform:uppercase; letter-spacing:1px; color:#888; }
  .meta-cell .val { font-size:10pt; font-weight:bold; }

  /* Section headers */
  h2 { font-size:11pt; font-weight:900; text-transform:uppercase; letter-spacing:1.5px;
       border-bottom:2px solid #222; padding-bottom:4px; margin:20px 0 10px; }

  /* Tables */
  table { width:100%; border-collapse:collapse; font-size:8.5pt; margin-bottom:20px; }
  th { background:#222; color:#fff; padding:5px 7px; font-size:7.5pt; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #222; }
  td { padding:4px 7px; border:1px solid #ccc; vertical-align:middle; }
  tr:nth-child(even) td { background:#f8f8f8; }
  tr:hover td { background:#fff8e8; }

  /* Stage summary box */
  .summary { display:flex; gap:16px; margin-bottom:20px; }
  .stat { border:1px solid #ddd; border-radius:4px; padding:8px 14px; text-align:center; min-width:100px; }
  .stat .n { font-size:20pt; font-weight:900; color:#222; }
  .stat .k { font-size:7.5pt; text-transform:uppercase; letter-spacing:0.5px; color:#888; margin-top:2px; }

  .gel-legend { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .gel-chip { display:flex; align-items:center; gap:5px; padding:3px 8px; border:1px solid #ddd; border-radius:3px; font-size:8pt; }
  .gel-dot { width:14px; height:14px; border-radius:50%; border:1px solid #555; }

  .print-btn { position:fixed; top:12px; right:12px; background:#e94560; color:#fff; border:none;
               padding:10px 20px; border-radius:6px; font-size:11pt; cursor:pointer; font-weight:bold; z-index:999; }
  .print-btn:hover { background:#c03050; }
  footer { margin-top:24px; font-size:7.5pt; color:#888; border-top:1px solid #ddd; padding-top:8px; display:flex; justify-content:space-between; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨 Print / Save PDF</button>
<div class="page">

  <!-- TITLE BLOCK -->
  <div class="title-block">
    <div class="title-main">
      <div class="show">
        <h1>${projectInfo.title || "UNTITLED PRODUCTION"}</h1>
        <div class="sub">${projectInfo.venue || ""}</div>
      </div>
      <div style="padding:10px 14px;text-align:right;min-width:200px">
        <div style="font-size:7.5pt;text-transform:uppercase;color:#888">Instrument Schedule</div>
        <div style="font-size:22pt;font-weight:900">PLOT</div>
      </div>
    </div>
    <div class="title-meta">
      <div class="meta-cell"><div class="key">Designer</div><div class="val">${projectInfo.designer || "—"}</div></div>
      <div class="meta-cell"><div class="key">Director</div><div class="val">${projectInfo.director || "—"}</div></div>
      <div class="meta-cell"><div class="key">Stage Size</div><div class="val">${stageW}' × ${stageH}'</div></div>
      <div class="meta-cell"><div class="key">Date</div><div class="val">${now}</div></div>
      <div class="meta-cell"><div class="key">Revision</div><div class="val">${projectInfo.revision || "1"}</div></div>
    </div>
  </div>

  <!-- SUMMARY STATS -->
  <div class="summary">
    <div class="stat"><div class="n">${fixtures.length}</div><div class="k">Total Fixtures</div></div>
    <div class="stat"><div class="n">${battens.length}</div><div class="k">Battens</div></div>
    <div class="stat"><div class="n">${fixtures.filter(f=>f.channel).length}</div><div class="k">Channels Used</div></div>
    <div class="stat"><div class="n">${[...new Set(fixtures.map(f=>f.gelCode).filter(Boolean))].length}</div><div class="k">Gel Colors</div></div>
    <div class="stat"><div class="n">${[...new Set(fixtures.map(f=>f.type))].length}</div><div class="k">Fixture Types</div></div>
  </div>

  <!-- GEL LEGEND -->
  ${fixtures.some(f=>f.gelCode) ? `
  <h2>Gel Color Legend</h2>
  <div class="gel-legend">
    ${[...new Set(fixtures.map(f=>f.gelCode).filter(Boolean))].map(code => {
      const gel = GEL_PRESETS.find(g=>g.code===code) || {code,name:"Custom",hex:"#888"};
      return `<div class="gel-chip"><div class="gel-dot" style="background:${gel.hex}"></div><strong>${gel.code}</strong> — ${gel.name}</div>`;
    }).join("")}
  </div>` : ""}

  <!-- INSTRUMENT SCHEDULE -->
  <h2>Instrument Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Ch</th><th>Dimmer</th><th>Fixture</th><th>Batten/Position</th>
        <th>Gel</th><th>Gel Name</th><th>Angle</th><th>X</th><th>Y</th><th>Notes</th>
      </tr>
    </thead>
    <tbody>${tableRows || '<tr><td colspan="10" style="text-align:center;color:#888;padding:20px">No lighting fixtures in plot</td></tr>'}</tbody>
  </table>

  <!-- BATTEN SCHEDULE -->
  ${battens.length > 0 ? `
  <h2>Batten / Pipe Schedule</h2>
  <table>
    <thead><tr><th>Name</th><th>Position (SR→SL)</th><th>Depth from DS</th><th>Trim Height</th><th>Fixtures</th></tr></thead>
    <tbody>${battenRows}</tbody>
  </table>` : ""}

  <footer>
    <span>Stage Designer App — Generated ${now}</span>
    <span>${projectInfo.title || "Untitled Production"} | ${projectInfo.venue || ""}</span>
  </footer>
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ── Shared small button ─────────────────────────────────────────────────────
  const Btn = ({onClick,children,active,danger,title}) => (
    <button onClick={onClick} title={title}
      style={{ background:danger?"#3a1010":active?COLORS.accent:"transparent",
               color:danger?COLORS.accent:active?"#fff":COLORS.textDim,
               border:`1px solid ${danger?COLORS.accent:active?COLORS.accent:COLORS.border}`,
               borderRadius:5, padding:"4px 9px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
      {children}
    </button>
  );

  // ── Venue Editor modal ────────────────────────────────────────────────────
function VenueEditorModal({ venue, stageW, stageH, setStageW, setStageH, onClose, onApply }) {
    const [draft, setDraft] = useState({ ...venue });
    const [activeTab, setActiveTab] = useState("config");
    const [editingZone, setEditingZone] = useState(null);
    const [editingVom, setEditingVom] = useState(null);

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
      fontSize:11, fontFamily:"inherit", borderBottom: activeTab===id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
    });
    const fieldStyle = { width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"5px 7px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" };
    const labelStyle = { fontSize:9, color:COLORS.textDim, marginBottom:3, textTransform:"uppercase", letterSpacing:0.5 };

    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:COLORS.panel, border:`1px solid ${COLORS.border}`, borderRadius:8, width:780, maxWidth:"96vw", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", padding:"14px 18px", borderBottom:`1px solid ${COLORS.border}` }}>
            <span style={{ flex:1, fontSize:14, fontWeight:"bold", color:COLORS.accent, letterSpacing:1 }}>🏛 VENUE SPACE EDITOR</span>
            <button onClick={onClose} style={{ background:"transparent", color:COLORS.textDim, border:"none", fontSize:20, cursor:"pointer" }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${COLORS.border}` }}>
            {[["config","Configuration"],["room","Room Shape"],["audience","Seating"],["access","Access"]].map(([id,lbl])=>(
              <button key={id} style={tabStyle(id)} onClick={()=>setActiveTab(id)}>{lbl}</button>
            ))}
          </div>

          <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

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
                        <div style={{ fontSize:18, marginBottom:3 }}>{cfg.icon}</div>
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
                          style={{ flex:1, padding:"5px 4px", fontSize:10, background:draft.orientation===v?COLORS.accent:"transparent", color:draft.orientation===v?"#fff":COLORS.textDim, border:`1px solid ${draft.orientation===v?COLORS.accent:COLORS.border}`, borderRadius:4, cursor:"pointer", fontFamily:"inherit" }}>
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
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Burgdorff = 17.75</div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>DEPTH AT CENTER (ft)</div>
                          <input type="number" value={draft.apronDepth??4.833} min={0.5} max={20} step={0.083}
                            onChange={e=>upd("apronDepth",+e.target.value)}
                            style={{ width:"100%", background:COLORS.panel, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Burgdorff = 4.83 (4'10")</div>
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
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Burgdorff = 13.875 (13'10½") — center section</div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>WING STEP DEPTH (ft)</div>
                          <input type="number" value={draft.notchD??4.5} min={0.5} max={20} step={0.083}
                            onChange={e=>upd("notchD",+e.target.value)}
                            style={{ width:"100%", background:COLORS.panel, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
                          <div style={{ fontSize:8, color:COLORS.textDim, marginTop:2 }}>Burgdorff = 4.5 (4'6") — how far wings step DS</div>
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
                    💡 Tip: For non-rectangular rooms (L-shaped, hexagonal, etc.), use the Wall drawing tool on the canvas to draw the room boundary as architectural walls on the Set layer.
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
                  }} style={{ marginBottom:12, padding:"7px 14px", background:COLORS.accent, color:"#fff", border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
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

              {/* ── Access / Vomitories tab ── */}
              {activeTab === "access" && (
                <div>
                  <div style={{ fontSize:11, color:COLORS.textDim, marginBottom:12 }}>Add vomitory entrances / exits cut through the room walls. Position is expressed as a fraction (0=SR/US edge, 1=SL/DS edge).</div>
                  <button onClick={()=>{
                    const newV = { wall:"S", pos:0.5, w:4, label:`Vom ${(draft.vomitories||[]).length+1}` };
                    upd("vomitories", [...(draft.vomitories||[]), newV]);
                    setEditingVom((draft.vomitories||[]).length);
                  }} style={{ marginBottom:12, padding:"7px 14px", background:COLORS.accent, color:"#fff", border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
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
            <div style={{ width:220, borderLeft:`1px solid ${COLORS.border}`, padding:14, background:COLORS.bg, display:"flex", flexDirection:"column", gap:10, flexShrink:0 }}>
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

          {/* Footer */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, padding:"12px 18px", borderTop:`1px solid ${COLORS.border}` }}>
            <button onClick={onClose} style={{ padding:"7px 18px", background:"transparent", color:COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cancel</button>
            <button onClick={()=>onApply(draft)}
              style={{ padding:"7px 20px", background:COLORS.accent, color:"#fff", border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:"bold" }}>
              ✓ Apply Venue
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Project info modal ────────────────────────────────────────────────────
function ProjectInfoModal({ projectInfo, setProjectInfo, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:COLORS.panel, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:24, width:420, maxWidth:"90vw" }}>
        <div style={{ fontSize:13, fontWeight:"bold", color:COLORS.accent, marginBottom:16, letterSpacing:1 }}>PROJECT INFORMATION</div>
        {[["Production Title","title"],["Venue","venue"],["Lighting Designer","designer"],["Director","director"],["Revision #","revision"]].map(([lbl,key])=>(
          <div key={key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>{lbl}</div>
            <input value={projectInfo[key]||""} onChange={e=>setProjectInfo(p=>({...p,[key]:e.target.value}))}
              style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"6px 8px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn active onClick={onClose}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Channel Schedule modal ────────────────────────────────────────────────
function ScheduleModal({ projectInfo, elements, stageW, stageH, lightingEls, battens, setSelected, onClose, setSidebarTab }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:COLORS.panel, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:0, width:860, maxWidth:"95vw", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", padding:"14px 18px", borderBottom:`1px solid ${COLORS.border}` }}>
          <span style={{ flex:1, fontSize:13, fontWeight:"bold", color:COLORS.accent, letterSpacing:1 }}>INSTRUMENT SCHEDULE — {projectInfo.title||"Untitled"}</span>
          <Btn active onClick={()=>generateInstrumentSchedulePDF(elements, stageW, stageH, projectInfo)}>🖨 Print / PDF</Btn>
          <button onClick={onClose} style={{ marginLeft:8, background:"transparent", color:COLORS.textDim, border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
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
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{b.trim||"—"}</td>
                        <td style={{ padding:"5px 10px", color:COLORS.textDim }}>{fx.length>0?fx.map(f=>`Ch ${f.channel}`).join(", "):"None assigned"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Properties panel content ──────────────────────────────────────────────
function PropsPanel({ selEl, updateEl, battens, setElements, setSelected, selected }) {
    if (!selEl) return (
      <div style={{ padding:16, fontSize:11, color:COLORS.textDim, textAlign:"center", marginTop:20 }}>
        Select an element to edit its properties
      </div>
    );

    const isBatten = selEl.type === "batten";
    const isLight = selEl.category === "lighting";
    const isText = selEl.type === "textlabel";

    return (
      <div style={{ flex:1, overflowY:"auto", padding:10 }}>
        <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8, letterSpacing:1 }}>ELEMENT PROPERTIES</div>

        {/* Label / name */}
        {[
          ["Label / Name","label","text"],
          ...(isLight ? [
            ["Channel #","channel","number"],
            ["Dimmer","dimmer","text"],
            ["Focus Angle °","focusAngle","number"],
          ] : []),
          ...(isBatten ? [["Trim Height (ft)","trim","text"]] : []),
          ...(!isBatten ? [["Rotation °","rotation","number"]] : []),
          ...(isText ? [["Font Size","fontSize","number"]] : []),
        ].map(([lbl,key,type])=>(
          <div key={key} style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl}</div>
            <input type={type} value={selEl[key]??""} onChange={e=>updateEl(key, type==="number"?+e.target.value:e.target.value)}
              style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 6px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
        ))}

        {/* Width / Height (ft) — converted from internal px units, same pattern as Position */}
        {!isBatten && !isText && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>SIZE (ft)</div>
            <div style={{ display:"flex", gap:6 }}>
              {[["W","w"],["H","h"]].map(([lbl,key])=>(
                <div key={key}>
                  <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl}</div>
                  <input type="number" value={Math.round((selEl[key]||0)/GRID*100)/100}
                    onChange={e=>updateEl(key,+e.target.value*GRID)}
                    style={{ width:58, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:11, fontFamily:"inherit" }}/>
                </div>
              ))}
            </div>
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
                style={{ background:selEl.focused?COLORS.accent:COLORS.bg, color:selEl.focused?"#fff":COLORS.textDim, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"4px 14px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
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

        {/* Position */}
        {!isBatten && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>POSITION (ft)</div>
            <div style={{ display:"flex", gap:6 }}>
              {[["X","x"],["Y","y"]].map(([lbl,key])=>(
                <div key={key}>
                  <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl}</div>
                  <input type="number" value={Math.round((selEl[key]||0)/GRID*10)/10}
                    onChange={e=>updateEl(key,+e.target.value*GRID)}
                    style={{ width:58, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:11, fontFamily:"inherit" }}/>
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
                  <input type="number" value={Math.round((selEl[key]||0)/GRID*10)/10}
                    onChange={e=>updateEl(key,+e.target.value*GRID)}
                    style={{ width:58, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:11, fontFamily:"inherit" }}/>
                </div>
              ))}
              <div>
                <div style={{ fontSize:9, color:COLORS.textDim }}>Depth (Y)</div>
                <input type="number" value={Math.round((selEl.y1||0)/GRID*10)/10}
                  onChange={e=>{ const v=+e.target.value*GRID; updateEl("y1",v); updateEl("y2",v); }}
                  style={{ width:58, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:11, fontFamily:"inherit" }}/>
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

        <button onClick={()=>{setElements(prev=>prev.filter(e=>e.id!==selected));setSelected(null);}}
          style={{ marginTop:12, width:"100%", background:"#3a1010", color:COLORS.accent, border:`1px solid ${COLORS.accentDim}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
          🗑 Delete Element
        </button>
      </div>
    );
  };

// ── Main app ──────────────────────────────────────────────────────────────────
export default function StageDesigner() {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tool, setTool] = useState("select");
  const [activeCat, setActiveCat] = useState("set");
  const [activeLayer, setActiveLayer] = useState("set");
  const [layerVis, setLayerVis] = useState({ lighting:true, battens:true, set:true, softgoods:true, practicals:true, notes:true });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x:80, y:60 });
  const [dragging, setDragging] = useState(null);
  const [drawingWall, setDrawingWall] = useState(null);
  const [wallStart, setWallStart] = useState(null);
  const [drawingBatten, setDrawingBatten] = useState(null);
  const [battenStart, setBattenStart] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showMeasure, setShowMeasure] = useState(true);
  const [stageW, setStageW] = useState(35.5); // Burgdorff: 35'6" wide
  const [stageH, setStageH] = useState(26.5); // Burgdorff: 26'6" deep
  const [sidebarTab, setSidebarTab] = useState("elements");
  const [hoverId, setHoverId] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [showVenueEditor, setShowVenueEditor] = useState(false);
  const [projectInfo, setProjectInfo] = useState({ title:"", venue:"Burgdorff Center", designer:"", director:"", revision:"1" });
  const [venue, setVenue] = useState({ ...DEFAULT_VENUE });
  const [labelText, setLabelText] = useState("");
  const [placingLabel, setPlacingLabel] = useState(false);

  const selEl = elements.find(e => e.id === selected);

  // ── SVG coordinate helpers ────────────────────────────────────────────────
  const svgPt = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x:0, y:0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── place element ─────────────────────────────────────────────────────────
  const placeElement = useCallback((type, category, defObj, cx, cy) => {
    const el = {
      id: uid(), type, category,
      layer: category === "lighting" ? "lighting" : activeLayer,
      x: snap(cx), y: snap(cy),
      rotation: 0, color: defObj.color,
      label: defObj.label,
      channel: category === "lighting"
        ? Math.max(0, ...elements.filter(e=>e.category==="lighting").map(e=>e.channel||0))+1
        : undefined,
      dimmer: "", focusAngle: 45, focused: false,
      gelCode: "Open", notes: "",
      w: defObj.w, h: defObj.h,
    };
    setElements(prev => [...prev, el]);
    setSelected(el.id);
    setTool("select");
    if (sidebarTab !== "props") setSidebarTab("props");
  }, [activeLayer, elements, sidebarTab]);

  // ── place batten (pick-and-place, same pattern as set/lighting elements) ───
  const placeBatten = useCallback((cx, cy) => {
    const battenCount = elements.filter(e => e.type === "batten").length + 1;
    const halfLen = 5 * GRID; // default 10ft pipe, centered on click point
    const el = {
      id: uid(), type: "batten", category: "batten", layer: "battens",
      x1: snap(cx - halfLen), y1: snap(cy), x2: snap(cx + halfLen), y2: snap(cy),
      label: `Batten ${battenCount}`, color: COLORS.batten, trim: "", notes: "",
    };
    setElements(prev => [...prev, el]);
    setSelected(el.id);
    setTool("select");
    if (sidebarTab !== "props") setSidebarTab("props");
  }, [elements, sidebarTab]);

  // ── pointer events ────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.button === 1 || tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault(); return;
    }
    const pt = svgPt(e.clientX, e.clientY);
    if (tool === "wall") {
      setWallStart({ x:snap(pt.x), y:snap(pt.y) });
      setDrawingWall({ x1:snap(pt.x), y1:snap(pt.y), x2:snap(pt.x), y2:snap(pt.y) });
      return;
    }
    if (tool === "batten") {
      setBattenStart({ x:snap(pt.x), y:snap(pt.y) });
      setDrawingBatten({ x1:snap(pt.x), y1:snap(pt.y), x2:snap(pt.x), y2:snap(pt.y) });
      return;
    }
    if (tool === "label") {
      const text = window.prompt("Enter label text:", "Label");
      if (text) {
        const el = {
          id: uid(), type:"textlabel", category:"notes", layer:"notes",
          x: snap(pt.x), y: snap(pt.y), label: text, color: COLORS.text, fontSize: 14,
        };
        setElements(prev => [...prev, el]);
        setSelected(el.id);
        setTool("select");
      }
      return;
    }
    if (tool === "select") setSelected(null);
  }, [tool, pan, svgPt]);

  const onPointerMove = useCallback((e) => {
    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return;
    }
    if (dragging) {
      const pt = svgPt(e.clientX, e.clientY);
      setElements(prev => prev.map(el => {
        if (el.id !== dragging.id) return el;
        if (dragging.mode === "battenMove") {
          const nx1 = snap(pt.x - dragging.ox), ny1 = snap(pt.y - dragging.oy);
          const dx = nx1 - el.x1, dy = ny1 - el.y1;
          return { ...el, x1: nx1, y1: ny1, x2: el.x2 + dx, y2: el.y2 + dy };
        }
        if (dragging.mode === "battenP1") return { ...el, x1: snap(pt.x), y1: snap(pt.y) };
        if (dragging.mode === "battenP2") return { ...el, x2: snap(pt.x), y2: snap(pt.y) };
        return { ...el, x: snap(pt.x - dragging.ox), y: snap(pt.y - dragging.oy) };
      })); return;
    }
    const pt = svgPt(e.clientX, e.clientY);
    if (drawingWall && wallStart) setDrawingWall({ x1:wallStart.x, y1:wallStart.y, x2:snap(pt.x), y2:snap(pt.y) });
    if (drawingBatten && battenStart) setDrawingBatten({ x1:battenStart.x, y1:battenStart.y, x2:snap(pt.x), y2:snap(pt.y) });
  }, [isPanning, panStart, dragging, drawingWall, wallStart, drawingBatten, battenStart, svgPt]);

  const onPointerUp = useCallback((e) => {
    setIsPanning(false); setPanStart(null);
    if (dragging) { setDragging(null); return; }
    if (drawingWall && wallStart) {
      const len = Math.hypot(drawingWall.x2-drawingWall.x1, drawingWall.y2-drawingWall.y1);
      if (len > 10) {
        const el = { id:uid(), type:"wall", category:"set", layer:activeLayer,
          x1:drawingWall.x1, y1:drawingWall.y1, x2:drawingWall.x2, y2:drawingWall.y2,
          color:"#8b7355", label:"Wall", thick:4 };
        setElements(prev => [...prev, el]);
        setSelected(el.id);
      }
      setDrawingWall(null); setWallStart(null); setTool("select");
    }
    if (drawingBatten && battenStart) {
      const len = Math.hypot(drawingBatten.x2-drawingBatten.x1, drawingBatten.y2-drawingBatten.y1);
      if (len > 20) {
        const ft = (len/GRID).toFixed(1);
        const battenCount = elements.filter(e=>e.type==="batten").length+1;
        const el = { id:uid(), type:"batten", category:"batten", layer:"battens",
          x1:drawingBatten.x1, y1:drawingBatten.y1, x2:drawingBatten.x2, y2:drawingBatten.y2,
          label:`Batten ${battenCount}`, color:COLORS.batten, trim:"", notes:"",
          length: parseFloat(ft) };
        setElements(prev => [...prev, el]);
        setSelected(el.id);
      }
      setDrawingBatten(null); setBattenStart(null); setTool("select");
    }
  }, [dragging, drawingWall, wallStart, drawingBatten, battenStart, activeLayer, elements]);

  const onElementDown = useCallback((e, el) => {
    e.stopPropagation();
    if (tool === "delete") {
      setElements(prev => prev.filter(x => x.id !== el.id));
      setSelected(null); return;
    }
    if (tool === "select") {
      setSelected(el.id);
      if (sidebarTab !== "props") setSidebarTab("props");
      if (!["wall","batten"].includes(el.type)) {
        const pt = svgPt(e.clientX, e.clientY);
        setDragging({ id: el.id, ox: pt.x - el.x, oy: pt.y - el.y });
      }
    }
  }, [tool, svgPt, sidebarTab]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.15, z * (e.deltaY < 0 ? 1.12 : 0.9))));
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive:false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── update element ────────────────────────────────────────────────────────
  const updateEl = (key, val) => setElements(prev => prev.map(e => e.id === selected ? { ...e, [key]: val } : e));

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "Escape") { setSelected(null); setTool("select"); }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        setElements(prev => prev.filter(x => x.id !== selected)); setSelected(null);
      }
      if (!e.metaKey && !e.ctrlKey) {
        if (e.key === "s") setTool("select");
        if (e.key === "w") setTool("wall");
        if (e.key === "b") setTool("batten");
        if (e.key === "d") setTool("delete");
        if (e.key === "p") setTool("pan");
        if (e.key === "l") setTool("label");
      }
      if (selected && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        const d = e.shiftKey ? GRID : GRID/4;
        const dx = e.key==="ArrowLeft"?-d:e.key==="ArrowRight"?d:0;
        const dy = e.key==="ArrowUp"?-d:e.key==="ArrowDown"?d:0;
        setElements(prev=>prev.map(el=>el.id===selected?{...el,x:(el.x||0)+dx,y:(el.y||0)+dy}:el));
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // ── JSON export / import ──────────────────────────────────────────────────
  const exportJSON = () => {
    const data = JSON.stringify({ version:2, projectInfo, stageW, stageH, venue, elements }, null, 2);
    const blob = new Blob([data], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${projectInfo.title||"stage-layout"}.json`; a.click();
  };
  const importJSON = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.elements) { setElements(data.elements); _id = Math.max(...data.elements.map(el=>parseInt(el.id.replace("el_",""))||0))+1; }
        if (data.stageW) setStageW(data.stageW);
        if (data.stageH) setStageH(data.stageH);
        if (data.projectInfo) setProjectInfo(data.projectInfo);
        if (data.venue) setVenue(data.venue);
      } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── SVG export ────────────────────────────────────────────────────────────
  const exportSVG = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
    const blob = new Blob([clone.outerHTML], { type:"image/svg+xml" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${projectInfo.title||"stage-layout"}.svg`; a.click();
  };

  // ── stage dims ────────────────────────────────────────────────────────────
  const SW = stageW * GRID, SH = stageH * GRID;

  // ── grid ──────────────────────────────────────────────────────────────────
  const gridLines = [];
  if (showGrid) {
    for (let gx=0; gx<=stageW; gx++) gridLines.push(
      <line key={`gx${gx}`} x1={gx*GRID} y1={0} x2={gx*GRID} y2={SH} stroke={COLORS.grid} strokeWidth={gx%5===0?1:0.5} opacity={gx%5===0?0.55:0.3}/>
    );
    for (let gy=0; gy<=stageH; gy++) gridLines.push(
      <line key={`gy${gy}`} x1={0} y1={gy*GRID} x2={SW} y2={gy*GRID} stroke={COLORS.grid} strokeWidth={gy%5===0?1:0.5} opacity={gy%5===0?0.55:0.3}/>
    );
  }
  const measureLabels = [];
  if (showMeasure) {
    for (let gx=0; gx<=stageW; gx+=5) measureLabels.push(
      <text key={`mx${gx}`} x={gx*GRID} y={-8} fill={COLORS.textDim} fontSize={10} textAnchor="middle">{gx}'</text>
    );
    for (let gy=0; gy<=stageH; gy+=5) measureLabels.push(
      <text key={`my${gy}`} x={-14} y={gy*GRID+4} fill={COLORS.textDim} fontSize={10} textAnchor="end">{gy}'</text>
    );
  }

  // ── render element ────────────────────────────────────────────────────────
  const renderEl = (el) => {
    if (!layerVis[el.layer]) return null;
    const isSel = el.id === selected;
    const isHov = el.id === hoverId;
    const hoverStyle = { cursor: tool==="delete"?"crosshair":tool==="select"?"move":"default" };

    if (el.type === "textlabel") {
      return (
        <g key={el.id} onPointerDown={e=>onElementDown(e,el)} onPointerEnter={()=>setHoverId(el.id)} onPointerLeave={()=>setHoverId(null)} style={{ cursor:"move" }}>
          <TextLabelSVG el={el} selected={isSel}/>
        </g>
      );
    }
    if (el.type === "batten") {
      return (
        <g key={el.id}>
          <g
            onPointerDown={e=>{
              e.stopPropagation();
              if (tool==="delete") { setElements(p=>p.filter(x=>x.id!==el.id)); setSelected(null); return; }
              setSelected(el.id);
              if (sidebarTab!=="props") setSidebarTab("props");
              if (tool==="select") {
                const pt = svgPt(e.clientX, e.clientY);
                setDragging({ id: el.id, mode:"battenMove", ox: pt.x-el.x1, oy: pt.y-el.y1 });
              }
            }}
            onPointerEnter={()=>setHoverId(el.id)} onPointerLeave={()=>setHoverId(null)}
            style={{ cursor: tool==="delete"?"crosshair":"move" }}>
            <BattenSVG el={el} selected={isSel}/>
            {!isSel && <text x={(el.x1+el.x2)/2} y={(el.y1+el.y2)/2-10} fill={COLORS.batten} fontSize={9} textAnchor="middle" opacity={0.7}>{el.label}</text>}
          </g>
          {isSel && tool==="select" && (
            <>
              <circle cx={el.x1} cy={el.y1} r={7} fill={COLORS.selected} stroke="#000" strokeWidth={1} style={{ cursor:"ew-resize" }}
                onPointerDown={e=>{ e.stopPropagation(); setSelected(el.id); setDragging({ id: el.id, mode:"battenP1" }); }}/>
              <circle cx={el.x2} cy={el.y2} r={7} fill={COLORS.selected} stroke="#000" strokeWidth={1} style={{ cursor:"ew-resize" }}
                onPointerDown={e=>{ e.stopPropagation(); setSelected(el.id); setDragging({ id: el.id, mode:"battenP2" }); }}/>
            </>
          )}
        </g>
      );
    }
    if (el.type === "wall") {
      const dx=el.x2-el.x1, dy=el.y2-el.y1;
      const ft = (Math.hypot(dx,dy)/GRID).toFixed(1);
      return (
        <g key={el.id} onPointerDown={e=>onElementDown(e,el)} onPointerEnter={()=>setHoverId(el.id)} onPointerLeave={()=>setHoverId(null)} style={{ cursor:"pointer" }}>
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={isSel?COLORS.selected:isHov?COLORS.hover:el.color} strokeWidth={el.thick||4} strokeLinecap="round"/>
          {isSel && <text x={(el.x1+el.x2)/2} y={(el.y1+el.y2)/2-8} fill={COLORS.selected} fontSize={10} textAnchor="middle">{ft}'</text>}
        </g>
      );
    }
    if (el.category === "lighting") {
      const def = FIXTURE_DEFS[el.type] || FIXTURE_DEFS.ellipsoidal;
      const gel = GEL_PRESETS.find(g=>g.code===el.gelCode);
      const gelHex = gel?.hex;
      return (
        <g key={el.id} style={hoverStyle} onPointerDown={e=>onElementDown(e,el)} onPointerEnter={()=>setHoverId(el.id)} onPointerLeave={()=>setHoverId(null)}>
          <FixtureSVG def={{...def,w:el.w,h:el.h}} x={el.x} y={el.y} rotation={el.rotation} color={el.color} focused={el.focused} focusAngle={el.focusAngle} selected={isSel} gelHex={gelHex}/>
          {el.channel && <text x={el.x} y={el.y+(el.h/2)+14} fill={isSel?COLORS.selected:COLORS.textDim} fontSize={9} textAnchor="middle">Ch {el.channel}</text>}
          {isSel && <text x={el.x} y={el.y-(el.h/2)-6} fill={COLORS.selected} fontSize={9} textAnchor="middle">{el.label}</text>}
          {el.gelCode && el.gelCode !== "Open" && el.gelCode !== "None" && (
            <circle cx={el.x+(el.w/2)-5} cy={el.y-(el.h/2)+5} r={5} fill={gelHex||"#888"} stroke="#fff" strokeWidth={0.8} opacity={0.9}/>
          )}
        </g>
      );
    }
    const def = SET_DEFS[el.type] || SET_DEFS.flat;
    return (
      <g key={el.id} style={hoverStyle} onPointerDown={e=>onElementDown(e,el)} onPointerEnter={()=>setHoverId(el.id)} onPointerLeave={()=>setHoverId(null)}>
        <SetPieceSVG def={{...def,w:el.w,h:el.h}} x={el.x} y={el.y} rotation={el.rotation} color={el.color} selected={isSel} label={el.label}/>
        {isSel && <text x={el.x} y={el.y+(el.h/2)+14} fill={COLORS.selected} fontSize={9} textAnchor="middle">{el.label}</text>}
      </g>
    );
  };

  const lightingEls = elements.filter(e=>e.category==="lighting"&&e.channel).sort((a,b)=>(a.channel||999)-(b.channel||999));
  const battens = elements.filter(e=>e.type==="batten");


  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:COLORS.bg, color:COLORS.text, fontFamily:"'Courier New',monospace", userSelect:"none", overflow:"hidden" }}>

      {showProjectInfo && <ProjectInfoModal projectInfo={projectInfo} setProjectInfo={setProjectInfo} onClose={()=>setShowProjectInfo(false)}/>}
      {showSchedule && <ScheduleModal projectInfo={projectInfo} elements={elements} stageW={stageW} stageH={stageH} lightingEls={lightingEls} battens={battens} setSelected={setSelected} setSidebarTab={setSidebarTab} onClose={()=>setShowSchedule(false)}/>}
      {showVenueEditor && <VenueEditorModal venue={venue} stageW={stageW} stageH={stageH} setStageW={setStageW} setStageH={setStageH} onClose={()=>setShowVenueEditor(false)} onApply={(d)=>{setVenue(d); setShowVenueEditor(false);}}/>}

      {/* ── top bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:COLORS.panel, borderBottom:`1px solid ${COLORS.border}`, flexShrink:0, flexWrap:"wrap" }}>
        <a href="https://apps.upstage.systems" title="Back to Apps.Upstage.Systems"
          style={{ display:"flex", alignItems:"center", gap:4, color:COLORS.textDim, textDecoration:"none", fontSize:11, padding:"4px 8px", border:`1px solid ${COLORS.border}`, borderRadius:5, marginRight:2 }}
          onMouseEnter={e=>{ e.currentTarget.style.color=COLORS.accent; e.currentTarget.style.borderColor=COLORS.accent; }}
          onMouseLeave={e=>{ e.currentTarget.style.color=COLORS.textDim; e.currentTarget.style.borderColor=COLORS.border; }}>
          ← Apps
        </a>
        <span style={{ color:COLORS.accent, fontWeight:"bold", fontSize:14, letterSpacing:1, marginRight:4 }}>🎭 STAGE DESIGNER</span>
        {projectInfo.title && <span style={{ fontSize:11, color:COLORS.textDim }}>— {projectInfo.title}</span>}
        <div style={{ width:1, height:18, background:COLORS.border, margin:"0 4px" }}/>
        {TOOLS.map(t=>(
          <Btn key={t.id} active={tool===t.id} onClick={()=>setTool(t.id)} title={t.label}>{t.icon} {t.label.split(" ")[0]}</Btn>
        ))}
        <div style={{ width:1, height:18, background:COLORS.border, margin:"0 4px" }}/>
        <Btn onClick={()=>setShowGrid(g=>!g)} active={showGrid}>Grid</Btn>
        <Btn onClick={()=>setShowMeasure(m=>!m)} active={showMeasure}>Scale</Btn>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:10, color:COLORS.textDim }}>{Math.round(zoom*100)}%</span>
        <Btn onClick={()=>{setZoom(1);setPan({x: 80 + (venue.stageOffX||0)*GRID, y: 60 + (venue.stageOffY||0)*GRID});}}>⌂ Reset</Btn>
        <Btn onClick={()=>setShowVenueEditor(true)}>🏛 Venue</Btn>
        <Btn onClick={()=>setShowProjectInfo(true)}>⚙ Project</Btn>
        <Btn onClick={()=>setShowSchedule(true)} active={showSchedule}>📋 Schedule</Btn>
        <Btn onClick={()=>generateInstrumentSchedulePDF(elements,stageW,stageH,projectInfo)}>🖨 PDF</Btn>
        <Btn onClick={exportSVG}>⬇ SVG</Btn>
        <Btn onClick={exportJSON}>⬇ JSON</Btn>
        <Btn onClick={()=>fileInputRef.current?.click()}>⬆ Import</Btn>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} style={{ display:"none" }}/>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── left sidebar ── */}
        <div style={{ width:215, background:COLORS.panel, borderRight:`1px solid ${COLORS.border}`, display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden" }}>
          {/* tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${COLORS.border}` }}>
            {[["elements","Elems"],["layers","Layers"],["props","Props"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setSidebarTab(id)}
                style={{ flex:1, background:sidebarTab===id?COLORS.bg:"transparent", color:sidebarTab===id?COLORS.accent:COLORS.textDim, border:"none", padding:"7px 0", cursor:"pointer", fontSize:10, fontFamily:"inherit", borderBottom:sidebarTab===id?`2px solid ${COLORS.accent}`:"2px solid transparent" }}>
                {lbl}
              </button>
            ))}
          </div>

          {sidebarTab === "elements" && (
            <div style={{ flex:1, overflowY:"auto", padding:8 }}>
              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {[["set","Set"],["lighting","Lighting"],["batten","Battens"]].map(([id,lbl])=>(
                  <button key={id} onClick={()=>setActiveCat(id)}
                    style={{ flex:1, background:activeCat===id?COLORS.accent:"transparent", color:activeCat===id?"#fff":COLORS.textDim, border:`1px solid ${activeCat===id?COLORS.accent:COLORS.border}`, borderRadius:4, padding:"4px 0", cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>
                    {lbl}
                  </button>
                ))}
              </div>
              {activeCat === "set" && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:3 }}>LAYER</div>
                  <select value={activeLayer} onChange={e=>setActiveLayer(e.target.value)}
                    style={{ width:"100%", background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 6px", fontSize:10, fontFamily:"inherit" }}>
                    {LAYERS.filter(l=>l.id!=="lighting").map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
              )}
              <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:4 }}>CLICK OR DRAG TO PLACE</div>
              {Object.entries(activeCat==="set"?SET_DEFS:activeCat==="lighting"?FIXTURE_DEFS:BATTEN_DEFS).map(([key,def])=>(
                <div key={key} draggable
                  onDragStart={e=>e.dataTransfer.setData("elType",key)}
                  onClick={()=>{
                    const cx=(svgRef.current?.clientWidth/2-pan.x)/zoom;
                    const cy=(svgRef.current?.clientHeight/2-pan.y)/zoom;
                    if (activeCat==="batten") placeBatten(snap(cx),snap(cy));
                    else placeElement(key,activeCat,def,snap(cx),snap(cy));
                  }}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 7px", marginBottom:3, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", transition:"border-color 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=COLORS.accent}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=COLORS.border}>
                  <div style={{ width:activeCat==="batten"?11:11, height:activeCat==="batten"?3:11, borderRadius:activeCat==="lighting"?"50%":2, background:def.color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:COLORS.text }}>{def.label}</span>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === "layers" && (
            <div style={{ flex:1, overflowY:"auto", padding:10 }}>
              <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8 }}>LAYER VISIBILITY</div>
              {LAYERS.map(l=>(
                <div key={l.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                  <button onClick={()=>setLayerVis(v=>({...v,[l.id]:!v[l.id]}))}
                    style={{ width:18, height:18, borderRadius:3, background:layerVis[l.id]?l.color:COLORS.border, border:"none", cursor:"pointer", flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:layerVis[l.id]?COLORS.text:COLORS.textDim }}>{l.label}</span>
                </div>
              ))}
              <div style={{ marginTop:18, fontSize:9, color:COLORS.textDim }}>STAGE SIZE</div>
              <div style={{ display:"flex", gap:6, marginTop:6 }}>
                {[["Width","stageW",stageW,setStageW],["Depth","stageH",stageH,setStageH]].map(([lbl,key,val,setter])=>(
                  <div key={key}>
                    <div style={{ fontSize:9, color:COLORS.textDim }}>{lbl} (ft)</div>
                    <input type="number" value={val} onChange={e=>setter(+e.target.value)} min={10} max={300}
                      style={{ width:58, background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"3px 5px", fontSize:12, fontFamily:"inherit" }}/>
                  </div>
                ))}
              </div>
              <button onClick={()=>setShowVenueEditor(true)} style={{ marginTop:12, width:"100%", background:COLORS.bg, color:COLORS.accent, border:`1px solid ${COLORS.accent}`, borderRadius:4, padding:"7px 0", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
                🏛 Open Venue Editor
              </button>
              <div style={{ marginTop:8, fontSize:9, color:COLORS.textDim }}>
                Room: {venue.roomW}'×{venue.roomH}' · {VENUE_CONFIGS[venue.config]?.label||"Custom"}
              </div>
              <div style={{ marginTop:14, fontSize:9, color:COLORS.textDim }}>ELEMENT COUNT</div>
              {LAYERS.map(l=>{
                const count = elements.filter(e=>e.layer===l.id).length;
                return count > 0 ? (
                  <div key={l.id} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:10, color:COLORS.textDim }}>
                    <span>{l.label}</span>
                    <span style={{ color:l.color }}>{count}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {sidebarTab === "props" && <PropsPanel selEl={selEl} updateEl={updateEl} battens={battens} setElements={setElements} setSelected={setSelected} selected={selected}/>}
        </div>

        {/* ── canvas ── */}
        <div style={{ flex:1, position:"relative", overflow:"hidden", background:COLORS.bg }}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{
            e.preventDefault();
            const type = e.dataTransfer.getData("elType"); if (!type) return;
            const pt = svgPt(e.clientX, e.clientY);
            if (activeCat==="batten" || type==="batten") { placeBatten(pt.x, pt.y); return; }
            const defs = activeCat==="set"?SET_DEFS:FIXTURE_DEFS;
            const def = defs[type]; if (!def) return;
            placeElement(type, activeCat, def, snap(pt.x), snap(pt.y));
          }}>
          <svg ref={svgRef} style={{ width:"100%", height:"100%", display:"block",
            cursor: isPanning||tool==="pan"?"grabbing":tool==="delete"?"crosshair":tool==="wall"||tool==="batten"?"crosshair":"default" }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* ── Room / venue shell ── */}
              {venue.showRoom && (() => {
                const rW = venue.roomW * GRID, rH = venue.roomH * GRID;
                const offX = (venue.stageOffX || 0) * GRID, offY = (venue.stageOffY || 0) * GRID;
                const rx = -offX, ry = -offY;
                return (
                  <g>
                    {/* Room fill */}
                    <rect x={rx} y={ry} width={rW} height={rH} fill={venue.roomColor||"#111118"} stroke={venue.roomBorderColor||"#3a3a5a"} strokeWidth={3}/>
                    {/* Audience zones */}
                    {venue.showAudience && (venue.audience||[]).map((az,i) => (
                      <g key={i}>
                        <rect
                          x={rx + az.x*GRID} y={ry + az.y*GRID}
                          width={az.w*GRID} height={az.h*GRID}
                          fill={az.color || venue.audienceColor || "#1a2a1a"}
                          stroke="#3a5a3a" strokeWidth={1.5}
                          rx={4}
                        />
                        {/* Seat rows hint */}
                        {Array.from({ length: Math.min(8, Math.floor(az.h/2)) }).map((_,r) => (
                          <line key={r}
                            x1={rx+az.x*GRID+6} y1={ry+az.y*GRID + (r+1)*(az.h*GRID/(Math.min(8,Math.floor(az.h/2))+1))}
                            x2={rx+az.x*GRID+az.w*GRID-6} y2={ry+az.y*GRID + (r+1)*(az.h*GRID/(Math.min(8,Math.floor(az.h/2))+1))}
                            stroke="#2a4a2a" strokeWidth={1.5}
                          />
                        ))}
                        <text
                          x={rx + (az.x + az.w/2)*GRID}
                          y={ry + (az.y + az.h/2)*GRID}
                          fill="#4a7a4a" fontSize={10} textAnchor="middle" dominantBaseline="middle" opacity={0.85}
                        >{az.label}{az.seats ? ` (${az.seats})` : ""}</text>
                      </g>
                    ))}
                    {/* Vomitory openings */}
                    {(venue.vomitories||[]).map((vom,i) => {
                      const vw = (vom.w||4)*GRID;
                      let vx1,vy1,vx2,vy2;
                      if (vom.wall==="S") { vx1=rx+vom.pos*rW-vw/2; vy1=ry+rH-3; vx2=rx+vom.pos*rW+vw/2; vy2=ry+rH+3; }
                      else if (vom.wall==="N") { vx1=rx+vom.pos*rW-vw/2; vy1=ry-3; vx2=rx+vom.pos*rW+vw/2; vy2=ry+3; }
                      else if (vom.wall==="W") { vx1=rx-3; vy1=ry+vom.pos*rH-vw/2; vx2=rx+3; vy2=ry+vom.pos*rH+vw/2; }
                      else { vx1=rx+rW-3; vy1=ry+vom.pos*rH-vw/2; vx2=rx+rW+3; vy2=ry+vom.pos*rH+vw/2; }
                      return <rect key={i} x={vx1} y={vy1} width={vx2-vx1} height={vy2-vy1} fill={COLORS.bg} stroke="#6a8a6a" strokeWidth={1}/>;
                    })}
                    {/* Room label */}
                    <text x={rx+10} y={ry+14} fill={venue.roomBorderColor||"#3a3a5a"} fontSize={9} opacity={0.6}>ROOM: {venue.roomW}' × {venue.roomH}'</text>
                  </g>
                );
              })()}
              {/* ── Stage floor — Burgdorff shape ── */}
              {(() => {
                const apron = venue.curvedApron;
                const hasUSRecess = venue.notch; // repurposed: upstage recessed wings

                // ── Burgdorff dimensions ──────────────────────────────────────
                // SR wing width (ft→px)
                const srWingW = (venue.notchW
                  ? (36 - venue.notchW) / 2          // derive wing from center width
                  : 11.083) * GRID;                   // default 11'1"
                const centerW = (venue.notchW || 13.875) * GRID;  // 13'10.5"
                const slWingW = SW - srWingW - centerW; // remainder

                // Step depth: how much further US the center recesses (4'6")
                const stepD = (venue.notchD || 4.5) * GRID;

                // Apron (DS curve)
                const aD = (venue.apronDepth || 4.833) * GRID;
                // SVG arc radius from chord (SW) and sagitta (aD)
                const aR = (SW * SW / 4 + aD * aD) / (2 * aD);

                // ── Key x coordinates ─────────────────────────────────────────
                // x=0          SR outer edge of stage
                // x=srWingW    SR wing inner edge / center recess SR corner
                // x=srWingW+centerW  SL wing inner edge / center recess SL corner
                // x=SW         SL outer edge of stage
                const cx1 = srWingW;              // center recess SR corner
                const cx2 = srWingW + centerW;   // center recess SL corner

                // ── Key y coordinates ─────────────────────────────────────────
                // y=0     deepest upstage point (US wall of recessed center)
                // y=stepD wing US wall (wings are shallower by stepD)
                // y=SH    plasterline (DS edge of main rectangular deck)
                // y=SH+aD apron DS tip at center

                // ── Stage outline path (clockwise) ────────────────────────────
                // Burgdorff shape with US recess + curved DS apron:
                //
                //   SR wing US    center recessed US wall    SL wing US
                //  (0,stepD)──(cx1,stepD)   (cx2,stepD)──(SW,stepD)
                //              |                       |
                //           (cx1,0)─────────────(cx2,0)   ← deepest US
                //
                //  (0,stepD)                           (SW,stepD)
                //     |                                    |
                //  (0,SH)─────── curved apron ──────────(SW,SH)

                let d;
                if (apron && hasUSRecess) {
                  d = [
                    `M 0,${stepD}`,           // SR wing outer US corner
                    `L ${cx1},${stepD}`,      // SR wing inner corner
                    `L ${cx1},0`,             // center recess SR corner (deepest US)
                    `L ${cx2},0`,             // center recess SL corner
                    `L ${cx2},${stepD}`,      // SL wing inner corner
                    `L ${SW},${stepD}`,       // SL wing outer US corner
                    `L ${SW},${SH}`,          // SL plasterline corner
                    `A ${aR},${aR} 0 0,1 0,${SH}`, // curved apron toward audience
                    `Z`
                  ].join(" ");
                } else if (apron) {
                  d = [
                    `M 0,0 L ${SW},0 L ${SW},${SH}`,
                    `A ${aR},${aR} 0 0,1 0,${SH} Z`
                  ].join(" ");
                } else if (hasUSRecess) {
                  d = [
                    `M 0,${stepD} L ${cx1},${stepD} L ${cx1},0`,
                    `L ${cx2},0 L ${cx2},${stepD} L ${SW},${stepD}`,
                    `L ${SW},${SH} L 0,${SH} Z`
                  ].join(" ");
                } else {
                  d = `M 0,0 L ${SW},0 L ${SW},${SH} L 0,${SH} Z`;
                }

                // Wing fill (different shade to show step)
                const wingD = hasUSRecess ? [
                  `M 0,${stepD} L ${cx1},${stepD} L ${cx1},${SH} L 0,${SH} Z`,
                  `M ${cx2},${stepD} L ${SW},${stepD} L ${SW},${SH} L ${cx2},${SH} Z`,
                ].join(" ") : null;

                return (
                  <g>
                    {/* Stage fill */}
                    <path d={d} fill={COLORS.stage} stroke="none"/>

                    {/* Wing areas — slightly lighter to show the US step */}
                    {hasUSRecess && wingD && (
                      <path d={wingD} fill="#303020" stroke="none"/>
                    )}

                    {/* Stage outline */}
                    <path d={d} fill="none" stroke={COLORS.stageEdge} strokeWidth={3} strokeLinejoin="round"/>

                    {/* US step line across wings (shows the step edge) */}
                    {hasUSRecess && (
                      <>
                        <line x1={0} y1={stepD} x2={cx1} y2={stepD}
                          stroke={COLORS.stageEdge} strokeWidth={1.5} opacity={0.6}/>
                        <line x1={cx2} y1={stepD} x2={SW} y2={stepD}
                          stroke={COLORS.stageEdge} strokeWidth={1.5} opacity={0.6}/>
                      </>
                    )}

                    {/* Grid clipped to stage shape */}
                    <clipPath id="stageClip">
                      <path d={d}/>
                    </clipPath>
                    <g clipPath="url(#stageClip)">
                      {gridLines}
                    </g>

                    {/* Plasterline — dashed across DS edge of main deck */}
                    <line x1={0} y1={SH} x2={SW} y2={SH}
                      stroke={COLORS.stageEdge} strokeWidth={2} strokeDasharray="12,6" opacity={0.9}/>

                    {/* Apron arc edge */}
                    {apron && (
                      <path d={`M 0,${SH} A ${aR},${aR} 0 0,0 ${SW},${SH}`}
                        fill="none" stroke={COLORS.stageEdge} strokeWidth={2.5}/>
                    )}

                    {/* Dimension annotations */}
                    {apron && (
                      <g opacity={0.4}>
                        <line x1={SW/2} y1={SH} x2={SW/2} y2={SH+aD}
                          stroke={COLORS.stageEdge} strokeWidth={1} strokeDasharray="4,3"/>
                        <text x={SW/2+6} y={SH+aD/2+4}
                          fill={COLORS.stageEdge} fontSize={9} textAnchor="start">
                          {(venue.apronDepth||4.833).toFixed(2)}'
                        </text>
                      </g>
                    )}
                    {hasUSRecess && (
                      <g opacity={0.4}>
                        <line x1={SW/2} y1={0} x2={SW/2} y2={stepD}
                          stroke={COLORS.stageEdge} strokeWidth={1} strokeDasharray="4,3"/>
                        <text x={SW/2+6} y={stepD/2+4}
                          fill={COLORS.stageEdge} fontSize={9} textAnchor="start">
                          {(venue.notchD||4.5).toFixed(1)}'
                        </text>
                        <text x={SW/2} y={stepD/2-6}
                          fill={COLORS.stageEdge} fontSize={8} textAnchor="middle" opacity={0.7}>
                          ← {(venue.notchW||13.875).toFixed(1)}' →
                        </text>
                      </g>
                    )}

                    {/* Center line */}
                    <line x1={SW/2} y1={0} x2={SW/2} y2={SH}
                      stroke={COLORS.stageEdge} strokeWidth={1} strokeDasharray="6,4" opacity={0.3}/>

                    {measureLabels}

                    <text x={SW/2} y={SH/2+(hasUSRecess?stepD/2:0)} fill={COLORS.stageEdge}
                      fontSize={18} textAnchor="middle" dominantBaseline="middle"
                      opacity={0.2} letterSpacing={3}>STAGE FLOOR</text>
                    <text x={SW/2} y={SH/2+(hasUSRecess?stepD/2:0)+22} fill={COLORS.stageEdge}
                      fontSize={11} textAnchor="middle" dominantBaseline="middle" opacity={0.14}>
                      {stageW}' × {stageH}'
                    </text>

                    <text x={SW/2} y={SH+(apron?aD:0)+22} fill={COLORS.stageEdge} fontSize={10} textAnchor="middle" opacity={0.5}>▲ DOWNSTAGE / AUDIENCE</text>
                    <text x={SW/2} y={-20} fill={COLORS.stageEdge} fontSize={10} textAnchor="middle" opacity={0.5}>UPSTAGE ▼</text>
                    <text x={-22} y={SH/2} fill={COLORS.stageEdge} fontSize={10} textAnchor="middle" opacity={0.5} transform={`rotate(-90,-22,${SH/2})`}>SR →</text>
                    <text x={SW+22} y={SH/2} fill={COLORS.stageEdge} fontSize={10} textAnchor="middle" opacity={0.5} transform={`rotate(90,${SW+22},${SH/2})`}>← SL</text>
                  </g>
                );
              })()}

              {/* Render elements — set/soft goods first, then lighting on top */}
              {[...elements].filter(e=>e.category!=="lighting").reverse().map(renderEl)}
              {[...elements].filter(e=>e.category==="lighting").reverse().map(renderEl)}

              {/* Wall preview */}
              {drawingWall && <line x1={drawingWall.x1} y1={drawingWall.y1} x2={drawingWall.x2} y2={drawingWall.y2}
                stroke={COLORS.accent} strokeWidth={4} strokeLinecap="round" strokeDasharray="8,4" opacity={0.7}/>}
              {/* Batten preview */}
              {drawingBatten && <>
                <line x1={drawingBatten.x1} y1={drawingBatten.y1} x2={drawingBatten.x2} y2={drawingBatten.y2}
                  stroke={COLORS.batten} strokeWidth={3} strokeLinecap="round" strokeDasharray="8,4" opacity={0.8}/>
                <text x={(drawingBatten.x1+drawingBatten.x2)/2} y={drawingBatten.y1-10} fill={COLORS.batten} fontSize={10} textAnchor="middle">
                  {(Math.hypot(drawingBatten.x2-drawingBatten.x1,drawingBatten.y2-drawingBatten.y1)/GRID).toFixed(1)}'
                </text>
              </>}
            </g>
          </svg>
          {/* Hints */}
          <div style={{ position:"absolute", bottom:8, left:8, fontSize:9, color:COLORS.textDim, background:"rgba(22,33,62,0.9)", padding:"4px 8px", borderRadius:4, lineHeight:1.8 }}>
            S=Select · W=Wall · B=Batten · D=Delete · P=Pan · L=Label · Del=Remove · Arrows=Nudge · Scroll=Zoom
          </div>
          {/* Zoom level */}
          <div style={{ position:"absolute", bottom:8, right:8, fontSize:9, color:COLORS.textDim, background:"rgba(22,33,62,0.9)", padding:"4px 8px", borderRadius:4 }}>
            {Math.round(zoom*100)}% · {stageW}'×{stageH}' stage
          </div>
        </div>

        {/* ── right rail: channel list ── */}
        {lightingEls.length > 0 && (
          <div style={{ width:155, background:COLORS.panel, borderLeft:`1px solid ${COLORS.border}`, overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"8px 10px 4px", fontSize:9, color:COLORS.accent, letterSpacing:1, borderBottom:`1px solid ${COLORS.border}` }}>
              CHANNELS ({lightingEls.length})
            </div>
            {lightingEls.map(el=>{
              const gel = GEL_PRESETS.find(g=>g.code===el.gelCode)||{hex:"#888"};
              return (
                <div key={el.id} onClick={()=>{setSelected(el.id);setSidebarTab("props");}}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderBottom:`1px solid ${COLORS.border}`, cursor:"pointer", background:selected===el.id?COLORS.bg:"transparent" }}
                  onMouseEnter={e=>e.currentTarget.style.background=COLORS.bg}
                  onMouseLeave={e=>e.currentTarget.style.background=selected===el.id?COLORS.bg:"transparent"}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:gel.hex, border:"1px solid #555", flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:COLORS.accent, fontWeight:"bold" }}>Ch {el.channel}</div>
                    <div style={{ fontSize:9, color:COLORS.textDim, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{el.label}</div>
                    {el.gelCode && el.gelCode !== "Open" && <div style={{ fontSize:8, color:COLORS.textDim }}>{el.gelCode}</div>}
                  </div>
                </div>
              );
            })}
            {battens.length > 0 && (
              <>
                <div style={{ padding:"8px 10px 4px", fontSize:9, color:COLORS.batten, letterSpacing:1, borderBottom:`1px solid ${COLORS.border}`, marginTop:4 }}>
                  BATTENS ({battens.length})
                </div>
                {battens.map(b=>(
                  <div key={b.id} onClick={()=>{setSelected(b.id);setSidebarTab("props");}}
                    style={{ padding:"5px 10px", borderBottom:`1px solid ${COLORS.border}`, cursor:"pointer", background:selected===b.id?COLORS.bg:"transparent" }}
                    onMouseEnter={e=>e.currentTarget.style.background=COLORS.bg}
                    onMouseLeave={e=>e.currentTarget.style.background=selected===b.id?COLORS.bg:"transparent"}>
                    <div style={{ fontSize:10, color:COLORS.batten }}>{b.label}</div>
                    <div style={{ fontSize:8, color:COLORS.textDim }}>{((b.x2-b.x1)/GRID).toFixed(1)}' wide</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
