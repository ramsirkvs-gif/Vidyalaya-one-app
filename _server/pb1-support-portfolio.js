import {hqPB1Verification} from './pb1-hq-verification.js';
import {RECORD_KINDS} from '../cbse-mission-model.js';
import {studentRemedialParticipation} from '../cbse-remedial-participation.js';

const {updated,groups}=hqPB1Verification();
// Match completed subject blocks from the HQ return, including both Class X Maths variants.
const reported=new Set(groups.filter(group=>!group.total.at(-1)&&group.sections.every(paper=>paper.frozen))
 .flatMap(group=>group.sections.map(paper=>JSON.stringify([paper.section,paper.paper]))));
const paperKey=paper=>JSON.stringify([paper.classId+paper.section,paper.paperName]);
export const portfolioCaseKey=(student,paper)=>JSON.stringify([student,paper.subjectId]);

export function portfolioCases(report,teacherIds){
 return report.rows.flatMap(row=>{
  const paper=report.scopes[row.scope],mark=row.current;
  if(!reported.has(paperKey(paper))||!paper.approvedAt||!mark||mark.absent||!Number.isFinite(mark.percentage)||mark.percentage>=33)return [];
  if(teacherIds&&!paper.teachers.some(teacher=>teacherIds.has(teacher.key)))return [];
  return [{row,paper,key:portfolioCaseKey(row.key,paper)}];
 });
}

export function portfolioView(cases,mission,actions,teacherIds){
 const students=new Map();
 for(const {row,paper,key} of cases){
  if(!students.has(row.key))students.set(row.key,{key:row.key,name:row.name,roll:row.roll,section:paper.classId+paper.section,subjects:[]});
  const records=Object.values(mission.records||{}).filter(record=>record.studentKey===row.key&&
   (!record.subjectId||record.subjectId===paper.subjectId)&&
   (!teacherIds||record.visibility==='general'||teacherIds.has(record.authorId)));
  const evidence=records.map(record=>({date:record.date,source:RECORD_KINDS[record.kind]||'Portal record',detail:[record.notes,record.outcome].filter(Boolean).join(' · ')}));
  for(const session of studentRemedialParticipation(mission,row.key,[paper.subjectId]))
   evidence.push({date:session.date,source:'Verified remedial attendance',detail:[session.purpose,session.teacherName].filter(Boolean).join(' · ')});
  for(const mark of Object.values(mission.marks||{})){
   const exam=mission.exams?.[mark.examId];
   if(mark.studentKey!==row.key||mark.subjectId!==paper.subjectId||!exam||exam.type==='PB-1'||mark.absent)continue;
   evidence.push({date:exam.date,source:'Mission assessment',detail:exam.name+' · '+mark.score+'/'+mark.maximum});
  }
  for(const task of Object.values(mission.tasks||{})){
   if(task.studentKey!==row.key||task.status!=='done'||teacherIds&&!teacherIds.has(task.staffId))continue;
   evidence.push({date:task.due,source:'Completed Mission task',detail:[task.title,task.outcome].filter(Boolean).join(' · ')});
  }
  evidence.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  students.get(row.key).subjects.push({key,subject:paper.subject,teacher:paper.teacher,
   score:row.current.score,maximum:row.current.maximum,evidence,actions:Object.values(actions?.[key]||{}).sort((a,b)=>b.at-a.at)});
 }
 return {updated,students:[...students.values()].sort((a,b)=>a.section.localeCompare(b.section)||String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true}))};
}

export function portfolioAction(input,actor,at){
 const clean=(field,limit)=>{
  const value=input[field];
  if(typeof value!=='string'||value.length>limit)throw Error('Check the length of the action fields.');
  return value.trim();
 };
 const taken=clean('taken',1500),plan=clean('plan',1500),progress=clean('progress',800),review=clean('review',10);
 if(!taken&&!plan&&!progress)throw Error('Enter action taken, a next action plan or a progress update.');
 if(review&&(!/^\d{4}-\d{2}-\d{2}$/.test(review)||!Number.isFinite(Date.parse(review))||new Date(review).toISOString().slice(0,10)!==review))
  throw Error('Enter a valid review date.');
 return {taken,plan,progress,review,at,teacher:actor.name};
}
