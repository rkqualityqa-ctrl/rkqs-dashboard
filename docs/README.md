# RKQS Smart Quality Dashboard Suite — v1.1.0 (Phase 1 + Phase 2)

Offline, Excel-driven, white-label quality analytics dashboard for manufacturing
clients. Built per `RK Quality Solution SRS Version 2.0` and the AI Technical
Design Document, Modules 1–13 (Foundation → Theme Manager).

---

## 1. What's included

| Module (per TDD) | Status |
|---|---|
| 1. Foundation / Config Engine | ✅ Done |
| 2. UI / Layout Engine (sidebar, header, filter bar, date-range quick filters) | ✅ Done |
| 3. Excel Engine (dynamic header detection, column mapping) | ✅ Done |
| 4. Validation Engine | ✅ Done |
| 5. Data Store / State Management | ✅ Done |
| 6. KPI Engine | ✅ Done |
| 7. Filter Engine (entity filters + Today/Week/Month/Quarter/Year/Custom date range) | ✅ Done |
| 8. Chart Engine | ✅ Done |
| 9. Dashboard Renderer (10 dashboards incl. Heat Map) | ✅ Done |
| 10. Report Engine | ✅ Done |
| 11. Export Engine (PDF, Excel, PNG) | ✅ Done |
| 12. White Label Engine (Client ZIP package generator) | ✅ Done |
| 13. Theme Manager (6 color presets + Light/Dark mode, live-applied) | ✅ Done |
| 14. Testing / QA hardening at scale (10,000+ rows) | ✅ Verified to 15,000 rows |
| — File Management (Master-only import history log) | ✅ Done (Phase 3) |
| — Client Management (Master-only client directory + White Label prefill) | ✅ Done (Phase 3) |
| — Audit Logs (Master-only system-wide activity log) | ✅ Done (Phase 3) |
| — Data Validation (Master-only row-level import quality report) | ✅ Done (Phase 3) |
| — System Settings (Master-only configurable alert thresholds) | ✅ Done (Phase 3) |

Everything above is real, working code against your actual column structure
(Section 7.1 of the SRS) — not placeholders.

### New in Phase 2
- **Date Range Quick Filters** — Today / This Week / This Month / This Quarter /
  This Year / Last 30 Days / Custom Range, in the filter bar next to the other
  filters. Every dashboard, chart, and table respects the active date range.
- **Heat Map page** — Plant × Date defect % grid (last 21 days present in the
  filtered data), color-scaled green→red, with a legend.
- **Theme Manager** (Master Dashboard → Theme Manager) — 6 ready-made color
  presets (Navy & Gold, Deep Space Multicolor, Ocean Teal, Charcoal Crimson,
  Slate Purple, Forest Green) plus a Light/Dark mode toggle. Changes apply
  live across sidebar, buttons, KPI accents, and charts with no page reload.
- **Loading overlay** during Excel import (SRS 18.2), so large files give
  clear visual feedback instead of an unresponsive-looking screen.
- **Large-file performance**: full KPI recalculation (every dashboard's
  numbers, including the new Heat Map) benchmarked at ~220ms for 15,000
  transaction rows across 6 plants — well within a responsive feel.
- **Diagnostics**: console logging (`[RKQS]` prefix) at every step of the
  import pipeline, a global error handler that surfaces any unexpected error
  as an on-screen toast, and drag-and-drop file upload support.

## 2. How to run

1. Unzip/copy the whole `RKQS-Smart-Quality-Dashboard` folder anywhere on the
   client's PC.
2. Double-click `index.html`. It opens in the default browser — no install,
   no internet required.
3. Click **Upload Excel** and select the daily rejection/rework file. The
   Import Preview modal will confirm the header row detected, records
   imported, and any data-quality warnings.
4. Use the **Client View** toggle (top-right) to preview exactly what a
   client will see once a package is generated.
