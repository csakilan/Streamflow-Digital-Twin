# Photorealistic VR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A separate Potomac viewer that streams textured 3D geography into a genuine WebXR scene with one interactive data panel.
**Architecture:** Static isolated page; pinned Three.js/3D Tiles runtime; memory-only credential connector; ECEF local frame; shared pure data state; desktop and XR interaction with a world panel. Preserve existing full app and its source data.
**Tech Stack:** Three.js 0.185.0, 3d-tiles-renderer 0.5.4, esbuild for a small dependency bundle, existing JSON/data helpers, Chrome CDP and optional IWER emulation.
**Spec:** ../specs/2026-11-10-photorealistic-vr-design.md

## Constraints

- VR-first browser experience, not a CesiumJS migration.
- Work on experiment/photorealistic-vr; leave existing scenes functional.
- No provider account/billing changes or borrowed credentials; Google map contents are streamed under provider cache rules, not packaged locally.
- No new hydraulic model or claims of physically calibrated water heights.
- Focused checks and desktop emulation; do not require Quest hardware.

## Review focus

- Empty/invalid credentials and service errors must not leak tokens or masquerade as geographic coverage.
- Date/model/lead/view/panel changes must preserve a single streaming connection.
- ECEF/local coordinates and tabletop scaling must align cameras/tiles/gauge; missing measured heights stay unavailable.
- XR stereo camera changes, controller input and minimized panels must preserve interaction and attribution.
- No actual river coverage/fidelity claim based solely on sample data or an unauthenticated empty scene.

## Tasks

- [x] 1. Check dependency/access/coverage feasibility. Record public-demo observations, build pinned runtime with licenses, define state/geodesy/connection modules and focused regressions. Expected: dependencies load and pure coordinate/data/lifecycle checks pass; account gap explicitly recorded.
- [x] 2. Build isolated viewer and one data panel. Implement memory-only auth UI, Google/Ion adapters, streaming budgets, camera/tabletop modes, live credits, panel drag/minimize/actions, actual XR session/camera/controller handling. Expected: desktop viewer and panel operate without keys; authenticated data can be connected when supplied; unavailable remains explicit.
- [x] 3. Verify, capture, document and hand off access. Check sample 3D Tiles streaming and desktop XR emulation without borrowing credentials. Exercise issue/target/model/lead, panel and connection lifecycle, sanitization, and unchanged existing app. Review branch once, fix material findings, commit and push experiment branch. Link the runnable viewer and account/token setup guide; state exact outstanding provider-dependent checks.

## Ledger

- Base dc90c62; clean dedicated experiment branch created. User reports no Google/Cesium account or key. Token must be entered in the local viewer, not chat.
- Ruling: reuse current full-app working directory on a separate branch; no duplicate large worktree is necessary for an additive scene and local serving.
- Ruling: keep newer graphics dependencies isolated from current r160 station/data scenes. This avoids forcing a global graphics-engine upgrade for a trial.
- Implemented `photorealistic-vr/` with local credential entry, pinned bundles, ECEF/local transforms, one reusable tileset, aerial/close/tabletop views, draggable/minimizable canvas panel, stereo WebXR and controller input. Google logo and current visible-tile copyright text appear separately from hydrology sources on desktop and in XR.
- Focused browser checks pass using a clearly labeled synthetic local tileset and IWER, including trigger selection and grip dragging. User-provider imagery and physical Quest performance are not verified. No credentials were copied from the public demo.
- Fresh review found and resolved pending authentication continuing after Disconnect and stale XR camera matrices during tile selection. A real-plugin mocked late-response regression covers direct Google and ion, including a transport that ignores abort.
- Handoff boundary: actual Google/Ion success, Potomac close-view fidelity, real provider attribution and headset performance need user access/target hardware. This is documented as outstanding acceptance, not represented as completed by the test fixture or public demo.
