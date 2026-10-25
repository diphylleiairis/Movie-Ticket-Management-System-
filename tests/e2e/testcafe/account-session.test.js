import { ClientFunction, RequestMock, Selector } from 'testcafe';

const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const headers = { 'content-type': 'application/json' };
const user = { id: 'admin-session', email: 'admin@example.test', fullName: 'Signed-in Admin', role: 'ADMIN' };
const path = ClientFunction(() => location.pathname);
fixture('Account session navigation').page(base);

for (const role of ['ADMIN', 'CINEMA_STAFF']) {
  let releaseIdentity;
  const identityReady = new Promise(resolve => { releaseIdentity = resolve; });
  const delayedSession = RequestMock().onRequestTo(/\/api\/v1\/identity\/me$/).respond(async (_request, response) => {
    await identityReady;
    response.setBody(JSON.stringify({ status: 'AUTHENTICATED', user: { ...user, role } }));
  }, 200, headers);

  test.requestHooks(delayedSession)(`${role}: clicking profile while Identity is pending never opens login`, async t => {
    try {
      await ClientFunction(() => document.querySelector('.profile').click())();
      await t.expect(path()).eql('/', 'An unresolved Identity request must not send a signed-in user to login.', { timeout: 500 });
    } finally {
      releaseIdentity();
    }
    await t.click(Selector('button[aria-label="Account: Signed-in Admin"]'))
      .expect(Selector('nav[aria-label="Account options"]').visible).ok()
      .expect(path()).eql('/');
  });
}

for (const status of [503, 200]) {
  let unavailable = true;
  const recoverable = RequestMock().onRequestTo(/\/api\/v1\/identity\/me$/).respond((_request, response) => {
    response.statusCode = unavailable ? status : 200;
    response.setBody(JSON.stringify(unavailable ? { message: 'Identity unavailable' } : { status: 'AUTHENTICATED', user }));
  }, 200, headers);
  test.requestHooks(recoverable)(`Identity ${status === 503 ? 'failure' : 'malformed response'} offers retry instead of login`, async t => {
    const retry = Selector('button[aria-label="Account unavailable. Retry account check"]');
    await t.expect(retry.exists).ok()
      .expect(Selector('a.profile[href^="/login"]').exists).notOk()
      .expect(path()).eql('/');
    unavailable = false;
    await t.click(retry).click(Selector('button[aria-label="Account: Signed-in Admin"]'))
      .expect(Selector('nav[aria-label="Account options"]').visible).ok()
      .expect(path()).eql('/');
  });
}

const anonymous = RequestMock().onRequestTo(/\/api\/v1\/identity\/me$/).respond({}, 401, headers);
test.requestHooks(anonymous)('Only confirmed absence of Identity makes the icon link to login', async t => {
  await t.click(Selector('a[aria-label="Sign in to your account"]'))
    .expect(path()).eql('/login')
    .expect(Selector('nav[aria-label="Account options"]').exists).notOk();
});

let loggedOut = false;
const logout = RequestMock()
  .onRequestTo(/\/api\/v1\/identity\/me$/).respond((_request, response) => {
    response.statusCode = loggedOut ? 401 : 200;
    response.setBody(JSON.stringify(loggedOut ? {} : { status: 'AUTHENTICATED', user }));
  }, 200, headers)
  .onRequestTo(/\/api\/v1\/identity\/profile$/).respond({ ...user, phone: null }, 200, headers)
  .onRequestTo(/\/api\/v1\/identity\/csrf$/).respond({ token: 'test-csrf' }, 200, headers)
  .onRequestTo(/\/api\/v1\/identity\/logout$/).respond((_request, response) => {
    loggedOut = true;
    response.setBody(JSON.stringify({ status: 'SIGNED_OUT' }));
  }, 200, headers);
test.requestHooks(logout)('Successful logout clears the role menu and shows login', async t => {
  await t.navigateTo(base + '/account')
    .click(Selector('button').withExactText('Sign out'))
    .expect(path()).eql('/login')
    .expect(Selector('a[aria-label="Sign in to your account"]').exists).ok()
    .expect(Selector('button[aria-label="Account: Signed-in Admin"]').exists).notOk();
});
