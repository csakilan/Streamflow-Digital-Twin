# Water-layer research — Potomac and Columbia

Research date: 9 November 2026 (America/Chicago). Public API responses retrieved after midnight UTC on 10 November are still from this local research date. This is research and feasibility checking; the river scene source files remain unchanged.

## Recommendation

Use a hybrid approach in the existing Three.js/WebXR app: a mapped, imagery-checked base water footprint; an explicitly sourced water-height/profile representation; and separate observed/forecast comparison overlays. Treat Potomac and Columbia as different hydraulic settings. Resolve height-reference and riverbed-data gaps before claiming predicted flood extents.

The first visible improvement can be made with the mapped outlines already retrieved during diagnosis. Accurate water-body geography does not require waiting for a new ML model or paid imagery provider. The source mapping is a reference footprint rather than a shoreline measured on every historical slider date.

## What is wrong with the present water layer

The current code uses NLDI/NHDPlus centerlines and a nearest-channel terrain flood-fill heuristic. A grid cell is drawn entirely wet if any of its four corners is wet. The detailed cell spacing is 8.91 m at Columbia and 9.91 m at Potomac. More cells or better antialiasing would improve the visible steps, but would leave the basic bank-geometry and height-reference assumptions unresolved.

`QDEM` assumes the DEM water level corresponds to the record's 25th-percentile discharge. `bedSeq` derives a monotonic downstream sequence from local terrain minima. Neither is a surveyed longitudinal water-surface profile or a riverbed model. The displayed discharge-derived stage is a height at a gauge; it cannot establish the water surface everywhere in the scene. In particular, one continuous plane cannot represent a drop over a dam.

The current material has opacity 0.88, no depth writing and a procedural normal map. The photographs remain visible underneath, including a captured vessel in the Columbia comparison. Flow also changes the blue/brown water color through a display rule, without a measured turbidity input. That rule should be presented as a data encoding rather than actual water color.

## 1. The mapped river footprint: use USGS polygons, not a centerline buffer

Primary service: https://3dhp.nationalmap.gov/arcgis/rest/services/usgs_3dhp_all/FeatureServer/60
Program/product context: https://www.usgs.gov/3d-hydrography-program/access-3dhp-data-products

Waterbody layer 60 returns polygons for River, Lake and Canal classes and supports GeoJSON as well as ArcGIS JSON. This gives the base water boundary. Flowline layer 50/NLDI remain useful for flow direction and network connectivity, not river width.

Verified local results from the cached full-resolution diagnostic queries:

- Columbia's study reach intersects the Lake Bonneville polygon: 18,999 vertices, 121 rings (one exterior and 120 interior rings across the entire feature).
- Potomac intersects two River polygons: 75,229 and 73,930 vertices, with 370 and 82 rings respectively across their full extents.
- These local features are carried-forward NHD data, with a feature date of 2023-09-14. They must be checked against the selected basemap and source dates; the 3DHP service name does not make them new surveyed banks.
- A separate simplified Columbia query requested Z values. All 2,510 returned Z samples were zero. These are not usable water elevations, despite the geometry advertising hasZ=true.

Important implementation details:

1. Clip the polygons to each scene's geographic extent; do not ship the full river and reservoir geometry unnecessarily.
2. Preserve disconnected components, channels, islands and interior holes. Large feature areas include many islands far outside our local block; count local holes after clipping.
3. Merge shared polygon seams without merging away a dam-related water-level discontinuity.
4. Reproject into the same local meter coordinate system as terrain and buildings. Track source CRS, horizontal datum, units, version and feature IDs.
5. Build a triangulated mesh or polygon mask whose boundary follows the vector shoreline independently of the old 9–10 m water grid. If draping over terrain, subdivide interior triangles adaptively so long triangles do not cut through curved terrain.
6. Add only a small rendering depth offset to avoid flicker. That rendering offset is not a physical water-level calibration.

ArcGIS geometry reference: https://developers.arcgis.com/rest/services-reference/enterprise/geometry-objects/
Three.js supports shapes with holes and polygon triangulation: https://threejs.org/docs/pages/Shape.html and https://threejs.org/docs/pages/ShapeGeometry.html

Potential alternate outlines are OpenStreetMap water polygons or manually reviewed image-derived masks. Neither has been established as more accurate at these reaches. An automatic color threshold or satellite water index would need validation around shadows, vegetation, docks and whitewater. A low-resolution satellite water mask alone would not meet the desired bank-level detail.

