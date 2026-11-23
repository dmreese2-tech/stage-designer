import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { VenuePicker } from "./VenuePicker.jsx";
import ConstructionModal from "./ConstructionModal.jsx";
import { loadShop, mergeShop } from "./construction.js";
import logoHorizontal from "./assets/logos/lockup-horizontal-on-dark.svg";
import logoMark from "./assets/logos/mark-on-dark.svg";
import { Icon, useViewport, MenuButton, Sheet, AskText, ctl, ghost, primary } from "./layout.jsx";
import { GRID, COLORS, GEL_PRESETS, FIXTURE_DEFS, BATTEN_DEFS, SET_DEFS, TOOLS, LAYERS, VENUE_CONFIGS, DEFAULT_VENUE, FONT_UI, FONT_DISPLAY, FONT_MONO } from "./constants.js";
import { parseFtIn } from "./units.js";
import { FixtureSVG, SetPieceSVG, BattenSVG, TextLabelSVG, PinSVG } from "./renderers.jsx";
import { generateInstrumentSchedulePDF, generateDesignPDF } from "./pdf.js";
import { Btn } from "./ui.jsx";
import { VenueEditorModal } from "./VenueEditorModal.jsx";
import { ProjectInfoModal, ScheduleModal } from "./modals.jsx";
import { UnderlayPanel, GroupPanel, PropsPanel, elBounds } from "./panels.jsx";
import NotesModal from "./NotesModal.jsx";
import CompareModal from "./CompareModal.jsx";
import LightingModal from "./LightingModal.jsx";
import ScenesView from "./ScenesView.jsx";
import { syncScene, applyScene, newSceneId, nextSceneLabel, sceneTitle, capturePose, isMoving } from "./scenes.js";
import { zlibSync, unzlibSync, strToU8, strFromU8 } from "fflate";
const View3D = lazy(() => import("./View3D.jsx"));   // three.js loads only when the 3D view is opened

// ── Stage Designer — main app. Supporting pieces live in the sibling modules imported above. ──
let SNAP = GRID;   // current snap step in px (set from the Snap control); 0 = off
const snap = (v) => (SNAP > 0 ? Math.round(v / SNAP) * SNAP : v);
let _id = 1;
const uid = () => `el_${_id++}`;

