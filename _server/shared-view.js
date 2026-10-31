import {packViewingMarks} from '../cbse-view-codec.js';
import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {emptyMission,staffVisibleRecord} from '../cbse-mission-model.js';
export const VIEW_COOKIE='mission_staff_view';
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
function viewingDraft(draft){if(!draft)return null;const out=pick(draft,['schemaVersion','revision','streams']);out.classes={};for(const[cl,c]of Object.entries(draft.classes||{})){const group=out.classes[cl]={label:c.label,sections:{}};for(const[id,s]of Object.entries(c.sections||{})){const section=group.sections[id]=pick(s,['name','stream','subjects']);section.students=Object.fromEntries(Object.entries(s.students||{}).map(([id,p])=>[id,pick(p,['name','roll','subjects','gender'])]));}}return out;}
function viewingFaculty(faculty){if(!faculty)return null;const out=pick(faculty,['schemaVersion','revision']);out.classes={};for(const[cl,c]of Object.entries(faculty.classes||{}))out.classes[cl]={classId:c.classId,roles:c.roles||{},teachers:Object.fromEntries(Object.entries(c.teachers||{}).map(([id,t])=>[id,pick(t,['name','designation','subjects','teachingSections','status'])]))};return out;}

export function createSharedView({db,context,now=Date.now,defaultSecret}){
 const read=async p=>(await db.ref(p).get()).val();let memoContext=null,memoVersion='',memoRead;
 async function browsingContext(){if(memoRead)return memoRead;memoRead=(async()=>{const versions=await Promise.all(['cbse/draft/revision','cbse/facultyDraft/revision','cbse/mission/revision'].map(read));const key=JSON.stringify(versions);if(memoContext&&key===memoVersion)return memoContext;memoContext=await context();memoVersion=key;return memoContext;})();try{return await memoRead;}finally{memoRead=null;}}
 const digest=token=>createHash('sha256').update(token).digest('hex');
 async function session(token){if(!/^[a-f0-9]{64}$/.test(token||''))return false;const saved=await read('cbse/viewSessions/'+digest(token));if(!saved||saved.expiresAt<=now())return false;if(saved.expiresAt<now()+390*24*60*60_000)await db.ref('cbse/viewSessions/'+digest(token)).update({expiresAt:now()+400*24*60*60_000});return true;}
 return async function handle(action,input={},viewerToken=''){
  if(action==='view-grant'){const token=randomBytes(32).toString('hex'),expiresAt=now()+400*24*60*60_000;await db.ref('cbse/viewSessions/'+digest(token)).set({expiresAt,createdAt:now()});return {viewerToken:token,expiresAt};}
  if(action==='view-login'){
   const ip=String(input.ip||'unknown'),key=digest(ip);let blocked=false;
   await db.ref('cbse/viewAttempts/'+key).transaction(current=>{const c=current&&now()-current.started<15*60_000?current:{started:now(),count:0};if(c.count>=8){blocked=true;return;}return {...c,count:c.count+1};});
   if(blocked)return {error:'Too many password attempts. Try again in 15 minutes.',status:429};
   const secret=await read('cbse/viewAccess')||defaultSecret,value=String(input.password||'');let valid=false;
   if(value.length<=100&&secret?.salt&&secret?.hash){const expected=Buffer.from(secret.hash,'hex'),actual=scryptSync(value,secret.salt,64);valid=actual.length===expected.length&&timingSafeEqual(actual,expected);}
   if(!valid)return {error:'Enter the staff viewing password.',status:401};
   const token=randomBytes(32).toString('hex'),expiresAt=now()+400*24*60*60_000;await db.ref('cbse/viewSessions/'+digest(token)).set({expiresAt,createdAt:now()});await db.ref('cbse/viewAttempts/'+key).remove();return {viewerToken:token,expiresAt};
  }
  if(action==='view-logout'){if(/^[a-f0-9]{64}$/.test(viewerToken||''))await db.ref('cbse/viewSessions/'+digest(viewerToken)).remove();return {ok:true};}
  if(['view-data','view-version'].includes(action)){
   if(!await session(viewerToken))return {error:'Enter the staff viewing password once to browse student profiles.',status:401,curtainRequired:true};
   if(action==='view-version'){const [draft,faculty,mission]=await Promise.all(['cbse/draft/revision','cbse/facultyDraft/revision','cbse/mission/revision'].map(read));return {versions:[draft||0,faculty||0,mission||0]};}
   const c=await browsingContext(),mission=structuredClone(c.mission||emptyMission());
   // Viewing never exposes PIN/access records, private edit history or restricted counselling notes.
   mission.records=Object.fromEntries(Object.entries(mission.records||{}).filter(([,r])=>r.visibility!=='restricted').map(([id,r])=>[id,{...staffVisibleRecord(id,r),...pick(r,['studentKey','staffId','sectionKey','evidenceUrl','updatedAt','requestId','requestTargetId','taskId','replyToRecord'])}]));
   mission.students=Object.fromEntries(Object.entries(mission.students||{}).map(([id,p])=>[id,pick(p,['gender','guardian','phones','location','email','meetingLink','numbers','mapLocation','revision','updatedBy','updatedByName','updatedAt'])]));
   const markRows=packViewingMarks(mission.marks);delete mission.marks;
   const allowed=['schemaVersion','revision','settings','students','exams','marks','attendance','attendanceRegisters','academicAttendance','tasks','records','timetable','staff','allocations','gradingRules','reportRequests','updatedAt'];
   const access=await read('cbse/staffAccess')||{},staff={};for(const[cl,g]of Object.entries(c.faculty?.classes||{}))for(const[id,p]of Object.entries(g.teachers||{}))staff[cl+':'+id]=p;for(const[id,p]of Object.entries(mission.staff||{}))staff['support:'+id]=p;const pinStaff=Object.entries(access).filter(([id,a])=>a.enabled&&staff[id]?.status==='active').map(([id])=>({id,name:staff[id].name}));return {markRows,versions:[c.draft?.revision||0,c.faculty?.revision||0,c.mission?.revision||0],pinStaff,draft:viewingDraft(c.draft),faculty:viewingFaculty(c.faculty),mission:Object.fromEntries(allowed.filter(k=>mission[k]!==undefined).map(k=>[k,mission[k]])),revision:c.mission?.revision||0};
  }
 };
}