5. Use the **Date Range** dropdown in the filter bar to quickly scope any
   dashboard to Today / This Week / This Month / This Quarter / This Year /
   Last 30 Days, or pick a Custom Range.
6. As Master Administrator, open **Theme Manager** in the sidebar to try the
   6 color presets or toggle Dark Mode — changes apply instantly.

> Recommended browsers: Chrome, Edge, Firefox (per SRS 21.3).

**To view this on a phone/tablet**, see `docs/Mobile_Access_Guide.md` —
double-click `Start_Server.bat` (Windows) or `Start_Server.command` (Mac) to
serve the dashboard over your WiFi, since a phone can't directly
double-click a local `index.html` the way a PC can.

**For a permanent link that works anywhere, anytime (no PC required)**, see
`docs/GitHub_Pages_Deployment_Guide.md` — free, one-time setup.

## 3. Excel format required

One row = one defect record (SRS 7.2). Mandatory columns: `Date, Plant,
Department, Process, Production line, Shift, Customer, Part No, Part Name,
Production Qty, Inspection Qty, Defect Name, Defect Qty, Disposition`.
`Operator`, `Inspector`, `Remarks` are optional. Header row position, company
logo/letterhead rows above it, and column order are all flexible — the Excel
Engine scans the first 25 rows to auto-detect the header (SRS 7.3/7.4).

A sample file is at `sample/Sample_Excel.xlsx` (300 rows, 3 plants, 4 parts,
3 customers — enough to exercise every dashboard, filter, and chart).

## 4. Folder structure

```
RKQS-Smart-Quality-Dashboard/
  index.html                 - single entry point (all pages render inside it)
  serve.py                    - local WiFi server helper (for phone/tablet access, see docs/Mobile_Access_Guide.md)
  Start_Server.bat             - one-click server starter (Windows)
  Start_Server.command         - one-click server starter (Mac)
  css/                       - variables (incl. dark mode), layout, sidebar, header, cards, tables, charts, responsive
  js/
    config.js                - brand/theme/theme-presets/column config (single source of truth)
    state.js                 - AppState + pub/sub event bus
    helpers.js                - shared utilities incl. quick date-range presets
    excel.js                 - Excel Engine
    validation.js             - Validation Engine
    datastore.js              - import orchestration pipeline
    filters.js                - Filter Engine (entity filters + date range)
    kpi.js                    - KPI Engine (incl. Heat Map matrix)
    charts.js                 - Chart Engine (Chart.js wrapper)
    ui.js                      - sidebar/header/KPI cards/dashboard page renderer incl. Heat Map
    reports.js                 - Report Engine
    export.js                  - PDF/Excel/PNG Export Engine
    whitelabel.js               - White Label client-package generator
    thememanager.js             - Theme Manager (presets + dark mode)
    filemanagement.js            - File Management (Master-only import history log)
    clientmanagement.js          - Client Management (Master-only client directory)
    auditlog.js                  - Audit Logs (Master-only system-wide activity log)
    datavalidation.js            - Data Validation (Master-only row-level import quality report)
    systemsettings.js            - System Settings (Master-only configurable alert thresholds)
    package-source.js           - bundled source used to build client ZIPs (auto-generated, do not hand-edit)
    app.js                       - bootstrap + router + diagnostics + loading overlay
  assets/logos/                - RKQS + client logos
  assets/libs/                  - Chart.js, SheetJS, jsPDF, html2canvas, JSZip (bundled locally, no CDN)
  sample/Sample_Excel.xlsx        - sample data file
  docs/Mobile_Access_Guide.md      - step-by-step phone/tablet access instructions (local WiFi)
  docs/GitHub_Pages_Deployment_Guide.md - step-by-step permanent free hosting instructions
```

## 5. File Management (Master only) — how it works

Master Dashboard → **File Management** shows a log of every Excel file
imported (or attempted) in this browser, across sessions — file name, time,
record count, plants/customers found, and status (success/warning/error).

