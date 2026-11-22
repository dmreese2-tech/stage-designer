import { COLORS } from "./constants.js";
// ui.jsx — shared small UI pieces.
// ── Shared small button ─────────────────────────────────────────────────────
export const Btn = ({onClick,children,active,danger,title,disabled}) => (
    <button onClick={disabled?undefined:onClick} title={title} disabled={disabled}
      style={{ opacity:disabled?0.4:1, background:danger?"#3a1010":active?COLORS.accent:"transparent",
               color:danger?COLORS.accent:active?"#fff":COLORS.textDim,
               border:`1px solid ${danger?COLORS.accent:active?COLORS.accent:COLORS.border}`,
               borderRadius:5, padding:"4px 9px", cursor:disabled?"default":"pointer", fontSize:12, fontFamily:"inherit" }}>
      {children}
    </button>
  );

