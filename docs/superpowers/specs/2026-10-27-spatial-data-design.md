# Spatial Data view

User-approved direction: data only in a 3D area, a flat landscape/platform, and a bar opening data visualizations in different areas. Implement for Potomac 01646500 and Columbia 14105700 inside the full local app. Preserve snowfall and river scenes.

Use existing Three.js and immutable chart3d station JSON. Build a quiet dark platform with three panel zones; one central toolbar opens Overview, River, Forecast, Drivers, Models, Correlations and the existing 3D graph. White text, observed blue, forecast orange, environmental teal, snow violet, missing neutral. Shared date/model/lead/variable selection updates all open panels. Panels support move, expand, minimize, close and reset. Desktop and WebXR controllers share actions; camera-relative CSS is not presented as an immersive interface.

Keep the original Data page contents and data contracts intact; their default route opens data-space/<site>.html. The ?report=1 option displays the original report, preserving all inbound links and the original 28 station pages. Detailed reports stay available; no station/model data, predictive methods or legacy features are deleted. No new model training, data fetching beyond existing local assets, or all-station rollout. Display missing values explicitly; issue inputs and target outcomes are distinct; estimated stage never becomes measured depth.

Approach chosen from conversation: dedicated data workspace, rather than data panels beside the river. Flat platform and toolbar are user's choices; three zones, seven panel types, native Three.js and the palette are implementation choices consistent with that request.
