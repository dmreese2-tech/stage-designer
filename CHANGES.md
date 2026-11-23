# Stage Designer update — what changed and how to install

Baseline: the `main` branch of dmreese2-tech/stage-designer as of the 2026-10-31 upload (App.jsx, 2,575 lines).


## Practicals and CueControl export
- New set items: table lamp, floor lamp and wall sconce practicals.
- Build: a "Practical lamp" template gives a parts list (lamp, bulb, cord, plug, inline dimmer or switch) with bulb watts, cord length, channel and control per piece. Shop Standards has a Practical lamps section and a new item to confirm.
- Scenes: "CueControl CSV" export (Cue, Type, Name, Note; type SCENE) next to the full shift CSV. CueControl's importer maps columns, so headers only need to be recognisable.

## Scenes and the shift list
- **Scenes:** a plan can hold one layout per scene, with an Act and Scene number, a name, a cue number, shift crew and notes. A scene strip under the top bar shows the current scene with previous and next buttons; tap it to open the Scenes page.
- **Stationary or Moving:** every piece is stationary by default and keeps one position in every scene. Tick "Moves between scenes" in a piece's Properties (or in the Moving pieces tab) and it keeps its own position, rotation, height and, for battens, trim in each scene. Move a piece to the wings to strike it; move it back to bring it on.
- **New scene:** Add scene copies where everything is now, so you only move what changes.
- **Shift list:** compares each scene with the one before and lists every moving piece that changed, with from and to positions as distance from the centre line and from the downstage edge. Export it as CSV (Cue, Act, Scene, Scene name, Item, Action, From, To, Crew, Notes) or print it for the crew. The CSV columns are a starting point until we match CueControl's import.
- Scenes are saved with the plan in autosave, JSON files and share links.

## Dialogs on phones, and the magic sheet
- **Venue editor, Project info, Instrument schedule and Compare** now share one dialog frame: a centred card on tablet and desktop, full screen on phones, with a 44 px close button, a scrolling body and a footer that stays in view. The Venue editor's tab row scrolls sideways and its live preview is hidden on phones; the Instrument schedule tables scroll sideways.
- **Magic sheet** (Paperwork > Magic sheet): a plan view of the stage where each channel is a tag coloured by its gel and placed where that light is aimed (or at the fixture when no aim is set). Nearby channels stack. A Print button gives a one-page landscape sheet for the console or the booth.

## Responsive GUI (desktop, tablet, phone)
- **Three layouts** chosen by window width: desktop (1100px and up) keeps the tool rail, library and inspector; tablet (600-1099px) uses a floating tool rail with the library and inspector as bottom sheets; phone (under 600px) uses a bottom tool strip, a workspace tab bar (Plan, 3D, Paperwork, Build, Notes) and sheets.
- **Touch-friendly:** 44px minimum targets, 16px inputs (no iOS zoom), safe-area insets, `100dvh`, no text-selection or callout on the canvas. Selecting a piece opens its properties sheet on tablet and phone; a floating action bar offers Duplicate, Copy, Paste and Delete.
- **Fit to window** on tablet and phone, plus zoom buttons and a Fit control.
- **Cross-browser CSS:** Firefox and WebKit scrollbars, `:focus-visible` rings, reduced-motion support.
- **Dialogs:** calibrate, comment pin and label now use an in-app text dialog instead of `window.prompt`, which works on iOS home-screen apps.
- **Menus:** Export, Venue editor, Project info and Instrument schedule move into a More menu on narrow screens.
- Testing note: verified in Chromium at 1440, 820 and 390 widths with touch emulation. Firefox, Safari and a real iPad or phone are still worth a quick check.

## Workspace pages on mobile
- **3D, Paperwork, Build and Notes now open inside the app**, under the top bar and above the bottom tab bar, so you can jump between Plan, 3D, Paperwork, Build and Notes from any page. The active tab is highlighted. Before, each page covered the whole screen and the tab bar was hidden.
- **Same look as the Plan page:** one shared page frame (Oswald title, tab row, amber primary action). On phones the secondary actions fold into a menu.
- **Build:** the pieces list and the piece detail show one at a time on phones, with an "All pieces" back button.
- **Paperwork:** wide tables scroll sideways instead of overflowing.
- **3D:** the toolbar scrolls sideways, and the Audience sightlines panel opens from a Sightlines button on tablet and phone.

