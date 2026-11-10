# Potomac photorealistic WebXR trial

An isolated experiment in the full HydroTwin repository. It keeps **Three.js + WebXR** and uses NASA-AMMOS 3D Tiles Renderer to stream Google's textured 3D geography. Cesium ion is an optional access service, not a switch to the CesiumJS viewer.

## Open the trial

With the existing server running, open <http://127.0.0.1:8783/photorealistic-vr/>.

Alternatively, run `python3 -m http.server 8783 --bind 127.0.0.1` from the repository root. The page and dependencies are ordinary static files. No Node server, account or imagery request is required to open the setup screen and station-data panel.

**No imagery credential is included.** The grid before connection is an empty workspace, not a low-resolution representation of the Potomac.

## Connect imagery locally

### Option A: Cesium ion

1. Create your own account at <https://ion.cesium.com/>. The [current Community plan](https://cesium.com/platform/cesium-ion/pricing/) covers individual personal, noncommercial and evaluation use; check the terms for your research and any eventual lab deployment.
2. Enable **Google Photorealistic 3D Tiles** in your account's assets. Follow the asset-enabling portion of [Cesium's official guide](https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles/). The guide's CesiumJS viewer code is not needed here.
3. Create a token with **read access** to that asset. Restrict its assets and allowed website origins where supported. This viewer does not need upload, write or geocoding permissions.
4. In this trial's **Imagery setup**, leave the service set to Cesium ion. Enter the token in the password field. Confirm your Google asset ID (the renderer's standard example uses `2275207`). Click **Connect imagery**.
5. Inspect Aerial and Close view around Little Falls before deciding the actual fidelity is sufficient. A successful request alone does not prove precise local coverage or building quality.

### Option B: Google Maps Platform

