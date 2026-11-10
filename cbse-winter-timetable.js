import {isAvinashGuestProfile} from './cbse-faculty-guest.js';
export const WINTER_TITLE='Winter break TT with daily attendance report';
export const WINTER_PERIODS=['P1 · 8:00–9:30 a.m.','P2 · 9:30–11:00 a.m.','P3 · 11:30 a.m.–1:00 p.m.','P4 · 1:00–2:30 p.m.'];
export const WINTER_TIMETABLE={
 odd:{A:['Maths – Priyanka Mehta','Science – Jyoti Verma','SST – Gaurav Singh','AI – Bibek'],B:['Maths – Bikas Jyoti Das','Science – Monika','AI – Bibek','SST – Gaurav Singh'],C:['Science – Jyoti Verma','Maths – Priyanka Mehta','SST – Ajaya Pratap Singh','Writing Practice – Invigilator: Bikas Jyoti Das'],D:['Science – Monika','Maths – Bikas Jyoti Das','Writing Practice – Invigilator: Monika','SST – Ajaya Pratap Singh']},
 even:{A:['Science – Jyoti Verma','Maths – Priyanka Mehta','SST – Gaurav Singh','Writing Practice – Invigilator: Jyoti'],B:['Maths – Bikas Jyoti Das','Science – Monika','Writing Practice – Invigilator: Priyanka Mehta','SST – Gaurav Singh'],C:['Maths – Priyanka Mehta','Science – Jyoti Verma','AI – Bibek','SST – Ajaya Pratap Singh'],D:['Science – Monika','Maths – Bikas Jyoti Das','SST – Ajaya Pratap Singh','AI – Bibek']}
};
export const WINTER_DAYS=Array.from({length:10},(_,i)=>({day:i+1,date:new Date(Date.UTC(2026,11,23+i)).toISOString().slice(0,10),pattern:i%2?'even':'odd'}));
export function winterAttendanceDay(draft,input){
 const day=WINTER_DAYS.find(d=>input.paperId==='winter|X|'+d.day);if(input.classId!=='X'||!day)throw Error('Choose a winter-break teaching day for Class X.');
 const sections=Object.entries(draft.classes?.X?.sections||{}).filter(([,s])=>['A','B','C','D'].includes(String(s.name).trim().toUpperCase())),studentKeys=sections.flatMap(([sid,s])=>Object.keys(s.students||{}).map(id=>'X:'+sid+':'+id));
 return {...day,id:input.paperId,name:'Winter break · Day '+day.day,classId:'X',exam:'winter',codes:['WINTER'],codeConfirmed:true,studentKeys,storeKey:'winter_X_'+day.date.replaceAll('-','')+'_WINTER'};
}

// The PDF uses abbreviated names; match only its seven teachers and known
// spelling variants from the school roster, never everyone teaching a subject.
const winterName=value=>String(value||'').replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?\s*/gi,'').toUpperCase().replace(/[^A-Z]/g,'');
const winterTeacherNames=new Set(['PRIYANKAMEHTA','JYOTIVERMA','GAURAVSINGH','BIKASJYOTIDAS','BIKASHJYOTIDAS','AJAYAPRATAPSINGH','AJAYPRATAPSINGH','AJAYPRATAPSINGHC','MONIKA','MONIKAYADAV']);
export function isWinterTimetableTeacher(person){const key=winterName(person?.name),name=String(person?.name||'').replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?\s*/gi,'').trim();return person?.status==='active'&&(isAvinashGuestProfile(person)||winterTeacherNames.has(key)||/^BIBEK(?:\s|$)/i.test(name));}
export const winterTimetableStaff=staff=>Object.fromEntries(Object.entries(staff||{}).filter(([,p])=>isWinterTimetableTeacher(p)));
export const WINTER_ATTENDANCE_TAKEN='Attendance has already been taken for snacks distribution and student signatures. If you want to take attendance for your subject progress record, please go to the Remedial Class Manager.';
export const winterAttendanceComplete=(keys,records={})=>keys.length>0&&keys.every(key=>['reported','not-reported'].includes(records[key]?.status));
