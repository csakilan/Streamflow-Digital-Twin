# Seasonal Context and Forecast Accuracy by Lead

User approved both proposed tables. Implement natively in the existing spatial workspace for the two assigned stations; keep river scenes, snowfall, existing panel interactions and supplied data/model code intact.

## Design
- Seasonal context uses the shared target day and all valid observed daily flows from its calendar month in other record years. Exclude the target year, count valid days/years, show median, 25th–75th percentile range, percentile of selected flow and a descriptive below/within/above-range label. This is a retrospective local-record comparison, not an official flood classification. Missing values remain unavailable. Use linear-interpolated quantiles.
- Lead accuracy uses the selected model and a shared 90-target-day window ending on the selected forecast-issued day. For each lead 1–7, pair `pred[model][lead-1][target-lead]` with `flow[target]`; use no observations later than the target date. Show MAE in cfs, signed mean bias (forecast minus observation) and valid pair count; no-pair rows remain unavailable. All rows use the same target window, and changing the shared lead leaves the whole accuracy table unchanged. Label this as retrospective supplied forecasts, not a verified held-out model ranking.
- Add Seasonal and Lead accuracy launch actions to the same three-area system. Use two rows of large spatial buttons for the nine panel types, and move XR shared controls below them. Ordinary panel clicks preserve dates; existing graph spinning and title dragging remain intact.
- Keep dataset arrays and original station reports unchanged. Include the new helper module in the additive ZIP.

## Review focus
Correct issue/target indexing, matching evaluation windows across leads, null/NaN filtering, no future targets, excluding the selected year from baseline, panel text/toolbar fit and unchanged click/rotation behavior.

## Tasks
- [x] Add pure analytics helpers and hand-calculated tests for seasonal quantiles/year exclusion, unavailable cases, forecast lead indexing, bias/counts and target-window end.
- [x] Add both canvas panels and two-row launcher actions to desktop and XR, preserving selection on layout actions.
- [x] Check both stations in the browser, inspect the new panel screenshots, refresh documentation/ZIP and make the full local Data view available.

Expected verification: `node tests/spatial_analytics.mjs`, `node tests/spatial_state.mjs`, `node tests/spatial_browser.mjs` pass. No physical headset tests or upstream deployment.

## Completion
Release `c4c7b4f918bc`. All three focused checks passed. Browser checks cover the actual spatial buttons for both new panels, separate panel areas, preserved target date, model synchronization, existing graph rotation/reset and title movement. Both stations' table screenshots inspected; the launcher remains readable in two rows. Author review checked issue/target indexing, common target windows, year exclusion, unavailable values and shared-module packaging. Original report baseline hashes remain unchanged after removing the existing redirect hook. The refreshed overlay ZIP contains 12 files including analytics.mjs and matches all source bytes. Physical headset behavior remains untested.

## User-requested window anchor correction

Release `74a5ee91efce`: accuracy ends on the forecast-issued date. Removed the selected-lead highlight and caption. Changing lead now preserves all accuracy statistics and rendered table content. Both-station browser checks verify the window end equals the issue date, lead changes preserve the full table, issue-date changes shift the window, and model changes update the summary. Focused calculation checks passed; original report hashes and the refreshed 12-file ZIP were verified.
