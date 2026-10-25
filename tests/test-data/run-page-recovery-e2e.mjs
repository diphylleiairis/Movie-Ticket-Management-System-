import { fileURLToPath } from 'node:url';
import { prepareTestCafeRuntime } from './testcafe-runtime.mjs';

await prepareTestCafeRuntime();
const { createServer } = await import('vite');
const { default: createTestCafe } = await import('testcafe');
let frontend, cafe;
let failed = true;
try {
  frontend = await createServer({
    root: fileURLToPath(new URL('../../frontend/', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
    logLevel: 'error',
  });
  await frontend.listen();
  process.env.FRONTEND_URL = `http://127.0.0.1:${frontend.httpServer.address().port}`;
  console.log(`Page-recovery frontend ready at ${process.env.FRONTEND_URL}`);
  cafe = await createTestCafe({ hostname: '127.0.0.1' });
  const failures = await cafe.createRunner()
    .src((process.env.PAGE_TEST_SUITES?.split(',') || ['page-recovery', 'account', 'account-session', 'admin-dashboard', 'admin-movies']).map(name => fileURLToPath(new URL(`../e2e/testcafe/${name}.test.js`, import.meta.url))))
    .filter(testName => !process.env.PAGE_TEST_NAME || testName.includes(process.env.PAGE_TEST_NAME))
    .browsers(process.env.PAGE_TEST_BROWSER || 'chrome:headless').reporter('spec')
    .screenshots({
      path: fileURLToPath(new URL('../../artifacts/page-recovery-e2e/', import.meta.url)),
      takeOnFails: true,
    })
    .run({ disableNativeAutomation: true, browserInitTimeout: 30000 });
  failed = failures > 0;
} catch (error) {
  console.error(error.message);
} finally {
  try {
    if (cafe) await cafe.close();
  } finally {
    if (frontend) await frontend.close();
  }
}
process.exitCode = failed ? 1 : 0;
