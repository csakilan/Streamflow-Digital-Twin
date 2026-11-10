# Potomac imagery quality investigation · 10 November 2026

## Result

Reproduced a concrete refinement bottleneck using the local viewer's memory/detail settings in the public NASA-AMMOS reference renderer at the same Potomac location. The 160 MiB tile cache fills and prevents higher-detail tiles from being scheduled. Increasing the cache budget substantially improves the rendered geometry and imagery at the same close camera pose.

This is a controlled **reference-renderer reproduction**, not a read of the user's current authenticated tab. The user's screenshot establishes that the local app is successfully showing real Google imagery; its exact live memory and queue state was not available. No provider credential was extracted, copied or used in the local app. No production viewer source was changed during this investigation.

## Controlled comparison

Same 1440 × 900 viewport, fixed Potomac location, no auto-rotation, same close camera pose and 16-pixel detail target for rows 1–2:

| Setting / measurement | Current budget | Larger budget |
|---|---:|---:|
| Tile-cache byte limit | 160 MiB | 512 MiB |
| Tile count limit | 600 | 1,600 |
| Actual tracked cache at sample | 160 MiB | 325 MiB |
| Cache full | Yes | No |
| Detail tiles refused in sampled update | 384 | 0 |
| Tiles downloading / parsing | 0 / 0 | 0 / 111 |
| Rendered triangles | 143,474 | 460,657 |
| Visible tiles | 160 | 296 |
| Maximum projected error of visible tiles | 105.74 px | 21.26 px |

The larger-budget capture was still parsing tiles, so it is an intermediate improvement, not a claim of fully converged maximum quality. Raising the item limit alongside the byte limit avoids a new bottleneck; at the baseline sample 477 loaded tiles were below the old 600-item limit while the byte limit was full. The reported `refused` value counts desired tiles the sampled update could not schedule, not failed network requests or unique requests over the session.

Images:

- `02-current-close.png`: current memory budget, coarse tree surfaces and buildings.
- `03-more-cache.png`: larger budget, visibly sharper trees, buildings and river edge at the same pose.
- `01-current-aerial.png`: the small budget also stalls a broader view (164 refused tiles).
- `04-finer-detail.png`: exploratory 4-pixel target with the larger budget. This overwhelms the available tile slots, with 598 tiles parsing and 4,685 refused at capture. It does **not** validate blindly choosing the smallest error target.

The reference renderer includes a texture/geometry compression plugin that our trial currently does not use, so exact byte needs and timing will differ in our app. These are directional reproduction results, not a device-performance benchmark. Headless Chrome used software WebGL; no headset was tested.

## Code findings

1. `photorealistic-vr/world.mjs:21–23` applies the same 16-pixel detail target and 160 MiB/600-item cache to desktop and XR. The pinned renderer explicitly stops scheduling more tiles when `lruCache.isFull()` and increments `stats.refused`. Our diagnostic snapshot currently omits that refusal counter, so a full cache can look like a quiet, successfully connected scene.
2. `world.mjs:35` uses `setResolutionFromRenderer()`, which in version 0.5.4 reads `renderer.getSize()` (CSS pixels). `app.mjs:12` can render at 1.5 device pixels per CSS pixel. At that ratio, a 16-CSS-pixel selection target corresponds to roughly 24 drawing-buffer pixels. This can compound softness on high-density screens. It is a code-level contribution, not proven to explain the user's screenshot by itself.
3. Desktop camera far distance is 150,000 meters. Tabletop/XR far distance is 10,000 scene units despite a 0.001 geographic scale, equivalent to 10,000 km. This can let distant geography compete for detail, especially at a low viewing angle. A study-area-aware, scale-aware far distance needs a controlled follow-up before selecting final values.
4. Visible provider surfaces in the reference run use `MeshBasicMaterial`. The added hemisphere/sun lights in our app therefore do not explain the coarse facets on those unlit surfaces. Anisotropy remains 1 in the reference; texture filtering is a secondary item to evaluate after tile refinement works.
5. The green streaming status is triggered by the first loaded model. It establishes connection success, not fully refined imagery. Keep access success separate from “loading detail” and “detail limited by memory” in future status text.

## Source-data limits

Google's photogrammetry is intended for immersive geographic visualization. Google documents lower geometric precision at pedestrian scale, including distorted or floating tree canopies and objects merged into a surface. Higher-quality loading can reveal more available detail but cannot recover detail absent from the source. The reference comparison still shows reconstruction artifacts in some vegetation. The textured river surface is a captured visual state, not a live hydraulic surface.

## Recommended next implementation

1. Use separate desktop and XR detail/cache settings. Start by validating the larger desktop budget; retain bounded XR memory rather than applying desktop settings to a headset.
2. Match desktop tile selection to the actual drawing-buffer resolution; preserve per-eye resolution handling in XR.
3. Restrict viewing distance to the study area with appropriate scale conversion, keeping the focus visible through zoom changes.
4. Expose safe loading/cache/refusal diagnostics and distinguish connection success from detail readiness. Tune the detail target only after memory no longer stalls refinement.

These settings need validation with the user's own connected app before claiming the local screenshot is fixed. No account, key, AWS or existing station/data/snow/water file was changed.

## Sources

- [Pinned local renderer cache/refinement logic](../../../photorealistic-vr/node_modules/3d-tiles-renderer/src/core/renderer/tiles/TilesRendererBase.js) and the committed trial source.
- [Official renderer API: cache, stats.refused and errorTarget](https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/master/src/core/renderer/API.md).
- [Upstream cache-saturation investigation](https://github.com/NASA-AMMOS/3DTilesRendererJS/issues/1722). This concerns an older release; our 0.5.4 includes the refusal counter but still enforces the cache limit.
- [Public reference demo](https://nasa-ammos.github.io/3DTilesRendererJS/three/googleMapsAerial.html).
- [Google's explanation of photogrammetry and close-range limitations](https://mapsplatform.google.com/resources/blog/commonly-asked-questions-about-our-recently-launched-photorealistic-3d-tiles/).

Reproduction: with network/browser access, run `node docs/diagnostics/2026-11-10-imagery-quality/public-quality-check.mjs`. It opens only a temporary public-demo browser, records rendering counts/settings and attributed screenshots, and removes the profile afterward. Timing and counts can vary with streaming and hardware.
