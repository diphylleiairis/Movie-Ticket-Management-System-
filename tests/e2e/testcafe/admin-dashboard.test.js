import { ClientFunction, RequestLogger, RequestMock, Selector } from 'testcafe';
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const headers = { 'content-type': 'application/json' };
const admin = { id: 'aaaaaaaa-0000-0000-0000-000000000000', fullName: 'Alex Laurent', email: 'admin@example.test', role: 'ADMIN' };
const first = { id: 'bbbbbbbb-0000-0000-0000-000000000000', fullName: 'Customer One', email: 'one@example.test', role: 'CUSTOMER', status: 'ACTIVE', emailVerified: true, createdAt: '2026-10-24T09:00:00Z' };
const pending = { ...first, id: 'cccccccc-0000-0000-0000-000000000000', email: 'pending@example.test', fullName: 'Pending Customer', status: 'PENDING_VERIFICATION', emailVerified: false };
const users = { items: [{ ...first, ...admin }, first, pending], total: 26, page: 0, size: 25 };
const booking = { id: 'dddddddd-0000-0000-0000-000000000000', customer: 'Customer One', movie: 'Archived movie', createdAt: '2024-01-01T00:00:00Z', seats: 2, amount: 12.5, currency: 'USD', status: 'CANCELLED' };
const reportUrl = /\/api\/v1\/admin\/dashboard\?days=/;
const reportData = { generatedAt: '2026-10-24T09:00:00Z', from: '2026-09-25', through: '2026-10-24', users: 26, activeMovies: 0,
 current: { bookings: 1, revenue: 0 }, previous: { bookings: 0, revenue: 0 }, revenue: [], previousRevenue: [], recentBookings: [booking], topMovies: [], genres: [] };
const listUrl = /\/api\/v1\/admin\/(users|bookings)\?/;
const userUrl = /\/api\/v1\/admin\/users\?/;
const bookingsUrl = /\/api\/v1\/admin\/bookings\?/;
const updateUrl = /\/api\/v1\/admin\/users\/[^/]+\/status$/;
const url = ClientFunction(() => location.pathname + location.search);
const session = (role = 'ADMIN') => RequestMock().onRequestTo(/\/api\/v1\/identity\/me$/).respond({ status: 'AUTHENTICATED', user: { ...admin, role } }, 200, headers).onRequestTo(/\/api\/v1\/admin\/movies\?/).respond({ items: [], total: 0, page: 0, size: 25 }, 200, headers);
const anonymous = RequestMock().onRequestTo(/\/api\/v1\/identity\/me$/).respond({}, 401, headers);
const data = RequestMock().onRequestTo(userUrl).respond(users, 200, headers).onRequestTo(bookingsUrl).respond({ items: [booking], total: 1, page: 0, size: 25 }, 200, headers).onRequestTo(reportUrl).respond(reportData, 200, headers);
const writes = RequestMock().onRequestTo(/\/api\/v1\/identity\/csrf$/).respond({ token: 'test-csrf' }, 200, headers).onRequestTo({ url: updateUrl, method: 'post' }).respond({ status: 'UPDATED' }, 200, headers);
const changes = RequestLogger(updateUrl, { logRequestBody: true, logRequestHeaders: true });
fixture('Admin User and Booking workspace').page(base).beforeEach(async t => { await t.resizeWindow(1440, 1000); });

let slowReads = 0;
const warmRequests = RequestLogger(userUrl);
const slowRefresh = RequestMock().onRequestTo(reportUrl).respond(reportData, 200, headers)
  .onRequestTo(bookingsUrl).respond({ items: [booking], total: 1, page: 0, size: 25 }, 200, headers)
  .onRequestTo(userUrl).respond(async (_request, response) => {
    if (++slowReads > 1) await new Promise(resolve => setTimeout(resolve, 2500));
    response.setBody(JSON.stringify(users));
  }, 200, headers);
