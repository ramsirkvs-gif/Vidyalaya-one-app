import {planSamagamPB1} from './samagam-pb1-import.js';
import {readFile} from 'node:fs/promises';
import {portfolioCases,portfolioView,portfolioAction} from './pb1-support-portfolio.js';
import {hqPB1Verification} from './pb1-hq-verification.js';
import {parseRetestCSV,retestUpdates,RETEST_STEPS} from '../cbse-task-retest-model.js';
import {checkTaskSlipDrive,uploadTaskSignedSlip} from './task-signed-slip-drive.js';
import {afternoonLeaveExemption} from '../cbse-roll-call-leave.js';
import {applyStaffMeeting,meetingAttendanceDefaults,meetingRoster,meetingAttendanceRoster,canOpenMeeting,meetingMinute,meetingReport,publishedMeetingReport,staffMeetingList,minuteLanguages} from '../cbse-staff-meetings-model.js';
import {withTaskExamParticipation} from './task-exam-participation.js';
import {validateMonitoringSheets} from '../cbse-task-workbook.js';
import {monitoringAssignments,monitoringAdvance,monitoringReopenUpload,monitoringStage,resolvePublishedMonitoringAssignments,MONITORING_ROLES,MONITORING_STEPS,FINAL_EXAM_IC_NAMES} from '../cbse-task-monitoring-workflow.js';
import {TASK_MONITORING_SEED} from './task-monitoring-seed.js';
import {advanceFrozenDiscussions,evaluatorDirectory,publishedMarksCheckers,withPublishedPB1Evaluators} from './pb1-evaluators.js';
import {pb1Report,pb1Scopes,paperDiscussionComment} from '../cbse-pb1-analyser-model.js';
import {halfYearlyReport,importHalfYearly,updateHalfYearly,CLASS_IX_EXAM,CLASS_IX_EXAM_IC,CLASS_IX_SEATING,CLASS_IX_SEATING_FIELDS,CLASS_IX_PAPERS,assignClassIXMathsD} from '../cbse-half-yearly-analyser-model.js';
import {pb1ApprovalKey} from '../cbse-academic-exam-kind.js';
import {createPINPolicy} from './pin-policy.js';
import {createMissingStaffPINGenerator} from './staff-pin-allocation.js';
import {primaryDirectory,primaryStaffEntry} from '../cbse-primary-roster.js';
import {planPrimaryRosterProfiles} from '../cbse-primary-setup.js';
import {TASK1_ROSTER,taskRosterStore} from '../cbse-task-manager-roster.js';
import {TASK1} from './task-manager-seed.js';
import {applyTask,taskView,taskCatalogue} from '../cbse-task-manager-model.js';
import {NOC_OFFICE_IC} from '../cbse-office-model.js';
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
import {rollStaffIdentityIds,secondaryStaffEntry,rollNameKey} from '../cbse-roll-call-roster.js';
import {planRollRosterProfiles} from '../cbse-roll-call-setup.js';
import {rollReportingStaff,rollDisplayName} from '../cbse-roll-call-roster.js';
import {applyRollCall,rollWing,rollToday,rollNoAnswers,nocGroupKey,nocHoldDate} from '../cbse-roll-call-model.js';
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
import {scrypt as scryptCallback,randomBytes,timingSafeEqual,createHash,createHmac,randomUUID,randomInt} from 'node:crypto';
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
 return holds.filter(([,o])=>nocHoldDate(o)===date&&['open','cleared'].includes(o.status))
  .map(([id,o])=>({id,staffId:o.staffId,createdBy:o.createdBy,createdName:o.createdName||'IC',principal:o.kind==='principal-hold'||o.createdBy==='principal',status:o.status,groupSize:counts.get(nocGroupKey(o,date))||0}));
};
const rollPublicReport=r=>({...Object.fromEntries(['staffId','name','wing','date','period','workflowVersion','morningMode','teacherEditLockedAt','reported','status','hasNoAnswers','requiresCommentReview','requiresReview','approvalRequired','reviewedAt','principalComments','leaveType','halfDay','from','to','updatedAt','submittedAt','approvedAt','rejectedAt'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])),hasNoAnswers:!!r.hasNoAnswers||rollNoAnswers(r).length>0});
function rollBoardStatus(value,date,{detailed=false,actorId='',lookupId=actorId,ids=[]}={}){
 const own=id=>!!actorId&&ids.includes(id);
 const reports=entries(value.reports).filter(([,r])=>detailed||own(r.staffId)||r.date===date||r.leaveType==='long'&&r.to>=date);
 const advanceLeaves=publicAdvanceLeaves(value.advanceLeaves);
 return {
  noc:rollPublicNOC(value.objections,date),
  objectionAssignments:value.objectionAssignments||{},
  advanceLeaves:Object.fromEntries(entries(advanceLeaves).filter(([,r])=>detailed||own(r.staffId)||r.dates?.some(day=>day>=date)).map(([id,r])=>{
   if(detailed||own(r.staffId))return [id,r];
   const {odDetails,reviewComment,...status}=r;
   return [id,status];
  })),
  reports:Object.fromEntries(reports.map(([id,r])=>{
   if(actorId&&r.staffId===actorId)return [id,r];
   const status=rollPublicReport(r);
   if(!detailed)delete status.principalComments;
   return [id,status];
  })),
  objections:Object.fromEntries(entries(value.objections).filter(([,o])=>nocHoldDate(o)===date&&(o.kind==='principal-hold'||ids.includes(o.staffId)||lookupId&&o.createdBy===lookupId&&!!(detailed||actorId))).map(([id,o])=>{
   if(detailed||actorId&&(own(o.staffId)||o.createdBy===actorId))return [id,o];
   const status=Object.fromEntries(['id','staffId','kind','status','period','date','createdAt','clearedAt','createdName'].filter(key=>o[key]!==undefined).map(key=>[key,o[key]]));
   return [id,{...status,remark:'Clearance is required. Contact the concerned IC or Principal.'}];
  })),
 };
}
export function createStaffService({db,auth,restTransaction,uploadSignedSlip=uploadTaskSignedSlip,readVemsAttendance=readPublishedVemsAttendance,now=Date.now,displayKey,viewSecret=defaultViewSecret}){
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

 function monitoringDirectory(staff){
  return Object.fromEntries(entries(staff).map(([id,person])=>{
   if(person.status!=='active'||!isGangaDeviProfile(person))return [id,person];
   const owner=rollStaffIdentityIds(staff,id).filter(key=>staff[key]?.status==='active'&&isGangaDeviProfile(staff[key]))
    .sort((a,b)=>Number(a.startsWith('support:'))-Number(b.startsWith('support:'))||a.localeCompare(b))[0];
   return [id,owner&&owner!==id?{...person,pinOwnerId:owner}:person];
  }));
 }
 async function directoryStaff(){return rollDirectory(...await Promise.all([read('cbse/facultyDraft'),read('cbse/mission/staff'),read('cbse/draft')]));}
 function rollDirectory(faculty,support,draft){const staff=primaryDirectory(rollRoleDirectory(staffIndex(faculty,{staff:support||{}},{includeRollOnly:true}),faculty,draft?.classes));return Object.fromEntries(entries(staff).map(([id,p])=>{const owner=avinashBibekIdentityIds(id,faculty,{staff:support||{}})?.[0];return [id,owner?{...p,pinOwnerId:owner}:p];}));}
 const pinPolicy=createPINPolicy({db,read,restTransaction,getStaff:async()=>primaryDirectory(await officeDirectoryStaff()),displayKey,verifyPIN,AccessError});
 const generateMissingPINs=createMissingStaffPINGenerator({db,read,restTransaction,displayKey,hashPIN,verifyPIN,now,identityIds:rollStaffIdentityIds,AccessError});
 // Fixed, Principal-approved roster migration; no request-supplied names, roles or PINs.
 // Staff may enter Roll Call without first visiting the Principal's Settings.
 async function preparedPrimaryStaff(support,faculty){
  if(!planPrimaryRosterProfiles({staff:support||{}},faculty||emptyFaculty(),now()).created.length)return support;
  const result=await db.ref('cbse/mission').transaction(current=>planPrimaryRosterProfiles(current,faculty||emptyFaculty(),now()).next);
  if(!result.committed||!result.snapshot.val())throw new AccessError('The Primary staff list could not be prepared. Refresh Roll Call to retry.',409);
  return result.snapshot.val().staff;
 }
 async function finalExamReviewers(directory){
  const staff=directory||await directoryStaff();
  const access=await read('cbse/staffAccess')||{};
  return FINAL_EXAM_IC_NAMES.flatMap(name=>{
   const matches=entries(staff).filter(([id,person])=>person.status==='active'&&access[id]?.enabled&&rollNameKey(person.name)===rollNameKey(name));
   const candidates=[...new Set(matches.map(([id,person])=>person.pinOwnerId||id))].sort();
   const id=candidates[0];
   return id&&candidates.every(candidate=>rollStaffIdentityIds(staff,id).includes(candidate))?[{id,name}]:[];
  });
 }
 async function preparePrimaryRoster(){
  await preparedPrimaryStaff(...await Promise.all([read('cbse/mission/staff'),read('cbse/facultyDraft')]));
 }
 async function principal(token){const decoded=await auth.verifyIdToken(token,true),uid=await read('cbse/adminUid');if(decoded.uid!==uid)throw new AccessError('Principal access required.');return decoded;}
 async function staffUser(token){const decoded=await auth.verifyIdToken(token,true);if(decoded.missionStaff!==true||typeof decoded.staffId!=='string')throw new AccessError('Staff access required.');const access=await read(`cbse/staffAccess/${decoded.staffId}`);if(!access?.enabled||decoded.pinVersion!==access.version)throw new AccessError('Staff access has been disabled or reset. Sign in again.');return {decoded,access};}
 const pinAttempts=createPINAttemptLimiter({db,restTransaction,now});
 async function pinDatabase(operation){try{return await operation();}catch(error){console.error('PIN_DATABASE_REQUEST_FAILED',String(error?.code||'database-request'));throw new AccessError('PIN verification could not reach the database. No save was attempted. Please retry in a moment.',503);}}
 async function throttle(staffId,ip){const ticket=await pinDatabase(()=>pinAttempts.reserve(staffId,ip));if(!ticket.allowed)throw new AccessError('Too many PIN attempts. Try again in 15 minutes.',429);return ticket;}
 async function verifySubmissionPIN(id,pin,access,ip,profile,linkedIds=[]){
  const owner=(profile||(await directoryStaff())[id])?.pinOwnerId;if(owner&&owner!==id){id=owner;access=await read('cbse/staffAccess/'+owner);if(!access?.enabled)throw new AccessError('Staff PIN access is disabled.',403);}
  if(!pin)throw new AccessError('Enter your personal PIN for this submission on the student profile.',403);
  const ticket=await throttle(linkedIds[0]||id,'submit|'+ip);
  if(!await verifyPIN(pin,access)){
   const alternatives=await Promise.all(linkedIds.filter(key=>key!==id).map(async key=>[key,await read('cbse/staffAccess/'+key)]));
   let match;
   for(const [key,record] of alternatives){
    if(record?.enabled&&await verifyPIN(pin,record)){match={id:key,access:record};break;}
   }
   if(!match)throw new AccessError('The PIN does not match this staff member.',401);
   ({id,access}=match);
  }
  await pinPolicy.assertSelected(pin,'staff:'+id);await pinDatabase(()=>pinAttempts.clear(ticket));
  return {id,access};
 }
 async function revoke(staffId){try{await auth.revokeRefreshTokens('mission_'+createHash('sha256').update(staffId).digest('hex').slice(0,40));}catch(e){if(e.code!=='auth/user-not-found')throw e;}}
 const sharedView=createSharedView({db,context,now,defaultSecret:viewSecret});
 async function officeDirectoryStaff(){const[faculty,support]=await Promise.all([readVersioned('cbse/facultyDraft','cbse/facultyDraft/revision',{fresh:true}),readVersioned('cbse/mission/staff','cbse/mission/revision',{fresh:true})]);const mission={staff:support||{}};return Object.fromEntries(entries(staffIndex(faculty,mission,{includeRollOnly:true})).map(([id,p])=>[id,{...p,officeIdentityIds:teacherIdentityIds(id,faculty,mission)}]));}
 const officeService=createOfficeService({db,read,principal,hashPIN,verifyPIN,pinPolicy,throttle,clearAttempt:ticket=>pinDatabase(()=>pinAttempts.clear(ticket)),displayKey,now,directoryStaff:officeDirectoryStaff,sharedView,AccessError});
 async function classIXSeating(){
  const [record,staff,access]=await Promise.all([read('cbse/taskClassIXSeating'),directoryStaff(),read('cbse/staffAccess')]);
  const matches=entries(staff).filter(([id,person])=>person.status==='active'&&access?.[id]?.enabled&&rollNameKey(person.name)===rollNameKey(CLASS_IX_EXAM_IC));
  const eligible=[...new Set(matches.map(([id,person])=>person.pinOwnerId||id))];
  const qpAssignments=record?.qpAssignments||{};
  if(record?.qpNotes?.values){
   qpAssignments.values=Object.fromEntries(CLASS_IX_PAPERS.map(([, ,subject])=>[subject,
    [...new Set([record.qpNotes.values[subject],qpAssignments.values?.[subject]].filter(Boolean))].join('\n')]));
  }
  return {revision:record?.revision||0,rooms:record?.rooms||{},duties:record?.duties||{},dateNotes:record?.dateNotes||{},qpAssignments,icId:eligible.length===1?eligible[0]:''};
 }
 async function saveClassIXComments(input,key,actor){
  const fields=CLASS_IX_PAPERS.map(([, ,subject])=>subject),maximum=key==='qpAssignments'?1001:500;
  if(!input.values||typeof input.values!=='object'||Object.keys(input.values).length!==fields.length||
   fields.some(subject=>!Object.hasOwn(input.values,subject)||typeof input.values[subject]!=='string'||input.values[subject].trim().length>maximum))
   throw new AccessError('Enter up to '+maximum+' characters per paper.',400);
  if(actor.id&&(await classIXSeating()).icId!==actor.id)
   throw new AccessError('Only Mrs. Jyoti Verma can update Class IX Exam Department instructions with her PIN.',403);
  const values=Object.fromEntries(fields.map(subject=>[subject,input.values[subject].trim()]));
  const result=await mcqTransaction(db,'cbse',current=>{
   if(current===null)return null;
   if(actor.uid?current.adminUid!==actor.uid:!current.staffAccess?.[actor.id]?.enabled||current.staffAccess[actor.id].version!==actor.version)return;
   const plan=current.taskClassIXSeating||{},revision=plan[key]?.revision||0;
   if(revision!==input.expectedRevision)return;
   return {...current,taskClassIXSeating:{...plan,[key]:{values,revision:revision+1},...(key==='qpAssignments'?{qpNotes:null}:{})}};
  },{restTransaction});
  if(!result.committed||!result.snapshot.val()?.taskClassIXSeating?.[key])throw new AccessError('These comments changed. Reopen Task 3 before saving.',409);
  return result.snapshot.val().taskClassIXSeating[key];
 }
 async function saveClassIXSeating(input,id,access){
  const seating=await classIXSeating();
  if(seating.icId!==id)throw new AccessError('Only Mrs. Jyoti Verma can update Class IX seating with her PIN.',403);
  const duties={};
  if(!input.duties||typeof input.duties!=='object'||Array.isArray(input.duties)||Object.keys(input.duties).length!==CLASS_IX_SEATING.length)
   throw new AccessError('Fill out the seating schedule for all roll ranges.',400);
  for(const {key} of CLASS_IX_SEATING){
   const entry=Object.hasOwn(input.duties,key)?input.duties[key]:null;
   if(!entry||CLASS_IX_SEATING_FIELDS.some(([field])=>typeof entry[field]!=='string'||entry[field].trim().length>80))
    throw new AccessError('Enter exam areas and invigilator names of up to 80 characters.',400);
   const duty=Object.fromEntries(CLASS_IX_SEATING_FIELDS.map(([field])=>[field,entry[field].trim()]));
   const validTime=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
   if((duty.from||duty.to)&&(!validTime.test(duty.from)||!validTime.test(duty.to)||duty.from>=duty.to))
    throw new AccessError('Enter both duty times with From earlier than To.',400);
   duties[key]=duty;
  }
  const result=await mcqTransaction(db,'cbse',current=>{
   if(current===null)return null;
   const revision=current.taskClassIXSeating?.revision||0;
   if(revision!==input.expectedRevision||!current.staffAccess?.[id]?.enabled||current.staffAccess[id].version!==access.version)return;
   return {...current,taskClassIXSeating:{...current.taskClassIXSeating,revision:revision+1,duties}};
  },{restTransaction});
  if(!result.committed||!result.snapshot.val()?.taskClassIXSeating)throw new AccessError('Seating changed. Reopen Task 3 before saving.',409);
  return {duties,revision:input.expectedRevision+1,icId:id};
 }
 const halfYearlyPath='cbse/taskHalfYearly';
 const marksCheckers=(plan,faculty,mission,overrides)=>publishedMarksCheckers(plan,
  staffIndex(faculty,mission,{includeRollOnly:true}),id=>teacherIdentityIds(id,faculty,mission),overrides);
 const codedExamStudent=(key,prefix)=>'Student '+createHmac('sha256',displayKey).update(prefix+key).digest('hex').slice(0,10).toUpperCase();
 const classIXAssignments=(state,faculty,mission)=>assignClassIXMathsD(state,
  staffIndex(faculty,mission,{includeRollOnly:true}),id=>teacherIdentityIds(id,faculty,mission));
 async function halfYearlyWorkspace(input,actor){
  const exam=input.exam==='class-ix'?CLASS_IX_EXAM:undefined;
  const stateKey=exam?'taskClassIX':'taskHalfYearly',statePath='cbse/'+stateKey;
  const classLabel='Class '+(exam?.classId||'XI'),examName=exam?.name||'Half-Yearly';
  const {faculty,mission}=await context();
  const ids=actor.uid?undefined:new Set(teacherIdentityIds(actor.id,faculty,mission));
  const operation=input.operation==='task-manager'?input.taskOperation:input.operation;
  if(operation==='pb1-read'){
   const [state,plan,overrides]=await Promise.all([read(statePath),ids&&!exam?read('cbse/taskMonitoring/published'):null,ids&&!exam?read('cbse/taskMonitoring/overrides'):null]);
   return {...halfYearlyReport(exam?classIXAssignments(state,faculty,mission):state,ids,marksCheckers(plan,faculty,mission,overrides||{})),...(ids?{teacherIds:[...ids]}:{})};
  }
  let imported;
  if(operation==='half-yearly-import'){
   if(!actor.uid)throw new AccessError('Principal access required.',403);
   const identify=(kind,...parts)=>kind==='teacher'?(teacherIdentityIds(parts[0],faculty,mission).sort()[0]||parts[0]):
    createHash('sha256').update(JSON.stringify([kind,...parts])).digest('hex').slice(0,32);
   try{imported=importHalfYearly(input.csv,staffIndex(faculty,mission,exam?{includeRollOnly:true}:undefined),identify,exam);}
   catch(error){throw new AccessError(error.message,400);}
  }
  const stamp=now();let reason;
  const transaction=await mcqTransaction(db,'cbse',current=>{
   // Firebase may call the updater with an empty local cache before loading the server value.
   if(current===null)return null;
   reason='';
   try{
    if(actor.uid?current.adminUid!==actor.uid:!current.staffAccess?.[actor.id]?.enabled||current.staffAccess[actor.id].version!==actor.accessVersion)
     throw Error('Your access changed. Sign in or verify your PIN again.');
    const state=current[stateKey];
    let next;
    if(imported){
     if((state?.revision||0)!==input.expectedRevision)throw Error('The '+classLabel+' roster changed. Reopen the analyser before importing.');
     const papers={...state?.papers},roster={...state?.roster};
     for(const [key,paper] of Object.entries(imported.papers)){
      const prior=papers[key];
      if(prior?.approvedAt)throw Error('An uploaded paper is already approved and frozen.');
      const students={...prior?.students,...paper.students};
      for(const [id,marks] of Object.entries(prior?.students||{})){
       if(exam&&marks.weeklyActions)students[id]={...students[id],weeklyActions:marks.weeklyActions};
       if(!marks.current)continue;
       if(prior.maximum!==paper.maximum)throw Error('Cannot change the maximum of a paper with saved '+examName+' marks.');
       students[id]={...students[id],current:marks.current};
      }
      papers[key]={...paper,students};
     }
     for(const {paperId,studentId} of imported.excluded){
      const paper=papers[paperId],prior=paper?.students?.[studentId];
      if(!prior)continue;
      if(paper.approvedAt||prior.current||prior.weeklyActions)throw Error(prior.weeklyActions?'An unenrolled subject has recorded remedial actions. Review the paper before importing.':'An unenrolled subject conflicts with saved '+examName+' marks. Review the paper before importing.');
      const students={...paper.students};delete students[studentId];
      if(Object.keys(students).length)papers[paperId]={...paper,students};
      else delete papers[paperId];
     }
     for(const [key,student] of Object.entries(imported.roster)){
      if(roster[key]&&roster[key].name!==student.name)throw Error('An imported roll number already belongs to a different student.');
      roster[key]=student;
     }
     next={...state,revision:(state?.revision||0)+1,papers,roster};
    }else{
     const {faculty,mission}=resolvedViewingData(current.draft,current.facultyDraft,current.mission||emptyMission());
     const allowed=actor.uid?undefined:new Set(teacherIdentityIds(actor.id,faculty,mission));
     const assigned=exam?classIXAssignments(state,faculty,mission):state;
     let studentKey=input.studentKey;
     if(exam&&operation==='class-ix-remedial-save'&&input.codedStudent){
      const paper=Object.hasOwn(assigned?.papers||{},input.subjectId)?assigned.papers[input.subjectId]:null;
      if(!paper||!allowed?.has(paper.teacherId))throw Error('This Class IX paper is outside your assigned teaching scope.');
      const matches=Object.keys(paper.students||{}).filter(key=>codedExamStudent(key,'class-ix-public:')===input.codedStudent);
      if(matches.length!==1)throw Error('This student could not be identified. Reopen the remedial list.');
      studentKey=matches[0];
     }
     next=updateHalfYearly(structuredClone(assigned),{...input,operation,studentKey},allowed,stamp,exam?()=>[]:marksCheckers(current.taskMonitoring?.published,faculty,mission,current.taskMonitoring?.overrides),exam);
    }
    const result={...current,[stateKey]:exam&&imported?classIXAssignments(next,faculty,mission):next};
    if(!exam&&operation==='pb1-approve'&&current.taskMonitoring){
     const paper=Object.values(next.papers).find(p=>p.classId===input.classId&&p.sectionId===input.sectionId&&p.subjectId===input.subjectId);
     result.taskMonitoring=advanceFrozenDiscussions(current.taskMonitoring,[paper]);
    }
    return result;
   }catch(error){reason=error.message;return;}
  },{restTransaction});
  const saved=transaction.committed&&transaction.snapshot?.val()?.[stateKey];
  if(!saved)throw new AccessError(reason||classLabel+' changes could not be saved. Refresh and retry.',409);
  const current=transaction.snapshot.val(),plan=current.taskMonitoring;
  return {...halfYearlyReport(saved,ids,exam?()=>[]:marksCheckers(plan?.published,faculty,mission,plan?.overrides)),...(ids?{teacherIds:[...ids]}:{})};
 }
 const pb1Sections=(draft,faculty)=>['X','XII'].flatMap(classId=>entries(draft?.classes?.[classId]?.sections).map(([id,section])=>{
  const group=faculty?.classes?.[classId];
  return {classId,section:section.name,teacher:group?.teachers?.[group.roles?.[id]?.classTeacher]?.name||''};
 }));
 const pb1Roster=draft=>Object.values(studentIndex(draft)).filter(p=>['X','XII'].includes(p.classId))
  .map(({key,name,roll,classId,section})=>({key,name,roll:roll??'',classId,section}));
 const pb1Mission=(draft,mission,published)=>withPublishedPB1Evaluators(mission,published,pb1Scopes(draft,mission,{}));
 const pb1FreezeToken=(paper,rows)=>createHash('sha256').update(JSON.stringify([
  paper.maximum,...rows.map(row=>[row.key,row.markId,row.current?.score,row.current?.maximum,!!row.current?.absent]).sort(([a],[b])=>a.localeCompare(b)),
 ])).digest('hex');
 function principalPB1Report(report){
  const rowsByScope=new Map();
  for(const row of report.rows){
   const rows=rowsByScope.get(row.scope)||[];
   rows.push(row);rowsByScope.set(row.scope,rows);
  }
  return {...report,scopes:report.scopes.map((paper,index)=>({...paper,freezeToken:pb1FreezeToken(paper,rowsByScope.get(index)||[])}))};
 }
 function supportPortfolioData(draft,faculty,mission,actor){
  const directory=staffIndex(faculty,mission,{includeRollOnly:true});
  const identity=id=>teacherIdentityIds(id,faculty,mission).sort()[0]||id;
  const ids=actor.id?new Set(teacherIdentityIds(actor.id,faculty,mission)):undefined;
  const report=pb1Report(draft,mission,directory,undefined,identity);
  const cases=portfolioCases(report).flatMap(entry=>{
   const {classId,sectionId}=entry.paper;
   const roles=faculty?.classes?.[classId]?.roles?.[sectionId];
   const classTeacherKeys=[roles?.classTeacher,roles?.coClassTeacher].filter(Boolean)
    .map(id=>classId+':'+id).filter(id=>directory[id]?.status==='active').map(identity);
   const canRecordIssues=!!ids&&classTeacherKeys.some(id=>ids.has(id));
   const canRecordPlan=!!ids&&entry.paper.teachers.some(({key})=>ids.has(key));
   return !ids||canRecordIssues||canRecordPlan?[{...entry,classTeacherKeys,canRecordIssues,canRecordPlan}]:[];
  });
  return {cases,ids,directory};
 }
 async function supportPortfolio(input,actor){
  const publicationPath='cbse/taskPB1PortfolioPublished';
  if(['portfolio-publish','portfolio-unpublish'].includes(input.operation)){
   if(!actor.uid)throw new AccessError('Principal access required.',403);
   const published=input.operation==='portfolio-publish';
   const result=await mcqTransaction(db,publicationPath,()=>published,{restTransaction});
   if(!result.committed)throw new AccessError('The publication status could not be saved. Try again.',409);
   return {published};
  }
  const published=await read(publicationPath)===true;
  if(input.operation==='portfolio-directory'){
   if(!published)return {published,teachers:[]};
   const [{draft,faculty,mission},access]=await Promise.all([context(),read('cbse/staffAccess')]);
   const {cases,directory}=supportPortfolioData(draft,faculty,mission,actor);
   const assigned=new Set(cases.flatMap(entry=>[...entry.classTeacherKeys,...entry.paper.teachers.map(({key})=>key)]));
   return {published,teachers:evaluatorDirectory(directory,access||{},id=>teacherIdentityIds(id,faculty,mission),assigned)};
  }
  if(input.operation==='portfolio-advisory-save'){
   if(!actor.uid)throw new AccessError('Principal access required.',403);
   const {caseKey,instructions,additional,revision}=input;
   if(typeof caseKey!=='string'||caseKey.length>700||typeof instructions!=='string'||!instructions.trim()||
      instructions.length>8000||typeof additional!=='string'||additional.length>8000||!Number.isSafeInteger(revision)||revision<0)
    throw new AccessError('Enter valid advisory instructions and additions.',400);
   const {draft,faculty,mission}=await context();
   if(!supportPortfolioData(draft,faculty,mission,actor).cases.some(item=>item.key===caseKey))
    throw new AccessError('This student subject is outside the portfolio.',404);
   const key=createHash('sha256').update(caseKey).digest('hex');
   const advisory={instructions:instructions.trim(),additional:additional.trim(),revision:revision+1,updatedAt:now()};
   const saved=await mcqTransaction(db,'cbse/taskPB1Advisories/'+key,current=>{
    if(!current&&revision)return null;
    if((current?.revision||0)===revision)return advisory;
    if(current.revision===advisory.revision&&current.instructions===advisory.instructions&&current.additional===advisory.additional)return current;
   },{restTransaction});
   if(!saved.committed||!saved.snapshot.val())throw new AccessError('The advisory changed. Reopen the portfolio to load the latest draft.',409);
   return {advisory:saved.snapshot.val()};
  }
  if(!actor.uid&&!published)throw new AccessError('Task 5 is awaiting publication.',403);
  if(input.taskOperation!=='portfolio-save'){
   const [{draft,faculty,mission},actions,advisories]=await Promise.all([
    context(),read('cbse/taskPB1Portfolio'),actor.uid?read('cbse/taskPB1Advisories'):null
   ]);
   const {cases,ids,directory}=supportPortfolioData(draft,faculty,mission,actor);
   const byCase=source=>Object.fromEntries(cases.flatMap(({key,row})=>[key,JSON.stringify(['issues',row.key])]).map(key=>[key,source?.[createHash('sha256').update(key).digest('hex')]]));
   return {...portfolioView(cases,mission,byCase(actions),ids,draft,directory,byCase(advisories)),published};
  }
  if(typeof input.caseKey!=='string'||input.caseKey.length>700||
     typeof input.entryId!=='string'||!/^[a-f0-9-]{36}$/.test(input.entryId))throw new AccessError('Choose a portfolio case.',400);
  const stamp=now();
  let reason;
  const saved=await mcqTransaction(db,'cbse',current=>{
   if(!current)return null;
   try{
    if(current.taskPB1PortfolioPublished!==true)throw Error('Task 5 is awaiting publication.');
    const access=current.staffAccess?.[actor.id];
    if(!access?.enabled||access.version!==actor.version)throw Error('Your PIN access changed. Verify again.');
    const {draft}=current,{faculty,mission}=resolvedViewingData(draft,current.facultyDraft,current.mission||emptyMission());
    const {cases}=supportPortfolioData(draft,faculty,mission,actor);
    const issueEntry=input.kind==='issues';
    const allowed=issueEntry?cases.some(item=>item.canRecordIssues&&JSON.stringify(['issues',item.row.key])===input.caseKey):
     cases.some(item=>item.canRecordPlan&&item.key===input.caseKey);
    if(!allowed)throw Error(issueEntry?'Only the assigned CT or Co-CT can record this student issue.':
     'Only the assigned subject teacher can record efforts and the action plan.');
    const entry=portfolioAction(input,actor,stamp);
    const key=createHash('sha256').update(input.caseKey).digest('hex');
    const entries=current.taskPB1Portfolio?.[key]||{};
    return {...current,taskPB1Portfolio:{...current.taskPB1Portfolio,[key]:{...entries,[input.entryId]:entries[input.entryId]||entry}}};
   }catch(error){reason=error.message;return;}
  },{restTransaction});
  if(!saved.committed)throw new AccessError(reason||'The action could not be saved. Try again.',409);
  return supportPortfolio({},actor);
 }
 async function samagamPB1Workspace(input,actor){
  const plan=(draft,mission)=>planSamagamPB1(input.files,draft,mission,stamp);
  const stamp=now();
  const token=(draft,mission,result)=>createHash('sha256').update(JSON.stringify([
   draft.revision||0,mission.revision||0,result.mission.samagamPB1.fingerprint
  ])).digest('hex');
  if(input.operation==='pb1-samagam-preview'){
   const {draft,mission}=await context();
   try{
    const result=plan(draft,mission);
    return {summary:result.summary,previewToken:token(draft,mission,result)};
   }catch(error){throw new AccessError(error.message,400);}
  }
  let summary,reason;
  const saved=await mcqTransaction(db,'cbse',current=>{
   if(current===null)return null;
   try{
    if(current.adminUid!==actor.uid)throw Error('Principal access changed. Sign in again.');
    const {draft}=current,mission=current.mission||emptyMission(),result=plan(draft,mission);
    if(mission.samagamPB1?.fingerprint===result.mission.samagamPB1.fingerprint){
     summary=result.summary;
     return current;
    }
    if(token(draft,mission,result)!==input.previewToken){
     throw Error('The app roster or marks changed. Preview the import again.');
    }
    summary=result.summary;
    return {...current,draft:result.draft,mission:result.mission};
   }catch(error){reason=error.message;return;}
  },{restTransaction});
  if(!saved.committed||!saved.snapshot?.val()||!summary)throw new AccessError(reason||'The import could not be confirmed.',409);
  return {summary};
 }
 async function pb1Workspace(input,actor){
  function scoped(draft,faculty,mission){
   const staff=staffIndex(faculty,mission,{includeRollOnly:true}),ids=actor.uid?undefined:new Set(teacherIdentityIds(actor.id,faculty,mission));
   const identity=id=>teacherIdentityIds(id,faculty,mission).sort()[0]||id;
   return {staff,ids,identity};
  }
  const [initial,published,overrides]=await Promise.all([context(),read('cbse/taskMonitoring/published'),read('cbse/taskMonitoring/overrides')]);
  initial.mission=pb1Mission(initial.draft,initial.mission,published);
  const scope=scoped(initial.draft,initial.faculty,initial.mission);
  const entryReport=(draft,faculty,report,ids)=>{
   const hqVerification=hqPB1Verification(actor.uid?undefined:report.scopes);
   return actor.uid?{...principalPB1Report(report),roster:pb1Roster(draft),classSections:pb1Sections(draft,faculty),hqVerification}:
    {...report,teacherIds:[...ids],hqVerification};
  };
  if(input.operation==='pb1-read'||input.taskOperation==='pb1-read')
   return entryReport(initial.draft,initial.faculty,pb1Report(initial.draft,initial.mission,scope.staff,scope.ids,scope.identity,
    marksCheckers(published,initial.faculty,initial.mission,overrides||{})),scope.ids);
  const approving=input.operation==='pb1-approve'&&!!actor.uid;
  const unfreezing=input.operation==='pb1-unfreeze'&&!!actor.uid;
  if(!approving&&!unfreezing&&(!Array.isArray(input.entries)||!input.entries.length||input.entries.length>200))
   throw new AccessError('Enter at least one mark or AB.',400);
  const stamp=now();let reason;
  const result=await mcqTransaction(db,'cbse',current=>{
   if(current===null)return null;
   try{
    if(actor.uid?current.adminUid!==actor.uid:!current.staffAccess?.[actor.id]?.enabled||current.staffAccess[actor.id].version!==actor.accessVersion)
     throw Error('Your access changed. Sign in or verify your PIN again.');
    const raw=current.mission||emptyMission(),draft=current.draft,{faculty,mission}=resolvedViewingData(draft,current.facultyDraft,raw);
    const stale=(raw.revision||0)!==input.expectedRevision;
    if(stale&&(unfreezing||approving&&input.freezeToken===undefined))throw Error('Mission 100 results changed. Reopen the analyser before saving.');
    const assigned=pb1Mission(draft,mission,current.taskMonitoring?.published);
    const {staff,ids,identity}=scoped(draft,faculty,assigned);
    const report=pb1Report(draft,assigned,staff,ids,identity,marksCheckers(current.taskMonitoring?.published,faculty,mission,current.taskMonitoring?.overrides));
    const index=report.scopes.findIndex(info=>['classId','sectionId','subjectId'].every(key=>info[key]===input[key]));
    if(index<0)throw Error('This Preboard 1 paper is outside your assigned teaching scope.');
    const paper=report.scopes[index],roster=new Map(report.rows.filter(row=>row.scope===index).map(row=>[row.key,row])),seen=new Set();
    const approvalKey=pb1ApprovalKey(paper.classId,paper.sectionId,paper.subjectId);
    const existingApproval=raw.pb1Approvals?.[approvalKey];
    if(paper.samagamFinal)throw Error('This paper uses final Samagam marks. Import updated Samagam statements to make a correction.');
    if(unfreezing){
     if(!existingApproval?.approvedAt)throw Error('This Preboard 1 paper is already open for marks entry.');
     const pb1Approvals={...raw.pb1Approvals,[approvalKey]:{unfrozenAt:stamp,discussionComment:existingApproval.discussionComment||''}};
     return {...current,mission:{...raw,pb1Approvals,revision:(raw.revision||0)+1}};
    }
    if(existingApproval?.approvedAt)throw Error('This Preboard 1 paper is approved and frozen. Ask the Principal to unfreeze it for correction.');
    if(approving){
     if(input.freezeToken!==undefined&&input.freezeToken!==pb1FreezeToken(paper,[...roster.values()]))
      throw Error('This paper’s marks or roster changed. Refresh the analysis and review the paper before freezing.');
     if(!roster.size||[...roster.values()].some(row=>!row.current||!row.markId))
      throw Error('Enter marks or AB for every enrolled student before approving this paper.');
     if([...roster.values()].some(row=>row.current.maximum!==paper.maximum))
      throw Error('Correct saved marks with a different paper maximum before approval.');
     const marks=Object.fromEntries([...roster].map(([key,row])=>[
      key,{...raw.marks[row.markId],id:row.markId,exam:raw.exams[row.examId]},
     ]));
     const pb1Approvals={...raw.pb1Approvals,[approvalKey]:{approvedAt:stamp,marks,discussionComment:paperDiscussionComment(input.discussionComment)}};
     return {...current,mission:{...raw,pb1Approvals,revision:(raw.revision||0)+1},
      ...(current.taskMonitoring?{taskMonitoring:advanceFrozenDiscussions(current.taskMonitoring,[{...paper,approvedAt:stamp}])}:{})};
    }
    if(stale&&(input.expectedMaximum!==paper.maximum||input.entries.some(entry=>{
     const current=roster.get(entry?.key)?.current;
     const previous=entry?.previous;
     return current?(!previous||current.score!==previous.score||!!current.absent!==previous.absent||current.maximum!==previous.maximum):previous!==null;
    })))throw Error('Mission 100 results changed for these marks. Reopen this paper before saving.');
    const stable=parts=>createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0,24);
    const defaultExam='pb1_'+stable([paper.classId,paper.date,paper.subject]);
    const exams={...raw.exams},marks={...raw.marks};
    for(const entry of input.entries){
     if(!entry||!roster.has(entry.key)||seen.has(entry.key))throw Error('Use each enrolled student once.');
     seen.add(entry.key);
     const absent=typeof entry.mark==='string'&&/^ABS?$/i.test(entry.mark.trim());
     if(!absent&&(typeof entry.mark!=='number'||!Number.isFinite(entry.mark)||entry.mark<0||entry.mark>paper.maximum))throw Error('Enter AB, ABS or a mark between 0 and '+paper.maximum+'.');
     const existing=roster.get(entry.key),examId=existing.examId||defaultExam,markId=existing.markId||'pb1_'+stable([entry.key,paper.subjectId,examId]);
     exams[examId]??={name:'Preboard 1 · '+paper.subject.slice(0,80),type:'PB-1',classId:paper.classId,date:paper.date};
     const previous=marks[markId],rubric=previous?.maximum===paper.maximum?previous:{};
     marks[markId]={...rubric,studentKey:entry.key,subjectId:paper.subjectId,examId,maximum:paper.maximum,absent,score:absent?null:entry.mark,
      updatedAt:stamp,updatedBy:actor.id||'principal'};
     if(marks[markId].importSource==='monthly_workbook_v1'){
      marks[markId].inferredAbsent=false;marks[markId].sourceValue=absent?'AB':String(entry.mark);
     }
    }
    return {...current,mission:{...raw,exams,marks,revision:(raw.revision||0)+1}};
   }catch(error){reason=error.message;return;}
  },{restTransaction});
  if(!result.committed||!result.snapshot.val())throw new AccessError(reason||'The marks could not be confirmed. Reopen the analyser.',409);
  const saved=result.snapshot.val(),{faculty,mission}=resolvedViewingData(saved.draft,saved.facultyDraft,saved.mission);
  const assigned=pb1Mission(saved.draft,mission,saved.taskMonitoring?.published);
  const access=scoped(saved.draft,faculty,assigned);
  return entryReport(saved.draft,faculty,pb1Report(saved.draft,assigned,access.staff,access.ids,access.identity,
   marksCheckers(saved.taskMonitoring?.published,faculty,mission,saved.taskMonitoring?.overrides)),access.ids);
 }
 async function monitoringWithFrozenDiscussions(monitoring){
  const discussion=MONITORING_STEPS.findIndex(step=>step.review);
  const awaiting=Object.entries(monitoring?.published?.assignments||{})
   .filter(([key])=>monitoringStage(monitoring.progress?.[key])===discussion).map(([,entry])=>entry);
  if(!awaiting.length)return monitoring;
  const xi=entry=>/^(?:Class\s+)?(?:11|XI)\s*-?\s*[A-E]$/i.test(String(entry.section||'').trim());
  const [approvals,halfYearly]=await Promise.all([
   awaiting.some(entry=>!xi(entry))?readVersioned('cbse/mission/pb1Approvals','cbse/mission/revision'):null,
   awaiting.some(xi)?readVersioned(halfYearlyPath,halfYearlyPath+'/revision'):null,
  ]);
  const papers=Object.values(halfYearly?.papers||{});
  if(Object.keys(approvals||{}).length){
   const draft=await readVersioned('cbse/draft','cbse/draft/revision');
   papers.push(...pb1Scopes(draft,{pb1Approvals:approvals},{}));
  }
  if(advanceFrozenDiscussions(monitoring,papers)===monitoring)return monitoring;
  // Recheck the approvals inside the transaction in case a paper was just unfrozen.
  const result=await mcqTransaction(db,'cbse',current=>{
   if(current===null)return null;
   const frozenPapers=[
    ...Object.values(current.taskHalfYearly?.papers||{}),
    ...pb1Scopes(current.draft,current.mission||{},{}),
   ];
   const next=advanceFrozenDiscussions(current.taskMonitoring,frozenPapers);
   return next===current.taskMonitoring?undefined:{...current,taskMonitoring:next};
  },{restTransaction});
  return result.snapshot?.val()?.taskMonitoring||await read(monitoringPath);
 }
 async function reopenTaskUpload(input,actor,staff){
  let reason;
  const stamp=now();
  const result=await mcqTransaction(db,'cbse/taskMonitoring',current=>{
   if(current===null)return null;
   try{
    const published=current.published;
    const effective=staff?resolvePublishedMonitoringAssignments(published,monitoringDirectory(staff),current.overrides):published;
    const next=monitoringReopenUpload({...current,published:effective},input,stamp,actor);
    return {...next,published};
   }catch(error){reason=error.message;return;}
  },{restTransaction});
  const monitoring=result.committed&&result.snapshot?.val();
  if(!monitoring)throw new AccessError(reason||'The signed PDF step could not be reopened.',409);
  return monitoring;
 }
 function retestTeachers(row,staff,access){
  const eligible=new Map(),directory=entries(staff);
  for(const name of [row.subjectTeacher,row.classTeacher]){
   const key=rollNameKey(name);
   if(!key)continue;
   const official=secondaryStaffEntry({name}),matches=directory.filter(([,person])=>person.status==='active'&&
    (rollNameKey(person.name)===key||official&&secondaryStaffEntry(person)?.serial===official.serial));
   const id=matches[0]?.[0];
   if(!id||!matches.every(([candidate])=>rollStaffIdentityIds(staff,id).includes(candidate)))continue;
   for(const [candidate,person] of matches){
    const owner=person.pinOwnerId||candidate;
    if(access?.[owner]?.enabled&&staff[owner]?.status==='active')eligible.set(owner,{id:owner,name:staff[owner].name});
   }
  }
  return [...eligible.values()];
 }
 async function retestWorkspace(input,actor,session){
  const path='cbse/taskRetest';
  if(!actor){
   if(input.operation!=='retest-read')throw new AccessError('Principal access required.',403);
   const record=await read(path);
   if(!record?.published)return {published:false};
   const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');
   if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}
   const [staff,pins]=await Promise.all([directoryStaff(),read('cbse/staffAccess')]);
   const rows=record.rows||{};
   return {published:true,revision:record.revision,rows,
    editors:Object.fromEntries(entries(rows).map(([id,row])=>[id,retestTeachers(row,staff,pins)]))};
  }
  if(actor.id){
   const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');
   if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}
  }
  if(input.operation==='retest-read')return await read(path)||{revision:0,published:false,rows:{}};
  let imported;
  if(input.operation==='retest-import'){
   try{imported=parseRetestCSV(input.csv);}catch(error){throw new AccessError(error.message,400);}
  }
  let reason;
  const result=await mcqTransaction(db,'cbse',current=>{
   if(current===null)return null;
   if(actor.uid?current.adminUid!==actor.uid:
    !current.staffAccess?.[actor.id]?.enabled||current.staffAccess[actor.id].version!==actor.version)return;
   const plan=current.taskRetest||{},revision=plan.revision||0,rows=plan.rows||{};
   if(revision!==input.expectedRevision)return;
   try{
    let next={...plan,revision:revision+1};
    if(actor.id){
     const {rowId,step,value,comment}=input,row=Object.hasOwn(rows,rowId)?rows[rowId]:null;
     if(!plan.published||!row||!RETEST_STEPS.some(([key])=>key===step)){
      reason='Choose a published retest step.';return;
     }
     const staff=rollDirectory(current.facultyDraft,current.mission?.staff,current.draft);
     if(!retestTeachers(row,staff,current.staffAccess).some(person=>person.id===actor.id)){
      reason='Only the assigned subject or class teacher may update this retest.';return;
     }
     next.rows=retestUpdates(rows,{[rowId]:{[step]:value,[step+'Comment']:comment}});
    }else if(imported){
     const {draft,faculty,mission}=resolvedViewingData(current.draft,current.facultyDraft,current.mission||emptyMission());
     const papers=[...pb1Scopes(draft,mission,staffIndex(faculty,mission,{includeRollOnly:true})),...Object.values(current.taskHalfYearly?.papers||{})];
     const subjectKey=value=>String(value||'').toUpperCase().replace(/MATHEMATICS/g,'MATHS')
      .replace(/ARTIFICIAL INTELLIGENCE/g,'AI').replace(/INFORMATICS PRACTICES/g,'IP').replace(/[^A-Z0-9]/g,'');
     const teacherFor=row=>{
      const [classId,section]=row.classLabel.split(' '),group=faculty?.classes?.[classId];
      const sectionId=entries(draft?.classes?.[classId]?.sections).find(([,value])=>value.name===section)?.[0];
      const classTeacher=group?.teachers?.[group.roles?.[sectionId]?.classTeacher]?.name||'';
      const names=new Set(papers.filter(paper=>paper.classId===classId&&paper.section===section&&
       [paper.subject,paper.paperName].some(subject=>subjectKey(subject)===subjectKey(row.subject))).flatMap(paper=>paper.teachers?.map(person=>person.name)||(paper.teacher?[paper.teacher]:[])));
      return {classTeacher,subjectTeacher:names.size===1?[...names][0]:''};
     };
     next.rows={...rows,...Object.fromEntries(Object.entries(imported).map(([id,row])=>[id,{...teacherFor(row),...rows[id],...row}]))};
    }else if(input.operation==='retest-save')next.rows=retestUpdates(rows,input.changes);
    else if(input.operation==='retest-publish'){
     if(!Object.keys(rows).length)throw Error('Import the absentee list before publishing.');
     next.published=true;
    }else if(input.operation==='retest-unpublish')next.published=false;
    else throw Error('Choose a Task 4 operation.');
    return {...current,taskRetest:next};
   }catch(error){reason=error.message;return;}
  },{restTransaction});
  const record=result.committed&&result.snapshot.val()?.taskRetest;
  if(!record)throw new AccessError(reason||'Task 4 changed. Reopen the tracker before saving.',409);
  return actor.id?{revision:record.revision,row:record.rows[input.rowId]}:record;
 }
 return async function handle(action,input={},token='',ip='unknown',session={}){
  if(action==='task-principal'||action==='task-read'){
   const admin=action==='task-principal',adminIdentity=admin?await principal(token):null;
   if(['pb1-samagam-preview','pb1-samagam-import'].includes(input.operation)){
    if(!adminIdentity)throw new AccessError('Principal access required.',403);
    return samagamPB1Workspace(input,adminIdentity);
   }
   if(input.operation==='hq-submission-download'){
    if(!adminIdentity)throw new AccessError('Principal access required.',403);
    const filename='HQ-PB-1-Submission-25-11-2026.xlsx';
    const workbook=await readFile(new URL('../private-templates/HQ-PB-1-Submission-25-11-2026.xlsx',import.meta.url));
    return {filename,workbook:workbook.toString('base64')};
   }
   if(!admin&&input.operation==='portfolio-directory')return supportPortfolio(input,{});
   if(admin&&['portfolio-read','portfolio-advisory-save','portfolio-publish','portfolio-unpublish'].includes(input.operation))return supportPortfolio(input,{uid:adminIdentity.uid});
   if(['retest-read','retest-import','retest-save','retest-publish','retest-unpublish'].includes(input.operation))return retestWorkspace(input,adminIdentity,session);
   if(admin&&input.operation==='monitoring-drive-check'){
    try{return {folders:await checkTaskSlipDrive()};}
    catch(error){throw new AccessError(error.message,error.status||502);}
   }
   const classIX=input.exam==='class-ix',halfYearly=input.exam==='half-yearly';
   if(input.operation==='class-ix-seating-read')return classIXSeating();
   if(input.operation==='class-ix-qp-save'){
    if(!admin)throw new AccessError('Principal access required.',403);
    return saveClassIXComments(input,'qpAssignments',{uid:adminIdentity.uid});
   }
   if(admin&&(halfYearly||classIX)&&['pb1-read','pb1-save','pb1-approve','pb1-unfreeze','half-yearly-import','half-yearly-transfer'].includes(input.operation))return halfYearlyWorkspace(input,{uid:adminIdentity.uid});
   if(admin&&['pb1-read','pb1-save','pb1-approve','pb1-unfreeze'].includes(input.operation))return pb1Workspace(input,{uid:adminIdentity.uid});
   if(!admin&&['pb1-read','pb1-save','pb1-approve','pb1-unfreeze'].includes(input.operation))throw new AccessError('Use a teacher PIN for marks entry or Principal sign-in for approval.',403);
   if(!admin&&['pb1-public','pb1-named'].includes(input.operation)){
    const remedial=classIX&&input.remedial===true;
    if(classIX&&!remedial&&input.operation==='pb1-named')throw new AccessError('Use your assigned teacher PIN for named Class IX results.',403);
    if(!classIX&&!await read('cbse/taskMonitoring/published/updatedAt'))throw new AccessError('The Pre-Samagam plan is not published.',404);
    const named=input.operation==='pb1-named';
    if(named){
     const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');
     if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}
    }
    let report;
    if(classIX){
     const [state,{faculty,mission}]=await Promise.all([read('cbse/taskClassIX'),context()]);
     report=halfYearlyReport(classIXAssignments(state,faculty,mission));
    }else if(halfYearly)report=halfYearlyReport(await read(halfYearlyPath));
    else{
     const [{draft,faculty,mission},published]=await Promise.all([context(),read('cbse/taskMonitoring/published')]);
     report=pb1Report(draft,pb1Mission(draft,mission,published),staffIndex(faculty,mission,{includeRollOnly:true}),undefined,id=>teacherIdentityIds(id,faculty,mission).sort()[0]||id);
     report.roster=pb1Roster(draft);
     report.classSections=pb1Sections(draft,faculty);
    }
    const {scopes,rows,roster,classSections}=report;
    const students=new Map();
    const label=key=>{
     if(!students.has(key))students.set(key,codedExamStudent(key,classIX?'class-ix-public:':halfYearly?'half-yearly-public:':'pb1-public:'));
     return students.get(key);
    };
    const publicRows=rows.map(({scope,key,name,roll,before,current,weeklyActions})=>({
     scope,key:named&&!remedial?key:label(key),name:named?name:label(key),...(named?{roll}:{}),
     ...(remedial?{actionWeeks:Object.keys(weeklyActions||{})}:{}),
     before:before&&{...before,exam:classIX?CLASS_IX_EXAM.previous:halfYearly?'Periodic Test 1 (PT-1)':'Monthly test · '+before.date.slice(0,7)},
     current:current&&{...current,exam:classIX?CLASS_IX_EXAM.name:halfYearly?'Half-Yearly':'Preboard 1'},
    }))
     .sort((a,b)=>a.scope-b.scope||a.name.localeCompare(b.name));
    return {scopes:scopes.map(({classId,section,subject,teacher,teachers,maximum,approvedAt,samagamFinal,additional,teacherAssignmentPending,sectionId,subjectId})=>
     ({classId,section,subject,teacher,teachers,maximum,approvedAt,samagamFinal,additional,...(classIX?{teacherAssignmentPending}: {}),
      ...(remedial?{sectionId,subjectId}:{})})),rows:publicRows,...(named&&!remedial?{roster}:{}),...(remedial?{revision:report.revision}:{}),
     ...(classSections?{classSections}:{}),...(!named?{classRoster:roster.map(({key,classId,section})=>({key:label(key),name:label(key),classId,section}))}:{})};
   }
   if(!admin&&input.operation==='pb1-directory'){
    const [{draft,faculty,mission},plan,access,halfYearlyState,overrides]=await Promise.all([
     context(),read('cbse/taskMonitoring/published'),read('cbse/staffAccess'),classIX?read('cbse/taskClassIX'):halfYearly?read(halfYearlyPath):null,read('cbse/taskMonitoring/overrides'),
    ]);
    const staff=staffIndex(faculty,mission,{includeRollOnly:true});
    const halfYearlyPapers=Object.values((classIX?classIXAssignments(halfYearlyState,faculty,mission):halfYearlyState)?.papers||{});
    const checkers=marksCheckers(plan,faculty,mission,overrides||{});
    const assigned=classIX?halfYearlyPapers.map(p=>p.teacherId):halfYearly?halfYearlyPapers.flatMap(p=>[p.teacherId,...checkers(p)]):
     pb1Scopes(draft,pb1Mission(draft,mission,plan),staff).flatMap(p=>[...p.teachers.map(teacher=>teacher.key),...checkers(p)]);
    const teachers=evaluatorDirectory(staff,access||{},id=>teacherIdentityIds(id,faculty,mission),new Set(assigned),
     id=>avinashBibekIdentityIds(id,faculty,mission)?.[0]||id);
    return {teachers,...(halfYearly||classIX?{paperCount:halfYearlyPapers.length}:{})};
   }
   const monitoringPath='cbse/taskMonitoring';
   if(!admin&&input.operation==='monitoring-read'){
    const access=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');
    if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}
    const {published,progress,overrides}=await monitoringWithFrozenDiscussions(await read(monitoringPath))||{};
    if(!published)throw new AccessError('The monitoring plan is no longer published.',404);
    const staff=await directoryStaff();
    return {monitoring:{...resolvePublishedMonitoringAssignments(published,monitoringDirectory(staff),overrides),examReviewers:await finalExamReviewers(staff),progress:progress||{}}};
   }
   if(admin&&input.operation==='monitoring-read'){
    const monitoring=await monitoringWithFrozenDiscussions(await read(monitoringPath))||{sheets:TASK_MONITORING_SEED,revision:0};
    if(monitoring.published){
     const staff=await directoryStaff();
     monitoring.published={...resolvePublishedMonitoringAssignments(monitoring.published,monitoringDirectory(staff),monitoring.overrides),examReviewers:await finalExamReviewers(staff)};
    }
    return {monitoring};
   }
   if(admin&&input.operation==='monitoring-reopen-upload')
    return {monitoring:await reopenTaskUpload(input,{id:'principal',name:'Principal'})};
   if(admin&&['monitoring-save','monitoring-settings','monitoring-publish','monitoring-unpublish','monitoring-emergency'].includes(input.operation)){
    const saving=input.operation==='monitoring-save';
    const settings=input.operation==='monitoring-settings',publishing=input.operation==='monitoring-publish';
    const emergency=input.operation==='monitoring-emergency';
    const directory=settings||publishing||emergency?await directoryStaff():{};
    const examReviewers=publishing||emergency?await finalExamReviewers(directory):[];
    let sheets,overrides,substitute,reason;
    try{
     if(saving)sheets=validateMonitoringSheets(input.sheets);
     if(emergency){
      if(typeof input.rowKey!=='string'||!/^row_[1-9]\d{0,5}$/.test(input.rowKey)||!Number.isInteger(input.stage)||!MONITORING_STEPS[input.stage])
       throw Error('Choose a published row and workflow step.');
      if(MONITORING_STEPS[input.stage].role==='exam')throw Error('Only the two named Exam IC reviewers can complete the final report.');
      if(input.staffId!==''){
       const person=typeof input.staffId==='string'&&Object.hasOwn(directory,input.staffId)?directory[input.staffId]:null;
       const id=person?.pinOwnerId||input.staffId;
       if(person?.status!=='active'||directory[id]?.status!=='active')throw Error('Choose an active staff member.');
       substitute={id,name:directory[id].name};
      }
     }
     if(settings){
      if(!input.overrides||Array.isArray(input.overrides)||typeof input.overrides!=='object'||Object.keys(input.overrides).length>160)throw Error('Invalid row assignments.');
      const active=id=>typeof id==='string'&&Object.hasOwn(directory,id)&&directory[id].status==='active';
      overrides=Object.fromEntries(Object.entries(input.overrides).map(([key,roles])=>{
       if(!/^row_[1-9]\d{0,5}$/.test(key)||!roles||typeof roles!=='object')throw Error('Invalid row assignment.');
       return [key,Object.fromEntries(MONITORING_ROLES.flatMap(([role])=>{
        const id=roles[role];
        if(id===undefined)return [];
        if(id!==''&&!active(id))throw Error('Choose an active staff member.');
        return [[role,id]];
       }))];
      }));
     }
    }
    catch(error){throw new AccessError(error.message,400);}
    const known=await read(monitoringPath+'/revision');
    const result=await mcqTransaction(db,monitoringPath,current=>{
     if(current===null&&known)return null;
     if(input.expectedRevision!==(current?.revision||0))return;
     if(input.operation==='monitoring-unpublish'&&!current?.published)return;
     const updatedAt=now(),revision=(current?.revision||0)+1;
     if(saving)return {...current,sheets,revision,updatedAt};
     const draft=current?.sheets||TASK_MONITORING_SEED;
     if(emergency){
      const published=current?.published,entry=published?.assignments?.[input.rowKey];
      if(!entry){reason='Publish the workflow row before changing its assignment.';return;}
      const substitutes={...entry.substitutes},step='step_'+input.stage;
      if(substitute)substitutes[step]=substitute;else delete substitutes[step];
      const {subject,section}=entry;
      const emergencyAssignments={...current.emergencyAssignments};
      if(Object.keys(substitutes).length)emergencyAssignments[input.rowKey]={subject,section,substitutes};
      else delete emergencyAssignments[input.rowKey];
      return {...current,updatedAt,revision,emergencyAssignments,
       published:{...published,revision,examReviewers,assignments:{...published.assignments,[input.rowKey]:{...entry,substitutes}}}};
     }
     if(settings)return {...current,sheets:draft,overrides,revision,updatedAt};
     let published=null;
     if(publishing)try{
      const assignments=monitoringAssignments(draft,monitoringDirectory(directory),current?.overrides);
      for(const [key,entry] of Object.entries(assignments)){
       const previous=current?.emergencyAssignments?.[key];
       if(previous?.subject===entry.subject&&previous.section===entry.section)entry.substitutes=previous.substitutes||{};
      }
      for(const [key,progress] of Object.entries(current?.progress||{})){
       const initial=progress.identity||current.published?.assignments?.[key],next=assignments[key];
       if(initial&&(!next||next.subject!==initial.subject||next.section!==initial.section))
        throw Error('Keep the SN, subject and class of rows with recorded progress.');
      }
      published={sheets:draft,updatedAt,revision,assignments,examReviewers};
     }catch(error){reason=error.message;return;}
     return {...current,sheets:draft,published,revision,updatedAt};
    },{restTransaction});
    if(!result.committed||!result.snapshot.val())throw new AccessError(reason||'Task 2 changed. Reopen it before saving again.',409);
    return {monitoring:result.snapshot.val()};
   }
   const staff=await directoryStaff(),actor={principal:admin,ids:[]};
   const directory=Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active').map(([id,p])=>[id,{name:p.name,status:p.status}]));
   const stored=withTaskExamParticipation(taskRosterStore(await read('cbse/taskManager'),staff,rollStaffIdentityIds));if(!admin){
    const catalogue=taskCatalogue(stored,staff,TASK1_ROSTER);
    const [monitoringPublishedAt,portfolioPublished]=await Promise.all([
     read(monitoringPath+'/published/updatedAt'),read('cbse/taskPB1PortfolioPublished')
    ]);
    return {...catalogue,...(monitoringPublishedAt?{monitoringPublishedAt}:{}),...(portfolioPublished===true?{portfolioPublished:true}:{})};
   }
   const [monitoringUpdatedAt,retestPublished]=await Promise.all([read(monitoringPath+'/updatedAt'),read('cbse/taskRetest/published')]);
   if(!input.operation||input.operation==='read')return {...taskView(stored,actor),staff:directory,classFigures:stored.classFigures||{},monitoringUpdatedAt,retestPublished:!!retestPublished};
   let reason='';const id='task_'+randomUUID().replaceAll('-',''),known=await read('cbse/taskManager');
   const result=await mcqTransaction(db,'cbse/taskManager',current=>{if(current===null&&known!==null)return null;reason='';try{const normalized=withTaskExamParticipation(taskRosterStore(current,staff,rollStaffIdentityIds));return applyTask(normalized,input.operation==='create-task1'?{...input,draft:TASK1}:input,actor,staff,now(),id);}catch(e){reason=e.message;return;}},{restTransaction});
   if(!result.committed||!result.snapshot?.val())throw new AccessError(reason||'Task save was not confirmed. Refresh before retrying.',409);
   return {...taskView(withTaskExamParticipation(result.snapshot.val()),actor),staff:directory,classFigures:result.snapshot.val().classFigures||{},monitoringUpdatedAt,taskId:input.operation==='create-task1'?'task1':input.taskId||id};
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
   const verifyViewing=()=>sharedView('view-version',{accessOnly:true},session.viewerToken||'');
   const required=input.requireViewing===true?await verifyViewing():null;
   if(required?.error){const e=new AccessError(required.error,required.status);e.curtainRequired=required.curtainRequired;throw e;}
   const [faculty,support,draft,stored,reporting,access]=await Promise.all([
    read('cbse/facultyDraft'),read('cbse/mission/staff'),read('cbse/draft'),read('cbse/rollCall'),read('cbse/chamber/reporting'),
    session.viewerToken&&!required?verifyViewing():required,
   ]);
   const detailed=!!access&&!access.error;
   const staff=rollDirectory(faculty,await preparedPrimaryStaff(support,faculty),draft);
   const value=stored||{},ids=input.staffId?rollStaffIdentityIds(staff,input.staffId):[];
   return {ok:true,reporting:publishedReporting(reporting),serverDate:rollToday(now()),serverTime:now(),staff:Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)).map(([id,p])=>[id,{name:rollDisplayName(p.name),designation:p.designation||'',wing:rollWing(p),classTeacher:!!p.classTeacher,coClassTeacher:!!p.coClassTeacher,classRoles:p.classRoles||[]}])),rollCall:rollBoardStatus(value,rollToday(now()),{detailed,ids,lookupId:input.staffId})};
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
     return {ok:true,...(file.driveUrl?{driveUrl:file.driveUrl}:{pdf:file.pdf})};
    }
    return {ok:true,report};

   }
   return {ok:true,meetings:staffMeetingList(meetings)};
  }
  if(action==='movement-read'){
   const staff=Object.fromEntries(entries(await directoryStaff()).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)).map(([id,p])=>[id,{...p,name:rollDisplayName(p.name),wing:rollWing(p)}])),store=await read('cbse/chamber/movements')||{},stamp=now();return {ok:true,serverDate:movementToday(stamp),serverTime:stamp,staff:Object.fromEntries(entries(staff).map(([id,p])=>[id,{name:p.name,designation:p.designation||'',wing:p.wing,status:p.status}])),movements:movementView(store,null,staff,stamp)};
  }
  if(action==='remember-view'){await principal(token);return sharedView('view-grant');}
  let pinIdentity,mcqPrincipal,officeRollActor;
  if(action==='mcq-principal'){mcqPrincipal=await principal(token);action=String(input.operation||'');if(!['mcq-reset-all-preview','mcq-reset-all','mcq-clear-banks-preview','mcq-clear-banks','mcq-contribution-history','mcq-manage-preview','mcq-contribution-topic','mcq-contribution-credit','mcq-contribution-delete','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','mcq-report-publish'].includes(action))throw new AccessError('Unknown Principal MCQ operation.',400);}
  if(action==='pin-submit'){
   if(['staff-meetings','podcast-list','podcast-ack','exam-attendance-save'].includes(input.operation)){const access=await sharedView('view-version',{},session.viewerToken||'');if(access?.error){const error=new AccessError(access.error,access.status);error.curtainRequired=access.curtainRequired;throw error;}}
   if(input.operation==='roll-call'&&input.staffId===NOC_OFFICE_IC.staffId){
    if(!['object','clear','clear-group'].includes(input.rollOperation))throw new AccessError('This office PIN is for Afternoon NOC/Hold tasks.',403);
    officeRollActor=await officeService('office-roll-ic-pin',input,token,ip,session);
    action='roll-call';
   }else{
    const selectedId=String(input.staffId||'');
    if(!/^[a-zA-Z0-9_:-]{1,200}$/.test(selectedId))throw new AccessError('Choose your name and enter your PIN.',401);
    const directory=await directoryStaff(),id=directory[selectedId]?.pinOwnerId||selectedId,person=directory[id];
    let access=await read(`cbse/staffAccess/${id}`),pinId=id;
    const marksEntry=input.operation==='task-manager'&&['pb1-read','pb1-save'].includes(input.taskOperation);
    const monitoringEntry=input.operation==='task-manager'&&['monitoring-update','monitoring-practice','monitoring-reopen-upload'].includes(input.taskOperation);
    const linkedIds=(marksEntry||monitoringEntry)&&isGangaDeviProfile(person)?rollStaffIdentityIds(directory,id)
     .filter(key=>directory[key]?.status==='active'&&isGangaDeviProfile(directory[key])).sort():[];
    if(monitoringEntry&&!access?.enabled){
     const alternatives=await Promise.all(linkedIds.filter(key=>key!==id).map(async key=>[key,await read('cbse/staffAccess/'+key)]));
     const enabled=alternatives.find(([,record])=>record?.enabled);
     if(enabled)[pinId,access]=enabled;
    }
    if(!access?.enabled||person?.status!=='active')throw new AccessError('Choose your name and enter the correct PIN.',401);
    const verified=await verifySubmissionPIN(pinId,input.pin,access,ip,directory[pinId],linkedIds);
    action=String(input.operation||'comment');if(!['staff-meetings','task-manager','comment','teacher-comment','update-contact','update-task','conversation-start','conversation-reply','news-create','news-comment','credit-claim','mcq-contribute','mcq-import-csv','mcq-question-edit','mcq-question-delete','mcq-paper-delete','mcq-paper','mcq-evaluate','mcq-answer-key','remedial-plan','roll-call','movement','podcast-list','podcast-ack','exam-attendance-save'].includes(action))throw new AccessError('This operation requires Principal access.',403);if(!['staff-meetings','task-manager','roll-call','movement','podcast-list','podcast-ack'].includes(action)&&!missionMemberAllowed(person))throw new AccessError('This staff member is not part of the Mission team.',403);pinIdentity={decoded:{staffId:verified.id},access:verified.access};
   }
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
   let signedFile;
   if(signedUpload){
    if(typeof input.meetingId!=='string'||!/^[a-f0-9]{32}$/.test(input.meetingId))throw new AccessError('Choose a valid staff meeting.',400);
    if(input.driveUrl!==undefined){
     let url;
     try{url=new URL(input.driveUrl);}catch{}
     const fileId=url?.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})\/(?:view|preview)\/?$/)?.[1];
     if(typeof input.driveUrl!=='string'||input.driveUrl.length>2048||url?.origin!=='https://drive.google.com'||url.username||url.password||!fileId)
      throw new AccessError('Paste the Google Drive share link for the PDF file.',400);
     const share=new URL('https://drive.google.com/file/d/'+fileId+'/view');
     const resourceKey=url.searchParams.get('resourcekey');
     if(resourceKey&&/^[A-Za-z0-9_-]{1,200}$/.test(resourceKey))share.searchParams.set('resourcekey',resourceKey);
     signedFile={driveUrl:share.href};
    }else{
     if(typeof input.pdf!=='string'||input.pdf.length>2796204)throw new AccessError('Choose a PDF up to 2 MB.',400);
     const pdf=Buffer.from(input.pdf,'base64');
     if(pdf.length>2097152||pdf.toString('base64')!==input.pdf||pdf.subarray(0,5).toString()!=='%PDF-')throw new AccessError('Choose a valid PDF up to 2 MB.',400);
     signedFile={pdf:input.pdf};
    }
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
      staffMeetingSignedMinutes:{...current.staffMeetingSignedMinutes,[id]:{...signedFile,uploadedAt:stamp,uploadedBy:admin?'principal':staffId}}
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
   if(input.taskOperation==='class-ix-date-notes-save'||input.taskOperation==='class-ix-qp-notes-save')
    return saveClassIXComments(input,input.taskOperation==='class-ix-date-notes-save'?'dateNotes':'qpAssignments',{id,version:access.version});
   if(input.taskOperation==='class-ix-seating-save')return saveClassIXSeating(input,id,access);
   if(['portfolio-read','portfolio-save'].includes(input.taskOperation))
    return supportPortfolio(input,{id,version:access.version,name:staff[id].name});
   if(input.taskOperation==='retest-teacher-save')return retestWorkspace({...input,operation:'retest-teacher-save'},{id,version:access.version},session);
   if(input.exam==='class-ix'&&input.taskOperation==='class-ix-remedial-save')return halfYearlyWorkspace(input,{id,accessVersion:access.version});
   if(['pb1-read','pb1-save'].includes(input.taskOperation))return (['half-yearly','class-ix'].includes(input.exam)?halfYearlyWorkspace:pb1Workspace)(input,{id,accessVersion:access.version});
   if(['monitoring-update','monitoring-practice','monitoring-reopen-upload'].includes(input.taskOperation)){
    const curtain=await sharedView('view-version',{accessOnly:true},session.viewerToken||'');
    if(curtain?.error){const error=new AccessError(curtain.error,curtain.status);error.curtainRequired=true;throw error;}
    const path='cbse/taskMonitoring';
    const selected=staff[input.staffId],roleId=isGangaDeviProfile(staff[id])&&selected?.status==='active'&&
     isGangaDeviProfile(selected)&&rollStaffIdentityIds(staff,id).includes(input.staffId)?input.staffId:id;
    const actor={id:roleId,name:staff[roleId].name};
    if(input.taskOperation==='monitoring-reopen-upload'){
     await reopenTaskUpload(input,actor,staff);
     return {ok:true};
    }
    const examReviewers=await finalExamReviewers(staff);
    if(input.taskOperation==='monitoring-practice'){
     if(typeof input.rowKey!=='string'||!/^row_[1-9]\d{0,5}$/.test(input.rowKey)||!Number.isInteger(input.stage)||input.stage<0)
      throw new AccessError('Choose a valid practice step.',400);
     const {published,overrides}=await read(path)||{};
     const mock={published:published&&{...resolvePublishedMonitoringAssignments(published,monitoringDirectory(staff),overrides),examReviewers},progress:{[input.rowKey]:{stage:input.stage,separateMatching:true,revision:0,history:[]}}};
     try{
      const result=monitoringAdvance(mock,{...input,expectedRevision:0},actor,now()).progress[input.rowKey];
      return {ok:true,stage:result.stage,event:result.history[0]};
     }catch(error){throw new AccessError(error.message,409);}
    }
    const stored=input.pdf===undefined?null:await read(path);
    const known=stored?.revision??await read(path+'/revision'),stamp=now();
    const advance=state=>{
     const published=state.published,effective=resolvePublishedMonitoringAssignments(published,monitoringDirectory(staff),state.overrides);
     return monitoringAdvance({...state,published:effective&&{...effective,examReviewers}},input,actor,stamp);
    };
    let signedSlip;
    const needsPDF=state=>MONITORING_STEPS[monitoringStage(state?.progress?.[input.rowKey])]?.uploadPdf;
    if(input.pdf!==undefined){
     if(!stored||!needsPDF(stored))throw new AccessError('This row is no longer waiting for a signed PDF. Refresh its status.',409);
     try{advance(stored);}catch(error){throw new AccessError(error.message,409);}
     const entry=stored.published.assignments[input.rowKey];
     const uploadKey=JSON.stringify([input.rowKey,input.publicationRevision,input.expectedRevision,entry.section,entry.subject]);
     try{signedSlip=await uploadSignedSlip(input.pdf,{...entry,uploadKey});}
     catch(error){throw new AccessError(error.message,error.status||502);}
    }
    let reason;
    const result=await mcqTransaction(db,path,current=>{
     if(current===null&&known)return null;
     try{
      const state=current||{},published=state.published;
      const next=advance(state);
      if(needsPDF(state)){
       if(!signedSlip)throw Error('Scan or select the signed PDF before completing this step.');
       next.progress[input.rowKey].signedSlip=signedSlip;
      }
      return {...next,published:{...published,examReviewers}};
     }
     catch(error){reason=error.message;return;}
    },{restTransaction});
    if(!result.committed||!result.snapshot.val())throw new AccessError(reason||'The status could not be saved.',409);
    return {ok:true};
   }
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
   const admin=action==='roll-call-principal',adminIdentity=admin?await principal(token):null,actorUid=adminIdentity?.uid;if(!admin&&!pinIdentity&&!officeRollActor)throw new AccessError('Verify your personal PIN.',403);if(!admin&&!officeRollActor){const access=await read('cbse/staffAccess/'+pinIdentity.decoded.staffId);if(!access?.enabled||access.version!==pinIdentity.access.version)throw new AccessError('Staff access changed. Verify your PIN again.',403);}
   const staff=await directoryStaff(),actor=admin?{id:'principal',name:'Principal'}:officeRollActor||{id:pinIdentity.decoded.staffId,name:staff[pinIdentity.decoded.staffId]?.name||'Staff'};
   const [reporting,viewAccess]=await Promise.all([read('cbse/chamber/reporting'),!admin&&session.viewerToken?sharedView('view-version',{accessOnly:true},session.viewerToken):null]);
   const viewOptions={detailed:!!session.viewerToken&&!viewAccess?.error,actorId:actor.id,ids:rollStaffIdentityIds(staff,actor.id)};
   const output=(value,form=reporting)=>({ok:true,reporting:publishedReporting(form),serverDate:rollToday(now()),serverTime:now(),principal:admin,actor,...(admin?{reportStaff:Object.fromEntries(entries(staff).map(([id,p])=>[id,{name:p.name,designation:p.designation||'',wing:rollWing(p)}]))}:{}),staff:Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)).map(([id,p])=>[id,{name:rollDisplayName(p.name),designation:p.designation||'',wing:rollWing(p),classTeacher:!!p.classTeacher,coClassTeacher:!!p.coClassTeacher,classRoles:p.classRoles||[]}])),rollCall:admin?value:{revision:value.revision||0,...rollBoardStatus(value,rollToday(now()),viewOptions)}});
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
