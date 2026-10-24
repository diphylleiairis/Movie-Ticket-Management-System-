# Scripts

Place repeatable setup, test, data-seeding, and maintenance scripts here.

## Send a test email

Requires Node.js 22+ and Resend configuration (`RESEND_API_KEY`,
`IDENTITY_MAIL_FROM`) in the repository-root `.env` or environment. Existing
environment variables take precedence. Run from the repository root:

```powershell
node scripts/test-send-mail.mjs --to "you@example.com" --dry-run
node scripts/test-send-mail.mjs --to "you@example.com"
node scripts/test-send-mail.mjs --to "you@example.com" --from "Support <support@your-domain.com>"
node scripts/test-send-mail.mjs --to "you@example.com" --reply-to "support@your-domain.com"
```

Each invocation without `--dry-run` sends one real test email. `--from` and
`--reply-to` apply only to this script; they do not change backend configuration.
The script calls the [Resend send API](https://resend.com/docs/api-reference/emails/send-email)
directly and requires no backend or database. It supports Resend only and does
not automatically retry. API acceptance is not proof of inbox delivery; inspect
the recipient inbox/spam folder or Resend delivery logs. The sender must use a
verified domain accessible to the API key (the Resend test sender has recipient
restrictions). Credentials are never printed.
