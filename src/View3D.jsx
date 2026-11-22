// View3D.jsx — 3D view of the plot: stage shape, set pieces, battens, fixtures and beams, audience sightlines, glTF export.
// Loaded on demand (three.js is large), so the plot itself opens as fast as before.
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { zipSync, strToU8 } from "fflate";
import { buildMVRxml } from "./mvr.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { GRID, COLORS, FIXTURE_DEFS, FONT_UI, FONT_DISPLAY } from "./constants.js";
import { stageOutline, DEFAULT_HEIGHT_IN } from "./stage.js";
import { isFixture, mountHeightFt, specOf, gelHex, trimFt, AIM_HEIGHT_FT, DEFAULT_HANG_FT } from "./lighting.js";

const ft = (px) => px / GRID;
const WALKABLE = ["platform", "tri_platform", "stairs"];

function pointInPoly(x, z, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; }
function mat(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts }); }
function addEdges(mesh) { mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }))); return mesh; }

// Build one set piece as a Group whose origin is its plan position; rotation matches the plot.
function buildSetPiece(el) {
  const g = new THREE.Group(); g.userData = { elId: el.id, type: el.type };
  const color = el.color || "#8b7355";
  const W = ft(el.w || 0), D = ft(el.h || 0);
  const hIn = el.height > 0 ? el.height : DEFAULT_HEIGHT_IN[el.type] ?? 30;
  const elev = (el.elevation || 0) / 12;
  const mk = (geo, y, m) => { const mesh = addEdges(new THREE.Mesh(geo, m || mat(color))); mesh.position.y = y; mesh.userData.blocker = true; g.add(mesh); return mesh; };
  if (el.type === "platform") { const top = Math.max(elev, 0.15); mk(new THREE.BoxGeometry(W, top, D), top / 2).userData.walk = true; }
  else if (el.type === "tri_platform") {
    const top = Math.max(elev, 0.15), s = new THREE.Shape();
    s.moveTo(-W / 2, -D / 2); s.lineTo(W / 2, -D / 2); s.lineTo(-W / 2, D / 2); s.closePath();   // 90° corner at lower-left, as on the plot
    const geo = new THREE.ExtrudeGeometry(s, { depth: top, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    mk(geo, 0).userData.walk = true;
  } else if (el.type === "stairs") {
    const rise = Math.max(elev, 0.5), n = Math.max(1, Math.ceil(rise * 12 / 7.75));
    for (let i = 0; i < n; i++) { const h = (rise * (i + 1)) / n, d = D / n, m = mk(new THREE.BoxGeometry(W, h, d), h / 2); m.position.z = D / 2 - d * (i + 0.5); m.userData.walk = true; }
  } else if (el.type === "curved_flat") {
    const R = (W * W / 4 + D * D) / (2 * Math.max(D, 0.05)), a = Math.asin(Math.min(1, W / (2 * R))), h = hIn / 12;
    const geo = new THREE.CylinderGeometry(R, R, h, 40, 1, true, Math.PI - a, 2 * a);
    const m = addEdges(new THREE.Mesh(geo, mat(color, { side: THREE.DoubleSide }))); m.position.set(0, elev + h / 2, -D / 2 + R); m.userData.blocker = true; g.add(m);
  } else if (el.type === "round_table" || el.type === "stool" || el.type === "column") {
    mk(new THREE.CylinderGeometry(W / 2, W / 2, hIn / 12, 24), elev + hIn / 24);
  } else if (el.category === "softgoods" || el.layer === "softgoods" || ["traveler", "leg_drape", "scrim"].includes(el.type)) {
    mk(new THREE.BoxGeometry(W, hIn / 12, Math.max(D, 0.15)), elev + hIn / 24, mat(color, { transparent: true, opacity: el.type === "scrim" ? 0.35 : 0.9 }));
  } else if (el.type === "window") {
    mk(new THREE.BoxGeometry(W, hIn / 12, Math.max(D, 0.15)), elev + 3 + hIn / 24);
  } else {
    mk(new THREE.BoxGeometry(Math.max(W, 0.05), hIn / 12, Math.max(D, 0.05)), elev + hIn / 24);
  }
  g.position.set(ft(el.x), 0, ft(el.y));
  g.rotation.y = -((el.rotation || 0) * Math.PI) / 180;
  return g;
}

function buildWall(el) {
  const x1 = ft(el.x1), z1 = ft(el.y1), x2 = ft(el.x2), z2 = ft(el.y2);
  const len = Math.hypot(x2 - x1, z2 - z1), thick = ft(el.thick || 4) || 0.2, h = (el.height > 0 ? el.height : 96) / 12;
  const mesh = addEdges(new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), mat(el.color || "#8b7355")));
  mesh.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2); mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  mesh.userData = { blocker: true, elId: el.id }; return mesh;
}

