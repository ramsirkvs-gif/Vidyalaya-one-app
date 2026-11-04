// Resolve historical Maths results against the single current Basic/Standard enrolment.
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
 const maths=selected.filter(([id])=>mathsKind(person.subjectCatalog?.[id]));
 return maths.length===1?maths[0][0]:'';
}
export function effectiveStudentMarks(person,marks){
 const rows=entries(marks).filter(([,mark])=>mark.studentKey===person?.key),target=mathsCarryoverTarget(person);
 if(!target)return Object.fromEntries(rows);
 const nativeExams=new Set(rows.filter(([,mark])=>mark.subjectId===target).map(([,mark])=>mark.examId));
 return Object.fromEntries(rows.flatMap(([id,mark])=>{
  const sourceKind=mathsKind(person.subjectCatalog?.[mark.subjectId]);
  if(!sourceKind||sourceKind===mathsKind(person.subjectCatalog?.[target]))return [[id,mark]];
  if(nativeExams.has(mark.examId))return [];
  return [[id,{...mark,subjectId:target,sourceSubjectId:mark.subjectId}]];
 }));
}
export function currentMarkSubject(person,subjectId){
 return mathsKind(person?.subjectCatalog?.[subjectId])?(mathsCarryoverTarget(person)||subjectId):subjectId;
}