test.requestHooks(session(), slowRefresh, warmRequests)('User data preloads before navigation and is visible while its slow refresh is pending', async t => {
  slowReads = 0; warmRequests.clear();
  await t.navigateTo(base + '/admin').expect(Selector('.admin-dashboard-data').exists).ok()
    .expect(warmRequests.contains(record => record.response?.statusCode === 200)).ok();
  const fast = await ClientFunction(() => {
    const start = performance.now();
    document.querySelector('nav a[href="/admin/users"]').click();
    return new Promise(resolve => {
      const check = () => {
        const panel = document.querySelector('#users-panel');
        const visible = panel?.textContent.includes('one@example.test');
        if (visible || performance.now() - start >= 1000) resolve({ visible, updating: panel?.textContent.includes('Updating') });
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  })();
  await t.expect(fast.visible).ok().expect(fast.updating).ok()
    .expect(Selector('#users-panel tbody').innerText).contains('one@example.test');
});

let revokeUsers = false;
const revokedWarmData = RequestMock().onRequestTo(reportUrl).respond(reportData, 200, headers)
  .onRequestTo(bookingsUrl).respond({ items: [], total: 0, page: 0, size: 25 }, 200, headers)
  .onRequestTo(userUrl).respond((_request, response) => {
    response.statusCode = revokeUsers ? 403 : 200;
    response.setBody(JSON.stringify(revokeUsers ? {} : users));
  }, 200, headers);
const cachedRequests = RequestLogger(userUrl);
test.requestHooks(session(), revokedWarmData, cachedRequests)('A denied refresh clears protected data that was already prefetched', async t => {
  revokeUsers = false; cachedRequests.clear();
  await t.navigateTo(base + '/admin').expect(Selector('.admin-dashboard-data').exists).ok()
    .expect(cachedRequests.contains(record => record.response?.statusCode === 200)).ok();
  revokeUsers = true;
  await t.click(Selector('nav a').withExactText('User'))
    .expect(Selector('.error-page-code').innerText).eql('403')
    .expect(Selector('#users-panel').exists).notOk().expect(Selector('.admin-dashboard').exists).notOk();
});

test.requestHooks(session(), data, writes, changes)('User tab suspends and restores access, with verification and self guards', async t => {
  await t.resizeWindow(1440, 1000).navigateTo(base + '/admin/users')
    .expect(Selector('h1').innerText).eql('User management').expect(Selector('nav[aria-label="Workspace sections"] a').count).eql(4)
    .expect(Selector('aside a[href^="#"]').exists).notOk().expect(Selector('aside').innerText).contains('Overview')
    .expect(Selector('button[aria-label="Update admin@example.test"]').hasAttribute('disabled')).ok()
    .expect(Selector('button[aria-label="Update pending@example.test"]').hasAttribute('disabled')).ok()
    .click(Selector('button[aria-label="Update one@example.test"]')).expect(Selector('dialog').visible).ok()
    .click(Selector('select[aria-label="User status"]')).click(Selector('option').withText('SUSPENSE'))
    .click(Selector('button').withText('Save changes')).expect(Selector('dialog').exists).notOk()
    .expect(Selector('#users-panel [role="status"]').innerText).contains('updated to SUSPENSE')
    .expect(Selector('#users-panel tbody tr').withText('one@example.test').innerText).contains('SUSPENSE')
    .click(Selector('button[aria-label="Update one@example.test"]'))
    .click(Selector('select[aria-label="User status"]')).click(Selector('option').withText('ACTIVE'))
    .click(Selector('button').withText('Save changes'))
    .expect(Selector('#users-panel [role="status"]').innerText).contains('updated to ACTIVE')
    .expect(changes.count(record => record.request.method === 'post')).eql(2)
    .expect(changes.contains(record => record.request.headers['x-csrf-token'] === 'test-csrf')).ok()
    .takeScreenshot('admin-users.png');
});
const pages = RequestMock().onRequestTo(reportUrl).respond(reportData, 200, headers)
  .onRequestTo(bookingsUrl).respond({ items: [booking], total: 1, page: 0, size: 25 }, 200, headers)
  .onRequestTo(/\/admin\/users\?page=0&size=25&q=$/).respond(users, 200, headers)
  .onRequestTo(/\/admin\/users\?page=1&size=25&q=$/).respond({ ...users, items: [{ ...first, fullName: 'Last page user' }], page: 1 }, 200, headers)
  .onRequestTo(/\/admin\/users\?page=0&size=25&q=Last/).respond({ ...users, items: [{ ...first, fullName: 'Last page user' }], total: 1 }, 200, headers);
test.requestHooks(session(), pages)('Pagination and server search reach accounts beyond the first page', async t => {
  await t.resizeWindow(1440, 1000).navigateTo(base + '/admin/users').expect(Selector('#users-panel').exists).ok()
    .click(Selector('button').withExactText('Next')).expect(Selector('#users-panel tbody').innerText).contains('Last page user')
    .expect(Selector('button').withExactText('Next').hasAttribute('disabled')).ok()
    .typeText(Selector('input[aria-label="Search users"]'), 'Last').click(Selector('button').withExactText('Search'))
    .expect(Selector('#users-panel').innerText).contains('1 records')
    .expect(Selector('button').withExactText('Previous').hasAttribute('disabled')).ok();
});
test.requestHooks(session(), data)('Booking shows old and cancelled records without update controls; mobile tabs work', async t => {
  await t.navigateTo(base + '/admin?tab=bookings').expect(Selector('h1').innerText).eql('All bookings')
    .expect(Selector('#bookings-panel tbody').innerText).contains('Archived movie')
    .expect(Selector('#bookings-panel tbody').innerText).contains('2024')
    .expect(Selector('#bookings-panel tbody').innerText).contains('CANCELLED')
    .expect(Selector('#bookings-panel tbody').innerText).contains('12,50')
    .expect(Selector('#bookings-panel tbody button').exists).notOk().takeScreenshot('admin-bookings.png')
    .resizeWindow(375, 812)
    .expect(ClientFunction(() => document.querySelector('.admin-dashboard').scrollWidth <= innerWidth)()).ok()
    .click(Selector('button[aria-label="Open admin navigation"]')).click(Selector('nav[aria-label="Workspace sections"] a').withExactText('User'))
    .expect(Selector('aside').visible).notOk().expect(Selector('#users-panel').exists).ok().takeScreenshot('admin-mobile.png');
});
for (const role of ['CUSTOMER', 'CINEMA_STAFF']) {
  const requests = RequestLogger(listUrl);
  test.requestHooks(session(role), requests)(role + ' cannot enter admin or fetch lists', async t => {
    await t.navigateTo(base + '/admin/users').expect(Selector('.error-page-code').innerText).eql('403')
      .expect(Selector('.admin-dashboard').exists).notOk().expect(requests.count(() => true)).eql(0);
  });
}
test.requestHooks(anonymous)('Anonymous admin visit returns to login', async t => {
  await t.navigateTo(base + '/admin').expect(url()).eql('/login?returnTo=%2Fadmin');
});
for (const status of [401, 403]) {
  const rejected = RequestMock().onRequestTo(listUrl).respond({}, status, headers).onRequestTo(reportUrl).respond(reportData, 200, headers);
  test.requestHooks(session(), rejected)('List API ' + status + ' removes protected data', async t => {
    await t.navigateTo(base + '/admin/users');
    if (status === 401) await t.expect(url()).eql('/login?returnTo=%2Fadmin');
    else await t.expect(Selector('.error-page-code').innerText).eql('403');
    await t.expect(Selector('#users-panel').exists).notOk();
  });
}
const empty = RequestMock().onRequestTo(listUrl).respond({ items: [], total: 0, page: 0, size: 25 }, 200, headers).onRequestTo(reportUrl).respond(reportData, 200, headers);
test.requestHooks(session(), empty)('Empty lists show honest empty states', async t => {
  await t.resizeWindow(1440, 1000).navigateTo(base + '/admin/users').expect(Selector('#users-panel').innerText).contains('No users found')
    .click(Selector('nav[aria-label="Workspace sections"] a').withExactText('Booking')).expect(Selector('#bookings-panel').innerText).contains('No bookings yet');
});
const unavailable = RequestMock().onRequestTo(listUrl).respond({}, 503, headers).onRequestTo(reportUrl).respond(reportData, 200, headers);
test.requestHooks(session(), unavailable)('List failures offer retry without fabricated data', async t => {
  await t.navigateTo(base + '/admin/users').expect(Selector('[role="alert"]').exists).ok().expect(Selector('#users-panel').exists).notOk()
    .removeRequestHooks(unavailable).addRequestHooks(data).click(Selector('button').withText('Try again'))
    .expect(Selector('#users-panel').exists).ok();
});
const refusedWrite = RequestMock().onRequestTo(/\/api\/v1\/identity\/csrf$/).respond({ token: 'test-csrf' }, 200, headers)
  .onRequestTo({ url: updateUrl, method: 'post' }).respond({ message: 'Account update unavailable.' }, 409, headers);
test.requestHooks(session(), data, refusedWrite)('Failed status update keeps original data and shows the error', async t => {
  await t.navigateTo(base + '/admin/users').click(Selector('button[aria-label="Update one@example.test"]'))
    .click(Selector('select[aria-label="User status"]')).click(Selector('option').withText('SUSPENSE'))
    .click(Selector('button').withText('Save changes')).expect(Selector('dialog [role="alert"]').innerText).contains('Account update unavailable')
    .click(Selector('dialog button').withExactText('Cancel'))
    .expect(Selector('#users-panel tbody tr').withText('one@example.test').innerText).contains('ACTIVE')
    .expect(Selector('#users-panel [role="status"]').exists).notOk();
});

const sessionRequests = RequestLogger(/\/api\/v1\/identity\/me$/);
test.requestHooks(session(), data, sessionRequests)('Overview stays available and all admin routes preserve the sidebar and browser document', async t => {
 await t.resizeWindow(1440, 1000).navigateTo(base + '/admin')
  .expect(Selector('h1').innerText).eql('The big picture')
  .expect(Selector('.admin-dashboard-data').exists).ok()
  .expect(Selector('aside').innerText).contains('WORKSPACE')
  .expect(Selector('aside').innerText).contains('PLATFORM')
  .expect(Selector('aside').innerText).contains('Administrator')
  .expect(Selector('nav a[href^="#"]').exists).notOk();
 const initialChecks = sessionRequests.requests.length;
 await ClientFunction(() => { window.__adminSidebar = document.querySelector('aside'); window.__adminDocumentMarker = 'persistent'; })();
 await t.click(Selector('nav a').withExactText('User')).expect(url()).eql('/admin/users')
  .expect(Selector('#users-panel').exists).ok()
  .click(Selector('nav a').withExactText('Booking')).expect(url()).eql('/admin/bookings')
  .expect(Selector('#bookings-panel').exists).ok()
  .click(Selector('nav a').withExactText('Overview')).expect(url()).eql('/admin')
  .expect(Selector('.admin-dashboard-data').exists).ok()
  .expect(ClientFunction(() => window.__adminSidebar === document.querySelector('aside') && window.__adminDocumentMarker === 'persistent')()).ok()
  .expect(sessionRequests.count(() => true)).eql(initialChecks)
  .takeScreenshot('admin-overview-restored.png');
});

const brokenReport = RequestMock().onRequestTo(/\/api\/v1\/admin\/dashboard\?days=/).respond({
 generatedAt: '2026-10-24T09:00:00Z', from: 'invalid-date', through: '2026-10-24', users: 0, activeMovies: 0,
 current: { bookings: 0, revenue: 0 }, previous: { bookings: 0, revenue: 0 }, revenue: [], previousRevenue: [],
 recentBookings: [], topMovies: [], genres: []
}, 200, headers);
test.requestHooks(session(), brokenReport, RequestMock().onRequestTo(userUrl).respond(users, 200, headers).onRequestTo(bookingsUrl).respond({ items: [booking], total: 1, page: 0, size: 25 }, 200, headers))('A real render failure shows 500 and client navigation resets the error boundary', async t => {
 await t.navigateTo(base + '/admin').expect(Selector('.error-page-code').innerText).eql('500');
 await ClientFunction(() => { window.__recoveryDocumentMarker = 'same-document'; })();
 await t.click(Selector('.recovery-secondary')).expect(url()).eql('/')
  .expect(Selector('.error-page').exists).notOk()
  .expect(ClientFunction(() => window.__recoveryDocumentMarker)()).eql('same-document');
});
