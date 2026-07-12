const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const zlib   = require('zlib');

const SA_KEY  = path.join(__dirname, 'expenses-558cd-firebase-adminsdk-fbsvc-d59934c14b.json');
const SITE    = 'expenses-558cd';
const FILES   = ['expenses.html', 'version.json', 'manifest.json', 'icon.svg', 'sw.js'];

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
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
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

function api(method, hostPath, token, body) {
  const [hostname, ...rest] = hostPath.replace('https://','').split('/');
  const reqPath = '/' + rest.join('/');
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = https.request({ hostname, path: reqPath, method, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function uploadFile(uploadUrl, token, buf) {
  return new Promise((resolve, reject) => {
    const u = new URL(uploadUrl);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'Content-Length': buf.length },
    }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', reject);
    req.write(buf); req.end();
  });
}

async function main() {
  const sa = JSON.parse(fs.readFileSync(SA_KEY));
  const token = await getAccessToken(sa);
  console.log('✓ Access token');

  // Hash files
  const fileMap = {}, fileData = {};
  for (const f of FILES) {
    const gz   = zlib.gzipSync(fs.readFileSync(path.join(__dirname, f)));
    const hash = crypto.createHash('sha256').update(gz).digest('hex');
    fileMap['/' + f] = hash;
    fileData[hash]   = gz;
  }
  console.log('✓ Hashed', Object.keys(fileMap).length, 'file(s)');

  const base = 'https://firebasehosting.googleapis.com/v1beta1';

  // Create version
  // Only rewrite the root path to expenses.html — a catch-all ('**') would also
  // intercept requests for version.json/manifest.json/icon.svg/sw.js and serve
  // the HTML page instead of their real content, silently breaking the PWA
  // manifest, icon and the version.json-based auto-update check.
  const ver = await api('POST', `${base}/sites/${SITE}/versions`, token, {
    config: {
      rewrites: [{ glob: '/', path: '/expenses.html' }],
      headers: [
        { glob: '/expenses.html', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
        { glob: '/version.json', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
        { glob: '/sw.js', headers: { 'Cache-Control': 'no-cache' } },
      ],
    },
  });
  if (!ver.name) throw new Error('Create version failed: ' + JSON.stringify(ver));
  console.log('✓ Version:', ver.name.split('/').pop());

  // Populate
  const pop = await api('POST', `${base}/${ver.name}:populateFiles`, token, { files: fileMap });
  const required = pop.uploadRequiredHashes || [];
  console.log('✓ Need to upload:', required.length, 'file(s)');

  // Upload
  for (const hash of required) {
    await uploadFile(pop.uploadUrl + '/' + hash, token, fileData[hash]);
    console.log('  ↑ Uploaded', hash.slice(0,8) + '...');
  }

  // Finalize
  const fin = await api('PATCH', `${base}/${ver.name}?update_mask=status`, token, { status: 'FINALIZED' });
  console.log('✓ Finalized:', fin.status);

  // Release
  const rel = await api('POST', `${base}/sites/${SITE}/releases?versionName=${ver.name}`, token, {});
  console.log('✓ Released:', rel.releaseTime || JSON.stringify(rel).slice(0,80));

  console.log('\n🚀 Live at: https://' + SITE + '.web.app');
  console.log('            https://' + SITE + '.firebaseapp.com');
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1); });
