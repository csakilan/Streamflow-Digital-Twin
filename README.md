# Streamflow Digital Twin

Akilan Chithra Sathish's UTD RIDE research workspace for HydroTwin river visualization. This repository saves the current full application and provides a baseline for improving the realism of the river water layer.

## Source and scope

The application is based on Saurabh Kulkarni's [HydroTwin Lab](https://github.com/saurabhkulkarni77/hydrotwin-lab) and [hydrotwin-site](https://github.com/saurabhkulkarni77/hydrotwin-site). The supplied lab README identifies its source as the `hydrotwin-site` dev build at `c9b46c05`; the local review copy was subsequently refreshed from the public dev build. The original README is preserved in [docs/upstream/README.md](docs/upstream/README.md).

The full 14-station application, baked forecasts, model sidecars, and original detailed reports are included. Akilan's station-specific additions focus on:

- **Potomac River at Little Falls — USGS 01646500**
- **Columbia River at The Dalles — USGS 14105700**

These additions include snowfall driven by the selected date's historical snowfall estimate, a spatial 3D data workspace, a rotatable 3D chart with a selectable environmental axis, seasonal context, and forecast accuracy by lead. The accuracy table uses a window ending on the forecast issue date; changing the selected lead does not move that window.

## Run locally

From this repository's root, using Python 3:

```sh
python3 -m http.server 8783 --bind 127.0.0.1
```

Open `http://127.0.0.1:8783/` for the complete application. Useful pages:

| View | Path |
| --- | --- |
| Potomac river scene | `/stations/USGS-01646500-3d.html` |
| Columbia river scene | `/stations/USGS-14105700-3d.html` |
| Potomac spatial data | `/data-space/01646500.html` |
| Columbia spatial data | `/data-space/14105700.html` |
| Original detailed report | `/stations/USGS-01646500.html?report=1` |
| Water/building diagnosis and screenshots | `/docs/diagnostics/2026-11-09/` |

External imagery, terrain, browser libraries, and current weather services require an internet connection. Baked application data and historical snowfall files are included locally. A deployed headset WebXR session requires a secure HTTPS context; laptop inspection does not require a headset.

## Documentation

- [Summary of existing additions](AKILAN_UPDATES_READ_ME_FIRST.txt)
- [Snowfall behavior and data provenance](AKILAN_SNOWFALL_README.md)
- [Spatial data workspace](AKILAN_SPATIAL_DATA_README.md)
- [Water/building diagnosis](docs/diagnostics/2026-11-09/diagnosis.md)
- [Water-layer research](docs/research/2026-11-09-water-layer/research.md)

The existing water rendering remains an approximate visualization. The research documents distinguish mapped shorelines, estimated water heights, and calibrated flood modelling. Saving this baseline does not implement the researched replacement water layer or train new forecasting models.

## Version history and deployment

`main` holds the saved full-app baseline. `experiment/river-water-layer` is the separate branch for the upcoming water-layer experiment. The `baseline/pre-water-layer` tag marks the starting point.

Inherited GitHub workflows are preserved as inactive reference files in [docs/upstream/workflows](docs/upstream/workflows). Some target Saurabh's AWS resources or scheduled pipelines. This repository does not automatically deploy to those environments. No deployment credentials are included.

The earlier standalone Potomac demo and Unity project remain separate projects; this repository tracks the current full WebXR application.

## Existing checks

Install pytest in your preferred Python environment, then run:

```sh
python3 -m pytest tests/ -q
node --test tests/snow_policy.mjs
node tests/spatial_state.mjs
node tests/spatial_analytics.mjs
```

The Python suite checks baked station pages, data contracts, and internal links. The Node checks cover snowfall decisions, workspace state, and data summaries. Browser checks are also included under `tests/` for the existing local browser workflow.

Original source attribution and bundled third-party notices are retained. No new blanket license is assigned to the upstream application or external data.
