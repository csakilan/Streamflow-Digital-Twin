Akilan Chithra Sathish — HydroTwin updates
Stations: Potomac / Little Falls (01646500) and Columbia / The Dalles (14105700)

WHAT WAS ADDED
- A data-only 3D workspace with panels you can move, enlarge, minimize and close.
- A fully rotatable 3D graph with a selectable environmental variable.
- Seasonal context: compares river flow with the same month in other years.
- Forecast accuracy by lead: shows average error and over/underprediction for 1–7 days ahead.
- Automatic snowfall based on the selected date's historical snowfall estimate. Snow stops when the daily snowfall is zero. SWE remains separate snowpack data.
- Links between the new workspace, river scenes and the original detailed reports.

HOW TO APPLY
This ZIP contains our updates, not a standalone copy of the whole site.
Copy its contents into the existing HydroTwin site folder, preserving all other files. Both station pages and all supporting files in this ZIP must be included. Preserve any newer upstream edits by merging our hooks if necessary; original baselines are documented in the included manifests.
Serve the whole site folder over HTTP, as before. No build or dependency installation is needed.

OPEN
stations/USGS-01646500.html — Potomac data workspace
stations/USGS-14105700.html — Columbia data workspace
stations/USGS-14105700-3d.html?day=2024-01-13 — Columbia snowfall example
Change the date to 2024-01-15 to see snow stop.
Original detailed reports are available through Detailed reports, with a return link to our workspace.

NOTES
Snowfall uses local packaged ERA5/Open-Meteo daily historical estimates, not a snow measurement at the river gauge. Original SNOTEL SWE values do not trigger falling snow. Weather imagery and other original remote assets still need internet.
No new machine-learning model was trained. Original reports and other stations are preserved. Desktop interactions were verified; no physical headset testing or live deployment was performed.
See the two feature READMEs for details, limitations and attribution.
