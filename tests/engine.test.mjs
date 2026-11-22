import assert from "node:assert/strict";
import { buildAll, planAll, DEFAULT_SHOP, ftIn, cutListCSV, stageProgress, BUILD_STAGES, templateOptions } from "../src/construction.js";
import { sheetsDXF } from "../src/constructionDXF.js";
import { svgIso, boxes3D, stepFigures, svgPiece, printHTML } from "../src/constructionDraw.js";
const G = 20;
const shop = JSON.parse(JSON.stringify(DEFAULT_SHOP));
const S = (id, type, wFt, hFt, extra = {}) => ({ id, type, category: "set", layer: "set", label: type, w: wFt * G, h: hFt * G, ...extra });
const q = (pc, key) => pc.lumber.concat(pc.sheets).find((p) => p.key === key);

// 1) Broadway flat 4x8, 1x3: stiles 2@96, rails 2@43, toggle 1@43, 4 corner blocks, 2 keystones
let r = buildAll([S("a", "flat", 0.2, 4, { construction: { heightIn: 96 } })], shop, G);
let p = r.pieces[0];
assert.equal(p.template, "broadway_flat");
assert.deepEqual([q(p,"stile").len,q(p,"stile").qty],[96,2]);
assert.deepEqual([q(p,"rail").len,q(p,"rail").qty],[43,2]);
assert.deepEqual([q(p,"toggle").len,q(p,"toggle").qty],[43,1]);
assert.equal(q(p,"cblk").qty,4); assert.equal(q(p,"kstn").qty,2);
console.log("broadway ok", p.dims);

// 2) Hollywood: rails/toggles 46.5, 3 toggles, one facing sheet 48x96
r = buildAll([S("a","flat",0.2,4,{construction:{template:"hollywood_flat"}})], shop, G); p = r.pieces[0];
assert.equal(q(p,"rail").len,46.5); assert.equal(q(p,"toggle").qty,3);
assert.deepEqual([q(p,"face").w,q(p,"face").h,q(p,"face").qty],[48,96,1]);
console.log("hollywood ok");

// 3) Plan: Broadway 4x8 -> 2 stiles need 10' stock (96+kerf+trim > 96), rails fit a 12'
r = buildAll([S("a","flat",0.2,4)], shop, G);
let plan = planAll(r, shop); const l = plan.lumber[0];
console.log("buy", JSON.stringify(l.byStock), "waste%", l.wastePct);
assert.equal(l.bad.length,0); assert.ok(l.boards.every(b=>b.cuts.every(c=>c.len>0)));

// 4) Platform 4x8 @ 24" : 6 legs, 5 joists, rim 2x96 + 2x45, deck 1 sheet
r = buildAll([S("p","platform",8,4,{elevation:24})], shop, G); p = r.pieces[0];
assert.equal(q(p,"rimL").len,96); assert.equal(q(p,"rimS").len,45); assert.equal(q(p,"joist").qty,5);
assert.equal(q(p,"leg").qty,6); assert.equal(q(p,"leg").len,24-0.75-3.5);
assert.equal(q(p,"deck").qty,1);
console.log("platform ok", p.dims, p.warnings);
// platform below frame depth -> warning, no legs
r = buildAll([S("p","platform",4,4,{elevation:4})], shop, G); assert.ok(r.pieces[0].warnings.length===1 && !q(r.pieces[0],"leg"));

// 5) Stairs 24" rise, 3 wide: ceil(24/7.75)=4 risers, 3 treads, stringers 2 (<=36)
r = buildAll([S("s","stairs",3,2.5,{elevation:24})], shop, G); p = r.pieces[0];
assert.equal(q(p,"tread").qty,3); assert.equal(q(p,"riser").qty,4); assert.equal(q(p,"stringer").qty,2);
console.log("stairs ok", p.warnings, p.dims);

// 6) Door flat 6' wide with 36x80 opening
r = buildAll([S("d","door_flat",0.2,6)], shop, G); p = r.pieces[0];
console.log("door", p.lumber.map(x=>`${x.letter}:${x.name} ${x.qty}@${ftIn(x.len)}`).join(" | "), p.warnings);
assert.ok(q(p,"jack")); 
// narrow door flat warns
r = buildAll([S("d","door_flat",0.2,4)], shop, G); console.log("door4", r.pieces[0].warnings);

