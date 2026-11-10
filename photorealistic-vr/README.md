# Potomac photorealistic WebXR trial

An isolated experiment in the full HydroTwin repository. It keeps **Three.js + WebXR** and uses NASA-AMMOS 3D Tiles Renderer to stream Google's textured 3D geography. Cesium ion is an optional access service, not a switch to the CesiumJS viewer.

## Open the trial

With the existing server running, open <http://127.0.0.1:8783/photorealistic-vr/>.

Run `python3 serve_local.py --port 8783` from the repository root. This loopback-only server serves the app, blocks hidden files and directory listings, and provides the saved local imagery configuration to the viewer. Use this server when a real `.env` is present; a generic static server does not provide these protections. The page and dependencies remain ordinary static files, and no Node server is required.

**No imagery credential is committed or distributed.** On this computer, an explicitly authorized token is saved in the Git-ignored root `.env`; the local viewer reconnects automatically after refresh. The grid before connection is an empty workspace, not a low-resolution representation of the Potomac.

## Saved local access

The root `.env.example` lists the two configuration keys: `CESIUM_ION_TOKEN` and `CESIUM_ION_ASSET_ID`. The real `.env` is ignored by Git and uses owner-only file permissions on this computer. The local server exposes only these imagery settings through a no-store endpoint restricted to its loopback host and same-origin viewer request. Direct requests for `.env`, other hidden files, and aliases pointing to hidden/outside files are blocked. Do not include the real `.env` in ZIPs or deployments.

Refresh the viewer to use saved access. **Disconnect** stops the active connection; refresh loads the saved access again. `?manualAuth=1` disables automatic configuration for that page so a different token can be entered manually. Engine-test scenes skip saved credentials. Static deployments retain manual token entry and do not request local configuration.

## Connect imagery locally

### Option A: Cesium ion

1. Create your own account at <https://ion.cesium.com/>. The [current Community plan](https://cesium.com/platform/cesium-ion/pricing/) covers individual personal, noncommercial and evaluation use; check the terms for your research and any eventual lab deployment.
2. Enable **Google Photorealistic 3D Tiles** in your account's assets. Follow the asset-enabling portion of [Cesium's official guide](https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles/). The guide's CesiumJS viewer code is not needed here.
3. Create a token with **read access** to that asset. Restrict its assets and allowed website origins where supported. This viewer does not need upload, write or geocoding permissions.
4. In this trial's **Imagery setup**, leave the service set to Cesium ion. Enter the token in the password field. Confirm your Google asset ID (the renderer's standard example uses `2275207`). Click **Connect imagery**.
5. Inspect Aerial and Close view around Little Falls before deciding the actual fidelity is sufficient. A successful request alone does not prove precise local coverage or building quality.

### Option B: Google Maps Platform

Enable the **Map Tiles API** in your own Google Cloud project with billing and an appropriately restricted browser API key. Select Google Maps Platform in this trial, enter the key locally and connect. Follow [Google's 3D Tiles instructions](https://developers.google.com/maps/documentation/tile/3d-tiles).

The browser uses its active credential in tab memory and sends it to the selected imagery provider. Manual input clears on connection. Saved local access persists in the explicitly authorized `.env`; it is not embedded in JavaScript or committed to Git. As with any browser integration, the person using the browser can inspect the active credential through developer tools. Disconnecting is not provider-side token revocation.

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

Desktop tile detail uses the **actual drawing-buffer dimensions**, including the existing render-pixel-ratio cap of 1.5. XR uses the eye viewport dimensions. Viewing distance adapts to zoom and scale: the far plane retains 4 km beyond the camera-to-focus distance, rounded upward in 250 m steps. A soft fade over the final 1 km avoids an abrupt distant edge. In a 1:1,000 miniature these distances become meters in the scene rather than thousands of kilometers. This is a rendering range, not a watershed boundary or a surveyed geographic crop.

The pinned renderer's texture-memory optimization omits generated texture mip levels and packs triangle index buffers. It keeps vertex positions, UVs, normals, triangle values and world transforms unchanged. This matches the reference Google viewer's optimization and leaves the source texture pixels intact; real-headset texture shimmer and comfort still need device validation.

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

Authenticated local-app aerial, close and tabletop imagery has been checked in an isolated desktop browser, with provider credits visible and a single root/access initialization per run. Evidence is under `docs/diagnostics/2026-11-10-view-detail/`; those checks used echo-disabled stdin and omitted credentials from reports. The optimized aerial/tabletop captures had no pending requests or refused tiles at their sampled checkpoints. The close capture still reached the 512 MiB cap and had some desired detail refused; this is recorded explicitly, so this check does not claim complete close-view refinement or camera-quality source imagery. Real provider credits in XR and target-headset performance remain unverified. A later connection-only check verified automatic access from the user-authorized `.env`; see `docs/diagnostics/2026-11-10-local-config/`.

For an optional authenticated desktop check using saved access, run `node imagery-check.mjs --local-config`; add `--quick` for a connection-only check. The local server must be running. Manual checks can still use `node imagery-check.mjs` with echo-disabled stdin. It uses a temporary browser with HTTP caching disabled, saves only attributed screenshots/safe diagnostics, and removes the profile afterward. Never pass the token as a command argument. These checks request real provider imagery and use the account's normal service quota.

## References

- [NASA-AMMOS renderer and examples](https://github.com/NASA-AMMOS/3DTilesRendererJS)
- [Google 3D Tiles example](https://nasa-ammos.github.io/3DTilesRendererJS/three/googleMapsAerial.html)
- [Renderer VR example](https://nasa-ammos.github.io/3DTilesRendererJS/three/vr.html)
- [Meta immersive WebXR emulation](https://github.com/meta-quest/immersive-web-emulation-runtime)

The original fourteen station scenes, mapped-water experiment, snow effects, Data Space and Unity work remain unchanged by this additive viewer.
