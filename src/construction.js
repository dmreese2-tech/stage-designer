// construction.js — Stage Designer construction engine (pure functions, no React).
// Turns plan elements (flats, platforms, stairs, walls) into framing parts, cut lists,
// sheet layouts and a buy list, driven by a configurable "Shop Standards" profile.
// All lengths are INCHES unless a name says otherwise. Plan elements are in px (grid px = 1 ft).

// ── Lumber table (nominal -> actual, inches) ────────────────────────────────
export const LUMBER = {
  "1x3": { t: 0.75, w: 2.5 },
  "1x4": { t: 0.75, w: 3.5 },
  "1x6": { t: 0.75, w: 5.5 },
  "2x4": { t: 1.5, w: 3.5 },
  "2x6": { t: 1.5, w: 5.5 },
  "2x12": { t: 1.5, w: 11.25 },
};

export const DEFAULT_SHOP = {
  flatStyle: "broadway",        // default for plain "flat" and wall runs
  broadwayLumber: "1x3",
  hollywoodLumber: "1x3",
  broadwayToggle: 48,           // max toggle spacing (in); toggles are spaced evenly
  hollywoodToggle: 24,
  facing: '1/4" luan',
  cover: "Muslin / canvas",
  platformFrame: "2x4",
  legLumber: "2x4",
  deck: '3/4" plywood',
  deckT: 0.75,
  joistSpacing: 16,             // on centre (in)
  maxRiser: 7.75,
  treadRun: 10,
  stringerLumber: "2x12",
  stairPanel: '3/4" plywood',
  doorW: 36,                    // default rough opening for door flats
  doorH: 80,
  flatMaxW: 48,                 // wall runs are split into flats no wider than this
  casterH: 4,                   // wagon caster height incl. plate (in)
  stockLengths: [8, 10, 12, 16], // feet
  kerf: 0.125,
  endTrim: 0.25,                // total length lost to squaring the board ends
  sheetW: 48,
  sheetL: 96,
  sheetKerf: 0.125,
  // Platforms, legs and bracing
  legSpacing: 48,               // max distance between legs on a fixed platform (in)
  wagonMidMax: 96,              // wagons up to this length get 4 casters, up to wagonLongMax get 6, longer get 8 (in)
  wagonLongMax: 144,
  braceLegs: true,              // add diagonal leg braces
  braceMinHeight: 24,           // only brace platforms at least this high (in)
  braceLumber: "1x4",
  // Triangle platforms
  triLegSpan: 72,               // add a mid-leg on a leg side longer than this (in)
  triHypLegSpan: 96,            // add a mid-leg under a hypotenuse longer than this (in)
  // Stairs
  stringerNarrow: 36,           // stairs this wide or less get 2 stringers (in)
  stringerSpacing: 24,          // wider stairs: a stringer every this many inches
  stringerAllow: 12,            // extra length added to each stringer (in)
  // Flats
  cornerBlock: 6,               // corner block leg size (in)
  keystoneW: 3, keystoneH: 6,   // keystone size (in)
  // Fasteners
  screwsPerJoint: 3, screwWaste: 1.1, deckScrewsPerSqFt: 4,
  // Curved flats, columns, soft goods
  studSpacing: 16,              // curved flat studs along the arc (in)
  skinOverlap: 1,               // skin seam overlap (in)
  minBendRadius: 36,            // warn below this radius (in)
  columnMinDia: 12,             // warn below this diameter (in)
  stiffenerCount: 4,            // column stiffeners
  seamAllow: 1,                 // soft goods seam allowance (in)
  fabricWaste: 5,               // soft goods waste (%)
  tieSpacing: 12,               // soft goods ties (in)
  ribSpacing: 24,               // curved flats and columns: rib spacing up the height (in)
  ribW: 3.5,                    // rib band width (in)
  bendSkin: '1/4" flexible plywood',
  fabricW: 54,                  // soft goods: fabric width (in)
  fullnessGather: 1.5,          // soft goods: legs and travelers (flat goods use 1.0)
  hemTop: 4, hemBottom: 4,      // soft goods: heading pocket and bottom hem allowances (in)
  confirmed: {},                // template defaults the shop has checked against its own builds
  prices: {},                   // lumber: $ per linear ft by material; sheets: $ per sheet
};

