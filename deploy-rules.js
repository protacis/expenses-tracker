// Deploy Realtime Database security rules via the REST API using the
// Firebase Admin service account (no Firebase CLI / login needed).
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const SA_KEY   = path.join(__dirname, 'expenses-558cd-firebase-adminsdk-fbsvc-d59934c14b.json');
const DB_HOST  = 'expenses-558cd-default-rtdb.europe-west1.firebasedatabase.app';
const RULES    = path.join(__dirname, 'database.rules.json');

function b64url(buf) {
  return (Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
    .toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
  }));
  const sig = b64url(crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(sa.private_key));
  const jwt = `${header}.${payload}.${sig}`;

  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        const j = JSON.parse(d);
        if (j.access_token) resolve(j.access_token);
        else reject(new Error(JSON.stringify(j)));
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function putRules(token, rulesText) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: DB_HOST, path: '/.settings/rules.json', method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rulesText),
      },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(d || '{}');
        else reject(new Error(`HTTP ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.write(rulesText); req.end();
  });
}

async function main() {
  const sa = JSON.parse(fs.readFileSync(SA_KEY));
  const rulesText = fs.readFileSync(RULES, 'utf8');
  JSON.parse(rulesText); // validate JSON before sending
  console.log('✓ Rules file valid JSON');
  const token = await getAccessToken(sa);
  console.log('✓ Access token');
  await putRules(token, rulesText);
  console.log('✓ Rules published to', DB_HOST);
  console.log('\n🔒 Database rules updated.');
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
