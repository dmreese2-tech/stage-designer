// venueLibrary.js — saved venues in this browser, plus export/import as a file so a venue can be shared with other designers or the theatre.
const KEY = "sd_venue_library";
const clean = (e) => e && typeof e === "object" && typeof e.name === "string" && e.venue && typeof e.venue === "object" && Number(e.stageW) > 0 && Number(e.stageH) > 0
  ? { name: e.name.slice(0, 80), venue: e.venue, stageW: Number(e.stageW), stageH: Number(e.stageH) } : null;
export function loadLibrary() { try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a.map(clean).filter(Boolean) : []; } catch { return []; } }
export function saveLibrary(lib) { try { localStorage.setItem(KEY, JSON.stringify(lib)); return true; } catch { return false; } }
// accepts a whole library file, a single {name, venue, stageW, stageH}, or a project JSON (uses its venue and stage size)
export function parseVenueFile(text, fallbackName = "Imported venue") {
  const d = JSON.parse(text);
  if (d?.format === "stage-designer-venues" && Array.isArray(d.venues)) return d.venues.map(clean).filter(Boolean);
  const one = clean(d) || (d?.venue && d?.stageW ? clean({ name: d.projectInfo?.venue || fallbackName, venue: d.venue, stageW: d.stageW, stageH: d.stageH }) : null);
  return one ? [one] : [];
}
export const libraryFile = (venues) => JSON.stringify({ format: "stage-designer-venues", version: 1, venues }, null, 2);
// add or replace by name
export function upsert(lib, entry) { const i = lib.findIndex((e) => e.name.toLowerCase() === entry.name.toLowerCase()); const next = [...lib]; if (i >= 0) next[i] = entry; else next.push(entry); return next; }