## 2. Measured height is available, but datum handling matters

Official stage/discharge explanation: https://mn.water.usgs.gov/infodata/FAQStreamgaging.htm
Site service definition: https://waterservices.usgs.gov/docs/site-service/site-service-details/
NOAA vertical conversion service: https://www.vdatum.noaa.gov/docs/services.html

A live research request for USGS parameter 00065 returned 96 quarter-hour height readings per station on 2025-05-10:

| Station | Sample daily mean, computed from retrieved readings | Daily min/max | Unit |
|---|---:|---:|---|
| Potomac | 4.191875 | 4.14 / 4.25 | ft above its gauge reference |
| Columbia | 77.081458 | 76.65 / 77.50 | ft above its gauge reference |

These calculated daily means are research summaries, not a newly retrieved official USGS daily-mean product. The direct USGS daily-values request for 00065 over the sample dates returned no series; instantaneous values did return data. Thus a historical import may need to aggregate subdaily readings by the station's local calendar day, retain quality flags/coverage, and leave gaps unavailable. Only the sampled dates were verified here; complete 2001–2026 stage coverage has not been checked.

Use observed stage where available for the observed scene. A forecast model currently supplies discharge; any conversion of forecast discharge into stage remains estimated and must retain its source, valid range, uncertainty and issue/target timestamps. The observed water height at a gauge does not automatically validate the entire scene's water surface.

Datum checks found material source differences:

- Current USGS site metadata lists Potomac's altitude/reference value as 37.04 ft, NAVD88. Older official station reports list 37.95 ft, NGVD29. These are different vertical references; the old value must not be added directly to NAVD88 terrain.
- NOAA BRKM2 metadata lists 37.2 NAVD88 in its vertical datum record. This differs from the current USGS site value; reconcile agency records, datum history and the exact reference before claiming precise absolute water elevation.
- Columbia's USGS site metadata lists 0.0 with NGVD29, but the generic altitude accuracy field is 20 ft. Its NOAA datum list is empty. The historical station description says the gauge is sea-level referenced, but a precise contemporary conversion to the chosen terrain datum still needs an authoritative check.
- Altitude-of-gauge/land-surface metadata is not universally a guarantee of the stage-zero elevation. Confirm the specific station reference before applying an offset.
- The existing AWS Terrarium tiles combine source products. The reviewed publisher pages do not establish a single verified vertical reference for these specific tiles. Do not simply assume the entire mosaic is NAVD88 or EGM96.

Conceptually, absolute water elevation equals stage plus its verified gauge-zero elevation, followed by the appropriate vertical-datum conversion. The inputs must use consistent units, reference epoch and valid source metadata.

## 3. Potomac and Columbia must not share one hydraulic assumption

### Potomac / Little Falls

The gauge is immediately upstream of Little Falls Dam. The dam is visible in the diagnostic imagery. Use separate upstream/downstream reaches and avoid stretching one gauge height across the drop. The gauge's stage anchors only its own reach; the downstream side needs its own elevation/profile evidence or an explicitly illustrative treatment.

Official station description: https://pubs.usgs.gov/wdr/WDR-VA-02-1/pdf/section_4.pdf

A strong new terrain/bathymetry candidate is the **Potomac River Pilot Topobathymetric DEM**, released 13 July 2026, DOI 10.5066/P13BBWDB. It combines land and submerged riverbed elevations at 1 m spacing, in NAD83(2011)/UTM18N and NAVD88/GEOID18. Its catalog extent contains Little Falls; valid-pixel coverage for the precise scene still needs checking. A 1 m posting is not a promise of 1 m positional or vertical accuracy. Source surveys span multiple dates and include gaps/merged inputs.

Publisher: https://www.usgs.gov/data/potomac-river-pilot-topobathymetric-digital-elevation-model-1979-2025
Catalog: https://www.sciencebase.gov/catalog/item/69fb57eab66b01ed9290822f

Practical access findings:

- The catalog is readable and lists a 18,699,417,699-byte COG raster (about 18.7 GB decimal).
- Two small partial requests to its listed manager and download URLs returned HTML file-manager pages, not TIFF bytes. HTTP 206 was therefore not proof of usable raster range access.
- The dataset exists, but remote raster reading/cropping through a working download URL is not verified. The standard ScienceBase download workflow or a suitable published mirror must be resolved before adopting it.
- Do not download the whole product to the laptop. Once valid block/range access is established, crop only the study reach. A 2 km × 2 km, 1 m Float32 grid is about 16 MB raw; the actual transfer depends on block layout/compression. This size arithmetic is not a measured download size.

