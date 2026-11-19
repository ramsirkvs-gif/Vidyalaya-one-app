import {gradeThresholds,studentIndex} from './cbse-mission-model.js';
import {academicMarkBand} from './cbse-academic-model.js';
import {effectiveStudentMarks} from './cbse-maths-carryover.js';
import {schoolPreboard1DateSheet} from './cbse-preboard1-datesheet.js';

import {isMCQResult,isMonthlyResult} from './cbse-academic-exam-kind.js';

export function pb1Scopes(draft,mission,staff,teacherIds){
 const allocations=Object.values(mission.allocations||{}),scopes=[],seen=new Set();
 for(const classId of ['X','XII']){
  if(!draft?.classes?.[classId])continue;
  for(const paper of schoolPreboard1DateSheet(draft,classId).rows){
   for(const {sectionId,subjectId} of paper.subjectRefs){
    const section=draft.classes[classId].sections[sectionId],subject=section.subjects[subjectId];
    const key=JSON.stringify([classId,sectionId,subjectId]);
    if(seen.has(key))continue;
    seen.add(key);
    const teachers=[...new Set(allocations.filter(a=>a.classId===classId&&a.sectionId===sectionId&&a.subjectId===subjectId).map(a=>a.staffId))];
    if(teacherIds&&!teachers.some(id=>teacherIds.has(id)))continue;
    scopes.push({classId,sectionId,section:section.name,subjectId,subject:subject.name,date:paper.date,maximum:paper.marks,
     teacher:teachers.map(id=>staff[id]?.name).filter(Boolean).join(' / ')});
   }
  }
 }
 return scopes;
}
export function pb1Report(draft,mission,staff,teacherIds){
 const scopes=pb1Scopes(draft,mission,staff,teacherIds),people=studentIndex(draft),byStudent={},rows=[];
 for(const [id,mark] of Object.entries(mission.marks||{}))(byStudent[mark.studentKey]??={})[id]=mark;
 for(const [scope,info] of scopes.entries()){
  const {classId,sectionId,subjectId,date}=info;
  for(const student of Object.values(people)){
   if(student.classId!==classId||student.sectionId!==sectionId||!student.subjects?.[subjectId])continue;
   let before,current;
   for(const [id,mark] of Object.entries(effectiveStudentMarks(student,byStudent[student.key]))){
    const exam=mission.exams?.[mark.examId];
    if(mark.subjectId!==subjectId||!exam||exam.classId!==classId||isMCQResult(exam,mark))continue;
    const item={...mark,id,exam};
    const newer=other=>!other||exam.date>other.exam.date||exam.date===other.exam.date&&(mark.updatedAt||0)>=(other.updatedAt||0);
    if(exam.type==='PB-1'&&exam.date.startsWith(date.slice(0,7))){
     if(newer(current))current=item;
    }else if(isMonthlyResult(exam,mark)&&exam.date<(exam.date.length===7?date.slice(0,7):date)&&newer(before))before=item;
   }
   const result=mark=>{
    if(!mark)return null;
    const {redBelow,greenFrom}=gradeThresholds(mission,classId,subjectId,mark.examId);
    const percentage=mark.absent?null:mark.score/mark.maximum*100;
    const band=academicMarkBand(mark,redBelow,greenFrom);
    return {score:mark.absent?null:mark.score,maximum:mark.maximum,percentage,absent:mark.absent,
     band,hasCriticalRule:mark.importSource==='monthly_workbook_v1'&&Number.isFinite(mark.criticalBelow),
     failed:band==='critical'||band==='red',borderline:band==='yellow',exam:mark.exam.name,date:mark.exam.date};
   };
   rows.push({scope,key:student.key,name:student.name,roll:student.roll??'',before:result(before),current:result(current),
    ...(current&&!current.sourceSubjectId?{markId:current.id,examId:current.examId}:{})});
  }
 }
 rows.sort((a,b)=>a.scope-b.scope||String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true})||a.name.localeCompare(b.name));
 return {revision:mission.revision||0,scopes,rows};
}
export function pb1CategoryCounts(rows,key){
 const counts={critical:0,red:0,yellow:0,green:0,absent:0,missing:0,appeared:0,criticalCovered:0};
 let total=0;
 for(const row of rows){
  const mark=row[key];
  if(!mark){counts.missing++;continue;}
  if(mark.absent){counts.absent++;continue;}
  if(mark.percentage==null){counts.missing++;continue;}
  counts.appeared++;total+=mark.percentage;
  if(mark.hasCriticalRule)counts.criticalCovered++;
  if(Object.hasOwn(counts,mark.band))counts[mark.band]++;
 }
 const failed=counts.critical+counts.red,passed=counts.yellow+counts.green;
 return {...counts,failed,passed,passPercentage:counts.appeared?passed/counts.appeared*100:null,
  average:counts.appeared?total/counts.appeared:null};
}
export function pb1SmartSummary(rows){
 const students=new Map();
 for(const row of rows){
  if(!students.has(row.key))students.set(row.key,[]);
  students.get(row.key).push(row);
 }
 const summary={students:students.size,assessed:0,incomplete:0,passed:0,failed:0,critical:0,criticalCovered:0,borderline:0,
  score90:0,score75:0,score50:0,paired:0,previousPassed:0,pairedPassed:0};
 const appeared=mark=>Number.isFinite(mark?.percentage);
 for(const papers of students.values()){
  const current=papers.filter(row=>appeared(row.current));
  if(current.length<papers.length)summary.incomplete++;
  if(!current.length)continue;
  summary.assessed++;
  const fails=current.some(row=>row.current.failed);
  if(fails)summary.failed++;else summary.passed++;
  if(current.some(row=>row.current.band==='critical'))summary.critical++;
  if(current.some(row=>row.current.hasCriticalRule))summary.criticalCovered++;
  if(!fails&&current.some(row=>row.current.band==='yellow'))summary.borderline++;
  const percentage=current.reduce((sum,row)=>sum+row.current.percentage,0)/current.length;
  for(const cutoff of [90,75,50])if(percentage>=cutoff)summary['score'+cutoff]++;
  const matched=current.filter(row=>appeared(row.before));
  if(!matched.length)continue;
  summary.paired++;
  if(matched.every(row=>!row.before.failed))summary.previousPassed++;
  if(matched.every(row=>!row.current.failed))summary.pairedPassed++;
 }
 return summary;
}
export function pb1Metrics(rows){
 const paired=rows.filter(row=>row.before?.percentage!=null&&row.current?.percentage!=null);
 const average=key=>paired.length?paired.reduce((sum,row)=>sum+row[key].percentage,0)/paired.length:null;
 const pass=key=>paired.length?paired.filter(row=>!row[key].failed).length/paired.length*100:null;
 return {paired:paired.length,total:rows.length,recorded:rows.filter(row=>row.current).length,
  absent:rows.filter(row=>row.current?.absent).length,beforePass:pass('before'),currentPass:pass('current'),
  beforeAverage:average('before'),currentAverage:average('current')};
}
export function pb1Risk(rows,resultKey='current'){
 const students=new Map();
 for(const row of rows){
  if(!students.has(row.key))students.set(row.key,{name:row.name,scope:row.scope,failed:[],borderline:[],unavailable:[]});
  const student=students.get(row.key);
  const result=row[resultKey];
  if(result?.failed)student.failed.push(row.scope);
  if(result?.borderline)student.borderline.push(row.scope);
  if(result?.percentage==null)student.unavailable.push(row.scope);
 }
 return [...students.values()];
}
