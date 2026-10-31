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