// 7) Wall run 12' -> 3 flats of 48"
r = buildAll([{ id:"w", type:"wall", category:"set", layer:"set", x1:0,y1:0,x2:12*G,y2:0, label:"Wall" }], shop, G); p = r.pieces[0];
assert.equal(p.mult,3); assert.equal(q(p,"stile").qty,6);
console.log("wall ok", p.dims);

// 8) Mixed production + sheets + csv
r = buildAll([S("a","flat",0.2,4),S("b","flat",0.2,4),S("c","platform",8,4,{elevation:12}),S("t","table",3,2)], shop, G);
plan = planAll(r, shop);
console.log("pieces", r.pieces.map(x=>x.id).join(","), "others", r.others.map(o=>o.reason));
console.log("lumber", plan.lumber.map(x=>`${x.material}: ${JSON.stringify(x.byStock)} waste ${x.wastePct}%`));
console.log("sheets", plan.sheets.map(x=>`${x.material}: ${x.count} util ${x.utilPct}%`));
assert.ok(cutListCSV(r, plan).split("\n").length > 5);
assert.equal(ftIn(46.5), `3'-10 1/2"`); assert.equal(ftIn(0.75), `3/4"`); assert.equal(ftIn(6), `6"`); assert.equal(ftIn(0), `0"`); assert.equal(ftIn(121.75), `10'-1 3/4"`); assert.equal(ftIn(96), `8'-0"`);

// 9) Assembly steps: every piece has steps, no unresolved {tokens}, letters resolved
r = buildAll([S("a","flat",0.2,4),S("h","flat",0.2,4,{construction:{template:"hollywood_flat"}}),S("d","door_flat",0.2,6),S("p","platform",8,4,{elevation:24}),S("s","stairs",3,2.5,{elevation:24})], shop, G);
for (const pc of r.pieces) { assert.ok(pc.steps.length >= 5, pc.id); pc.steps.forEach(st => assert.ok(!/[{}]/.test(st.text), st.text)); }
assert.ok(/\[[A-Z]\]/.test(r.pieces[0].steps[1].text));
console.log("steps ok:", r.pieces[0].steps.map(s=>s.text.slice(0,40)).join(" | "));

// 10) Wagon: casters, legs shortened by caster height
r = buildAll([S("w","platform",8,4,{elevation:24,construction:{template:"wagon"}})], shop, G); p = r.pieces[0];
assert.equal(p.template,"wagon"); assert.equal(q(p,"leg").len,24-0.75-3.5-4); assert.equal(q(p,"leg").qty,4);
assert.equal(p.misc.find(m=>/casters$/.test(m.name)).qty,4);
r = buildAll([S("w","platform",12,4,{elevation:24,construction:{template:"wagon"}})], shop, G); assert.equal(r.pieces[0].misc.find(m=>/casters$/.test(m.name)).qty,6);
assert.equal(r.pieces[0].draw.nx*r.pieces[0].draw.ny,6);
r = buildAll([S("w","platform",4,4,{elevation:6,construction:{template:"wagon"}})], shop, G); assert.ok(r.pieces[0].warnings.length===1);

// 11) Triangle platform 8x6: hyp 10', joists every 16" shrinking, 3 corners + A>72 midpoint + hyp>96 midpoint = 5 legs
r = buildAll([S("t","triangle",8,6,{elevation:24})], shop, G); p = r.pieces[0];
assert.equal(p.template,"platform_tri"); assert.equal(q(p,"rimA").len,96); assert.equal(q(p,"rimH").len,120);
const js = p.lumber.filter(x=>/^j\d/.test(x.key)); assert.ok(js.length>=4); assert.ok(js[0].len>js[js.length-1].len);
assert.equal(q(p,"leg").qty,5); assert.equal(templateOptions({type:"platform"}).join(),"platform,wagon");
console.log("tri ok", p.dims, js.map(j=>j.len).join(","));
plan = planAll(r, shop); assert.equal(plan.lumber.reduce((n,l)=>n+l.bad.length,0),0);
assert.ok(svgPiece(p).includes("<polygon"));

// 12) Build status
const el = { construction: { stages: { cut: true, assembled: true } } };
assert.equal(stageProgress(el),2); assert.equal(stageProgress({}),0); assert.equal(BUILD_STAGES.length,4);

