# Standalone river twin

Approved request: new viewer without the old site, clearly visible river numbers, accurate riverbank/water boundaries. Stations: Potomac 01646500 and Columbia 14105700. Preserve older scenes. No deployment or physical headset required.

1. Package the existing Three.js/WebXR imagery runtime, station datasets, graph and pure analysis inside river-twin. Load saved local access through the existing private endpoint.
2. Add station/date/model/lead selection and readable world panels for readings, a seven-day forecast run, environment, seasonal context and lead accuracy. Keep missing values explicit and measured stage separate from rating estimates. Retain the selectable-Z 3D chart.
3. Convert independent USGS bank paths from the documented Mercator frame into the imagery's WGS84 local frame. Drape a reversible bank-only overlay onto streamed materials. No crop closing edges, invented water elevation, or date-driven shoreline claims.
4. Focused data/projection tests, desktop and emulated XR interaction checks, and authenticated visual inspection at both stations. Package a standalone ZIP and open the new app. Keep credentials excluded.

Review focus: issue/target pairing; units and unavailable values; issue-date-ending accuracy window; stage summary provenance; all imported runtime/data paths internal; geographic projection; outline shader under table/XR transforms; provider credit visibility; no key in tracked files/package.

Progress:
- Existing saved-access feature checkpointed at 62b2411; its 8 runtime tests, local-server test and browser regression passed.
- Standalone runtime, both datasets, bank overlays, five data tabs and selectable-Z graph implemented.
- Data/projection checks passed. Authenticated imagery checked at both stations; refined bank style suppresses steep surfaces. Potomac close view remains memory limited; local source/imagery shoreline differences remain explicitly labeled.
- Fresh-context review found station-mode flag loss, graph billboarding under parent rotation, and fixed XR attribution. All fixed with failing-then-passing focused tests; accuracy copy now says up to 90 days.
- Independent ZIP served successfully from a temporary folder with no old site and no saved credential. Final browser verification passed for both stations, five tabs, graph selection, mouse/panel actions, denied/manual access, stereo XR/controller interactions and viewer-following XR credits. Five focused data/projection/rotation/access tests and the HTTP server test passed. Package rebuilt after review fixes.
