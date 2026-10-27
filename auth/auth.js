// Server-side authentication module. Requires npm install pg and DATABASE_URL.
// Mount before static file routes and protect every private report endpoint.
const crypto = require('node:crypto');
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? {rejectUnauthorized: true} : undefined});
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const passwordHash = password => {
 const salt=crypto.randomBytes(16);
 const derived=crypto.scryptSync(password,salt,64);
 return 'scrypt:'+salt.toString('hex')+':'+derived.toString('hex');
};
const verifyPassword=(password,stored)=>{
 const [algo,saltHex,digestHex]=String(stored).split(':');
 if(algo!=='scrypt'||!saltHex||!digestHex)return false;
 try {const expected=Buffer.from(digestHex,'hex');const actual=crypto.scryptSync(password,Buffer.from(saltHex,'hex'),expected.length);return crypto.timingSafeEqual(expected,actual)}catch{return false}
};
function cookie(req,name){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)}
async function currentUser(req){
 const token=cookie(req,'sehs_session');if(!token||!/^([a-f0-9]{64})$/.test(token))return null;
 const result=await pool.query("SELECT u.id,u.email,u.role FROM staff_sessions s JOIN staff_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.active=TRUE",[hash(token)]);
 return result.rows[0]||null;
}
function send(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(body))}
async function handleAuth(req,res){
 if(req.url==='/api/auth/me'&&req.method==='GET'){const user=await currentUser(req);send(res,user?200:401,user?{user}:{error:'Authentication required'});return true}
 if(req.url==='/api/auth/login'&&req.method==='POST'){
  if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin)}catch{return send(res,403,{error:'Forbidden'}),true}if(origin.host!==req.headers.host||origin.protocol!=='https:')return send(res,403,{error:'Forbidden'}),true}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)return send(res,413,{error:'Request too large'}),true}
  let input;try{input=JSON.parse(raw)}catch{return send(res,400,{error:'Invalid request'}),true}
  const email=String(input.email||'').trim().toLowerCase(),password=String(input.password||'');
  const found=await pool.query('SELECT id,email,role,password_hash FROM staff_users WHERE email=$1 AND active=TRUE',[email]);
  const user=found.rows[0];if(!user||!verifyPassword(password,user.password_hash))return send(res,401,{error:'Invalid credentials'}),true;
  const token=crypto.randomBytes(32).toString('hex');
  await pool.query("INSERT INTO staff_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '12 hours')",[hash(token),user.id]);
  send(res,200,{user:{id:user.id,email:user.email,role:user.role}},{'Set-Cookie':'sehs_session='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200'});return true
 }
 if(req.url==='/api/auth/logout'&&req.method==='POST'){
  const token=cookie(req,'sehs_session');if(token)await pool.query('DELETE FROM staff_sessions WHERE token_hash=$1',[hash(token)]);
  send(res,200,{ok:true},{'Set-Cookie':'sehs_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});return true
 }
 return false;
}
module.exports={pool,passwordHash,currentUser,handleAuth};
