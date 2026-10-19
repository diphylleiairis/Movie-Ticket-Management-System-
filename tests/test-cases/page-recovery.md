# Frontend page recovery

Requirements: customer booking flow, BKG-01, BKG-02, PAY-01; requested 4xx/5xx presentation.
Preconditions: frontend running with bundled demo catalog; no backend or payment credentials required.
The browser fixture mocks only `GET /api/v1/identity/me` as an unauthenticated
401 response. Page rendering, navigation, images and recovery assertions use the
real frontend; authenticated session behavior is tested in the Identity suite.

| ID | Steps / input | Expected result |
|---|---|---|
| UI-ERR-01 | Open an unknown page URL; click Explore movies | 404 uses cinema_stage.jpg; catalog opens |
| UI-ERR-02 | Open /error/403 and /error/503; use Try again and Back to home | Status-specific copy; cinema background for 4xx, maintenance background for 5xx; actions work |
| BKG-NAV-01 | Open showtimes, seats or checkout without query parameters | Styled recovery card directs to movie selection; no booking, hold or payment is created |
| BKG-NAV-02 | Open seats with a valid movie but no valid screening; follow recovery link | Movie is retained and its showtimes open |
| PAY-NAV-01 | Open checkout with a valid screening and invalid seats; follow recovery link | Same screening opens for seat selection; invalid seats are removed |
| CAT-NAV-01 | Open showtimes with an unknown movie | 404 screen appears |
| UI-NAV-01 | Open booking recovery at 375px width | Content fits; required-step action remains accessible |

Automation: `tests/e2e/testcafe/page-recovery.test.js`.
Run `npm.cmd run test:e2e:pages` from the repository root. The runner starts and
stops an isolated local Vite server automatically and supplies its URL to the tests.
For an already running frontend, use `node tests/test-data/run-testcafe.mjs chrome:headless tests/e2e/testcafe/page-recovery.test.js --hostname 127.0.0.1 --disable-native-automation`.
Only that manual mode uses `FRONTEND_URL` to override the default `http://127.0.0.1:5173`.