Enable the **Map Tiles API** in your own Google Cloud project with billing and an appropriately restricted browser API key. Select Google Maps Platform in this trial, enter the key locally and connect. Follow [Google's 3D Tiles instructions](https://developers.google.com/maps/documentation/tile/3d-tiles).

Do not paste tokens into chat or commit them. This app keeps the credential only in the current tab's memory and sends it to the selected provider for authentication. The input clears on connection. Reloading or disconnecting removes the app's active reference; it is not an instant revocation of a provider credential. As with any browser integration, browser developer tools and the provider's network requests can expose the credential to the person using that browser. Use restricted, revocable credentials on trusted devices.

No account has been created, billing enabled or imagery service deployed by this change.

## Use the scene

- **Aerial / Close view / Tabletop:** preset camera and scale changes, reusing the existing tileset. Orbit with left-drag, pan with right-drag, zoom with the wheel. Close view is a navigation preset, not a surveyed camera elevation.
- **One floating data panel:** issue date, target date, original forecast, observed daily mean discharge, rating-estimated gauge heights, small flow history and issue/model/lead controls. Drag the title to reposition it; the minus button minimizes it. Body clicks do not change the issue date.
- **Data pairing:** an issue at index `i` and lead `L` compares `pred[model][L-1][i]` with `flow[i+L]`. These are existing historical forecasts, not a newly trained or live model. Cfs means cubic feet per second. Gauge-height estimates come from the supplied fit, are unavailable outside its range, and are not water depth.
- **VR:** Enter VR in a supported WebXR browser. The landscape becomes a miniature in front of you. Use a controller ray and trigger for panel buttons, and grip or grab the header to move the panel. The right stick turns the miniature without turning your head. Credits remain separate from the minimizable panel. End the session to restore desktop navigation.
- **Access failure:** check the safe status message, then explicitly Disconnect before changing credentials and reconnecting. The app does not repeatedly create new viewer connections on control changes.

For a real headset reached over a network, serve this on HTTPS: desktop loopback's secure-context exemption does not make another machine's plain HTTP address WebXR-capable. No new hosting deployment is part of this trial. Headset performance, comfort and full controller interoperability remain unverified.

## Coordinates and limits

The scene uses the existing official station coordinate (38.94977778° N, 77.12763889° W). WGS84 ECEF coordinates are transformed to local **east / up / south** meters, then uniformly scaled for tabletop viewing. There is no vertical exaggeration. The green beam is a geographic location marker with illustrative height.

The provider's combined textured surface replaces the old imagery-plus-guessed-building-block combination **only in this separate scene**. No old building layer or synthetic water rectangle is composited over it. Photogrammetry may still have capture-date differences, vegetation artifacts, coarse areas and imperfect water surfaces. It is not live video, bathymetry or ground truth.

Changing the forecast date changes the hydrology panel, not the capture date of the photographic terrain. We have not aligned the gauge datum to provider terrain elevations or implemented a hydraulic inundation model. No visual water-level or flood boundary claim is made here. This deliberately avoids drawing apparently precise water heights on an unverified datum.

The tile cache is an in-memory LRU with separate budgets: **desktop 512 MiB / 1,600 items; immersive XR 160 MiB / 600 items**. The scene switches budgets on the same renderer and provider session. Entering XR releases an oversized desktop cache through the renderer's disposal callbacks, then refines the scene again within the smaller budget. A cache already within XR limits is retained. The footer shows the active budget and indicates when memory blocks detail refinement. These are tile-cache limits, not guaranteed total GPU/process memory bounds: individual decoded tiles, decoding and driver allocations can exceed them. Provider-required sessions and renewals are handled by the provider plugins. Viewer starts are not an exact count of billable root requests. No imagery tile downloads, offline packages, persistent caches or Google credentials are included. Provider cache rules and attribution still apply; see [Google's policies](https://developers.google.com/maps/documentation/tile/policies).

## Verification without an account

`?engineTest=1` on localhost explicitly loads a tiny **self-authored synthetic** glTF/3D Tiles fixture. Its colored boxes and strip are not the Potomac, building footprints or a river model. The scene shows an ENGINE TEST warning and the attribution says NOT RIVER IMAGERY. `?emulateXR=1` on localhost enables Meta IWER for desktop WebXR checks only.

```sh
cd photorealistic-vr
npm ci --ignore-scripts
npm run build
npm test
node browser-check.mjs
```

The browser check requires the server on 8783 and Chrome at the standard macOS location. It runs a temporary profile, intercepts a fake Google credential request locally to test a 403 error, exercises the synthetic tileset, panel interaction and emulated XR, then removes its temporary browser profile. It never tests or prints a real access token. Evidence is under `docs/diagnostics/2026-11-10-photorealistic-vr/`.

Current pinned runtime: Three.js **0.185.0**, 3d-tiles-renderer **0.5.4**, IWER **2.1.0** for optional emulation. Runtime files and licenses are committed under `vendor/`; `node_modules/` is ignored. Third-party tile-loader console calls are omitted from the bundle because upstream errors can include signed request URLs. Error events still drive the safe access-status UI.

Successful local-app Google imagery streaming has been observed in the user's supplied screenshot. The larger desktop budget was motivated by a controlled reference-viewer reproduction of cache saturation; see `docs/diagnostics/2026-11-10-imagery-quality/`. Visual acceptance of the updated local-app budget, real provider credits in XR, and target-headset performance remain open. After updating source, refresh and re-enter the token locally because credentials are intentionally kept only in tab memory.

## References

- [NASA-AMMOS renderer and examples](https://github.com/NASA-AMMOS/3DTilesRendererJS)
- [Google 3D Tiles example](https://nasa-ammos.github.io/3DTilesRendererJS/three/googleMapsAerial.html)
- [Renderer VR example](https://nasa-ammos.github.io/3DTilesRendererJS/three/vr.html)
- [Meta immersive WebXR emulation](https://github.com/meta-quest/immersive-web-emulation-runtime)

The original fourteen station scenes, mapped-water experiment, snow effects, Data Space and Unity work remain unchanged by this additive viewer.
