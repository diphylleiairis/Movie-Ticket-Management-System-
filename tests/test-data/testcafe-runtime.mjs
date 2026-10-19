import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let preparation;

// Call before importing TestCafe: it captures os.tmpdir() during module loading.
export function prepareTestCafeRuntime() {
  preparation ??= (async () => {
    const root = fileURLToPath(new URL('../../artifacts/testcafe-runtime/', import.meta.url));
    await mkdir(root, { recursive: true });
    const directory = await mkdtemp(join(root, 'run-'));
    // TestCafe reuses unlocked profile directories. A Chrome process left by an
    // interrupted run can still own that profile and swallow a later launch.
    // Give each invocation its own root without touching other browser processes.
    process.env.TEMP = directory;
    process.env.TMP = directory;
    process.env.TMPDIR = directory;
    return directory;
  })();
  return preparation;
}
