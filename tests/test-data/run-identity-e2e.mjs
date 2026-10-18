import { spawn, execFileSync } from 'node:child_process';
import { mkdir, open, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import createTestCafe from 'testcafe';
import { startIdentityFixture } from './identity-provider-fixture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = join(root, 'artifacts', 'identity-e2e');
await mkdir(output, { recursive: true });
const processes = [], logs = [];
let closeFixture, cafe;
async function launch(command, args, options, logName) {
  const log = await open(join(output, logName), 'w'); logs.push(log);
  const child = spawn(command, args, { ...options, windowsHide: true, stdio: ['ignore', log.fd, log.fd] });
  child.on('error', error => console.error(error.message)); processes.push(child);
  return child;
}
async function ready(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Test service exited; see ${output}`);
    try { if ((await fetch(url)).ok) return; } catch { /* wait for startup */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Test service did not become ready: ${url}`);
}
try {
  console.log('Preparing isolated browser database and local Identity fixtures...');
  // Separate from identity_tests: backend integration tests may reset that database.
  const psql = ['exec', 'movie-ticket-identity-tests', 'psql', '-U', 'identity_tests'];
  const exists = execFileSync('docker', [...psql, '-d', 'identity_tests', '-tAc', "select 1 from pg_database where datname='identity_browser_tests'"], { encoding: 'utf8', windowsHide: true }).trim();
  if (!exists) execFileSync('docker', [...psql, '-d', 'identity_tests', '-c', 'create database identity_browser_tests'], { windowsHide: true });
  const schema = execFileSync('docker', [...psql, '-d', 'identity_browser_tests', '-tAc', "select 1 from pg_namespace where nspname='movie_app'"], { encoding: 'utf8', windowsHide: true }).trim();
  if (!schema) execFileSync('docker', ['exec', '-i', 'movie-ticket-identity-tests', 'psql', '-U', 'identity_tests', '-d', 'identity_browser_tests', '-v', 'ON_ERROR_STOP=1'], {
    input: await readFile(join(root, 'backend/src/main/resources/db/migration/V1__movie_ticket_schema.sql')), windowsHide: true,
  });
  closeFixture = await startIdentityFixture();
  const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  const backend = await launch(java, ['-Duser.timezone=UTC', '-jar', 'target/demo-0.0.1-SNAPSHOT.jar',
    '--spring.profiles.active=test', '--server.address=127.0.0.1', '--server.port=18080',
    '--identity.frontend-url=http://127.0.0.1:15173', '--identity.mail-from=cinema@example.test',
    '--identity.mail-provider=resend', '--identity.resend-api-key=browser-resend-key',
    '--identity.resend-api-url=http://127.0.0.1:19090',
    '--spring.mail.host=127.0.0.1', '--spring.mail.port=19025', '--spring.mail.properties.mail.smtp.auth=false',
    '--spring.mail.properties.mail.smtp.starttls.enable=false', '--spring.mail.properties.mail.smtp.starttls.required=false',
    '--spring.security.oauth2.client.registration.google.client-id=browser-client',
    '--spring.security.oauth2.client.registration.google.client-secret=browser-secret',
    '--spring.security.oauth2.client.registration.google.scope=openid,profile,email',
    '--spring.security.oauth2.client.registration.google.redirect-uri=http://127.0.0.1:15173/login/oauth2/code/google',
    '--spring.security.oauth2.client.provider.google.authorization-uri=http://127.0.0.1:19090/authorize',
    '--spring.security.oauth2.client.provider.google.token-uri=http://127.0.0.1:19090/token',
    '--spring.security.oauth2.client.provider.google.jwk-set-uri=http://127.0.0.1:19090/jwks',
    '--spring.security.oauth2.client.provider.google.user-info-uri=http://127.0.0.1:19090/userinfo'], {
      cwd: join(root, 'backend'), env: { ...process.env,
        TEST_DB_URL: 'jdbc:postgresql://127.0.0.1:15432/identity_browser_tests', TEST_DB_USER: 'identity_tests', TEST_DB_PASSWORD: 'identity_tests_local_only' },
    }, 'backend.log');
  await ready('http://127.0.0.1:18080/api/v1/health', backend);
  console.log('Identity backend is ready. Starting Vite...');
  const vitePath = fileURLToPath(new URL('../../bin/vite.js', import.meta.resolve('vite')));
  const frontend = await launch(process.execPath, [vitePath, '--host', '127.0.0.1', '--port', '15173', '--strictPort'], {
    cwd: join(root, 'frontend'), env: { ...process.env, BACKEND_PROXY_URL: 'http://127.0.0.1:18080',
      VITE_IDENTITY_API_URL: '', VITE_GOOGLE_AUTH_URL: '/oauth2/authorization/google' },
  }, 'frontend.log');
  await ready('http://127.0.0.1:15173/', frontend);
  console.log('Frontend is ready. Starting TestCafe...');
  cafe = await createTestCafe('127.0.0.1', 19095, 19096);
  console.log('TestCafe is ready. Connecting headless browser...');
  const failures = await cafe.createRunner().src(join(root, 'tests/e2e/testcafe/identity.test.js'))
    .browsers(process.env.IDENTITY_TEST_BROWSER || 'chrome:headless').reporter('spec')
    .screenshots({ path: output, takeOnFails: true }).run({ disableNativeAutomation: true, browserInitTimeout: 30000 });
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(error); process.exitCode = 1;
} finally {
  if (cafe) await cafe.close();
  for (const child of processes.reverse()) child.kill();
  if (closeFixture) closeFixture();
  for (const log of logs) await log.close();
}
