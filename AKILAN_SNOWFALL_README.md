# HydroTwin date-driven snowfall — Potomac and Columbia

Prepared by Akilan Chithra Sathish, UTD RIDE.

## What changed

The two full river scenes now default to **Selected date · historical data**. Changing the historical date, stepping previous/next, or playing the historical timeline updates snow automatically. A positive daily snowfall total shows flakes; zero stops flakes immediately; missing/out-of-range data hides snow and says unavailable. The forecast lead does not change the historical weather date. During forecast-water playback, weather continues to represent the selected issue day, not an invented future weather forecast.

These changes apply only to Potomac 01646500 and Columbia 14105700. Existing terrain, buildings, water calculations, models, charts, reports and other stations are preserved.

## Source and interpretation

Local files in `assets/akilan-snow/history/` contain daily snowfall totals and weather codes for all **9,131 days, 2001-10-01 through 2026-09-30**. They were retrieved from the Open-Meteo Historical Weather API using the ERA5 reanalysis model at each gauge location, aggregated in the station's local timezone. The request URL, retrieval date, original response hash, units, requested coordinates and returned grid coordinates are included in each file.

- **Snowfall:** new daily snowfall, in cm (also displayed in inches). This drives historical flakes.
- **SWE:** water stored in existing snowpack, often from remote mountain SNOTEL sites. It never triggers falling snow here. Existing SWE charts retain their original meaning and source.
- ERA5 is an approximately 25 km historical weather grid, not a direct snowfall measurement at the gauge. Its estimates may differ from local reports. The interface labels these values **estimated**.
- The animation indicates snowfall occurred sometime during the selected local calendar day. It does not reproduce hourly timing, exact flake density, ground accumulation or a physically modeled snow cover. Greater daily totals produce qualitatively denser flakes.
- All history is packaged locally; moving through dates does not request weather from the internet. Other original scene imagery still requires internet.

Official source documentation: https://open-meteo.com/en/docs/historical-weather-api. Weather credit: ERA5 via Open-Meteo, CC BY 4.0.

## Controls and demonstration

Open the Snow control at the top-right:

- **Selected date · historical data** (default): follows the date shown in the scene and displays its estimated daily snowfall total and source.
- **Off:** hides snow.
- **Preview snow · manual demo:** deliberately overrides weather with adjustable illustrative flakes. Clearly labeled Preview.
- **Live weather · today:** independent of the historical date; current Open-Meteo WMO snow codes enable flakes. Requests refresh every five minutes; missing/failed weather hides flakes.

The existing in-world Snow button cycles historical → off → preview → live → historical. It works through the same existing desktop/XR action handler. No Quest hardware validation was performed.

Useful dates:

- Columbia **2024-01-13**: ERA5 estimates **9.24 cm (3.64 in)** of new daily snowfall. **2024-01-15** has **0 cm**, so flakes stop, even if snowpack remains.
- Potomac **2025-01-06**: ERA5 estimates **15.54 cm (6.12 in)**. **2024-07-13** has **0 cm**.

Normal URLs use historical mode. `?akSnow=preview` deliberately selects the manual demo; `?akSnow=off` and `?akSnow=live` select their explicit modes. The existing `?day=YYYY-MM-DD` parameter selects the scene date. Snow modules use `v=2` to avoid stale cached code.

## Handoff

Merge `HydroTwin_Snowfall_Potomac_Columbia.zip` into the full site, preserving the other files:

- Updated `stations/USGS-01646500-3d.html` and `stations/USGS-14105700-3d.html`.
- All five files under `assets/akilan-snow/`, including the two historical data files.
- This README and the original-source baseline manifest.

This ZIP is an overlay, not the complete site. The full local application is already updated and served at http://127.0.0.1:8783/. No live deployment or external repository edits are included. If station pages have changed upstream since the baseline snapshot, merge the small snowfall hooks instead of overwriting newer changes.

## Checks

Focused policy tests cover dated lookup, zero/missing/invalid values, qualitative intensity, SWE isolation and existing preview/live modes. Full-scene browser checks exercise both stations through the real date input, in-world navigation, forecast-lead changes, animated particles and manual overrides. Test files remain in the local full application.
