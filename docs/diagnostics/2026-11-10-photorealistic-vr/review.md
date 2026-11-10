# Focused review and verification

Base: `dc90c6230b1d8f086549f6dd7707b29f5930d87d`; branch `experiment/photorealistic-vr`.

A fresh reviewer inspected coordinate transforms, forecast pairing, provider lifecycle, credential handling and XR behavior without launching another browser or using real service credentials.

Resolved material findings:

1. **Late provider initialization after Disconnect:** upstream disposal did not abort ion's endpoint fetch or all root requests. Added lifetime abort signals to all auth instances (including dynamically added Google auth), guarded late promise results, cleared auth state and added a real-plugin mocked late-response regression for both providers. The fake transport intentionally ignores abort to test the continuation guard too.
2. **Previous-frame XR culling:** refreshed Three's XR camera matrices and stereo union projection before tile traversal, rather than after traversal in the render call.

Reviewer rechecked both fixes and reran the focused tests: 5/5 pass, no unresolved material findings in those fixes.

Verification:

- Pinned runtime build succeeds; new module syntax checks pass.
- 5 focused trial tests; 9 existing mapped-water tests; 2 existing snow policy tests pass (16 total).
- Browser pipeline passes: unauthenticated startup; intercepted fake-key 403; synthetic GLTF/3D Tiles; issue/target pairing; mouse buttons/body/minimize/drag; view changes with one connection; IWER immersive session with stereo camera, real emulated trigger selection and grip dragging; return to desktop without reconnecting.
- Existing snow browser check passes for both stations, including date-driven particle animation and explicit preview. Its initial restricted-environment launch failed to start Chrome; rerunning with browser access passed. Only the test-generated copies of the two old screenshot files were restored afterward.
- Existing spatial-state and spatial-analytics checks pass.
- Existing Python checks: 268 pass.

Screenshots 01–03 show local setup and clearly labeled synthetic/emulated checks. Public-provider screenshots are separate under `docs/research/2026-11-10-photorealistic-vr/`. A synthetic test does not establish local-app Google imagery fidelity, service access, real attribution or physical headset performance.

No original station, data-space, snow, mapped-water, source-data or Unity file was edited for this experiment. No new AWS resource was created.