// 13) DXF
r = buildAll([S("a","flat",0.2,4),S("b","flat",0.2,4),S("c","platform",8,4,{elevation:12})], shop, G); plan = planAll(r, shop);
const dxf = sheetsDXF(plan, shop);
const nParts = plan.sheets.reduce((n,m)=>n+m.sheets.reduce((k,sh)=>k+sh.items.length,0),0), nSheets = plan.sheets.reduce((n,m)=>n+m.count,0);
assert.ok(dxf.startsWith("0\nSECTION")); assert.ok(dxf.trimEnd().endsWith("EOF"));
assert.equal(dxf.split("\n0\nPOLYLINE").length-1, nParts+nSheets);
assert.equal(dxf.split("\n0\nVERTEX").length-1, (nParts+nSheets)*4);
console.log("dxf ok", nSheets, "sheets", nParts, "parts", dxf.length, "bytes");

// 14) 3D + step figures + print doc
p = buildAll([S("p","platform",8,4,{elevation:24})], shop, G).pieces[0];
assert.ok(boxes3D(p).length > 12); assert.ok(svgIso(p,{explode:true,labels:true}).includes("<polygon"));
const figs = stepFigures(p); assert.equal(figs.length,p.steps.length); assert.ok(figs.some(f=>f.svg));
const doc = printHTML(buildAll([S("a","flat",0.2,4),S("p","platform",8,4,{elevation:24}),S("t","triangle",8,6,{elevation:24})],shop,G), plan, shop, {title:"T"});
assert.ok(doc.includes("BUILD STATUS") && doc.includes("Exploded view"));

// ── round 4 templates ──
// curved flat: chord 8 ft, depth 2 ft -> R = (48^2... ) check geometry
r = buildAll([S("c","curved_flat",8,2,{construction:{heightIn:96}})], shop, G); p = r.pieces[0];
assert.equal(p.template,"curved_flat");
const Rx = (96*96/4 + 24*24)/(2*24); assert.ok(Math.abs(p.draw.R-Rx)<1e-6, "radius");
assert.ok(p.draw.Larc>96 && p.draw.Larc<115);
assert.equal(q(p,"rib").qty, 5*1); // 96/24+1 = 5 ribs, chord fits one sheet
assert.ok(q(p,"skin")); assert.ok(svgPiece(p).includes("PLAN"));
console.log("curved ok R", p.draw.R.toFixed(1), "arc", p.draw.Larc.toFixed(1));
// wide curved flat splits ribs into segments
r = buildAll([S("c","curved_flat",14,3)], shop, G); p = r.pieces[0]; assert.equal(q(p,"rib").qty, 5*2);
// column
r = buildAll([S("k","column",2,2,{construction:{heightIn:96}})], shop, G); p = r.pieces[0];
assert.equal(p.template,"column"); assert.equal(q(p,"ring").qty,5); assert.equal(q(p,"stiff").qty,4);
assert.ok(svgPiece(p).includes("ELEVATION"));
console.log("column ok", p.dims);
// arch flat: door flat + 2 spandrels
r = buildAll([S("a","arch_flat",0.2,6,{construction:{heightIn:96,openW:36,openH:84}})], shop, G); p = r.pieces[0];
assert.equal(p.template,"arch_flat"); assert.deepEqual([q(p,"span").qty,q(p,"span").w,q(p,"span").h],[2,18,18]);
assert.ok(svgPiece(p).includes("<path"));
console.log("arch ok", p.dims);
// soft goods yardage: 12 ft traveler x 12 ft, 1.5x fullness, 54" fabric -> 4 panels x (144+8)" = 16.9 yd +5% -> 17.5 yd
r = buildAll([S("t","traveler",12,0.4,{layer:"softgoods"})], shop, G); p = r.pieces[0];
assert.equal(p.template,"softgoods"); assert.equal(p.draw.panels, Math.ceil(144*1.5/53));
const fab = p.misc.find(m=>m.unit==="yd"); assert.equal(fab.qty, Math.ceil(p.draw.panels*152/36*1.05*2)/2);
r = buildAll([S("b","backdrop",10,0.2)], shop, G); assert.equal(r.pieces[0].draw.full,1);
console.log("soft ok", fab.qty,"yd");
// stairs + triangle now have exploded views and step pictures
r = buildAll([S("s","stairs",3,2.5,{construction:{heightIn:24}})], shop, G); p = r.pieces[0];
assert.ok(boxes3D(p).length>10); assert.ok(svgIso(p,{explode:true,labels:true}).includes("<polygon"));
assert.ok(stepFigures(p).filter(s=>s.svg).length>=3);
r = buildAll([S("t","tri_platform",8,6,{construction:{heightIn:24}})], shop, G); p = r.pieces[0];
assert.ok(boxes3D(p).some(b=>b.poly)); assert.ok(svgIso(p,{explode:true,labels:true}).length>500);
assert.ok(stepFigures(p).filter(s=>s.svg).length>=4);
console.log("exploded stairs+tri ok");
// whole print doc with every new type
const all=buildAll([S("a","flat",0.2,4),S("c","curved_flat",8,2),S("k","column",2,2),S("d","arch_flat",0.2,6),S("t","traveler",12,0.4,{layer:"softgoods"})],shop,G);
const pl=planAll(all,shop); assert.ok(printHTML(all,pl,shop,{title:"x"}).length>5000);
assert.ok(pl.misc.some(m=>m.unit==="yd"));
console.log("ALL PASS");

