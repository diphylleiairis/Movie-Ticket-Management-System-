import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { prepareTestCafeRuntime } from './testcafe-runtime.mjs';

await prepareTestCafeRuntime();
const { default: createTestCafe } = await import('testcafe');
const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><h1>Browser connection OK</h1>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
process.env.BROWSER_SMOKE_URL = `http://127.0.0.1:${server.address().port}`;
let cafe;
let failed = true;
try {
  cafe = await createTestCafe({ hostname: '127.0.0.1' });
  const failures = await cafe.createRunner()
    .src(fileURLToPath(new URL('../e2e/browser-startup/connection.test.js', import.meta.url)))
    .browsers(process.env.IDENTITY_TEST_BROWSER || 'chrome:headless').reporter('spec')
    .run({ disableNativeAutomation: true, browserInitTimeout: 30000 });
  failed = failures > 0;
} catch (error) {
  console.error(error.message);
} finally {
  if (cafe) await cafe.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
process.exitCode = failed ? 1 : 0;
