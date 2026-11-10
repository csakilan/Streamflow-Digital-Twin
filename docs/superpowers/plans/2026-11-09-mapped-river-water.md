# Mapped River Water Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct the reference river footprint at Potomac and Columbia in the full app, with an honest distinction between mapped geography and estimated heights.

**Architecture:** Prepare local meshes by clipping cached USGS polygons against terrain grid triangles. A shared Three.js adapter creates draped mapped water and shoreline overlays; small hooks connect existing terrain rebuilds, date/forecast selection and rendering. The old heuristic remains behind an explicit comparison control.

**Tech Stack:** Existing Three.js/WebGL, JavaScript modules, Python/Shapely build-only geometry processing, Node/Python checks, temporary Chrome CDP.

**Spec:** ../specs/2026-11-09-mapped-river-water-design.md

## Global constraints

- Work on experiment/river-water-layer; preserve main, source data/model payloads, snowfall and spatial data.
- No new deployment, paid API, large DEM download, model training or headset requirement.
- A mapped outline is not date-specific inundation; DEM draping is a rendering depiction, not calibrated absolute height.
- Preserve issue/target/lead semantics; label rating-derived heights estimated; no future observed data used in issued forecasts.

## Review focus

- Interior islands and disconnected channels survive clipping/triangulation.
- Terrain loading and relief changes update the layer without duplicate meshes or NaNs.
- Mode/date/forecast changes cannot re-enable hidden original flood meshes/dots.
- Failed local assets or absent measured height show unavailable/imagery rather than fabricated water heights.
- Datum uncertainty and incomplete geography coverage are visible; date changes never imply measured historical shoreline changes.

## Tasks

- [x] 1. Prepare mapped geometry. Add scripts/build_river_water.py and assets/river-water/data/{site}.json, geometry.mjs; test island holes, clipped triangle area and coordinate alignment in tests/river_water.mjs and a build verification report. Clip full main-river polygons to inner and table extents, with triangles aligned to the terrain grid. Store rings and provenance. Commit after geometry checks.
- [x] 2. Integrate shared rendering and controls. Add assets/river-water/{river-water.mjs,style.css}, hook only two station -3d pages. Expose createRiverWater({THREE,site,groundRoot,tableRoot,groundGrid,tableGrid,projectTable,source,...}), .rebuild(), .update(dt,selection), .setMode(mode), .snapshot(). Add old/new/imagery and shoreline controls, natural appearance, boundary fade, explicit estimated-height and measured-data readouts. Commit after focused state/geometry and existing checks.
- [ ] 3. Verify visual results and preserve evidence. Add browser capture/check script, exercise real controls/date/model/forecast/table mode at both stations, take same-camera screenshots and inspect them. Fix concrete findings, record limits and sources in docs/diagnostics/2026-11-09-water-fix/. Run existing Python and Node checks once after final edits. Obtain a fresh branch review, address material findings, commit and push the experiment branch. Keep main untouched.

## Execution record

- Baseline: 32905ad, clean experiment branch. Existing suite: 268 Python checks plus snow/state/analytics scripts passed in preceding repository setup.
- Ruling: use the existing dedicated branch in place rather than duplicating the 357 MiB app into a second working copy; the local server must continue serving the full application and the user has limited storage. Main and the baseline tag preserve rollback.
- Ruling: datum differences remain unresolved. First deliverable uses a fixed mapped reference depiction and explicitly estimated gauge-height comparisons; no invented dynamic flood extents.

- Task 1: complete. Five Node checks pass after RED→GREEN for terrain sampling, polygon holes, unavailable mode, stage filtering and rounded mesh degeneracy. Build verifies exact clipped coverage before coordinate rounding; source/simplification/quantization provenance retained. Local meshes total 3,598,769 bytes.
- Task 2: complete. Both full scenes pass desktop mode/date/model/lead/forecast/table/relief checks. Added explicit estimated-height labels and measured sample readouts; verified embedded HT3D and BAKED_BUILDINGS lines unchanged.
- Ruling: the upstream current build contained a tabletop renderer but no reachable mode button. Restored a Tabletop button and existing V/view action so mapped water can actually be compared in that view.
- Ruling: measured height is a separately labeled sample summary; bundled coverage is only 10–11 May 2025, with an explicit selected-day lookup for other dates. It does not calibrate terrain elevations.
