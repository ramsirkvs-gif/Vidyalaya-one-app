// Resolve historical Basic results against a saved Standard-only enrolment.
// This is a viewing projection: source records and result IDs are never changed.
const entries=value=>Object.entries(value||{});
function mathsKind(subject){
 const code=String(subject?.code||'').trim();
 if(code)return code.padStart(3,'0')==='241'?'basic':code.padStart(3,'0')==='041'?'standard':'';
 const name=String(subject?.name||'').toLowerCase();
 return /math/.test(name)?(/basic/.test(name)?'basic':/standard/.test(name)?'standard':''):'';
}
export function mathsCarryoverTarget(person){
 if(person?.classId!=='X')return '';
 const selected=entries(person.subjects).filter(([,on])=>on);
 if(selected.some(([id])=>mathsKind(person.subjectCatalog?.[id])==='basic'))return '';
 const standard=selected.filter(([id])=>mathsKind(person.subjectCatalog?.[id])==='standard');
 return standard.length===1?standard[0][0]:'';
}
export function effectiveStudentMarks(person,marks){
 const rows=entries(marks).filter(([,mark])=>mark.studentKey===person?.key),target=mathsCarryoverTarget(person);
 if(!target)return Object.fromEntries(rows);
 const nativeExams=new Set(rows.filter(([,mark])=>mark.subjectId===target).map(([,mark])=>mark.examId));
 return Object.fromEntries(rows.flatMap(([id,mark])=>{
  if(mathsKind(person.subjectCatalog?.[mark.subjectId])!=='basic')return [[id,mark]];
  if(nativeExams.has(mark.examId))return [];
  return [[id,{...mark,subjectId:target,sourceSubjectId:mark.subjectId}]];
 }));
}
export function currentMarkSubject(person,subjectId){
 return mathsKind(person?.subjectCatalog?.[subjectId])==='basic'?(mathsCarryoverTarget(person)||subjectId):subjectId;
}
