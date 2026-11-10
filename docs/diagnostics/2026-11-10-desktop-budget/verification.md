# Desktop detail budget verification

- Desktop tile-cache limit increased from 160 to 512 MiB, with 1,600 item slots. XR remains 160 MiB / 600 slots. The error target remains 16.
- The first new regression failed against the old 160 MiB desktop configuration; it passed after profile switching was implemented.
- Focused review then reproduced 300 MiB of used/loaded desktop content remaining after entering XR despite the configured 160 MiB limit. The strengthened regression failed before explicit resident cleanup was added.
- The fix disposes oversized resident tile content deepest-first, preserving the provider/authentication and root tileset; content already within XR limits is retained. Six focused tests now pass, including the used-cache and same-provider checks.
- The browser check uses the real synthetic glTF loading, disposal and reload path. Only the cache accounting value is inflated to 300 MiB; it does not allocate 300 MiB of test data. On XR entry the content is released/reloaded, accounted residency returns below 160 MiB, root identity remains unchanged and there is exactly one root-tileset HTTP request.
- Browser checks also exercise issue/model/lead controls, panel dragging/minimizing, view changes, safe intercepted 403 handling, emulated controller ray selection/grip dragging, and desktop budget restoration after XR exit.
- A second focused review found no unresolved material issues after the cleanup fix.

No live user token or physical headset was used. The screenshots show explicitly labeled engine test geometry, not authenticated Potomac imagery. Original station/data/snow/mapped-water files remain untouched. Real local-app visual acceptance follows a refresh and token re-entry; imagery and memory behavior still depend on the selected view and device.
