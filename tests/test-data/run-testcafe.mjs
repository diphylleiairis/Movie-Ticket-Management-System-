import { prepareTestCafeRuntime } from './testcafe-runtime.mjs';

await prepareTestCafeRuntime();
// Preserve TestCafe's CLI arguments and exit handling.
await import('testcafe/bin/testcafe.js');