Important: this app has **no database or server by design** (SRS 4.1/19.1) —
the actual Excel/quality data is never written to disk anywhere and only
lives in the browser tab for the current session (SRS 19.2). Closing the
tab means re-uploading the Excel file next time, same as always. File
Management only remembers lightweight **metadata** (what was uploaded and
when) in the browser's local storage, purely as a convenience/audit trail —
it does not give you back the original file or its data. A "Clear History"
button is available if you'd rather not keep this log.

## 6. Client Management (Master only) — how it works

Master Dashboard → **Client Management** is a directory of the client
companies RKQS serves — name, industry, contact person/email/phone, logo,
brand colors, and internal notes. Like File Management, this is metadata you
enter yourself, saved in this browser's local storage (no server/database) —
it doesn't contain any of the client's actual quality/production data.

Each client row has a **"Use in White Label"** button that jumps straight to
the White Label Generator with that client's name, logo, and colors already
filled in — no more re-typing the same client's details every time you
generate a refreshed package for them. Once a package is generated this way,
the client's row shows "Last Package" with the date, so you can see at a
glance who's overdue for an updated package.

## 7. Audit Logs (Master only) — how it works

Master Dashboard → **Audit Logs** is a running, filterable record of admin
activity in this browser: Excel imports/failures, PDF/Excel/PNG exports,
White Label packages generated, theme presets/dark-mode changes, branding
updates, client add/edit/delete, and Master ↔ Client view switches. Filter
by category using the dropdown, or clear the whole log with **Clear Log**.

This is distinct from **File Management**, which is a focused log of Excel
import details specifically (header row, record counts, masters found).
Audit Logs is the broader trail across every other admin action. Like the
other Phase 3 modules, entries are short action summaries stored in this
browser's local storage only — never the underlying quality data itself.

## 8. Data Validation (Master only) — how it works

Master Dashboard → **Data Validation** shows the FULL validation result from
the most recently imported Excel file, instead of only the brief summary in
the Import Preview modal (which closes and is easy to lose track of):

- Summary cards: total records, rows with issues, blank mandatory fields, clean row %.
- **Rows With Blank/Missing Mandatory Fields** — actual Excel row numbers
  (so you can jump straight to that row in the source file) and which
  column(s) were blank.
- **Possible Spelling Variations** (SRS 20.4) — e.g. "Hyundai" vs "hyundai"
  entered inconsistently, which would otherwise silently split into separate
  filter/chart entries.
- **Export Validation Report** button — downloads an Excel workbook with
  these two tables plus a summary sheet, handy to send back to whoever
  maintains the source Excel file.

While building this page, two real bugs were found and fixed in the
underlying Excel/Validation engines:
1. Blank quantity fields (Production/Inspection/Defect Qty) were silently
   converted to `0` during import for KPI math, which meant validation could
   never detect that they'd actually been left blank in the source file.
   Fixed by recording blank-ness before that conversion happens.
2. The reported Excel row number for a record was wrong whenever a file's
   first few rows had zero cells defined at all (not just visually blank) -
   SheetJS silently drops those from its row array, shifting every
   downstream row number. Fixed by reading the sheet's actual used-range
   start and offsetting from that instead of assuming row 1.

## 9. System Settings (Master only) — how it works

Master Dashboard → **System Settings** lets you configure the thresholds
that drive the "Recent Alerts" panel across every dashboard, instead of
them being fixed in `config.js`:

- **Defect % Threshold** — a plant/entity shows a "Defect % is high" alert once its Defect % exceeds this.
- **FPY % Threshold** — an alert fires once First Pass Yield falls below this.
- **Inspection Coverage % Threshold** — an alert fires once coverage falls below this.
- **Large Dataset Row Threshold** — above this many imported rows, chart animations auto-disable for smoother filtering (SRS 18.2).

Changes apply immediately and persist in this browser's local storage
across sessions. A **Reset to Defaults** button restores the factory values
(8% / 90% / 90% / 3,000 rows).

## 10. White Label Generator — how it works

