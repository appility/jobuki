# TODO

1. Move uploads to server-side proxy (most robust for multi-tenant custom domains).
Browser uploads to app endpoint, server uploads to R2.
Then R2 CORS no longer depends on tenant domains at all.