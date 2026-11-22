import { COLORS, FONT_DISPLAY } from "./constants.js";
// ui.jsx — shared small UI pieces.
// ── Shared small button ─────────────────────────────────────────────────────
export const Btn = ({onClick,children,active,danger,title,disabled}) => (
    <button onClick={disabled?undefined:onClick} title={title} disabled={disabled}
      style={{ opacity:disabled?0.4:1, background:danger?"#4A1F1D":active?COLORS.accentDim:"transparent",
               color:danger?"#E5534B":active?COLORS.text:COLORS.textDim,
               border:`1px solid ${danger?"#E5534B":active?COLORS.accent:COLORS.border}`,
               borderRadius:5, padding:"4px 9px", cursor:disabled?"default":"pointer", fontSize:12, fontFamily:FONT_DISPLAY, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.08em" }}>
      {children}
    </button>
  );