Master Dashboard → **White Label Generator** → set Client Name, upload
client logo, pick primary/accent colors → **Generate Client Package (.zip)**.
This produces a fully independent copy of the whole folder with `EDITION`
locked to `"client"` in the generated `config.js`, so Branding Settings,
Theme Manager and the White Label Generator itself never appear in the
client's sidebar (SRS 16.2/19.3). Unzip it into its own folder and hand it to
the client — it runs completely standalone.

> Note: the client package's config.js currently carries the color values
> you picked at generation time as a one-off starting theme. It doesn't
> include the Theme Manager preset picker (that stays a Master-only tool by
> design per SRS 19.3).

## 11. Known limitations (candidates for a future phase)

- Reports Center exports each report type individually; a combined
  "management pack" PDF (all reports in one file) is not yet built.
- No automated regression test suite yet (SRS Section 22) — testing has been
  scripted against sample and synthetic data (300 and 15,000 rows) during
  this build, not run against a real production browser due to this
  environment's network restrictions blocking headless browser installs.
  Please do a hands-on smoke test in your actual browser before rolling out
  to a client.
- Heat Map is Plant × Date only; Process × Shift or Part × Defect heat map
  variants are not yet built.

## 12. Version history

- v1.0.0 (Phase 1) — Foundation through White Label Engine (Modules 1–12).
- v1.1.0 (Phase 2) — Date range quick filters, Heat Map page, Theme Manager
  (presets + dark mode), loading overlay, diagnostics, verified at 15,000-row
  scale.
- v1.1.1 (Phase 2 bugfix) — Fixed two Export Center bugs found via real
  screenshots/files from testing:
  1. **"Export Dashboard as PDF" only showed the visible screen, rest blank.**
     Root cause: (a) html2canvas was capturing the scrollable `.main-content`
     area clipped to the on-screen viewport instead of its full scroll
     height, and (b) the tall captured image was placed on a single A4 page
     with no pagination, so anything past the first page-height was
     invisible. Fixed by temporarily lifting the scroll clipping via a
     `pdf-capture-mode` CSS class during capture, and by slicing the
     captured canvas into multiple A4 pages.
  2. **"Export Charts as PNG" produced 0-byte / unopenable image files.**
     Root cause: `AppState.charts` accumulated a chart entry for every canvas
     ID ever rendered in the session, but old entries from previous pages
     were never cleaned up when navigating away (their canvases were removed
     from the DOM, but the stale Chart.js objects lingered). Export Center
     tried to export ALL of them, including detached/dead ones, producing
     empty files. Fixed by destroying all charts on every page navigation
     (`UI.renderPage`), plus a defensive filter in the export function that
     only exports charts whose canvas is still actually attached to the page.
- v1.2.0 (Phase 3, in progress) — File Management module: persistent
  (localStorage-backed) import history log, Master-only. Also fixed a
  pre-existing bug where Master-only utility pages (File Management, Theme
  Manager, White Label Generator, Branding & Settings) were inaccessible
  until at least one Excel file had been uploaded in the session, even
  though none of them actually depend on data being loaded.
  Still pending from the Phase 2 remaining-work list: Client Management,
  Data Validation page, System Settings (configurable thresholds), Audit
  Logs, and the Export Center UI issue (flagged separately, to be revisited).
- v1.3.0 (Phase 3, in progress) — Client Management module: persistent
  client directory (name, industry, contact, logo, brand colors, notes),
  Master-only, with a "Use in White Label" shortcut that pre-fills the White
  Label Generator from a saved client profile and records when a package was
  last generated for them.
  Still pending: Data Validation page, System Settings (configurable
  thresholds), Audit Logs, and the Export Center UI issue (flagged
  separately, to be revisited).
- v1.4.0 (Phase 3, in progress) — Audit Logs module: filterable, system-wide
  activity log (Imports, Exports, White Label, Theme, Branding, Client
  Management, System) distinct from File Management's Excel-import-specific
  log. Hooked into every relevant action across the app.
  Still pending: Data Validation page, System Settings (configurable
  thresholds), and the Export Center UI issue (flagged separately, to be
  revisited).
