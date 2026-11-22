// units.js — feet-and-inches parsing and formatting.
// ── Feet-and-inches helpers ──────────────────────────────────────────────────
// parseFtIn accepts 8'6", 8' 6 1/2", 8-6, 102", 102in, or a plain number (feet). Returns feet, or null.
export function parseFtIn(str) {
  const s = String(str ?? "").trim().replace(/[″”]/g, '"').replace(/[′’]/g, "'");
  if (!s) return null;
  const num = (t) => {
    t = t.trim(); if (t === "") return 0;
    let m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/); if (m) return +m[1] + m[2] / m[3];
    m = t.match(/^(\d+)\/(\d+)$/); if (m) return m[1] / m[2];
    const n = Number(t); return Number.isFinite(n) ? n : NaN;
  };
  let m = s.match(/^(-?[\d.]+)\s*(?:'|ft\b|-)\s*(.*?)\s*(?:"|in)?$/i);
  if (m) { const ft = num(m[1]), inch = num(m[2]); return Number.isNaN(ft) || Number.isNaN(inch) ? null : ft + Math.sign(ft || 1) * inch / 12; }
  m = s.match(/^(.*?)\s*(?:"|in)$/i);
  if (m) { const inch = num(m[1]); return Number.isNaN(inch) ? null : inch / 12; }
  const n = num(s); return Number.isNaN(n) ? null : n;
}
export function fmtFtIn(ft) {
  if (ft === null || ft === undefined || ft === "" || Number.isNaN(+ft)) return "";
  const neg = ft < 0, total = Math.round(Math.abs(ft) * 12 * 8) / 8;
  const f = Math.floor(total / 12 + 1e-9), inch = total - f * 12;
  const whole = Math.floor(inch + 1e-9), frac = Math.round((inch - whole) * 8);
  const fr = frac ? `${frac % 8 === 0 ? "" : ` ${frac / (frac % 2 ? 1 : frac % 4 ? 2 : 4)}/${8 / (frac % 2 ? 1 : frac % 4 ? 2 : 4)}`}` : "";
  const inTxt = whole || frac ? `${whole}${fr}"` : "";
  return (neg ? "-" : "") + (f || !inTxt ? `${f}'` : "") + (f && inTxt ? "-" : "") + inTxt;
}
// Batten trim used to be free text; it is now stored as feet, but old text still prints as typed.
export function fmtTrim(t) {
  if (t === null || t === undefined || t === "") return "";
  if (typeof t === "number") return fmtFtIn(t);
  const v = parseFtIn(t); return v === null ? String(t) : fmtFtIn(v);
}

