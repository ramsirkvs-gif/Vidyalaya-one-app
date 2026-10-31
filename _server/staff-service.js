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
export function createStaffService({db,auth,now=Date.now,displayKey}){
 const read=async path=>(await db.ref(path).get()).val();
 async function context(){const [draft,faculty,mission]=await Promise.all([read('cbse/draft'),read('cbse/facultyDraft'),read('cbse/mission')]);return {draft,faculty,mission:mission||emptyMission()};}
 async function directoryStaff(){const[faculty,support]=await Promise.all([read('cbse/facultyDraft'),read('cbse/mission/staff')]);return staffIndex(faculty,{staff:support||{}});}
 async function principal(token){const decoded=await auth.verifyIdToken(token,true),uid=await read('cbse/adminUid');if(decoded.uid!==uid)throw new AccessError('Principal access required.');return decoded;}
 async function staffUser(token){const decoded=await auth.verifyIdToken(token,true);if(decoded.missionStaff!==true||typeof decoded.staffId!=='string')throw new AccessError('Staff access required.');const access=await read(`cbse/staffAccess/${decoded.staffId}`);if(!access?.enabled||decoded.pinVersion!==access.version)throw new AccessError('Staff access has been disabled or reset. Sign in again.');return {decoded,access};}
 async function throttle(staffId,ip){const key=createHash('sha256').update(`${ip}|${staffId}`).digest('hex');for(const[scope,limit]of [[`ip|${ip}`,25],[`${ip}|${staffId}`,8],[`staff|${staffId}`,30]]){const bucket=createHash('sha256').update(scope).digest('hex');let denied=false;await db.ref(`cbse/staffAttempts/${bucket}`).transaction(current=>{const value=current&&now()-current.started<15*60_000?current:{started:now(),count:0};if(value.count>=limit){denied=true;return;}return {...value,count:value.count+1};});if(denied)throw new AccessError('Too many PIN attempts. Try again in 15 minutes.',429);}return key;}
 async function revoke(staffId){try{await auth.revokeRefreshTokens('mission_'+createHash('sha256').update(staffId).digest('hex').slice(0,40));}catch(e){if(e.code!=='auth/user-not-found')throw e;}}
 return async function handle(action,input={},token='',ip='unknown'){
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
   if(action==='list'){const access=await read('cbse/staffAccess');return {access:Object.fromEntries(entries(access).map(([id,a])=>[id,{enabled:!!a.enabled,pinSet:!!a.hash,updatedAt:a.updatedAt,pin:decryptDisplayPIN(a,id,displayKey)}]))};}
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
   if(action==='generate-pins'){
    const access=await read('cbse/staffAccess')||{},missing=entries(staff).filter(([id,p])=>p.status==='active'&&!access[id]?.hash);
    if(missing.length>900)throw new AccessError('Generate PINs for fewer than 901 staff at a time.',400);
    const used=new Set(),prepared=[];
    for(const[id,p]of missing){let pin;do{pin=String(randomInt(100,1000));}while(used.has(pin));used.add(pin);prepared.push({id,name:p.name,pin,record:{...await hashPIN(pin),...encryptDisplayPIN(pin,id,displayKey),enabled:true,version:randomUUID(),updatedAt:now()}});}
    let created=[];
    const result=await db.ref('cbse/staffAccess').transaction(current=>{const next=current||{};created=[];for(const p of prepared)if(!next[p.id]?.hash){next[p.id]=p.record;created.push({staffId:p.id,name:p.name,pin:p.pin});}return next;});
    if(!result.committed)throw new AccessError('PIN generation did not save. Try again.',409);
    return {created};
   }
   const id=String(input.staffId||'');if(!staff[id])throw new AccessError('Staff member not found.',404);
   if(action==='set-pin'){if(staff[id].status!=='active')throw new AccessError('Enable this staff member first.',400);const hash=await hashPIN(input.pin);await revoke(id);await db.ref(`cbse/staffAccess/${id}`).set({...hash,...encryptDisplayPIN(input.pin,id,displayKey),enabled:true,version:randomUUID(),updatedAt:now()});}
   else{await revoke(id);await db.ref(`cbse/staffAccess/${id}`).update({enabled:false,version:randomUUID(),updatedAt:now()});}
   return {ok:true};
  }
  const {decoded}=await staffUser(token),c=await context(),id=decoded.staffId;
  if(staffIndex(c.faculty,c.mission)[id]?.status!=='active')throw new AccessError('Staff access is inactive.');
  if(action==='students')return {staff:staffIndex(c.faculty,c.mission)[id]?.name,students:entries(studentIndex(c.draft)).map(([key,p])=>({key,name:p.name,roll:p.roll,classId:p.classId,section:p.section,assigned:staffCanView(id,key,c.mission,c.draft,c.faculty),academic:staffCanView(id,key,c.mission,c.draft,c.faculty)?studentProgress(key,c.mission,c.draft).academic:'grey'}))};
  const key=String(input.studentKey||'');if(!/^(X|XII):[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(key)||!studentIndex(c.draft)[key])throw new AccessError('Student not found.',404);
  if(action==='profile'){if(staffCanView(id,key,c.mission,c.draft,c.faculty))return {...staffProfileView(id,key,c.mission,c.draft,c.faculty),assigned:true};const p=studentIndex(c.draft)[key];return {student:{key,name:p.name,roll:p.roll,classId:p.classId,section:p.section,stream:p.stream},assigned:false,progress:null,contact:null,mapLocation:c.mission.students?.[key]?.mapLocation||'',contactRevision:c.mission.students?.[key]?.revision||0,roles:staffStudentRoles(id,studentIndex(c.draft)[key],c.faculty,c.mission),tasks:[],records:entries(c.mission.records).filter(([,r])=>r.studentKey===key&&r.authorId===id).map(([id,r])=>staffVisibleRecord(id,r))};}
  if(action==='update-contact'){
   const patch=input.contact;if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new AccessError('Invalid contact update.',400);
   const allowed=['mapLocation','location','numbers'];if(Object.keys(patch).some(k=>!allowed.includes(k)))throw new AccessError('Only phone numbers, address or map location can be updated.',400);
   if(Object.keys(patch).some(k=>k!=='mapLocation')&&!staffCanView(id,key,c.mission,c.draft,c.faculty))throw new AccessError('Phone/address updates require an assigned student.',403);
   if(!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)throw new AccessError('Reload the contact record before updating.',409);
   let failed='';const result=await db.ref('cbse/mission').transaction(current=>{
    failed='';const m=current||emptyMission();if(staffIndex(c.faculty,m)[id]?.status!=='active')return;
    const old=m.students?.[key]||{gender:'unknown',guardian:'',phones:'',location:''};if((old.revision||0)!==input.expectedRevision){failed='Contact details changed. Reload this student before saving.';return;}
    if(Object.keys(patch).some(k=>k!=='mapLocation')&&!staffCanView(id,key,m,c.draft,c.faculty))return;
    const next={...old,...patch,revision:(old.revision||0)+1,updatedBy:id,updatedByName:staffIndex(c.faculty,m)[id]?.name,updatedAt:now()};
    try{if(patch.mapLocation!==undefined)next.mapLocation=mapLink(patch.mapLocation);if(patch.numbers!==undefined)next.phones=serializePhones(patch.numbers);if(typeof next.location!=='string'||next.location.length>500)throw Error('Home address is too long.');validateContact(next);}catch(error){failed=error.message;return;}
    m.students||={};m.students[key]=next;m.revision=(m.revision||0)+1;m.updatedAt=now();return m;
   });if(!result.committed)throw new AccessError(failed||'Assignment changed. Reload before updating.',failed?.includes('changed')?409:400);return {ok:true};
  }
  if(action==='comment'){
   const notes=String(input.notes||'').trim();if(!notes||notes.length>2000)throw new AccessError('Enter a progress comment of up to 2000 characters.',400);
   const channel=String(input.channel||'progress');if(!['progress','call','home_visit'].includes(channel))throw new AccessError('Choose a valid contact/remark type.',400);
   const roles=staffStudentRoles(id,studentIndex(c.draft)[key],c.faculty,c.mission),role=String(input.role||'faculty_support'),subjectId=String(input.subjectId||'');
   if(!['class_teacher','subject_teacher','faculty_support'].includes(role)||role==='class_teacher'&&!roles.classTeacher||role==='subject_teacher'&&!roles.subjects.some(s=>s.id===subjectId))throw new AccessError('This CT/subject role is not assigned to you for this student.',403);
   const taskId=String(input.taskId||'');if(taskId&&!(c.mission.tasks?.[taskId]?.staffId===id&&(c.mission.tasks[taskId].studentKey===key||!c.mission.tasks[taskId].studentKey&&c.mission.tasks[taskId].sectionKey===`${studentIndex(c.draft)[key].classId}:${studentIndex(c.draft)[key].sectionId}`)))throw new AccessError('You can reply only to your own assigned action.',403);
   const recordId='record_'+randomUUID().replaceAll('-','');
   const result=await db.ref('cbse/mission').transaction(current=>{const m=current||emptyMission();if(staffIndex(c.faculty,m)[id]?.status!=='active')return;m.records||={};if(taskId){const task=m.tasks?.[taskId],person=studentIndex(c.draft)[key];if(!task||task.staffId!==id||task.status==='cancelled'||!(task.studentKey===key||!task.studentKey&&task.sectionKey===`${person.classId}:${person.sectionId}`))return;}const liveRoles=staffStudentRoles(id,studentIndex(c.draft)[key],c.faculty,m);if(role==='class_teacher'&&!liveRoles.classTeacher||role==='subject_teacher'&&!liveRoles.subjects.some(s=>s.id===subjectId))return;m.records[recordId]={details:channel==='progress'?{}:{channel},authorRole:role,replyTo:taskId,kind:channel==='progress'?'faculty_comment':'contact',date:today(),studentKey:key,staffId:id,sectionKey:'',subjectId:role==='subject_teacher'?subjectId:'',notes,outcome:'',evidenceUrl:'',visibility:'general',authorId:id,authorName:staffIndex(c.faculty,m)[id]?.name||'Staff',updatedAt:now()};m.revision=(m.revision||0)+1;m.updatedAt=now();return m;});if(!result.committed)throw new AccessError('Assignment changed. Reload your student list.');return {ok:true};
  }
  if(action==='update-task'){
   const taskId=String(input.taskId||''),status=String(input.status||''),outcome=String(input.outcome||'').trim();if(!['open','in_progress','done'].includes(status)||outcome.length>2000)throw new AccessError('Invalid task update.',400);
   const result=await db.ref('cbse/mission').transaction(current=>{if(!current?.tasks?.[taskId]||current.tasks[taskId].status==='cancelled'||current.tasks[taskId].staffId!==id||!(current.tasks[taskId].studentKey===key||!current.tasks[taskId].studentKey&&current.tasks[taskId].sectionKey===`${studentIndex(c.draft)[key].classId}:${studentIndex(c.draft)[key].sectionId}`))return;current.tasks[taskId]={...current.tasks[taskId],status,outcome,updatedAt:now()};if(outcome){current.records||={};current.records['reply_'+randomUUID().replaceAll('-','')]={kind:'faculty_comment',date:today(),studentKey:key,staffId:id,sectionKey:'',subjectId:'',notes:outcome,outcome:'',visibility:'general',authorId:id,authorName:staffIndex(c.faculty,current)[id]?.name||'Staff',authorRole:'faculty_support',replyTo:taskId,updatedAt:now()};}current.revision++;current.updatedAt=now();return current;});if(!result.committed)throw new AccessError('Task is not assigned to you.');return {ok:true};
  }
  throw new AccessError('Unknown action.',400);
 };
}
