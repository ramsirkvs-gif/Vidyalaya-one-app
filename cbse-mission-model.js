import {entries,clone} from './cbse-model.js';
import {validateMonitoringDetails,visibleMonitoringDetails} from './cbse-monitoring-model.js';
export const RECORD_KINDS={observation:'Classroom observation',remedial:'Remedial monitoring',worksheet:'Worksheet / practice',effort:'Other improvement effort',class_teacher:'CT / Co-CT follow-up',counselling:'Counselling',prt:'PRT support',contact:'Contact follow-up',weekly:'Weekly review',faculty_comment:'Faculty progress comment'};
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function emptyMission(){return {schemaVersion:1,revision:0,settings:{redBelow:33,greenFrom:75,attendanceRedBelow:75,attendanceGreenFrom:90},students:{},exams:{},marks:{},attendance:{},records:{},tasks:{},timetable:{},staff:{},allocations:{},gradingRules:{}};}
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const text=(v,max=200,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const safeKeys=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>/^[a-zA-Z0-9_:-]{1,300}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k));
export function studentIndex(draft){const result=Object.create(null);for(const[cl,c]of entries(draft?.classes))for(const[sid,s]of entries(c.sections))for(const[id,p]of entries(s.students)){const key=`${cl}:${sid}:${id}`;result[key]={...p,key,classId:cl,sectionId:sid,section:s.name,stream:draft.streams?.[s.stream]?.name||'',subjectCatalog:s.subjects||{}};}return result;}
export function staffIndex(faculty,mission){const result=Object.create(null);for(const[cl,c]of entries(faculty?.classes))for(const[id,t]of entries(c.teachers))result[`${cl}:${id}`]={...t,key:`${cl}:${id}`,classId:cl,kind:'faculty'};for(const[id,t]of entries(mission?.staff))result[`support:${id}`]={...t,key:`support:${id}`,classId:''};return result;}
export function validateMission(m,draft,faculty){
 assert(m&&m.schemaVersion===1&&Number.isInteger(m.revision)&&m.revision>=0,'Invalid Mission data.');
 const students=studentIndex(draft),staff=staffIndex(faculty,m),s=m.settings;
 assert(s&&[s.redBelow,s.greenFrom,s.attendanceRedBelow,s.attendanceGreenFrom].every(v=>Number.isFinite(v)&&v>=0&&v<=100)&&s.redBelow<s.greenFrom&&s.attendanceRedBelow<s.attendanceGreenFrom,'Colour thresholds must be ordered percentages between 0 and 100.');
 for(const field of ['students','exams','marks','attendance','records','tasks','timetable','staff','allocations','gradingRules'])assert(!m[field]||safeKeys(m[field]),`Invalid ${field} data.`);
 for(const[,p]of entries(m.students)){assert(['girl','boy','unknown'].includes(p.gender),'Choose a gender or Not recorded.');assert(text(p.guardian,120)&&text(p.phones,200)&&text(p.location,500),'Contact details are too long.');}
 for(const[,p]of entries(m.staff))assert(text(p.name,120,true)&&['counsellor','prt','support'].includes(p.kind)&&['active','inactive'].includes(p.status)&&text(p.subjects,300),'Invalid support-team record.');
 for(const[,e]of entries(m.exams))assert(text(e.name,100,true)&&['X','XII'].includes(e.classId)&&date(e.date)&&['test','PB-1','PB-2','weekly','mock'].includes(e.type),'Enter a valid test name, class, type and date.');
 for(const[,v]of entries(m.marks)){
  assert(text(v.studentKey,300,true)&&text(v.subjectId,100,true)&&m.exams?.[v.examId],'Choose a valid student, subject and examination.');
  const p=students[v.studentKey];if(p){assert(m.exams[v.examId].classId===p.classId&&p.subjects?.[v.subjectId],'The test/subject does not match the student.');}
  assert(typeof v.absent==='boolean'&&Number.isFinite(v.maximum)&&v.maximum>0&&v.maximum<=1000&&(v.absent||Number.isFinite(v.score)&&v.score>=0&&v.score<=v.maximum),'Marks must be between zero and the maximum, or marked Absent.');
 }
 for(const[,a]of entries(m.attendance))assert(text(a.studentKey,300,true)&&date(a.date)&&['school','remedial'].includes(a.session)&&['present','absent','leave'].includes(a.status),'Invalid attendance record.');
 for(const[,r]of entries(m.records)){
  assert(RECORD_KINDS[r.kind]&&date(r.date)&&text(r.notes,3000,true)&&text(r.outcome,2000)&&text(r.studentKey,300)&&text(r.staffId,300)&&text(r.sectionKey,200)&&text(r.subjectId,100)&&['general','restricted'].includes(r.visibility),'Enter a valid dated monitoring record.');
  validateMonitoringDetails(r);
  assert(r.kind!=='counselling'||r.visibility==='restricted','Counselling notes must be restricted.');
  assert(!r.evidenceUrl||/^https:\/\//.test(r.evidenceUrl)&&text(r.evidenceUrl,1000),'Evidence links must use HTTPS.');
 }
 for(const[,t]of entries(m.tasks))assert(text(t.title,200,true)&&text(t.studentKey,300)&&text(t.sectionKey,200)&&text(t.staffId,300,true)&&text(t.category,60,true)&&date(t.due)&&['open','in_progress','done','cancelled'].includes(t.status)&&text(t.outcome,2000),'Enter task, assignee, due date and status.');
 const slots=[];
 for(const[,t]of entries(m.timetable)){
  assert(['X','XII'].includes(t.classId)&&text(t.sectionId,100,true)&&text(t.staffId,300,true)&&Number.isInteger(t.weekday)&&t.weekday>=1&&t.weekday<=7&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t.end)&&t.start<t.end&&text(t.room,100)&&text(t.purpose,200,true),'Enter a valid break/remedial timetable slot.');
  for(const previous of slots)assert(!(previous.weekday===t.weekday&&t.start<previous.end&&t.end>previous.start&&(previous.staffId===t.staffId||previous.classId===t.classId&&previous.sectionId===t.sectionId||t.room&&previous.room===t.room)),'Timetable clash: teacher, section or room is already occupied.');slots.push(t);
 }
 const gradeScopes=new Set();for(const[,r]of entries(m.gradingRules)){assert(['X','XII'].includes(r.classId)&&text(r.subjectId,100)&&text(r.examId,100)&&Number.isFinite(r.redBelow)&&Number.isFinite(r.greenFrom)&&r.redBelow>=0&&r.greenFrom<=100&&r.redBelow<r.greenFrom,'Enter valid class/subject/examination colour thresholds.');assert(!r.examId||m.exams?.[r.examId]?.classId===r.classId,'The grading examination does not match its class.');const scope=`${r.classId}|${r.subjectId}|${r.examId}`;assert(!gradeScopes.has(scope),'A colour rule already exists for this scope.');gradeScopes.add(scope);}
 for(const[,a]of entries(m.allocations))assert(['X','XII'].includes(a.classId)&&text(a.sectionId,100,true)&&text(a.subjectId,100,true)&&text(a.staffId,300,true),'Invalid subject-teacher assignment.');
 return m;
}
export function band(value,red,green){return value===null||!Number.isFinite(value)?'grey':value<red?'red':value<green?'yellow':'green';}
export function gradeThresholds(m,classId,subjectId,examId){const matched=entries(m.gradingRules).map(([,r])=>r).filter(r=>r.classId===classId&&(!r.subjectId||r.subjectId===subjectId)&&(!r.examId||r.examId===examId)).sort((a,b)=>(b.subjectId?2:0)+(b.examId?1:0)-(a.subjectId?2:0)-(a.examId?1:0));return matched[0]||{redBelow:m.settings.redBelow,greenFrom:m.settings.greenFrom};}
export function studentProgress(key,m,draft,examId=""){
 const person=studentIndex(draft)[key],latest={},history={};
 for(const[id,mark]of entries(m.marks))if(mark.studentKey===key&&(!examId||mark.examId===examId)){const item={...mark,id,exam:m.exams?.[mark.examId]};if(!item.exam)continue;(history[mark.subjectId]||=[]).push(item);}
 for(const[id,list]of entries(history)){list.sort((a,b)=>a.exam.date.localeCompare(b.exam.date)||(a.updatedAt||0)-(b.updatedAt||0));latest[id]=list.at(-1);}
 const subjects=entries(person?.subjects).map(([id])=>{const v=latest[id],percentage=v&&!v.absent?v.score/v.maximum*100:null,thresholds=gradeThresholds(m,person.classId,id,v?.examId||examId);return {id,name:person.subjectCatalog[id]?.name||id,latest:v,percentage,band:band(percentage,thresholds.redBelow,thresholds.greenFrom),history:history[id]||[]};});
 const bands=subjects.map(s=>s.band),academic=!bands.length||bands.includes('grey')?'grey':bands.includes('yellow')?'yellow':'green';
 const school=entries(m.attendance).map(([,a])=>a).filter(a=>a.studentKey===key&&a.session==='school'),percentage=school.length?school.filter(a=>a.status==='present').length/school.length*100:null;
 return {subjects,academic:bands.includes('red')?'red':academic,attendance:percentage,attendanceBand:band(percentage,m.settings.attendanceRedBelow,m.settings.attendanceGreenFrom),recordedDays:school.length,overdue:entries(m.tasks).filter(([,t])=>t.studentKey===key&&!['done','cancelled'].includes(t.status)&&t.due<today()).length};
}
export function genderCounts(keys,m){const out={girl:0,boy:0,unknown:0};for(const key of keys)out[m.students?.[key]?.gender||'unknown']++;return out;}
export function staffCanView(staffId,studentKey,m,draft,faculty){
 const p=studentIndex(draft)[studentKey],staff=staffIndex(faculty,m)[staffId];if(!p||!staff||staff.status!=='active')return false;
 const role=faculty?.classes?.[p.classId]?.roles?.[p.sectionId];const id=staffId.split(':').slice(1).join(':');
 if(staff.classId===p.classId&&(role?.classTeacher===id||role?.coClassTeacher===id))return true;
 if(entries(m.tasks).some(([,t])=>t.staffId===staffId&&(t.studentKey===studentKey||!t.studentKey&&t.sectionKey===`${p.classId}:${p.sectionId}`)&&t.status!=='cancelled'))return true;
 if(entries(m.allocations).some(([,a])=>a.staffId===staffId&&a.classId===p.classId&&a.sectionId===p.sectionId))return true;
 return staff.classId===p.classId&&String(staff.teachingSections||'').split(/[,;]/).map(s=>s.trim().toUpperCase()).includes(p.section.toUpperCase());
}
export function staffVisibleRecord(id,r){return {id,date:r.date,kind:r.kind,notes:r.notes,outcome:r.outcome,authorName:r.authorName||'',authorId:r.authorId||'',visibility:r.visibility,details:visibleMonitoringDetails(r)};}
export function staffProfileView(staffId,key,m,draft,faculty){
 assert(staffCanView(staffId,key,m,draft,faculty),'This student is not assigned to you.');
 const p=studentIndex(draft)[key],staff=staffIndex(faculty,m)[staffId],role=faculty?.classes?.[p.classId]?.roles?.[p.sectionId],tid=staffId.split(':').slice(1).join(':');
 const allowContact=staff.kind==='counsellor'||staff.classId===p.classId&&(role?.classTeacher===tid||role?.coClassTeacher===tid);
 const original=studentProgress(key,m,draft),mark=v=>v?{score:v.score,maximum:v.maximum,absent:v.absent,exam:{name:v.exam.name,date:v.exam.date,type:v.exam.type}}:null;
 const progress={academic:original.academic,attendance:original.attendance,attendanceBand:original.attendanceBand,recordedDays:original.recordedDays,overdue:original.overdue,subjects:original.subjects.map(s=>({id:s.id,name:s.name,percentage:s.percentage,band:s.band,latest:mark(s.latest),history:s.history.map(mark)}))};
 const contact=m.students?.[key]||{};
 return {student:{key,name:p.name,roll:p.roll,classId:p.classId,section:p.section,stream:p.stream},progress,contact:allowContact?{guardian:contact.guardian||'',phones:contact.phones||'',location:contact.location||'',gender:contact.gender||'unknown'}:null,tasks:entries(m.tasks).filter(([,t])=>(t.studentKey===key||!t.studentKey&&t.sectionKey===`${p.classId}:${p.sectionId}`)&&t.staffId===staffId).map(([id,t])=>({id,title:t.title,due:t.due,status:t.status,outcome:t.outcome,category:t.category,studentKey:key})),records:entries(m.records).filter(([,r])=>(r.studentKey===key||!r.studentKey&&r.sectionKey===`${p.classId}:${p.sectionId}`)&&(r.visibility==='general'||r.authorId===staffId)).map(([id,r])=>staffVisibleRecord(id,r))};
}
