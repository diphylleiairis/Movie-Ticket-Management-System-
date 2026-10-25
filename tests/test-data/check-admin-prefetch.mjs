// Exercise the actual TypeScript cache through Vite, with no browser/backend/database.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const vite = await createServer({ root: fileURLToPath(new URL('../../frontend/', import.meta.url)),
  server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
after(() => vite.close());
const { AdminResource, AdminDataStore } = await vite.ssrLoadModule('/src/features/admin/admin-data.ts');
const { AdminAccessError } = await vite.ssrLoadModule('/src/api/admin-api.ts');
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const unexpectedDenial = error => { throw error; };

await test('movie creation invalidates cached catalog pages and Overview counts', async t => {
  let count = 0;
  t.mock.method(globalThis, 'fetch', async url => new Response(JSON.stringify(String(url).includes('/dashboard?') ? {
    generatedAt: '2026-10-24T00:00:00Z', from: '2026-09-25', through: '2026-10-24', users: 0, activeMovies: count,
    current: { bookings: 0, revenue: 0 }, previous: { bookings: 0, revenue: 0 }, revenue: [], previousRevenue: [], recentBookings: [], topMovies: [], genres: [],
  } : { items: [], total: count, page: 0, size: 25 }), { headers: { 'content-type': 'application/json' } }));
  const store = new AdminDataStore(unexpectedDenial);
  await store.movies(0, '').load(); await store.movies(0, 'search').load(); await store.overview(30).load();
  assert.equal(store.movies(0, '').getSnapshot().data.total, 0);
  count = 1; store.movieCreated();
  assert.equal(store.movies(0, 'search').getSnapshot().data, undefined);
  assert.equal(store.overview(30).getSnapshot().data, undefined);
  await store.movies(0, '').load(); await store.overview(30).load();
  assert.equal(store.movies(0, '').getSnapshot().data.total, 1);
  assert.equal(store.overview(30).getSnapshot().data.activeMovies, 1);
});

await test('prefetch and a visible reader share the same pending request', async () => {
  const result = deferred(); let calls = 0;
  const resource = new AdminResource(() => { calls++; return result.promise; }, unexpectedDenial);
  const prefetch = resource.load();
  assert.equal(resource.load(true), prefetch);
  assert.equal(calls, 1);
  result.resolve({ value: 'ready' }); await prefetch;
  assert.deepEqual(resource.getSnapshot().data, { value: 'ready' });
  await resource.load(); assert.equal(calls, 1);
});

await test('cached data stays visible during a fresh background read', async () => {
  const next = deferred(); let calls = 0;
  const resource = new AdminResource(() => ++calls === 1 ? Promise.resolve('cached') : next.promise, unexpectedDenial);
  await resource.load();
  const refresh = resource.load(true);
  assert.equal(resource.getSnapshot().data, 'cached');
  assert.equal(resource.getSnapshot().loading, true);
  next.resolve('fresh'); await refresh;
  assert.equal(resource.getSnapshot().data, 'fresh');
});

await test('a late response cannot undo a successful status mutation', async () => {
  const oldRead = deferred(); let calls = 0;
  const resource = new AdminResource(() => ++calls === 1 ? Promise.resolve('ACTIVE') : oldRead.promise, unexpectedDenial);
  await resource.load();
  const refresh = resource.load(true);
  resource.update(() => 'SUSPENSE');
  oldRead.resolve('ACTIVE'); await refresh;
  assert.equal(resource.getSnapshot().data, 'SUSPENSE');
});

await test('leaving Admin aborts reads and late results cannot repopulate its cache', async () => {
  const result = deferred(); let signal;
  const resource = new AdminResource(value => { signal = value; return result.promise; }, unexpectedDenial);
  const request = resource.load(); resource.clear();
  assert.equal(signal.aborted, true);
  result.resolve('private'); await request;
  assert.equal(resource.getSnapshot().data, undefined);
});

await test('a temporary refresh failure keeps only the last successful result and can retry', async () => {
  let calls = 0;
  const resource = new AdminResource(() => ++calls === 2 ? Promise.reject(new Error('offline')) : Promise.resolve('valid'), unexpectedDenial);
  await resource.load(); await resource.load(true);
  assert.equal(resource.getSnapshot().data, 'valid');
  assert.equal(resource.getSnapshot().error.message, 'offline');
  await resource.load(true);
  assert.equal(resource.getSnapshot().error, undefined);
});

for (const status of [401, 403]) await test('HTTP ' + status + ' clears all Admin data including background pages', async t => {
  let rejected = false, denial;
  t.mock.method(globalThis, 'fetch', async () => rejected
    ? new Response('{}', { status, headers: { 'content-type': 'application/json' } })
    : new Response(JSON.stringify({ items: [], total: 0, page: 0, size: 25 }), { headers: { 'content-type': 'application/json' } }));
  const store = new AdminDataStore(error => { denial = error; });
  await store.users(0, '').load(); await store.bookings(0).load();
  rejected = true; await store.bookings(0).load(true);
  assert.equal(denial instanceof AdminAccessError, true);
  assert.equal(denial.status, status);
  assert.equal(store.users(0, '').getSnapshot().data, undefined);
  assert.equal(store.bookings(0).getSnapshot().data, undefined);
});

await test('cached user pages/searches are isolated and status writes update every cached occurrence', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ items: [{ id: 'one', fullName: 'Customer', email: 'one@example.test',
    role: 'CUSTOMER', status: 'ACTIVE', emailVerified: true, createdAt: '2026-10-24T00:00:00Z' }], total: 30, page: 0, size: 25 }),
    { headers: { 'content-type': 'application/json' } }));
  const store = new AdminDataStore(unexpectedDenial);
  const first = store.users(0, ''), search = store.users(0, 'one'), next = store.users(1, '');
  assert.notEqual(first, search); assert.notEqual(first, next);
  await Promise.all([first.load(), search.load(), next.load()]);
  store.userUpdated('one', 'SUSPENSE');
  for (const resource of [first, search, next]) assert.equal(resource.getSnapshot().data.items[0].status, 'SUSPENSE');
  const otherSession = new AdminDataStore(unexpectedDenial);
  assert.equal(otherSession.users(0, '').getSnapshot().data, undefined);
  store.clear(); assert.equal(first.getSnapshot().data, undefined);
});
