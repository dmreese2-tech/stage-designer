import { GRID, COLORS } from "./constants.js";
// renderers.jsx — SVG drawing of fixtures, set pieces, battens and labels on the plot.
// ── SVG Fixture renderer ──────────────────────────────────────────────────────
export function FixtureSVG({ def, x, y, rotation=0, color, focused=false, focusAngle=45, selected, gelHex }) {
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
export function SetPieceSVG({ def, x, y, rotation=0, color, selected, label }) {
  const hw = def.w/2, hh = def.h/2;
  const stroke = selected ? COLORS.selected : "#111";
  const sw = selected ? 2.5 : 1;
  const isDoor = label?.toLowerCase().includes("door");
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`}>
      {def.shape === "triangle"
        // right triangle, 90° corner at lower-left; use Rotation to orient it
        ? <polygon points={`${-hw},${hh} ${hw},${hh} ${-hw},${-hh}`} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
        : def.shape === "arc"
        // curved flat: chord along the bottom edge, bulging toward the top edge
        ? (() => { const Rr = (def.w * def.w / 4 + def.h * def.h) / (2 * def.h); const d = `M${-hw},${hh} A${Rr},${Rr} 0 0 1 ${hw},${hh}`; return (
            <g><path d={d + " Z"} fill={color} fillOpacity={0.2} stroke="none"/><path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="butt"/><path d={d} fill="none" stroke={stroke} strokeWidth={sw}/></g>); })()
        : def.shape === "circle"
        // round table / stool; W and H set the diameter (unequal values give an oval)
        ? <ellipse cx={0} cy={0} rx={hw} ry={hh} fill={color} stroke={stroke} strokeWidth={sw}/>
        : def.shape === "traveler"
        // two curtain panels meeting at centre stage, with fold lines and a centre split
        ? <g>
            <rect x={-hw} y={-hh} width={def.w/2} height={def.h} fill={color} stroke={stroke} strokeWidth={sw} rx={1}/>
            <rect x={0} y={-hh} width={def.w/2} height={def.h} fill={color} stroke={stroke} strokeWidth={sw} rx={1}/>
            {Array.from({length:Math.max(0,Math.floor(def.w/12)-1)},(_,i)=>-hw+(i+1)*12).filter(fx=>Math.abs(fx)>1).map(fx=>(
              <line key={fx} x1={fx} y1={-hh} x2={fx} y2={hh} stroke={stroke} strokeWidth={0.5} opacity={0.5}/>
            ))}
            <line x1={0} y1={-hh-2} x2={0} y2={hh+2} stroke={stroke} strokeWidth={1.5}/>
          </g>
        : <rect x={-hw} y={-hh} width={def.w} height={def.h} fill={color} stroke={stroke} strokeWidth={sw} rx={2}/>}
      {isDoor && <path d={`M${-hw},${-hh} A${def.w},${def.w} 0 0 1 ${hw},${-hh}`} fill="none" stroke={stroke} strokeWidth={1} strokeDasharray="3,2"/>}
      {label?.toLowerCase().includes("stairs") && [0.25,0.5,0.75].map(t=>(
        <line key={t} x1={-hw} y1={-hh+def.h*t} x2={hw} y2={-hh+def.h*t} stroke={stroke} strokeWidth={0.8}/>
      ))}
    </g>
  );
}

// ── Batten renderer ───────────────────────────────────────────────────────────
export function BattenSVG({ el, selected }) {
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

// ── Comment pin renderer ──────────────────────────────────────────────────────
export function PinSVG({ el, selected }) {
  const done = !!el.resolved, fill = done ? "#6a7a6a" : "#ffcc33";
  return (
    <g transform={`translate(${el.x},${el.y})`}>
      <path d="M0,0 C-10,-12 -12,-22 0,-26 C12,-22 10,-12 0,0 Z" fill={fill} stroke={selected ? COLORS.selected : "#222"} strokeWidth={selected ? 2.5 : 1.2}/>
      <text x={0} y={-14} textAnchor="middle" fontSize={10} fontWeight="700" fill="#222" fontFamily="Courier New, monospace">{done ? "✓" : el.n || "•"}</text>
      {selected && <text x={0} y={-32} textAnchor="middle" fontSize={11} fill={COLORS.selected} fontFamily="Courier New, monospace">{(el.label || "").slice(0, 40)}</text>}
    </g>
  );
}

// ── Text label renderer ───────────────────────────────────────────────────────
export function TextLabelSVG({ el, selected }) {
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

