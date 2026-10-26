const fs=require('node:fs'),path=require('node:path'),AdmZip=require('adm-zip');
const source=path.join(__dirname,'St_Edward_One_Step_Upload.zip');
const destination=path.join(__dirname,'public','reports');
if(!fs.existsSync(source)){console.warn('Scouting archive ZIP not found; skipping extraction');process.exit(0)}
fs.mkdirSync(destination,{recursive:true});
const zip=new AdmZip(source);let count=0;
for(const entry of zip.getEntries()){
 if(entry.isDirectory)continue;
 const name=entry.entryName.replace(/\\/g,'/');
 if(!/^public\/reports\/[A-Za-z0-9_-]+\.pdf$/i.test(name))continue;
 const filename=path.basename(name);
 const bytes=entry.getData();
 if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF in archive: '+filename);
 fs.writeFileSync(path.join(destination,filename),bytes);count++;
}
if(count<143)throw Error('Expected 143 PDFs in bundled archive; found '+count);
console.log('Successfully installed '+count+' PDF scouting reports into public/reports/');
