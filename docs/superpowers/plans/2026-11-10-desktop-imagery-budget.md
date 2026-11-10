# Desktop imagery budget fix

User approved the first diagnosed quality fix with “go do it”: give desktop imagery room to refine while retaining a separate conservative VR budget. Base: `69bea9e`, branch `experiment/photorealistic-vr`.

## Design

Use 512 MiB / 1,600 cache items on desktop and the prior 160 MiB / 600 items in immersive XR. Switch profiles from the actual frame camera without reconnecting or replacing the provider session. If the desktop cache exceeds XR limits on entry, release resident tile content deepest-first through the renderer's removal callbacks, preserving the root/authentication and refetching detail under XR limits. Leave already-fitting content cached. Expose only safe budget/loading/refusal counters and show the active budget in the existing footer.

Keep the 16-pixel detail target, camera presets, far planes, texture settings and pixel resolution unchanged. This isolates the confirmed cache bottleneck; the more aggressive detail-target experiment previously overwhelmed the cache. Preserve prior station, snow, data-space and mapped-water work.

## Execution

- [x] Add a focused failing regression for larger desktop capacity, actual XR budget switching, populated-cache release and provider reuse. Observed failures before each corresponding fix; six tests pass afterward.
- [x] Implement separate budgets on the existing imagery resource, resident cleanup when shrinking, and safe diagnostic counters/footer.
- [x] Run the existing browser flow with added budget assertions. Use a real local loaded glTF with its accounting inflated to 300 MiB, avoiding a large allocation; verify disposal/reload under XR, root identity preserved and exactly one root request. Check panel actions and desktop restoration.
- [x] Obtain focused review and fix the discovered resident-memory transition issue. Reviewer reran six focused tests, with no unresolved material findings.

## Validation boundary

Browser evidence is in `docs/diagnostics/2026-11-10-desktop-budget/`. The test uses synthetic geometry and emulated WebXR; the user must refresh their authenticated view and re-enter their own token to judge the actual improved river appearance. No provider credential is stored, copied into tests, or committed. No AWS deployment or unrelated app file changes.
