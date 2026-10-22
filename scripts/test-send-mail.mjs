import { readFileSync } from 'node:fs';
import { parseArgs, parseEnv } from 'node:util';

const usage = `Send one test email using the published Resend password-reset template (Node.js 22+).

  node scripts/test-send-mail.mjs --to you@example.com
  node scripts/test-send-mail.mjs --to you@example.com --from "Support <support@example.com>"
  node scripts/test-send-mail.mjs --to you@example.com --user-name "Nguyen An" --reset-url "https://example.com/reset-password#token=test-only"

Options:
  --to <email>       Required recipient
  --from <sender>    Override IDENTITY_MAIL_FROM for this invocation
  --reply-to <email> Optional reply address for this test email
  --subject <text>  Override the test subject
  --user-name <name> USER_NAME template variable (default: Test Customer)
  --reset-url <url>  RESET_URL template variable (default: FRONTEND_URL + a test-only reset link)
  --dry-run         Validate configuration without sending or showing the API key
  --help            Show usage

Reads repository-root .env; existing environment variables take precedence.
Uses RESEND_API_KEY and IDENTITY_MAIL_FROM. No backend/database is required.
The default link contains a dummy token and cannot reset a real password.`;

async function main() {
  const { values } = parseArgs({ options: {
    to: { type: 'string' }, from: { type: 'string' },
    'reply-to': { type: 'string' }, subject: { type: 'string' },
    'user-name': { type: 'string' }, 'reset-url': { type: 'string' },
    'dry-run': { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help) { console.log(usage); return; }

  let fileEnv = {};
  try { fileEnv = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Unable to read repository-root .env.'); }
  const config = { ...fileEnv, ...process.env };
  if ((config.IDENTITY_MAIL_PROVIDER || 'resend') !== 'resend')
    throw new Error('This script supports Resend only. Current IDENTITY_MAIL_PROVIDER is not resend.');

  const to = values.to?.trim();
  const from = (values.from ?? config.IDENTITY_MAIL_FROM)?.trim();
  const key = config.RESEND_API_KEY?.trim();
  const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
  if (!to || !emailPattern.test(to)) throw new Error('Supply a valid recipient using --to you@example.com.');
  const fromAddress = from?.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (!fromAddress || !emailPattern.test(fromAddress) || /[\r\n]/.test(from))
    throw new Error('Set a valid IDENTITY_MAIL_FROM or supply --from "Name <sender@example.com>".');
  if (values['reply-to'] && !emailPattern.test(values['reply-to']))
    throw new Error('Supply a valid --reply-to email address.');
  if (!key) throw new Error('Set RESEND_API_KEY in .env or the environment.');

  const userName = (values['user-name'] ?? 'Test Customer').trim();
  if (!userName) throw new Error('Supply a nonempty --user-name.');
  let resetUrl;
  try {
    resetUrl = values['reset-url'] !== undefined
      ? new URL(values['reset-url'])
      : new URL('/reset-password#token=test-only-not-valid', config.FRONTEND_URL || 'http://localhost:5173');
    if (!['https:', 'http:'].includes(resetUrl.protocol) || resetUrl.username || resetUrl.password)
      throw new Error();
  } catch {
    throw new Error('Supply a valid HTTP(S) --reset-url or FRONTEND_URL.');
  }

  const message = {
    from, to: [to], subject: values.subject ?? 'Reset your movie ticket password',
    template: { id: 'password-reset', variables: { RESET_URL: resetUrl.href, USER_NAME: userName } },
    ...(values['reply-to'] ? { reply_to: values['reply-to'] } : {}),
  };
  if (values['dry-run']) {
    console.log('Configuration valid. No email sent.');
    console.log(JSON.stringify(message, null, 2));
    return;
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch {
    throw new Error('Network error or timeout. Check Resend logs before retrying; delivery status may be unknown.');
  }
  if (!response.ok)
    throw new Error(`Resend rejected the request (HTTP ${response.status}). Check API key permissions, verified sender domain, recipient restrictions and the published password-reset template with RESET_URL/USER_NAME in Resend.`);
  const result = await response.json();
  if (typeof result.id !== 'string' || !result.id)
    throw new Error('Unexpected Resend response. Check Resend logs before retrying.');
  console.log(`Resend accepted the email. ID: ${result.id}`);
  console.log('Check the recipient inbox/spam folder and Resend delivery logs.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
