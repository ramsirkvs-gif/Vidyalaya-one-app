import {applyRollCall,rollWing} from '../cbse-roll-call-model.js';
import {applyRemedialPlan} from '../cbse-remedial-model.js';
import {publishMCQReport} from '../cbse-mcq-evaluation-reports.js';
import {readMCQAnswerKey} from '../cbse-mcq-answer-key.js';
import {previewResetAllMCQ,resetAllMCQ,previewClearMCQBanks,clearMCQBanks} from '../cbse-mcq-reset.js';
import {applyTeamNews,readTeamNews} from '../cbse-team-news-model.js';
import {mcqContributionHistory,previewMCQContributions,manageMCQContributions,contributeMCQ,importMCQCSV,changeMCQQuestion,deleteMCQPaper,createMCQPaper,evaluateMCQ,publicMCQBank,mcqContributors} from '../cbse-mcq-model.js';
import {planStudentContactUpdate} from '../cbse-contact-audit.js';
import {planFacultySave} from '../cbse-faculty-editor-model.js';
import {applyConversationOperation} from '../cbse-conversation-model.js';
import {teacherConversation} from '../cbse-teacher-conversation.js';
import {resolvedViewingData,resolvedAllocations,teacherIdentityIds} from '../cbse-view-data.js';
import {createSharedView} from './shared-view.js';
import {defaultViewSecret} from './view-default.js';
import {validateContact,mapLink,serializePhones,staffStudentRoles} from '../cbse-contact-model.js';
import {encryptDisplayPIN,decryptDisplayPIN} from './pin-vault.js';
import {emptyFaculty,validateFaculty} from '../cbse-faculty-model.js';
import {validatePINRows} from '../cbse-pin-import.js';
import {scrypt as scryptCallback,randomBytes,timingSafeEqual,createHash,randomUUID,randomInt} from 'node:crypto';
import {promisify} from 'node:util';
import {emptyMission,studentIndex,studentProgress,staffIndex,staffCanView,staffProfileView,staffVisibleRecord,today} from '../cbse-mission-model.js';
const scrypt=promisify(scryptCallback);
export class AccessError extends Error{constructor(message,status=403){super(message);this.status=status;}}
export async function hashPIN(pin,salt=randomBytes(16).toString('hex')){if(!/^(?:\d{3}|\d{6,12})$/.test(String(pin)))throw new AccessError('Use a three-digit PIN (existing 6–12 digit PINs remain supported).',400);return {salt,hash:(await scrypt(String(pin),salt,64)).toString('hex')};}
export async function verifyPIN(pin,record){if(!/^(?:\d{3}|\d{6,12})$/.test(String(pin))||!record?.hash||!record.salt)return false;const expected=Buffer.from(record.hash,'hex'),actual=await scrypt(String(pin),record.salt,64);return expected.length===actual.length&&timingSafeEqual(expected,actual);}
const entries=value=>Object.entries(value||{});
export function createStaffService({db,auth,now=Date.now,displayKey,viewSecret=defaultViewSecret}){
 const read=async path=>(await db.ref(path).get()).val();
 async function context(){const [draft,faculty,mission]=await Promise.all([read('cbse/draft'),read('cbse/facultyDraft'),read('cbse/mission')]);return {draft,...resolvedViewingData(draft,faculty,mission||emptyMission())};}
 async function directoryStaff(){const[faculty,support]=await Promise.all([read('cbse/facultyDraft'),read('cbse/mission/staff')]);return staffIndex(faculty,{staff:support||{}});}
 async function generateMissingPINs(staff){
    const access=await read('cbse/staffAccess')||{},missing=entries(staff).filter(([id,p])=>p.status==='active'&&!access[id]?.hash);
    if(missing.length>900)throw new AccessError('Generate PINs for fewer than 901 staff at a time.',400);
    const used=new Set(),prepared=[];
    for(const[id,p]of missing){let pin;do{pin=String(randomInt(100,1000));}while(used.has(pin));used.add(pin);prepared.push({id,name:p.name,pin,record:{...await hashPIN(pin),...encryptDisplayPIN(pin,id,displayKey),enabled:true,version:randomUUID(),updatedAt:now()}});}
    let created=[];
    const result=await db.ref('cbse/staffAccess').transaction(current=>{const next=current||{};created=[];for(const p of prepared)if(!next[p.id]?.hash){next[p.id]=p.record;created.push({staffId:p.id,name:p.name,pin:p.pin});}return next;});
    if(!result.committed)throw new AccessError('PIN generation did not save. Try again.',409);
    return {created,staff:Object.fromEntries(entries(staff).filter(([,t])=>t.status==='active'))};
 }
 async function principal(token){const decoded=await auth.verifyIdToken(token,true),uid=await read('cbse/adminUid');if(decoded.uid!==uid)throw new AccessError('Principal access required.');return decoded;}
 async function staffUser(token){const decoded=await auth.verifyIdToken(token,true);if(decoded.missionStaff!==true||typeof decoded.staffId!=='string')throw new AccessError('Staff access required.');const access=await read(`cbse/staffAccess/${decoded.staffId}`);if(!access?.enabled||decoded.pinVersion!==access.version)throw new AccessError('Staff access has been disabled or reset. Sign in again.');return {decoded,access};}
 async function throttle(staffId,ip){const key=createHash('sha256').update(`${ip}|${staffId}`).digest('hex');for(const[scope,limit]of [[`ip|${ip}`,25],[`${ip}|${staffId}`,8],[`staff|${staffId}`,30]]){const bucket=createHash('sha256').update(scope).digest('hex');let denied=false;await db.ref(`cbse/staffAttempts/${bucket}`).transaction(current=>{const value=current&&now()-current.started<15*60_000?current:{started:now(),count:0};if(value.count>=limit){denied=true;return;}return {...value,count:value.count+1};});if(denied)throw new AccessError('Too many PIN attempts. Try again in 15 minutes.',429);}return key;}
 async function verifySubmissionPIN(id,pin,access,ip){
  if(!pin)throw new AccessError('Enter your personal PIN for this submission on the student profile.',403);
  const key=await throttle(id,'submit|'+ip);if(!await verifyPIN(pin,access))throw new AccessError('The PIN does not match this staff member.',401);await db.ref(`cbse/staffAttempts/${key}`).remove();for(const scope of [`ip|submit|${ip}`,`submit|${ip}|${id}`,`staff|${id}`])await db.ref('cbse/staffAttempts/'+createHash('sha256').update(scope).digest('hex')).remove();
 }
 async function revoke(staffId){try{await auth.revokeRefreshTokens('mission_'+createHash('sha256').update(staffId).digest('hex').slice(0,40));}catch(e){if(e.code!=='auth/user-not-found')throw e;}}
 const sharedView=createSharedView({db,context,now,defaultSecret:viewSecret});
 return async function handle(action,input={},token='',ip='unknown',session={}){
  if(['view-login','view-data','view-version','view-student-photo','view-student-photos','view-logout'].includes(action)){const result=await sharedView(action,{...input,ip},session.viewerToken||'');if(result?.error){const error=new AccessError(result.error,result.status);error.curtainRequired=result.curtainRequired;throw error;}return result;}
  if(action==='mcq-read'||action==='news-read'){if(token)await principal(token);else{const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}if(action==='news-read'){const output=value=>{try{return readTeamNews(value,input);}catch(e){throw new AccessError(e.message,400);}};if(input.photoId){if(typeof input.photoId!=='string'||!/^news_[A-Za-z0-9_-]{8,80}$/.test(input.photoId))throw new AccessError('Choose a News photo.',400);const [post,photo]=await Promise.all([read('cbse/teamNews/posts/'+input.photoId),read('cbse/teamNews/photos/'+input.photoId)]);return output({posts:post?{[input.photoId]:post}:{},photos:{[input.photoId]:photo}});}const [posts,revision]=await Promise.all([read('cbse/teamNews/posts'),read('cbse/teamNews/revision')]);return output({posts:posts||{},revision:revision||0});}return publicMCQBank(await read('cbse/mcq')||{},input);}
  if(action==='roll-call-read'){
   const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error){const e=new AccessError(access.error,access.status);e.curtainRequired=access.curtainRequired;throw e;}
   const staff=await directoryStaff(),value=await read('cbse/rollCall')||{};return {ok:true,staff:Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active').map(([id,p])=>[id,{name:p.name,wing:rollWing(p)}])),rollCall:{reports:Object.fromEntries(entries(value.reports).map(([id,r])=>[id,Object.fromEntries(['staffId','name','wing','date','period','reported','status','updatedAt','approvedAt'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]))])),objections:{}}};
  }
  if(action==='remember-view'){await principal(token);return sharedView('view-grant');}
  let pinIdentity,mcqPrincipal;
  if(action==='mcq-principal'){mcqPrincipal=await principal(token);action=String(input.operation||'');if(!['mcq-reset-all-preview','mcq-reset-all','mcq-clear-banks-preview','mcq-clear-banks','mcq-contribution-history','mcq-manage-preview','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','mcq-report-publish'].includes(action))throw new AccessError('Unknown Principal MCQ operation.',400);}
  if(action==='pin-submit'){
   if(input.operation==='roll-call'){const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error)throw new AccessError(access.error,access.status);}
   const id=String(input.staffId||'');if(!/^[a-zA-Z0-9_:-]{1,200}$/.test(id))throw new AccessError('Choose your name and enter your PIN.',401);const access=await read(`cbse/staffAccess/${id}`),person=(await directoryStaff())[id];if(!access?.enabled||person?.status!=='active')throw new AccessError('Choose your name and enter the correct PIN.',401);
   await verifySubmissionPIN(id,input.pin,access,ip);
   action=String(input.operation||'comment');if(!['comment','teacher-comment','update-contact','update-task','conversation-start','conversation-reply','news-create','news-comment','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','remedial-plan','roll-call'].includes(action))throw new AccessError('This operation requires Principal access.',403);pinIdentity={decoded:{staffId:id},access};
  }
  if(action==='roll-call'||action==='roll-call-principal'){
   const admin=action==='roll-call-principal';if(admin)await principal(token);else if(!pinIdentity)throw new AccessError('Verify your personal PIN.',403);if(!admin){const access=await read('cbse/staffAccess/'+pinIdentity.decoded.staffId);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('Staff access changed. Verify your PIN again.',403);}
   const staff=await directoryStaff(),actor=admin?{id:'principal',name:'Principal'}:{id:pinIdentity.decoded.staffId,name:staff[pinIdentity.decoded.staffId]?.name||'Staff'};
   const output=value=>({ok:true,principal:admin,actor,staff:Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active').map(([id,p])=>[id,{name:p.name,wing:rollWing(p)}])),rollCall:admin?value:{...value,reports:Object.fromEntries(entries(value.reports).filter(([,r])=>r.staffId===actor.id)),objections:Object.fromEntries(entries(value.objections).filter(([,o])=>o.staffId===actor.id||o.createdBy===actor.id))}});
   if(input.rollOperation==='read')return output(await read('cbse/rollCall')||{});
   let reason='';const newId='objection_'+randomUUID().replaceAll('-','');const result=await db.ref('cbse/rollCall').transaction(current=>{try{return applyRollCall(current,input,actor,staff,now(),newId);}catch(e){reason=e.message;return;}});
   if(!result.committed)throw new AccessError(reason||'Roll call changed. Retry.',409);return output(result.snapshot.val());
  }
  if(action==='remedial-plan'||action==='remedial-principal'){const admin=action==='remedial-principal';if(admin)await principal(token);else if(!pinIdentity)throw new AccessError('Choose your name and enter your own PIN.',403);const c=await context(),id=admin?'principal':pinIdentity.decoded.staffId,person=admin?null:staffIndex(c.faculty,c.mission)[id],actor={id,name:admin?'Principal':person?.name||'Staff'};if(!admin){const access=await read('cbse/staffAccess/'+id);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('Staff access changed. Verify your PIN again.',403);}const operation=admin?input.operation:input.planOperation||'save';
 if(operation==='evidence'){if(!admin)throw new AccessError('Principal access required.',403);const plan=c.mission.remedialPlans?.[input.planId],e=plan?.sessions?.[input.date]?.evidence;if(!e)throw new AccessError('No evidence for this class.',404);return {ok:true,photo:await read('cbse/remedialEvidence/'+e.ref)};}
 if(operation==='complete'){
  input={...input,evidence:{...input.evidence,ref:'evidence_'+randomUUID().replaceAll('-','')}};const photo=input.photo; if(typeof photo!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)||photo.length>1000000)throw new AccessError('Capture a class photo before submitting.',400);
  try{applyRemedialPlan(c.mission,c.draft,c.faculty,{...input,operation},actor,now());}catch(e){throw new AccessError(e.message,409);}
  await db.ref('cbse/remedialEvidence/'+input.evidence.ref).set({photo,capturedAt:input.evidence.capturedAt,receivedAt:now(),planId:input.planId,date:input.date,actorId:actor.id});
 }
 let output,reason='';const result=await db.ref('cbse/mission').transaction(current=>{if(current===null)return null;try{const planned=applyRemedialPlan(current,c.draft,c.faculty,{...input,operation:admin?input.operation:input.planOperation||'save'},actor,now());if(planned.needsCoordination){output=planned;return;}output={planId:planned.planId,plan:planned.next.remedialPlans?.[planned.planId]||null,missionRevision:planned.next.revision};return planned.next;}catch(e){reason=e.message;return;}});if(output?.needsCoordination&&!reason)return {ok:true,...output};if(!result.committed){if(operation==='complete')await db.ref('cbse/remedialEvidence/'+input.evidence.ref).remove();throw new AccessError(reason||'The plan could not be saved. Retry.',409);}if(operation==='delete'){const refs=Object.values(c.mission.remedialPlans?.[input.planId]?.sessions||{}).map(s=>s.evidence?.ref).filter(ref=>typeof ref==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(ref));await Promise.all(refs.map(ref=>db.ref('cbse/remedialEvidence/'+ref).remove()));}return {ok:true,...output};}
  if(['mcq-reset-all-preview','mcq-reset-all','mcq-clear-banks-preview','mcq-clear-banks','mcq-contribution-history','mcq-manage-preview','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','mcq-report-publish'].includes(action)){
   if(!pinIdentity&&!mcqPrincipal)throw new AccessError('Choose a contributor and verify their PIN.',403);const id=mcqPrincipal?'principal':pinIdentity.decoded.staffId,c=await context(),person=mcqPrincipal?null:staffIndex(c.faculty,c.mission)[id],actor={id,name:mcqPrincipal?'Principal':person.name};const selectedClass=input.classId||'X';if(!mcqPrincipal&&!['mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-answer-key'].includes(action)&&!mcqContributors(c.faculty,c.mission,selectedClass).some(t=>teacherIdentityIds(t.id,c.faculty,c.mission).includes(id)))throw new AccessError('Choose a subject teacher who teaches the selected Class '+selectedClass+'.',403);let reason='',output={},result;
   if(['mcq-reset-all-preview','mcq-reset-all','mcq-clear-banks-preview','mcq-clear-banks','mcq-contribution-history','mcq-manage-preview','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-report-publish'].includes(action)&&!mcqPrincipal)throw new AccessError('Only the Principal can manage contributions.',403);
   if(action==='mcq-report-publish'){const published=await db.ref('cbse/mcq').transaction(current=>{if(current===null)return null;try{const planned=publishMCQReport(current,c.draft,input,actor,now());output=planned.publication;return planned.next;}catch(e){reason=e.message;return;}});if(!published.committed)throw new AccessError(reason||'The report could not be published.',409);return {ok:true,publication:output};}
   if(action==='mcq-answer-key'){if(pinIdentity){const current=await read('cbse/staffAccess/'+id);if(!current?.enabled||current.version!==pinIdentity.access.version)throw new AccessError('Staff access changed. Verify your PIN again.',403);}try{return {ok:true,...readMCQAnswerKey(await read('cbse/mcq')||{},input)};}catch(e){throw new AccessError(e.message,400);}};
   if(action==='mcq-reset-all-preview')return {ok:true,...previewResetAllMCQ({mcq:await read('cbse/mcq')||{},mission:c.mission})};
   if(action==='mcq-clear-banks-preview')return {ok:true,...previewClearMCQBanks(await read('cbse/mcq')||{},c.mission)};
   if(action==='mcq-contribution-history')return {ok:true,...mcqContributionHistory(await read('cbse/mcq')||{},input)};
   if(action==='mcq-manage-preview')return {ok:true,...previewMCQContributions(await read('cbse/mcq')||{},input)};
   if(action==='mcq-reset-all'){result=await db.ref('cbse').transaction(current=>{reason='';output={};if(current===null)return null;try{if(current.adminUid!==mcqPrincipal.uid){reason='Principal access changed. Sign in again.';return;}const planned=resetAllMCQ(current,input,actor,now());output={cleared:planned.cleared,questionBankEpoch:planned.questionBankEpoch};return planned.next;}catch(e){reason=e.message;return;}});}
   else if(action==='mcq-evaluate'){if(input.correction&&!token)throw new AccessError('Only the Principal can correct an existing score.',403);const admin=mcqPrincipal||(input.correction?await principal(token):null);result=await db.ref('cbse').transaction(current=>{if(current===null)return null;try{if(mcqPrincipal?current.adminUid!==mcqPrincipal.uid:!current.staffAccess?.[id]?.enabled||current.staffAccess[id].version!==pinIdentity.access.version){reason='Access changed. Reload and verify your access again.';return;}const planned=evaluateMCQ(current,input,actor,now(),{principalUid:admin?.uid||''});output={score:planned.score,maximum:planned.maximum,evaluationId:planned.evaluationId,attendance:planned.attendance};return planned.next;}catch(e){reason=e.message;return;}});}
   else{result=await db.ref('cbse/mcq').transaction(current=>{reason='';output={};if(['mcq-paper','mcq-paper-delete','mcq-question-edit','mcq-question-delete','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-clear-banks'].includes(action)&&current===null)return null;try{const planned=action==='mcq-clear-banks'?clearMCQBanks(current||{},input,actor,now(),c.mission):['mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete'].includes(action)?manageMCQContributions(current||{},{...input,operation:action},actor,staffIndex(c.faculty,c.mission),now()):action==='mcq-contribute'?contributeMCQ(current||{},input,actor,c.draft,now(),staffIndex(c.faculty,c.mission)):action==='mcq-import-csv'?importMCQCSV(current||{},input,actor,c.draft,now(),staffIndex(c.faculty,c.mission)):['mcq-question-edit','mcq-question-delete'].includes(action)?changeMCQQuestion(current||{},{...input,operation:action},actor,now()):action==='mcq-paper-delete'?deleteMCQPaper(current||{},input,actor,now()):createMCQPaper(current||{},input,actor,now(),c.draft);output=action==='mcq-clear-banks'?{changedCount:planned.changedCount,idsRestarted:planned.idsRestarted}:['mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete'].includes(action)?{changedCount:planned.changedCount}:action==='mcq-contribute'?{batchId:planned.batchId,questionIds:planned.questionIds}:action==='mcq-import-csv'?{questionIds:planned.questionIds,addedCount:planned.addedCount,skippedCount:planned.skippedCount}:['mcq-question-edit','mcq-question-delete'].includes(action)?{questionId:planned.questionId}:{paperId:planned.paperId};return planned.next;}catch(e){reason=e.message;return;}});}
   if(!result.committed||!result.snapshot?.val())throw new AccessError(reason||'The MCQ save could not be confirmed. Reload before trying again.',409);return {ok:true,...output};
  }
  if(action==='news-principal'||action==='news-create'||action==='news-comment'){
   const admin=action==='news-principal'?await principal(token):null;if(!admin&&!pinIdentity)throw new AccessError('Use your own name and PIN to post News.',403);const c=await context(),id=admin?'principal':pinIdentity.decoded.staffId,person=admin?null:staffIndex(c.faculty,c.mission)[id];if(!admin&&person?.status!=='active')throw new AccessError('Choose an active team member.',403);const actor={id,name:admin?'Principal':person.name},values={...input,operation:admin?input.operation:action};let reason='',newsId='';
   const result=await db.ref('cbse/teamNews').transaction(current=>{reason='';newsId='';try{const planned=applyTeamNews(current||{},values,actor,now());newsId=planned.newsId;return planned.next;}catch(e){reason=e.message;return;}});if(!result.committed||!newsId)throw new AccessError(reason||'News could not be saved. Retry the same form.',409);return {ok:true,newsId};
  }
  if(action==='conversation-principal'||action==='conversation-start'||action==='conversation-reply'){
   const isPrincipal=action==='conversation-principal';if(isPrincipal)await principal(token);else if(!pinIdentity)throw new AccessError('Use your own PIN to submit conversation feedback.',403);
   const c=await context(),id=isPrincipal?'principal':pinIdentity.decoded.staffId,person=isPrincipal?null:staffIndex(c.faculty,c.mission)[id],actor={id,name:isPrincipal?'Principal':person?.name||'Staff'},operation=isPrincipal?String(input.operation||''):action==='conversation-start'?'start':'reply',values={...input,operation},ids={now:now(),threadId:'thread_'+randomUUID().replaceAll('-',''),recordId:'record_'+randomUUID().replaceAll('-','')};
   try{applyConversationOperation(c.mission,c.draft,c.faculty,values,actor,ids);}catch(error){throw new AccessError(error.message,400);}let threadId='',reason='';
   const result=await db.ref('cbse/mission').transaction(current=>{if(current===null)return null;try{const r=applyConversationOperation(current,c.draft,c.faculty,values,actor,ids);threadId=r.threadId;return r.next;}catch(error){reason=error.message;return;}});
   if(!result.committed||!threadId||!result.snapshot.val()?.conversations?.[threadId])throw new AccessError(reason||'Conversation changed. Reload and retry.',409);return {ok:true,threadId};
  }
  if(action==='save-faculty'){
   const admin=await principal(token),current=await read('cbse'),newId='faculty_'+randomUUID().replaceAll('-','');let prepared;
   try{prepared=planFacultySave(current,input,newId,now());}catch(e){throw new AccessError(e.message,400);}
   const pin=String(input.pin||'');if(!input.staffId&&!/^\d{3}$/.test(pin))throw new AccessError('Enter a three-digit initial PIN.',400);
   const pins={};for(const id of prepared.newStaffIds){const source=input.staffId?current.staffAccess?.[input.staffId]:null;if(source?.hash){const visible=decryptDisplayPIN(source,input.staffId,displayKey);pins[id]={...source};delete pins[id].displayPIN;if(visible)Object.assign(pins[id],encryptDisplayPIN(visible,id,displayKey));}else{if(!/^\d{3}$/.test(pin))throw new AccessError('Enter an initial PIN for the new standard.',400);pins[id]={...await hashPIN(pin),...encryptDisplayPIN(pin,id,displayKey),enabled:true,version:randomUUID(),updatedAt:now()};}}
   let reason='';const result=await db.ref('cbse').transaction(value=>{if(!value||value.adminUid!==admin.uid)return;try{const planned=planFacultySave(value,input,newId,now());planned.next.staffAccess||={};for(const id of planned.newStaffIds)if(!planned.next.staffAccess[id])planned.next.staffAccess[id]=pins[id];return planned.next;}catch(e){reason=e.message;return;}});
   if(!result.committed)throw new AccessError(reason||'Faculty changed. Reload and retry.',409);return {ok:true,staffId:prepared.staffId};
  }
  if(action==='directory'){const staff=await directoryStaff(),access=await read('cbse/staffAccess');return {staff:entries(access).filter(([id,a])=>a.enabled&&staff[id]?.status==='active').map(([id])=>({id,name:staff[id].name,role:staff[id].classId?`Class ${staff[id].classId} faculty`:staff[id].kind}))};}
  if(action==='login'){
   const id=String(input.staffId||'');if(!/^[a-zA-Z0-9_:-]{1,200}$/.test(id))throw new AccessError('Choose a staff member and enter the correct PIN.',401);
   const access=await read(`cbse/staffAccess/${id}`),person=(await directoryStaff())[id];if(!access?.enabled||person?.status!=='active')throw new AccessError('Choose a staff member and enter the correct PIN.',401);
   const attemptKey=await throttle(id,ip);
   if(!await verifyPIN(input.pin,access))throw new AccessError('Choose a staff member and enter the correct PIN.',401);
   const customToken=await auth.createCustomToken('mission_'+createHash('sha256').update(id).digest('hex').slice(0,40),{missionStaff:true,staffId:id,pinVersion:access.version});await db.ref(`cbse/staffAttempts/${attemptKey}`).remove();return {customToken,name:person.name};
  }
  if(['list','set-pin','disable','generate-pins','import-pins','add-faculty-pin'].includes(action)){
   const inputPrincipal=await principal(token);const staff=await directoryStaff();
   if(action==='list'){const {created}=input.generateMissing===true?await generateMissingPINs(staff):{created:[]};const access=await read('cbse/staffAccess');return {staff:Object.fromEntries(entries(staff).filter(([,t])=>t.status==='active')),created,access:Object.fromEntries(entries(access).map(([id,a])=>[id,{enabled:!!a.enabled,pinSet:!!a.hash,updatedAt:a.updatedAt,pin:decryptDisplayPIN(a,id,displayKey)}]))};}
   if(action==='add-faculty-pin'){
    const classId=String(input.classId||'');if(!['X','XII'].includes(classId))throw new AccessError('Choose Class X or XII.',400);
    if(typeof input.pin!=='string'||!/^\d{3}$/.test(input.pin))throw new AccessError('Enter exactly three digits for the initial PIN.',400);
    const teacher=Object.fromEntries(['name','designation','subjects','teachingSections'].map(k=>[k,String(input[k]||'').trim()]));teacher.status='active';
    const teacherId='faculty_'+randomUUID().replaceAll('-',''),id=`${classId}:${teacherId}`,record={...await hashPIN(input.pin),...encryptDisplayPIN(input.pin,id,displayKey),enabled:true,version:randomUUID(),updatedAt:now()};
    let validationError='';
    const result=await db.ref('cbse').transaction(current=>{
     validationError='';if(!current||current.adminUid!==inputPrincipal.uid)return;
     const next=current,roster=next.facultyDraft||emptyFaculty();roster.classes[classId].teachers||={};roster.classes[classId].teachers[teacherId]=teacher;
     try{validateFaculty(roster);}catch(error){validationError=error.message;return;}
     roster.revision++;roster.updatedAt=now();next.facultyDraft=roster;next.staffAccess||={};next.staffAccess[id]=record;return next;
    });
    if(!result.committed)throw new AccessError(validationError||'Faculty and PIN were not saved. Reload and retry.',400);
    return {ok:true,classId,teacherId,teacher,revision:result.snapshot.val().facultyDraft.revision,access:{enabled:true,pinSet:true}};
   }
   if(action==='import-pins'){
    let rows;try{rows=validatePINRows(input.rows,staff);}catch(error){throw new AccessError(error.message,400);}
    const prepared=[];for(const r of rows)prepared.push({id:r.staffId,record:{...await hashPIN(r.pin),...encryptDisplayPIN(r.pin,r.staffId,displayKey),enabled:r.enabled,version:randomUUID(),updatedAt:now()}});
    const result=await db.ref('cbse/staffAccess').transaction(current=>{const next=current||{};for(const p of prepared)next[p.id]=p.record;return next;});
    if(!result.committed)throw new AccessError('PIN update did not save. Try again.',409);
    return {ok:true,updated:prepared.length,access:Object.fromEntries(prepared.map(p=>[p.id,{enabled:p.record.enabled,pinSet:true,updatedAt:p.record.updatedAt}]))};
   }
   if(action==='generate-pins')return generateMissingPINs(staff);
   const id=String(input.staffId||'');if(!staff[id])throw new AccessError('Staff member not found.',404);
   if(action==='set-pin'){if(staff[id].status!=='active')throw new AccessError('Enable this staff member first.',400);const hash=await hashPIN(input.pin);await revoke(id);await db.ref(`cbse/staffAccess/${id}`).set({...hash,...encryptDisplayPIN(input.pin,id,displayKey),enabled:true,version:randomUUID(),updatedAt:now()});}
   else{await revoke(id);await db.ref(`cbse/staffAccess/${id}`).update({enabled:false,version:randomUUID(),updatedAt:now()});}
   return {ok:true};
  }
  const identity=pinIdentity||await staffUser(token),{decoded}=identity,id=decoded.staffId;if(!pinIdentity&&['comment','teacher-comment','update-contact','update-task','conversation-start','conversation-reply'].includes(action))await verifySubmissionPIN(id,input.pin,identity.access,ip);const c=await context();
  if(staffIndex(c.faculty,c.mission)[id]?.status!=='active')throw new AccessError('Staff access is inactive.');
  if(action==='students')return {staff:staffIndex(c.faculty,c.mission)[id]?.name,students:entries(studentIndex(c.draft)).map(([key,p])=>({key,name:p.name,roll:p.roll,classId:p.classId,section:p.section,assigned:staffCanView(id,key,c.mission,c.draft,c.faculty),academic:staffCanView(id,key,c.mission,c.draft,c.faculty)?studentProgress(key,c.mission,c.draft).academic:'grey'}))};
  if(action==='teacher-comment'){
   const teacherId=String(input.teacherId||''),target=staffIndex(c.faculty,c.mission)[teacherId],notes=String(input.notes||'').trim(),requestedReply=String(input.replyToRecord||'');
   if(!target||target.status!=='active'||!notes||notes.length>2000)throw new AccessError('Choose an active teacher and enter a comment of up to 2000 characters.',400);
   if(!teacherIdentityIds(teacherId,c.faculty,c.mission).includes(id))throw new AccessError('Only this teacher may submit a PIN reply on this profile.',403);
   const recordId='record_'+randomUUID().replaceAll('-','');let reason='';
   const result=await db.ref('cbse/mission').transaction(current=>{reason='';if(current===null)return null;const m=current,identities=teacherIdentityIds(teacherId,c.faculty,m),replyToRecord=requestedReply||teacherConversation(m.records,identities).pending.at(-1)||'',original=m.records?.[replyToRecord];if(staffIndex(c.faculty,m)[id]?.status!=='active')return;if(replyToRecord&&(!original||!teacherIdentityIds(teacherId,c.faculty,m).includes(original.staffId)||original.studentKey||original.authorId!=='principal'||original.visibility!=='general')){reason='This Principal comment is not available for reply.';return;}m.records||={};m.records[recordId]={kind:'faculty_comment',date:today(),studentKey:'',staffId:teacherId,sectionKey:'',subjectId:'',notes,outcome:'',visibility:'general',authorId:id,authorName:staffIndex(c.faculty,m)[id]?.name||target.name,authorRole:'faculty_support',replyToRecord,updatedAt:now()};m.revision=(m.revision||0)+1;m.updatedAt=now();return m;});
   if(!result.committed||!result.snapshot.val()?.records?.[recordId])throw new AccessError(reason||'Teacher status changed. Reload before replying.',409);return {ok:true};
  }
  const key=String(input.studentKey||'');if(!/^(X|XII):[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(key)||!studentIndex(c.draft)[key])throw new AccessError('Student not found.',404);
  if(action==='profile'){if(staffCanView(id,key,c.mission,c.draft,c.faculty))return {...staffProfileView(id,key,c.mission,c.draft,c.faculty),assigned:true};const p=studentIndex(c.draft)[key];return {student:{key,name:p.name,roll:p.roll,classId:p.classId,section:p.section,stream:p.stream},assigned:false,progress:null,contact:null,mapLocation:c.mission.students?.[key]?.mapLocation||'',contactRevision:c.mission.students?.[key]?.revision||0,roles:staffStudentRoles(id,studentIndex(c.draft)[key],c.faculty,c.mission),tasks:[],records:entries(c.mission.records).filter(([,r])=>r.studentKey===key&&r.authorId===id).map(([id,r])=>staffVisibleRecord(id,r))};}
  if(action==='update-contact'){
   const patch=input.contact;if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new AccessError('Invalid contact update.',400);
   const allowed=['mapLocation','location','numbers'];if(Object.keys(patch).some(k=>!allowed.includes(k)))throw new AccessError('Only phone numbers, address or map location can be updated.',400);
   if(!pinIdentity&&Object.keys(patch).some(k=>k!=='mapLocation')&&!staffCanView(id,key,c.mission,c.draft,c.faculty))throw new AccessError('Phone/address updates require an assigned student.',403);
   if(!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)throw new AccessError('Reload the contact record before updating.',409);
   let failed='';const auditId='contact_'+randomUUID().replaceAll('-','');const changedAt=now();const result=await db.ref('cbse/mission').transaction(current=>{
    if(current===null)return null;failed='';if(staffIndex(c.faculty,current)[id]?.status!=='active')return;
    if(!pinIdentity&&Object.keys(patch).some(k=>k!=='mapLocation')&&!staffCanView(id,key,current,c.draft,c.faculty))return;
    try{return planStudentContactUpdate(current,key,patch,{id,name:staffIndex(c.faculty,current)[id].name},input.expectedRevision,changedAt,auditId).next;}catch(error){failed=error.message;return;}
   });const saved=result.snapshot?.val()?.students?.[key];if(!result.committed||!saved)throw new AccessError(failed||'Contact update could not be confirmed. Reload before updating.',failed?.includes('changed')?409:400);return {ok:true,studentKey:key,revision:saved.revision||0,contact:Object.fromEntries(['gender','guardian','phones','location','mapLocation','numbers','email','revision','updatedBy','updatedByName','updatedAt'].filter(k=>saved[k]!==undefined).map(k=>[k,saved[k]]))};
  }
  if(action==='comment'){
   const notes=String(input.notes||'').trim();if(!notes||notes.length>2000)throw new AccessError('Enter a progress comment of up to 2000 characters.',400);
   const channel=String(input.channel||'progress');if(!['progress','call','home_visit'].includes(channel))throw new AccessError('Choose a valid contact/remark type.',400);
   const roles=staffStudentRoles(id,studentIndex(c.draft)[key],c.faculty,c.mission),role=String(input.role||'faculty_support'),subjectId=String(input.subjectId||'');
   if(!['class_teacher','subject_teacher','faculty_support'].includes(role)||role==='class_teacher'&&!roles.classTeacher||role==='subject_teacher'&&!roles.subjects.some(s=>s.id===subjectId))throw new AccessError('This CT/subject role is not assigned to you for this student.',403);
   const taskId=String(input.taskId||'');if(taskId&&!(c.mission.tasks?.[taskId]?.staffId===id&&(c.mission.tasks[taskId].studentKey===key||!c.mission.tasks[taskId].studentKey&&c.mission.tasks[taskId].sectionKey===`${studentIndex(c.draft)[key].classId}:${studentIndex(c.draft)[key].sectionId}`)))throw new AccessError('You can reply only to your own assigned action.',403);
   const requestId=String(input.requestId||''),requestTargetId=String(input.requestTargetId||'');
   const replyToRecord=String(input.replyToRecord||''),validReply=m=>{if(!replyToRecord)return true;const r=m.records?.[replyToRecord];return !!r&&r.studentKey===key&&r.visibility==='general'&&['faculty_comment','contact'].includes(r.kind)&&(!r.subjectId||role==='subject_teacher'&&r.subjectId===subjectId||role!=='subject_teacher');};if(!validReply(c.mission))throw new AccessError('This progress remark is unavailable for reply.',403);
   const validRequest=m=>{if(!requestId)return true;const r=m.reportRequests?.[requestId],target=r?.targets?.[requestTargetId];return r?.studentKey===key&&r.status!=='cancelled'&&target?.staffId===id&&target.role===role&&(target.subjectId||'')===(role==='subject_teacher'?subjectId:'');};
   if(!validRequest(c.mission))throw new AccessError('This reporting request is not assigned to this teacher/role.',403);
   const recordId='record_'+randomUUID().replaceAll('-','');
   const result=await db.ref('cbse/mission').transaction(current=>{if(current===null)return null;const m=current;if(staffIndex(c.faculty,m)[id]?.status!=='active')return;m.records||={};if(taskId){const task=m.tasks?.[taskId],person=studentIndex(c.draft)[key];if(!task||task.staffId!==id||task.status==='cancelled'||!(task.studentKey===key||!task.studentKey&&task.sectionKey===`${person.classId}:${person.sectionId}`))return;}if(!validRequest(m)||!validReply(m))return;const liveRoles=staffStudentRoles(id,studentIndex(c.draft)[key],c.faculty,{...m,allocations:resolvedAllocations(c.draft,c.faculty,m)});if(role==='class_teacher'&&!liveRoles.classTeacher||role==='subject_teacher'&&!liveRoles.subjects.some(s=>s.id===subjectId))return;m.records[recordId]={requestId,requestTargetId,replyToRecord,details:channel==='progress'?{}:{channel},authorRole:role,replyTo:taskId,kind:channel==='progress'?'faculty_comment':'contact',date:today(),studentKey:key,staffId:id,sectionKey:'',subjectId:role==='subject_teacher'?subjectId:'',notes,outcome:'',evidenceUrl:'',visibility:'general',authorId:id,authorName:staffIndex(c.faculty,m)[id]?.name||'Staff',updatedAt:now()};if(requestId)for(const task of Object.values(m.tasks||{}))if(task.requestId===requestId&&task.requestTargetId===requestTargetId&&task.staffId===id&&task.status!=='cancelled'){task.status='done';task.outcome=notes;task.updatedAt=now();}m.revision=(m.revision||0)+1;m.updatedAt=now();return m;});if(!result.committed||!result.snapshot.val()?.records?.[recordId])throw new AccessError('Assignment changed. Reload your student list.');return {ok:true};
  }
  if(action==='update-task'){
   const taskId=String(input.taskId||''),status=String(input.status||''),outcome=String(input.outcome||'').trim();if(!['open','in_progress','done'].includes(status)||outcome.length>2000)throw new AccessError('Invalid task update.',400);
   const result=await db.ref('cbse/mission').transaction(current=>{if(!current?.tasks?.[taskId]||current.tasks[taskId].status==='cancelled'||current.tasks[taskId].staffId!==id||!(current.tasks[taskId].studentKey===key||!current.tasks[taskId].studentKey&&current.tasks[taskId].sectionKey===`${studentIndex(c.draft)[key].classId}:${studentIndex(c.draft)[key].sectionId}`))return;current.tasks[taskId]={...current.tasks[taskId],status,outcome,updatedAt:now()};if(outcome){current.records||={};current.records['reply_'+randomUUID().replaceAll('-','')]={kind:'faculty_comment',date:today(),studentKey:key,staffId:id,sectionKey:'',subjectId:'',notes:outcome,outcome:'',visibility:'general',authorId:id,authorName:staffIndex(c.faculty,current)[id]?.name||'Staff',authorRole:'faculty_support',replyTo:taskId,updatedAt:now()};}current.revision++;current.updatedAt=now();return current;});if(!result.committed)throw new AccessError('Task is not assigned to you.');return {ok:true};
  }
  throw new AccessError('Unknown action.',400);
 };
}
