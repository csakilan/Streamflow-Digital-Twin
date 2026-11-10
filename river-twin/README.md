# HydroTwin River Twin

An independent Three.js/WebXR app for Potomac at Little Falls (USGS 01646500) and Columbia at The Dalles (USGS 14105700). It includes its own data and runtime. No old HydroTwin pages or AWS deployment are needed.

From the project root, run `python3 serve_local.py`, then open http://127.0.0.1:8783/. This opens the standalone app. Saved imagery access in the root `.env` connects automatically. Without saved access, open Imagery setup and enter service access for this tab. No npm install is needed to run the included build. HTTPS is required for remote WebXR; localhost is allowed for desktop development.

## What to show

- Choose Potomac or Columbia. Select issue date, model, and lead. Orange is the supplied forecast; blue is the recorded outcome on the same target date.
- River panel: flow in cfs, rating-estimated gauge heights, and measured stage when packaged. The initial issue date, 2025-05-09, lead +1, has cached measured-stage data for both stations.
- 7 days: all seven predictions from one issue date with their historical outcomes.
- Weather: issue-date rain, temperature, soil moisture at sensor depths, and regional snow water equivalent (SWE). Unavailable data stays unavailable.
- Season: same-month flow context across other years, excluding the selected year.
- Accuracy: average absolute error, signed bias and comparison count over up to 90 resolved target days ending on the issue date. Lead only highlights a row. These retrospective forecasts are not a held-out model ranking.
- Aerial, close and tabletop views show Google captured photogrammetry. It is not a live camera or imagery for the selected date.
- 3D graph: X is target date, Y is rating-estimated river gauge height in feet, and Z is the selected issue-date environmental variable. Orbit with the mouse; select a curve point to inspect that issue date. Association is not causation.
- Drag the data panel header, minimize it to a flow summary, or use Reset panel. In WebXR, use a controller ray to press controls and grip to move the panel. Scene cycles between the landscape and graph; Graph Z variable cycles variables. The right stick turns the miniature/graph. Physical headset performance has not been verified.

## Full Data Space

Use **Data Space** in the landscape's bottom toolbar, or its button on the floating panel. This restores the previous three-area workspace with all nine panel types: station overview, river history, seven-day forecast comparison, environmental driver history, model comparison, factor relationships, selectable-axis 3D graph, seasonal context and accuracy by lead.

Choose a left, center or right area, then open a chart. Panels can be dragged by the title, enlarged, minimized and closed; graphs rotate independently. The full chart menu is also visible in the desktop dock. Date, model, lead and selected environmental variable are shared when moving between the landscape and Data Space. **River landscape** takes you back. Both stations and the correlation matrices are bundled locally; no original-site files are required. The two views share the standalone app’s date range, which reserves seven recorded target days for each issue date. In VR, the world-space River View button returns to the landscape; moving between pages ends the current immersive session, so press Enter VR again on the destination page.

## Riverbank overlay

Cyan marks independently sourced USGS 3D Hydrography Program waterbody boundaries from the cached 2023-09-14 reference. The source query, checksum and provenance are in each `data/*-banks.json`. Its lines include island banks and exclude artificial closing edges at the cropped study boundary. Coverage is limited to about 4 km around each gauge.

The bank builder reverses the original source's Web Mercator scale and projects WGS84 coordinates into the same East/Up/South frame as the 3D tiles. A texture shader drapes only the bank lines over rendered imagery, including when the miniature is scaled or turned. No water elevation is inferred, no Google geometry is extracted, and no guessed flood plane is placed over the river.

These are mapped reference banks, not a survey of today's shoreline or date-dependent inundation. Differences in source and imagery capture dates, resolution, and real water levels can leave local mismatches. Bank outline toggles the reference for inspection. Large Google Maps branding/provider credits remain visible, with USGS attribution separate.

## Data and limitations

The packaged 2001-10-01–2026-09-30 HydroTwin record contains USGS daily mean flow, regional weather/NRCS inputs, and supplied model outputs. This app does not train or improve those models. Gauge-height estimates invert the supplied station rating fit within its supported flow range. They are relative to a gauge datum, not depth or terrain elevation. Measured stage is a mean of available instantaneous USGS readings, currently cached for 2025-05-10 and 2025-05-11 only; it is kept separate from estimates.

Google and Cesium ion access requires the user's enabled account and network. Imagery is streamed in memory, not packaged or saved offline. Desktop and XR have separate memory budgets; some close-view detail may be limited by photogrammetry coverage and memory. No AWS account or bucket is created or modified.

The optional `prepare-banks.mjs` is a repository-only build tool for the independent USGS source; it is not required or included in the standalone runtime ZIP. Runtime libraries and licenses are in vendor/. Focused tests: `node --test river-twin/readings.test.mjs`; browser check: `node river-twin/browser-check.mjs` with the local server running.
