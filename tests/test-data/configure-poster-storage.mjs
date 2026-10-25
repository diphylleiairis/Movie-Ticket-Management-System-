import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

try { process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url))); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

const origin = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.POSTER_STORAGE_BUCKET || 'movie-posters';
if (!origin || !key) throw new Error('Configure SUPABASE_URL and a backend Supabase secret/service-role key.');
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(bucket)) throw new Error('Use a lowercase bucket name containing letters, digits and hyphens.');
const headers = { apikey: key, 'Content-Type': 'application/json' };
if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;

const request = (path, options = {}) => fetch(`${origin}/storage/v1${path}`, {
  ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(15000),
});

try {
  let response = await request(`/bucket/${bucket}`);
  const details = response.ok ? null : await response.clone().json().catch(() => null);
  const missing = response.status === 404 || String(details?.statusCode) === '404';
  if (missing && process.argv.includes('--create')) {
    response = await request('/bucket', { method: 'POST', body: JSON.stringify({
      id: bucket, name: bucket, public: true, file_size_limit: 5 * 1024 * 1024,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    }) });
    if (!response.ok) throw new Error(`Bucket creation failed (HTTP ${response.status}).`);
    response = await request(`/bucket/${bucket}`);
  }
  if (!response.ok) throw new Error(`Poster bucket unavailable (HTTP ${response.status}, provider status ${details?.statusCode || 'unknown'}). Use --create to provision a missing bucket.`);
  const configured = await response.json();
  if (!configured.public) throw new Error('The poster bucket must be public for stable movie poster URLs. Existing bucket settings were not changed.');
  console.log(JSON.stringify({ bucket: configured.id, public: configured.public,
    fileSizeLimit: configured.file_size_limit, allowedMimeTypes: configured.allowed_mime_types }));
  if (process.argv.includes('--smoke')) {
    const object = `${randomUUID()}.png`;
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=', 'base64');
    try {
      const uploaded = await request(`/object/${bucket}/${object}`, { method: 'POST',
        headers: { 'Content-Type': 'image/png', 'x-upsert': 'false' }, body: image });
      if (!uploaded.ok) throw new Error(`Smoke upload failed (HTTP ${uploaded.status}).`);
      const stored = await uploaded.json();
      if (stored.Key !== `${bucket}/${object}`) throw new Error('Unexpected Storage upload response.');
      const publicRead = await fetch(`${origin}/storage/v1/object/public/${bucket}/${object}`, { signal: AbortSignal.timeout(15000) });
      if (!publicRead.ok || !Buffer.from(await publicRead.arrayBuffer()).equals(image)) throw new Error('Uploaded poster could not be read publicly.');
      console.log('Poster smoke upload and public read passed.');
    } finally {
      const removed = await request(`/object/${bucket}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [object] }) });
      if (!removed.ok) throw new Error(`Smoke object cleanup failed (HTTP ${removed.status}).`);
      console.log('Temporary smoke poster removed.');
    }
  }
} catch (error) {
  console.error(error instanceof TypeError ? 'Cannot reach Supabase Storage.' : error.message);
  process.exitCode = 1;
}
