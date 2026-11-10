# HydroTwin Lab

Lab environment for student collaboration.

This repo is a copy of the `hydrotwin-site` **dev** build @ `c9b46c05` (25-year dataset, Oct 2001 - Sep 2026), published via GitHub Pages so students can experiment without touching the main project environments (production / dev).

What's in this build:
- 14 stations, classic + `-3d` WebXR pages under `stations/`
- Statistics Data view (classic pages): stat cards, charts, tables
- True-live forecast: gap-fills USGS/Open-Meteo data to today at forecast time
- DACP confidence intervals (70/80/90/95%) with per-station data in `dacp/`
- Soil & snow columns (NRCS) in the day panel
- Model drift panels (data + concept drift)
- Per-station ablation tables

- Live site: https://saurabhkulkarni77.github.io/hydrotwin-lab/
- Pushes to `main` redeploy the Pages site automatically.
