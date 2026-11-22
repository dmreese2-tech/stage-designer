// layout.jsx — responsive shell pieces: icons, viewport hook, menus, bottom sheet, text dialog.
import { useState, useEffect, useRef } from "react";
import { COLORS, FONT_DISPLAY, FONT_MONO, FONT_UI } from "./constants.js";

export const ICON = {
  select: "M5 3l14 7-6 2-2 6z", pan: "M12 3v18M3 12h18", wall: "M4 20L20 4", batten: "M3 9h18M3 15h18",
  label: "M5 6h14M12 6v13", pin: "M4 5h16v11H9l-5 4z", delete: "M6 6l12 12M18 6L6 18",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3", redo: "M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3",
  share: "M12 15V4M8 8l4-4 4 4M5 13v7h14v-7", plus: "M12 5v14M5 12h14", minus: "M5 12h14",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5", more: "M5 12h.01M12 12h.01M19 12h.01", chevron: "M6 9l6 6 6-6",
  plan: "M4 4h16v16H4zM4 12h16M12 4v16", cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  paper: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7", build: "M14 6l4 4L8 20H4v-4z", notes: "M4 5h16v11H9l-5 4z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5", copy: "M8 8h11v12H8zM5 16V4h11", close: "M6 6l12 12M18 6L6 18",
  export: "M12 4v11M8 11l4 4 4-4M5 20h14",
};
export const Icon = ({ name, size = 20, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap={name === "more" ? "round" : "square"} aria-hidden="true" style={{ flex: "none" }}><path d={ICON[name]} /></svg>
);

// "phone" under 600 px, "tablet" 600 to 1099, "desktop" from 1100
export function useViewport() {
  const q = () => (typeof window === "undefined" ? "desktop" : window.innerWidth < 600 ? "phone" : window.innerWidth < 1100 ? "tablet" : "desktop");
  const [vp, setVp] = useState(q);
  useEffect(() => {
    const on = () => setVp(q());
    window.addEventListener("resize", on); window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return vp;
}

export const ctl = (active, extra = {}) => ({
  height: 44, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, borderRadius: 4, cursor: "pointer",
  background: active ? COLORS.accentDim : "transparent", color: active ? COLORS.text : COLORS.textDim,
  border: `1px solid ${active ? COLORS.accent : "transparent"}`,
  fontFamily: FONT_DISPLAY, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 13, whiteSpace: "nowrap", ...extra,
});
export const ghost = (extra = {}) => ctl(false, { border: `1px solid ${COLORS.textDim}`, color: COLORS.text, ...extra });
export const primary = (extra = {}) => ({ ...ctl(false), background: COLORS.accent, color: COLORS.onAccent, border: "1px solid transparent", padding: "0 18px", ...extra });

export function MenuButton({ label, icon, iconOnly, items, style, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel || label} onClick={() => setOpen(o => !o)}
        style={{ ...(iconOnly ? ghost({ width: 44, padding: 0, justifyContent: "center", border: `1px solid ${COLORS.border}` }) : ghost()), ...style }}>
        {icon && <Icon name={icon} size={iconOnly ? 22 : 18} sw={iconOnly ? 2.4 : 1.6} />}
        {!iconOnly && <span>{label}</span>}
        {!iconOnly && <Icon name="chevron" size={16} sw={1.8} />}
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", right: 0, top: 48, zIndex: 900, minWidth: 230, maxHeight: "70vh", overflowY: "auto", background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 8, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
          {items.filter(Boolean).map((it, i) => it.sep
            ? <div key={i} role="separator" style={{ height: 1, background: COLORS.border, margin: "4px 0" }} />
            : <button key={i} role="menuitem" disabled={it.disabled} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
                style={{ width: "100%", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 12px", background: "transparent", border: "none", borderRadius: 4, cursor: it.disabled ? "default" : "pointer", textAlign: "left",
                  color: it.danger ? "#E5534B" : it.disabled ? COLORS.textDim : COLORS.text, fontFamily: FONT_UI, fontSize: 14, opacity: it.disabled ? 0.5 : 1 }}>
                <span>{it.label}</span>{it.checked !== undefined && <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: it.checked ? COLORS.accent : COLORS.textDim }}>{it.checked ? "On" : "Off"}</span>}
                {it.hint && <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.textDim }}>{it.hint}</span>}
              </button>)}
        </div>
      )}
    </div>
  );
}

// Bottom sheet inside the canvas area. mode: "peek" (about 40%) or "open" (about 80%).
export function Sheet({ mode, setMode, onClose, tabs, tab, setTab, title, children }) {
  return (
    <div role="dialog" aria-label={title || "Panel"} style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 40, height: mode === "open" ? "80%" : "42%", maxHeight: "100%", display: "flex", flexDirection: "column", background: COLORS.panel, borderTop: `1px solid ${COLORS.borderStrong}`, borderRadius: "12px 12px 0 0", boxShadow: "0 -8px 24px rgba(0,0,0,.45)", transition: "height 120ms ease-out" }}>
      <button aria-label={mode === "open" ? "Make panel smaller" : "Make panel larger"} onClick={() => setMode(mode === "open" ? "peek" : "open")}
        style={{ flex: "none", height: 24, minHeight: 24, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        <span style={{ width: 44, height: 5, borderRadius: 3, background: COLORS.borderStrong }} /></button>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 4, padding: "0 8px 6px 8px" }}>
        {tabs ? (
          <div role="tablist" className="sd-scroll-x" style={{ flex: 1, display: "flex", gap: 4 }}>
            {tabs.map(([id, lbl]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={ctl(tab === id, { fontSize: 12, padding: "0 12px" })}>{lbl}</button>)}
          </div>) : <div style={{ flex: 1, fontFamily: FONT_DISPLAY, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, fontSize: 14, padding: "0 8px" }}>{title}</div>}
        <button aria-label="Close panel" onClick={onClose} style={{ ...ctl(false, { width: 44, padding: 0, justifyContent: "center" }) }}><Icon name="close" size={20} sw={1.8} /></button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }} className="sd-safe-bottom">{children}</div>
    </div>
  );
}

// Replaces window.prompt: works in installed iPad web apps and on phones.
export function AskText({ title, value = "", onOk, onCancel }) {
  const [v, setV] = useState(value);
  const done = (ok) => { ok ? onOk(v) : onCancel && onCancel(); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onPointerDown={(e) => { if (e.target === e.currentTarget) done(false); }}>
      <form role="dialog" aria-label={title} onSubmit={(e) => { e.preventDefault(); done(true); }} style={{ width: 420, maxWidth: "100%", background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12, color: COLORS.text, fontFamily: FONT_UI }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontFamily: FONT_DISPLAY, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500, fontSize: 13 }}>{title}</span>
          <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") done(false); }}
            style={{ height: 44, boxSizing: "border-box", background: COLORS.raised, color: COLORS.text, border: `1px solid ${COLORS.textDim}`, borderRadius: 4, padding: "0 12px", fontFamily: FONT_UI, fontSize: 16 }} />
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => done(false)} style={ghost()}>Cancel</button>
          <button type="submit" style={primary()}>OK</button>
        </div>
      </form>
    </div>
  );
}
