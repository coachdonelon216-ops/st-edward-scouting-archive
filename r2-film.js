const crypto=require('node:crypto');
const {S3Client,ListObjectsV2Command,PutObjectCommand,GetObjectCommand,HeadObjectCommand}=require('@aws-sdk/client-s3');
const {getSignedUrl}=require('@aws-sdk/s3-request-presigner');
const MAX=5*1024*1024*1024;
const configured=()=>['R2_ACCOUNT_ID','R2_BUCKET_NAME','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','FILM_ACCESS_KEY'].every(k=>Boolean(process.env[k]));
function config(){
 const raw=String(process.env.R2_ACCOUNT_ID||'').trim();
 let id=raw;
 if(raw.startsWith('https://')||raw.startsWith('http://')){
   try{const u=new URL(raw);const match=u.hostname.match(/^([a-f0-9]{32})\.r2\.cloudflarestorage\.com$/i);if(!match||u.pathname!=='/'&&u.pathname!=='')throw Error();id=match[1]}catch{throw Object.assign(new Error('R2_ACCOUNT_ID must be your 32-character Cloudflare Account ID, not a URL or API token.'),{code:'R2_CONFIG'})}
 }else{id=raw.replace(/\.r2\.cloudflarestorage\.com\/?$/i,'')}
 if(!/^[a-f0-9]{32}$/i.test(id))throw Object.assign(new Error('R2_ACCOUNT_ID is invalid. Copy the 32-character Account ID from Cloudflare R2 Overview.'),{code:'R2_CONFIG'});
 const bucket=String(process.env.R2_BUCKET_NAME||'').trim();
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))throw Object.assign(new Error('R2_BUCKET_NAME must be the bucket name only (st-edward-basketball-film).'),{code:'R2_CONFIG'});
 return {id,bucket};
}
const client=()=>{const {id}=config();return new S3Client({region:'auto',endpoint:'https://'+id+'.r2.cloudflarestorage.com',credentials:{accessKeyId:String(process.env.R2_ACCESS_KEY_ID||'').trim(),secretAccessKey:String(process.env.R2_SECRET_ACCESS_KEY||'').trim()}})};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
const auth=req=>{const expected=process.env.FILM_ACCESS_KEY||'';const supplied=String(req.headers['x-film-key']||'');const a=Buffer.from(expected),b=Buffer.from(supplied);return expected.length>=16&&a.length===b.length&&crypto.timingSafeEqual(a,b)};
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>8192)throw Error('Request too large')}return JSON.parse(s||'{}')}
const validKey=k=>typeof k==='string'&&/^games\/[a-f0-9-]{36}\.mp4$/.test(k);
async function handle(req,res,p,sameOrigin){
if(!p.startsWith('/api/film/'))return false;
if(!configured())return send(res,503,{error:'Film library not configured. Set R2 credentials and FILM_ACCESS_KEY in Render.'}),true;
if(!auth(req))return send(res,401,{error:'Invalid film library access key'}),true;
if(!sameOrigin(req))return send(res,403,{error:'Invalid origin'}),true;
try{
const s3=client(),Bucket=config().bucket;
if(p==='/api/film/list'&&req.method==='GET'){
const result=await s3.send(new ListObjectsV2Command({Bucket,Prefix:'games/',MaxKeys:1000}));
return send(res,200,{items:(result.Contents||[]).map(x=>({key:x.Key,size:x.Size,updated:x.LastModified})).filter(x=>validKey(x.key))}),true;
}
if(p==='/api/film/upload-url'&&req.method==='POST'){
const data=await body(req);if(typeof data.name!=='string'||!data.name.toLowerCase().endsWith('.mp4')||!Number.isSafeInteger(data.size)||data.size<1||data.size>MAX)return send(res,400,{error:'Choose an MP4 file up to 5 GB'}),true;
const key='games/'+crypto.randomUUID()+'.mp4';
const cmd=new PutObjectCommand({Bucket,Key:key,ContentType:'video/mp4',Metadata:{originalname:data.name.slice(0,140).replace(/[^\w. ()-]/g,'_'),team:String(data.team||'').slice(0,70).replace(/[^\w .-]/g,'_'),date:String(data.date||'').slice(0,10),category:data.category==='self'?'self':'opponent'}});
const url=await getSignedUrl(s3,cmd,{expiresIn:900});
return send(res,200,{key,url,headers:{'Content-Type':'video/mp4'}}),true;
}
if(p==='/api/film/play-url'&&req.method==='POST'){
const data=await body(req);if(!validKey(data.key))return send(res,400,{error:'Invalid film key'}),true;
await s3.send(new HeadObjectCommand({Bucket,Key:data.key}));
const url=await getSignedUrl(s3,new GetObjectCommand({Bucket,Key:data.key}),{expiresIn:3600});
return send(res,200,{url}),true;
}
return send(res,405,{error:'Method not allowed'}),true;
}catch(e){return send(res,e.code==='R2_CONFIG'?503:502,{error:e.code==='R2_CONFIG'?e.message:'Film storage request failed: '+(e.name==='NotFound'?'File not found':e.message==='Invalid URL'?'Check R2_ACCOUNT_ID in Render: enter only the Cloudflare account ID, not an endpoint URL.':e.message)}),true}
}
module.exports={handle};
