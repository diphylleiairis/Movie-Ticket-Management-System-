// Loopback-only test doubles. Never deploy this server or use real Google credentials.
import { createServer } from 'node:http';
import { createServer as createSmtp } from 'node:net';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';

export async function startIdentityFixture() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'browser-tests', alg: 'RS256', use: 'sig' };
  const grants = new Map();
  const access = new Map();
  const inbox = new Map();
  const resetLinks = new Map();
  const html = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const json = (res, value) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:19090');
      if (url.pathname === '/jwks') return json(res, { keys: [jwk] });
      if (url.pathname === '/mail') return json(res, { code: inbox.get(url.searchParams.get('email')) || null,
        resetLink: resetLinks.get(url.searchParams.get('email')) || null });
      if (url.pathname === '/emails' && req.method === 'POST') {
        if (req.headers.authorization !== 'Bearer browser-resend-key') { res.writeHead(401); return res.end(); }
        let body = ''; for await (const chunk of req) body += chunk;
        const message = JSON.parse(body);
        if (message.from !== 'cinema@example.test' || !Array.isArray(message.to)
          || !message.to.every(email => /^[a-z0-9.-]+@example\.test$/.test(email))) {
          res.writeHead(422); return res.end();
        }
        const code = message.text?.match(/verification code is ([0-9]{6})/i)?.[1];
        if (code) for (const email of message.to) inbox.set(email, code);
        const resetLink = message.text?.match(/http:\/\/127\.0\.0\.1:15173\/reset-password#token=[A-Za-z0-9_-]+/)?.[0];
        if (resetLink) for (const email of message.to) resetLinks.set(email, resetLink);
        return json(res, { id: randomUUID() });
      }
      if (url.pathname === '/authorize') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`<h1>Test Google identity</h1><form action="/approve">
          ${['state', 'nonce', 'redirect_uri'].map(key => `<input type="hidden" name="${key}" value="${html(url.searchParams.get(key))}">`).join('')}
          <label>Email <input id="fixture-email" name="email" value="google-fixture@example.test"></label>
          <label><input id="fixture-verified" name="verified" type="checkbox" checked>Verified</label>
          <button id="fixture-approve">Continue</button></form>`);
      }
      if (url.pathname === '/approve') {
        const callback = url.searchParams.get('redirect_uri');
        const email = url.searchParams.get('email');
        if (callback !== 'http://127.0.0.1:15173/login/oauth2/code/google' || !/^[a-z0-9.-]+@example\.test$/.test(email || '')) {
          res.writeHead(400); return res.end('Only isolated test identities and callback are allowed.');
        }
        const code = randomUUID();
        grants.set(code, { email, sub: `test:${email}`, nonce: url.searchParams.get('nonce'), verified: url.searchParams.get('verified') === 'on', callback });
        const destination = new URL(callback);
        destination.searchParams.set('state', url.searchParams.get('state'));
        destination.searchParams.set('code', code);
        res.writeHead(302, { Location: destination.href }); return res.end();
      }
      if (url.pathname === '/token') {
        let body = ''; for await (const chunk of req) body += chunk;
        const params = new URLSearchParams(body);
        const grant = grants.get(params.get('code')); grants.delete(params.get('code'));
        if (!grant || params.get('redirect_uri') !== grant.callback) { res.writeHead(400); return res.end(); }
        const seconds = Math.floor(Date.now() / 1000);
        const claims = { iss: 'https://accounts.google.com', aud: 'browser-client', sub: grant.sub,
          iat: seconds, exp: seconds + 300, nonce: grant.nonce, email: grant.email, email_verified: grant.verified, name: 'Google Customer' };
        const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
        const unsigned = `${encode({ alg: 'RS256', kid: 'browser-tests' })}.${encode(claims)}`;
        const token = `${unsigned}.${sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')}`;
        const accessToken = randomUUID(); access.set(accessToken, claims);
        return json(res, { access_token: accessToken, token_type: 'Bearer', expires_in: 300, scope: 'openid profile email', id_token: token });
      }
      if (url.pathname === '/userinfo') {
        const claims = access.get(req.headers.authorization?.replace('Bearer ', ''));
        if (!claims) { res.writeHead(401); return res.end(); }
        return json(res, claims);
      }
      res.writeHead(404); res.end();
    } catch { res.writeHead(500); res.end('Test fixture failed.'); }
  });
  const smtp = createSmtp(socket => {
    socket.setEncoding('utf8'); socket.write('220 localhost test SMTP\r\n');
    let buffer = '', data = null, recipient = '';
    socket.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 100000) return socket.destroy();
      let index;
      while ((index = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (data !== null) {
          if (line === '.') {
            const code = data.match(/verification code is ([0-9]{6})/i)?.[1];
            if (code) inbox.set(recipient, code);
            data = null; socket.write('250 Accepted\r\n');
          } else data += line + '\n';
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250-localhost\r\n250 SIZE 100000\r\n');
        else if (/^RCPT TO:/i.test(line)) { recipient = line.match(/<([^>]+)>/)?.[1] || ''; socket.write('250 OK\r\n'); }
        else if (/^DATA$/i.test(line)) { data = ''; socket.write('354 End with dot\r\n'); }
        else if (/^QUIT$/i.test(line)) socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
    socket.on('error', () => {});
  });
  await new Promise(resolve => server.listen(19090, '127.0.0.1', resolve));
  await new Promise(resolve => smtp.listen(19025, '127.0.0.1', resolve));
  return () => { server.closeAllConnections(); server.close(); smtp.close(); };
}
