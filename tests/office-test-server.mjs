// Synthetic, local-only integration fixture. Never included in the deployed build.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {officeFixture} from './office-fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{service}=officeFixture();
const cookies=header=>Object.fromEntries(String(header||'').split(';').map(v=>v.trim().split('=')));
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/api/staff-access'){
   let body='';for await(const part of req)body+=part;const input=JSON.parse(body),cookie=cookies(req.headers.cookie),token=String(req.headers.authorization||'').replace(/^Bearer /,'');
   const result=await service(input.action,input,token,'browser',{officeToken:cookie.vidyalaya_office||'',viewerToken:cookie.mission_staff_view||''});
   if(input.action==='office-login'){res.setHeader('Set-Cookie','vidyalaya_office='+result.officeToken+'; Path=/; HttpOnly; SameSite=Strict');delete result.officeToken;}
   if(input.action==='view-login'){res.setHeader('Set-Cookie','mission_staff_view='+result.viewerToken+'; Path=/; HttpOnly; SameSite=Lax');delete result.viewerToken;}
   if(input.action==='office-logout')res.setHeader('Set-Cookie','vidyalaya_office=; Path=/; HttpOnly; Max-Age=0');
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
  }
  const url=new URL(req.url,'http://localhost'),filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!filename.startsWith(root+path.sep))throw Error('Invalid path');
  const data=await fs.readFile(filename);res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm'})[path.extname(filename)]||'application/octet-stream');res.end(data);
 }catch(error){res.statusCode=error.status||500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:error.message,curtainRequired:!!error.curtainRequired}));}
});
server.listen(Number(process.env.OFFICE_TEST_PORT||8012),'127.0.0.1',()=>console.log('Synthetic office integration server ready'));
