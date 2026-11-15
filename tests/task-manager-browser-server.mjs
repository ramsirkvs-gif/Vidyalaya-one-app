// Synthetic local backend; never connects to Firebase or accepts real records.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {taskFixture} from './task-manager-fixture.mjs';
const f=taskFixture();await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/api/staff-access'){
  let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body),token=(req.headers.authorization||'').replace(/^Bearer /,'');
  // Only the curtain is stubbed. Task permissions and PIN verification use the real service.
  const result=input.action==='task-read'?{tasks:{},staff:{'X:one':{name:'Synthetic Teacher one',status:'active'},'X:two':{name:'Synthetic Teacher two',status:'active'}}}:await f.service(input.action,input,token,'browser-test');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
 }
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html',root=path.resolve('public'),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error('Invalid path');const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/json');res.end(data);
 }catch(e){res.statusCode=e.status||400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));}});
server.listen(8012,'127.0.0.1',()=>console.log('SYNTHETIC_TASK_SERVER_READY'));