// Defaults that come from public references and general practice, not from your shop. Tick each one once you have checked it against a build you trust.
export const CHECK_ITEMS = [
  ["broadwayToggle", "Broadway toggle spacing", (s) => `${s.broadwayToggle}" max`, "Compare with the toggle spacing on a flat you have built and liked."],
  ["hollywoodToggle", "Hollywood toggle spacing", (s) => `${s.hollywoodToggle}" max`, "Hollywood flats are often tighter because the facing carries the load."],
  ["flatLumber", "Flat frame lumber", (s) => `${s.broadwayLumber} / ${s.hollywoodLumber}`, "Some shops use 1x4 or 2x4 for taller or heavier flats."],
  ["joistSpacing", "Platform joist spacing", (s) => `${s.joistSpacing}" on centre`, "Check against the load: dancers, a full cast or heavy furniture may need closer joists."],
  ["platformFrame", "Platform frame and legs", (s) => `${s.platformFrame} frame, ${s.legLumber} legs, ${s.deck} deck`, "Confirm the deck thickness for the spans you build."],
  ["legRules", "Platform legs and bracing", (s) => `a leg every ${s.legSpacing}" at most; ${s.braceLegs ? `${s.braceLumber} braces from ${s.braceMinHeight}" high` : "no braces"}; wagons ${s.wagonMidMax}" / ${s.wagonLongMax}" caster steps`, "Set under Platforms, legs and bracing below. Compare with the platforms you build."],
  ["flatHardware", "Corner blocks and keystones", (s) => `${s.cornerBlock}" corner blocks, ${s.keystoneW}×${s.keystoneH}" keystones`, "Broadway flat hardware sizes."],
  ["maxRiser", "Stair riser and tread", (s) => `${s.maxRiser}" max riser, ${s.treadRun}" tread`, "Check against your venue's code and the cast's comfort."],
  ["stringerLumber", "Stringers", (s) => `${s.stringerLumber}, ${s.stringerNarrow}" wide or less gets 2, else one every ${s.stringerSpacing}"`, "Check span and the width of the stairs."],
  ["casterH", "Wagon caster height", (s) => `${s.casterH}" including plate`, "Match the casters you actually buy."],
  ["ribSpacing", "Curved flat and column rib spacing", (s) => `${s.ribSpacing}" apart`, "New this round, from general practice; test one before building many."],
  ["fabric", "Soft goods fabric width, fullness and hems", (s) => `${s.fabricW}" wide, ${s.fullnessGather}× fullness, ${s.hemTop}" / ${s.hemBottom}" hems`, "Match your usual fabric supplier and your venue's drape standard."],
  ["doorSize", "Door opening size", (s) => `${s.doorW}" × ${s.doorH}"`, "Match the doors you hang."],
];
export const unconfirmed = (shop) => CHECK_ITEMS.filter(([k]) => !shop.confirmed?.[k]).length;

export const TEMPLATE_LABELS = {
  broadway_flat: "Broadway flat",
  hollywood_flat: "Hollywood flat",
  door_flat: "Door flat",
  platform: "Platform",
  stairs: "Stairs",
  wall_run: "Wall run (flats)",
  wagon: "Wagon (platform on casters)",
  platform_tri: "Triangle platform",
  curved_flat: "Curved flat (ribs + bending ply)",
  column: "Round column (rings + skin)",
  arch_flat: "Arch flat",
  softgoods: "Soft goods (yardage)",
};

// ── build status (shop-floor progress per piece) ────────────────────────────
export const BUILD_STAGES = [["cut", "Cut"], ["assembled", "Assembled"], ["painted", "Painted"], ["installed", "Installed"]];
export const stageProgress = (el) => {
  const st = el?.construction?.stages || {};
  return BUILD_STAGES.filter(([k]) => st[k]).length;
};
const PREFIX = { broadway_flat: "BF", hollywood_flat: "HF", door_flat: "DF", platform: "PL", stairs: "ST", wall_run: "WL", wagon: "WG", platform_tri: "TP", curved_flat: "CF", column: "CL", arch_flat: "AF", softgoods: "SG" };

// Which template choices make sense per element type
export const SOFT_TYPES = ["traveler", "leg_drape", "backdrop", "scrim"];
export function templateOptions(el) {
  if (el.type === "curved_flat") return ["curved_flat"];
  if (el.type === "column") return ["column"];
  if (el.type === "arch_flat") return ["arch_flat"];
  if (SOFT_TYPES.includes(el.type) || el.layer === "softgoods") return ["softgoods"];
  if (el.type === "flat") return ["broadway_flat", "hollywood_flat"];
  if (el.type === "door_flat") return ["door_flat"];
  if (/tri/i.test(el.type || "") || el.shape === "triangle") return ["platform_tri"];
  if (el.type === "platform") return ["platform", "wagon"];
  if (el.type === "stairs") return ["stairs"];
  if (el.type === "wall") return ["wall_run"];
  return [];
}

export function templateFor(el, shop) {
  const opts = templateOptions(el);
  if (!opts.length) return null;
  const chosen = el.construction?.template;
  if (chosen && opts.includes(chosen)) return chosen;
  if (el.type === "flat") return shop.flatStyle === "hollywood" ? "hollywood_flat" : "broadway_flat";
  return opts[0];
}

// ── formatting ──────────────────────────────────────────────────────────────
export function ftIn(inches) {
  const neg = inches < 0;
  const e = Math.round(Math.abs(inches) * 8);
  const ft = Math.floor(e / 96);
  const rem = e - ft * 96;
  const inch = Math.floor(rem / 8);
  let fr = rem % 8, d = 8, frac = "";
  if (fr) { while (fr % 2 === 0) { fr /= 2; d /= 2; } frac = `${fr}/${d}`; }
  let s;
  if (ft > 0) s = `${ft}'-${inch}${frac ? " " + frac : ""}`;           // 8'-0", 3'-10 1/2"
  else s = inch ? `${inch}${frac ? " " + frac : ""}` : frac || "0";    // 6", 3/4", 1 1/2"
  return (neg ? "-" : "") + s + '"';
}
const r8 = (x) => Math.round(x * 8) / 8;
const letterFor = (i) => (i < 26 ? String.fromCharCode(65 + i) : letterFor(Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));

// ── generator helpers ───────────────────────────────────────────────────────
const newGen = () => ({ lumber: [], sheets: [], misc: [], warnings: [], notes: [], members: [], steps: [] });
// assembly step: text may contain {key} tokens (replaced by part letters); keys = parts added in this step
const stp = (g, text, keys = [], fig = true) => g.steps.push({ text, keys, fig });
const addL = (g, key, name, material, len, qty, note = "") => { if (qty > 0 && len > 0.01) g.lumber.push({ key, name, material, len: r8(len), qty, note }); };
const addS = (g, key, name, material, w, h, qty, note = "") => { if (qty > 0) g.sheets.push({ key, name, material, w: r8(w), h: r8(h), qty, note }); };
const mem = (g, key, x, y, w, h) => g.members.push({ key, x, y, w, h });
const evenly = (n, span) => Array.from({ length: n }, (_, i) => ((i + 1) * span) / (n + 1));

// split a panel into sheet-sized pieces; returns {pw, ph, n} where pw is the across-sheet dimension
function splitPanel(a, b, shop) {
  const W = shop.sheetW, L = shop.sheetL;
  if (a <= W && b <= L) return { pw: a, ph: b, n: 1 };
  if (b <= W && a <= L) return { pw: b, ph: a, n: 1 };
  const na = Math.ceil(a / W), nb = Math.ceil(b / L);
  return { pw: a / na, ph: b / nb, n: na * nb };
}

// ── templates ───────────────────────────────────────────────────────────────
function flatCore(g, W, H, style, shop, opts = {}) {
  const lumKey = style === "broadway" ? shop.broadwayLumber : shop.hollywoodLumber;
  const lum = LUMBER[lumKey];
  const m = style === "broadway" ? lum.w : lum.t; // member face width seen from the front
  const sp = style === "broadway" ? shop.broadwayToggle : shop.hollywoodToggle;
  addL(g, "stile", "Stile", lumKey, H, 2);
  mem(g, "stile", 0, 0, m, H); mem(g, "stile", W - m, 0, m, H);
  addL(g, "rail", "Rail (top & bottom)", lumKey, W - 2 * m, 2);
  mem(g, "rail", m, 0, W - 2 * m, m); mem(g, "rail", m, H - m, W - 2 * m, m);
  const n = Math.max(0, Math.ceil(H / sp - 1e-9) - 1);
  if (n) {
    addL(g, "toggle", "Toggle", lumKey, W - 2 * m, n, `evenly spaced, ≈${ftIn(H / (n + 1))} o.c.`);
    evenly(n, H).forEach((y) => mem(g, "toggle", m, y - m / 2, W - 2 * m, m));
  }
  if (!opts.skipFinish) finish(g, W, H, style, shop, n);
  return { lumKey, m, n };
}

function finish(g, W, H, style, shop, nCross, extraKeystones = 0) {
  if (style === "broadway") {
    addS(g, "cblk", "Corner block", shop.facing, shop.cornerBlock, shop.cornerBlock, 4, `right triangle, ${shop.cornerBlock}" legs`);
    addS(g, "kstn", "Keystone", shop.facing, shop.keystoneW, shop.keystoneH, 2 * nCross + extraKeystones, "at toggle/header ends");
    g.misc.push({ name: shop.cover, qty: Math.ceil((((W + 4) * (H + 4)) / 144) * 10) / 10, unit: "sq ft", note: "cover + 2\" overage per edge" });
    g.misc.push({ name: "Wood glue + 1/4\" crown staples", qty: 1, unit: "set", note: "corner blocks, keystones, cover" });
  } else {
    const { pw, ph, n } = splitPanel(W, H, shop);
    addS(g, "face", "Facing panel", shop.facing, pw, ph, n, "glue + staple/screw to frame; trim flush");
    g.misc.push({ name: "Wood glue + 1-1/4\" screws or staples", qty: 1, unit: "set", note: "frame + facing" });
  }
}

function flatSteps(g, style, shop, hasToggle, door = false) {
  const sp = style === "broadway" ? shop.broadwayToggle : shop.hollywoodToggle;
  stp(g, "Cut every part to the cut list. Label each with the piece ID and part letter before assembling.", [], false);
  if (style === "broadway") {
    stp(g, "Lay the stiles {stile} parallel on a flat floor, face down, and set the rails {rail} between them at the top and bottom, flush with the ends." + (door ? " Fit the header {header} at the opening height." : ""), ["stile", "rail", ...(door ? ["header"] : [])]);
  } else {
    stp(g, "Stand the stiles {stile} on edge and fit the rails {rail} between them, flush at the ends. Glue each joint and fasten with two screws or staples." + (door ? " Fit the header {header} at the opening height." : ""), ["stile", "rail", ...(door ? ["header"] : [])]);
  }
  if (door) stp(g, "Fit the jack studs {jack}, bottom rails {brail} and any side toggles {stog} around the opening. Check the opening size before fastening.", ["jack", "brail", "stog"]);
  if (hasToggle) stp(g, `Mark the toggle positions (no more than ${sp}" apart, evenly spaced) and fit the toggles {toggle}{utog}.`, ["toggle", "utog"]);
  stp(g, "Square the frame: measure both diagonals and adjust until they match within 1/16\". Tack each corner before final fastening.", []);
  if (style === "broadway") {
    stp(g, "Glue and staple the corner blocks {cblk}, set back about 3/4\" from the outside edges, grain across the joint.", ["cblk"]);
    stp(g, "Glue and staple the keystones {kstn} over the toggle and header ends.", ["kstn"]);
    stp(g, `Turn the frame over. Stretch the ${shop.cover} over the face, glue and staple the edges, and trim. Label the piece ID on the back.`, [], false);
  } else {
    stp(g, `Lay the facing {face} on the frame (good side up), glue and fasten, and keep it flush at the edges.`, ["face"]);
    stp(g, "Trim flush, fill and sand the edges. Label the piece ID on the back.", [], false);
  }
}

function genFlat(g, W, H, style, shop) {
  const { lumKey, n } = flatCore(g, W, H, style, shop);
  flatSteps(g, style, shop, n > 0);
  g.draw = { kind: "flat", W, H, style, depth: style === "broadway" ? LUMBER[lumKey].t : LUMBER[lumKey].w };
  g.notes.push(`Frame: ${lumKey} ${style === "broadway" ? "laid flat (on face)" : "on edge"}; finished depth ${ftIn(style === "broadway" ? LUMBER[lumKey].t : LUMBER[lumKey].w + 0.25)}.`);
}

function genDoorFlat(g, W, H, style, shop, openW, openH) {
  const lumKey = style === "broadway" ? shop.broadwayLumber : shop.hollywoodLumber;
  const lum = LUMBER[lumKey];
  const m = style === "broadway" ? lum.w : lum.t;
  const sp = style === "broadway" ? shop.broadwayToggle : shop.hollywoodToggle;
  const side = (W - openW) / 2;
  if (side < m) g.warnings.push(`Opening ${ftIn(openW)} is too wide for a ${ftIn(W)} flat. Widen the flat (≥ ${ftIn(openW + 2 * m)}) or narrow the opening.`);
  const jack = side >= 2 * m ? m : 0;
  if (!jack && side >= m) g.warnings.push(`Narrow side returns (${ftIn(side)}): jack studs omitted. Use a flat ≥ ${ftIn(openW + 4 * m)} for a stiffer frame.`);
  if (openH > H - 2 * m) g.warnings.push(`Opening height ${ftIn(openH)} leaves no room for the header in a ${ftIn(H)} flat.`);
  addL(g, "stile", "Stile", lumKey, H, 2);
  mem(g, "stile", 0, 0, m, H); mem(g, "stile", W - m, 0, m, H);
  addL(g, "rail", "Top rail", lumKey, W - 2 * m, 1); mem(g, "rail", m, H - m, W - 2 * m, m);
  addL(g, "header", "Header", lumKey, W - 2 * m, 1, `underside at ${ftIn(openH)}`); mem(g, "header", m, openH, W - 2 * m, m);
  if (jack) {
    addL(g, "jack", "Jack stud", lumKey, openH, 2);
    mem(g, "jack", side - m, 0, m, openH); mem(g, "jack", side + openW, 0, m, openH);
  }
  const brLen = side - m - jack;
  if (brLen > 0.5) {
    addL(g, "brail", "Bottom rail (each side of opening)", lumKey, brLen, 2);
    mem(g, "brail", m, 0, brLen, m); mem(g, "brail", W - m - brLen, 0, brLen, m);
  }
  const nSide = brLen > 0.5 ? Math.max(0, Math.ceil((openH - m) / sp - 1e-9) - 1) : 0;
  if (nSide && brLen > 0.5) {
    addL(g, "stog", "Side toggle", lumKey, brLen, 2 * nSide);
    evenly(nSide, openH).forEach((y) => { mem(g, "stog", m, y - m / 2, brLen, m); mem(g, "stog", W - m - brLen, y - m / 2, brLen, m); });
  }
  const gap = H - openH - 2 * m;
  const nUp = gap > 0 ? Math.max(0, Math.ceil(gap / sp - 1e-9) - 1) : 0;
  if (nUp) {
    addL(g, "utog", "Upper toggle", lumKey, W - 2 * m, nUp);
    evenly(nUp, gap).forEach((y) => mem(g, "utog", m, openH + m + y - m / 2, W - 2 * m, m));
  }
  finish(g, W, H, style, shop, nUp + 1 + nSide, 0);
  flatSteps(g, style, shop, nSide + nUp > 0, true);
  g.draw = { kind: "flat", W, H, style, depth: style === "broadway" ? lum.t : lum.w, opening: { x: side, y: 0, w: openW, h: openH } };
  g.notes.push(`Rough opening ${ftIn(openW)} × ${ftIn(openH)}. ${style === "hollywood" ? "Cut the opening out of the facing." : "Door unit / hinges supplied separately."}`);
}

function genPlatform(g, L, Wd, heightIn, shop, opts = {}) {
  const fk = shop.platformFrame, fr = LUMBER[fk];
  const deckT = shop.deckT, fw = fr.w, ft = fr.t;
  addL(g, "rimL", "Rim (long)", fk, L, 2);
  addL(g, "rimS", "Rim (short)", fk, Wd - 2 * ft, 2);
  const nj = Math.max(0, Math.ceil(L / shop.joistSpacing - 1e-9) - 1);
  addL(g, "joist", "Joist", fk, Wd - 2 * ft, nj, `≈${ftIn(L / (nj + 1))} o.c.`);
  const wag = !!opts.wagon, cH = wag ? shop.casterH || 0 : 0;
  const legLen = heightIn - deckT - fw - cH;
  const nC = L <= shop.wagonMidMax ? 4 : L <= shop.wagonLongMax ? 6 : 8;
  const nx = wag ? nC / 2 : Math.ceil(L / shop.legSpacing) + 1, ny = wag ? 2 : Math.ceil(Wd / shop.legSpacing) + 1;
  let nLegs = 0, nBrace = 0;
  if (legLen >= 1) {
    nLegs = nx * ny;
    addL(g, "leg", "Leg", shop.legLumber, legLen, nLegs, wag ? "caster mounts to the bottom of each leg" : "square cut, screwed inside rim");
    if (shop.braceLegs && heightIn >= shop.braceMinHeight) {
      const bayX = L / (nx - 1), bayY = Wd / (ny - 1), drop = Math.max(6, legLen - 4);
      const bL = Math.ceil(Math.hypot(bayX, drop)), bS = Math.ceil(Math.hypot(bayY, drop));
      addL(g, "braceL", "Leg brace (long sides)", shop.braceLumber, bL, 2 * (nx - 1), "diagonal; trim to fit on site");
      addL(g, "braceS", "Leg brace (ends)", shop.braceLumber, bS, 2 * (ny - 1), "diagonal; trim to fit on site");
      nBrace = 2 * (nx - 1) + 2 * (ny - 1);
    }
  } else {
    g.warnings.push(wag
      ? `Height ${ftIn(heightIn)} leaves no room for legs under the frame (frame + deck + casters = ${ftIn(fw + deckT + cH)}). Casters bolt straight to the frame; the deck will sit at ${ftIn(fw + deckT + cH)}.`
      : `Height ${ftIn(heightIn)} is at or below the frame + deck depth (${ftIn(fw + deckT)}): no legs, platform sits on the floor at ${ftIn(fw + deckT)}.`);
  }
  if (wag) g.misc.push({ name: `${cH}" locking swivel casters`, qty: nC, unit: "ea", note: "check the load rating against the cast + set weight" }, { name: "Caster bolts / lag screws + washers", qty: nC * 4, unit: "ea", note: "4 per caster" });
  const { pw, ph, n } = splitPanel(Wd, L, shop);
  addS(g, "deck", "Deck panel", shop.deck, pw, ph, n, n > 1 ? "stagger seams over joists" : "");
  const joints = 4 + nj * 2 + nLegs * 2 + nBrace * 2;
  g.misc.push({ name: '3" construction screws (est.)', qty: Math.ceil(joints * shop.screwsPerJoint * shop.screwWaste), unit: "ea", note: "frame, legs, braces" });
  g.misc.push({ name: '1-5/8" deck screws (est.)', qty: Math.ceil(((L * Wd) / 144) * shop.deckScrewsPerSqFt), unit: "ea", note: `≈${shop.deckScrewsPerSqFt} per sq ft` });
  g.draw = { kind: "platform", L, W: Wd, heightIn, nj, nx, ny, legLen, deckT, fw, ft, legs: legLen >= 1, wagon: wag, braced: nBrace > 0 };
  g.notes.push(`Deck height ${ftIn(heightIn)} (top of deck). Frame ${fk} on edge, joists ≈${shop.joistSpacing}" o.c.`);
  stp(g, "Cut every part to the cut list. Label each with the piece ID and part letter.", [], false);
  stp(g, "Build the rim frame: set the short rims {rimS} between the long rims {rimL}, glue and drive two 3\" screws through each joint.", ["rimL", "rimS"]);
  if (nj) stp(g, `Mark the joist positions (about ${shop.joistSpacing}" o.c.) and fit the joists {joist}, driving screws through the rims.`, ["joist"]);
  stp(g, "Square the frame: both diagonals must match within 1/8\".", []);
  if (legLen >= 1) stp(g, wag ? "Fasten a leg {leg} under each caster position, screwed into the frame." : "Fasten the legs {leg} under the frame at the corners and along the sides, screwed and glued into the rims.", ["leg"]);
  if (nBrace) stp(g, "Cut the braces {braceL}{braceS} to fit on site and fasten them diagonally between the legs and the frame.", ["braceL", "braceS"], false);
  if (wag) stp(g, `Bolt the ${nC} locking casters to the bottom of the ${legLen >= 1 ? "legs" : "frame"}, with washers.`, []);
  stp(g, "Lay the deck {deck} on the frame, stagger the seams over joists, and screw every 8\" around the edges and 12\" in the field.", ["deck"]);
  stp(g, "Check for rock and level, shim or trim any leg, and mark the piece ID on the underside.", [], false);
}

function genStairs(g, width, depth, rise, shop) {
  const n = Math.max(1, Math.ceil(rise / shop.maxRiser - 1e-9));
  const riser = rise / n, run = shop.treadRun, treads = n - 1, totalRun = treads * run;
  if (rise <= 0) { g.warnings.push("Set a total rise greater than 0."); }
  if (Math.abs(depth - totalRun) > 1) g.warnings.push(`Plan depth ${ftIn(depth)} ≠ required ${ftIn(totalRun)} (${treads} treads × ${run}"). Resize the footprint to match.`);
  const nStr = width <= shop.stringerNarrow ? 2 : Math.ceil(width / shop.stringerSpacing) + 1;
  const hyp = Math.ceil(Math.hypot(rise, totalRun) + shop.stringerAllow);
  addL(g, "stringer", "Stringer", shop.stringerLumber, hyp, nStr, "layout: " + `${treads} treads, ${n} risers; add ${shop.stringerAllow}" allowance`);
  addL(g, "cleat", "Base cleat", shop.platformFrame, width - 3, 1);
  const tp = splitPanel(width, run, shop);
  addS(g, "tread", "Tread", shop.stairPanel, tp.pw, tp.ph, treads * tp.n);
  const rp = splitPanel(width, riser, shop);
  addS(g, "riser", "Riser", shop.stairPanel, rp.pw, rp.ph, n * rp.n);
  g.misc.push({ name: '2-1/2" screws (est.)', qty: Math.ceil((treads * nStr + n * nStr) * 2 + 8), unit: "ea", note: "treads, risers, cleat" });
  g.draw = { kind: "stairs", width, depth: totalRun, rise, n, riser, run, nStr };
  stp(g, "Cut every part to the cut list. Label each with the piece ID and part letter.", [], false);
  stp(g, `Lay out one stringer {stringer} with a framing square: ${n} risers at ${riser.toFixed(2)}" and ${treads} treads at ${run}" run. Cut it and test-fit.`, ["stringer"]);
  stp(g, "Trace the first stringer onto the others and cut them. Cut the bottom of each stringer so the first riser is the same height as the others.", ["stringer"]);
  stp(g, "Fasten the base cleat {cleat} across the stringers at the bottom, square to the stringers.", ["cleat"]);
  stp(g, "Fasten the risers {riser} and then the treads {tread}, glue and screw into every stringer.", ["riser", "tread"]);
  stp(g, "Set the unit against the platform, check it for level and rock, and fasten it to the platform edge.", [], false);
  g.notes.push(`${n} risers @ ${riser.toFixed(2)}", ${treads} treads @ ${run}" run; top step is the platform deck.`);
}

function genPlatformTri(g, A, B, heightIn, shop) {
  const fk = shop.platformFrame, fr = LUMBER[fk], deckT = shop.deckT, fw = fr.w, ft = fr.t;
  const hyp = Math.hypot(A, B), ang = (Math.atan2(B, A) * 180) / Math.PI;
  addL(g, "rimA", "Rim (long leg)", fk, A, 1);
  addL(g, "rimB", "Rim (short leg)", fk, B - ft, 1);
  addL(g, "rimH", "Rim (hypotenuse)", fk, Math.ceil(hyp), 1, `mitre both ends at ${ang.toFixed(1)}° / ${(90 - ang).toFixed(1)}°; trim to fit`);
  const joists = [];
  for (let x = shop.joistSpacing; x < A - ft; x += shop.joistSpacing) {
    const len = B * (1 - x / A) - ft - (ft * hyp) / A;
    if (len >= 3) joists.push({ x, len: Math.round(len * 8) / 8 });
  }
  joists.forEach((j, i) => addL(g, `j${i}`, `Joist ${i + 1}`, fk, j.len, 1, `${ftIn(j.x)} from the square corner`));
  const legLen = heightIn - deckT - fw;
  const legPts = [[0, 0], [A, 0], [0, B]];
  if (A > shop.triLegSpan) legPts.push([A / 2, 0]);
  if (B > shop.triLegSpan) legPts.push([0, B / 2]);
  if (hyp > shop.triHypLegSpan) legPts.push([A / 2, B / 2]);
  if (legLen >= 1) addL(g, "leg", "Leg", shop.legLumber, legLen, legPts.length, "square cut, screwed inside rim");
  else g.warnings.push(`Height ${ftIn(heightIn)} is at or below the frame + deck depth (${ftIn(fw + deckT)}): no legs.`);
  const { pw, ph, n } = splitPanel(B, A, shop);
  addS(g, "deck", "Deck panel (bounding rectangle)", shop.deck, pw, ph, n, "cut along the diagonal; the offcut triangle can be used for another piece");
  g.misc.push({ name: '3" construction screws (est.)', qty: Math.ceil((3 + joists.length * 2 + legPts.length * 2) * shop.screwsPerJoint * shop.screwWaste), unit: "ea", note: "frame, legs" });
  g.misc.push({ name: '1-5/8" deck screws (est.)', qty: Math.ceil(((A * B) / 2 / 144) * shop.deckScrewsPerSqFt), unit: "ea", note: `≈${shop.deckScrewsPerSqFt} per sq ft` });
  g.draw = { kind: "tri", A, B, hyp, ang, heightIn, joists, legPts, legLen, fw, ft, deckT };
  g.notes.push(`Right-triangle platform, legs ${ftIn(A)} and ${ftIn(B)}, hypotenuse ${ftIn(hyp)}. Assumes the plan bounding box has its square corner at the lower left.`);
  g.notes.push(`Deck height ${ftIn(heightIn)} (top of deck). Joist lengths vary and are listed one by one.`);
  stp(g, "Cut every part to the cut list. Mark each joist with its number.", [], false);
  stp(g, "Fasten the short-leg rim {rimB} to the long-leg rim {rimA} at the square corner with glue and 3\" screws.", ["rimA", "rimB"]);
  stp(g, "Check the corner with a framing square, then lay the hypotenuse rim {rimH} across and fasten it at the mitred ends.", ["rimH"]);
  stp(g, "Fit each joist from the long rim to the hypotenuse rim at the marked positions, driving screws through both rims.", joists.map((_, i) => `j${i}`));
  if (legLen >= 1) stp(g, "Fasten the legs {leg} under the corners and any extra positions shown on the plan.", ["leg"]);
  stp(g, "Lay the deck panel {deck} over the frame, mark the diagonal from underneath, cut it, and screw it down every 8\" at the edges and 12\" in the field.", ["deck"]);
}


// ── curved flat: plywood ribs on an arc, studs between, bending-ply skin ─────
function arcHeightRange(R, x1, x2) {          // sagitta drop d(x) = R - sqrt(R²-x²), apex at x = 0
  const d = (x) => R - Math.sqrt(Math.max(0, R * R - x * x));
  const a = d(x1), b = d(x2), lo = x1 < 0 && x2 > 0 ? 0 : Math.min(a, b);
  return Math.max(a, b) - lo;
}
function genCurvedFlat(g, C, s, H, shop) {
  if (s < 1) { g.warnings.push("Set a curve depth (the plan height of the piece) of at least 1 in. Treated as a straight flat."); s = 1; }
  if (s > C / 2) { g.warnings.push(`Curve depth ${ftIn(s)} is more than half the chord ${ftIn(C)}: that is deeper than a half circle. Treated as a half circle.`); s = C / 2; }
  const R = (C * C / 4 + s * s) / (2 * s), half = Math.asin(Math.min(1, C / (2 * R))), Larc = 2 * R * half;
  if (R < shop.minBendRadius) g.warnings.push(`Radius ${ftIn(R)} is tight for ${shop.bendSkin}. Test-bend a scrap, or use two thin layers.`);
  const nRib = Math.max(2, Math.ceil(H / shop.ribSpacing - 1e-9) + 1);
  const nSeg = Math.max(1, Math.ceil(C / shop.sheetL - 1e-9));
  let bh = 0;
  for (let i = 0; i < nSeg; i++) bh = Math.max(bh, arcHeightRange(R, -C / 2 + (i * C) / nSeg, -C / 2 + ((i + 1) * C) / nSeg));
  addS(g, "rib", "Rib (arc, cut from sheet)", shop.deck, C / nSeg, bh + shop.ribW, nRib * nSeg, nSeg > 1 ? `each rib is ${nSeg} segments; splice with a plywood plate` : "cut the arc with a trammel and jigsaw, then cut the inside arc to leave a band");
  const nStud = Math.ceil(Larc / shop.studSpacing) + 1;
  addL(g, "stud", "Stud (between top and bottom ribs)", shop.broadwayLumber, H - 2 * shop.deckT, nStud, `≈${ftIn(Larc / (nStud - 1))} apart along the arc`);
  const sk = splitPanel(Larc + shop.skinOverlap, H, shop);
  addS(g, "skin", "Skin (bends around the ribs)", shop.bendSkin, sk.pw, sk.ph, sk.n, `bend across the grain; ${shop.skinOverlap}" overlap at seams`);
  g.misc.push({ name: '1-1/4" screws (est.)', qty: Math.ceil((nRib * nStud + nStud * 2) * 2 * 1.1), unit: "ea", note: "ribs to studs" });
  g.misc.push({ name: "Wood glue", qty: 1, unit: "bottle", note: "ribs, studs and skin" });
  g.draw = { kind: "curved", C, s, R, Larc, H, nRib, nStud, half, nSeg, ribW: shop.ribW };
  g.notes.push(`Chord ${ftIn(C)}, curve depth ${ftIn(s)}, radius ${ftIn(R)}, arc length ${ftIn(Larc)}. The arch bulges toward the top edge of the plan piece (upstage when unrotated); use Rotation to turn it.`);
  stp(g, "Cut every rib {rib} on the arc, using a trammel set to the radius on the drawing. Cut a second set from the same pattern so they match.", [], false);
  stp(g, "Cut the studs {stud} to length and mark the rib positions on them.", [], false);
  stp(g, "Build the frame flat on the floor: screw and glue a rib to each end of every stud, bottom and top first, then intermediate ribs.", [], false);
  stp(g, "Square the frame and check the arc against a string from the radius point.", [], false);
  stp(g, "Glue and tack the skin {skin} to the first rib edge, then bend it around the arc and fasten it to every rib and stud. Overlap seams by 1 inch over a stud.", [], false);
  stp(g, "Fill, sand and prime. Mark the piece ID inside.", [], false);
}

// ── round column: plywood rings, skin and stiffeners ─────────────────────────
function genColumn(g, D, H, shop) {
  if (D < shop.columnMinDia) g.warnings.push(`Diameter ${ftIn(D)} is small for a built-up column. A cardboard form tube is usually easier at this size.`);
  const nRing = Math.ceil(H / shop.ribSpacing - 1e-9) + 1;
  addS(g, "ring", "Ring (disc or ring cut from sheet)", shop.deck, D, D, nRing, `cut a ${ftIn(D - 1.5)} disc or a ${ftIn(D)} outer ring; rings ≈${shop.ribSpacing}" apart`);
  const circ = Math.PI * D + shop.skinOverlap, sk = splitPanel(circ, H, shop);
  addS(g, "skin", "Skin (wraps the rings)", shop.bendSkin, sk.pw, sk.ph, sk.n, `circumference ${ftIn(circ - 1)} plus 1" overlap`);
  addL(g, "stiff", "Stiffener (vertical)", shop.broadwayLumber, H - 2 * shop.deckT, shop.stiffenerCount, `${shop.stiffenerCount} around the circle, between the rings`);
  g.misc.push({ name: '1-1/4" screws (est.)', qty: Math.ceil(nRing * 8 + 40), unit: "ea", note: "rings, stiffeners, skin" });
  g.draw = { kind: "column", D, H, nRing, ribW: shop.ribW };
  g.notes.push(`Diameter ${ftIn(D)}, height ${ftIn(H)}, ${nRing} rings. A cardboard concrete form tube of the same diameter can replace the rings and skin.`);
  stp(g, "Cut the rings {ring}. Mark four evenly spaced stiffener positions on each.", [], false);
  stp(g, "Stand two rings at the ends and join them with the four stiffeners {stiff}, then add the intermediate rings.", [], false);
  stp(g, "Wrap the skin {skin} around the rings starting at a stiffener, glue and tack it, and overlap the seam by 1 inch.", [], false);
  stp(g, "Fill the seam, sand and prime.", [], false);
}

// ── arch flat: a door flat plus plywood spandrels that cut the arch ──────────
function genArchFlat(g, W, H, style, shop, openW, openH, rise) {
  genDoorFlat(g, W, H, style, shop, openW, openH);
  const lumKey = style === "broadway" ? shop.broadwayLumber : shop.hollywoodLumber;
  if (rise > openH - 6) { g.warnings.push(`Arch rise ${ftIn(rise)} is too tall for an opening ${ftIn(openH)} high. Reduced to ${ftIn(openH - 6)}.`); rise = openH - 6; }
  if (rise > openW / 2) g.warnings.push(`Arch rise ${ftIn(rise)} is more than half the opening width, so the arch is taller than a semicircle. Check the drawing.`);
  addS(g, "span", "Arch spandrel (corner piece)", shop.stairPanel, openW / 2, rise, 2, "cut the arc with a trammel, then fasten under the header and against the jack stud");
  g.draw.opening.arch = rise;
  g.notes.push(`The header sits at the top of the opening (${ftIn(openH)}). Each spandrel fills the corner above the arc, ${ftIn(openW / 2)} wide by ${ftIn(rise)} high. The arch springs at ${ftIn(openH - rise)}.`);
  stp(g, "Cut the arch corners {span} on the arc and fasten them to the header and the jack studs, with the curve facing the opening.", [], false);
  void lumKey;
}

// ── soft goods: fabric yardage and hardware ──────────────────────────────────
function genSoftGoods(g, W, H, type, shop, fullnessOverride) {
  const fw = shop.fabricW, full = fullnessOverride > 0 ? fullnessOverride : type === "traveler" || type === "leg_drape" ? shop.fullnessGather : 1;
  const usable = fw - shop.seamAllow, panels = Math.max(1, Math.ceil((W * full) / usable - 1e-9));
  const cutLen = H + shop.hemTop + shop.hemBottom;
  const yd = Math.ceil(((panels * cutLen) / 36) * (1 + shop.fabricWaste / 100) * 2) / 2;
  g.misc.push({ name: `Flame-retardant fabric, ${fw}" wide`, qty: yd, unit: "yd", note: `${panels} panel(s) × ${ftIn(cutLen)}, +${shop.fabricWaste}% waste` });
  g.misc.push({ name: "Heading webbing / tape", qty: Math.ceil(W / 12), unit: "ft", note: "sewn across the top" });
  g.misc.push({ name: "Tie lines (36 in)", qty: Math.ceil(W / shop.tieSpacing) + 1, unit: "ea", note: `about one per ${shop.tieSpacing}"` });
  if (type !== "backdrop" && type !== "scrim") g.misc.push({ name: "Weight chain or pipe for hem", qty: Math.ceil(W / 12), unit: "ft", note: "bottom hem pocket" });
  g.draw = { kind: "soft", W, H, full, panels, cutLen, yd };
  g.notes.push(`Finished ${ftIn(W)} × ${ftIn(H)}, fullness ${full}×, so ${ftIn(W * full)} of fabric across. ${panels} panel(s) of ${ftIn(cutLen)} (includes ${shop.hemTop}" heading and ${shop.hemBottom}" bottom hem).`);
  g.notes.push("Buy flame-retardant fabric, or have it treated, and keep the certificate for the venue.");
  stp(g, "Cut the panels to the cut length from one dye lot. Keep the nap or weave direction the same on every panel.", [], false);
  stp(g, `Sew the ${panels} panel(s) together with a ${shop.seamAllow}" seam, pressing seams to one side.`, [], false);
  stp(g, "Sew the heading webbing across the top and the side and bottom hems.", [], false);
  stp(g, "Attach the tie lines and any weight chain, then steam out the creases and hang for a day before use.", [], false);
}

// ── element → piece ─────────────────────────────────────────────────────────
function pieceHeight(el, fallback) {
  const h = el.construction?.heightIn;
  if (h > 0) return h;
  if (el.elevation > 0 && (el.type === "platform" || el.type === "stairs" || /tri/i.test(el.type || ""))) return el.elevation;
  if (el.height > 0 && !(el.type === "platform" || el.type === "stairs" || /tri/i.test(el.type || ""))) return el.height;   // piece height (in) set in the Properties panel
  return fallback;
}

function makePiece(el, tpl, shop, grid) {
  const g = newGen();
  const a = r8((el.w / grid) * 12), b = r8((el.h / grid) * 12);
  const style = el.construction?.style || (tpl === "hollywood_flat" ? "hollywood" : tpl === "broadway_flat" ? "broadway" : shop.flatStyle);
  let dims = "";
  let mult = 1;
  if (tpl === "broadway_flat" || tpl === "hollywood_flat") {
    const W = Math.max(a, b), H = pieceHeight(el, 96);
    genFlat(g, W, H, tpl === "hollywood_flat" ? "hollywood" : "broadway", shop);
    dims = `${ftIn(W)} W × ${ftIn(H)} H`;
  } else if (tpl === "door_flat") {
    const W = Math.max(a, b), H = pieceHeight(el, 96);
    const ow = el.construction?.openW || shop.doorW, oh = el.construction?.openH || shop.doorH;
    genDoorFlat(g, W, H, style, shop, ow, oh);
    dims = `${ftIn(W)} W × ${ftIn(H)} H`;
  } else if (tpl === "platform" || tpl === "wagon") {
    const L = Math.max(a, b), Wd = Math.min(a, b), h = pieceHeight(el, 24);
    genPlatform(g, L, Wd, h, shop, { wagon: tpl === "wagon" });
    dims = `${ftIn(L)} × ${ftIn(Wd)} @ ${ftIn(h)}`;
  } else if (tpl === "platform_tri") {
    const A = Math.max(a, b), B = Math.min(a, b), h = pieceHeight(el, 24);
    genPlatformTri(g, A, B, h, shop);
    dims = `${ftIn(A)} × ${ftIn(B)} triangle @ ${ftIn(h)}`;
  } else if (tpl === "stairs") {
    const rise = pieceHeight(el, 24);
    genStairs(g, a, b, rise, shop);
    dims = `${ftIn(a)} wide, rise ${ftIn(rise)}`;
  } else if (tpl === "curved_flat") {
    const C = Math.max(a, b), sg = Math.min(a, b), H = pieceHeight(el, 96);
    genCurvedFlat(g, C, sg, H, shop);
    dims = `${ftIn(C)} chord × ${ftIn(H)} H, curve depth ${ftIn(sg)}`;
  } else if (tpl === "column") {
    const D = Math.max(a, b), H = pieceHeight(el, 96);
    genColumn(g, D, H, shop);
    dims = `Ø ${ftIn(D)} × ${ftIn(H)} H`;
  } else if (tpl === "arch_flat") {
    const W = Math.max(a, b), H = pieceHeight(el, 96);
    const ow = el.construction?.openW || shop.doorW, oh = el.construction?.openH || shop.doorH, rise = el.construction?.archRise || ow / 2;
    genArchFlat(g, W, H, style, shop, ow, oh, rise);
    dims = `${ftIn(W)} W × ${ftIn(H)} H, arch opening ${ftIn(ow)} × ${ftIn(oh)}`;
  } else if (tpl === "softgoods") {
    const W = Math.max(a, b), H = pieceHeight(el, 144);
    genSoftGoods(g, W, H, el.type, shop, el.construction?.fullness);
    dims = `${ftIn(W)} W × ${ftIn(H)} H`;
  } else if (tpl === "wall_run") {
    const len = r8((Math.hypot((el.x2 || 0) - (el.x1 || 0), (el.y2 || 0) - (el.y1 || 0)) / grid) * 12);
    const H = pieceHeight(el, 96);
    mult = Math.max(1, Math.ceil(len / shop.flatMaxW - 1e-9));
    const W = r8(len / mult);
    genFlat(g, W, H, style, shop);
    g.lumber.forEach((p) => (p.qty *= mult));
    g.sheets.forEach((p) => (p.qty *= mult));
    g.misc.forEach((p) => (p.qty = typeof p.qty === "number" && p.unit !== "set" ? r8(p.qty * mult) : p.qty));
    g.notes.unshift(`Wall run ${ftIn(len)} built as ${mult} flat(s) of ${ftIn(W)}; drawing shows one flat.`);
    dims = `${ftIn(len)} long × ${ftIn(H)} H (${mult} × ${ftIn(W)})`;
  }
  // letters
  let k = 0; const letters = {};
  [...g.lumber, ...g.sheets].forEach((p) => { p.letter = letters[p.key] = letterFor(k++); });
  g.members.forEach((m) => (m.letter = letters[m.key]));
  g.steps.forEach((s) => (s.text = s.text.replace(/\{(\w+)\}/g, (_, k) => (letters[k] ? `[${letters[k]}]` : "")).replace(/\s+([.,;])/g, "$1").replace(/ {2,}/g, " ")));
  return { template: tpl, dims, mult, ...g, letters };
}

export function buildAll(elements, shop, grid = 20) {
  const counters = {}, pieces = [], others = [];
  for (const el of elements) {
    if (el.category !== "set" && el.layer !== "softgoods" && el.layer !== "set" && el.category !== "softgoods") continue;
    if (el.construction?.skip) { others.push({ el, reason: "Skipped by you" }); continue; }
    const tpl = templateFor(el, shop);
    if (!tpl) { others.push({ el, reason: el.layer === "softgoods" ? "Soft goods" : "No build template (prop / furniture / custom)" }); continue; }
    const prefix = PREFIX[tpl];
    counters[prefix] = (counters[prefix] || 0) + 1;
    const id = `${prefix}-${String(counters[prefix]).padStart(2, "0")}`;
    const p = makePiece(el, tpl, shop, grid);
    pieces.push({ id, elId: el.id, el, name: el.label || TEMPLATE_LABELS[tpl], ...p });
  }
  return { pieces, others };
}

// ── cut-list optimisation ───────────────────────────────────────────────────
function packLinear(parts, shop, preferredFt) {
  const stocks = [...shop.stockLengths].sort((a, b) => a - b);
  const cap = (s) => s * 12 - shop.endTrim;
  const sorted = [...parts].sort((a, b) => b.len - a.len);
  const boards = [], bad = [];
  for (const p of sorted) {
    const need = p.len + shop.kerf;
    let best = null, bestRem = Infinity;
    for (const b of boards) {
      const rem = cap(b.stock) - b.used;
      if (rem >= need - 1e-9 && rem < bestRem) { best = b; bestRem = rem; }
    }
    if (best) { best.used += need; best.cuts.push(p); continue; }
    const s = stocks.find((x) => cap(x) >= need - 1e-9 && x >= preferredFt) ?? stocks.find((x) => cap(x) >= need - 1e-9);
    if (!s) { bad.push(p); continue; }
    boards.push({ stock: s, used: need, cuts: [p] });
  }
  boards.forEach((b) => { b.stock = stocks.find((s) => cap(s) >= b.used - 1e-9) ?? b.stock; });
  return { boards, bad };
}

function planLinear(parts, shop) {
  let best = null;
  for (const pref of [...shop.stockLengths].sort((a, b) => a - b)) {
    const r = packLinear(parts, shop, pref);
    const total = r.boards.reduce((s, b) => s + b.stock, 0);
    if (!best || total < best.total || (total === best.total && r.boards.length < best.r.boards.length)) best = { r, total };
  }
  return best.r;
}

function packSheets(items, shop) {
  const W = shop.sheetW, L = shop.sheetL, k = shop.sheetKerf;
  const sorted = [...items].sort((a, b) => b.h - a.h || b.w - a.w);
  const sheets = [], oversize = [];
  for (const it of sorted) {
    if (it.w > W + 1e-6 || it.h > L + 1e-6) { oversize.push(it); continue; }
    let placed = false;
    for (const sh of sheets) {
      for (const shelf of sh.shelves) {
        if (it.h <= shelf.h + 1e-6 && shelf.x + it.w + k <= W + 1e-6) {
          sh.items.push({ ...it, x: shelf.x, y: shelf.y }); shelf.x += it.w + k; placed = true; break;
        }
      }
      if (!placed && sh.y + it.h + k <= L + 1e-6) {
        sh.shelves.push({ y: sh.y, h: it.h, x: it.w + k });
        sh.items.push({ ...it, x: 0, y: sh.y }); sh.y += it.h + k; placed = true;
      }
      if (placed) break;
    }
    if (!placed) {
      sheets.push({ y: it.h + k, shelves: [{ y: 0, h: it.h, x: it.w + k }], items: [{ ...it, x: 0, y: 0 }] });
    }
  }
  return { sheets, oversize };
}


export function planAll(result, shop) {
  const linear = {}, sheetsIn = {}, miscMap = {};
  for (const pc of result.pieces) {
    for (const p of pc.lumber) for (let i = 0; i < p.qty; i++) (linear[p.material] ||= []).push({ len: p.len, pieceId: pc.id, letter: p.letter, name: p.name });
    for (const p of pc.sheets) for (let i = 0; i < p.qty; i++) (sheetsIn[p.material] ||= []).push({ w: p.w, h: p.h, pieceId: pc.id, letter: p.letter, name: p.name });
    for (const m of pc.misc) {
      const key = m.name + "|" + m.unit;
      const cur = (miscMap[key] ||= { name: m.name, unit: m.unit, qty: 0, notes: new Set() });
      cur.qty += m.qty; if (m.note) cur.notes.add(m.note);
    }
  }
  const lumber = Object.entries(linear).map(([material, parts]) => {
    const { boards, bad } = planLinear(parts, shop);
    const byStock = {};
    boards.forEach((b) => (byStock[b.stock] = (byStock[b.stock] || 0) + 1));
    const totalFt = boards.reduce((s, b) => s + b.stock, 0);
    const usedIn = parts.reduce((s, p) => s + p.len, 0) - bad.reduce((s, p) => s + p.len, 0);
    const price = Number(shop.prices?.[material]) || 0;
    return { material, boards, bad, byStock, totalFt, wastePct: totalFt ? Math.round((1 - usedIn / (totalFt * 12)) * 1000) / 10 : 0, cost: price ? totalFt * price : null };
  });
  const sheets = Object.entries(sheetsIn).map(([material, items]) => {
    const { sheets: sh, oversize } = packSheets(items, shop);
    const area = items.reduce((s, i) => s + i.w * i.h, 0);
    const price = Number(shop.prices?.[material]) || 0;
    return { material, sheets: sh, oversize, count: sh.length, utilPct: sh.length ? Math.round((area / (sh.length * shop.sheetW * shop.sheetL)) * 1000) / 10 : 0, cost: price ? sh.length * price : null };
  });
  const misc = Object.values(miscMap).map((m) => ({ ...m, notes: [...m.notes].join("; "), qty: Math.round(m.qty * 10) / 10 }));
  const cost = [...lumber, ...sheets].reduce((s, x) => s + (x.cost || 0), 0);
  return { lumber, sheets, misc, cost };
}

export function cutListCSV(result, plan) {
  const rows = [["Material", "Piece", "Part", "Name", "Qty", "Length/Size (in)", "Length/Size (ft-in)", "Notes"]];
  for (const pc of result.pieces) {
    for (const p of pc.lumber) rows.push([p.material, pc.id, p.letter, p.name, p.qty, p.len, ftIn(p.len), p.note]);
    for (const p of pc.sheets) rows.push([p.material, pc.id, p.letter, p.name, p.qty, `${p.w} x ${p.h}`, `${ftIn(p.w)} x ${ftIn(p.h)}`, p.note]);
  }
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

// ── Shop Standards persistence (localStorage + project JSON) ────────────────
export function mergeShop(saved) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SHOP));
  if (!saved || typeof saved !== "object") return base;
  return { ...base, ...saved, prices: { ...(saved.prices || {}) }, stockLengths: Array.isArray(saved.stockLengths) && saved.stockLengths.length ? saved.stockLengths : base.stockLengths };
}
export function loadShop() {
  try { return mergeShop(JSON.parse(localStorage.getItem("sd_shop_standards"))); } catch { return mergeShop(null); }
}
export function saveShop(shop) {
  try { localStorage.setItem("sd_shop_standards", JSON.stringify(shop)); } catch { /* storage unavailable */ }
}
