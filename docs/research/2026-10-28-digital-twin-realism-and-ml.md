# HydroTwin: real-world fidelity and practical ML upgrades

Research date: 28 October 2026. Scope: the full local HydroTwin application, its new spatial Data view, the two assigned stations, and selected current source files in Saurabh's model repository. This document records findings and proposed work; it does not report new training results or implemented upgrades.

## Main finding

The project has real geographical data, observations and trained forecasting models. The largest remaining fidelity gaps are the connection between those observations and the scene's physical water level, consistent live inputs, and validation of spatial water behavior. Better graphics and additional charts alone would not establish accurate depths or flood extent.

## What the audit establishes

| Component | Verified state | Consequence |
|---|---|---|
| Spatial Data view | Reads local chart3d station JSON, containing daily history from October 2001 through September 2026 and supplied predictions. | Its current panels are historical analyses. They do not automatically follow the original pages' Live mode. |
| Existing river/report pages | Include USGS live-data requests, neural ONNX inference and classical/GP parameter-based forecasting. | Live and ML infrastructure already exists. It needs end-to-end verification and integration rather than replacement with a claim that the project has no ML. |
| Model training | The inspected model source defines neural models, chronological train/validation/test periods, fitting and ONNX export. The workflow includes refresh, training/export and publication steps. | Code existence does not establish the latest successful execution, model freshness or deployment health. The README and workflow differ on cadence; the inspected workflow schedules weekly runs. |
| Gauge height | The spatial adapter uses a station-specific fitted flow-to-stage relationship. Both station JSON files have an empty stageObservations object and explicitly mark their vertical reference relative-only. | The packaged displayed heights are estimates; they are not measured stage or validated absolute water elevations. |
| Reference water level | The river page uses the 25th percentile of historical flow as its assumed reference level for the terrain, then calculates a relative rise. | This is an assumption, not a surveyed alignment between the gauge and the terrain. |
| Spatial water | The river page derives channel seeds from terrain minima, smooths them to fall downstream, and fills connected low cells as stage rises. | It is a useful approximate visualization. The code inspected does not establish a calibrated dynamic hydraulic simulation of depth, velocity or flood extent. |
| Geography and buildings | Terrain and imagery use geographical map services. Building footprints are extruded; missing height/levels fall back to type-based heights or seven metres. Tabletop relief can be exaggerated. | Positions can be real while heights, appearance and vertical scale remain approximate. Imagery is not a live image of the selected date. |
| Environmental inputs | Potomac metadata identifies DCA airport weather and an off-site soil station; Columbia uses DLS weather and regional soil/snow stations. | These are point/regional inputs, not a spatial measurement of all upstream conditions. Potomac has no packaged snow observations or 20-inch soil moisture. |

Local evidence: assets/spatial-data/app.mjs, assets/3dchart/data.mjs, chart3d/01646500.json, chart3d/14105700.json, and the two original -3d station pages. Particularly relevant river-page functions are stageFt, dHof, Flood.fill, bedSeq, fetchLiveSoilSnow and bigModelLive.