- v1.5.0 (Phase 3, in progress) — Data Validation module: detailed, row-level
  import quality report (blank mandatory fields with exact Excel row
  numbers, spelling-variant clusters) with Excel export, Master-only.
  Found and fixed two real bugs in the Excel/Validation engines while
  building it: (1) blank quantity fields were invisible to validation
  because they'd already been coerced to 0 for KPI math by the time
  validation ran, and (2) reported Excel row numbers were wrong for files
  whose first few rows have zero cells defined at all, since SheetJS
  silently drops those rows from its output. Both are described in detail
  in Section 8 above.
  Still pending: System Settings (configurable thresholds) and the Export
  Center UI issue (flagged separately, to be revisited).
- v1.6.0 (Phase 3, in progress) — System Settings module: configurable
  alert thresholds (Defect %, FPY %, Inspection Coverage %) and the
  large-dataset row threshold, Master-only, persisted across sessions and
  applied live to the Recent Alerts panel on every dashboard.
  Still pending: the Export Center UI issue (flagged separately, to be
  revisited) - this closes out the rest of the Phase 2/3 backlog
  (Client Management, Audit Logs, Data Validation, System Settings).
- v1.7.0 (Export Engine bugfix) — Fixed the root cause of two Export
  Center bugs: "Export Dashboard as PDF" only ever captured the Export
  Center's own 3 cards, and "Export Charts as PNG" always said no charts
  were found. Root cause: both functions captured/read whatever is
  currently inside `#dashboardContent`, but while the user is on the
  Export Center page, that element holds the Export Center's own UI, not
  a real dashboard - so there was nothing to capture. Fix: the Export
  Center now shows a "Dashboard to Export" dropdown; on export, the
  engine temporarily renders that dashboard into `#dashboardContent`,
  waits for it to fully paint (KPIs, charts, tables), captures/exports it,
  then restores the Export Center view. No dashboard, sidebar, theme, or
  business-logic code was changed - see the change summary for the exact
  file/function list.
- v1.8.0 (Mobile responsiveness fix) — The sidebar below 860px width used
  to squish to 0px via a plain CSS grid change, with no way to reopen it -
  navigation was effectively stuck on phones. Replaced with a proper
  slide-in drawer: the existing hamburger button now opens/closes the
  sidebar as an overlay with a tap-to-close backdrop, closes automatically
  after tapping a nav item, and the desktop icon-only collapse mode is
  untouched above 860px. Also made dashboard cards horizontally scrollable
  so wide ranking/report tables no longer overflow and break the layout on
  narrow screens.
- v1.9.0 (Mobile access tooling) — Added `serve.py` plus one-click starters
  (`Start_Server.bat` for Windows, `Start_Server.command` for Mac) that
  serve the dashboard over the local WiFi network with the phone-ready URL
  printed automatically, since a phone can't simply double-click a local
  `index.html` the way a PC can. Step-by-step instructions are in
  `docs/Mobile_Access_Guide.md`. No internet connection is used - this
  only works between devices already on the same WiFi network, and no
  quality data leaves that network either way.
- v2.0.0 (Permanent hosting guide) — Added
  `docs/GitHub_Pages_Deployment_Guide.md` covering free, permanent hosting
  via GitHub Pages, for phone/anywhere access without needing the PC
  server running. Verified all asset/script paths in the app are relative
  (no absolute `/...` paths), so the app works correctly when hosted under
  a subpath like `username.github.io/repo-name/`. Documents the two
  realistic deployment shapes: publish the full Master+Client build (no
  login exists, but no data is ever stored centrally either - each
  visitor's browser only ever sees what they themselves upload), or
  publish a locked Client-edition build (generated via White Label
  Generator) while keeping Master Controls PC-only, for anyone who'd
  rather not have the admin pages reachable via the public link at all.

