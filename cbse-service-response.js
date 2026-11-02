// Deployment gateways may return plain text or HTML before the function runs.
// Never expose their response body (or treat it as a successful PIN update).
export async function readStaffResponse(response){
 let body;
 try{body=JSON.parse(await response.text());}catch{}
 if(!body||typeof body!=='object'||Array.isArray(body)){
  const status=Number(response.status)||0;
  if(status===404)throw Error('The secure PIN service is missing from this deployment. Redeploy the latest version with its API function. No PIN update was confirmed.');
  throw Error(`The secure PIN service returned an invalid server response (HTTP ${status}). Check Vercel Function logs for /api/staff-access and its server activation. No PIN update was confirmed. Keep the CSV and retry after the service is fixed.`);
 }
 if(!response.ok)throw Error(typeof body.error==='string'?body.error:'The secure PIN service could not complete this request. No update was confirmed.');
 return body;
}

// A timed-out write may still commit; never retry it automatically.
export async function saveFacultyWithRefresh(save,refresh,{saveTimeout=45000,refreshTimeout=15000}={}){
 async function bounded(operation,ms,message){let timer;try{return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]);}finally{clearTimeout(timer);}}
 const result=await bounded(save,saveTimeout,'The save is taking too long to confirm. Your entries are retained. Check the faculty list and PIN settings before adding this member again; the server may still finish saving.');
 if(result?.ok!==true||typeof result.staffId!=='string'||!result.staffId)throw Error('The server did not confirm a saved member. Check the faculty list before trying again.');
 try{return {result,fresh:await bounded(refresh,refreshTimeout,'Profile refresh timed out.')};}
 catch{const error=Error('The member was saved successfully, but the profile could not refresh. Do not submit again. Reload the portal and open this member from the faculty list; the saved PIN remains in Principal PIN settings.');error.saveConfirmed=true;error.staffId=result.staffId;throw error;}
}
