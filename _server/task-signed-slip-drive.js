import {createHash,randomUUID} from 'node:crypto';
import {monitoringExamLabel,monitoringSlipFolder} from '../cbse-task-monitoring-workflow.js';
const uploadError=(message,status)=>Object.assign(Error(message),{status});

export const signedSlipLimit=2_500_000;

async function driveAuthorization(env,fetchImpl,signal){
 const {TASK_DRIVE_CLIENT_ID:client_id,TASK_DRIVE_CLIENT_SECRET:client_secret,TASK_DRIVE_REFRESH_TOKEN:refresh_token}=env;
 if(!client_id||!client_secret||!refresh_token)
  throw uploadError('Google Drive authorization is missing. Add the three Task Drive credentials in Vercel and redeploy.',503);
 try{
  const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',
   body:new URLSearchParams({client_id,client_secret,refresh_token,grant_type:'refresh_token'}),signal});
  if(!response.ok)throw Error('Authorization failed');
  const {access_token}=await response.json();
  if(!access_token)throw Error('Authorization failed');
  return {Authorization:'Bearer '+access_token};
 }catch{throw uploadError('Google Drive authorization could not be verified. Check the Vercel credentials.',502);}
}

export async function checkTaskSlipDrive({env=process.env,fetchImpl=fetch}={}){
 const signal=AbortSignal.timeout(15000),headers=await driveAuthorization(env,fetchImpl,signal);
 return Promise.all(['Class 10-A','Class 11-A'].map(async section=>{
  const exam=monitoringExamLabel(section),folder=monitoringSlipFolder(section);
  try{
   const response=await fetchImpl('https://www.googleapis.com/drive/v3/files/'+folder+
    '?supportsAllDrives=true&fields=mimeType,capabilities(canAddChildren)',{headers,signal});
   if(!response.ok)return {exam,ready:false};
   const data=await response.json();
   return {exam,ready:data.mimeType==='application/vnd.google-apps.folder'&&data.capabilities?.canAddChildren===true};
  }catch{return {exam,ready:false};}
 }));
}

export async function uploadTaskSignedSlip(encoded,{subject,section,uploadKey},{env=process.env,fetchImpl=fetch}={}){
 if(typeof encoded!=='string'||encoded.length>Math.ceil(signedSlipLimit/3)*4)throw uploadError('Choose a signed PDF up to 2.5 MB.',400);
 const pdf=Buffer.from(encoded,'base64');
 if(pdf.length>signedSlipLimit||pdf.toString('base64')!==encoded||pdf.subarray(0,5).toString()!=='%PDF-'||!pdf.subarray(-1024).includes('%%EOF'))
  throw uploadError('Choose a valid signed PDF up to 2.5 MB.',400);
 const folder=monitoringSlipFolder(section);
 const title=value=>String(value).replace(/[\x00-\x1f\\/:*?"<>|]/g,' ').trim().slice(0,90);
 const name=monitoringExamLabel(section)+' - '+title(section)+' - '+title(subject)+' - Signed Marks Slip.pdf';
 const deadline=AbortSignal.timeout(25000);
 const headers=await driveAuthorization(env,fetchImpl,deadline);
 try{
  const key=createHash('sha256').update(uploadKey).update(pdf).digest('hex');
  const files='https://www.googleapis.com/drive/v3/files';
  const query=new URLSearchParams({q:"'"+folder+"' in parents and trashed = false and appProperties has { key='taskSlip' and value='"+key+"' }",
   fields:'files(id)',supportsAllDrives:'true',includeItemsFromAllDrives:'true',pageSize:'1'});
  const existing=await fetchImpl(files+'?'+query,{headers,signal:deadline});
  if(!existing.ok)throw Error('Drive could not check for a previous upload.');
  const previous=(await existing.json()).files?.[0]?.id;
  if(typeof previous==='string'&&/^[\w-]+$/.test(previous))return {id:previous,name};
  const boundary='task-slip-'+randomUUID();
  const body=Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+
   JSON.stringify({name,parents:[folder],mimeType:'application/pdf',appProperties:{taskSlip:key}})+'\r\n--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n'),
   pdf,Buffer.from('\r\n--'+boundary+'--\r\n')]);
  const response=await fetchImpl('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id',{
   method:'POST',headers:{...headers,'Content-Type':'multipart/related; boundary='+boundary},body,signal:deadline,
  });
  if(!response.ok)throw Error('Drive rejected the upload.');
  const {id}=await response.json();
  if(typeof id!=='string'||!/^[\w-]+$/.test(id))throw Error('Drive did not return a file ID.');
  return {id,name};
 }catch{
  throw uploadError('Google Drive did not confirm the upload. Keep the scan open and retry, or ask the Principal to check the Drive connection.',502);
 }
}
