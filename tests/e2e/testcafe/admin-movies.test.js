import { ClientFunction, RequestLogger, RequestMock, Selector } from 'testcafe';
import { resolve } from 'node:path';

const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const headers = { 'content-type': 'application/json' };
const endpoint = /\/api\/v1\/admin\/movies(?:\?.*)?$/;
const admin = { id: 'admin', fullName: 'Admin', email: 'admin@example.test', role: 'ADMIN' };
let rows = [];
const session = (role = 'ADMIN') => RequestMock().onRequestTo(/\/api\/v1\/identity\/me$/)
  .respond({ status: 'AUTHENTICATED', user: { ...admin, role } }, 200, headers);
const reports = RequestMock().onRequestTo(/\/api\/v1\/admin\/(users|bookings)\?/)
  .respond({ items: [], total: 0, page: 0, size: 25 }, 200, headers)
  .onRequestTo(/\/api\/v1\/admin\/dashboard\?days=/).respond((_request, response) => response.setBody(JSON.stringify({
    generatedAt: '2026-10-24T00:00:00Z', from: '2026-09-25', through: '2026-10-24', users: 1, activeMovies: rows.length,
    current: { bookings: 0, revenue: 0 }, previous: { bookings: 0, revenue: 0 }, revenue: [], previousRevenue: [], recentBookings: [], topMovies: [], genres: [],
  })), 200, headers);
const api = RequestMock().onRequestTo({ url: endpoint, method: 'get' }).respond((request, response) => {
  const url = new URL(request.url), q = (url.searchParams.get('q') || '').toLowerCase();
  const found = rows.filter(movie => (movie.title + ' ' + movie.slug).toLowerCase().includes(q));
  response.setBody(JSON.stringify({ items: found, total: found.length, page: Number(url.searchParams.get('page') || 0), size: 25 }));
}, 200, headers).onRequestTo(/\/api\/v1\/identity\/csrf$/).respond({ token: 'movie-csrf' }, 200, headers)
  .onRequestTo({ url: endpoint, method: 'post' }).respond((request, response) => {
    const input = JSON.parse(request.body.toString());
    if (rows.some(movie => movie.slug === input.slug)) { response.statusCode = 409; response.setBody(JSON.stringify({ message: 'This slug is already in use.' })); return; }
    const movie = { ...input, id: 'movie-' + (rows.length + 1), status: 'ACTIVE', createdAt: '2026-10-24T00:00:00Z' };
    rows.unshift(movie); response.statusCode = 201; response.setBody(JSON.stringify(movie));
  }, 201, headers);