function buildScene(opts) {
  const { elements, venue, stageW, stageH, deckFt, showWalls, showBeams, allBeams, noFixtures } = opts;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0B0E11);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(20, 40, 30); scene.add(sun);
  const SW = stageW, SH = stageH;
  const stage = new THREE.Group(); stage.name = "stage"; scene.add(stage);
  const blockers = [], walkers = [];

  // room floor + audience
  const rW = venue.roomW || 36, rH = venue.roomH || 32, ox = -(venue.stageOffX || 0), oy = -(venue.stageOffY || 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(rW, rH), mat(venue.roomColor || "#111118")); floor.rotation.x = -Math.PI / 2; floor.position.set(ox + rW / 2, -0.02, oy + rH / 2); scene.add(floor);
  (venue.audience || []).forEach((az) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(az.w, az.h), mat(az.color || venue.audienceColor || "#1a2a1a")); p.rotation.x = -Math.PI / 2; p.position.set(ox + az.x + az.w / 2, 0.01, oy + az.y + az.h / 2); scene.add(p);
  });
  if (showWalls) {
    const wm = new THREE.MeshStandardMaterial({ color: 0x555577, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
    [[rW, 0.3, ox + rW / 2, oy], [rW, 0.3, ox + rW / 2, oy + rH], [0.3, rH, ox, oy + rH / 2], [0.3, rH, ox + rW, oy + rH / 2]].forEach(([w, d, x, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 22, d), wm); m.position.set(x, 11, z); scene.add(m); });
  }
  // stage deck
  const pts = stageOutline(venue, stageW, stageH).map(([x, y]) => new THREE.Vector2(ft(x), -ft(y)));
  const shape = new THREE.Shape(pts);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(deckFt, 0.05), bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(geo, mat(COLORS.stage || "#2a2a1a")); deck.position.y = deckFt > 0 ? 0 : -0.05; scene.add(deck);
  const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, deckFt + 0.02, -p.y))), new THREE.LineBasicMaterial({ color: 0x8a8a4a })); scene.add(rim);
  stage.position.y = deckFt;

  // battens
  const battens = elements.filter((e) => e.type === "batten");
  battens.forEach((b) => {
    const h = trimFt(b) || DEFAULT_HANG_FT, x1 = ft(b.x1), z1 = ft(b.y1), x2 = ft(b.x2), z2 = ft(b.y2), len = Math.hypot(x2 - x1, z2 - z1) || 0.1;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 10), mat("#7f9ab5")); m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    // CylinderGeometry runs along Y; lay it along X then yaw it to the plan angle
    const holder = new THREE.Group(); holder.add(m); holder.position.set((x1 + x2) / 2, h, (z1 + z2) / 2); holder.rotation.y = -Math.atan2(z2 - z1, x2 - x1); m.rotation.y = 0; stage.add(holder);
  });
  // set pieces
  elements.forEach((el) => {
    if (isFixture(el) || el.type === "batten" || el.type === "textlabel") return;
    if (el.category !== "set" && el.layer !== "set" && el.layer !== "softgoods" && el.layer !== "practicals") return;
    const obj = el.type === "wall" ? buildWall(el) : buildSetPiece(el);
    stage.add(obj);
    obj.traverse((o) => { if (o.userData?.blocker) { blockers.push(o); if (o.userData.walk) walkers.push(o); } });
  });
  // fixtures + beams
  const beams = new THREE.Group(); beams.name = "beams"; stage.add(beams);
  elements.filter((e) => isFixture(e) && !noFixtures).forEach((el) => {
    const h = mountHeightFt(el, elements), pos = new THREE.Vector3(ft(el.x), h, ft(el.y));
    const def = FIXTURE_DEFS[el.type] || {};
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.9, 12), mat(def.color || "#ffdd44", { emissive: def.color || "#ffdd44", emissiveIntensity: 0.25 }));
    body.position.copy(pos); body.position.y -= 0.45; stage.add(body);
    const sp = specOf(el);
    if (showBeams && sp.angle > 0 && (el.aim || el.focused || allBeams) && el.type !== "hazer") {
      const tgt = el.aim ? new THREE.Vector3(ft(el.aim.x), Math.min(AIM_HEIGHT_FT, h), ft(el.aim.y)) : new THREE.Vector3(pos.x, 0, pos.z);
      const dir = tgt.clone().sub(pos), len = dir.length(); if (len < 0.3) return;
      const r = len * Math.tan((sp.angle * Math.PI) / 360);
      const cg = new THREE.ConeGeometry(r, len, 28, 1, true); cg.translate(0, -len / 2, 0);
      const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: gelHex(el.gelCode), transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      cone.position.copy(pos); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize()); beams.add(cone);
    }
  });
  return { scene, stage, blockers, walkers, deck };
}

