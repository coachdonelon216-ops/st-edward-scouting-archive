const crypto=require('node:crypto');
const {S3Client,GetObjectCommand,PutObjectCommand}=require('@aws-sdk/client-s3');
const keyOk=k=>typeof k==='string'&&/^games\/[a-f0-9-]{36}\.mp4$/.test(k);
const valid=()=>['R2_ACCOUNT_ID','R2_BUCKET_NAME','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','FILM_ACCESS_KEY'].every(k=>process.env[k]);
function auth(req){const a=Buffer.from(process.env.FILM_ACCESS_KEY||''),b=Buffer.from(String(req.headers['x-film-key']||''));return a.length>=16&&a.length===b.length&&crypto.timingSafeEqual(a,b)}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))}
function s3(){const id=process.env.R2_ACCOUNT_ID.trim();if(!/^[a-f0-9]{32}$/i.test(id))throw Error('Invalid R2 Account ID');return new S3Client({region:'auto',endpoint:'https://'+id+'.r2.cloudflarestorage.com',credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID.trim(),secretAccessKey:process.env.R2_SECRET_ACCESS_KEY.trim()}})}
async function readBody(req){let data='';for await(const part of req){data+=part;if(data.length>1500000)throw Error('Request too large')}return JSON.parse(data||'{}')}
async function handle(req,res,p,sameOrigin){
if(!p.startsWith('/api/scout/'))return false;
if(!valid())return send(res,503,{error:'Film library is not configured'}),true;
if(!auth(req))return send(res,401,{error:'Invalid film access key'}),true;
if(!sameOrigin(req))return send(res,403,{error:'Invalid origin'}),true;
try{
const client=s3(),Bucket=process.env.R2_BUCKET_NAME;
if(p==='/api/scout/full-game'&&req.method==='GET'){
 const film=new URL(req.url,'http://localhost').searchParams.get('film');
 if(!keyOk(film))return send(res,400,{error:'Invalid film'}),true;
 try{const out=await client.send(new GetObjectCommand({Bucket,Key:'analysis/full-'+film.slice(6,-4)+'.json'}));return send(res,200,JSON.parse(await out.Body.transformToString())),true}
 catch(e){if(e.name==='NoSuchKey'||e.name==='NotFound'||e.$metadata?.httpStatusCode===404)return send(res,200,{film,windows:[],completed:false}),true;throw e}
}
if(p==='/api/scout/full-game'&&req.method==='PUT'){
 const d=await readBody(req);
 if(!keyOk(d.film)||!Array.isArray(d.windows)||d.windows.length>240||d.windows.some(w=>!Number.isFinite(w.start)||w.start<0||w.start>20000||typeof w.analysis!=='string'||w.analysis.length>6000))return send(res,400,{error:'Invalid full-game analysis'}),true;
 const payload={film:d.film,windows:d.windows.map(w=>({start:w.start,analysis:w.analysis})),completed:Boolean(d.completed),updatedAt:new Date().toISOString()};
 await client.send(new PutObjectCommand({Bucket,Key:'analysis/full-'+d.film.slice(6,-4)+'.json',Body:JSON.stringify(payload),ContentType:'application/json'}));
 return send(res,200,{saved:true,count:payload.windows.length}),true;
}
if(p==='/api/scout/tags'&&req.method==='GET'){
 const film=new URL(req.url,'http://localhost').searchParams.get('film');
 if(!keyOk(film))return send(res,400,{error:'Invalid film'}),true;
 try{const out=await client.send(new GetObjectCommand({Bucket,Key:'analysis/'+film.slice(6,-4)+'.json'}));const value=JSON.parse(await out.Body.transformToString());return send(res,200,value),true}
 catch(e){if(e.name==='NoSuchKey'||e.name==='NotFound'||e.$metadata?.httpStatusCode===404)return send(res,200,{film,tags:[],notes:''}),true;throw e}
}
if(p==='/api/scout/tags'&&req.method==='PUT'){
 const d=await readBody(req);
 if(!keyOk(d.film)||!Array.isArray(d.tags)||d.tags.length>2000||typeof d.notes!=='string'||d.notes.length>12000)return send(res,400,{error:'Invalid scouting data'}),true;
 const actions=['Ball screen','Pick and roll','Pick and pop','Horns','5-out','Motion','Post-up','Isolation','Transition','ATO','Zone offense','Other'];
 const outcomes=['Score','Miss','Turnover','Foul','Other'];
 const tags=d.tags.map(t=>({id:String(t.id||'').slice(0,80),time:Number(t.time),action:String(t.action||''),outcome:String(t.outcome||''),detail:String(t.detail||'').slice(0,500)}));
 if(tags.some(t=>!Number.isFinite(t.time)||t.time<0||t.time>86400||!actions.includes(t.action)||!outcomes.includes(t.outcome)))return send(res,400,{error:'Invalid tag values'}),true;
 const payload={film:d.film,tags,notes:d.notes,updatedAt:new Date().toISOString()};
 await client.send(new PutObjectCommand({Bucket,Key:'analysis/'+d.film.slice(6,-4)+'.json',Body:JSON.stringify(payload),ContentType:'application/json'}));
 return send(res,200,{saved:true,updatedAt:payload.updatedAt}),true;
}
return send(res,405,{error:'Method not allowed'}),true;
}catch(e){return send(res,502,{error:'Scouting storage error: '+e.message}),true}
}
module.exports={handle};
