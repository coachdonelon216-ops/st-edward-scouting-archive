const crypto=require('node:crypto');
const hits=new Map();
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
function auth(req){const a=Buffer.from(process.env.FILM_ACCESS_KEY||''),b=Buffer.from(String(req.headers['x-film-key']||''));return a.length>=16&&a.length===b.length&&crypto.timingSafeEqual(a,b)}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>7200000)throw Error('Frames exceed size limit')}return JSON.parse(s)}
async function handle(req,res,p,sameOrigin){
if(p!=='/api/ai/analyze')return false;
if(req.method!=='POST')return send(res,405,{error:'POST required'}),true;
if(!auth(req)||!sameOrigin(req))return send(res,403,{error:'Unauthorized'}),true;
if(!process.env.OPENAI_API_KEY)return send(res,503,{error:'AI not configured. Add OPENAI_API_KEY to Render Environment. API usage is billed separately.'}),true;
const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0];
const now=Date.now(),entry=hits.get(ip)||{start:now,count:0};if(now-entry.start>86400000){entry.start=now;entry.count=0}entry.count++;hits.set(ip,entry);if(hits.size>2000)for(const [k,v] of hits)if(now-v.start>3600000)hits.delete(k);
if(entry.count>220)return send(res,429,{error:'AI analysis limit reached (220 per day).'}),true;
try{
const d=await body(req);
if(!Array.isArray(d.frames)||d.frames.length<2||d.frames.length>8||d.frames.some(f=>typeof f!=='string'||f.length>850000||!/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(f)))return send(res,400,{error:'Supply 2–8 JPEG frames, each under 625 KB.'}),true;
const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
let response;
try{response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_VISION_MODEL||'gpt-4.1-mini',max_output_tokens:650,store:false,instructions:'You are an assistant basketball video scout. Analyze only what is visible in these sampled still frames. Never claim to have watched continuous video or tracked possessions. Describe court spacing, apparent offensive alignment, potential screening action, and uncertainties. If footage is unclear or shows no court, say so. Do not identify players by name or infer personal traits. Provide concise actionable observations with clear uncertainty.',input:[{role:'user',content:[{type:'input_text',text:'These are sampled frames from a basketball sequence in chronological order. The sequence is represented by discrete still images, not continuous video. Give: (1) visible alignment and spacing, (2) possible offensive action, (3) coaching observations, (4) what cannot be determined from still frames. Avoid unsupported certainty.'},...d.frames.map(image_url=>({type:'input_image',image_url,detail:'low'}))]}]})})}finally{clearTimeout(timeout)}
const result=await response.json().catch(()=>({}));if(!response.ok)return send(res,502,{error:'AI provider error ('+response.status+'): '+(result.error?.message||'Request failed')}),true;
const output=(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
return send(res,200,{analysis:output||'No analysis returned.',frameCount:d.frames.length,disclaimer:'Draft visual observations from still frames; coach verification required.'}),true;
}catch(e){return send(res,502,{error:'AI analysis failed: '+e.message}),true}
}
module.exports={handle};