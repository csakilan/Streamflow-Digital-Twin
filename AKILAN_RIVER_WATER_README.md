# Mapped river water — experiment branch

This update changes only the Potomac (01646500) and Columbia (14105700) 3D scenes, using a shared water module. It runs inside the complete application. No AWS deployment, model training, building replacement, or imagery-provider change was made.

## What to open

Serve the repository root with `python3 -m http.server 8783 --bind 127.0.0.1`.

- Potomac: `/stations/USGS-01646500-3d.html?day=2025-05-10&water=mapped&waterVersion=2`
- Columbia: `/stations/USGS-14105700-3d.html?day=2025-05-10&water=mapped&waterVersion=2`
- Before/after evidence: `/docs/diagnostics/2026-11-10-water-fix/`

The top-right **Water: mapped** menu offers:

- **Mapped river:** terrain-draped reference geography, retaining mapped channels and islands.
- **Original estimate:** the original connected-cell/flow approximation, for comparison.
- **Imagery only:** no generated water or bank lines.
- **Show mapped banks & islands:** source shoreline lines, without artificial closing edges at the scene boundary.

The **Tabletop** button restores access to the existing table renderer. The in-scene **water** button cycles the three water modes; V switches table/ground views. Existing date, forecast, snow, data-view and geology controls remain available.

## What the water represents

The base footprint comes from cached USGS 3DHP Waterbody layer 60 responses: legacy NHD features dated 2023-09-14. These source features cover the queried main river/reservoir, not every minor waterbody. The detailed reach and the larger table block are clipped separately. Other waterbodies remain in the basemap.

Source polygon islands/holes survive clipping and triangulation. Borders are simplified with topology preservation at 0.5 m in the detailed reach and 2 m on the table; coordinates are rounded to 0.001 m for serialization. These are processing tolerances, not survey-accuracy claims. The build report records simplification differences separately from the pre-quantization mesh-coverage check.

Water geometry follows the host terrain triangles rather than stretching one flat plane across the dam. The slight rendering lift and shoreline fade are display choices. A separate 289-grid mesh matches the headset terrain grid, alongside the 385-grid desktop mesh and 257-grid table mesh. Hardware appearance and headset interactions have not been tested.

The mapped surface stays fixed when date, model or lead changes. It is not historical or forecast inundation and is not a surveyed water-surface profile. Precise physical water elevation still needs gauge/terrain datum reconciliation and riverbed/profile validation. The old QDEM assumption is used only by the explicitly selected original estimate.

Failed or incomplete DEM tiles keep the affected mapped surface hidden. Missing reference files leave the basemap visible and show an unavailable state; there is no silent fallback to the old estimate.

## Height and date readouts

The menu distinguishes **rating-estimated gauge height** from **measured USGS gauge-height sample summaries**. Both use feet relative to gauge zero, not sea level.

Bundled measured summaries cover 10–11 May 2025, with 96 readings per station/day. The displayed mean is the arithmetic mean of those readings, not a separately retrieved official USGS daily statistic. Sample range/count and provisional status are retained. Use **Look up this day** to request other dates; absent/failed data remains unavailable.

The menu's selected-day flow uses that date's recorded flow. Forecast playback uses the actual issued forecast at the displayed integer lead; lead zero is the issue-day observation. It does not substitute the continuously interpolated water animation or the separate latest-live beacon. Future observations, if displayed for comparison, are explicitly historical outcomes rather than forecast inputs.

## Code and checks

- `assets/river-water/`: shared adapter, terrain/data helpers, styles, local geography and measured samples.
- `scripts/build_river_water.py`: build-only Shapely >=2.1 geometry preparation from cached official source responses; no runtime Python dependency.
- `tests/river_water.mjs`: terrain interpolation, holes, modes, date binding, missing data, complete-terrain readiness, bank/crop boundaries and quantized triangle integrity.
- `tests/river_water_browser.mjs`: full-scene desktop checks and same-camera captures, including intentionally blocked DEM/reference requests.

Run `node --test tests/river_water.mjs` and the existing checks listed in the root README. Source forecast payloads, building footprints, snowfall and spatial-data assets are retained. Existing questionable building footprints and low-detail roofs/facades are separate known issues.
