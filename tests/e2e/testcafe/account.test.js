import { ClientFunction, RequestMock, Selector } from 'testcafe';

const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const user = { id: 'customer-1', email: 'customer@example.test', fullName: 'Cinema Lover', role: 'CUSTOMER', phone: '0901234567' };
const serverTime = '2026-10-20T10:00:00Z';
const ticket = (id, status, admitted, closes = '2026-10-20T13:15:00Z') => ({
  id, bookingId: `booking-${id}`, customerName: user.fullName,
  details: { movie: 'CHRONICLES OF DUST', cinema: 'The Lumière District 1', seats: ['E5', 'E6'], price: 180000, currency: 'VND' },
  startsAt: '2026-10-20T13:00:00Z', checkInOpensAt: '2026-10-20T12:30:00Z', checkInClosesAt: closes,
  seatCount: 2, admittedCount: admitted, remainingAdmissions: 2 - admitted, status, qrToken: `test-only-${id}`,
});
const tickets = [ticket('valid', 'VALID', 0), ticket('partial', 'PARTIALLY_USED', 1),
  ticket('used', 'USED', 2), ticket('expired', 'EXPIRED', 0, '2026-10-20T09:00:00Z')];
const headers = { 'content-type': 'application/json' };
const mock = RequestMock()
  .onRequestTo({ url: /\/api\/v1\/identity\/me$/, method: 'get' }).respond({ status: 'AUTHENTICATED', user }, 200, headers)
  .onRequestTo({ url: /\/api\/v1\/identity\/profile$/, method: 'get' }).respond(user, 200, headers)
  .onRequestTo({ url: /\/api\/v1\/identity\/csrf$/, method: 'get' }).respond({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }, 200, headers)
  .onRequestTo({ url: /\/api\/v1\/identity\/profile$/, method: 'post' }).respond({ status: 'PROFILE_UPDATED', user: { ...user, fullName: 'Updated Customer' } }, 200, headers)
  .onRequestTo({ url: /\/api\/v1\/tickets\/mine$/, method: 'get' }).respond({ serverTime, tickets }, 200, headers);

fixture('Account profile and customer tickets').page(base).requestHooks(mock);

test('User icon opens profile; edits save and verified email stays read-only', async t => {
  await t.resizeWindow(1440, 1000).click(Selector('a[aria-label="Account: Cinema Lover"]'))
    .expect(Selector('.account-page').exists).ok()
    .expect(Selector('#profile-email').value).eql(user.email)
    .expect(Selector('#profile-email').hasAttribute('readonly')).ok()
    .typeText('#profile-name', 'Updated Customer', { replace: true })
    .typeText('#profile-phone', '+84 901234567', { replace: true })
    .click(Selector('button').withText('SAVE CHANGES'))
    .expect(Selector('[role="status"]').withText('has been saved').exists).ok()
    .expect(Selector('#profile-name').value).eql('Updated Customer');
});

test('Used and expired QR codes are gray; partial admission retains a usable QR', async t => {
  await t.resizeWindow(1440, 1000).navigateTo(`${base}/account`).expect(Selector('.account-ticket').count).eql(4);
  for (const id of ['used', 'expired']) {
    await t.expect(Selector(`[data-ticket-id="${id}"] .ticket-qr`).hasClass('grayscale')).ok();
  }
  await t.expect(Selector('[data-ticket-id="partial"] .ticket-qr').hasClass('grayscale')).notOk()
    .expect(Selector('[data-ticket-id="partial"]').innerText).contains('1 remaining')
    .expect(Selector('[data-ticket-id="valid"] svg').exists).ok()
    .takeScreenshot('account-desktop.png')
    .click(Selector('button').withText('Used & expired')).expect(Selector('.account-ticket').count).eql(2)
    .click(Selector('button').withText('Upcoming')).expect(Selector('.account-ticket').count).eql(2)
    .resizeWindow(375, 812)
    .expect(ClientFunction(() => document.querySelector('.account-page').scrollWidth <= innerWidth)()).ok()
    .takeScreenshot('account-mobile.png');
});

const anonymous = RequestMock()
  .onRequestTo({ url: /\/api\/v1\/identity\/(me|profile)$/, method: 'get' }).respond({ code: 'UNAUTHENTICATED' }, 401, headers);
test.requestHooks(anonymous)('Opening account without a session returns to sign-in', async t => {
  await t.removeRequestHooks(mock).navigateTo(`${base}/account`)
    .expect(ClientFunction(() => location.pathname)()).eql('/login');
});