// ── Autosave (browser storage) ───────────────────────────────────────────────
const AUTOSAVE_KEY = "sd_autosave_v1";
const MODEL_VERSION = 3;
function loadAutosave() {
  try { const d = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)); return d && typeof d === "object" ? d : null; } catch { return null; }
}
// Older files (version 1–2) are brought up to the v3 model: lighting gets a mount, set pieces an elevation.
function migrateElements(list) {
  return (Array.isArray(list) ? list : []).map((el) => {
    if (!el || typeof el !== "object") return el;
    if (el.category === "lighting" && el.mount === undefined) return { ...el, mount: "batten" };
    if (el.category === "set" && el.elevation === undefined && el.x1 === undefined) return { ...el, elevation: 0 };
    return el;
  });
}
// ── Share links: the whole plan is compressed into the URL hash (#share=…), no server involved ──
const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const SHARED = (() => { try { const m = location.hash.match(/^#share=(.+)$/); return m ? JSON.parse(strFromU8(unzlibSync(fromB64u(m[1])))) : null; } catch { return null; } })();
const _auto = (() => { const d = SHARED || loadAutosave(); if (d?.elements) d.elements = migrateElements(d.elements); return d; })();
if (_auto?.elements?.length) _id = Math.max(_id, ..._auto.elements.map((e) => parseInt(String(e.id).replace("el_", "")) || 0)) + 1;

// ── Main app ──────────────────────────────────────────────────────────────────
export default function StageDesigner() {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const [elements, setElementsRaw] = useState(() => _auto?.elements ?? []);
  // ── undo / redo ───────────────────────────────────────────────────────────
  // Every change to the plan goes through setElements, which records the previous plan. Quick bursts of
  // changes (dragging, typing, nudging) merge into one step; each new pointer press starts a new step.
  const elementsRef = useRef(elements); elementsRef.current = elements;
  const histRef = useRef({ past:[], future:[], last:0, force:true, down:false });
  const [histCount, setHistCount] = useState({ u:0, r:0 });
  const syncHist = () => setHistCount({ u:histRef.current.past.length, r:histRef.current.future.length });
  const setElements = useCallback((upd) => {
    const prev = elementsRef.current;
    const next = typeof upd === "function" ? upd(prev) : upd;
    if (next === prev) return;
    const h = histRef.current, now = Date.now();
    if (h.force || (!h.down && now - h.last > 700)) { h.past.push(prev); if (h.past.length > 150) h.past.shift(); }
    h.force = false; h.last = now; h.future = [];
    elementsRef.current = next; setElementsRaw(next); syncHist();
  }, []);
  // replace the whole plan without it being an undo step (import, new project)
  const loadElements = useCallback((list) => {
    const h = histRef.current; h.past = []; h.future = []; h.force = true;
    elementsRef.current = list; setElementsRaw(list); syncHist();
  }, []);
  useEffect(() => {
    const down = () => { histRef.current.force = true; histRef.current.down = true; };
    const up = () => { histRef.current.down = false; histRef.current.last = Date.now(); };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    return () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("pointerup", up, true); window.removeEventListener("pointercancel", up, true); };
  }, []);
  const [selected, setSelectedRaw] = useState(null);   // the one selected element (drives the Props panel)
  const [multiSel, setMultiSel] = useState([]);          // ids of a group selection (2 or more)
  const [marquee, setMarquee] = useState(null);          // rubber-band box while drag-selecting
  // Any single-select clears the group, so the two can never disagree
  const setSelected = useCallback((id) => { setSelectedRaw(id); setMultiSel([]); }, []);
  const setGroup = useCallback((ids) => {
    if (ids.length > 1) { setSelectedRaw(null); setMultiSel(ids); }
    else { setSelectedRaw(ids[0] ?? null); setMultiSel([]); }
  }, []);
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
  const [stageW, setStageW] = useState(_auto?.stageW ?? 35.5); // Burgdorff: 35'6" wide
  const [stageH, setStageH] = useState(_auto?.stageH ?? 26.5); // Burgdorff: 26'6" deep
  const [sidebarTab, setSidebarTab] = useState("elements");
  const vp = useViewport();                                  // "phone" | "tablet" | "desktop"
  const [panelMode, setPanelMode] = useState(null);          // tablet / phone inspector sheet: null | "peek" | "open"
  const [showLibrary, setShowLibrary] = useState(false);     // tablet / phone Add-to-plot sheet
  const [ask, setAsk] = useState(null);                      // in-app text dialog, replaces window.prompt
  const [showKeys, setShowKeys] = useState(false);
  const [hoverId, setHoverId] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [numberPieces, setNumberPieces] = useState(true);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [showVenueEditor, setShowVenueEditor] = useState(false);
  const [showVenuePicker, setShowVenuePicker] = useState(!_auto);   // a brand-new plan asks which venue it is for
  const [projectInfo, setProjectInfo] = useState(_auto?.projectInfo ?? { title:"", venue:"Apron Stage", designer:"", director:"", revision:"1" });
  const [venue, setVenue] = useState(_auto?.venue ?? { ...DEFAULT_VENUE });
  const [snapStep, setSnapStep] = useState(() => { const v = +localStorage.getItem("sd_snap"); return [0, GRID, GRID/2, GRID/12].includes(v) && localStorage.getItem("sd_snap") !== null ? v : GRID; });
  SNAP = snapStep;
  const [layerLocked, setLayerLocked] = useState(_auto?.layerLocked ?? {});
  const [scenes, setScenes] = useState(_auto?.scenes ?? []);                    // one layout per scene; only Moving pieces differ
  const [activeSceneId, setActiveSceneId] = useState(_auto?.activeSceneId ?? _auto?.scenes?.[0]?.id ?? null);
  const [showScenes, setShowScenes] = useState(false);
  const [underlay, setUnderlay] = useState(_auto?.underlay ?? null);   // ground-plan image behind the stage
  const [calib, setCalib] = useState(null);                            // { pts:[{x,y}] } while calibrating the underlay scale
  const [showBuild, setShowBuild] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showLighting, setShowLighting] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [sharedMode, setSharedMode] = useState(!!SHARED);   // opened from a share link: edits are not saved over this browser's own plan
  const [shop, setShop] = useState(loadShop);
  const [savedAt, setSavedAt] = useState(null);
  const [saveNote, setSaveNote] = useState("");
  const [labelText, setLabelText] = useState("");
  const [placingLabel, setPlacingLabel] = useState(false);

  const dropMissingSelection = (list) => {
    const ids = new Set(list.map(e => e.id));
    if (selected && !ids.has(selected)) setSelected(null);
    if (multiSel.length) setGroup(multiSel.filter(i => ids.has(i)));
  };
  const undo = useCallback(() => {
    const h = histRef.current; if (!h.past.length) return;
    const prev = h.past.pop(); h.future.push(elementsRef.current); h.force = true;
    elementsRef.current = prev; setElementsRaw(prev); syncHist(); dropMissingSelection(prev);
  }, [selected, multiSel]);
  const redo = useCallback(() => {
    const h = histRef.current; if (!h.future.length) return;
    const nxt = h.future.pop(); h.past.push(elementsRef.current); h.force = true;
    elementsRef.current = nxt; setElementsRaw(nxt); syncHist(); dropMissingSelection(nxt);
  }, [selected, multiSel]);

  // ── autosave to this browser ──────────────────────────────────────────────
  useEffect(() => {
    if (sharedMode) return;
    const t = setTimeout(() => {
      const base = { version:MODEL_VERSION, savedAt:Date.now(), projectInfo, stageW, stageH, venue, elements, layerLocked, scenes, activeSceneId };
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...base, underlay })); setSaveNote(""); setSavedAt(Date.now()); }
      catch {
        try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(base)); setSaveNote(underlay ? "Underlay image is too large to autosave" : ""); setSavedAt(Date.now()); }
        catch { setSaveNote("Autosave failed (browser storage full)"); }
      }
    }, 800);
    return () => clearTimeout(t);
  }, [elements, projectInfo, stageW, stageH, venue, layerLocked, underlay, sharedMode, scenes, activeSceneId]);
  useEffect(() => { try { localStorage.setItem("sd_snap", String(snapStep)); } catch {} }, [snapStep]);

  const newProject = () => {
    if (!window.confirm("Start a new project? The current plan will be cleared. Export JSON first if you want to keep it.")) return;
    loadElements([]); setSelected(null); setUnderlay(null); setLayerLocked({}); setScenes([]); setActiveSceneId(null);
    setProjectInfo({ title:"", venue:"Apron Stage", designer:"", director:"", revision:"1" });
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
    setShowVenuePicker(true);
  };

  const selEl = elements.find(e => e.id === selected);
  const selIds = multiSel.length > 1 ? multiSel : selected ? [selected] : [];   // everything currently selected
  const toggleSel = useCallback((id) => {
    setGroup(selIds.includes(id) ? selIds.filter(i => i !== id) : [...selIds, id]);
  }, [selIds, setGroup]);

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
      id: uid(), type: defObj.base || type, category,
      layer: category === "lighting" ? "lighting" : (defObj.layer || activeLayer),
      x: snap(cx), y: snap(cy),
      rotation: 0, color: defObj.color,
      label: defObj.label,
      channel: category === "lighting"
        ? Math.max(0, ...elements.filter(e=>e.category==="lighting").map(e=>e.channel||0))+1
        : undefined,
      dimmer: "", focusAngle: 45, focused: false,
      gelCode: "Open", notes: "",
      w: defObj.w, h: defObj.h,
      elevation: defObj.elevation || 0,
      ...(category === "lighting" ? { mount: "batten" } : {}),
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
    if (calib) {                                   // picking the two reference points for the underlay scale
      const cp = svgPt(e.clientX, e.clientY);
      const pts = [...calib.pts, { x:cp.x, y:cp.y }];
      if (pts.length < 2) { setCalib({ pts }); return; }
      setCalib(null);
      const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      setAsk({ title:"Real distance between the two points? (e.g. 24'6\" or 24.5)", value:"", onOk:(ans)=>{
        const ft = parseFtIn(ans);
        if (!ft || ft <= 0 || d < 1) return;
        const k = (ft * GRID) / d, o = pts[0];
        setUnderlay(u => u && ({ ...u, w:u.w*k, h:u.h*k, x:o.x - (o.x - u.x)*k, y:o.y - (o.y - u.y)*k }));
      }});
      return;
    }
    // one finger on empty canvas pans (Apple Pencil / mouse still draws a selection box)
    if (e.pointerType === "touch" && tool === "select") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
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
    if (tool === "pin") {
      const px = snap(pt.x), py = snap(pt.y);
      setAsk({ title:"Comment", value:"", onOk:(text)=>{
        if (!text) return;
        const el = { id: uid(), type:"pin", category:"notes", layer:"notes", x: px, y: py, label: text, author: projectInfo.designer || "", created: Date.now(), resolved: false,
          n: Math.max(0, ...elementsRef.current.filter(e=>e.type==="pin").map(e=>e.n||0)) + 1 };
        setElements(prev => [...prev, el]);
        setSelected(el.id); setSidebarTab("props"); setTool("select");
      }, onCancel:()=>setTool("select") });
      return;
    }
    if (tool === "label") {
      const px = snap(pt.x), py = snap(pt.y);
      setAsk({ title:"Label text", value:"Label", onOk:(text)=>{
        if (!text) return;
        const el = {
          id: uid(), type:"textlabel", category:"notes", layer:"notes",
          x: px, y: py, label: text, color: COLORS.text, fontSize: 14,
        };
        setElements(prev => [...prev, el]);
        setSelected(el.id);
        setTool("select");
      }, onCancel:()=>setTool("select") });
      return;
    }
    if (tool === "select") {
      // start a rubber-band box; releasing without dragging just clears the selection
      setMarquee({ x1:pt.x, y1:pt.y, x2:pt.x, y2:pt.y, add:e.shiftKey });
    }
  }, [tool, pan, svgPt, calib]);

  const onPointerMove = useCallback((e) => {
    if (isPanning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return;
    }
    if (marquee) {
      const mp = svgPt(e.clientX, e.clientY);
      setMarquee(m => m && { ...m, x2:mp.x, y2:mp.y });
      return;
    }
    if (dragging) {
      const pt = svgPt(e.clientX, e.clientY);
      if (dragging.group) {
        // move every selected element by the same grid-snapped offset
        const dx = snap(pt.x - dragging.sx), dy = snap(pt.y - dragging.sy);
        setElements(prev => prev.map(el => {
          const o = dragging.orig[el.id];
          if (!o) return el;
          return o.x1 !== undefined
            ? { ...el, x1:o.x1+dx, y1:o.y1+dy, x2:o.x2+dx, y2:o.y2+dy }
            : { ...el, x:o.x+dx, y:o.y+dy };
        }));
        return;
      }
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
  }, [isPanning, panStart, dragging, marquee, drawingWall, wallStart, drawingBatten, battenStart, svgPt]);

  const onPointerUp = useCallback((e) => {
    setIsPanning(false); setPanStart(null);
    if (marquee) {
      const m = marquee;
      setMarquee(null);
      const l = Math.min(m.x1,m.x2), r = Math.max(m.x1,m.x2), t = Math.min(m.y1,m.y2), b = Math.max(m.y1,m.y2);
      if ((r - l) < 4/zoom && (b - t) < 4/zoom) { if (!m.add) setSelected(null); return; }   // a click, not a drag
      const hits = elements
        .filter(el => layerVis[el.layer] && !layerLocked[el.layer])
        .filter(el => { const bb = elBounds(el); return bb.r >= l && bb.l <= r && bb.b >= t && bb.t <= b; })
        .map(el => el.id);
      setGroup([...new Set([...(m.add ? selIds : []), ...hits])]);
      if (hits.length && sidebarTab !== "props") setSidebarTab("props");
      return;
    }
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
  }, [dragging, marquee, zoom, layerVis, layerLocked, selIds, setGroup, sidebarTab, drawingWall, wallStart, drawingBatten, battenStart, activeLayer, elements]);

  // begin dragging the whole group; remembers where each member started
  const startGroupDrag = useCallback((e, ids) => {
    const pt = svgPt(e.clientX, e.clientY);
    const orig = {};
    elements.forEach(x => { if (ids.includes(x.id)) orig[x.id] = { x:x.x, y:x.y, x1:x.x1, y1:x.y1, x2:x.x2, y2:x.y2 }; });
    setDragging({ group:true, id:null, sx:pt.x, sy:pt.y, orig });
  }, [elements, svgPt]);

  const onElementDown = useCallback((e, el) => {
    if (layerLocked[el.layer] && (tool === "select" || tool === "delete")) return;   // locked: click falls through to the canvas
    e.stopPropagation();
    if (tool === "delete") {
      setElements(prev => prev.filter(x => x.id !== el.id));
      setSelected(null); return;
    }
    if (tool === "select" && e.shiftKey) {            // Shift+click adds / removes from the selection
      toggleSel(el.id);
      if (sidebarTab !== "props") setSidebarTab("props");
      return;
    }
    if (tool === "select" && selIds.length > 1 && selIds.includes(el.id)) {   // grab the group
      startGroupDrag(e, selIds);
      return;
    }
    if (tool === "select") {
      setSelected(el.id);
      if (sidebarTab !== "props") setSidebarTab("props");
      if (!["wall","batten"].includes(el.type)) {
        const pt = svgPt(e.clientX, e.clientY);
        setDragging({ id: el.id, ox: pt.x - el.x, oy: pt.y - el.y });
      }
    }
  }, [tool, svgPt, sidebarTab, selIds, toggleSel, startGroupDrag, layerLocked]);

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

  // two-finger pinch to zoom and drag to pan (touch screens / iPad)
  const viewRef = useRef({ zoom, pan }); viewRef.current = { zoom, pan };
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    let g = null;
    const pts = (ev) => { const r = el.getBoundingClientRect(), a = ev.touches[0], b = ev.touches[1];
      return { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1, mx: (a.clientX + b.clientX) / 2 - r.left, my: (a.clientY + b.clientY) / 2 - r.top }; };
    const start = (ev) => {
      if (ev.touches.length !== 2) return;
      const p = pts(ev), v = viewRef.current;
      g = { ...p, z0: v.zoom, pan0: v.pan, wx: (p.mx - v.pan.x) / v.zoom, wy: (p.my - v.pan.y) / v.zoom };
      setDragging(null); setMarquee(null); setIsPanning(false); setPanStart(null);   // drop whatever the first finger began
      setDrawingWall(null); setWallStart(null); setDrawingBatten(null); setBattenStart(null);
      ev.preventDefault();
    };
    const move = (ev) => {
      if (!g || ev.touches.length !== 2) return;
      const p = pts(ev), z = Math.min(4, Math.max(0.15, g.z0 * p.d / g.d));
      setZoom(z); setPan({ x: p.mx - g.wx * z, y: p.my - g.wy * z });
      ev.preventDefault();
    };
    const end = (ev) => { if (ev.touches.length < 2) g = null; };
    el.addEventListener("touchstart", start, { passive:false });
    el.addEventListener("touchmove", move, { passive:false });
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, []);

  // ── align / distribute the selected group ─────────────────────────────────
  const shiftEl = (el, dx, dy) => el.x1 !== undefined ? { ...el, x1:el.x1+dx, y1:el.y1+dy, x2:el.x2+dx, y2:el.y2+dy } : { ...el, x:(el.x||0)+dx, y:(el.y||0)+dy };
  const alignSel = (mode) => setElements(prev => {
    const sel = prev.filter(e => selIds.includes(e.id) && !layerLocked[e.layer]);
    if (sel.length < 2) return prev;
    const bb = {}; sel.forEach(e => { bb[e.id] = elBounds(e); });
    const L = Math.min(...sel.map(e => bb[e.id].l)), R = Math.max(...sel.map(e => bb[e.id].r));
    const T = Math.min(...sel.map(e => bb[e.id].t)), B = Math.max(...sel.map(e => bb[e.id].b));
    return prev.map(e => {
      const b = bb[e.id]; if (!b) return e;
      const dx = mode==="left" ? L-b.l : mode==="right" ? R-b.r : mode==="hcenter" ? (L+R)/2-(b.l+b.r)/2 : 0;
      const dy = mode==="top" ? T-b.t : mode==="bottom" ? B-b.b : mode==="vcenter" ? (T+B)/2-(b.t+b.b)/2 : 0;
      return dx||dy ? shiftEl(e, dx, dy) : e;
    });
  });
  const distributeSel = (axis) => setElements(prev => {
    const sel = prev.filter(e => selIds.includes(e.id) && !layerLocked[e.layer]);
    if (sel.length < 3) return prev;
    const c = (e) => { const b = elBounds(e); return axis==="x" ? (b.l+b.r)/2 : (b.t+b.b)/2; };
    const order = [...sel].sort((a, b) => c(a) - c(b));
    const first = c(order[0]), last = c(order[order.length-1]), step = (last - first) / (order.length - 1);
    const target = {}; order.forEach((e, i) => { target[e.id] = first + step * i - c(e); });
    return prev.map(e => target[e.id] ? (axis==="x" ? shiftEl(e, target[e.id], 0) : shiftEl(e, 0, target[e.id])) : e);
  });

  // ── update element ────────────────────────────────────────────────────────
  const updateEl = (key, val) => setElements(prev => prev.map(e => e.id === selected ? { ...e, [key]: val } : e));

  // ── z-order (stacking) ────────────────────────────────────────────────────
  // Later in the array = drawn on top. Lighting is drawn in its own pass above
  // all set pieces, so forward/backward only step past items in the same pass.
  const moveZ = useCallback((mode) => {
    if (!selIds.length) return;
    const skip = new Set(selIds);
    setElements(prev => {
      const picked = prev.filter(e => skip.has(e.id));
      if (!picked.length) return prev;
      // front / back: move the whole selection as one block, keeping its internal order
      if (mode === "front") return [...prev.filter(e => !skip.has(e.id)), ...picked];
      if (mode === "back")  return [...picked, ...prev.filter(e => !skip.has(e.id))];
      // forward / backward: step each selected item past the next unselected item of the same pass
      let arr = [...prev];
      const ids = picked.map(e => e.id);
      (mode === "forward" ? [...ids].reverse() : ids).forEach(id => {
        const i = arr.findIndex(e => e.id === id);
        if (i < 0) return;
        const isL = arr[i].category === "lighting";
        const ok = (e) => (e.category === "lighting") === isL && !skip.has(e.id);
        const next = [...arr];
        const [item] = next.splice(i, 1);
        if (mode === "forward") {
          let j = i;
          while (j < next.length && !ok(next[j])) j++;
          if (j < next.length) { next.splice(j + 1, 0, item); arr = next; }
        } else {
          let j = i - 1;
          while (j >= 0 && !ok(next[j])) j--;
          if (j >= 0) { next.splice(j, 0, item); arr = next; }
        }
      });
      return arr;
    });
  }, [selIds]);

  // ── copy / paste ──────────────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState(null);
  const [pasteCount, setPasteCount] = useState(0);

  const cloneElWithOffset = useCallback((srcEl, offset, idx = {}) => {
    const newEl = { ...srcEl, id: uid() };
    if (newEl.x1 !== undefined) {
      newEl.x1 += offset; newEl.y1 += offset; newEl.x2 += offset; newEl.y2 += offset;
    } else {
      newEl.x = (newEl.x || 0) + offset; newEl.y = (newEl.y || 0) + offset;
    }
    if (newEl.category === "lighting") {
      newEl.channel = Math.max(0, ...elements.filter(x => x.category === "lighting").map(x => x.channel || 0)) + 1 + (idx.light || 0);
    }
    if (newEl.type === "batten") {
      const battenCount = elements.filter(x => x.type === "batten").length + 1 + (idx.batten || 0);
      newEl.label = `Batten ${battenCount}`;
    } else if (newEl.label) {
      newEl.label = /\(copy\)$/.test(newEl.label) ? newEl.label : `${newEl.label} (copy)`;
    }
    return newEl;
  }, [elements]);

  // clone a list of elements; lighting channels and batten names keep counting up across the batch
  const cloneMany = useCallback((list, offset) => {
    let light = 0, bat = 0;
    return list.map(src => {
      const c = cloneElWithOffset(src, offset, { light, batten:bat });
      if (src.category === "lighting") light++;
      if (src.type === "batten") bat++;
      return c;
    });
  }, [cloneElWithOffset]);

  const copySelected = useCallback(() => {
    const list = elements.filter(x => selIds.includes(x.id));
    if (!list.length) return;
    setClipboard(list);
    setPasteCount(0);
  }, [elements, selIds]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard || !clipboard.length) return;
    const n = pasteCount + 1;
    setPasteCount(n);
    const copies = cloneMany(clipboard, GRID * n);
    setElements(prev => [...prev, ...copies]);
    setGroup(copies.map(c => c.id));
    if (sidebarTab !== "props") setSidebarTab("props");
  }, [clipboard, pasteCount, cloneMany, setGroup, sidebarTab]);

  // one-click copy+paste on the current selection (avoids relying on
  // clipboard state having updated yet, which copySelected+pasteClipboard back-to-back would)
  const duplicateSelected = useCallback(() => {
    const list = elements.filter(x => selIds.includes(x.id));
    if (!list.length) return;
    const copies = cloneMany(list, GRID);
    setElements(prev => [...prev, ...copies]);
    setGroup(copies.map(c => c.id));
    setClipboard(list);
    setPasteCount(1);
    if (sidebarTab !== "props") setSidebarTab("props");
  }, [elements, selIds, cloneMany, setGroup, sidebarTab]);


  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "Escape") { setSelected(null); setTool("select"); }
      const hasSel = selIds.length > 0;
      if ((e.key === "Delete" || e.key === "Backspace") && hasSel) {
        setElements(prev => prev.filter(x => !selIds.includes(x.id))); setSelected(null);
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { (e.shiftKey ? redo : undo)(); e.preventDefault(); return; }
      if (mod && e.key.toLowerCase() === "y") { redo(); e.preventDefault(); return; }
      if (mod && e.key.toLowerCase() === "a") {            // select everything on visible layers
        setGroup(elements.filter(x => layerVis[x.layer] && !layerLocked[x.layer]).map(x => x.id)); e.preventDefault();
      }
      if (mod && e.key.toLowerCase() === "c" && hasSel) { copySelected(); e.preventDefault(); }
      if (mod && e.key.toLowerCase() === "v" && clipboard) { pasteClipboard(); e.preventDefault(); }
      if (mod && e.key.toLowerCase() === "d" && hasSel) { duplicateSelected(); e.preventDefault(); }
      if (hasSel && !mod) {
        if (e.key === "]") { moveZ("forward"); e.preventDefault(); }
        if (e.key === "[") { moveZ("backward"); e.preventDefault(); }
        if (e.key === "}") { moveZ("front"); e.preventDefault(); }   // Shift+]
        if (e.key === "{") { moveZ("back"); e.preventDefault(); }    // Shift+[
      }
      if (!mod) {
        if (e.key === "s") setTool("select");
        if (e.key === "w") setTool("wall");
        if (e.key === "b") setTool("batten");
        if (e.key === "d") setTool("delete");
        if (e.key === "p") setTool("pan");
        if (e.key === "l") setTool("label");
        if (e.key === "c") setTool("pin");
      }
      if (hasSel && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        const d = e.shiftKey ? GRID : GRID/4;
        const dx = e.key==="ArrowLeft"?-d:e.key==="ArrowRight"?d:0;
        const dy = e.key==="ArrowUp"?-d:e.key==="ArrowDown"?d:0;
        setElements(prev=>prev.map(el=>{
          if (!selIds.includes(el.id)) return el;
          return el.x1 !== undefined
            ? { ...el, x1:el.x1+dx, y1:el.y1+dy, x2:el.x2+dx, y2:el.y2+dy }
            : { ...el, x:(el.x||0)+dx, y:(el.y||0)+dy };
        }));
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selIds, elements, layerVis, layerLocked, setGroup, setSelected, clipboard, copySelected, pasteClipboard, duplicateSelected, moveZ, undo, redo]);

  // ── JSON export / import ──────────────────────────────────────────────────
  const exportJSON = () => {
    const data = JSON.stringify({ version:MODEL_VERSION, projectInfo, stageW, stageH, venue, shop, layerLocked, underlay, scenes, activeSceneId, elements }, null, 2);
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
        if (data.elements) {
          const list = migrateElements(data.elements);
          loadElements(list); setSelected(null);
          _id = Math.max(1, ...list.map(el=>parseInt(String(el.id).replace("el_",""))||0)) + 1;
        }
        if (data.shop) setShop(mergeShop(data.shop));
        setLayerLocked(data.layerLocked || {});
        setScenes(Array.isArray(data.scenes) ? data.scenes : []); setActiveSceneId(data.activeSceneId ?? data.scenes?.[0]?.id ?? null);
        setUnderlay(data.underlay || null);
        if (data.stageW) setStageW(data.stageW);
        if (data.stageH) setStageH(data.stageH);
        if (data.projectInfo) setProjectInfo(data.projectInfo);
        if (data.venue) setVenue(data.venue);
      } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const copyShareLink = async () => {
    const data = JSON.stringify({ version:MODEL_VERSION, projectInfo, stageW, stageH, venue, shop, layerLocked, scenes, activeSceneId, elements });
    const url = location.origin + location.pathname + "#share=" + b64u(zlibSync(strToU8(data), { level:9 }));
    try { await navigator.clipboard.writeText(url); alert(`Link copied (${Math.round(url.length/1024)} KB).` + (url.length > 8000 ? "\n\nThis link is long. Some chat and email apps cut long links, so for a big plan send the JSON file instead." : "\n\nAnyone with the link sees the plan as of right now. The underlay image is not included.")); }
    catch { window.prompt("Copy this link:", url); }
  };
  const leaveShared = () => { history.replaceState(null, "", location.pathname + location.search); setSharedMode(false); };

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
    const isSel = selIds.includes(el.id);
    const isPrimary = el.id === selected;   // resize handles only for a single selection
    const isHov = el.id === hoverId;
    const hoverStyle = { cursor: tool==="delete"?"crosshair":tool==="select"?"move":"default" };

    if (el.type === "pin") {
      return (
        <g key={el.id} onPointerDown={e=>onElementDown(e,el)} onPointerEnter={()=>setHoverId(el.id)} onPointerLeave={()=>setHoverId(null)} style={{ cursor:"move" }}>
          <PinSVG el={el} selected={isSel}/>
        </g>
      );
    }
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
              if (layerLocked.battens && (tool==="select" || tool==="delete")) return;
              e.stopPropagation();
              if (tool==="delete") { setElements(p=>p.filter(x=>x.id!==el.id)); setSelected(null); return; }
              if (tool==="select" && e.shiftKey) { toggleSel(el.id); if (sidebarTab!=="props") setSidebarTab("props"); return; }
              if (tool==="select" && selIds.length>1 && selIds.includes(el.id)) { startGroupDrag(e, selIds); return; }
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
          {isPrimary && tool==="select" && (
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



  // ── panel content, shared by the desktop side panels and the tablet / phone sheets ──
  const libraryUI = (
<div style={{ flex:1, overflowY:"auto", padding:8 }}>
              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {[["set","Set"],["lighting","Lighting"],["batten","Battens"]].map(([id,lbl])=>(
                  <button key={id} onClick={()=>setActiveCat(id)}
                    style={{ flex:1, background:activeCat===id?COLORS.accentDim:"transparent", color:activeCat===id?COLORS.text:COLORS.textDim, border:`1px solid ${activeCat===id?COLORS.accent:COLORS.border}`, borderRadius:4, padding:"4px 0", cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>
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
                    if (vp!=="desktop") setShowLibrary(false);
                  }}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"11px 10px", marginBottom:4, minHeight:44, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4, cursor:"pointer", transition:"border-color 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=COLORS.accent}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=COLORS.border}>
                  <div style={{ width:14, height:activeCat==="batten"?4:14, borderRadius:activeCat==="lighting"?"50%":2, background:def.color, flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:COLORS.text }}>{def.label}</span>
                </div>
              ))}
            </div>
  );
  const layersUI = (
<div style={{ flex:1, overflowY:"auto", padding:10 }}>
              <div style={{ fontSize:9, color:COLORS.textDim, marginBottom:8 }}>LAYER VISIBILITY</div>
              {LAYERS.map(l=>(
                <div key={l.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                  <button onClick={()=>setLayerVis(v=>({...v,[l.id]:!v[l.id]}))}
                    style={{ width:18, height:18, borderRadius:3, background:layerVis[l.id]?l.color:COLORS.border, border:"none", cursor:"pointer", flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:layerVis[l.id]?COLORS.text:COLORS.textDim, flex:1 }}>{l.label}</span>
                  <button title={layerLocked[l.id]?"Locked: can't be selected or moved. Click to unlock":"Lock this layer"} onClick={()=>setLayerLocked(v=>({...v,[l.id]:!v[l.id]}))}
                    style={{ background:layerLocked[l.id]?COLORS.accentDim:"transparent", color:layerLocked[l.id]?COLORS.text:COLORS.textDim, border:`1px solid ${layerLocked[l.id]?COLORS.accent:COLORS.border}`, borderRadius:4, fontSize:11, padding:"1px 6px", cursor:"pointer" }}>{layerLocked[l.id]?"Locked":"Lock"}</button>
                </div>
              ))}
              <UnderlayPanel underlay={underlay} setUnderlay={setUnderlay} calib={calib} setCalib={setCalib} stageW={stageW} stageH={stageH}/>
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
                Open Venue Editor
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
  );
  const propsUI = (<>
{multiSel.length > 1 && (
            <GroupPanel ids={multiSel} elements={elements} moveZ={moveZ}
              onCopy={copySelected} onDuplicate={duplicateSelected} onClear={()=>setSelected(null)}
              onAlign={alignSel} onDistribute={distributeSel} onDelete={()=>{ setElements(prev=>prev.filter(x=>!multiSel.includes(x.id))); setSelected(null); }}/>
          )}
          {multiSel.length <= 1 && <PropsPanel allEls={elements} selEl={selEl} updateEl={updateEl} battens={battens} setElements={setElements} setSelected={setSelected} selected={selected} copySelected={copySelected} pasteClipboard={pasteClipboard} duplicateSelected={duplicateSelected} hasClipboard={!!clipboard} moveZ={moveZ}/>}
  </>);
  const channelsUI = lightingEls.length === 0 && battens.length === 0
    ? <div style={{ padding:16, fontSize:13, color:COLORS.textDim }}>No fixtures or battens yet. Add lighting from Add to plot.</div>
    : (
<div>
            <div style={{ padding:"8px 10px 4px", fontSize:9, color:COLORS.accent, letterSpacing:1, borderBottom:`1px solid ${COLORS.border}` }}>
              CHANNELS ({lightingEls.length})
            </div>
            {lightingEls.map(el=>{
              const gel = GEL_PRESETS.find(g=>g.code===el.gelCode)||{hex:"#888"};
              return (
                <div key={el.id} onClick={()=>{setSelected(el.id);setSidebarTab("props");}}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderBottom:`1px solid ${COLORS.border}`, cursor:"pointer", background:selIds.includes(el.id)?COLORS.bg:"transparent" }}
                  onMouseEnter={e=>e.currentTarget.style.background=COLORS.bg}
                  onMouseLeave={e=>e.currentTarget.style.background=selIds.includes(el.id)?COLORS.bg:"transparent"}>
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
                    style={{ padding:"5px 10px", borderBottom:`1px solid ${COLORS.border}`, cursor:"pointer", background:selIds.includes(b.id)?COLORS.bg:"transparent" }}
                    onMouseEnter={e=>e.currentTarget.style.background=COLORS.bg}
                    onMouseLeave={e=>e.currentTarget.style.background=selIds.includes(b.id)?COLORS.bg:"transparent"}>
                    <div style={{ fontSize:10, color:COLORS.batten }}>{b.label}</div>
                    <div style={{ fontSize:8, color:COLORS.textDim }}>{((b.x2-b.x1)/GRID).toFixed(1)}' wide</div>
                  </div>
                ))}
              </>
            )}
          </div>
    );

  // ── responsive shell ──────────────────────────────────────────────────────
  const inspTab = sidebarTab === "elements" ? "props" : sidebarTab;
  const openPins = elements.filter(e=>e.type==="pin"&&!e.resolved).length;
  useEffect(() => { if (vp !== "desktop" && selected) setPanelMode(m => m || "peek"); }, [selected, vp]);
  // ── scenes ──────────────────────────────────────────────────────────────
  useEffect(() => { if (activeSceneId) setScenes(sc => syncScene(sc, activeSceneId, elements)); }, [elements, activeSceneId]);
  const activeScene = scenes.find(sc => sc.id === activeSceneId) || null;
  const startScenes = () => {
    const first = { id:newSceneId(), act:"1", scene:"1", name:"", cue:"", crew:"", notes:"", pose:{} };
    first.pose = Object.fromEntries(elements.filter(isMoving).map(e => [e.id, capturePose(e)]));
    setScenes([first]); setActiveSceneId(first.id);
  };
  const addScene = () => {
    if (!scenes.length) return startScenes();
    const synced = syncScene(scenes, activeSceneId, elements);
    const lbl = nextSceneLabel(synced, activeSceneId);
    const sc = { id:newSceneId(), act:lbl.act, scene:lbl.scene, name:"", cue:"", crew:"", notes:"", pose:Object.fromEntries(elements.filter(isMoving).map(e => [e.id, capturePose(e)])) };
    const i = synced.findIndex(x => x.id === activeSceneId);
    const next = synced.slice(); next.splice(i + 1, 0, sc);
    setScenes(next); setActiveSceneId(sc.id);
  };
  const goScene = (id) => {
    const synced = syncScene(scenes, activeSceneId, elements), target = synced.find(x => x.id === id); if (!target) return;
    setScenes(synced); setActiveSceneId(id);
    setElements(applyScene(elementsRef.current, target));
    closeAll();
  };
  const stepScene = (d) => { const i = scenes.findIndex(x => x.id === activeSceneId), t = scenes[i + d]; if (t) goScene(t.id); };
  const updateScene = (id, patch) => setScenes(sc => sc.map(x => x.id === id ? { ...x, ...patch } : x));
  const deleteScene = (id) => {
    const i = scenes.findIndex(x => x.id === id), rest = scenes.filter(x => x.id !== id);
    setScenes(rest);
    if (id === activeSceneId) { const t = rest[Math.min(i, rest.length - 1)]; setActiveSceneId(t ? t.id : null); if (t) setElements(applyScene(elementsRef.current, t)); }
  };
  const moveScene = (id, d) => setScenes(sc => { const i = sc.findIndex(x => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= sc.length) return sc; const n = sc.slice(); [n[i], n[j]] = [n[j], n[i]]; return n; });
  const resetView = () => {
    const r = vp !== "desktop" && svgRef.current ? svgRef.current.getBoundingClientRect() : null;
    if (r && r.width > 0) {                       // fit the stage in the window on tablets and phones
      const z = Math.min(1.2, (r.width - 56) / (stageW * GRID), (r.height - 150) / ((stageH + 7) * GRID));
      setZoom(z); setPan({ x: (r.width - stageW * GRID * z) / 2 + 12, y: Math.max(52, (r.height - (stageH + 4) * GRID * z) / 2) });
      return;
    }
    setZoom(1); setPan({ x: 80 + (venue.stageOffX||0)*GRID, y: 60 + (venue.stageOffY||0)*GRID });
  };
  useEffect(() => { if (vp !== "desktop") { const t = setTimeout(resetView, 60); return () => clearTimeout(t); } }, [vp]);
  const zoomBy = (f) => setZoom(z => Math.min(4, Math.max(0.15, z * f)));
  const inWorkspace = showBuild || show3D || showNotes || showLighting || showScenes;
  const closeAll = () => { setShowBuild(false); setShow3D(false); setShowNotes(false); setShowLighting(false); setShowScenes(false); };
  const workspaces = [
    { id:"plan",  label:"Plan",  icon:"plan",  on:!inWorkspace, go: closeAll },
    { id:"scenes", label:"Scenes", icon:"layers", on:showScenes, go:()=>{ closeAll(); setShowScenes(true); } },
    { id:"3d",    label:"3D",    icon:"cube",  on:show3D, go:()=>{ closeAll(); setShow3D(true); } },
    { id:"paper", label:"Paperwork", icon:"paper", on:showLighting, go:()=>{ closeAll(); setShowLighting(true); } },
    { id:"build", label:"Build", icon:"build", on:showBuild, go:()=>{ closeAll(); setShowBuild(true); } },
    { id:"notes", label:openPins?`Notes (${openPins})`:"Notes", icon:"notes", on:showNotes, go:()=>{ closeAll(); setShowNotes(true); } },
  ];
  const snapLabel = snapStep === GRID ? "1 ft" : snapStep === GRID/2 ? "6 in" : snapStep === GRID/12 ? "1 in" : "Off";
  const cycleSnap = () => setSnapStep(snapStep === GRID ? GRID/2 : snapStep === GRID/2 ? GRID/12 : snapStep === GRID/12 ? 0 : GRID);
  const exportItems = [
    { label:"Plot PDF", onClick:()=>generateDesignPDF(svgRef.current,elements,stageW,stageH,venue,projectInfo,{numberPieces}) },
    { label:"Schedule PDF", onClick:()=>generateInstrumentSchedulePDF(elements,stageW,stageH,projectInfo) },
    { label:"SVG image", onClick:exportSVG },
    { label:"JSON file", onClick:exportJSON },
    { sep:true },
    { label:"Import JSON", onClick:()=>fileInputRef.current?.click() },
    { label:"Compare with earlier JSON", onClick:()=>setShowCompare(true) },
    { label:"Number pieces on plot PDF", checked:numberPieces, onClick:()=>setNumberPieces(v=>!v) },
  ];
  const moreItems = [
    { label:"Venue editor", onClick:()=>setShowVenueEditor(true) },
    { label:"Project info", onClick:()=>setShowProjectInfo(true) },
    { label:"Instrument schedule", onClick:()=>setShowSchedule(true) },
    { label:"Reset view", onClick:resetView },
    { sep:true },
    ...(vp === "phone" ? [
      { label:"Grid", checked:showGrid, onClick:()=>setShowGrid(g=>!g) },
      { label:"Scale", checked:showMeasure, onClick:()=>setShowMeasure(m=>!m) },
      { label:"Snap", hint:snapLabel, onClick:cycleSnap },
      { sep:true } ] : []),
    ...(vp !== "desktop" ? [ ...exportItems, { sep:true } ] : []),
    { label:"New project", danger:true, onClick:newProject },
  ];
  const SHORT = { select:"Select", pan:"Pan", wall:"Wall", batten:"Batten", label:"Text", pin:"Pin", delete:"Delete" };
  const toolBtn = (t, mode) => {
    const on = tool === t.id;
    const st = mode === "strip" ? ctl(on, { flexDirection:"column", justifyContent:"center", gap:2, height:48, minWidth:64, padding:"0 10px", fontSize:11, border:`1px solid ${on?COLORS.accent:COLORS.border}` })
      : mode === "float" ? ctl(on, { width:52, height:52, padding:0, justifyContent:"center" })
      : ctl(on, { width:56, height:56, padding:0, flexDirection:"column", justifyContent:"center", gap:4, fontSize:11 });
    return (<button key={t.id} aria-pressed={on} aria-label={t.label} title={t.label} onClick={()=>setTool(t.id)} style={st}>
      <Icon name={t.id} size={22}/>{mode !== "float" && <span>{SHORT[t.id]}</span>}</button>);
  };
  const iconBtn = (name, label, onClick, disabled) => (
    <button aria-label={label} title={label} disabled={disabled} onClick={onClick} style={ctl(false, { width:44, padding:0, justifyContent:"center", opacity:disabled?0.35:1, cursor:disabled?"default":"pointer" })}><Icon name={name} size={22}/></button>);
  const inspTabs = [["props","Properties"],["layers","Layers"],["channels",`Channels (${lightingEls.length})`]];
  const inspBody = inspTab === "layers" ? layersUI : inspTab === "channels" ? channelsUI : propsUI;
  const zoomBox = (vertical) => (
    <div style={{ display:"flex", flexDirection:vertical?"column":"row", alignItems:"center", background:COLORS.panel, border:`1px solid ${COLORS.border}`, borderRadius:4 }}>
      <button aria-label="Zoom out" onClick={()=>zoomBy(0.8)} style={ctl(false,{width:44,padding:0,justifyContent:"center"})}><Icon name="minus" size={18} sw={1.8}/></button>
      {!vertical && <span style={{ width:56, textAlign:"center", fontFamily:FONT_MONO, fontSize:13 }}>{Math.round(zoom*100)}%</span>}
      <button aria-label="Zoom in" onClick={()=>zoomBy(1.25)} style={ctl(false,{width:44,padding:0,justifyContent:"center"})}><Icon name="plus" size={18} sw={1.8}/></button>
      <button aria-label="Fit to screen" onClick={resetView} style={ctl(false,{width:44,padding:0,justifyContent:"center"})}><Icon name="fit" size={18} sw={1.8}/></button>
    </div>);
  const savedText = saveNote ? "Warning: " + saveNote : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}` : "";

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="sd-root" style={{ display:"flex", flexDirection:"column", background:COLORS.bg, color:COLORS.text, fontFamily:FONT_UI, overflow:"hidden" }}>

      {showProjectInfo && <ProjectInfoModal projectInfo={projectInfo} setProjectInfo={setProjectInfo} onClose={()=>setShowProjectInfo(false)}/>}
      {showCompare && <CompareModal elements={elements} onClose={()=>setShowCompare(false)}/>}
      {showSchedule && <ScheduleModal projectInfo={projectInfo} elements={elements} stageW={stageW} stageH={stageH} lightingEls={lightingEls} battens={battens} setSelected={setSelected} setSidebarTab={setSidebarTab} onClose={()=>setShowSchedule(false)}/>}
      {showVenuePicker && <VenuePicker
        onPick={(v)=>{ setVenue({ ...v.venue }); setStageW(v.stageW); setStageH(v.stageH); setProjectInfo(p=>({ ...p, venue:v.name })); setShowVenuePicker(false); }}
        onCreate={()=>{ setShowVenuePicker(false); setShowVenueEditor(true); }}
        onSkip={()=>setShowVenuePicker(false)}/>}
      {showVenueEditor && <VenueEditorModal venue={venue} stageW={stageW} stageH={stageH} setStageW={setStageW} setStageH={setStageH} onClose={()=>setShowVenueEditor(false)} onApply={(d)=>{setVenue(d); setShowVenueEditor(false);}}/>}

      {/* ── top bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:vp==="phone"?8:12, padding:vp==="phone"?"0 8px":"0 12px", minHeight:vp==="desktop"?52:56, background:COLORS.raised, borderBottom:`1px solid ${COLORS.border}`, flexShrink:0 }}>
        {vp === "desktop" && (
          <a href="https://apps.upstage.systems" title="Back to Upstage Systems apps" style={{ ...ghost({ height:36, padding:"0 10px", border:`1px solid ${COLORS.border}`, color:COLORS.textDim, textDecoration:"none", fontSize:12 }) }}>Apps</a>)}
        <a href="https://apps.upstage.systems" title="Back to Upstage Systems apps" style={{ display:"flex", flex:"none", minHeight:44, alignItems:"center" }}><img src={vp==="desktop" ? logoHorizontal : logoMark} alt="Upstage Systems" style={{ width:vp==="desktop"?120:44, height:"auto", display:"block", flex:"none" }}/></a>
        <div style={{ display:"flex", flexDirection:"column", lineHeight:1.2, minWidth:0, flex:vp==="desktop"?"none":1 }}>
          <span style={{ fontFamily:FONT_DISPLAY, textTransform:"uppercase", letterSpacing:"0.04em", fontWeight:600, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{projectInfo.title || "Stage Designer"}</span>
          <span title={saveNote || "Your plan is saved in this browser automatically"} style={{ fontSize:12, color:saveNote?COLORS.accent:COLORS.textDim, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{projectInfo.title ? "Stage Designer" : ""}{projectInfo.title && savedText ? " · " : ""}{savedText}</span>
        </div>
        {vp !== "phone" && (
          <div role="tablist" aria-label="Workspaces" className="sd-scroll-x" style={{ flex:1, minWidth:0, display:"flex", justifyContent:vp==="desktop"?"center":"flex-start", gap:4 }}>
            {workspaces.map(w => (
              <button key={w.id} role="tab" aria-selected={w.on} aria-label={w.label} onClick={w.go} style={ctl(w.on, { padding:"0 12px", fontSize:13 })}>
                <Icon name={w.icon} size={20}/>{(vp==="desktop" || w.on) && <span>{w.label}</span>}</button>))}
          </div>)}
        {vp === "desktop" && <>{iconBtn("undo","Undo (Ctrl/Cmd+Z)",undo,!histCount.u)}{iconBtn("redo","Redo (Ctrl/Cmd+Shift+Z)",redo,!histCount.r)}</>}
        {vp === "desktop" && <MenuButton label="Export" items={exportItems}/>}
        <button onClick={copyShareLink} title="Copy a link that opens this plan for someone else" aria-label="Share" style={primary(vp==="phone"?{ width:44, padding:0, justifyContent:"center" }:{})}>
          <Icon name="share" size={18} sw={1.8}/>{vp !== "phone" && <span>Share</span>}</button>
        <MenuButton iconOnly icon="more" ariaLabel="More" items={moreItems}/>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} style={{ display:"none" }}/>
      </div>

      {sharedMode && (
        <div style={{ background:"#3a2a10", borderBottom:`1px solid ${COLORS.border}`, color:"#ffcc66", fontSize:11, padding:"5px 12px", display:"flex", gap:10, alignItems:"center" }}>
          <span>Opened from a share link. Changes you make here are not saved, and your own saved plan is untouched.</span>
          <Btn onClick={leaveShared} title="Keep working on this plan and save it in this browser (replaces your saved plan here)">Keep a copy in this browser</Btn>
        </div>
      )}
      {scenes.length > 0 && !inWorkspace && (() => {
        const i = scenes.findIndex(x => x.id === activeSceneId);
        const nb = (d, lbl) => <button aria-label={lbl} disabled={i + d < 0 || i + d >= scenes.length} onClick={()=>stepScene(d)} style={ctl(false,{width:44,padding:0,justifyContent:"center",border:`1px solid ${COLORS.border}`,opacity:(i + d < 0 || i + d >= scenes.length)?0.35:1})}><span style={{fontSize:18,lineHeight:1}}>{d<0?"‹":"›"}</span></button>;
        return (
        <div role="group" aria-label="Scene" style={{ flexShrink:0, display:"flex", alignItems:"center", gap:8, padding:"4px 12px", background:COLORS.raised, borderBottom:`1px solid ${COLORS.border}` }}>
          {nb(-1,"Previous scene")}
          <button onClick={()=>{ closeAll(); setShowScenes(true); }} title="Open scenes and shift list" style={ctl(false,{flex:1,minWidth:0,justifyContent:"center",border:`1px solid ${COLORS.accent}`,color:COLORS.text,overflow:"hidden",textOverflow:"ellipsis"})}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{activeScene ? sceneTitle(activeScene) : "Scenes"}</span><span style={{color:COLORS.textDim,fontSize:12}}>{i+1}/{scenes.length}</span></button>
          {nb(1,"Next scene")}
        </div>); })()}
      <div style={{ display:"flex", flex:1, minHeight:0, overflow:"hidden", position:"relative", zIndex:0 }}>
        {inWorkspace && <div style={{ position:"absolute", inset:0, zIndex:500, background:COLORS.bg }}>
      {showScenes && <ScenesView scenes={scenes} activeId={activeSceneId} elements={elements} setElements={setElements} stageW={stageW} stageH={stageH} grid={GRID} projectInfo={projectInfo} onStart={startScenes} onAdd={addScene} onGo={goScene} onUpdate={updateScene} onDelete={deleteScene} onMove={moveScene}/>}
      {showBuild && <ConstructionModal elements={elements} setElements={setElements} shop={shop} setShop={setShop} projectInfo={projectInfo} grid={GRID} selectedId={selected} onClose={()=>setShowBuild(false)}/>}
      {show3D && <Suspense fallback={<div style={{ position:"absolute", inset:0, background:"#0B0E11", color:COLORS.textDim, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace" }}>Loading 3D view…</div>}>
        <View3D elements={elements} venue={venue} stageW={stageW} stageH={stageH} projectInfo={projectInfo} onClose={()=>setShow3D(false)}/>
      </Suspense>}
      {showNotes && <NotesModal elements={elements} setElements={setElements} onPick={(id)=>{ setSelected(id); setSidebarTab("props"); setShowNotes(false); }} onClose={()=>setShowNotes(false)}/>}
      {showLighting && <LightingModal stageW={stageW} stageH={stageH} elements={elements} setElements={setElements} projectInfo={projectInfo} onClose={()=>setShowLighting(false)}/>}
        </div>}
        {vp === "desktop" && (
          <div role="toolbar" aria-label="Tools" style={{ width:68, flexShrink:0, background:COLORS.raised, borderRight:`1px solid ${COLORS.border}`, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"8px 0" }}>
            {TOOLS.map(t => toolBtn(t, "rail"))}
          </div>)}
        {vp === "desktop" && (
          <div style={{ width:248, flexShrink:0, background:COLORS.raised, borderRight:`1px solid ${COLORS.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"14px 12px 6px", fontFamily:FONT_DISPLAY, textTransform:"uppercase", letterSpacing:"0.12em", fontSize:12, color:COLORS.textDim }}>Add to plot</div>
            {libraryUI}
          </div>)}

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
          <svg ref={svgRef} style={{ width:"100%", height:"100%", display:"block", touchAction:"none",
            cursor: isPanning||tool==="pan"?"grabbing":calib||tool==="delete"?"crosshair":tool==="wall"||tool==="batten"?"crosshair":"default" }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {underlay && underlay.visible !== false && (
                <image href={underlay.src} x={underlay.x} y={underlay.y} width={underlay.w} height={underlay.h} opacity={underlay.opacity}
                  preserveAspectRatio="none" transform={underlay.rot ? `rotate(${underlay.rot} ${underlay.x+underlay.w/2} ${underlay.y+underlay.h/2})` : undefined} pointerEvents="none"/>
              )}
              {calib && calib.pts.map((c,i)=>(<g key={i} pointerEvents="none"><circle cx={c.x} cy={c.y} r={6/zoom} fill="#ff3b6b" stroke="#fff" strokeWidth={1/zoom}/><text x={c.x+9/zoom} y={c.y-9/zoom} fill="#ff3b6b" fontSize={12/zoom}>{i+1}</text></g>))}
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
              {[...elements].filter(e=>e.category!=="lighting").map(renderEl)}
              {[...elements].filter(e=>e.category==="lighting").map(renderEl)}

              {/* Box-select rubber band */}
              {marquee && (
                <rect x={Math.min(marquee.x1,marquee.x2)} y={Math.min(marquee.y1,marquee.y2)}
                  width={Math.abs(marquee.x2-marquee.x1)} height={Math.abs(marquee.y2-marquee.y1)}
                  fill={COLORS.selected} fillOpacity={0.08} stroke={COLORS.selected} strokeWidth={1/zoom}
                  strokeDasharray={`${5/zoom},${3/zoom}`} pointerEvents="none"/>
              )}
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
          {/* selection actions */}
          {selIds.length > 0 && tool === "select" && (
            <div role="toolbar" aria-label="Selection actions" style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)", zIndex:30, display:"flex", gap:2, padding:4, background:COLORS.panel, border:`1px solid ${COLORS.borderStrong}`, borderRadius:8, maxWidth:"calc(100% - 140px)" }}>
              <button onClick={duplicateSelected} style={ctl(false,{padding:"0 12px",fontSize:12})}><Icon name="copy" size={18}/>Duplicate</button>
              {vp !== "phone" && <button onClick={copySelected} style={ctl(false,{padding:"0 12px",fontSize:12})}>Copy</button>}
              {vp !== "phone" && <button onClick={pasteClipboard} disabled={!clipboard||!clipboard.length} style={ctl(false,{padding:"0 12px",fontSize:12,opacity:(!clipboard||!clipboard.length)?0.4:1})}>Paste</button>}
              <button onClick={()=>{ setElements(prev=>prev.filter(x=>!selIds.includes(x.id))); setSelected(null); }} style={ctl(false,{padding:"0 12px",fontSize:12,color:"#E5534B"})}><Icon name="delete" size={18} sw={1.8}/>Delete</button>
            </div>)}
          {/* zoom */}
          <div style={vp === "desktop" ? { position:"absolute", right:16, bottom:16, zIndex:30 } : { position:"absolute", right:8, top:8, zIndex:30 }}>{zoomBox(vp === "phone")}</div>
          {/* tablet: floating tools and Add button */}
          {vp === "tablet" && (
            <div role="toolbar" aria-label="Tools" style={{ position:"absolute", left:12, top:12, zIndex:30, display:"flex", flexDirection:"column", gap:2, padding:4, background:COLORS.panel, border:`1px solid ${COLORS.border}`, borderRadius:8 }}>
              {iconBtn("undo","Undo",undo,!histCount.u)}{iconBtn("redo","Redo",redo,!histCount.r)}
              {TOOLS.map(t => toolBtn(t, "float"))}
              <button aria-label="Panels" title="Properties, layers and channels" onClick={()=>setPanelMode(m=>m?null:"peek")} style={ctl(!!panelMode,{width:52,height:52,padding:0,justifyContent:"center"})}><Icon name="layers" size={22}/></button>
            </div>)}
          {vp === "tablet" && !showLibrary && !panelMode && (
            <button onClick={()=>setShowLibrary(true)} style={ghost({ position:"absolute", left:12, bottom:12, zIndex:30, height:48, background:COLORS.panel })}><Icon name="plus" size={20} sw={1.8}/><span>Add to plot</span></button>)}
          {/* shortcuts popover (desktop) */}
          {vp === "desktop" && showKeys && (
            <div role="dialog" aria-label="Keyboard shortcuts" style={{ position:"absolute", right:16, bottom:76, zIndex:35, width:300, background:COLORS.panel, border:`1px solid ${COLORS.borderStrong}`, borderRadius:8, padding:12, fontSize:13, lineHeight:1.8, color:COLORS.text }}>
              {[["S","Select"],["W","Draw wall"],["B","Batten"],["D","Delete tool"],["P","Pan"],["L","Text label"],["C","Comment pin"],["Shift+click","Add to selection"],["Ctrl/Cmd+A","Select all"],["Ctrl/Cmd+C / V / D","Copy, paste, duplicate"],["Del","Remove"],["Arrows","Nudge"],["[ ]","Send back / forward"],["Scroll","Zoom"]].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:12 }}><span style={{ fontFamily:FONT_MONO, fontSize:12, color:COLORS.accent }}>{k}</span><span>{v}</span></div>))}
            </div>)}
          {/* sheets: tablet and phone */}
          {vp !== "desktop" && showLibrary && (
            <Sheet mode="open" setMode={()=>{}} onClose={()=>setShowLibrary(false)} title="Add to plot">{libraryUI}</Sheet>)}
          {vp !== "desktop" && !showLibrary && panelMode && (
            <Sheet mode={panelMode} setMode={setPanelMode} onClose={()=>setPanelMode(null)} tabs={inspTabs} tab={inspTab} setTab={setSidebarTab}>{inspBody}</Sheet>)}
        </div>

        {vp === "desktop" && (
          <div style={{ width:304, flexShrink:0, background:COLORS.raised, borderLeft:`1px solid ${COLORS.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div role="tablist" style={{ display:"flex", borderBottom:`1px solid ${COLORS.border}` }}>
              {inspTabs.map(([id,lbl]) => (
                <button key={id} role="tab" aria-selected={inspTab===id} onClick={()=>setSidebarTab(id)}
                  style={{ flex:1, height:44, background:"transparent", border:"none", borderBottom:`2px solid ${inspTab===id?COLORS.accent:"transparent"}`, color:inspTab===id?COLORS.text:COLORS.textDim, cursor:"pointer", fontFamily:FONT_DISPLAY, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:500, fontSize:12 }}>{lbl}</button>))}
            </div>
            <div style={{ flex:1, minHeight:0, overflowY:"auto" }}>{inspBody}</div>
          </div>)}
      </div>

      {/* phone: tool strip and workspace tab bar */}
      {vp === "phone" && !inWorkspace && (
        <div role="toolbar" aria-label="Tools" className="sd-scroll-x" style={{ flexShrink:0, display:"flex", gap:6, padding:8, background:COLORS.raised, borderTop:`1px solid ${COLORS.border}` }}>
          {iconBtn("undo","Undo",undo,!histCount.u)}{iconBtn("redo","Redo",redo,!histCount.r)}
          {TOOLS.map(t => toolBtn(t, "strip"))}
          <button onClick={()=>setShowLibrary(true)} style={ctl(false,{flexDirection:"column",justifyContent:"center",gap:2,height:48,minWidth:64,padding:"0 10px",fontSize:11,border:`1px solid ${COLORS.textDim}`,color:COLORS.text})}><Icon name="plus" size={22}/><span>Add</span></button>
          <button onClick={()=>setPanelMode(m=>m?null:"peek")} style={ctl(!!panelMode,{flexDirection:"column",justifyContent:"center",gap:2,height:48,minWidth:64,padding:"0 10px",fontSize:11,border:`1px solid ${panelMode?COLORS.accent:COLORS.border}`})}><Icon name="layers" size={22}/><span>Panels</span></button>
        </div>)}
      {vp === "phone" && (
        <div role="tablist" aria-label="Workspaces" className="sd-safe-bottom" style={{ flexShrink:0, display:"flex", background:COLORS.raised, borderTop:`1px solid ${COLORS.border}` }}>
          {workspaces.map(w => (
            <button key={w.id} role="tab" aria-selected={w.on} onClick={w.go}
              style={{ flex:1, minHeight:56, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, background:"transparent", border:"none", borderTop:`2px solid ${w.on?COLORS.accent:"transparent"}`, color:w.on?COLORS.text:COLORS.textDim, cursor:"pointer", fontFamily:FONT_DISPLAY, textTransform:"uppercase", letterSpacing:"0.02em", fontWeight:500, fontSize:10 }}>
              <Icon name={w.icon} size={22}/><span>{w.label.replace(/ \(\d+\)/,"")}{openPins && w.id==="notes" ? ` ${openPins}` : ""}</span></button>))}
        </div>)}

      {/* status bar: desktop and tablet */}
      {vp !== "phone" && (
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:16, padding:"0 12px", minHeight:32, background:COLORS.raised, borderTop:`1px solid ${COLORS.border}`, fontSize:12, color:COLORS.textDim }}>
          <label style={{ display:"flex", alignItems:"center", gap:6 }}>Snap
            <select value={snapStep} onChange={e=>setSnapStep(+e.target.value)} style={{ background:COLORS.panel, color:COLORS.text, border:`1px solid ${COLORS.border}`, borderRadius:4, padding:"2px 6px", fontFamily:FONT_MONO, fontSize:12 }}>
              <option value={GRID}>1 ft</option><option value={GRID/2}>6 in</option><option value={GRID/12}>1 in</option><option value={0}>Off</option>
            </select></label>
          <button aria-pressed={showGrid} onClick={()=>setShowGrid(g=>!g)} style={ctl(showGrid,{height:26,padding:"0 10px",fontSize:12})}>Grid</button>
          <button aria-pressed={showMeasure} onClick={()=>setShowMeasure(m=>!m)} style={ctl(showMeasure,{height:26,padding:"0 10px",fontSize:12})}>Scale</button>
          <span style={{ flex:1 }}/>
          <span style={{ fontFamily:FONT_MONO }}>{stageW}' × {stageH}' stage</span>
          <span style={{ fontFamily:FONT_MONO }}>{Math.round(zoom*100)}%</span>
          {vp === "desktop" && <button aria-expanded={showKeys} onClick={()=>setShowKeys(k=>!k)} style={ctl(showKeys,{height:26,padding:"0 10px",fontSize:12})}>Shortcuts</button>}
        </div>)}

      {ask && <AskText title={ask.title} value={ask.value} onOk={(v)=>{ const a=ask; setAsk(null); a.onOk(v); }} onCancel={()=>{ const a=ask; setAsk(null); a.onCancel && a.onCancel(); }}/>}
    </div>
  );
}

