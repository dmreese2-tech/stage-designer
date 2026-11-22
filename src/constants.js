// constants.js — shared constants and definitions for Stage Designer (Upstage Systems).
// Colours, type and spacing come from the Upstage Systems design system, dark theme (tokens.json).
export const BRAND = { name: "Upstage Systems", product: "Stage Designer", domain: "apps.upstage.systems" };
export const FONT_UI = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";          // body
export const FONT_DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";                            // headings, buttons, labels (uppercase)
export const FONT_MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace"; // cue numbers, IDs, data
export const GRID = 20;

export const COLORS = {
  bg: "#0B0E11", panel: "#181D24", border: "#2A323C",          // bg, surface, border
  accent: "#E8A33D", accentDim: "#5A4426", onAccent: "#0B0E11", // amber: primary action; text on amber
  stage: "#2a2a1a", stageEdge: "#5a5a3a",
  text: "#EDEFF2", textDim: "#8A94A3",
  grid: "#5B7A8C", selected: "#00A8E8", hover: "#5BC4EE",      // blueprint; signal blue = the live / selected item
  batten: "#5B7A8C",
};

// Standard Rosco gel colors (abbreviated)
export const GEL_PRESETS = [
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

export const FIXTURE_DEFS = {
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

export const BATTEN_DEFS = {
  batten: { label: "Batten / Pipe", color: "#4a6a8a" },
};

export const SET_DEFS = {
  flat:      { label:"Flat",          color:"#8b7355", w:4,   h:80  },
  door_flat: { label:"Door Flat",     color:"#7a6245", w:4,   h:80  },
  platform:  { label:"Platform",      color:"#6b5e45", w:60,  h:40  },
  // Stock sizes: placed as the base type (so the Build dialog sees a normal flat / platform) at a standard size
  flat_2:        { base:"flat",      label:"Flat 2'×8'",           color:"#8b7355", w:4,   h:40  },
  flat_3:        { base:"flat",      label:"Flat 3'×8'",           color:"#8b7355", w:4,   h:60  },
  door_flat_6:   { base:"door_flat", label:"Door Flat 6'×8'",      color:"#7a6245", w:4,   h:120 },
  platform_4x8:  { base:"platform",  label:"Platform 4'×8' @ 24\"", color:"#6b5e45", w:160, h:80,  elevation:24 },
  platform_4x8_12: { base:"platform", label:"Platform 4'×8' @ 12\"", color:"#6b5e45", w:160, h:80, elevation:12 },
  platform_4x4:  { base:"platform",  label:"Platform 4'×4' @ 24\"", color:"#6b5e45", w:80,  h:80,  elevation:24 },
  tri_platform: { label:"Triangle Platform", color:"#6b5e45", w:80, h:80, shape:"triangle" },
  chair:     { label:"Chair",         color:"#5a4f3a", w:24,  h:24  },
  table:     { label:"Table",         color:"#6b5a3a", w:60,  h:30  },
  round_table: { label:"Round Table", color:"#6b5a3a", w:60,  h:60,  shape:"circle" },
  stool:     { label:"Stool",         color:"#5a4f3a", w:24,  h:24,  shape:"circle" },
  sofa:      { label:"Sofa",          color:"#5a4a4a", w:80,  h:32  },
  bed:       { label:"Bed",           color:"#4a4a5a", w:60,  h:80  },
  door:      { label:"Door (swing)",  color:"#8a7060", w:36,  h:4   },
  window:    { label:"Window",        color:"#6080a0", w:48,  h:4   },
  backdrop:  { label:"Backdrop",      color:"#2a3a4a", w:200, h:4   },
  leg_drape: { label:"Leg Curtain",   color:"#1a1a2a", w:8,   h:120, layer:"softgoods" },
  traveler:  { label:"Traveler Curtain", color:"#5a1f2a", w:240, h:8, shape:"traveler", layer:"softgoods" },
  scrim:     { label:"Scrim",         color:"#3a4a5a", w:200, h:4   },
  curved_flat: { label:"Curved Flat", color:"#8b7355", w:160, h:40, shape:"arc" },   // w = chord, h = curve depth; bulges toward the top edge
  column:    { label:"Column (round)", color:"#a09080", w:40, h:40, shape:"circle" },
  arch_flat: { label:"Arch Flat",     color:"#7a6245", w:4,   h:120 },
  stairs:    { label:"Stairs",        color:"#7a6a4a", w:40,  h:40  },
  podium:    { label:"Podium",        color:"#6a5a4a", w:30,  h:30  },
};

export const TOOLS = [
  { id:"select",  icon:"↖",  label:"Select (S)"   },
  { id:"pan",     icon:"", label:"Pan (P)"      },
  { id:"wall",    icon:"▬",  label:"Draw Wall (W)" },
  { id:"batten",  icon:"═",  label:"Add Batten (B)"},
  { id:"label",   icon:"T",  label:"Text Label (L)"},
  { id:"pin",     icon:"", label:"Comment pin (C)" },
  { id:"delete",  icon:"✕",  label:"Delete (D)"   },
];

export const LAYERS = [
  { id:"lighting",   label:"Lighting",   color:"#ffdd44" },
  { id:"battens",    label:"═  Battens",    color:"#4a6a8a" },
  { id:"set",        label:"Set",         color:"#8b7355" },
  { id:"softgoods",  label:"Soft Goods",  color:"#2a3a4a" },
  { id:"practicals", label:"Practicals",  color:"#ff8844" },
  { id:"notes",      label:"Notes",       color:"#88cc88" },
];

// ── Venue configuration presets ───────────────────────────────────────────────
export const VENUE_CONFIGS = {
  burgdorff: {
    label: "Burgdorff Center",
    icon: "",
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
    icon: "",
    desc: "Traditional stage with arch, audience faces one direction",
    stageW: 50, stageH: 30,
    roomW: 60, roomH: 70,
    stageOffX: 5, stageOffY: 5,
    audience: [{ x:5, y:37, w:50, h:28, label:"House", seats:400 }],
    config: "proscenium",
  },
  thrust: {
    label: "Thrust",
    icon: "",
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
    icon: "",
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

export const DEFAULT_VENUE = {
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


export const MOUNTS = [["batten", "Batten / pipe"], ["boom", "Boom / ladder"], ["foh", "FOH position"], ["floor", "Floor / base"], ["wall", "Wall / tower"]];