## Install
1. Unzip `stage-designer-src.zip`. It contains a `src/` folder.
2. Upload everything in it to the repo's `src/` folder (replace App.jsx and add the new files). `package.json`, `vite.config.js` and the workflow are unchanged; there are no new dependencies.
3. App.jsx is now a main file plus modules, so the old 2,575-line App.jsx must be replaced, not merged.

## Quick wins
- **Stock-size set library** (Elems > Set): Flat 2'x8', Flat 3'x8', Door Flat 6'x8', Platform 4'x8' @ 24", 4'x8' @ 12", 4'x4' @ 24". They are placed as ordinary flats, door flats and platforms, so the Build dialog treats them normally.
- **Snap options** in the top bar: 1 ft, 6 in, 1 in, Off. Remembered between visits.
- **Feet-and-inches input** for size, position, batten endpoints, batten depth and trim. Accepts `8'6"`, `8' 6 1/2"`, `8-6`, `102"` or a plain number of feet.
- **Numeric batten trim.** Stored as feet; old text values still print as typed until you edit them.
- **Touch support:** one finger on an empty canvas pans, two fingers pinch-zoom and pan. Apple Pencil and mouse still draw and box-select.
- **Autosave** to this browser (800 ms after any change), with a "Saved" indicator and a New button.

## Foundation
- **Undo / redo** (buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Y). Drags, typing and nudges merge into one step each. Covers the plan elements; project info, venue and view settings are not part of undo.
- **Align and distribute** for a group selection (left/centre/right, top/middle/bottom, even spacing horizontally/vertically).
- **Layer lock** (padlock next to each layer): locked layers can't be selected, dragged, box-selected or deleted by click.
- **Data model v3:** JSON files are now version 3 and also save the Shop Standards, layer locks and underlay. Version 1 and 2 files open as before. New element fields: `height` (set pieces, inches), `mount`, `z` (mount height, ft) and `aim` (point) for fixtures. Nothing draws from `z` and `aim` yet; they are there for the 3D view.
- **Ground-plan underlay:** Layers tab > load an image, Calibrate (click two points, enter the real distance), opacity, offset, rotation.
- **Split into modules:** constants.js, units.js, renderers.jsx, pdf.js, ui.jsx, VenueEditorModal.jsx, modals.jsx, panels.jsx, plus App.jsx. Behaviour is unchanged.

## Construction (Build button)
The Build dialog from the previous round is now wired into the app: top-bar Build button, Shop Standards saved in the project JSON, piece height from the new Piece Height field, and `tri_platform` handled by the triangle template. See the Build dialog tabs: Pieces, Cut List, Buy List, Build Status, Shop Standards. Exports: CSV, DXF (sheet cut layouts), Print / PDF.

## Known limits
- Autosave uses browser storage (about 5 MB). A large underlay image won't autosave; the app says so, and the image is still saved in exported JSON.
- Undo does not cover project info, venue, layer visibility or the underlay.
- The venue editor logs a harmless `<svg> attribute height` console warning (it was there before).

