import {afternoonLeaveExemption} from '../cbse-roll-call-leave.js';
import {applyStaffMeeting,meetingAttendanceDefaults,meetingRoster,meetingAttendanceRoster,canOpenMeeting,meetingMinute,meetingReport,publishedMeetingReport,staffMeetingList,minuteLanguages} from '../cbse-staff-meetings-model.js';
import {withTaskExamParticipation} from './task-exam-participation.js';
import {createPINPolicy} from './pin-policy.js';
import {createMissingStaffPINGenerator} from './staff-pin-allocation.js';
import {primaryDirectory,primaryStaffEntry} from '../cbse-primary-roster.js';
import {planPrimaryRosterProfiles} from '../cbse-primary-setup.js';
import {TASK1_ROSTER,taskRosterStore} from '../cbse-task-manager-roster.js';
import {TASK1} from './task-manager-seed.js';
import {applyTask,taskView,taskCatalogue} from '../cbse-task-manager-model.js';
import {createOfficeService} from './office-service.js';
import {createRevisionReadCache} from './revision-read-cache.js';
import {creditQuestions,creditPapers,creditEvaluations,creditPosts,creditMission} from './credit-source-data.js';
import {applyMovement,movementView,movementToday,movementCanApprove} from '../cbse-movement-model.js';
import {NOTIFICATION_SOURCES,notificationsForScope} from '../cbse-notification-scope.js';
import {rollRoleDirectory} from '../cbse-roll-call-roles.js';
import {isGangaDeviProfile,avinashBibekIdentityIds} from '../cbse-faculty-guest.js';
import {missionMemberAllowed} from '../cbse-mission-membership.js';
import {createPINAttemptLimiter} from './pin-attempts.js';
import {creditSummary,applyCreditClaim} from '../cbse-contribution-credit-model.js';
import {decoratePrincipalNotifications,notificationAccountKey,applyNotificationSeen} from './principal-notification-state.js';
import {principalNotifications} from '../cbse-principal-notifications.js';
import {isWinterTimetableTeacher} from '../cbse-winter-timetable.js';
import {mcqEvaluationTransaction,mcqTransaction} from './mcq-transaction.js';
import {readPublishedVemsAttendance} from './vems-attendance.js';
import {matchVemsAttendance} from '../cbse-vems-attendance.js';
import {examCentrePaper,examCentreRoster,examCentreRecords,examCentreToday,applyExamCentreAttendance,applyExamCentreAttendanceBatch} from '../cbse-exam-centre-model.js';
import {publicAdvanceLeaves} from '../cbse-advance-leave-model.js';
import {defaultReporting,publishedReporting,applyReporting} from '../cbse-reporting-model.js';
import {applyPodcast,teacherPodcasts,acknowledgePodcast,podcastCatalogue} from '../cbse-podcast-model.js';
import {rollStaffIdentityIds,secondaryStaffEntry} from '../cbse-roll-call-roster.js';
import {planRollRosterProfiles} from '../cbse-roll-call-setup.js';
import {rollReportingStaff,rollDisplayName} from '../cbse-roll-call-roster.js';
import {applyRollCall,rollWing,rollToday,rollNoAnswers,nocGroupKey} from '../cbse-roll-call-model.js';
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
const rollPublicNOC=(objections,date)=>{
 const holds=entries(objections),counts=new Map();
 for(const [,hold]of holds){
  const key=nocGroupKey(hold,date);
  if(key&&hold.status==='open')counts.set(key,(counts.get(key)||0)+1);
 }
 return holds.filter(([,o])=>o.status==='open'||o.status==='cleared'&&o.clearedAt&&rollToday(o.clearedAt)===date)
  .map(([id,o])=>({id,staffId:o.staffId,createdBy:o.createdBy,createdName:o.createdName||'IC',principal:o.kind==='principal-hold'||o.createdBy==='principal',status:o.status,groupSize:counts.get(nocGroupKey(o,date))||0}));
};
const rollPublicReport=r=>({...Object.fromEntries(['staffId','name','wing','date','period','workflowVersion','morningMode','teacherEditLockedAt','reported','status','hasNoAnswers','requiresCommentReview','requiresReview','approvalRequired','reviewedAt','principalComments','leaveType','halfDay','from','to','updatedAt','submittedAt','approvedAt','rejectedAt'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])),hasNoAnswers:!!r.hasNoAnswers||rollNoAnswers(r).length>0});
export function createStaffService({db,auth,restTransaction,readVemsAttendance=readPublishedVemsAttendance,now=Date.now,displayKey,viewSecret=defaultViewSecret}){
 const read=async path=>(await db.ref(path).get()).val();
 const readVersioned=createRevisionReadCache({read});
 async function context(){const [draft,faculty,mission]=await Promise.all([read('cbse/draft'),read('cbse/facultyDraft'),read('cbse/mission')]);return {draft,...resolvedViewingData(draft,faculty,mission||emptyMission())};}
 async function creditContext({fresh=true}={}){
  const[ draft,faculty,mission,evaluations,posts,questions,papers]=await Promise.all([
   readVersioned('cbse/draft','cbse/draft/revision',{fresh}),readVersioned('cbse/facultyDraft','cbse/facultyDraft/revision',{fresh}),readVersioned('cbse/mission','cbse/mission/revision',{fresh,project:creditMission}),
   readVersioned('cbse/mcq/evaluations','cbse/mcq/revision',{fresh,project:creditEvaluations}),readVersioned('cbse/teamNews/posts','cbse/teamNews/revision',{fresh,project:creditPosts}),readVersioned('cbse/mcq/questions','cbse/mcq/revision',{fresh,project:creditQuestions}),readVersioned('cbse/mcq/papers','cbse/mcq/revision',{fresh,project:creditPapers})]);
  return {draft,...resolvedViewingData(draft,faculty,mission||emptyMission()),evaluations:evaluations||{},posts:posts||{},questions:questions||{},papers:papers||{}};
 }
 async function notificationRead(path,fresh){const parent=path.startsWith('cbse/mission/')?'cbse/mission':path.startsWith('cbse/mcq/')?'cbse/mcq':path.startsWith('cbse/teamNews/')?'cbse/teamNews':path.startsWith('cbse/rollCall/')?'cbse/rollCall':path.startsWith('cbse/contributionCredits/')?'cbse/contributionCredits':path.startsWith('cbse/chamber/movements/')?'cbse/chamber/movements':path==='cbse/chamber/podcasts'?'cbse/chamber/podcasts':'';return parent?readVersioned(path,parent+'/revision',{fresh,key:'notification:'+path}):read(path);}
 async function notificationStaffNames(fresh){const[faculty,support]=await Promise.all([readVersioned('cbse/facultyDraft','cbse/facultyDraft/revision',{fresh}),readVersioned('cbse/mission/staff','cbse/mission/revision',{fresh})]);return Object.fromEntries(entries(staffIndex(faculty,{staff:support||{}},{includeRollOnly:true})).map(([id,p])=>[id,p.name]));}

 async function directoryStaff(){const[faculty,support,draft]=await Promise.all([read('cbse/facultyDraft'),read('cbse/mission/staff'),read('cbse/draft')]);const staff=primaryDirectory(rollRoleDirectory(staffIndex(faculty,{staff:support||{}},{includeRollOnly:true}),faculty,draft?.classes));return Object.fromEntries(entries(staff).map(([id,p])=>{const owner=avinashBibekIdentityIds(id,faculty,{staff:support||{}})?.[0];return [id,owner?{...p,pinOwnerId:owner}:p];}));}
 const pinPolicy=createPINPolicy({db,read,restTransaction,getStaff:async()=>primaryDirectory(await officeDirectoryStaff()),displayKey,verifyPIN,AccessError});
 const generateMissingPINs=createMissingStaffPINGenerator({db,read,restTransaction,displayKey,hashPIN,verifyPIN,now,identityIds:rollStaffIdentityIds,AccessError});
 // Fixed, Principal-approved roster migration; no request-supplied names, roles or PINs.
 // Staff may enter Roll Call without first visiting the Principal's Settings.
 async function preparePrimaryRoster(){
  const [mission,faculty]=await Promise.all([read('cbse/mission'),read('cbse/facultyDraft')]);
  if(planPrimaryRosterProfiles(mission,faculty||emptyFaculty(),now()).created.length){
   const result=await db.ref('cbse/mission').transaction(current=>planPrimaryRosterProfiles(current,faculty||emptyFaculty(),now()).next);
   if(!result.committed||!result.snapshot.val())throw new AccessError('The Primary staff list could not be prepared. Refresh Roll Call to retry.',409);
  }
 }
 async function principal(token){const decoded=await auth.verifyIdToken(token,true),uid=await read('cbse/adminUid');if(decoded.uid!==uid)throw new AccessError('Principal access required.');return decoded;}
 async function staffUser(token){const decoded=await auth.verifyIdToken(token,true);if(decoded.missionStaff!==true||typeof decoded.staffId!=='string')throw new AccessError('Staff access required.');const access=await read(`cbse/staffAccess/${decoded.staffId}`);if(!access?.enabled||decoded.pinVersion!==access.version)throw new AccessError('Staff access has been disabled or reset. Sign in again.');return {decoded,access};}
 const pinAttempts=createPINAttemptLimiter({db,restTransaction,now});
 async function pinDatabase(operation){try{return await operation();}catch(error){console.error('PIN_DATABASE_REQUEST_FAILED',String(error?.code||'database-request'));throw new AccessError('PIN verification could not reach the database. No save was attempted. Please retry in a moment.',503);}}
 async function throttle(staffId,ip){const ticket=await pinDatabase(()=>pinAttempts.reserve(staffId,ip));if(!ticket.allowed)throw new AccessError('Too many PIN attempts. Try again in 15 minutes.',429);return ticket;}
 async function verifySubmissionPIN(id,pin,access,ip,profile){
  const owner=(profile||(await directoryStaff())[id])?.pinOwnerId;if(owner&&owner!==id){id=owner;access=await read('cbse/staffAccess/'+owner);if(!access?.enabled)throw new AccessError('Staff PIN access is disabled.',403);}
  if(!pin)throw new AccessError('Enter your personal PIN for this submission on the student profile.',403);
  const ticket=await throttle(id,'submit|'+ip);if(!await verifyPIN(pin,access))throw new AccessError('The PIN does not match this staff member.',401);await pinPolicy.assertSelected(pin,'staff:'+id);await pinDatabase(()=>pinAttempts.clear(ticket));
 }
 async function revoke(staffId){try{await auth.revokeRefreshTokens('mission_'+createHash('sha256').update(staffId).digest('hex').slice(0,40));}catch(e){if(e.code!=='auth/user-not-found')throw e;}}
 const sharedView=createSharedView({db,context,now,defaultSecret:viewSecret});
 async function officeDirectoryStaff(){const[faculty,support]=await Promise.all([readVersioned('cbse/facultyDraft','cbse/facultyDraft/revision',{fresh:true}),readVersioned('cbse/mission/staff','cbse/mission/revision',{fresh:true})]);const mission={staff:support||{}};return Object.fromEntries(entries(staffIndex(faculty,mission,{includeRollOnly:true})).map(([id,p])=>[id,{...p,officeIdentityIds:teacherIdentityIds(id,faculty,mission)}]));}
 const officeService=createOfficeService({db,read,principal,hashPIN,verifyPIN,pinPolicy,throttle,clearAttempt:ticket=>pinDatabase(()=>pinAttempts.clear(ticket)),displayKey,now,directoryStaff:officeDirectoryStaff,sharedView,AccessError});
 return async function handle(action,input={},token='',ip='unknown',session={}){
  if(action==='task-principal'||action==='task-read'){
   const admin=action==='task-principal';if(admin)await principal(token);
   const staff=await directoryStaff(),actor={principal:admin,ids:[]};
   const directory=Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active').map(([id,p])=>[id,{name:p.name,status:p.status}]));
   const stored=withTaskExamParticipation(taskRosterStore(await read('cbse/taskManager'),staff,rollStaffIdentityIds));if(!admin)return taskCatalogue(stored,staff,TASK1_ROSTER);
   if(!input.operation||input.operation==='read')return {...taskView(stored,actor),staff:directory,classFigures:stored.classFigures||{}};
   let reason='';const id='task_'+randomUUID().replaceAll('-',''),known=await read('cbse/taskManager');
   const result=await mcqTransaction(db,'cbse/taskManager',current=>{if(current===null&&known!==null)return null;reason='';try{const normalized=withTaskExamParticipation(taskRosterStore(current,staff,rollStaffIdentityIds));return applyTask(normalized,input.operation==='create-task1'?{...input,draft:TASK1}:input,actor,staff,now(),id);}catch(e){reason=e.message;return;}},{restTransaction});
   if(!result.committed||!result.snapshot?.val())throw new AccessError(reason||'Task save was not confirmed. Refresh before retrying.',409);
   return {...taskView(withTaskExamParticipation(result.snapshot.val()),actor),staff:directory,classFigures:result.snapshot.val().classFigures||{},taskId:input.operation==='create-task1'?'task1':input.taskId||id};
  }
  if(action.startsWith('office-'))return officeService(action,input,token,ip,session);
  if(['view-login','view-data','view-version','view-student-photo','view-student-photos','view-logout'].includes(action)){const result=await sharedView(action,{...input,ip},session.viewerToken||'');if(result?.error){const error=new AccessError(result.error,result.status);error.curtainRequired=result.curtainRequired;throw error;}return result;}
  if(action==='mcq-read'||action==='news-read'){if(token)await principal(token);else{const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}if(action==='news-read'){const output=value=>{try{return readTeamNews(value,input);}catch(e){throw new AccessError(e.message,400);}};if(input.photoId){if(typeof input.photoId!=='string'||!/^news_[A-Za-z0-9_-]{8,80}$/.test(input.photoId))throw new AccessError('Choose a News photo.',400);const [post,photo]=await Promise.all([read('cbse/teamNews/posts/'+input.photoId),read('cbse/teamNews/photos/'+input.photoId)]);return output({posts:post?{[input.photoId]:post}:{},photos:{[input.photoId]:photo}});}const [posts,revision]=await Promise.all([read('cbse/teamNews/posts'),read('cbse/teamNews/revision')]);return output({posts:posts||{},revision:revision||0});}return publicMCQBank(await read('cbse/mcq')||{},input);}
  if(action==='credits-read'||action==='credits-principal'){
   if(token)await principal(token);else{const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}
   if(action==='credits-principal'&&!token)throw new AccessError('Principal access required.',403);
   if(action==='credits-principal'&&input.operation==='evidence'){if(typeof input.claimId!=='string'||!/^credit_[A-Za-z0-9_-]{8,80}$/.test(input.claimId))throw new AccessError('Choose a valid credit claim.',400);const evidence=await read('cbse/contributionCredits/evidence/'+input.claimId);if(!evidence)throw new AccessError('Evidence has not been attached to this claim.',404);return {ok:true,photo:evidence.photo||'',reference:evidence.reference||'',submittedAt:evidence.submittedAt};}
   const data=await creditContext({fresh:action!=='credits-read'});
   if(action==='credits-read'){const [claims,revision]=await Promise.all([readVersioned('cbse/contributionCredits/claims','cbse/contributionCredits/revision'),read('cbse/contributionCredits/revision')]);const summary=creditSummary(data,{claims:claims||{},revision:revision||0},now());return input.compact?{generatedAt:summary.generatedAt,members:summary.members,totalPoints:summary.totalPoints,pendingCount:summary.pendingCount}:summary;}
   const known=await read('cbse/contributionCredits');let reason='',claimId='';const result=await mcqTransaction(db,'cbse/contributionCredits',current=>{if(current===null&&known!==null)return null;try{const planned=applyCreditClaim(current||{},input,{id:'principal'},data,now());claimId=planned.claimId;reason='';return planned.next;}catch(e){reason=e.message;return;}},{restTransaction});
   if(!result.committed||!result.snapshot?.val())throw new AccessError(reason||'Credit review was not confirmed. Refresh before retrying.',409);return {ok:true,claimId};
  }
  if(action==='principal-notifications'){
   const admin=await principal(token),scope=input.scope||'mission';if(typeof scope!=='string'||!Object.hasOwn(NOTIFICATION_SOURCES,scope))throw new AccessError('Choose Mission 100 or Principal Chamber notifications.',400);if(![undefined,'read','seen'].includes(input.operation))throw new AccessError('Choose a valid notification action.',400);const seenPath='cbse/principalNotificationSeen/'+notificationAccountKey(admin.uid);const paths={remedialPlans:'cbse/mission/remedialPlans',records:'cbse/mission/records',conversations:'cbse/mission/conversations',reportRequests:'cbse/mission/reportRequests',tasks:'cbse/mission/tasks',rollReports:'cbse/rollCall/reports',advanceLeaves:'cbse/rollCall/advanceLeaves',objections:'cbse/rollCall/objections',mcqBatches:'cbse/mcq/batches',mcqEvaluations:'cbse/mcq/evaluations',newsPosts:'cbse/teamNews/posts',attendance:'cbse/examCentreAttendance',contactAudit:'cbse/mission/contactAudit',contributionClaims:'cbse/contributionCredits/claims',podcasts:'cbse/chamber/podcasts',movementRequests:'cbse/chamber/movements/requests'};
   const [values,staff,seen]=await Promise.all([Promise.all(Object.entries(paths).filter(([key])=>NOTIFICATION_SOURCES[scope].includes(key)).map(async([key,path])=>[key,await notificationRead(path,input.operation==='seen')||{}])),notificationStaffNames(input.operation==='seen'),read(seenPath)]);const data={...Object.fromEntries(values),staffNames:staff},generatedAt=now(),summary=notificationsForScope(decoratePrincipalNotifications(principalNotifications(data,generatedAt),data,seen||{},generatedAt,input.includeSeen===true),scope);
   if(input.operation==='seen'){if(!/^[a-f0-9]{64}$/.test(input.key||'')||!/^[a-f0-9]{64}$/.test(input.version||''))throw new AccessError('Refresh notifications before marking Seen.',400);const item=[...summary.pending,...summary.recent,...summary.news].find(i=>i.key===input.key&&i.version===input.version);if(!item)throw new AccessError('This notification changed or is no longer active. Refresh and review the latest update.',409);const saved=await db.ref(seenPath+'/'+item.key).transaction(current=>applyNotificationSeen(current,item,generatedAt));if(!saved.committed||!Object.hasOwn(saved.snapshot?.val()?.versions||{},item.version))throw new AccessError('Seen status could not be confirmed. Please retry.',409);return {ok:true,key:item.key,version:item.version,seen:true};}
   return {ok:true,...summary};
  }
  if(action==='exam-attendance-read'){
   let admin=false;if(token){await principal(token);admin=true;}else{const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}
   if(!['X','XII'].includes(input.classId))throw new AccessError('Choose Class X or XII.',400);const classDraft=await read('cbse/draft/classes/'+input.classId),draft={classes:{[input.classId]:classDraft}};let paper;try{paper=examCentrePaper(draft,input);}catch(e){throw new AccessError(e.message,400);}if(input.exam==='preboard1'||input.exam==='preboard2'){let source;try{source=matchVemsAttendance(await readVemsAttendance({displayKey}),paper,draft);}catch(e){throw new AccessError(e.message,503);}if(paper.date>examCentreToday(now())){source.records={};source.note='Attendance opens on the scheduled exam date. Submit in VEMS on that day.';}const {records,...vems}=source,revision='vems_'+createHash('sha256').update(JSON.stringify(source)).digest('hex').slice(0,20);if(input.attendanceOnly===true)return revision===input.revision?{ok:true,unchanged:true,revision,serverDate:examCentreToday(now())}:{ok:true,records,revision,vems,serverDate:examCentreToday(now())};const contacts=await read('cbse/mission/students');return {ok:true,paper,students:examCentreRoster(draft,contacts,paper),records,revision,vems,serverDate:examCentreToday(now()),serverTime:now(),principal:admin};}if(input.attendanceOnly===true){const revision=await read('cbse/examCentreAttendance/'+paper.storeKey+'/revision')||0;if(revision===input.revision)return {ok:true,unchanged:true,revision,serverDate:examCentreToday(now())};const students=await read('cbse/examCentreAttendance/'+paper.storeKey+'/students')||{};return {ok:true,records:examCentreRecords({students},admin),revision,serverDate:examCentreToday(now())};}const [contacts,value]=await Promise.all([read('cbse/mission/students'),read('cbse/examCentreAttendance/'+paper.storeKey)]);return {ok:true,revision:value?.revision||0,paper,students:examCentreRoster(draft,contacts,paper),records:examCentreRecords(value||{},admin),serverDate:examCentreToday(now()),serverTime:now(),principal:admin};
  }
  if(action==='contact-principal'){
   await principal(token);const c=await context(),key=String(input.studentKey||'');if(!/^(X|XII):[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(key)||!studentIndex(c.draft)[key])throw new AccessError('Student not found.',404);
   let failure='';const auditId='contact_'+randomUUID().replaceAll('-',''),changedAt=now();const result=await db.ref('cbse/mission').transaction(current=>{if(current===null)return null;failure='';try{return planStudentContactUpdate(current,key,input.contact,{id:'principal',name:'Principal'},input.expectedRevision,changedAt,auditId,{principal:true}).next;}catch(e){failure=e.message;return;}}),saved=result.snapshot?.val()?.students?.[key];if(!result.committed||!saved)throw new AccessError(failure||'Contact update was not confirmed. Reopen the student to check before retrying.',409);
   return {ok:true,studentKey:key,missionRevision:result.snapshot.val().revision,contact:Object.fromEntries(['gender','guardian','phones','location','mapLocation','numbers','email','revision','updatedBy','updatedByName','updatedAt'].filter(k=>saved[k]!==undefined).map(k=>[k,saved[k]]))};
  }
  if(action==='chamber-read'){
   if(token)await principal(token);else{const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}const [reporting,podcasts,staff]=await Promise.all([read('cbse/chamber/reporting'),read('cbse/chamber/podcasts'),directoryStaff()]);return {reporting:publishedReporting(reporting),videos:podcastCatalogue(podcasts,staff)};
  }
  if(action==='chamber-principal'){
   await principal(token);const operation=input.operation,staff=await directoryStaff();if(operation==='read'){const value=await read('cbse/chamber')||{};return {reporting:value.reporting||{revision:0,draft:defaultReporting(),published:publishedReporting(null)},podcasts:value.podcasts||{},staff:Object.fromEntries(entries(staff).map(([id,p])=>[id,{name:p.name,designation:p.designation,wing:rollWing(p),status:p.status,classTeacher:p.classTeacher,coClassTeacher:p.coClassTeacher}]))};}
   let reason='',result;const id='podcast_'+randomUUID().replaceAll('-','');if(['reporting-save','reporting-publish'].includes(operation)){const known=await read('cbse/chamber/reporting');result=await db.ref('cbse/chamber/reporting').transaction(current=>{if(current===null&&known!==null)return null;try{return applyReporting(current,input,now());}catch(e){reason=e.message;return;}});}else if(['podcast-save','podcast-publish','podcast-unpublish','podcast-delete','podcast-pending-publish','podcast-pending-hide'].includes(operation)){const known=await read('cbse/chamber/podcasts');result=await db.ref('cbse/chamber/podcasts').transaction(current=>{if(current===null&&known!==null)return null;try{return applyPodcast(current,input,staff,now(),id).next;}catch(e){reason=e.message;return;}});}else throw new AccessError('Unknown Chamber operation.',400);if(!result.committed||result.snapshot.val()===null)throw new AccessError(reason||'Content changed. Reload and retry.',409);return {ok:true,id:input.id||id};
  }
  if(action==='primary-staff-setup'){
   const admin=await principal(token);if(input.prepareOnly){await preparePrimaryRoster();return {ok:true};}let created=0,matched=0;const result=await db.ref('cbse').transaction(current=>{if(current===null)return null;if(!current||current.adminUid!==admin.uid)return;const plan=planPrimaryRosterProfiles(current.mission,current.facultyDraft||emptyFaculty(),now());created=plan.created.length;matched=plan.matched.length;return {...current,mission:plan.next};});if(!result.committed||!result.snapshot.val())throw new AccessError('Primary Wing setup could not be saved. Retry.',409);
   const eligible=Object.fromEntries(entries(await directoryStaff()).filter(([,p])=>primaryStaffEntry(p)&&p.status==='active'));const pins=await generateMissingPINs(eligible);return {ok:true,createdStaff:created,matchedStaff:matched,createdPins:pins.created.length};
  }
  if(action==='roll-call-setup'){
   const admin=await principal(token);
   const requested=input.rosterName,entry=typeof requested==='string'?secondaryStaffEntry({name:requested}):null;
   if(requested!==undefined&&(!entry||!rollReportingStaff(entry)))throw new AccessError('Choose a staff member from the Secondary Roll Call roster.',400);
   let created=0;
   const result=await mcqTransaction(db,'cbse',current=>{
    if(current===null)return null;
    if(current.adminUid!==admin.uid)return;
    const plan=planRollRosterProfiles(current.mission,current.facultyDraft||emptyFaculty(),now(),entry?.serial);
    created=plan.created.length;return {...current,mission:plan.next};
   },{restTransaction});
   if(!result.committed||!result.snapshot.val()?.mission)throw new AccessError('Staff setup could not be saved. Retry.',409);
   const eligible=Object.fromEntries(entries(await directoryStaff()).filter(([,p])=>rollReportingStaff(p)&&(!entry||secondaryStaffEntry(p)?.serial===entry.serial)));
   if(entry&&!Object.values(eligible).some(p=>p.status==='active'))throw new AccessError('This roster profile is inactive. Review it in Staff / Faculty.',409);
   const pins=await generateMissingPINs(eligible);
   return {ok:true,createdStaff:created,createdPins:pins.created.length};
  }
  if(action==='roll-call-context'){
   await principal(token);const [draft,faculty,mission]=await Promise.all([read('cbse/draft'),read('cbse/facultyDraft'),read('cbse/mission')]);return {draft:{...draft,classes:Object.fromEntries(entries(draft?.classes).map(([cl,c])=>[cl,{...c,sections:Object.fromEntries(entries(c.sections).map(([sid,s])=>[sid,{...s,students:{}}]))}]))},faculty:faculty||emptyFaculty(),mission:Object.fromEntries(['revision','staff','staffEmails','staffContacts','staffPhotos','facultyProfiles','allocations','supportAssignments'].map(k=>[k,mission?.[k]??(k==='revision'?0:{})]))};
  }
  if(action==='roll-call-read'){
   const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');if(access?.error){const e=new AccessError(access.error,access.status);e.curtainRequired=access.curtainRequired;throw e;}
   await preparePrimaryRoster();
   const [staff,stored,reporting]=await Promise.all([directoryStaff(),read('cbse/rollCall'),read('cbse/chamber/reporting')]),value=stored||{},ids=input.staffId?rollStaffIdentityIds(staff,input.staffId):[];return {ok:true,reporting:publishedReporting(reporting),serverDate:rollToday(now()),serverTime:now(),staff:Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)).map(([id,p])=>[id,{name:rollDisplayName(p.name),designation:p.designation||'',wing:rollWing(p),classTeacher:!!p.classTeacher,coClassTeacher:!!p.coClassTeacher,classRoles:p.classRoles||[]}])),rollCall:{noc:rollPublicNOC(value.objections,rollToday(now())),objectionAssignments:value.objectionAssignments||{},advanceLeaves:publicAdvanceLeaves(value.advanceLeaves),reports:Object.fromEntries(entries(value.reports).map(([id,r])=>[id,rollPublicReport(r)])),objections:Object.fromEntries(entries(value.objections).filter(([,o])=>o.kind==='principal-hold'||input.staffId&&(ids.includes(o.staffId)||o.createdBy===input.staffId)))}};
  }
  if(action==='staff-meetings-read'){
   const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');
   if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}
   const meetings=await read('cbse/staffMeetings')||{};
   if(input.meetingId!==undefined){
    const meeting=typeof input.meetingId==='string'&&Object.hasOwn(meetings,input.meetingId)?meetings[input.meetingId]:null;
    if(!meeting)throw new AccessError('This meeting report is unavailable.',404);
    const staff=meeting.publishedReport===undefined&&meeting.savedAt?Object.fromEntries(entries(await directoryStaff()).map(([id,person])=>[id,{...person,wing:rollWing(person)}])):{};
    const report=publishedMeetingReport(meeting,staff);
    if(!report)throw new AccessError('The meeting report has not been published.',404);
    if(input.task==='signed-minutes'){
     const file=meeting.signedMinutesRevision&&await read('cbse/staffMeetingSignedMinutes/'+input.meetingId);
     if(!file)throw new AccessError('Signed minutes have not been uploaded.',404);
     return {ok:true,pdf:file.pdf};
    }
    return {ok:true,report};

   }
   return {ok:true,meetings:staffMeetingList(meetings)};
  }
  if(action==='movement-read'){
   const staff=Object.fromEntries(entries(await directoryStaff()).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)).map(([id,p])=>[id,{...p,name:rollDisplayName(p.name),wing:rollWing(p)}])),store=await read('cbse/chamber/movements')||{},stamp=now();return {ok:true,serverDate:movementToday(stamp),serverTime:stamp,staff:Object.fromEntries(entries(staff).map(([id,p])=>[id,{name:p.name,designation:p.designation||'',wing:p.wing,status:p.status}])),movements:movementView(store,null,staff,stamp)};
  }
  if(action==='remember-view'){await principal(token);return sharedView('view-grant');}
  let pinIdentity,mcqPrincipal;
  if(action==='mcq-principal'){mcqPrincipal=await principal(token);action=String(input.operation||'');if(!['mcq-reset-all-preview','mcq-reset-all','mcq-clear-banks-preview','mcq-clear-banks','mcq-contribution-history','mcq-manage-preview','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','mcq-report-publish'].includes(action))throw new AccessError('Unknown Principal MCQ operation.',400);}
  if(action==='pin-submit'){
   if(['staff-meetings','roll-call','podcast-list','podcast-ack','exam-attendance-save'].includes(input.operation)){const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}
   const selectedId=String(input.staffId||'');if(!/^[a-zA-Z0-9_:-]{1,200}$/.test(selectedId))throw new AccessError('Choose your name and enter your PIN.',401);const directory=await directoryStaff(),id=directory[selectedId]?.pinOwnerId||selectedId,access=await read(`cbse/staffAccess/${id}`),person=directory[id];if(!access?.enabled||person?.status!=='active')throw new AccessError('Choose your name and enter the correct PIN.',401);
   await verifySubmissionPIN(id,input.pin,access,ip,person);
   action=String(input.operation||'comment');if(!['staff-meetings','task-manager','comment','teacher-comment','update-contact','update-task','conversation-start','conversation-reply','news-create','news-comment','credit-claim','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','remedial-plan','roll-call','movement','podcast-list','podcast-ack','exam-attendance-save'].includes(action))throw new AccessError('This operation requires Principal access.',403);if(!['staff-meetings','task-manager','roll-call','movement','podcast-list','podcast-ack'].includes(action)&&!missionMemberAllowed(person))throw new AccessError('This staff member is not part of the Mission team.',403);pinIdentity={decoded:{staffId:id},access};
  }
  if(action==='staff-meetings-principal'||action==='staff-meetings'){
   const admin=action==='staff-meetings-principal'?await principal(token):null;
   const staffId=pinIdentity?.decoded.staffId;
   if(!admin&&!staffId)throw new AccessError('Verify your personal PIN.',403);
   const staff=Object.fromEntries(entries(await directoryStaff()).map(([id,person])=>[id,{...person,wing:rollWing(person)}]));
   const actor={principal:!!admin,staffId},operation=input.meetingOperation;
   if(operation==='read'){
    const meetings=input.meetingId?null:await read('cbse/staffMeetings')||{};
    if(admin&&!input.meetingId){
     const roster=meetingRoster(staff).filter(person=>person.id!=='principal');
     const recipientStaff=Object.fromEntries(roster.map(person=>[person.id,{...person,classRoles:staff[person.id].classRoles||[],classTeacher:!!staff[person.id].classTeacher,coClassTeacher:!!staff[person.id].coClassTeacher}]));
     const rollCall=await read('cbse/rollCall')||{},heldByDate=new Map();
     for(const hold of Object.values(rollCall.objections||{})){
      if(hold.status!=='open'||!Number.isFinite(hold.createdAt))continue;
      const day=rollToday(hold.createdAt);
      if(!heldByDate.has(day))heldByDate.set(day,new Set());
      heldByDate.get(day).add(hold.staffId);
     }
     const list=staffMeetingList(meetings,{principal:true}).map(meeting=>{
      const day=rollToday(meeting.scheduledAt),held=heldByDate.get(day);
      const heldAttendees=held?[...(meeting.roster||[])].filter(person=>{
       const ids=rollStaffIdentityIds(staff,person.id);
       return ids.some(id=>held.has(id))&&!afternoonLeaveExemption(rollCall,ids,day);
      }).map(person=>person.id):[];
      return {...meeting,heldAttendees};
     });
     return {ok:true,meetings:list,roster,recipientStaff,attendanceDefaults:meetingAttendanceDefaults(meetings,roster),assignments:rollCall.objectionAssignments||{}};
    }
    const meeting=typeof input.meetingId==='string'&&/^[a-f0-9]{32}$/.test(input.meetingId)?await read('cbse/staffMeetings/'+input.meetingId):null;
    if(admin&&meeting&&input.task==='report')return {ok:true,report:meetingReport(meeting,staff)};
    if(!meeting||!canOpenMeeting(staff,meeting,actor,input.task,input.language))throw new AccessError('Only authorised staff can open this meeting task.',403);
    if(input.task==='attendance')return {ok:true,meeting:{id:meeting.id,createdAt:meeting.createdAt,scheduledAt:meeting.scheduledAt||meeting.createdAt,revision:meeting.attendanceRevision||0,attendanceWing:meeting.attendanceWing||'both',roster:meetingAttendanceRoster(meeting,staff),attendance:meeting.attendance||{}}};
    const minute=meetingMinute(meeting,input.language);
    return {ok:true,meeting:{id:meeting.id,createdAt:meeting.createdAt,scheduledAt:meeting.scheduledAt||meeting.createdAt,meetingAgenda:meeting.meetingAgenda||'',...minute,revision:minute.revision||0,language:input.language}};
   }
   const signedUpload=operation==='signed-upload';
   if(signedUpload){
    if(typeof input.meetingId!=='string'||!/^[a-f0-9]{32}$/.test(input.meetingId))throw new AccessError('Choose a valid staff meeting.',400);
    if(typeof input.pdf!=='string'||input.pdf.length>2796204)throw new AccessError('Choose a PDF up to 2 MB.',400);
    const pdf=Buffer.from(input.pdf,'base64');
    if(pdf.length>2097152||pdf.toString('base64')!==input.pdf||pdf.subarray(0,5).toString()!=='%PDF-')throw new AccessError('Choose a valid PDF up to 2 MB.',400);
   }
   const stamp=now();let reason='';
   const result=await mcqTransaction(db,'cbse',current=>{
    if(current===null)return null;
    reason='';
    if(admin?current.adminUid!==admin.uid:!current.staffAccess?.[staffId]?.enabled||current.staffAccess[staffId].version!==pinIdentity.access.version){
     reason='Your access changed. Sign in or verify your PIN again.';return;
    }
    if(signedUpload){
     const id=input.meetingId,meeting=current.staffMeetings?.[id];
     if(!meeting||!publishedMeetingReport(meeting,staff)){
      reason='Publish the meeting report before uploading signed minutes.';return;
     }
     if(!admin&&!minuteLanguages.some(([language])=>canOpenMeeting(staff,meeting,actor,'minutes',language))){
      reason='Only an assigned minutes writer or the Principal can upload signed minutes.';return;
     }
     const revision=meeting.signedMinutesRevision||0;
     if(input.expectedSignedRevision!==revision){
      reason='The signed minutes changed. Reopen the register before uploading again.';return;
     }
     return {...current,
      staffMeetings:{...current.staffMeetings,[id]:{...meeting,signedMinutesRevision:revision+1}},
      staffMeetingSignedMinutes:{...current.staffMeetingSignedMinutes,[id]:{pdf:input.pdf,uploadedAt:stamp,uploadedBy:admin?'principal':staffId}}
     };
    }
    try{return {...current,staffMeetings:applyStaffMeeting(current.staffMeetings,input,actor,staff,stamp)};}
    catch(error){reason=error.message;return;}
   },{restTransaction});
   if(!result.committed||!result.snapshot.val()?.staffMeetings)throw new AccessError(reason||'The meeting save was not confirmed. Refresh before retrying.',409);
   const meeting=result.snapshot.val().staffMeetings[input.meetingId];
   if(signedUpload)return {ok:true,signedMinutesRevision:meeting.signedMinutesRevision};
   return {ok:true,revision:operation.startsWith('minutes-')?meetingMinute(meeting,input.language).revision:operation==='attendance-save'?meeting.attendanceRevision:meeting.revision};
  }
  if(action==='task-manager'){
   if(!pinIdentity)throw new AccessError('Verify your existing personal PIN.',403);
   const id=pinIdentity.decoded.staffId,staff=await directoryStaff(),access=await read('cbse/staffAccess/'+id);
   if(!access?.enabled||access.version!==pinIdentity.access.version||staff[id]?.status!=='active')throw new AccessError('Staff access changed. Verify your PIN again.',403);
   const actor={id,ids:rollStaffIdentityIds(staff,id)},inputTask={...input,operation:input.taskOperation};
   const viewTask=value=>{const output=taskView(withTaskExamParticipation(taskRosterStore(value,staff,rollStaffIdentityIds)),actor);if(input.taskId){const t=Object.hasOwn(output.tasks,input.taskId)?output.tasks[input.taskId]:null;if(!t||!t.classes.includes(input.classId))throw new AccessError('This published class report is not assigned to you.',403);return {tasks:{[input.taskId]:{...t,classes:[input.classId],headers:{[input.classId]:t.headers[input.classId]},reports:t.reports[input.classId]?{[input.classId]:t.reports[input.classId]}:{}}}};}return output;};
   if(input.taskOperation==='read')return viewTask(await read('cbse/taskManager'));
   if(input.taskOperation!=='submit')throw new AccessError('Teachers may only read and submit their assigned report.',403);
   let reason='';const known=await read('cbse/taskManager');const result=await mcqTransaction(db,'cbse/taskManager',current=>{if(current===null&&known!==null)return null;reason='';try{return applyTask(withTaskExamParticipation(taskRosterStore(current,staff,rollStaffIdentityIds)),inputTask,actor,staff,now());}catch(e){reason=e.message;return;}},{restTransaction});
   if(!result.committed||!result.snapshot?.val())throw new AccessError(reason||'Report save was not confirmed. Refresh before retrying.',409);
   return viewTask(result.snapshot.val());
  }
  if(action==='movement'||action==='movement-principal'){
   const admin=action==='movement-principal';if(admin)await principal(token);else if(!pinIdentity)throw new AccessError('Verify your own staff PIN.',403);
   const staff=Object.fromEntries(entries(await directoryStaff()).map(([id,p])=>[id,{...p,name:rollDisplayName(p.name),wing:rollWing(p)}])),actor=admin?{id:'principal',name:'Principal'}:{id:pinIdentity.decoded.staffId,name:staff[pinIdentity.decoded.staffId]?.name||'Staff'},stamp=now();
   const output=store=>({ok:true,principal:admin,serverDate:movementToday(stamp),serverTime:stamp,staff:Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)).map(([id,p])=>[id,{name:p.name,designation:p.designation||'',wing:p.wing,status:p.status}])),movements:movementView(store,admin||actor.movementReview||input.movementOperation==='read'?actor:null,staff,stamp)});
   const known=await read('cbse/chamber/movements');if(input.movementOperation==='review-read'){if(!movementCanApprove(known,actor,staff,stamp))throw new AccessError('The Principal has not permitted approval access, or that permission has ended.',403);actor.movementReview=true;return output(known||{});}if(input.movementOperation==='read')return output(known||{});if(!admin&&input.movementOperation==='approve')actor.movementReview=true;let reason='';
   if(!admin){const access=await read('cbse/staffAccess/'+actor.id);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('PIN access changed. Verify again.',403);}
   const result=await mcqTransaction(db,'cbse/chamber/movements',current=>{if(current===null&&known!==null)return null;reason='';try{return applyMovement(current||{},input,actor,staff,stamp);}catch(e){reason=e.message;return;}},{restTransaction});if(!result.committed||!result.snapshot?.val())throw new AccessError(reason||'Movement save was not confirmed. Keep the form open and retry.',409);return output(result.snapshot.val());
  }
  if(action==='credit-claim'){
   if(!pinIdentity)throw new AccessError('Verify your own teacher PIN.',403);const id=pinIdentity.decoded.staffId,data=await creditContext();
   if(!['submit','attach-evidence'].includes(input.claimOperation))throw new AccessError('Teachers may submit claims; only the Principal may review them.',403);
   const access=await read('cbse/staffAccess/'+id);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('PIN access changed. Verify again.',403);
   let reason='',claimId='';const result=await mcqTransaction(db,'cbse/contributionCredits',current=>{try{const planned=applyCreditClaim(current||{},{...input,operation:input.claimOperation},{id},data,now());claimId=planned.claimId;reason='';return planned.next;}catch(e){reason=e.message;return;}},{restTransaction});
   if(!result.committed||!result.snapshot?.val())throw new AccessError(reason||'Credit claim was not confirmed. Retry the same claim.',409);return {ok:true,claimId};
  }
  if(action==='exam-attendance-save'||action==='exam-attendance-principal'){

   const admin=action==='exam-attendance-principal';if(admin)await principal(token);else if(!pinIdentity)throw new AccessError('Use your personal PIN.',403);const id=admin?'principal':pinIdentity.decoded.staffId,staff=admin?{}:await directoryStaff();if(!admin){const access=await read('cbse/staffAccess/'+id);if(!access?.enabled||access.version!==pinIdentity.access.version||staff[id]?.status!=='active')throw new AccessError('Staff access changed. Verify your PIN again.',403);}if(!admin&&input.exam==='winter'&&!isWinterTimetableTeacher(staff[id]))throw new AccessError('Only teachers named in the winter timetable can submit this attendance.',403);if(['preboard1','preboard2'].includes(input.exam))throw new AccessError('Preboard attendance is recorded in VEMS. Use the VEMS invigilator attendance link.',409);if(!['X','XII'].includes(input.classId))throw new AccessError('Choose Class X or XII.',400);const classDraft=await read('cbse/draft/classes/'+input.classId),draft={classes:{[input.classId]:classDraft}};let paper;try{paper=examCentrePaper(draft,input);}catch(e){throw new AccessError(e.message,400);}const actor={id,name:admin?'Principal':staff[id].name,role:admin?'principal':'staff',status:admin?'active':staff[id].status};let reason='';const saved=await db.ref('cbse/examCentreAttendance/'+paper.storeKey).transaction(current=>{try{return (input.changes!==undefined?applyExamCentreAttendanceBatch:applyExamCentreAttendance)(current,input,actor,paper,now());}catch(e){reason=e.message;return;}});if(!saved.committed||!saved.snapshot.val())throw new AccessError(reason||'Attendance could not be saved. Refresh and retry.',409);return {ok:true,revision:saved.snapshot.val().revision||0,records:examCentreRecords(saved.snapshot.val(),admin),serverDate:examCentreToday(now()),serverTime:now()};
  }
  if(action==='podcast-list'||action==='podcast-ack'){
   if(!pinIdentity)throw new AccessError('Enter your own Mission 100 PIN.',403);const id=pinIdentity.decoded.staffId,access=await read('cbse/staffAccess/'+id);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('PIN access changed. Verify again.',403);const staff=await directoryStaff(),ids=rollStaffIdentityIds(staff,id),actor={id,name:staff[id].name};if(action==='podcast-list')return {videos:teacherPodcasts(await read('cbse/chamber/podcasts')||{},ids)};
   let reason='';const known=await read('cbse/chamber/podcasts');const result=await db.ref('cbse/chamber/podcasts').transaction(current=>{if(current===null&&known!==null)return null;try{return acknowledgePodcast(current,input,actor,ids,now());}catch(e){reason=e.message;return;}});if(!result.committed||result.snapshot.val()===null)throw new AccessError(reason||'Video changed. Reopen it.',409);return {ok:true,videos:teacherPodcasts(result.snapshot.val(),ids)};
  }
  if(action==='roll-call'||action==='roll-call-principal'){
   const admin=action==='roll-call-principal',adminIdentity=admin?await principal(token):null,actorUid=adminIdentity?.uid;if(!admin&&!pinIdentity)throw new AccessError('Verify your personal PIN.',403);if(!admin){const access=await read('cbse/staffAccess/'+pinIdentity.decoded.staffId);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('Staff access changed. Verify your PIN again.',403);}
   const staff=await directoryStaff(),actor=admin?{id:'principal',name:'Principal'}:{id:pinIdentity.decoded.staffId,name:staff[pinIdentity.decoded.staffId]?.name||'Staff'};
   const reporting=await read('cbse/chamber/reporting');const output=(value,form=reporting)=>({ok:true,reporting:publishedReporting(form),serverDate:rollToday(now()),serverTime:now(),principal:admin,actor,...(admin?{reportStaff:Object.fromEntries(entries(staff).map(([id,p])=>[id,{name:p.name,designation:p.designation||'',wing:rollWing(p)}]))}:{}),staff:Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)).map(([id,p])=>[id,{name:rollDisplayName(p.name),designation:p.designation||'',wing:rollWing(p),classTeacher:!!p.classTeacher,coClassTeacher:!!p.coClassTeacher,classRoles:p.classRoles||[]}])),rollCall:admin?value:{noc:rollPublicNOC(value.objections,rollToday(now())),revision:value.revision||0,objectionAssignments:value.objectionAssignments||{},advanceLeaves:publicAdvanceLeaves(value.advanceLeaves),reports:Object.fromEntries(entries(value.reports).map(([id,r])=>[id,r.staffId===actor.id?r:rollPublicReport(r)])),objections:Object.fromEntries(entries(value.objections).filter(([,o])=>o.kind==='principal-hold'||rollStaffIdentityIds(staff,actor.id).includes(o.staffId)||o.createdBy===actor.id))}});
   if(input.rollOperation==='read')return output(await read('cbse/rollCall')||{});
   if(input.rollOperation==='report'||['advance-leave-save','advance-leave-resubmit'].includes(input.rollOperation)){
    const requestId=input.requestId||randomUUID().replaceAll('-','');if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(requestId))throw new AccessError('Reopen the reporting form and retry.',400);
    const leaveId='advance_'+requestId,submittedAt=now();let reason='';const result=await mcqTransaction(db,'cbse',current=>{reason='';if(current===null)return null;try{if(admin?current.adminUid!==actorUid:!current.staffAccess?.[actor.id]?.enabled||current.staffAccess[actor.id].version!==pinIdentity.access.version){reason='Staff access changed. Verify your PIN again.';return;}const planned=applyRollCall(current.rollCall,input,actor,staff,submittedAt,input.rollOperation==='advance-leave-save'?leaveId:'',current.chamber?.reporting);return {...current,rollCall:planned};}catch(e){reason=e.message;return;}},{restTransaction});
    if(!result.committed||!result.snapshot.val()?.rollCall)throw new AccessError(reason||'Reporting could not be saved. Keep the form open and retry.',409);const saved=result.snapshot.val();return output(saved.rollCall,saved.chamber?.reporting);
   }
   let reason='';const newId='objection_'+randomUUID().replaceAll('-',''),known=await read('cbse/rollCall');const result=await db.ref('cbse/rollCall').transaction(current=>{if(current===null&&known!==null)return null;try{return applyRollCall(current,input,actor,staff,now(),newId);}catch(e){reason=e.message;return;}});
   if(!result.committed||result.snapshot.val()===null)throw new AccessError(reason||'Roll call changed. Retry.',409);return output(result.snapshot.val());
  }
  if(action==='remedial-plan'||action==='remedial-principal'){const admin=action==='remedial-principal';if(admin)await principal(token);else if(!pinIdentity)throw new AccessError('Choose your name and enter your own PIN.',403);const c=await context(),id=admin?'principal':pinIdentity.decoded.staffId,person=admin?null:staffIndex(c.faculty,c.mission)[id],actor={id,name:admin?'Principal':person?.name||'Staff'};if(!admin){const access=await read('cbse/staffAccess/'+id);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('Staff access changed. Verify your PIN again.',403);}const operation=admin?input.operation:input.planOperation||'save';
 if(operation==='evidence'){if(!admin)throw new AccessError('Principal access required.',403);const plan=c.mission.remedialPlans?.[input.planId],e=plan?.sessions?.[input.date]?.evidence;if(!e)throw new AccessError('No evidence for this class.',404);return {ok:true,photo:await read('cbse/remedialEvidence/'+e.ref)};}
 if(operation==='complete'&&input.reuseEvidence===true){const prior=c.mission.remedialPlans?.[input.planId]?.sessions?.[input.date];if(prior?.status!=='returned'||!prior.evidence?.ref)throw new AccessError('Choose a returned class with saved evidence.',409);const stored=await read('cbse/remedialEvidence/'+prior.evidence.ref);if(!stored?.photo)throw new AccessError('The previous evidence could not be found. Ask the Principal to review this class.',409);input={...input,evidence:prior.evidence};}
 if(operation==='complete'&&input.reuseEvidence!==true){
  input={...input,evidence:{...input.evidence,ref:'evidence_'+randomUUID().replaceAll('-','')}};const photo=input.photo; if(typeof photo!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)||photo.length>1000000)throw new AccessError('Capture a class photo before submitting.',400);
  try{applyRemedialPlan(c.mission,c.draft,c.faculty,{...input,operation},actor,now());}catch(e){throw new AccessError(e.message,409);}
  await db.ref('cbse/remedialEvidence/'+input.evidence.ref).set({photo,capturedAt:input.evidence.capturedAt,receivedAt:now(),planId:input.planId,date:input.date,actorId:actor.id});
 }
 let output,reason='';const result=await db.ref('cbse/mission').transaction(current=>{if(current===null)return null;try{const planned=applyRemedialPlan(current,c.draft,c.faculty,{...input,operation:admin?input.operation:input.planOperation||'save'},actor,now());if(planned.needsCoordination){output=planned;return;}output={planId:planned.planId,plan:planned.next.remedialPlans?.[planned.planId]||null,missionRevision:planned.next.revision};return planned.next;}catch(e){reason=e.message;return;}});if(output?.needsCoordination&&!reason)return {ok:true,...output};if(!result.committed){if(operation==='complete'&&input.reuseEvidence!==true)await db.ref('cbse/remedialEvidence/'+input.evidence.ref).remove();throw new AccessError(reason||'The plan could not be saved. Retry.',409);}if(operation==='delete'){const refs=Object.values(c.mission.remedialPlans?.[input.planId]?.sessions||{}).flatMap(s=>[s.evidence?.ref,...Object.values(s.reviewHistory||{}).map(r=>r.evidence?.ref)]).filter(ref=>typeof ref==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(ref));await Promise.all(refs.map(ref=>db.ref('cbse/remedialEvidence/'+ref).remove()));}return {ok:true,...output};}
  if(['mcq-reset-all-preview','mcq-reset-all','mcq-clear-banks-preview','mcq-clear-banks','mcq-contribution-history','mcq-manage-preview','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','mcq-report-publish'].includes(action)){
   if(!pinIdentity&&!mcqPrincipal)throw new AccessError('Choose a contributor and verify their PIN.',403);const id=mcqPrincipal?'principal':pinIdentity.decoded.staffId,c=await context(),person=mcqPrincipal?null:staffIndex(c.faculty,c.mission)[id],actor={id,name:mcqPrincipal?'Principal':person.name};const selectedClass=input.classId||'X';if(!mcqPrincipal&&!['mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-answer-key'].includes(action)&&!mcqContributors(c.faculty,c.mission,selectedClass).some(t=>teacherIdentityIds(t.id,c.faculty,c.mission).includes(id)))throw new AccessError('Choose a subject teacher who teaches the selected Class '+selectedClass+'.',403);let reason='',output={},result;
   if(pinIdentity&&action==='mcq-import-csv'){const eligible=mcqContributors(c.faculty,c.mission,selectedClass,input.subjectId,Object.values(c.draft.classes?.[selectedClass]?.sections||{}).map(section=>section.subjects?.[input.subjectId]?.name).find(Boolean)||input.subjectId);if(!eligible.some(t=>teacherIdentityIds(t.id,c.faculty,c.mission).includes(id)))throw new AccessError('Choose a teacher assigned to this class and subject.',403);const current=await read('cbse/staffAccess/'+id);if(!current?.enabled||current.version!==pinIdentity.access.version)throw new AccessError('Teacher PIN access changed. Verify again.',403);}
   if(['mcq-reset-all-preview','mcq-reset-all','mcq-clear-banks-preview','mcq-clear-banks','mcq-contribution-history','mcq-manage-preview','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-report-publish'].includes(action)&&!mcqPrincipal)throw new AccessError('Only the Principal can manage contributions.',403);
   if(action==='mcq-report-publish'){const published=await db.ref('cbse/mcq').transaction(current=>{if(current===null)return null;try{const planned=publishMCQReport(current,c.draft,input,actor,now());output=planned.publication;return planned.next;}catch(e){reason=e.message;return;}});if(!published.committed)throw new AccessError(reason||'The report could not be published.',409);return {ok:true,publication:output};}
   if(action==='mcq-answer-key'){if(pinIdentity){const current=await read('cbse/staffAccess/'+id);if(!current?.enabled||current.version!==pinIdentity.access.version)throw new AccessError('Staff access changed. Verify your PIN again.',403);}try{return {ok:true,...readMCQAnswerKey(await read('cbse/mcq')||{},input)};}catch(e){throw new AccessError(e.message,400);}};
   if(action==='mcq-reset-all-preview')return {ok:true,...previewResetAllMCQ({mcq:await read('cbse/mcq')||{},mission:c.mission})};
   if(action==='mcq-clear-banks-preview')return {ok:true,...previewClearMCQBanks(await read('cbse/mcq')||{},c.mission)};
   if(action==='mcq-contribution-history')return {ok:true,...mcqContributionHistory(await read('cbse/mcq')||{},input)};
   if(action==='mcq-manage-preview')return {ok:true,...previewMCQContributions(await read('cbse/mcq')||{},input)};
   if(action==='mcq-reset-all'){result=await db.ref('cbse').transaction(current=>{reason='';output={};if(current===null)return null;try{if(current.adminUid!==mcqPrincipal.uid){reason='Principal access changed. Sign in again.';return;}const planned=resetAllMCQ(current,input,actor,now());output={cleared:planned.cleared,questionBankEpoch:planned.questionBankEpoch};return planned.next;}catch(e){reason=e.message;return;}});}
   else if(action==='mcq-evaluate'){if(input.correction&&!token)throw new AccessError('Only the Principal can correct an existing score.',403);const admin=mcqPrincipal||(input.correction?await principal(token):null);const evaluationInput={...input,requestId:input.requestId||'evaluation_'+randomUUID().replaceAll('-','')};result=await mcqEvaluationTransaction(db,current=>{reason='';output={};if(current===null)return null;try{if(mcqPrincipal?current.adminUid!==mcqPrincipal.uid:!current.staffAccess?.[id]?.enabled||current.staffAccess[id].version!==pinIdentity.access.version){reason='Access changed. Reload and verify your access again.';return;}const planned=evaluateMCQ(current,evaluationInput,actor,now(),{principalUid:admin?.uid||''});output={score:planned.score,maximum:planned.maximum,evaluationId:planned.evaluationId,attendance:planned.attendance};return planned.next;}catch(e){reason=e.message;return;}},{restTransaction});}
   else{result=await mcqTransaction(db,'cbse/mcq',current=>{reason='';output={};if(['mcq-paper','mcq-paper-delete','mcq-question-edit','mcq-question-delete','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-clear-banks'].includes(action)&&current===null)return null;try{const planned=action==='mcq-clear-banks'?clearMCQBanks(current||{},input,actor,now(),c.mission):['mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete'].includes(action)?manageMCQContributions(current||{},{...input,operation:action},actor,staffIndex(c.faculty,c.mission),now()):action==='mcq-contribute'?contributeMCQ(current||{},input,actor,c.draft,now(),staffIndex(c.faculty,c.mission)):action==='mcq-import-csv'?importMCQCSV(current||{},input,actor,c.draft,now(),staffIndex(c.faculty,c.mission)):['mcq-question-edit','mcq-question-delete'].includes(action)?changeMCQQuestion(current||{},{...input,operation:action},actor,now()):action==='mcq-paper-delete'?deleteMCQPaper(current||{},input,actor,now()):createMCQPaper(current||{},input,actor,now(),c.draft);output=action==='mcq-clear-banks'?{changedCount:planned.changedCount,idsRestarted:planned.idsRestarted}:['mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete'].includes(action)?{changedCount:planned.changedCount}:action==='mcq-contribute'?{batchId:planned.batchId,questionIds:planned.questionIds}:action==='mcq-import-csv'?{questionIds:planned.questionIds,addedCount:planned.addedCount,skippedCount:planned.skippedCount}:['mcq-question-edit','mcq-question-delete'].includes(action)?{questionId:planned.questionId}:{paperId:planned.paperId};return planned.next;}catch(e){reason=e.message;return;}},{restTransaction:['mcq-import-csv','mcq-paper'].includes(action)?restTransaction:undefined});}
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
   let reason='';const updates=prepared.newStaffIds.filter(id=>!current.staffAccess?.[id]).map(id=>({key:'staff:'+id,pin:input.staffId?decryptDisplayPIN(current.staffAccess?.[input.staffId],input.staffId,displayKey)||pin:pin,record:pins[id],allowedExtra:input.staffId?['staff:'+input.staffId,...prepared.newStaffIds.map(key=>'staff:'+key)]:prepared.newStaffIds.map(key=>'staff:'+key)}));const result=updates.length?await pinPolicy.commit({updates,staff:staffIndex(prepared.next.facultyDraft,prepared.next.mission,{includeRollOnly:true}),mutate:value=>{if(value.adminUid!==admin.uid)return;return planFacultySave(value,input,newId,now()).next;}}):await db.ref('cbse').transaction(value=>{if(!value||value.adminUid!==admin.uid)return;try{return planFacultySave(value,input,newId,now()).next;}catch(e){reason=e.message;return;}});
   if(!result.committed)throw new AccessError(reason||'Faculty changed. Reload and retry.',409);return {ok:true,staffId:prepared.staffId};
  }
  if(action==='directory'){const staff=await directoryStaff(),access=await read('cbse/staffAccess'),eligible=entries(access).filter(([id,a])=>a.enabled&&staff[id]?.status==='active'&&missionMemberAllowed(staff[id])),ganga=eligible.filter(([id])=>isGangaDeviProfile(staff[id])).sort(([a],[b])=>(staff[a].classId?0:1)-(staff[b].classId?0:1)||a.localeCompare(b))[0]?.[0];return {staff:eligible.filter(([id])=>(!staff[id].pinOwnerId||staff[id].pinOwnerId===id)&&(!isGangaDeviProfile(staff[id])||id===ganga)).map(([id])=>({id,name:staff[id].name,role:staff[id].classId?`Class ${staff[id].classId} faculty`:staff[id].kind}))};}
  if(action==='login'){
   const selectedId=String(input.staffId||'');if(!/^[a-zA-Z0-9_:-]{1,200}$/.test(selectedId))throw new AccessError('Choose a staff member and enter the correct PIN.',401);
   const directory=await directoryStaff(),id=directory[selectedId]?.pinOwnerId||selectedId,access=await read(`cbse/staffAccess/${id}`),person=directory[id];if(!access?.enabled||person?.status!=='active')throw new AccessError('Choose a staff member and enter the correct PIN.',401);
   if(!missionMemberAllowed(person))throw new AccessError('This staff member is not part of the Mission team.',403);
   const attemptKey=await throttle(id,ip);
   if(!await verifyPIN(input.pin,access))throw new AccessError('Choose a staff member and enter the correct PIN.',401);await pinPolicy.assertSelected(input.pin,'staff:'+id);
   const customToken=await auth.createCustomToken('mission_'+createHash('sha256').update(id).digest('hex').slice(0,40),{missionStaff:true,staffId:id,pinVersion:access.version});await pinDatabase(()=>pinAttempts.clear(attemptKey,{all:false}));return {customToken,name:person.name};
  }
  if(['list','set-pin','disable','generate-pins','import-pins','add-faculty-pin'].includes(action)){
   const inputPrincipal=await principal(token);const staff=await directoryStaff();
   if(action==='list'){const {created}=input.generateMissing===true?await generateMissingPINs(staff):{created:[]};const access=await read('cbse/staffAccess'),pinAudit=await pinPolicy.audit(staff);return {staff:Object.fromEntries(entries(staff).filter(([,t])=>t.status==='active')),created,pinAudit,access:Object.fromEntries(entries(access).map(([id,a])=>[id,{enabled:!!a.enabled,pinSet:!!a.hash,temporary:!!a.temporary,updatedAt:a.updatedAt,pin:pinAudit.unavailable.includes('staff:'+id)?'':decryptDisplayPIN(a,id,displayKey)}]))};}
   if(action==='add-faculty-pin'){
    const classId=String(input.classId||'');if(!['X','XII'].includes(classId))throw new AccessError('Choose Class X or XII.',400);
    if(typeof input.pin!=='string'||!/^\d{3}$/.test(input.pin))throw new AccessError('Enter exactly three digits for the initial PIN.',400);
    const teacher=Object.fromEntries(['name','designation','subjects','teachingSections'].map(k=>[k,String(input[k]||'').trim()]));teacher.status='active';
    const teacherId='faculty_'+randomUUID().replaceAll('-',''),id=`${classId}:${teacherId}`,record={...await hashPIN(input.pin),...encryptDisplayPIN(input.pin,id,displayKey),enabled:true,version:randomUUID(),updatedAt:now()};
    const preflight=structuredClone(await read('cbse/facultyDraft')||emptyFaculty());preflight.classes[classId].teachers||={};preflight.classes[classId].teachers[teacherId]=teacher;validateFaculty(preflight);
    let validationError='';
    const result=await pinPolicy.commit({updates:[{key:'staff:'+id,pin:input.pin,record}],mutate:current=>{
     if(!current||current.adminUid!==inputPrincipal.uid)return;const next=structuredClone(current),roster=next.facultyDraft||emptyFaculty();roster.classes[classId].teachers||={};roster.classes[classId].teachers[teacherId]=teacher;validateFaculty(roster);roster.revision++;roster.updatedAt=now();next.facultyDraft=roster;return next;
    }});
    if(!result.committed)throw new AccessError(validationError||'Faculty and PIN were not saved. Reload and retry.',400);
    return {ok:true,classId,teacherId,teacher,revision:result.snapshot.val().facultyDraft.revision,access:{enabled:true,pinSet:true}};
   }
   if(action==='import-pins'){
    let rows;try{rows=validatePINRows(input.rows,staff);}catch(error){throw new AccessError(error.message,400);}
    const prepared=[];for(const r of rows)prepared.push({id:r.staffId,pin:r.pin,record:{...await hashPIN(r.pin),...encryptDisplayPIN(r.pin,r.staffId,displayKey),enabled:r.enabled,version:randomUUID(),updatedAt:now()}});
    const result=await pinPolicy.commit({updates:prepared.map(p=>({key:'staff:'+p.id,pin:p.pin,record:p.record}))});
    if(!result.committed)throw new AccessError('PIN update did not save. Try again.',409);
    return {ok:true,updated:prepared.length,access:Object.fromEntries(prepared.map(p=>[p.id,{enabled:p.record.enabled,pinSet:true,updatedAt:p.record.updatedAt}]))};
   }
   if(action==='generate-pins')return generateMissingPINs(staff);
   const id=String(input.staffId||'');if(!staff[id])throw new AccessError('Staff member not found.',404);
   if(action==='set-pin'){if(staff[id].status!=='active')throw new AccessError('Enable this staff member first.',400);const ids=rollStaffIdentityIds(staff,id).filter(key=>staff[key]?.status==='active'),hash=await hashPIN(input.pin),version=randomUUID(),updatedAt=now(),access=await read('cbse/staffAccess');await pinPolicy.commit({updates:ids.map(key=>({key:'staff:'+key,pin:input.pin,preserveEnabled:key!==id,record:{...hash,...encryptDisplayPIN(input.pin,key,displayKey),version,updatedAt,enabled:key===id?true:access?.[key]?!!access[key].enabled:true}}))});await Promise.all(ids.map(revoke));}
   else{const ids=rollStaffIdentityIds(staff,id),version=randomUUID();await Promise.all(ids.map(revoke));const known=await read('cbse/staffAccess'),saved=await db.ref('cbse/staffAccess').transaction(current=>{if(current===null&&known!==null)return null;const next={...(current||{})};for(const key of ids)next[key]={...next[key],enabled:false,version,updatedAt:now()};return next;});if(!saved.committed||saved.snapshot.val()===null)throw new AccessError('Shared PIN access could not be disabled. Retry.',409);}
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