const requests = RequestLogger(endpoint, { logRequestHeaders: true, logRequestBody: true });
const posterEndpoint = /\/api\/v1\/admin\/movies\/posters$/;
const posterUrl = 'https://storage.example.test/storage/v1/object/public/movie-posters/test.png';
const posterFile = resolve('frontend/public/images/chronicles-of-dust.png');
const posterImage = RequestMock().onRequestTo(posterUrl).respond(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=', 'base64'), 200, { 'content-type': 'image/png' });
fixture('Admin Movie catalog').page(base).beforeEach(() => { rows = []; requests.clear(); });

test.requestHooks(session(), reports, api)('Add movie dialog shows all borders and keeps fields inside the panel', async t => {
  await t.resizeWindow(1440, 1050).navigateTo(base + '/admin/movies')
    .click(Selector('button').withExactText('Add movie'));
  const panel = await ClientFunction(() => {
    const dialog = document.querySelector('dialog');
    const style = getComputedStyle(dialog);
    const bounds = dialog.getBoundingClientRect();
    return {
      borders: ['Top', 'Right', 'Bottom', 'Left'].every(side => parseFloat(style[`border${side}Width`]) >= 1 && style[`border${side}Style`] === 'solid'),
      overflowing: Array.from(dialog.querySelectorAll('input[id^="movie-"]:not([type="file"]), textarea[id^="movie-"]')).filter(field => {
        const box = field.getBoundingClientRect();
        return box.left < bounds.left || box.right > bounds.right;
      }).map(field => ({ id: field.id, left: field.getBoundingClientRect().left, right: field.getBoundingClientRect().right,
        dialogLeft: bounds.left, dialogRight: bounds.right })),
      posterOnRight: dialog.querySelector('section[aria-label="Movie poster"]').getBoundingClientRect().left > dialog.querySelector('#movie-description').getBoundingClientRect().right,
    };
  })();
  await t.expect(panel.borders).ok('The Add movie panel needs a visible border on every side.')
    .expect(panel.overflowing).eql([], 'Form fields must not clip the right border.')
    .expect(panel.posterOnRight).ok();
});

async function fill(t) {
  await t.typeText('#movie-title', 'A New Movie').expect(Selector('#movie-slug').value).eql('a-new-movie')
    .typeText('#movie-description', 'A story for the big screen.').typeText('#movie-duration', '120')
    .typeText('#movie-age-rating', 'T13').typeText('#movie-genres', 'Drama, Adventure')
    .typeText('#movie-poster', base + '/images/chronicles-of-dust.png');
}

test.requestHooks(session(), reports, api, requests)('Movie route preserves layout, validates form, creates a movie and refreshes Overview', async t => {
  await t.resizeWindow(1440, 1050).navigateTo(base + '/admin').expect(Selector('.admin-dashboard-data').exists).ok();
  await ClientFunction(() => { window.__movieSidebar = document.querySelector('aside'); window.__movieDocument = true; })();
  await t.click(Selector('nav a').withExactText('Movie')).expect(Selector('h1').innerText).eql('Movie management')
    .expect(Selector('#movies-panel').innerText).contains('No movies yet')
    .click(Selector('button').withExactText('Add movie')).expect(Selector('dialog').visible).ok()
    .click(Selector('dialog button[type="submit"]')).expect(requests.count(record => record.request.method === 'post')).eql(0);
  await fill(t);
  await t.expect(ClientFunction(() => {
    const image = document.querySelector('img[alt="Movie poster preview"]');
    return !!image && image.complete && image.naturalWidth > 0;
  })()).ok();
  await t.takeScreenshot('admin-movie-form.png').click(Selector('dialog button[type="submit"]'))
    .expect(Selector('dialog').exists).notOk().expect(Selector('[role="status"]').innerText).contains('added to the active catalog')
    .expect(Selector('#movies-panel tbody').innerText).contains('A New Movie')
    .expect(requests.count(record => record.request.method === 'post')).eql(1)
    .expect(requests.contains(record => record.request.method === 'post' && record.request.headers['x-csrf-token'] === 'movie-csrf')).ok()
    .expect(ClientFunction(() => window.__movieSidebar === document.querySelector('aside') && window.__movieDocument)()).ok()
    .click(Selector('nav a').withExactText('Overview')).expect(Selector('.admin-dashboard-data').exists).ok()
    .expect(Selector('article').withText('Active movies').innerText).contains('1');
});

const uploaded = RequestMock().onRequestTo({ url: posterEndpoint, method: 'post' }).respond({ posterUrl }, 201, headers);
const uploads = RequestLogger(posterEndpoint, { logRequestHeaders: true });
test.requestHooks(session(), reports, api, uploaded, posterImage, uploads, requests)('Uploaded poster previews on the right and its Storage URL is saved with the Movie', async t => {
  uploads.clear();
  await t.resizeWindow(1440, 1050).navigateTo(base + '/admin/movies').click(Selector('button').withExactText('Add movie'));
  await fill(t);
  await t.setFilesToUpload('#movie-poster-file', posterFile)
    .expect(Selector('#movie-poster').value).eql(posterUrl)
    .expect(Selector('img[alt="Movie poster preview"]').getAttribute('src')).eql(posterUrl)
    .expect(ClientFunction(() => { const image = document.querySelector('img[alt="Movie poster preview"]'); return image?.complete && image.naturalWidth > 0; })()).ok()
    .expect(uploads.count(() => true)).eql(1)
    .expect(uploads.contains(record => record.request.headers['x-csrf-token'] === 'movie-csrf'
      && record.request.headers['content-type'].startsWith('multipart/form-data;'))).ok()
    .takeScreenshot('admin-movie-upload-preview.png')
    .click(Selector('dialog button[type="submit"]')).expect(Selector('dialog').exists).notOk();
  await t.expect(rows[0].posterUrl).eql(posterUrl);
});

const uploadFailed = RequestMock().onRequestTo(posterEndpoint).respond({ message: 'Poster upload is unavailable. Please try again or use a poster URL.' }, 503, headers);
test.requestHooks(session(), reports, api, uploadFailed)('Failed upload preserves Movie fields and an existing poster URL', async t => {
  await t.navigateTo(base + '/admin/movies').click(Selector('button').withExactText('Add movie'));
  await fill(t);
  await t.setFilesToUpload('#movie-poster-file', posterFile)
    .expect(Selector('dialog [role="alert"]').innerText).contains('Poster upload is unavailable')
    .expect(Selector('#movie-title').value).eql('A New Movie')
    .expect(Selector('#movie-poster').value).eql(base + '/images/chronicles-of-dust.png')
    .expect(Selector('dialog button[type="submit"]').hasAttribute('disabled')).notOk();
});

test.requestHooks(session(), reports, api, uploads)('Unsupported upload is rejected without calling Storage', async t => {
  uploads.clear();
  await t.navigateTo(base + '/admin/movies').click(Selector('button').withExactText('Add movie'))
    .setFilesToUpload('#movie-poster-file', resolve('frontend/public/favicon.svg'))
    .expect(Selector('dialog [role="alert"]').innerText).contains('JPEG, PNG or WebP')
    .expect(uploads.count(() => true)).eql(0);
});

test.requestHooks(session(), reports, api, requests)('Duplicate slug preserves form values and can be corrected', async t => {
  rows = [{ id: 'existing', title: 'A New Movie', slug: 'a-new-movie', description: 'Existing', durationMinutes: 120,
    ageRating: 'T13', posterUrl: base + '/images/chronicles-of-dust.png', releaseDate: null, status: 'ACTIVE', createdAt: '2026-10-24T00:00:00Z', genres: ['Drama'] }];
  await t.navigateTo(base + '/admin/movies').click(Selector('button').withExactText('Add movie'));
  await fill(t);
  await t.click(Selector('dialog button[type="submit"]')).expect(Selector('dialog [role="alert"]').innerText).contains('slug is already in use')
    .expect(Selector('#movie-title').value).eql('A New Movie').expect(Selector('#movie-description').value).contains('big screen')
    .typeText('#movie-slug', 'a-new-movie-2', { replace: true }).click(Selector('dialog button[type="submit"]'))
    .expect(Selector('dialog').exists).notOk().expect(Selector('#movies-panel tbody tr').count).eql(2);
});

test.requestHooks(session(), reports, api, requests)('Mobile form fits, and Cancel does not send a creation request', async t => {
  await t.resizeWindow(375, 812).navigateTo(base + '/admin/movies').click(Selector('button').withExactText('Add movie'))
    .typeText('#movie-title', 'Draft movie')
    .expect(ClientFunction(() => { const dialog = document.querySelector('dialog'); return dialog.scrollWidth <= dialog.clientWidth && dialog.getBoundingClientRect().width <= innerWidth; })()).ok()
    .takeScreenshot('admin-movie-form-mobile.png').click(Selector('dialog button').withExactText('Cancel'))
    .expect(Selector('dialog').exists).notOk().expect(requests.count(record => record.request.method === 'post')).eql(0);
});

for (const role of ['CUSTOMER', 'CINEMA_STAFF']) test.requestHooks(session(role), requests)(role + ' cannot open the Movie form or prefetch the catalog', async t => {
  await t.navigateTo(base + '/admin/movies').expect(Selector('.error-page-code').innerText).eql('403')
    .expect(Selector('#movies-panel').exists).notOk().expect(requests.count(() => true)).eql(0);
});
