const isDisconnect=error=>/^disconnect$/i.test(String(error?.code||error?.message||''));
// Recover a known transient transport failure with the same conditional update.
export async function mcqTransaction(db,path,update,{restTransaction,canRecover=isDisconnect}={}){
 try{return await db.ref(path).transaction(update);}
 catch(error){if(!restTransaction||!canRecover(error))throw error;return restTransaction(path,update);}
}
export function mcqEvaluationTransaction(db,update,options){return mcqTransaction(db,'cbse',update,options);}
export function createRESTTransaction({databaseURL,credential,fetchImpl=fetch}){
 return async(path,update,{retryTransport=false}={})=>{
  const {access_token}=await credential.getAccessToken(),url=databaseURL.replace(/\/$/,'')+'/'+path+'.json';
  const unavailable=(retryable=false)=>Object.assign(Error('The database connection is unavailable. Your save could not be confirmed. Keep this page open and retry the same save or upload.'),{code:'MCQ_DATABASE_UNAVAILABLE',retryable});
  const signal=AbortSignal.timeout(20000);
  const request=async(method,headers={},body)=>{
   let response;
   try{response=await fetchImpl(url,{method,headers:{Authorization:'Bearer '+access_token,...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal});}
   catch{throw unavailable(true);}
   if(!response.ok&&response.status!==412)throw unavailable([408,429,500,502,503,504].includes(response.status));
   return response;
  };
  for(let attempt=0;attempt<3;attempt++){
   try{
    const read=await request('GET',{'X-Firebase-ETag':'true'}),etag=read.headers.get('etag');
    if(!etag)throw Error('Database did not supply a transaction version.');
    const current=await read.json(),next=update(current);
    if(next===undefined)return {committed:false,snapshot:{val:()=>current}};
    const written=await request('PUT',{'if-match':etag,'Content-Type':'application/json'},next);
    if(written.status===412)continue;
    return {committed:true,snapshot:{val:()=>next}};
   }catch(error){
    // Re-read after a lost response because the previous PUT may already have committed.
    if(!retryTransport||!error.retryable||signal.aborted||attempt===2)throw error;
    await new Promise(resolve=>setTimeout(resolve,100*(attempt+1)));
   }
  }
  throw Object.assign(Error('Other updates interrupted this save. Keep this page open and retry the same save or upload.'),{code:'MCQ_DATABASE_BUSY'});
 };
}
