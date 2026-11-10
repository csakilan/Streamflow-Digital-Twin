# HydroTwin spatial Data view — Potomac and Columbia

Prepared by Akilan Chithra Sathish, UTD RIDE · updated 28 October 2026.

## What changed

The two assigned stations open a data-only 3D workspace on a plain platform. The river landscapes and existing snowfall stay in their separate river scenes.

The two-row launch bar opens Overview, River history, Forecast comparison, Environmental drivers, Model comparison, Factor relationships, the existing 3D graph, Seasonal context, and Forecast accuracy by lead. Three areas can hold panels. Choose Left, Center or Right to focus an area; a new panel uses an empty area first, otherwise it replaces the focused panel. Selecting an already-open panel focuses it instead of making a duplicate. The new actions are labeled Seasonal and Lead accuracy.

Drag a panel's title to move it. Its −, □ and × controls minimize, enlarge and close it. Reset workspace restores the default three panels and camera while preserving the selected date, model, lead and input. Drag empty space to orbit; scroll to zoom; Focus panel moves the desktop camera closer to the focused panel.

The shared issue date, model, forecast lead and environmental input update every open panel. A target date is issue date plus lead. Clicking a chart focuses its panel and preserves the date. Change dates with the date field, timeline or previous/next buttons.

Drag inside the 3D graph to spin the graph independently in any direction. Rotation has no angular limits. Drag its title to move the whole panel. Reset graph restores the initial graph orientation while preserving the selected data and panel position; empty-space drags orbit the workspace.

## Data and limits

- Uses the supplied, unchanged `chart3d/<site>.json`, `corr/<site>.json` and reusable `assets/3dchart/` modules. No model is trained, replaced or modified.
- Observations are blue, forecasts orange, environmental inputs teal and snow inputs violet.
- Predictions are supplied retrospective forecasts indexed by issue date. Observations are compared at the target date. Environmental inputs are shown at the issue date.
- The Models panel reports MAE in cfs over the last 30 issue dates at the selected lead, with each model's available sample count. This is a local comparison window, not a new official model ranking.
- Seasonal context compares the observed target-day flow with all valid daily flows in the same calendar month from other years of the supplied record. The selected year is excluded. It shows the reference median, the 25th–75th percentile range, valid daily-flow and year counts, and the percentage of reference flows at or below the selected flow. Quantiles use linear interpolation. Below/within/above typical range refers to that middle 50% range; these are local retrospective comparisons, not official flood categories or published USGS normals. Reference years can be later than a historical selected day.
- Forecast accuracy by lead uses the selected model and up to 90 target days ending on the forecast-issued date. Changing the shared lead leaves this entire table unchanged; changing the issue date moves the evaluation window, and changing the model updates its forecasts. Every row uses the same target window; prediction issue index is target index minus that row’s lead. Missing pairs are skipped and counted. MAE is average absolute error in cfs; bias is average forecast minus observation in cfs (positive = overprediction, negative = underprediction). No outcomes after the selected issue date are used. These are retrospective supplied forecasts; an independent held-out evaluation is not established by these tables.
- The relationships panel shows a subset of the supplied full-record correlation matrix. Association does not establish causation.
- Heights are flow-derived estimates from the existing adapter, not measured water depth or mapped flood extent. The 3D graph retains X = target date, Y = estimated river height, Z = selected environmental input.
- Missing readings remain unavailable or break the plotted line. Potomac has no supplied snow station. Soil and snow readings can come from remote stations; the Drivers panel names the supplied source.

## Full app and original reports

Serve the complete site root over HTTP for local use. With the existing local server:

- Potomac: http://127.0.0.1:8783/stations/USGS-01646500.html
- Columbia: http://127.0.0.1:8783/stations/USGS-14105700.html
- Original Potomac report: http://127.0.0.1:8783/stations/USGS-01646500.html?report=1
- Original Columbia report: http://127.0.0.1:8783/stations/USGS-14105700.html?report=1

Existing Data links redirect to the new `data-space/` entries. The Detailed reports link opens the original reports. Their header includes Back to 3D Data view for the same station. All original classic HTML/data remains intact apart from the small redirect and return-link additions; all other stations retain their existing behavior. River scene links open the existing `-3d.html` pages.

## WebXR

On a supported browser, Enter VR shows the same panel launcher, area controls and shared date/model/lead/input buttons in the 3D scene. Point a controller and trigger a control; hold a panel's title to move it and release to place it. Hold the trigger over the graph body and turn the controller to rotate the graph. An in-world Reset graph button appears when the graph panel is focused. WebXR requires a compatible device/browser and a secure context (HTTPS or localhost).

Desktop interactions and screenshots have been checked for both stations. Physical headset behavior has not been tested. Original detailed reports remain conventional browser pages.

## Apply the ZIP

This is an additive Data-view update, not a standalone complete site. Merge its contents into the current full HydroTwin site root:

- Add `assets/spatial-data/` and `data-space/`.
- Update only the two included classic `stations/USGS-<site>.html` pages.
- Keep existing `assets/3dchart/`, `chart3d/`, `corr/` and all other assets.
- Keep the snowfall update and river pages already installed; this ZIP does not replace them.

The included station pages retain the full original source. If either has been edited upstream since the baseline in `AKILAN_SPATIAL_DATA_MANIFEST.json`, merge the `ak-spatial-data-v1` redirect hook and the `ak-spatial-return-v1` header link instead of overwriting newer edits. Keep `?report=1` as the redirect bypass. The source/date snapshot is recorded in the manifest. Module and stylesheet URLs contain a shared content stamp to avoid mixed cached versions.

## Focused verification

Workspace state checks passed for both stations: slot behavior, reset preserving selection, forecast/observation date indexing and date bounds. Browser checks passed for both: actual spatial launch-bar clicks, title dragging, panel controls, shared selection, graph points, relationships and no JavaScript exceptions. Interaction regressions check that chart-body clicks preserve the date; graph drags rotate the graph while preserving the camera, panel position and date; rotation continues beyond half-turns on both axes; and Reset graph restores its initial orientation. Rendered default, graph and relationships screenshots were inspected. Original report source was checked against the supplied current dev archive after removing the redirect hook and return-link addition; required original markers/data and 28 station-page count were preserved.