## Round 3 — 3D view, lighting paperwork, share links
- **🧊 3D** (View3D.jsx, three.js loaded only when opened): Burgdorff stage outline, set pieces at their heights/elevations, battens at trim height, fixtures with beam cones (gel colour, field angle, aim point; "All beams" shows straight-down beams for unaimed fixtures), orbit camera presets, stage-deck height, glTF (.glb) export.
- **Seat sightlines**: choose an audience zone and seat position/eye height; shows % of the stage visible (5'6" performer, standing on platforms), red dots for hidden spots, "View from this seat".
- **💡 Paperwork** (lighting.js, LightingModal.jsx): channel auto-number (SR→SL, DS battens first), DMX universe/address auto-assign with conflict warning, batten load vs capacity, watts/amps totals, colour cut list, equipment key, patch CSV. Fixture Properties gain universe, address, wattage, weight, colour-frame size, hang height/throw/beam width; battens gain load capacity.
- **🔗 Share**: whole plan compressed into the URL (#share=…); opened links show a banner and don't overwrite the recipient's saved plan. New dependencies: three, fflate.
- Fixture wattage/weight/footprint defaults are generic placeholders; set real values for your inventory.

## Round 3b
- Paperwork gets **Focus chart** (aim point from centre line and downstage edge, throw, beam width) and **Side section** (looking from stage right: battens at trim, fixtures with aim lines, set piece heights).
- **⇄ Compare** (CompareModal.jsx): load an earlier JSON plan and list items added, removed or changed (position, size, colour, channel, etc.), matched by item ID.

## Round 4 — rows 30, 42, 44, 45
- **Walk-through and AR (row 30):** 3D view gets 🚶 Walk (eye-height first person, drag to look, WASD/arrows or on-screen buttons, no collision) and 📱 AR (.usdz) export, which opens at real size in AR Quick Look on iPhone/iPad. glTF and USDZ exports are now in metres (they were feet before, so Blender showed the set 3.3x too big). USDZ not yet tried on a real device.
- **New build templates (row 44):** Curved Flat (ribs cut from sheet in segments, studs, bending-ply skin, radius/arc length, plan + elevation drawing), Round Column (rings, skin, 4 stiffeners), Arch Flat (door flat plus two plywood spandrels, arched opening drawn), Soft Goods yardage (traveler, leg curtain, backdrop, scrim: panels, fabric yards, heading webbing, tie lines, weight chain, fullness setting). New library items: Curved Flat, Column (round), Arch Flat; curved flats draw as an arc on the plot and in 3D. Practicals are not done.
- **Exploded views (row 45):** stairs (stringers, cleat, risers, treads) and triangle platform (rims, joists, legs, deck) now have exploded drawings and per-step pictures.
- **Template defaults (row 42):** Shop Standards opens with a checklist of 12 defaults to confirm against your own builds; the Shop Standards tab shows how many are still unconfirmed. New settings for rib spacing, rib width, bending skin, fabric width, fullness and hems.
- Engine tests extended (curved, column, arch, soft goods, stairs/triangle exploded); all pass.

## Round 4b — template rules are now settings (row 42)
Every rule that was fixed in the templates is now a Shop Standards setting, with defaults equal to the old behaviour: leg spacing, wagon caster steps, leg braces on/off, brace lumber and minimum height, triangle mid-leg spans, stringer count/spacing/extra length, corner block and keystone sizes, screws per joint/waste/deck screws, curved flat stud spacing, skin overlap, bend radius and column diameter warnings, stiffener count, fabric seam allowance/waste, tie spacing. The 'Defaults to check' list reads these live. Still fixed: the lumber nominal-to-actual size table.

## Round 5
- **Comment pins** (💬 tool / C): click the plot to drop a numbered note; edit in Props, resolve, list in 💬 Notes (hide resolved, select, CSV). Pins live in the Notes layer, save in JSON and share links, and are excluded from PDF piece counts.
- **Venue library** (Venue editor > Library tab): save the current venue by name, import/export library files, load any saved venue. Browser + file based, not a server-shared library.
- **MVR export** (3D view > MVR): GeneralSceneDescription.xml with fixtures (position, aim, channel as FixtureID, universe/address, gel colour) grouped by batten, plus the set as set.glb. No GDTF models: choose real fixture types in Vision/Capture/grandMA3.
- **Part outline DXF** (Build > Part outlines): true shapes of curved ribs, column rings, arch spandrels and triangle decks.
- Engine tests extended (ALL PASS 3).

- Shop Standards: "Confirm all defaults as they are" button.
- The logo links back to apps.upstage.systems on phone and tablet (desktop keeps the Apps button).

- Properties panel has a Height field for upright pieces (3D and Build read it); Build height edits update the same field. Elevation relabelled "Elevation / deck height".

- Properties: Size is now "Footprint on plan" (Width, Depth); one Height (ft-in) field drives 3D and Build; elevation is "Raised off floor" (platforms: Height, top of deck). Build no longer has its own height box.

- A new plan opens a "Choose a venue" dialog: pick a saved venue or a starting layout, or create a new venue. Skip keeps the default. It also appears after New project.

- The Burgdorff layout is now called "Apron Stage" (curved downstage apron, recessed upstage center). Saved plans keep working.
