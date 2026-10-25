# Keep poster uploads behind Catalog authorization

Accepted from the owner's request on 2026-10-25: store uploaded Movie posters in
a dedicated public Supabase Storage bucket and retain the public URL in the
existing Catalog `poster_url`. Existing HTTP(S) poster URLs remain supported.

Spring Boot receives multipart uploads through an ADMIN-only, CSRF-protected
Catalog endpoint. A Catalog application contract validates size/type/signature;
its infrastructure adapter holds the Supabase secret/service-role key. Direct
browser uploads would require another authorization mechanism because application
accounts use Spring sessions, so they are not used. Bucket setup is explicit,
not a side effect of application startup.

Object names are generated UUIDs and uploads never overwrite existing posters.
Cancel prevents Movie creation but does not delete an already uploaded object;
those URLs can be reused. Removing abandoned objects is a separate maintenance
operation and must first check Catalog references.
