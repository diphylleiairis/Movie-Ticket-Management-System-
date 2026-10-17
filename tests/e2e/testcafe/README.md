# TestCafe E2E tests

Store browser-level workflows here. Keep setup data in `tests/test-data/` and generated screenshots, videos, and reports in the ignored `artifacts/` directory.

TestCafe is declared in this directory's `package.json` and installed by `npm install` from the repository root. Browser scenarios will be added as product workflows are implemented.

Identity browser workflows run against the real backend and local OIDC/SMTP fixtures
with `node tests/test-data/run-identity-e2e.mjs` from the repository root. Follow
[Identity setup](../../../docs/design/identity.md) to prepare its isolated Docker
PostgreSQL container and backend JAR. Google credentials and external email are not used.
