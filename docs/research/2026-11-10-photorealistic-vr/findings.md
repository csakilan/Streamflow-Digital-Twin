# Photorealistic imagery feasibility · 10 November 2026

## Observation

Opened the public [NASA-AMMOS Google Photorealistic 3D Tiles demonstration](https://nasa-ammos.github.io/3DTilesRendererJS/three/googleMapsAerial.html) in its intended hosted UI, then changed its location hash after initialization. Inspected both official station locations. No public-demo token was extracted, reused or saved, and no map tiles were packaged.

- **Potomac / Little Falls:** hash `38.94977778,-77.12763889`; rendered coordinates approximately 38°57′18″ N, 77°7′55″ W. River, rapids, wooded banks and surrounding developed areas are visible in the oblique image. Google/Vexcel credits are visible. This supports trying the provider at the actual study area, but is not a surveyed alignment check or proof of close-up building quality everywhere.
- **Columbia / The Dalles:** hash `45.60827778,-121.1899167`; rendered coordinates approximately 45°36′52″ N, 121°11′29″ W. River, roads, surrounding terrain and built areas are visible. Google/Airbus credits are visible. This is secondary coverage research, not a Columbia implementation.

The demo's fixed banner still says “Tokyo Tower example”; the location hash and displayed coordinates, rather than that fixed title, identify the river views. The script waits for initial loading, explicitly sets the hash, waits for local refinement, then captures the scene. Successful network responses alone are not the coverage conclusion; the images were inspected visually. Neither screenshot is our authenticated local trial.

Evidence: `potomac-public-demo.png`, `columbia-public-demo.png`, sanitized `public-demo-result.json`. Screenshots retain the provider's attribution. Browser output and network evidence omit query strings and credentials.

## Access decision

User reports **no account or key**. The implementation provides local password entry for Google Maps Platform or Cesium ion. No account, billing, new deployment or borrowed credential was created. The existing app remains untouched. The lack of access is not presented as an absence of provider coverage.

The [Cesium Community plan](https://cesium.com/platform/cesium-ion/pricing/) currently includes an individual noncommercial/evaluation tier with Google Photorealistic 3D Tiles access subject to its quota and terms. The [asset setup guide](https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles/) explains enabling that asset. The viewer remains Three.js/WebXR when ion supplies access.

## Technical decision

Use [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS) 0.5.4, whose supported Three peer version starts at 0.167. The existing app's 0.160 runtime is therefore left intact, and this additive scene uses isolated Three 0.185.0. The pinned renderer has official Google and VR examples, including a combined stereo camera for tile culling.

The upstream root/auth lifecycle does not automatically abort all requests on renderer disposal. The trial adds a resource lifetime guard that supplies abort signals to endpoint/root/tile requests and rejects late authentication results. This prevents late Google initialization after Disconnect. It refreshes the current XR camera before tile selection rather than waiting for Three's later render call.

No hydraulic surface is placed over these photographic tiles until gauge-to-terrain datum alignment is established. Forecasts remain historical packaged values, not live or newly generated forecasts. Photogrammetry capture date is separate from the selected hydrology date.

## Attribution and content handling

Follow the current [Google Map Tiles policy](https://developers.google.com/maps/documentation/tile/policies): aggregate the visible tiles' provider copyrights, use the official unmodified Google Maps logo, keep hydrology attribution separate, and preserve credits in immersive mode independently of panel minimization. No persistent tile cache or offline imagery export is added. Google imagery is not used to extract new building footprints, bathymetry or other geodata.

## Remaining acceptance

Connect with the user's own restricted credential; inspect actual local-app Potomac close and aerial quality, confirm real provider copyrights and logo in desktop/XR, and assess memory/frame rate/comfort on the intended device. Synthetic GLTF streaming and desktop XR emulation test the viewer pipeline and interactions only.
