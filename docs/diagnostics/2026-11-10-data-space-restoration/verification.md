# Full Data Space restored — 2026-11-10

The first standalone app carried only its single selectable-axis graph and five summary tabs. It did not carry over the prior three-area Data Space. This update restores that workspace inside river-twin, with no dependency on the previous site's routes or assets.

All nine original panel types are present: overview, river history, forecast comparison, environmental drivers, model comparison, factor relationships, 3D graph, seasonal context and forecast accuracy by lead. Both station correlation matrices are bundled. Original chart calculations and styling are retained; the nine-choice menu is also plainly visible in the desktop dock.

Checks passed:
- Seven focused tests across station readings, original panel catalog, self-contained data/runtime and selection round trip.
- Browser inspection at Potomac and Columbia: three default panels; all launch types; chart clicks preserve dates; panel drag/enlarge/minimize/close; graph rotation around both axes beyond half-turn and reset; model/date synchronization; accuracy values/window unchanged under lead changes; original seasonal/accuracy semantics retained.
- Browser navigation to the standalone landscape and back preserves issue date, model, lead and environmental variable. Engine/manual mode flags remain in navigation links. Browser check used synthetic imagery, not account access.
- Station switching now preserves model/lead/Z consistently from both views. Explicit Disconnect keeps navigation in manual-access mode.
- Data Space includes a world-space River View return button; cross-page navigation ends the immersive session. It shares the standalone app’s complete-seven-target-day date bound.
- Updated ZIP includes the complete workspace, correlations and all module imports. No credentials or original-site files required.

Screenshots in this folder show the default workspace, 3D graph, relationship matrix and seasonal/accuracy panels for both stations.