Current model-source references: [training/export](https://github.com/saurabhkulkarni77/hydrotwin-models/blob/main/train_export.py), [data windows and fitting](https://github.com/saurabhkulkarni77/hydrotwin-models/blob/main/train_lstm_normal.py), [scheduled workflow](https://github.com/saurabhkulkarni77/hydrotwin-models/blob/main/.github/workflows/daily-retrain.yml). This was a selected-source inspection, not certification of every model or branch.

## Foundation work with direct real-world value

### 1. Synchronize and label observations

Use a shared station data service for the river scene and spatial panels. Preserve source, units, observation time, daily-versus-instantaneous statistic, quality flags and missingness. Separate historical replay from current observations and forecasts. Cache the two stations' requests and show stale/error states rather than silently presenting old values as current.

USGS provides continuous and daily data through modern APIs. Query available stage and flow series and their metadata first; availability and transmission latency are station-specific. A daily mean should not be compared with an instantaneous reading as if they were the same quantity. [USGS APIs](https://api.waterdata.usgs.gov/), [migration guide](https://api.waterdata.usgs.gov/docs/ogcapi/migration/).

### 2. Align gauge and terrain elevations

Obtain the gauge's documented vertical reference, check the terrain's reference and survey date, and establish the conversion between them. Compare fitted heights with actual stage where available. A gauge height is measured relative to the gauge's datum; that is why it cannot simply be placed at the same numerical height in a terrain model. [USGS measurement explanation](https://www.usgs.gov/water-science-school/science/how-streamflow-measured).

For improved visual terrain, inspect USGS lidar/DEM coverage for a small reach around the station. Download only the needed area. Better terrain resolution does not itself supply surveyed underwater channel geometry. [USGS elevation availability](https://www.usgs.gov/tools/national-map-viewer).

### 3. Correct live feature semantics and history

Two specific issues are visible in the original local live-inference path:

- bigModelLive obtains one current soil/snow object and repeats its values across every row of the 29-day input. Supply historical daily values matching each input date, with consistent sensor depth, units and preprocessing.
- The Open-Meteo fallback converts snow_depth to inches and assigns it to the SWE input. Depth and melted-water equivalent require a density relationship; converting length units does not perform that conversion. Prefer measured SWE, or use an explicitly justified estimation model with uncertainty and missingness handling. [NRCS explanation](https://www.nrcs.usda.gov/resources/education-and-teaching-materials/climate-glossary).

These findings concern the inherited live feature path, not the separately labeled snowfall demonstration. Forecast testing should also distinguish genuine measurements, model-derived inputs and imputed values.

### 4. Represent upstream influences

Build catchment-aware rainfall inputs using watershed boundaries and multiple weather/grid locations. Assess upstream flow, snowmelt and operational influences. For Columbia, USACE publishes The Dalles inflow, outflow, spill and elevation information; usable history and forecast-time availability still need checking. Retrospective releases cannot be treated as known future inputs. [The Dalles project data](https://www.nwd-wc.usace.army.mil/dd/nwdp/project_daily/webexec/rep?r=tda).

## ML and modeling candidates

### A. Learned forecast correction — recommended first ML experiment

Train a small XGBoost regressor to predict the remaining error of an existing forecast, separately by lead or with lead as an input. Candidate inputs are the base forecast, recent observed flows and resolved forecast errors, recent rainfall, season, and valid soil/snow history. Inputs must have been available at forecast issue time.

Train using out-of-sample base forecasts, chronological splits and a separate untouched test period. Compare corrected forecasts against the original model and persistence. Report MAE, signed bias and high-flow-event peak magnitude/timing by lead. Retain the correction only if the test evidence supports improvement; it is not inherently better because it adds another model. Train in Python and export versioned predictions/parameters for the app.

XGBoost also supports quantile objectives, making it a candidate for learning asymmetric forecast ranges. [Official XGBoost example](https://xgboost.readthedocs.io/en/latest/python/examples/prediction_intervals.html). The HydroTwin residual-correction design above is a proposed experiment, not a reported result from that example.

### B. Calibrated forecast ranges

Evaluate existing forecast bands and, where needed, add time-series-aware calibration using a method such as MAPIE's EnbPI/ACI or conformalized quantile predictions. The interface would display a central prediction, interval, observed coverage, interval width and evaluation sample count.

Calibration must use resolved earlier forecasts and remain separate from final testing. Check coverage per lead and during high flows, not only as a pooled average. A nominal 90% interval is not a promise for every event, and changing river conditions can invalidate assumptions. Spread across different models is not automatically a calibrated probability interval. [MAPIE time-series example](https://mapie.readthedocs.io/en/latest/generated/regression/2-advanced-analysis/plot_timeseries_enbpi/).

### C. Forecast-weather-conditioned LSTM or Transformer

The inspected existing neural inference uses a 29-day historical input to emit seven forecast values. A useful extension is to add rainfall and temperature forecasts for the upcoming days, with watershed-aware sampling. NeuralHydrology provides forecasting LSTM architectures that explicitly handle historical and forecast inputs. [Implemented model families](https://neuralhydrology.readthedocs.io/en/latest/usage/models.html).

Training/evaluation must use weather forecasts as they were available at issuance, rather than substituting the future weather that ultimately occurred. Open-Meteo's Previous Runs and Single Runs archives provide relevant access patterns, with model/variable-specific and generally shorter histories than our 25-year river record. Verify coverage before choosing the experiment period. The stitched Historical Forecast series is not a substitute for an arbitrary complete seven-day forecast as issued. [Archived forecast options](https://open-meteo.com/en/docs/historical-forecast-api), [fixed-lead previous runs](https://open-meteo.com/en/docs/previous-runs-api).

### D. Water-balance hybrid model — larger experiment

Use a conceptual catchment water model coupled to a learned parameterization, producing interpretable storage/snow/runoff states as well as discharge. NeuralHydrology implements a HybridModel combining an LSTM and a conceptual hydrological component. This is a distinct experiment from adding a physics-inspired name to an existing predictor. [Hybrid implementation](https://neuralhydrology.readthedocs.io/en/stable/api/neuralhydrology.modelzoo.hybridmodel.html).

This needs catchment-representative precipitation, temperature, evaporation and relevant basin attributes. Audit the existing PILSTM models before claiming this capability is wholly absent. Such a catchment model alone does not determine street-level water depths or velocities.

### E. Calibrated hydraulics, then a fast surrogate — strongest spatial-twin extension

Build or obtain a calibrated hydraulic model for a small river reach, with appropriate channel/floodplain geometry, roughness, structures, initial conditions and upstream/downstream boundaries. Validate water levels and, if available, observed inundation extents. Export its depth, water-surface and velocity outputs to WebXR.

HEC-RAS documents the terrain, mesh, roughness, structures and boundary-condition workflow needed for a 2D model. [USACE workflow](https://www.hec.usace.army.mil/confluence/rasdocs/r2dum/latest/introduction/developing-a-2d-or-1d-2d-unsteady-flow-model).

A later ML surrogate could learn to approximate those calibrated simulation outputs quickly enough for interactive exploration. It would require a simulation dataset, independent-event validation and out-of-range safeguards. Training on the existing approximate connected-fill outputs would learn that approximation, not independently establish real flood behavior. This is a substantial research phase, not a quick rendering change.

## Validation and delivery

Before new model work, confirm which dated model build generated the existing predictions. Keep benchmark models and live production updates distinct. Fit preprocessing on training data, and ensure every target in each seven-day window stays within the assigned train/validation/test split. The inspected common windowing source assigns splits by the first target; boundary overlap should be audited and purged for new experiments.

Useful external comparison: NOAA NWPS exposes observations, NWS forecasts, ratings/metadata and National Water Model guidance. Match the gauge/reach, units, statistic and issue time before comparing. NWM guidance is not itself an official NWS forecast, and the documented NWM API has a short rolling archive; start archiving issued runs for reproducible prospective tests. [NOAA data services](https://water.noaa.gov/about/api).

Recommended order:

1. Correct input semantics/history, data freshness and shared timestamps.
2. Retrieve available measured stage, align vertical references and validate height estimates.
3. Test a small forecast corrector and calibrated intervals on existing trustworthy predictions.
4. Add watershed-aware, forecast-time weather and relevant operational inputs.
5. Develop calibrated reach hydraulics and consider a surrogate when the required data exists.

The first three are a practical initial workstream. Reach-scale hydraulic realism has additional data and calibration dependencies. No new models were trained and no application behavior was changed during this research.
