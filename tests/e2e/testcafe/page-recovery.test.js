import { ClientFunction, RequestMock, Selector } from 'testcafe';

const baseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const primary = Selector('.recovery-primary');
const pageUrl = ClientFunction(() => window.location.href);
const background = ClientFunction(() => getComputedStyle(document.querySelector('.error-page')).backgroundImage);
// This UI-only suite has no backend: the account header sees an anonymous visitor.
// Real session behavior is exercised separately by identity.test.js.
const anonymousSession = RequestMock()
    .onRequestTo({ url: /\/api\/v1\/identity\/me(?:\?.*)?$/, method: 'get' })
    .respond({ code: 'UNAUTHENTICATED', message: 'Sign in to continue.' }, 401, { 'content-type': 'application/json' });

fixture('Frontend error pages and booking recovery').page(baseUrl).requestHooks(anonymousSession);

test('Unknown URL displays 404 with the cinema background and a working recovery link', async t => {
    await t.navigateTo(`${baseUrl}/unknown-page`)
        .expect(Selector('.error-page-code').innerText).eql('404')
        .expect(background()).contains('/images/cinema_stage.jpg')
        .click(primary)
        .expect(pageUrl()).contains('/movie-list');
});

test('4xx and 5xx use their respective backgrounds', async t => {
    await t.navigateTo(`${baseUrl}/error/403`)
        .expect(Selector('.error-page-code').innerText).eql('403')
        .expect(background()).contains('/images/cinema_stage.jpg')
        .navigateTo(`${baseUrl}/error/503`)
        .expect(Selector('.error-page-code').innerText).eql('503')
        .expect(background()).contains('/images/maintenance.png')
        .click(primary)
        .expect(Selector('.error-page-code').innerText).eql('503')
        .click(Selector('.recovery-secondary'))
        .expect(Selector('.error-page').exists).notOk();
});

test('Skipping required booking steps offers movie selection', async t => {
    for (const path of ['movie-showtime', 'seat-selection', 'ticket-checkout']) {
        await t.navigateTo(`${baseUrl}/${path}`)
            .expect(Selector('#booking-recovery-title').innerText).eql('Your movie night starts here')
            .expect(primary.getAttribute('href')).eql('/movie-list')
            .expect(Selector('.booking-recovery-steps [aria-current="step"]').innerText).contains('Choose a movie');
    }
});

test('A valid movie is preserved when recovering a missing showtime', async t => {
    await t.navigateTo(`${baseUrl}/seat-selection?movie=chronicles-of-dust`)
        .expect(Selector('#booking-recovery-title').innerText).eql('First, choose your showtime')
        .expect(Selector('.booking-recovery-movie').innerText).contains('CHRONICLES OF DUST')
        .click(primary)
        .expect(pageUrl()).contains('/movie-showtime?movie=chronicles-of-dust')
        .expect(Selector('.showtime-hero h1').innerText).eql('CHRONICLES OF DUST');
});

test('Invalid checkout seats return to the same screening without retaining bad seats', async t => {
    // Read the date in the browser timezone, matching the demo schedule.
    const date = await ClientFunction(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })();
    const params = `movie=chronicles-of-dust&date=${date}&cinema=0&time=11%3A30`;
    await t.navigateTo(`${baseUrl}/ticket-checkout?${params}&seats=INVALID`)
        .expect(Selector('#booking-recovery-title').innerText).eql('Your perfect seat is waiting')
        .expect(primary.getAttribute('href')).eql(`/seat-selection?${params}`)
        .click(primary)
        .expect(Selector('.seat-selection-seat').exists).ok()
        .expect(Selector('.seat-selection-seat.selected').count).eql(0);
});

test('Unknown movie displays 404; mobile recovery content fits the viewport', async t => {
    await t.navigateTo(`${baseUrl}/movie-showtime?movie=unknown`)
        .expect(Selector('.error-page-code').innerText).eql('404')
        .resizeWindow(375, 812)
        .navigateTo(`${baseUrl}/ticket-checkout`)
        .expect(ClientFunction(() => document.querySelector('.booking-recovery').scrollWidth <= window.innerWidth)()).ok()
        .click(primary)
        .expect(pageUrl()).contains('/movie-list');
});
