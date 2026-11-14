import {officeRegularDirectory} from '../cbse-office-regular.js';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {OFFICE_MEMBERS,officeMember,emptyOfficeWorkspace,applyOfficeWorkspace} from '../cbse-office-model.js';
import {encryptDisplayPIN,decryptDisplayPIN} from './pin-vault.js';
export const OFFICE_COOKIE='vidyalaya_office';
const digest=value=>createHash('sha256').update(value).digest('hex');
export function createOfficeService({db,read,principal,hashPIN,verifyPIN,throttle,clearAttempt,displayKey,now,directoryStaff,sharedView,AccessError}){
 const fail=(message,status=403)=>{throw new AccessError(message,status);};
 async function curtain(session){const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');if(access.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}
 const safeDirectory=async()=>officeRegularDirectory(await directoryStaff());
 async function confirmPIN(id,pin,ip){
  if(!officeMember(id))fail('Choose an office member.',400);const ticket=await throttle('office:'+id,'office|'+ip),access=await read('cbse/officeAccess/'+id);
  if(!access?.enabled||!await verifyPIN(pin,access))fail('The office PIN is incorrect or access is disabled.',401);await clearAttempt(ticket);return access;
 }
 async function actor(token,officeToken){
  if(token){await principal(token);return {id:'principal',principal:true};}
  if(!/^[a-f0-9]{64}$/.test(officeToken||''))fail('Office login required.',401);
  const session=await read('cbse/officeSessions/'+digest(officeToken));if(!session||session.expires<=now()||!officeMember(session.memberId))fail('Office login expired. Sign in again.',401);
  const access=await read('cbse/officeAccess/'+session.memberId);if(!access?.enabled||access.version!==session.version)fail('Office access changed. Sign in again.',401);return {id:session.memberId,principal:false};
 }
 return async(action,input,token,ip,session)=>{
  if(action==='office-directory')return {members:OFFICE_MEMBERS};
  if(action==='office-login'){
   await curtain(session);const access=await confirmPIN(input.memberId,input.pin,ip),officeToken=randomBytes(32).toString('hex');await db.ref('cbse/officeSessions/'+digest(officeToken)).set({memberId:input.memberId,version:access.version,expires:now()+12*3600000});return {ok:true,memberId:input.memberId,officeToken};
  }
  if(action==='office-logout'){if(/^[a-f0-9]{64}$/.test(session.officeToken||''))await db.ref('cbse/officeSessions/'+digest(session.officeToken)).remove();return {ok:true};}
  if(action==='office-staff-read'){
   if(token)await principal(token);else{const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');if(access.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}
   if(input.operation==='directory')return {directory:await safeDirectory()};
   if(input.memberId){if(!officeMember(input.memberId))fail('Choose an office dashboard.',400);return {published:await read('cbse/office/workspaces/'+input.memberId+'/published')};}
   const summaries=await Promise.all(OFFICE_MEMBERS.map(async member=>({member,...await read('cbse/office/workspaces/'+member.id+'/published/summary')})));return {summaries:summaries.filter(s=>s.publishedAt)};
  }
  const who=await actor(token,session.officeToken);if(!who.principal)await curtain(session);
  if(action==='office-pin-settings'){
   if(!who.principal)fail('Principal access required.');if(input.operation==='set-pin'){
    if(!officeMember(input.memberId))fail('Choose an office member.',400);const record={...await hashPIN(input.pin),...encryptDisplayPIN(input.pin,'office:'+input.memberId,displayKey),enabled:true,version:randomUUID(),updatedAt:now()};
    await db.ref('cbse/officeAccess/'+input.memberId).set(record);
   }else if(input.operation==='disable'){
    if(!officeMember(input.memberId))fail('Choose an office member.',400);await db.ref('cbse/officeAccess/'+input.memberId).update({enabled:false,version:randomUUID(),updatedAt:now()});
   }else if(input.operation!==undefined&&input.operation!=='read')fail('Choose a PIN setting.',400);
   const access=await read('cbse/officeAccess')||{};return {members:OFFICE_MEMBERS.map(member=>({...member,pinSet:!!access[member.id]?.hash,enabled:!!access[member.id]?.enabled,pin:decryptDisplayPIN(access[member.id],'office:'+member.id,displayKey)}))};
  }
  if(action!=='office-workspace')fail('Unknown office action.',400);
  if(input.operation==='report-summary'){if(!who.principal)fail('Principal access required.');return {reports:await Promise.all(OFFICE_MEMBERS.map(async member=>({member,report:await read('cbse/office/workspaces/'+member.id+'/report')})))};}
  const memberId=input.memberId||who.id;if(!officeMember(memberId)||!who.principal&&who.id!==memberId)fail('Only the concerned office member or Principal can open this dashboard.');
  const path='cbse/office/workspaces/'+memberId;
  if(input.operation==='read'||!input.operation)return {actor:who,members:OFFICE_MEMBERS,workspace:await read(path)||emptyOfficeWorkspace(memberId),directory:await safeDirectory()};
  if(!who.principal&&memberId==='pramod-paswan'&&!['save-row','set-voucher-status','submit-report'].includes(input.operation))fail('Only the Principal can change audit settings or import data. Office members can add vouchers and update Pending / Done.');
  if(!who.principal){if(['publish','unpublish','review-report'].includes(input.operation))fail('Only the Principal can publish office work to staff.');await confirmPIN(memberId,input.pin,ip);}
  if(input.operation==='import'&&(!Array.isArray(input.rows)||input.rows.length<1||input.rows.length>1000))fail('Import between 1 and 1000 records.',400);
  const directory=await safeDirectory(),known=await read(path),values={...input,memberId,...(input.operation==='import'?{importIds:(input.rows||[]).map(()=> 'office_'+randomUUID().replaceAll('-',''))}:{})};let reason='';
  const saved=await db.ref(path).transaction(current=>{if(current===null&&known!==null)return null;try{return applyOfficeWorkspace(current,values,who,directory,now());}catch(error){reason=error.message;return;}});
  if(!saved.committed||!saved.snapshot.val())fail(reason||'The save was not confirmed. Refresh and retry.',409);
  return {ok:true,workspace:saved.snapshot.val()};
 };
}
