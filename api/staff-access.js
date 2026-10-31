import {getApps,initializeApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';
import {createStaffService,AccessError} from '../_server/staff-service.js';
let service;
function getService(){
 if(service)return service;
 const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw new AccessError('Secure faculty PIN access needs activation: add FIREBASE_SERVICE_ACCOUNT_JSON in the Vercel project’s protected environment settings.',503);
 let credential;try{credential=JSON.parse(raw);}catch{throw new AccessError('The server Firebase credential is not configured correctly.',503);}
 if(credential.project_id!=='vidyalaya-one-app')throw new AccessError('The server credential must belong to vidyalaya-one-app.',503);
 const app=getApps().find(a=>a.name==='mission-server')||initializeApp({credential:cert(credential),databaseURL:'https://vidyalaya-one-app-default-rtdb.firebaseio.com'},'mission-server');
 service=createStaffService({db:getDatabase(app),auth:getAuth(app)});return service;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');res.status(405).json({error:'Use POST.'});return;}
 try{
  let input;try{input=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{throw new AccessError('Invalid JSON request.',400);}if(!input||typeof input!=='object'||Array.isArray(input))throw new AccessError('Invalid request body.',400);if(Buffer.byteLength(JSON.stringify(input))>12000)throw new AccessError('Request is too large.',413);
  const action=String(input.action||'');if(!['directory','login','list','set-pin','disable','students','profile','comment','update-task'].includes(action))throw new AccessError('Unknown action.',400);const bearer=String(req.headers.authorization||'');const token=bearer.startsWith('Bearer ')?bearer.slice(7):'';
  if(!['directory','login'].includes(action)&&!token)throw new AccessError('Sign in first.',401);
  const ip=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
  res.status(200).json(await getService()(action,input,token,ip));
 }catch(error){const status=error instanceof AccessError?error.status:String(error.code||'').startsWith('auth/')?401:500;res.status(status).json({error:status===500?'Staff service could not complete the request. Please try again.':error instanceof AccessError?error.message:'Your session is invalid. Sign in again.'});}
}