Earlier topobathymetric sources are also publicly described: https://www.usgs.gov/news/technical-announcement/new-usgs-national-map-data-reveals-potomac-rivers-submerged-topography . The 2019/2021 coverage runs down to Little Falls; the new integrated product is a better candidate for cross-dam coverage, pending pixel/access checks.

### Columbia / The Dalles

The gauge is downstream of The Dalles Dam in the Lake Bonneville reservoir reach. Its water surface is influenced by downstream reservoir regulation. A single discharge-to-height relationship may omit effects of pool operations/backwater. For observed history, use the measured local height when available; a predictive stage model may also need a downstream-pool boundary.

Official station location: https://water.usgs.gov/nwc/NWC/sw/man/S14105700.html
USACE reservoir context: https://www.nwd-wc.usace.army.mil/dd/common/projects/www/bon.html
Reservoir water-surface profile discussion: https://water.sec.usace.army.mil/cda/documents/wc/2530/Bonneville%20Dam%20Reservoir%20Regulation%20Manual_OCT2014_Redacted.pdf

Do not assume a completely flat pool at all flows. A local flat-water approximation may be useful at low flow, but its spatial extent and errors must be checked; the historical USACE manual describes increasing pool slope at higher flows.

USACE provides public hydrographic survey PDFs and XYZ data. The Dalles Dam Lock sheet CL_52_DDL spans river mile 188+30 to 191+40, survey date 2022-01-05; the upstream station description places our gauge near mile 188.9. This is a relevant channel-survey candidate, not verified bank-to-bank coverage. The listed vertical references are navigation/pool-based, so conversion into the scene datum is necessary.

Survey catalog: https://hydrosurvey.nwp.usace.army.mil/nav_pgs/n_columbia_2_vancouver-thedalles.asp
Survey sheet: https://hydrosurvey.nwp.usace.army.mil/nav_data/CL_52_DDL_20220105_CS.pdf
XYZ listing: https://hydrosurvey.nwp.usace.army.mil/nav_data/CL_52_DDL_20220105_CS.dat

A misleading candidate was ruled out: the September 2026 coastal Oregon/Washington CoNED DEM includes a Columbia corridor, but its catalog eastern limit is longitude -121.7459. Our gauge is at -121.1899167, outside that extent. It must not be presented as bathymetric coverage for The Dalles.

Ruled-out product: https://www.usgs.gov/data/topobathymetric-digital-elevation-model-tbdem-coastal-oregon-and-washington-including-columbia
Catalog: https://www.sciencebase.gov/catalog/item/6aa036571ba49bc751150b15

## 4. Existing inundation services are not a verified drop-in replacement

NOAA NWPS responses identify Potomac as BRKM2 and Columbia as TDAO3. Both returned `inundation.enabled=false` with empty download fields in this check. This establishes the absence of enabled station-specific downloadable inundation libraries through those metadata responses; it does not establish that all regional NOAA flood-mapping products lack coverage.

API metadata:
https://api.water.noaa.gov/nwps/v1/gauges/01646500
https://api.water.noaa.gov/nwps/v1/gauges/14105700

Regional NOAA FIM/NWM products are useful comparison sources, but they are model products with their own issue times and boundaries. They cannot silently stand in for Saurabh's selected forecast model or be assigned arbitrary historical dates. NOAA's FAQ also describes forecast-reach handling around reservoirs and major waterbodies: https://www.weather.gov/media/owp/operations/nws_fim_faqs.pdf

FEMA hazard zones are probability-based planning products rather than date-specific observed or predicted water boundaries, so they should not be used as the animated river layer.

## 5. Three credible implementation approaches

| Approach | What the user gets | Scientific limit | Recommendation |
|---|---|---|---|
| A. Mapped water footprint | A smooth, correctly shaped reference river with islands and improved material; stage shown in linked gauges/overlays | Footprint stays a mapped snapshot rather than a date-specific shoreline | First reliable geometry milestone |
| B. Mapped footprint plus sourced reach-height profiles | The same credible geography, measured/estimated height distinctions, separate dam reaches, and forecast comparison overlays | Lateral inundation remains approximate or disabled until a validated model supports it | Recommended direction for this submission |
| C. Validated hydraulic inundation | Water levels and flood extents driven by channel/terrain, structures and boundary conditions | Requires bathymetry, calibration, datum reconciliation and documented validation | Strong follow-on; investigate adapting an existing model |

