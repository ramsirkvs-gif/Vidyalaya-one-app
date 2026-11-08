import {CBSE_2027_PAPERS,SCHOOL_CBSE_LANGUAGE_CODES} from './cbse-board-datesheet-data.js';
const normal=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const confirmedCode=(classId,paper)=>SCHOOL_CBSE_LANGUAGE_CODES[classId]?.[paper.name.split(' ')[0]];
function matchSubject(classId,id,subject){
 const papers=CBSE_2027_PAPERS.filter(p=>p.classId===classId),name=normal(subject.name),byName=papers.filter(p=>[p.name,...p.aliases].some(alias=>normal(alias)===name));
 const byId=papers.filter(p=>p.aliases.some(alias=>normal(alias)===normal(id))),code=String(subject.code??'').trim();
 if(code){if(!/^\d{1,3}$/.test(code))return {error:'Invalid CBSE subject code in school mapping'};const found=papers.filter(p=>p.code===code.padStart(3,'0'));if(!found.length)return {error:'No verified date for this mapped CBSE code'};const confirmed=confirmedCode(classId,found[0]);if(confirmed&&confirmed!==found[0].code)return {error:'Mapped code conflicts with the Principal-confirmed school course code '+confirmed};if(byName.length&&!byName.some(p=>p.code===found[0].code))return {error:'Subject name and CBSE code disagree'};return {papers:found};}
 let found=byName.length?byName:byId;if(!found.length)return {error:'Subject not matched to the verified school date sheet'};const confirmed=confirmedCode(classId,found[0]);if(confirmed){found=found.filter(p=>p.code===confirmed);if(!found.length)return {error:'Mapped course conflicts with the Principal-confirmed school code '+confirmed};}
 if(new Set(found.map(p=>[p.date,p.start,p.end].join('|'))).size!==1)return {error:'Course code is required to choose the correct exam date'};
 return {papers:found};
}
export function schoolBoardDateSheet(draft,classId){
 const rows=new Map(),unmatched=[];for(const [sectionId,section]of Object.entries(draft?.classes?.[classId]?.sections||{}))for(const [subjectId,subject]of Object.entries(section.subjects||{})){
  const matched=matchSubject(classId,subjectId,subject);if(matched.error){unmatched.push({sectionId,section:section.name,subjectId,name:subject.name||subjectId,reason:matched.error});continue;}
  const choices=matched.papers,paper=choices[0],codes=choices.map(p=>p.code).sort(),key=classId+'|'+paper.date+'|'+codes.join(','),row=rows.get(key)||{id:key,classId,date:paper.date,start:paper.start,end:paper.end,name:choices.length===1?paper.name:subject.name||subjectId,codes,codeConfirmed:choices.length===1,page:paper.page,sections:[],subjectRefs:[],studentKeys:[]};
  if(!row.sections.includes(section.name))row.sections.push(section.name);row.subjectRefs.push({sectionId,subjectId});for(const [studentId,student]of Object.entries(section.students||{}))if(student.subjects?.[subjectId])row.studentKeys.push(classId+':'+sectionId+':'+studentId);rows.set(key,row);
 }
 return {rows:[...rows.values()].map(r=>({...r,studentKeys:[...new Set(r.studentKeys)],sections:r.sections.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))})).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name)),unmatched};
}
export const boardDateLabel=date=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'long',day:'2-digit',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00+05:30'));
export const boardTimeLabel=row=>'10:30 a.m. – '+(row.end==='12:30'?'12:30 p.m.':'1:30 p.m.')+' IST';
