# River-view detail follow-up

User approved continuing the next diagnosed quality steps after the desktop cache fix. Base `bedc3ce`, branch `experiment/photorealistic-vr`.

## Design

Use the actual desktop drawing-buffer dimensions for tile detail selection, keeping the existing 1.5 render-pixel-ratio cap. In XR, retain the actual eye viewport dimensions. Keep the 512 MiB desktop and 160 MiB XR budgets and the 16-pixel error target.

Replace the fixed 150 km desktop / 10,000-scene-unit miniature far planes with a scale-aware study view: keep a 4 km neighborhood beyond the camera-to-focus distance, round the far plane upward in 250 m steps, and fade the final 1 km into the existing background. This retains the focus area while limiting distant streaming and avoiding a sharp cutoff. On desktop, follow the orbit/pan focus; in XR, follow the miniature's center and actual current head position. Refresh the stereo projection after any clipping change before tile traversal.

## Work and checks

1. Observe failing checks for desktop physical-pixel resolution and miniature clipping scale; implement the narrow fixes.
2. Check high-DPI desktop, scaled tabletop, zoom changes, current XR stereo projection, provider reuse and controller/panel actions using local geometry and desktop emulation.
3. Inspect authenticated Potomac aerial and close views if the supplied credential is accepted. Read credentials from an unrecorded terminal input into temporary process/tab memory; never write them to source, command arguments, diagnostics or Git. Capture only attributed imagery and safe numeric diagnostics.
4. Obtain focused review, resolve material findings, document outcomes and push the existing experiment branch. Preserve original scenes and AWS deployment.

Actual headsets remain outside this task. Close-up photogrammetry still has source-data limits. Do not claim maximum-quality convergence from a stream that is still loading or memory-limited.

## Evidence-driven refinement

The first authenticated run completed aerial/tabletop views, but the close view reached 513 MiB and refused 273 desired tiles at capture. Add the pinned renderer's reference Google-viewer optimization before tile memory is measured/uploaded: pack triangle indices and omit generated texture mip levels. Explicitly preserve vertex positions, UVs and normals. A measured-memory regression must show lower footprint with identical geometry/transforms/triangle values; compare the same authenticated views again, keeping budgets, detail target and camera presets unchanged. Report any remaining memory or source-data limits honestly.

## Outcome

Eight focused tests, high-DPI desktop/WebXR emulation, and both authenticated three-view checks pass. The optimized aerial view used 384 MiB versus 497 MiB at the same 301 visible tiles; tabletop used 274 versus 354 MiB. The close capture fit 372 visible tiles versus 270 at the same 512 MiB limit, but still refused some desired detail. This remaining limit and the lack of physical-headset verification are documented in the evidence. The separate reviewer found no unresolved material issues. Credentials are absent from project files and recorded evidence.
