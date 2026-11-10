# Spatial Data view Implementation Plan

> Execute natively using executing-plans; user requested implementation in this chat. Keep verification focused.

**Goal:** Run a data-only spatial workspace for the user's two stations.
**Architecture:** Isolated shared scene module, canvas panel renderer, small workspace/selection state, existing station data adapter and graph component. Preserve original station source/data contracts and route Data URLs to data-space entries, with ?report=1 for reports.
**Tech Stack:** Native ES modules, existing Three.js/OrbitControls, WebXR, CanvasTexture.
**Spec:** ../specs/2026-10-27-spatial-data-design.md

## Global constraints
- Only Potomac and Columbia entry pages change; preserve reports and snowfall.
- Native execution, no new dependencies/model training; all existing data assets remain unchanged.
- Missing readings are gaps; forecasts index the issue day and observations the target day.

## Review focus
- Date/lead combinations at dataset end must remain valid.
- Closing/minimizing/enlarging panels must not mutate data selection.
- Weather/SWE gaps never become zero or invented observations.
- Text and panel controls must be legible in spatial rather than browser-pixel coordinates.
- Original reports and all original Data links must remain reachable.

## Tasks
- [x] Add workspace state and reuse existing scientific adapter. Focused state tests: open/replace/close/reset and invalid date limits.
- [x] Add canvas charts/metrics/correlation using supplied arrays. Reuse graph.mjs without changing model code. Verify known issue/target values and missing snow.
- [x] Add floor, three spatial slots, toolbars, shared controls, panel manipulation and WebXR pointing. Browser check placement, date sync, controls and rendered screenshots.
- [x] Preserve original reports and wire both Data entries. Check both station loads and full app navigation.
- [x] Package the additive update, document limits, and make the full local app's new Data view available.

## Completion

Release `76af9acc3935`. Both stations passed focused state and desktop browser checks. Default, graph and relationships screenshots inspected. Original reports reconstruct byte-for-byte against the dev baseline after removing only the redirect hook. Overlay ZIP verified against its 11 source files. Physical WebXR device behavior remains untested; no deployment was performed.

Handoff: `HydroTwin_Spatial_Data_Potomac_Columbia.zip` beside the full local app directory. Instructions and baseline hashes are included.

## 28 October interaction correction

Release `ee9b4f0671d3`: ordinary panel/chart clicks focus without changing the date. Graph-body drags rotate a centered graph pivot independently of camera and panel, with unrestricted angles and desktop/in-world Reset graph controls. Controller trigger-and-turn support added; physical headset behavior remains untested. Title drags and shared date controls retain their roles.

Browser regressions passed for both stations: date unchanged on body click, graph rotates independently of camera/panel/date, horizontal and vertical turns continue beyond 180°, orientation resets, and original panel actions still work. State checks passed for both. Original report hashes still match after removing the redirect hook. The 11-file overlay ZIP was refreshed and byte-checked against its sources.
