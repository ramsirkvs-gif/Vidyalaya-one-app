import {scryptSync} from 'node:crypto';
// Synthetic local backend; never connects to Firebase or accepts real records.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {taskFixture} from './task-manager-fixture.mjs';
import ExcelJS from 'exceljs';
import {TASK_CLASSES} from '../cbse-task-manager-model.js';
const f=taskFixture();f.data.cbse.viewAccess={salt:'synthetic-primary-view',hash:scryptSync('synthetic-view','synthetic-primary-view',64).toString('hex')};await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/synthetic-strength.xlsx'){const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Class Strength Data');sheet.addRow(['CLASS','TOTAL STUDENTS','CAT-V STUDENTS','TOTAL ST STUDENTS']);sheet.addRow(['VI A',24,0,null]);for(const c of TASK_CLASSES)sheet.addRow([c,24,0,null]);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.end(Buffer.from(await book.xlsx.writeBuffer()));return;}
 if(req.url==='/api/staff-access'){
  let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body),token=(req.headers.authorization||'').replace(/^Bearer /,'');
  const viewerToken=(req.headers.cookie||'').match(/(?:^|;\s*)mission_staff_view=([a-f0-9]{64})/)?.[1]||'';const result=await f.service(input.action,input,token,'browser-test',{viewerToken});if(result.viewerToken)res.setHeader('Set-Cookie','mission_staff_view='+result.viewerToken+'; Path=/; HttpOnly; SameSite=Lax');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
 }
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html',root=path.resolve('public'),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error('Invalid path');const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/json');res.end(data);
 }catch(e){res.statusCode=e.status||400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message,...(e.curtainRequired?{curtainRequired:true}:{})}));}});
server.listen(Number(process.env.TASK_BROWSER_PORT||8012),'127.0.0.1',()=>console.log('SYNTHETIC_TASK_SERVER_READY'));
