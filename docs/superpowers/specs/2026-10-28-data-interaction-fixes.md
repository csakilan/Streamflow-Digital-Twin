# Data workspace interaction correction

User requests an explanation for chart clicks changing dates, and unrestricted rotation of the selected 3D graph before discussing stretch goals.

The existing pointer-down handler maps chart-body coordinates into issue dates and selects graph points; ordinary chart interaction therefore changes the shared selection. It also allows OrbitControls to interpret graph drags as camera movement.

Correction: body clicks focus panels without changing data selection. Date changes use the existing date field, timeline and previous/next controls. Graph-body drags rotate an independently centered graph pivot in all directions with no angular clamp. Title drags still reposition the panel; empty-space drags still orbit the workspace. Reset graph restores its initial orientation without resetting data. XR trigger-and-hold on the graph body follows controller orientation; title holding retains panel movement. Reuse the existing scene and graph modules; do not modify scientific data/model code or other stations.

Implementation choice: a centered pivot and quaternion rotation preserve the current camera/workspace, unlike orbiting the entire room. Include a desktop and in-world reset control and concise instructions. Focused browser regressions cover unchanged date on chart clicks, graph rotation independent of camera/panel/data, unrestricted turns and reset for both stations. Physical headset testing remains out of scope.