B should be built progressively from A. If height calibration for a reach is unresolved, keep the mapped base-water depiction and display the data in a labeled staff/profile overlay rather than moving the entire landscape water surface arbitrarily. Do not guarantee that the first implementation will show physically accurate changing shorelines.

## 6. Rendering and data integration details

- Keep the geometric shoreline independent of wave animation. Small animated normals and sky lighting can improve appearance; wave motion must not move the mean banks or masquerade as a solved velocity field.
- Use natural base-water appearance, with forecast colors and waterline comparisons as selectable overlays. A flow-based blue/brown scale is a data visualization, not observed turbidity.
- Avoid the original all-or-nothing wet square rule. Vector triangulation/masking follows the bank geometry at its native detail; source accuracy still bounds the result.
- Prevent both terrain occlusion and z-fighting deliberately. A water surface lowered beneath a hydroflattened DEM can disappear; simply forcing it above every terrain point changes its physical height. A clipped/draped display surface is one option for the reference depiction, with actual elevation claims kept separate until calibrated.
- Handle Polygon/MultiPolygon components and holes explicitly. Maintain the common coordinate transform used by all app layers.
- Cache compact local data with source URLs, feature IDs, units, dates, CRS, vertical reference, quality flags and unavailable states. Do not request a large nationwide polygon or a new DEM tile for every timeline step.
- Preserve issue date, target date and forecast lead semantics. Never use actual future gauge height as if it were available when the forecast was issued.
- Keep exaggeration optional and labeled. Default landscape scale should support the user's camera-like goal.
- Start with the existing WebGL material pipeline and profile XR compatibility when changing it. Three.js Water is a flat reflective effect for WebGL; WaterMesh is a different WebGPU-only add-on. A fancier shader does not fix geography or hydraulics.

Renderer references: https://threejs.org/docs/pages/Water.html and https://threejs.org/docs/pages/WaterMesh.html

## 7. What a physical flood model would require

HEC-RAS can use channel bathymetry with overbank terrain, structures, roughness and boundary conditions to calculate water-surface profiles and inundation. A good DEM alone is not the model. Use calibration observations and assess errors across multiple flows; downstream pool conditions matter at Columbia, and dam geometry matters at Potomac.

A practical app architecture would compute a small validated library of profiles/maps outside the browser and load the appropriate result. For a regulated river, one input discharge may not uniquely select the result; downstream pool state and other relevant boundaries may be needed. Interpolating between stored profiles also needs validation.

Primary guidance:
https://www.hec.usace.army.mil/confluence/rasdocs/hgt/latest/tutorials/terrain/creating-a-ras-terrain
https://mmc.sec.usace.army.mil/cwms-sop.html
https://mmc.sec.usace.army.mil/usace-dams-sop.html

## 8. Focused acceptance checks for a later fix

1. Same-camera images with reference footprint on/off show water in all intended base channels without covering retained islands.
2. Footprint geometry has valid rings and no self-intersection artifacts after clipping/merging. Dam/reach boundaries are explicit.
3. Measured gauge height matches the displayed height/units/date at the gauge reference. Datum conversions are documented and consistent with terrain metadata.
4. Missing or stale observations remain unavailable; they never become zero elevation or plausible-looking invented readings.
5. Forecast overlays preserve their original model, issue/target date and units. Estimated stage is visibly distinguishable from measurement.
6. Narrow banks remain clean from drone and riverbank views; water does not disappear under a mismatched DEM or expose rectangular crop seams.
7. Low/normal/high selected dates change only behaviors supported by the chosen data/model. A fixed reference mask is not relabeled as historical inundation.
8. Desktop verification is sufficient for this submission; headset behavior must not be claimed without testing.

## Research artifacts

- `verified-api-summary.json`: concise stage, NOAA coverage, datum and zero-Z checks.
- `usgs-sites.txt`: current official site metadata response.
- `height-instantaneous.json`: sampled approved historical stage observations.
- `P13BBWDB-metadata.json` / `P13HEQBY-metadata.json`: official dataset metadata, file sizes and bounding boxes.
- `potomac-cog-download-check.json`: actual download test returned HTML, not raster data.
- The original diagnostic waterbody files and screenshots remain in `../../diagnostics/2026-11-09/`.

No new application behavior, model training, paid resource or live deployment was introduced during this research.
