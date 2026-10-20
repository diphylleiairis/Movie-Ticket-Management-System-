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
  await t.navigateTo(`${base}/`);
  await t.click(Selector('button[aria-label="Account: Browser Customer"]'))
    .expect(Selector('.site-header').innerText).contains(email)
    .click(Selector('button').withText('Sign out'))
    .expect(Selector('a[aria-label="Sign in to your account"]').exists).ok();
  await t.expect((await sessionUser()).status).eql(401);
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

test('Google registration creates a Customer and later Google sign-in restores the same account', async t => {
  const email = uniqueEmail();
  await t.navigateTo(`${base}/register`).click(googleButton)
    .expect(error.innerText).contains('Please agree');
  await t.click(Selector('input[type="checkbox"]')).click(googleButton);
  await approveGoogle(t, email);
  await t.expect(location()).eql(`${base}/`);
  const first = await sessionUser();
  await t.expect(first.status).eql(200).expect(first.body.user.role).eql('CUSTOMER');
  await t.click(Selector('button[aria-label="Account: Google Customer"]'))
    .click(Selector('button').withText('Sign out'));
  await t.navigateTo(`${base}/login`).click(googleButton);
  await approveGoogle(t, email);
  await t.expect(location()).eql(`${base}/`);
  await t.expect((await sessionUser()).body.user.id).eql(first.body.user.id);
});

test('Reset email link opens password form with token, changes password and cannot be reused', async t => {
  const email = uniqueEmail();
  await register(t, email);
  await t.navigateTo(`${base}/forgot-password`).typeText('#auth-email', email).click(submit)
    .expect(Selector('.auth-completed').exists).ok();
  const inbox = await t.request(`http://127.0.0.1:19090/mail?email=${encodeURIComponent(email)}`);
  const link = inbox.body.resetLink;
  await t.expect(link).match(/^http:\/\/127\.0\.0\.1:15173\/reset-password#token=[A-Za-z0-9_-]+$/);
  await t.navigateTo(link).expect(Selector('#auth-email').exists).notOk()
    .typeText('#auth-password', 'ChangedPassword123').typeText('#confirm-password', 'Mismatch123').click(submit)
    .expect(error.innerText).contains('passwords do not match')
    .typeText('#confirm-password', 'ChangedPassword123', { replace: true }).click(submit)
    .expect(Selector('.auth-completed').innerText).contains('Your password has been changed')
    .expect(location()).eql(`${base}/reset-password`);
  await t.navigateTo(link).typeText('#auth-password', 'AnotherPassword123')
    .typeText('#confirm-password', 'AnotherPassword123').click(submit)
    .expect(error.innerText).contains('invalid or has expired');
  await t.navigateTo(`${base}/login`).typeText('#auth-email', email)
    .typeText('#auth-password', 'Password123').click(submit)
    .expect(error.innerText).contains('email or password is incorrect')
    .typeText('#auth-password', 'ChangedPassword123', { replace: true }).click(submit)
    .expect(location()).eql(`${base}/`);
});

test('Google Customer creates a password through reset email and keeps both sign-in methods', async t => {
  const email = uniqueEmail();
  await t.navigateTo(`${base}/register`).click(Selector('input[type="checkbox"]')).click(googleButton);
  await approveGoogle(t, email);
  await t.expect(location()).eql(`${base}/`);
  const original = await sessionUser();
  await t.expect(original.status).eql(200);
  await t.click(Selector('button[aria-label="Account: Google Customer"]'))
    .click(Selector('button').withText('Sign out'));
  await t.navigateTo(`${base}/forgot-password`).typeText('#auth-email', email).click(submit)
    .expect(Selector('.auth-completed').exists).ok();
  const inbox = await t.request(`http://127.0.0.1:19090/mail?email=${encodeURIComponent(email)}`);
  await t.expect(inbox.body.resetLink).match(/^http:\/\/127\.0\.0\.1:15173\/reset-password#token=[A-Za-z0-9_-]+$/);
  await t.navigateTo(inbox.body.resetLink).typeText('#auth-password', 'FirstPassword123')
    .typeText('#confirm-password', 'FirstPassword123').click(submit)
    .expect(Selector('.auth-completed').innerText).contains('Your password has been changed')
    .click(Selector('a').withText('BACK TO SIGN IN'))
    .typeText('#auth-email', email).typeText('#auth-password', 'FirstPassword123').click(submit)
    .expect(location()).eql(`${base}/`);
  await t.expect((await sessionUser()).body.user.id).eql(original.body.user.id);
  await t.click(Selector('button[aria-label="Account: Google Customer"]'))
    .click(Selector('button').withText('Sign out'));
  await t.navigateTo(`${base}/login`).click(googleButton);
  await approveGoogle(t, email);
  await t.expect(location()).eql(`${base}/`);
  await t.expect((await sessionUser()).body.user.id).eql(original.body.user.id);
});

test('Missing or invalid reset token offers a new reset link', async t => {
  await t.navigateTo(`${base}/reset-password`)
    .expect(error.innerText).contains('missing its token').expect(submit.hasAttribute('disabled')).ok();
  await t.navigateTo(`${base}/reset-password#token=invalid-token`)
    .typeText('#auth-password', 'Password123').typeText('#confirm-password', 'Password123').click(submit)
    .expect(error.innerText).contains('invalid or has expired')
    .click(Selector('a').withText('Request a new reset link'))
    .expect(location()).eql(`${base}/forgot-password`);
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
