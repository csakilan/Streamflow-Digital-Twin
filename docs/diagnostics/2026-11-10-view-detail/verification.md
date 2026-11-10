# River-view detail verification

Base `bedc3ce`, branch `experiment/photorealistic-vr`.

## Implemented

- Desktop tile selection uses actual drawing-buffer pixels rather than CSS dimensions. A high-DPI browser at 1500 × 1000 CSS pixels selects detail for its 2250 × 1500 drawing buffer; the XR adapter continues using the actual eye viewport.
- Camera far distance follows camera-to-focus distance plus a 4 km study neighborhood, quantized upward in 250 m steps. The final 1 km fades into the existing background. Both distances scale into the miniature; desktop pan/orbit focus and actual current XR head position are used.
- The pinned renderer's reference Google-viewer memory optimization packs triangle indices and omits generated texture mip levels. Positions, UVs, normals, index values and transforms remain unchanged. Desktop/XR cache limits remain 512/160 MiB, with oversized desktop residency released on XR entry.

## Focused verification

Observed RED tests against CSS-pixel detail selection and missing scale-aware clipping helper, then GREEN after implementation. The texture-memory test likewise failed before the optimizer was registered and passed afterward. Eight focused tests pass, including measured texture-memory reduction with unchanged geometry and the existing auth-lifetime/budget checks.

High-DPI desktop and emulated-XR browser checks pass: real synthetic glTF pipeline, correct pixel resolution, close/aerial/tabletop clipping bounds, controller selection/dragging, panel actions, oversized-cache disposal/reload, a preserved root reference and exactly one fixture root request across the XR transition. These screenshots are engine-test geometry, not river imagery.

Focused independent review found no material issues in the resolution/clipping/fog changes or optimizer. The reviewer ran the eight tests, with no additional browser run or credential access.

## Authenticated imagery

The optional `photorealistic-vr/imagery-check.mjs` was run twice against the actual local app in a temporary desktop browser. A user-supplied ion credential entered via echo-disabled stdin was cleared from the script after submission and from the viewer's password field. HTTP caching was disabled, raw request URLs were not recorded, output strings were redacted defensively, and temporary browser profiles were deleted. No credential was written into the repository or a saved configuration.

Both runs displayed actual Potomac imagery and the official Google Maps logo/provider credits in aerial, close and tabletop views. Each run recorded one ion endpoint initialization and one Google root request across all three views. There were no provider 4xx responses in the categorized optimized run; a local 404 was the only recorded HTTP error there.

Same presets, viewport (1440 × 1000 CSS, 2160 × 1500 drawing buffer), error target (16), budgets and view order:

| View | Before optimizer | After optimizer | Refused desired tiles before → after |
|---|---:|---:|---:|
| Aerial | 497 MiB / 301 visible tiles | 384 MiB / 301 visible tiles | 0 → 0 |
| Close | 513 MiB / 270 visible tiles | 512 MiB / 372 visible tiles | 273 → 112 |
| Tabletop | 354 MiB / 191 visible tiles | 274 MiB / 191 visible tiles | 0 → 0 |

Counts are sampled rendering diagnostics, not geographic measurements or a benchmark of total process/GPU memory. Aerial/tabletop checkpoints had no pending work. The close view was memory-limited in both runs; the optimized run showed more detail at the same limit but does **not** prove all requested close-up detail loaded. Source photogrammetry limitations also remain. No physical headset or real-provider immersive session was tested.

Captured final examples: `imagery-optimized/aerial.png`, `imagery-optimized/close.png`, `imagery-optimized/tabletop.png`. Earlier comparison captures and safe reports are in `imagery/`. Original station/data/snow/mapped-water files and AWS deployment remain unchanged.
