// Retry only disconnects, using conditional HTTPS writes and the same pure update.
export async function mcqTransaction(db,path,update,{restTransaction}={}){
 try{return await db.ref(path).transaction(update);}
 catch(error){if(!/^disconnect$/i.test(String(error?.code||error?.message||''))||!restTransaction)throw error;return restTransaction(path,update);}
}
export function mcqEvaluationTransaction(db,update,options){return mcqTransaction(db,'cbse',update,options);}
export function createRESTTransaction({databaseURL,credential,fetchImpl=fetch}){
 return async(path,update)=>{
  const {access_token}=await credential.getAccessToken(),url=databaseURL.replace(/\/$/,'')+'/'+path+'.json';
  const unavailable=()=>Object.assign(Error('The database connection is unavailable. Your MCQ save could not be confirmed. Keep this page open and retry the same save or upload.'),{code:'MCQ_DATABASE_UNAVAILABLE'});
  const signal=AbortSignal.timeout(20000);
  const request=async(method,headers={},body)=>{let response;try{response=await fetchImpl(url,{method,headers:{Authorization:'Bearer '+access_token,...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal});}catch{throw unavailable();}if(!response.ok&&response.status!==412)throw unavailable();return response;};
  for(let attempt=0;attempt<3;attempt++){
   const read=await request('GET',{'X-Firebase-ETag':'true'}),etag=read.headers.get('etag');if(!etag)throw Error('Database did not supply a transaction version.');
   const current=await read.json(),next=update(current);
   if(next===undefined)return {committed:false,snapshot:{val:()=>current}};
   const written=await request('PUT',{'if-match':etag,'Content-Type':'application/json'},next);if(written.status===412)continue;
   return {committed:true,snapshot:{val:()=>next}};
  }
  throw Object.assign(Error('Other updates interrupted this MCQ save. Keep this page open and retry the same save or upload.'),{code:'MCQ_DATABASE_BUSY'});
 };
}
