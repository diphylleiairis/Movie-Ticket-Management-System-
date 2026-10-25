# Admin Movie creation

Scope: CAT-01 creation and ID-04 authorization. `/admin/movies` is a child route of
the existing Admin layout. Movie navigation preserves the sidebar/header and uses
the same account-scoped background prefetch/cache as the other Admin sections.

Catalog owns reads/writes to existing V1 `movies`, `genres` and `movie_genres` tables.
No migration is added. Creation does not edit historical films, create Showtimes,
or create an independent Movie/Location availability state.

## Contract

- `GET /api/v1/admin/movies?page=0&size=25&q=` returns `items`, `total`, `page`, `size`.
  It includes ACTIVE/ARCHIVED films newest first, searches title/slug on the server,
  accepts pages of 1–100 rows and searches of up to 200 characters.
- `POST /api/v1/admin/movies` requires ADMIN and the session's current CSRF token.
  It returns 201 with the stored Movie, including its generated ID and ACTIVE status.
- Required inputs: `title` (1–200 trimmed characters), `slug` (up to 200 lowercase
  ASCII letters/numbers separated by single hyphens), `description` (1–10000),
  `durationMinutes` (positive integer fitting PostgreSQL integer), `ageRating`
  (1–20), `posterUrl` (HTTP(S), no embedded credentials, up to 2048), and `genres`
  (1–10 names, each 1–80). `releaseDate` is an optional ISO date.
- Genre labels are trimmed/deduplicated by normalized slug. Existing names/slugs
  are reused. Missing genres and links are created with the Movie in one transaction,
  in sorted slug order, preserving existing genre names and historical links.
- Invalid input returns 400; duplicate slug returns a sanitized 409. Database slug
  uniqueness also protects concurrent requests. No write is automatically retried.
- Anonymous callers receive 401, other roles 403; missing CSRF is rejected.
  Protected read responses retain `Cache-Control: no-store`.

## Browser behavior

The Movie page provides search, pagination, empty/error/retry states and Add movie.
The modal suggests an editable slug from title and accepts comma-separated genres.
It checks required fields and whole-number duration, keeps all fields on a server
error, and disables repeated submission while saving. Cancel/close makes no Movie.
The dialog has a visible border on all sides. Desktop shows Movie details on the
left and poster controls/preview on the right; mobile stacks those sections.

Poster accepts either a URL or a JPEG/PNG/WebP upload up to 5 MiB. Choosing a file
immediately uploads it and fills the URL only after success; the right panel
previews that URL. A typed HTTP(S) URL also previews there. Broken image URLs show
a recoverable placeholder. Saving waits for upload completion; upload failure
keeps Movie details and the previous poster URL. Closing aborts the browser request
and prevents a late result from updating another form. An uploaded object is not
automatically deleted when the form is cancelled or another poster is selected.
The backend does not fetch arbitrary external poster URLs.

## Poster Storage

`POST /api/v1/admin/movies/posters` accepts multipart field `image` and requires
ADMIN plus the current CSRF token. It returns 201 `{posterUrl}` with no-store.
Catalog verifies the byte limit, MIME and file signatures, assigns a fresh UUID
object name and uploads without overwrite through its `MoviePosters.Storage`
application interface. Unsupported images return 400, oversized multipart requests
413, and storage/configuration failures a sanitized 503. No Movie is created by
uploading. Supabase responses/credentials are never exposed through errors.
See [ADR 0007](../adr/0007-catalog-poster-storage.md).

Backend configuration (root `.env` for local use, service environment for Render):

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=<backend-only-secret-key>
POSTER_STORAGE_BUCKET=movie-posters
```

`SUPABASE_SERVICE_ROLE_KEY` is the legacy fallback if the secret key is empty.
Docker Compose forwards these settings. Keep elevated keys out of `VITE_*`.
Provision/check the dedicated public bucket with
`node tests/test-data/configure-poster-storage.mjs --create`; omit `--create` for
a read-only check. The script sets a 5 MiB limit and the three allowed MIME types
only when creating a missing bucket; it never changes an existing bucket's policy.
No public write policies are added. Rebuild local backend after source or Compose
changes with `docker compose up -d --build backend`. Missing Storage configuration
does not prevent existing poster-URL Movie creation.
An explicit `--smoke` run uploads one generated temporary PNG, verifies its public
bytes and removes only that generated object; it never creates a Movie.

Implementation follows Supabase's [Storage REST contract](https://supabase.com/docs/reference/self-hosting-storage/upload-a-new-object)
and [server API key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

Success closes the modal, returns to the unfiltered first page, reloads the list,
and invalidates cached Movie searches/pages and Overview counts. A completion from
a form already left cannot navigate the user away from their current section.

The public customer catalog currently uses demo data. This change adds the real
Admin catalog/create flow; customer-side CAT-02 integration is separate.

## Verification

`AdminMoviesTests` covers validation, normalization, genre deduplication and bounded
search. `AdminMoviesSecurityTests` covers the real authorization/CSRF chain and HTTP
responses. The dedicated PostgreSQL scenario is
`IdentityIntegrationTests#adminMovieCreationPersistsGenresAndRejectsDuplicateOrInvalidRequests`;
it verifies stored dates/genres, reuse, duplicate slug and invalid duration.

TestCafe `admin-movies.test.js` covers persistent layout, form creation/validation,
cache refresh, duplicate correction, mobile modal and role denial with mock APIs.
It also checks all dialog borders, right-side URL/upload preview, multipart/CSRF,
upload failures and unsupported files. `MoviePostersTests`,
`SupabasePosterStorageTests` and `AdminMoviePostersSecurityTests` cover validation,
provider response/authentication, path safety, role denial and CSRF with local doubles.
`check-admin-prefetch.mjs` covers catalog/report invalidation after success.

Run Movie UI tests with `PAGE_TEST_SUITES=admin-movies,admin-dashboard` and the page
runner. Backend focused tests use `-Dtest=AdminMoviesTests,AdminMoviesSecurityTests`.
Set optional `PAGE_TEST_NAME` to a test-name substring for a focused browser check.
Poster tests use `-Dtest=MoviePostersTests,SupabasePosterStorageTests,AdminMoviePostersSecurityTests`.
The integration scenario uses only the isolated loopback test database described
in [Identity setup](identity.md), never the project's Supabase database.