// Fraction of the stage a seat can see: a 5'6" performer standing on each 1-ft grid point (on top of platforms).
function analyseSightlines(built, venue, stageW, stageH, deckFt, eye) {
  const out = stageOutline(venue, stageW, stageH).map(([x, y]) => [ft(x), ft(y)]);
  const inside = (x, z) => { let c = false; for (let i = 0, j = out.length - 1; i < out.length; j = i++) { const [xi, zi] = out[i], [xj, zj] = out[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), vis = [], hid = [];
  built.scene.updateMatrixWorld(true);
  for (let x = 0.5; x < stageW; x += 1) for (let z = 0.5; z < stageH + 6; z += 1) {
    if (!inside(x, z)) continue;
    let top = deckFt;
    ray.set(new THREE.Vector3(x, deckFt + 60, z), down); ray.far = 120;
    const hit = ray.intersectObjects(built.walkers, false)[0]; if (hit) top = Math.max(top, hit.point.y);
    const target = new THREE.Vector3(x, top + AIM_HEIGHT_FT, z), dir = target.clone().sub(eye), dist = dir.length();
    ray.set(eye, dir.normalize()); ray.far = dist - 0.05;
    const blocked = ray.intersectObjects(built.blockers, false).length > 0;
    (blocked ? hid : vis).push(target);
  }
  return { visible: vis.length, hidden: hid, total: vis.length + hid.length };
}

export default function View3D({ elements, venue, stageW, stageH, projectInfo, onClose }) {
  const hostRef = useRef(null), apiRef = useRef({});
  const [deckFt, setDeckFt] = useState(0);
  const [showBeams, setShowBeams] = useState(true), [allBeams, setAllBeams] = useState(false), [showWalls, setShowWalls] = useState(true);
  const zones = venue.audience || [];
  const [zone, setZone] = useState(0), [u, setU] = useState(0.5), [v, setV] = useState(0.5), [eyeFt, setEyeFt] = useState(3.75);
  const [sight, setSight] = useState(null), [seatMode, setSeatMode] = useState(false);
  const [walk, setWalk] = useState(false);
  const walkRef = useRef({ on: false, yaw: 0, pitch: 0, keys: {} });

  const seat = useMemo(() => {
    const az = zones[zone]; if (!az) return null;
    return new THREE.Vector3(-(venue.stageOffX || 0) + az.x + u * az.w, eyeFt, -(venue.stageOffY || 0) + az.y + v * az.h);
  }, [zones, zone, u, v, eyeFt, venue.stageOffX, venue.stageOffY]);

  // scene + renderer lifecycle
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); host.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    const api = apiRef.current; api.renderer = renderer; api.camera = camera; api.controls = controls;
    const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();
    const W = walkRef.current, dom = renderer.domElement;
    camera.rotation.order = "YXZ";
    const onDown = (e) => { W.drag = W.on ? { x: e.clientX, y: e.clientY } : null; };
    const onMove = (e) => { if (!W.on || !W.drag || !(e.buttons || e.pointerType === "touch")) return; W.yaw -= (e.clientX - W.drag.x) * 0.005; W.pitch = Math.max(-1.2, Math.min(1.2, W.pitch - (e.clientY - W.drag.y) * 0.005)); W.drag = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { W.drag = null; };
    const keyMap = { w: "f", arrowup: "f", s: "b", arrowdown: "b", a: "l", arrowleft: "l", d: "r", arrowright: "r" };
    const onKey = (e, v) => { const k = keyMap[e.key.toLowerCase()]; if (k && W.on) { W.keys[k] = v; e.preventDefault(); } };
    const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
    dom.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    let raf, last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (W.on) {
        const sp = 6 * dt, fx = -Math.sin(W.yaw), fz = -Math.cos(W.yaw), rx = Math.cos(W.yaw), rz = -Math.sin(W.yaw);
        const f = (W.keys.f ? 1 : 0) - (W.keys.b ? 1 : 0), r = (W.keys.r ? 1 : 0) - (W.keys.l ? 1 : 0);
        camera.position.x += (fx * f + rx * r) * sp; camera.position.z += (fz * f + rz * r) * sp;
        const out = api.outline, inStage = out && pointInPoly(camera.position.x, camera.position.z, out);
        camera.position.y = (inStage ? api.deck || 0 : 0) + 5.5;
        camera.rotation.set(W.pitch, W.yaw, 0);
      } else controls.update();
      if (api.built) renderer.render(api.built.scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    api.look = (mode) => {
      const cx = stageW / 2, cz = stageH / 2;
      const set = (p, t, fov = 50) => { camera.position.set(...p); controls.target.set(...t); camera.fov = fov; camera.updateProjectionMatrix(); controls.update(); };
      if (mode === "audience") set([cx, apiRef.current.deck + 11, stageH + 30], [cx, apiRef.current.deck + 4, cz]);
      if (mode === "top") set([cx, 70, cz + 0.01], [cx, 0, cz]);
      if (mode === "sr") set([-30, apiRef.current.deck + 14, cz], [cx, apiRef.current.deck + 4, cz]);
      if (mode === "sl") set([stageW + 30, apiRef.current.deck + 14, cz], [cx, apiRef.current.deck + 4, cz]);
    };
    return () => { dom.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); host.removeChild(renderer.domElement); };
  }, []);  // eslint-disable-line

  // rebuild the scene when the plan or view options change
  const first = useRef(true);
  useEffect(() => {
    const api = apiRef.current; api.deck = deckFt;
    if (api.built) api.built.scene.traverse((o) => { o.geometry?.dispose?.(); });
    api.opts = { elements, venue, stageW, stageH, deckFt, showWalls, showBeams, allBeams };
    api.outline = stageOutline(venue, stageW, stageH).map(([x, y]) => [ft(x), ft(y)]);
    api.built = buildScene(api.opts);
    if (first.current) { first.current = false; api.look("audience"); }
    // sightlines
    if (seat) {
      const r = analyseSightlines(api.built, venue, stageW, stageH, deckFt, seat);
      setSight({ pct: r.total ? Math.round((r.visible / r.total) * 100) : 0, total: r.total, hidden: r.hidden.length });
      if (r.hidden.length) {
        const pg = new THREE.BufferGeometry().setFromPoints(r.hidden);
        const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xff3355, size: 0.35 })); pts.name = "hidden"; api.built.scene.add(pts);
      }
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), new THREE.MeshBasicMaterial({ color: 0x44ddff })); marker.position.copy(seat); marker.name = "seat"; api.built.scene.add(marker);
    } else setSight(null);
  }, [elements, venue, stageW, stageH, deckFt, showWalls, showBeams, allBeams, seat]);

  const goSeat = () => {
    const api = apiRef.current; if (!seat) return; setSeatMode(true);
    api.camera.position.copy(seat); api.controls.target.set(stageW / 2, deckFt + 4, stageH / 2); api.camera.fov = 65; api.camera.updateProjectionMatrix(); api.controls.update();
  };
  // Exports are in metres (what Blender, Vision, Capture and AR viewers expect); the plan works in feet.
  const exportScene = (extra = {}) => {
    const fresh = buildScene({ ...apiRef.current.opts, ...extra }), root = new THREE.Scene(), grp = new THREE.Group();
    grp.scale.setScalar(0.3048); while (fresh.scene.children.length) grp.add(fresh.scene.children[0]); root.add(grp); return root;
  };
  const save = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); };
  const exportGLB = () => {
    new GLTFExporter().parse(exportScene(), (res) => save(new Blob([res], { type: "model/gltf-binary" }), `${projectInfo?.title || "stage"}.glb`),
      (e) => alert("Export failed: " + e), { binary: true });
  };
  // MVR: fixtures with position, aim, patch, channel and colour, plus the set and stage as glTF. No GDTF models are included, so choose the real fixture model in the receiving software.
  const exportMVR = () => {
    new GLTFExporter().parse(exportScene({ noFixtures: true }), (glb) => {
      const zip = zipSync({ "GeneralSceneDescription.xml": strToU8(buildMVRxml(elements, { title: projectInfo?.title || "Stage Designer plot", glbName: "set.glb" })), "set.glb": new Uint8Array(glb) }, { level: 6 });
      save(new Blob([zip], { type: "application/zip" }), `${projectInfo?.title || "stage"}.mvr`);
    }, (e) => alert("MVR export failed: " + e), { binary: true });
  };
  // USDZ opens in AR Quick Look on iPhone and iPad, at real size, so you can walk around the set in the room.
  const exportUSDZ = async () => {
    try { const u8 = await new USDZExporter().parseAsync(exportScene()); save(new Blob([u8], { type: "model/vnd.usdz+zip" }), `${projectInfo?.title || "stage"}.usdz`); }
    catch (e) { alert("USDZ export failed: " + e); }
  };
  const toggleWalk = () => {
    const api = apiRef.current, W = walkRef.current, cam = api.camera;
    if (!W.on) {
      const az = zones[0], sx = az ? -(venue.stageOffX || 0) + az.x + az.w / 2 : stageW / 2, sz = az ? -(venue.stageOffY || 0) + az.y + 1 : stageH + 6;
      cam.position.set(sx, 5.5, sz); cam.fov = 70; cam.updateProjectionMatrix();
      const dx = stageW / 2 - sx, dz = stageH / 2 - sz; W.yaw = Math.atan2(-dx, -dz); W.pitch = 0; W.keys = {}; W.on = true; api.controls.enabled = false; setSeatMode(false);
    } else {
      W.on = false; W.keys = {}; api.controls.enabled = true;
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir); api.controls.target.copy(cam.position).addScaledVector(dir, 12); cam.fov = 50; cam.updateProjectionMatrix();
    }
    setWalk(W.on);
  };
  const hold = (k, v) => () => { walkRef.current.keys[k] = v; };

  const btn = (active) => ({ background: active ? COLORS.accentDim : "rgba(18,22,27,0.92)", color: active ? COLORS.text : COLORS.text, border: `1px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: FONT_DISPLAY, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" });
  const lab = { fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 };
  const field = { background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "3px 5px", fontSize: 11, fontFamily: "inherit" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0B0E11", display: "flex", flexDirection: "column", color: COLORS.text, fontFamily: FONT_UI }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`, flexWrap: "wrap" }}>
        <span style={{ color: COLORS.accent, fontWeight: "bold", fontSize: 13, letterSpacing: 1 }}>3D VIEW — {projectInfo?.title || "Untitled"}</span>
        <div style={{ width: 1, height: 18, background: COLORS.border }} />
        {[["audience", "Audience"], ["top", "Top"], ["sr", "Stage R"], ["sl", "Stage L"]].map(([m, l]) => <button key={m} style={btn(false)} onClick={() => { setSeatMode(false); apiRef.current.look(m); }}>{l}</button>)}
        <div style={{ width: 1, height: 18, background: COLORS.border }} />
        <button style={btn(showBeams)} onClick={() => setShowBeams((s) => !s)}>Beams</button>
        <button style={btn(allBeams)} title="Show a beam for every fixture, straight down if it has no aim point" onClick={() => setAllBeams((s) => !s)}>All beams</button>
        <button style={btn(showWalls)} onClick={() => setShowWalls((s) => !s)}>Walls</button>
        <label style={{ fontSize: 11, color: COLORS.textDim }}>Stage height (ft) <input type="number" min="0" step="0.5" value={deckFt} onChange={(e) => setDeckFt(Math.max(0, +e.target.value))} style={{ ...field, width: 52 }} /></label>
        <div style={{ flex: 1 }} />
        <button style={btn(walk)} title="Walk through the set at eye height: drag to look, W A S D or the arrows to move" onClick={toggleWalk}>Walk</button>
        <button style={btn(false)} title="Lighting plot for Vision, Capture, grandMA3 and others: fixture positions, aim, patch and colour, plus the set. Choose the fixture models in the receiving software." onClick={exportMVR}>⬇ MVR</button>
        <button style={btn(false)} title="Opens at real size in AR Quick Look on iPhone and iPad" onClick={exportUSDZ}>AR (.usdz)</button>
        <button style={btn(false)} onClick={exportGLB}>⬇ glTF (.glb)</button>
        <button onClick={onClose} style={{ background: "transparent", color: COLORS.textDim, border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", left: 12, top: 12, width: 250, background: "rgba(22,33,62,0.94)", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 1, marginBottom: 6 }}>AUDIENCE SIGHTLINES</div>
          {zones.length === 0 ? <div style={{ fontSize: 11, color: COLORS.textDim }}>This venue has no audience zones. Add them in the Venue editor.</div> : (<>
            <div style={lab}>Seating zone</div>
            <select value={zone} onChange={(e) => setZone(+e.target.value)} style={{ ...field, width: "100%", marginBottom: 6 }}>{zones.map((z, i) => <option key={i} value={i}>{z.label || `Zone ${i + 1}`}</option>)}</select>
            <div style={lab}>Across the zone (SR to SL)</div>
            <input type="range" min="0" max="1" step="0.02" value={u} onChange={(e) => setU(+e.target.value)} style={{ width: "100%" }} />
            <div style={lab}>Front row to back row</div>
            <input type="range" min="0" max="1" step="0.02" value={v} onChange={(e) => setV(+e.target.value)} style={{ width: "100%" }} />
            <div style={lab}>Eye height above floor (ft)</div>
            <input type="number" step="0.25" min="2" value={eyeFt} onChange={(e) => setEyeFt(+e.target.value || 3.75)} style={{ ...field, width: 60 }} />
            <div style={{ marginTop: 8, fontSize: 12 }}>{sight ? <>Can see <b style={{ color: sight.pct > 85 ? "#7fd67f" : sight.pct > 60 ? "#ffcc66" : COLORS.accent }}>{sight.pct}%</b> of the stage <span style={{ color: COLORS.textDim }}>({sight.total - sight.hidden} of {sight.total} spots)</span></> : ""}</div>
            <div style={{ fontSize: 9, color: COLORS.textDim, margin: "4px 0 6px", lineHeight: 1.4 }}>Checks a 5'6" performer at each 1 ft grid point, on top of platforms. Red dots are spots this seat can't see. The blue ball is the seat.</div>
            <button style={{ ...btn(seatMode), width: "100%" }} onClick={goSeat}>View from this seat</button>
          </>)}
        </div>
        {walk && (
          <div style={{ position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)", display: "grid", gridTemplateColumns: "repeat(3,44px)", gap: 4, touchAction: "none" }}>
            {[[null], ["f", "▲"], [null], ["l", "◀"], ["b", "▼"], ["r", "▶"]].map(([k, l], i) => k ? <button key={i} style={{ ...btn(false), padding: "10px 0", fontSize: 14 }} onPointerDown={hold(k, true)} onPointerUp={hold(k, false)} onPointerLeave={hold(k, false)}>{l}</button> : <span key={i} />)}
          </div>
        )}
        <div style={{ position: "absolute", right: 12, bottom: 12, fontSize: 10, color: COLORS.textDim, background: "rgba(22,33,62,0.85)", padding: "4px 8px", borderRadius: 4 }}>{walk ? "Drag to look · W A S D / arrows or the buttons to walk (no collision)" : "Drag to orbit · right-drag to pan · scroll to zoom"}</div>
      </div>
    </div>
  );
}