// options replace hard-coded rules
{
  const s2 = JSON.parse(JSON.stringify(DEFAULT_SHOP));
  const plat = (sh, h=30) => buildAll([S("p","platform",8,4,{construction:{heightIn:h}})], sh, G).pieces[0];
  const base = plat(s2); const baseLegs = q(base,"leg").qty, baseBr = q(base,"braceL");
  assert.ok(baseBr && baseBr.material==="1x4");
  s2.braceLegs=false; assert.equal(q(plat(s2),"braceL"), undefined);
  s2.braceLegs=true; s2.braceLumber="2x4"; assert.equal(q(plat(s2),"braceL").material,"2x4");
  s2.braceMinHeight=48; assert.equal(q(plat(s2),"braceL"), undefined);
  s2.braceMinHeight=24; s2.legSpacing=24; assert.ok(q(plat(s2),"leg").qty > baseLegs);
  const s3 = JSON.parse(JSON.stringify(DEFAULT_SHOP)); s3.stringerNarrow=24; s3.stringerSpacing=12;
  const st = (sh)=>buildAll([S("s","stairs",3,2.5,{construction:{heightIn:24}})], sh, G).pieces[0];
  assert.equal(q(st(DEFAULT_SHOP),"stringer").qty,2); assert.equal(q(st(s3),"stringer").qty,Math.ceil(36/12)+1);
  const s4 = JSON.parse(JSON.stringify(DEFAULT_SHOP)); s4.cornerBlock=8; s4.stiffenerCount=6; s4.fabricWaste=10;
  assert.equal(q(buildAll([S("a","flat",0.2,4)],s4,G).pieces[0],"cblk").w,8);
  assert.equal(q(buildAll([S("k","column",2,2)],s4,G).pieces[0],"stiff").qty,6);
  const yd=(sh)=>buildAll([S("t","traveler",12,0.4,{layer:"softgoods"})],sh,G).pieces[0].misc.find(m=>m.unit==="yd").qty;
  assert.ok(yd(s4) > yd(DEFAULT_SHOP));
  console.log("options ok");
}

{
  const { partsDXF, partShapes } = await import("../src/constructionDXF.js");
  const all = buildAll([S("c","curved_flat",8,2),S("k","column",2,2),S("a","arch_flat",0.2,6,{construction:{openW:36,openH:84}}),S("t","tri_platform",8,6,{construction:{heightIn:24}})],shop,G);
  const dxf = partsDXF(all);
  const nPoly = (dxf.match(/POLYLINE/g)||[]).length;
  // curved: 5 ribs x 2 segments = 10; column: 5 rings x 2 (outer+inner) = 10; arch: 2 spandrels; tri: blank + cut = 2; plus deck? count >= 24
  assert.ok(nPoly >= 24, "polylines "+nPoly);
  assert.ok(dxf.includes("EOF") && dxf.includes("LAYER"));
  const rib = all.pieces[0].sheets.find(s=>s.key==="rib"), sh = partShapes(all.pieces[0], {...rib, segIndex:0});
  assert.ok(Math.abs(sh.w - 96) < 0.6 && sh.h > 22 && sh.h < 30, `rib shape ${sh.w} x ${sh.h}`);
  console.log("part DXF ok", nPoly, "polylines; rib", sh.w.toFixed(1), "x", sh.h.toFixed(1));
}
console.log("ALL PASS 3");
