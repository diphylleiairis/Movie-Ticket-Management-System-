import { ClientFunction, Selector } from 'testcafe';

const base = 'http://127.0.0.1:15173';
const location = ClientFunction(() => window.location.href);
const sessionUser = ClientFunction(() => fetch('/api/v1/identity/me', { credentials: 'include' })
  .then(response => response.json().then(body => ({ status: response.status, body }))));
const googleButton = Selector('.auth-providers button').withText('Google');
const submit = Selector('button[type="submit"]');
const error = Selector('.auth-error');
const uniqueEmail = () => `browser-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.test`;

fixture('Identity backend and Google login').page(`${base}/login`);

async function register(t, email) {
  await t.navigateTo(`${base}/register`)
    .typeText('#full-name', 'Browser Customer').typeText('#auth-email', email)
    .typeText('#auth-password', 'Password123').typeText('#confirm-password', 'Password123')
    .click(Selector('input[type="checkbox"]')).click(submit)
    .expect(Selector('#verification-digit-1').exists).ok();
  const response = await t.request(`http://127.0.0.1:19090/mail?email=${encodeURIComponent(email)}`);
  const code = response.body.code;
  await t.expect(code).match(/^[0-9]{6}$/);
  for (let i = 0; i < 6; i++) await t.typeText(`#verification-digit-${i + 1}`, code[i], { replace: true });
  await t.click(Selector('button').withText('VERIFY EMAIL'))
    .expect(Selector('.auth-completed').exists).ok();
}

async function approveGoogle(t, email, verified = true) {
  await t.expect(Selector('#fixture-email').exists).ok()
    .typeText('#fixture-email', email, { replace: true });
  if (!verified) await t.click('#fixture-verified');
  await t.click('#fixture-approve');
}

test('Email registration verifies code, logs in, survives reload and logs out', async t => {
  const email = uniqueEmail();
  await register(t, email);
  await t.navigateTo(`${base}/login`).typeText('#auth-email', email).typeText('#auth-password', 'Password123')
    .click(submit).expect(location()).eql(`${base}/`);
  const first = await sessionUser();
  await t.expect(first.status).eql(200).expect(first.body.user.role).eql('CUSTOMER');
  await t.navigateTo(`${base}/movie-list`);
  const next = await sessionUser();
  await t.expect(next.body.user.id).eql(first.body.user.id);
  const signedOut = await ClientFunction(() => fetch('/api/v1/identity/csrf').then(response => response.json())
    .then(csrf => fetch('/api/v1/identity/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf.token } }))
    .then(response => response.status))();
  await t.expect(signedOut).eql(200).expect((await sessionUser()).status).eql(401);
});

test('Invalid credentials display an error without creating a session', async t => {
  await t.typeText('#auth-email', uniqueEmail()).typeText('#auth-password', 'WrongPassword123').click(submit)
    .expect(error.innerText).contains('email or password is incorrect');
  await t.expect((await sessionUser()).status).eql(401);
});

test('Verified Google creates an active Customer without email code', async t => {
  const email = uniqueEmail();
  await t.click(googleButton);
  await approveGoogle(t, email);
  await t.expect(location()).eql(`${base}/`);
  const user = await sessionUser();
  await t.expect(user.status).eql(200).expect(user.body.user.email).eql(email).expect(user.body.user.role).eql('CUSTOMER');
  const inbox = await t.request(`http://127.0.0.1:19090/mail?email=${encodeURIComponent(email)}`);
  await t.expect(inbox.body.code).eql(null);
});

test('Unverified Google email is rejected and the error is visible', async t => {
  await t.click(googleButton);
  await approveGoogle(t, uniqueEmail(), false);
  await t.expect(error.innerText).contains('Google has not verified your email')
    .expect((await sessionUser()).status).eql(401);
});

test('Email collision requires password sign-in and explicit Google link', async t => {
  const email = uniqueEmail();
  await register(t, email);
  await t.navigateTo(`${base}/login`).click(googleButton);
  await approveGoogle(t, email);
  await t.expect(error.innerText).contains('Sign in with your password to link Google')
    .expect(submit.innerText).contains('SIGN IN AND LINK GOOGLE')
    .typeText('#auth-email', email).typeText('#auth-password', 'Password123').click(submit);
  await approveGoogle(t, email);
  await t.expect(location()).eql(`${base}/`).expect((await sessionUser()).status).eql(200);
});
