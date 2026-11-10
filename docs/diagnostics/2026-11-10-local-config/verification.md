# Authorized local credential persistence

The user explicitly authorized saving and using the supplied ion token in `.env`, superseding the previous memory-only setup. The actual file is local, owner-readable/writable only (`0600`), and ignored by the existing Git rules. It must not be committed or included in distribution archives.

Implemented a loopback-only local server with a narrowly scoped configuration endpoint. It requires the expected local host, a same-origin/custom-header request and an allowed fetch-site value; it emits no CORS permission and sends no-store responses. It reads only the two allowlisted imagery settings. Hidden files, resolved aliases to hidden/outside files, and directory listings are blocked. Requests are not logged. The static deployed app retains manual entry.

The local viewer uses saved access once at startup, leaves the password field blank and clears its temporary configuration object after connecting. Engine-test and explicit manual-auth pages do not request saved access. Disconnect remains explicit, and refresh reloads the saved configuration without repeatedly creating connections during normal view/data changes.

Checks:

- The HTTP boundary test uses only a temporary dummy `.env`, checking public static access, hidden and encoded hidden paths, an alias to a hidden file, unauthorized configuration requests, foreign Origin/Host/fetch-site requests, no-store headers, allowlisted fields and a missing configuration file.
- Real local `.env`, encoded `.env` and `.git/config` requests returned 404; unqualified configuration requests returned 403; the viewer returned 200.
- The actual default viewer connected automatically using local configuration, with a blank password field, visible authenticated imagery, provider credits and one access/root initialization. This was a connection-only check, not a new full-detail or headset-quality benchmark.
- The real token is absent from committed source and recorded diagnostics. No deployment or provider-account setting was changed.
