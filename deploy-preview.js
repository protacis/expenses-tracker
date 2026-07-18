// Deploy the current files to a Firebase Hosting PREVIEW CHANNEL (separate
// temporary URL) using the admin service account. Does NOT touch the live site.
// Usage: node deploy-preview.js [channelId]   (default channelId: "redesign")
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const zlib   = require('zlib');

const SA_KEY  = path.join(__dirname, 'expenses-558cd-firebase-adminsdk-fbsvc-d59934c14b.json');
const SITE    = 'expenses-558cd';
const FILES   = ['expenses.html', 'version.json', 'manifest.json', 'icon.svg', 'sw.js'];
const CHANNEL = process.argv[2] || 'redesign';
const TTL     = '604800s'; // 7 days

function b64url(buf){return (Buffer.isBuffer(buf)?buf:Buffer.from(buf)).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}

async function getAccessToken(sa){
  const now=Math.floor(Date.now()/1000);
  const header=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const payload=b64url(JSON.stringify({iss:sa.client_email,sub:sa.client_email,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600,scope:'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform'}));
  const sig=b64url(crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(sa.private_key));
  const jwt=`${header}.${payload}.${sig}`;
  return new Promise((resolve,reject)=>{
    const body=`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req=https.request({hostname:'oauth2.googleapis.com',path:'/token',method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':body.length}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{const j=JSON.parse(d);j.access_token?resolve(j.access_token):reject(new Error(d));});});
    req.on('error',reject);req.write(body);req.end();
  });
}

function api(method,hostPath,token,body){
  const [hostname,...rest]=hostPath.replace('https://','').split('/');
  const reqPath='/'+rest.join('/');
  return new Promise((resolve,reject)=>{
    const bodyStr=body?JSON.stringify(body):null;
    const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
    if(bodyStr)headers['Content-Length']=Buffer.byteLength(bodyStr);
    const req=https.request({hostname,path:reqPath,method,headers},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{let j;try{j=JSON.parse(d);}catch{j=d;} resolve({status:res.statusCode,body:j});});});
    req.on('error',reject);if(bodyStr)req.write(bodyStr);req.end();
  });
}

function uploadFile(uploadUrl,token,buf){
  return new Promise((resolve,reject)=>{
    const u=new URL(uploadUrl);
    const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/octet-stream','Content-Length':buf.length}},res=>{res.resume();res.on('end',resolve);});
    req.on('error',reject);req.write(buf);req.end();
  });
}

async function main(){
  const sa=JSON.parse(fs.readFileSync(SA_KEY));
  const token=await getAccessToken(sa);
  console.log('✓ Access token');
  const base='https://firebasehosting.googleapis.com/v1beta1';

  // Ensure the channel exists (create; ignore "already exists")
  let ch=await api('POST',`${base}/sites/${SITE}/channels?channelId=${CHANNEL}`,token,{ttl:TTL});
  if(ch.status===409){ ch=await api('GET',`${base}/sites/${SITE}/channels/${CHANNEL}`,token); }
  if(!ch.body||!ch.body.url) throw new Error('Channel error: '+JSON.stringify(ch.body));
  console.log('✓ Channel:', CHANNEL);

  // Hash files
  const fileMap={},fileData={};
  for(const f of FILES){const gz=zlib.gzipSync(fs.readFileSync(path.join(__dirname,f)));const hash=crypto.createHash('sha256').update(gz).digest('hex');fileMap['/'+f]=hash;fileData[hash]=gz;}
  console.log('✓ Hashed',Object.keys(fileMap).length,'file(s)');

  // Create version
  const ver=await api('POST',`${base}/sites/${SITE}/versions`,token,{config:{rewrites:[{glob:'/',path:'/expenses.html'}],headers:[{glob:'/expenses.html',headers:{'Cache-Control':'no-cache, no-store, must-revalidate'}},{glob:'/version.json',headers:{'Cache-Control':'no-cache, no-store, must-revalidate'}},{glob:'/sw.js',headers:{'Cache-Control':'no-cache'}}]}});
  if(!ver.body||!ver.body.name) throw new Error('Create version failed: '+JSON.stringify(ver.body));
  const versionName=ver.body.name;
  console.log('✓ Version:', versionName.split('/').pop());

  // Populate + upload
  const pop=await api('POST',`${base}/${versionName}:populateFiles`,token,{files:fileMap});
  const required=pop.body.uploadRequiredHashes||[];
  console.log('✓ Need to upload:',required.length,'file(s)');
  for(const hash of required){await uploadFile(pop.body.uploadUrl+'/'+hash,token,fileData[hash]);console.log('  ↑',hash.slice(0,8)+'...');}

  // Finalize
  const fin=await api('PATCH',`${base}/${versionName}?update_mask=status`,token,{status:'FINALIZED'});
  console.log('✓ Finalized:', fin.body.status);

  // Release to the channel
  const rel=await api('POST',`${base}/sites/${SITE}/channels/${CHANNEL}/releases?versionName=${versionName}`,token,{});
  if(rel.status>=300) throw new Error('Release failed: '+JSON.stringify(rel.body));
  console.log('✓ Released to channel');

  console.log('\n🔗 Preview URL (expires in 7 days):\n   '+ch.body.url);
  console.log('\n   Live app is untouched.');
}

main().catch(e=>{console.error('\n✗',e.message);process.exit(1);});
