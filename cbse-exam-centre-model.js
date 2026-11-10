import {winterAttendanceDay,winterAttendanceComplete,WINTER_ATTENDANCE_TAKEN} from './cbse-winter-timetable.js';
import {schoolPreboard2DateSheet} from './cbse-preboard2-datesheet.js';
import {schoolPreboard1DateSheet} from './cbse-preboard1-datesheet.js';
import {schoolBoardDateSheet} from './cbse-board-datesheet-model.js';
export const examCentreToday=now=>new Date(now+19800000).toISOString().slice(0,10);
export function examCentrePaper(draft,input){
 if(input.exam==='winter')return winterAttendanceDay(draft,input);
 if(!['cbse','preboard1','preboard2'].includes(input.exam)||!['X','XII'].includes(input.classId))throw Error('Choose a published examination and standard.');
 const paper=(input.exam==='preboard2'?schoolPreboard2DateSheet:input.exam==='preboard1'?schoolPreboard1DateSheet:schoolBoardDateSheet)(draft,input.classId).rows.find(p=>p.id===input.paperId);if(!paper||!paper.codeConfirmed)throw Error('This paper or its school mapping changed. Reopen the date sheet.');
 return {...paper,exam:input.exam,storeKey:input.exam+'_'+input.classId+'_'+paper.date.replaceAll('-','')+'_'+paper.codes.join('-')};
}
export function examCentreRoster(draft,contacts,paper){
 return paper.studentKeys.map(key=>{const [classId,sectionId,id]=key.split(':'),section=draft.classes?.[classId]?.sections?.[sectionId],student=section?.students?.[id],contact=contacts?.[key]||{};if(!student)return null;return {key,classId,sectionId,section:section.name,roll:student.roll,name:student.name,contact:Object.fromEntries(['guardian','location','mapLocation','phones','numbers'].filter(k=>contact[k]!==undefined).map(k=>[k,contact[k]]))};}).filter(Boolean).sort((a,b)=>a.section.localeCompare(b.section,undefined,{numeric:true})||String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true})||a.name.localeCompare(b.name));
}
export function examCentreRecords(value={},principal=false){return Object.fromEntries(Object.entries(value.students||{}).map(([key,r])=>[key,Object.fromEntries(['status','reportedAt','updatedAt','updatedBy','updatedByName','revision',...(principal?['reason']:[])].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]))]));}
export function applyExamCentreAttendance(current,input,actor,paper,now,{winterBatch=false}={}){
 if(!actor||!actor.id||actor.role!=='principal'&&actor.status!=='active')throw Error('Use an active staff identity or Principal session.');
 if(!paper.studentKeys.includes(input.studentKey))throw Error('This student is not enrolled for the selected paper.');
 if(!['reported','not-reported','unconfirmed'].includes(input.status))throw Error('Choose a valid exam-centre attendance status.');
 const today=examCentreToday(now),principal=actor.role==='principal',reason=String(input.reason||'').trim();if(paper.date>today||!principal&&paper.date!==today)throw Error('Attendance can be recorded only on the scheduled exam date.');if(principal&&paper.date<today&&reason.length<10)throw Error('Explain this past-exam correction in at least 10 characters.');if(reason.length>500||reason&&reason.split(/\s+/).length>100)throw Error('Keep the correction reason within 100 words and 500 characters.');
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(input.requestId||''))throw Error('Reopen the attendance form before saving.');
 const next=structuredClone(current||{});if(next.paperKey&&next.paperKey!==paper.storeKey)throw Error('The examination record does not match this paper.');next.students||={};next.audit||={};const old=next.students[input.studentKey];
 if(old?.requestId===input.requestId&&old.updatedBy===actor.id&&old.status===input.status)return next;
 if(paper.exam==='winter'&&!winterBatch&&(next.winterFinalizedAt||winterAttendanceComplete(paper.studentKeys,next.students)))throw Error(WINTER_ATTENDANCE_TAKEN);
 if(!Number.isInteger(input.expectedRevision)||input.expectedRevision!==(old?.revision||0))throw Error('Another staff member updated this student. Refresh attendance before saving.');
 if((old?.status||'unconfirmed')===input.status)throw Error('Choose a different attendance status.');
 const record={status:input.status,updatedAt:now,updatedBy:actor.id,updatedByName:actor.name,revision:(old?.revision||0)+1,requestId:input.requestId,reportedAt:input.status==='reported'?(old?.status==='reported'?old.reportedAt:now):null,...(reason?{reason}:{})};
 next.paperKey=paper.storeKey;next.exam=paper.exam;next.classId=paper.classId;next.date=paper.date;next.codes=paper.codes;next.subject=paper.name;next.students[input.studentKey]=record;next.revision=(next.revision||0)+1;next.updatedAt=now;next.audit['change_'+next.revision]={studentKey:input.studentKey,previous:old||null,current:structuredClone(record),actorId:actor.id,actorName:actor.name,changedAt:now};if(paper.exam==='winter'&&!winterBatch&&winterAttendanceComplete(paper.studentKeys,next.students))next.winterFinalizedAt=now;return next;
}

export function applyExamCentreAttendanceBatch(current,input,actor,paper,now){
 if(!Array.isArray(input.changes)||!input.changes.length||input.changes.length>500||new Set(input.changes.map(c=>c?.studentKey)).size!==input.changes.length)throw Error('Choose distinct students for this attendance save.');
 if(paper.exam==='winter'&&(current?.winterFinalizedAt||winterAttendanceComplete(paper.studentKeys,current?.students))&&!input.changes.every(c=>{const old=current?.students?.[c.studentKey];return old?.requestId===c.requestId&&old.updatedBy===actor?.id&&old.status===c.status;}))throw Error(WINTER_ATTENDANCE_TAKEN);
 let next=structuredClone(current||{});for(const change of input.changes){if(!change||typeof change!=='object')throw Error('Choose valid attendance changes.');next=applyExamCentreAttendance(next,{studentKey:change.studentKey,status:change.status,expectedRevision:change.expectedRevision,requestId:change.requestId,reason:input.reason},actor,paper,now,{winterBatch:true});}if(paper.exam==='winter'&&!next.winterFinalizedAt&&winterAttendanceComplete(paper.studentKeys,next.students))next.winterFinalizedAt=now;return next;
}
