import {studentProgress} from './cbse-mission-model.js';
const paperCode=(mark,mission)=>mark.paperId||(mission.exams?.[mark.examId]?.source==='mcq-mahaabhiyan'&&String(mark.examId).startsWith('mcq_')?mark.examId.slice(4):'');
// A saved, non-absent result is participation. Corrections to a paper count once.
export function mcqAttendanceIndex(mission){
 const index=new Map();for(const mark of Object.values(mission.marks||{})){const id=paperCode(mark,mission);if(!/^QP(?:[A-Z]{1,4}\d{3}|(?:10|12)-\d{6,})$/.test(id)||!mark.studentKey||mark.absent||!Number.isFinite(mark.score)||!(mark.maximum>0))continue;let tests=index.get(mark.studentKey);if(!tests){tests=new Map();index.set(mark.studentKey,tests);}const old=tests.get(id);if(!old||(mark.updatedAt||0)>=(old.updatedAt||0))tests.set(id,{...mark,paperId:id});}return index;
}
export function studentMCQParticipation(mission,studentKey){return [...(mcqAttendanceIndex(mission).get(studentKey)?.values()||[])].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));}
export function mcqPaperUsage(mission,draft,paperId){
 const index=mcqAttendanceIndex(mission),groups=new Map();for(const [key,tests]of index){const mark=tests.get(paperId);if(!mark)continue;const [classId,sectionId,id]=key.split(':'),section=draft.classes?.[classId]?.sections?.[sectionId],student=section?.students?.[id];if(!student)continue;const groupKey=classId+':'+sectionId;if(!groups.has(groupKey))groups.set(groupKey,{classId,sectionId,section:section.name,students:[],criticalCount:0});const group=groups.get(groupKey),academic=studentProgress(key,mission,draft).academic;group.students.push({key,name:student.name,roll:student.roll,academic,testsAttended:tests.size,score:mark.score,maximum:mark.maximum,evaluatedBy:mark.evaluatedBy||'',evaluatedByName:mark.evaluatedByName||'',evaluatedAt:mark.updatedAt||0});if(academic==='critical')group.criticalCount++;}
 return [...groups.values()].map(g=>({...g,students:g.students.sort((a,b)=>String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true})||a.name.localeCompare(b.name))})).sort((a,b)=>a.classId.localeCompare(b.classId)||String(a.section).localeCompare(String(b.section),undefined,{numeric:true}));
}

// Coverage uses saved evaluations, including zero scores, rather than views/prints.
// Remaining is limited to the current subject roster and this paper's saved scope.
export function mcqPaperCoverage(mission,draft,paper,index=mcqAttendanceIndex(mission)){
 const classId=paper.classId||'X',sections=draft?.classes?.[classId]?.sections||{},groups=new Map();
 const groupFor=sectionId=>{if(!groups.has(sectionId))groups.set(sectionId,{classId,sectionId,section:sections[sectionId]?.name||sectionId,evaluated:[],remaining:[],eligible:0});return groups.get(sectionId);};
 const evaluated=new Map();for(const [key,tests]of index){const mark=tests.get(paper.id);if(!mark||key.split(':')[0]!==classId)continue;evaluated.set(key,mark);}
 for(const [sectionId,section]of Object.entries(sections)){
  if(paper.targetSections?.length&&!paper.targetSections.includes(sectionId))continue;
  for(const [id,student]of Object.entries(section.students||{})){
   if(!student.subjects?.[paper.subjectId])continue;const key=classId+':'+sectionId+':'+id;if(paper.targetStudentKeys?.length&&!paper.targetStudentKeys.includes(key)||paper.copyAssignments?.length&&!paper.copyAssignments.some(copy=>copy.studentKey===key))continue;const group=groupFor(sectionId);group.eligible++;
   if(!evaluated.has(key))group.remaining.push({key,name:student.name,roll:student.roll});
  }
 }
 for(const [key,mark]of evaluated){const [,sectionId,id]=key.split(':'),student=sections[sectionId]?.students?.[id];groupFor(sectionId).evaluated.push({key,name:student?.name||'Former student',roll:student?.roll||'',former:!student,score:mark.score,maximum:mark.maximum,evaluatedByName:mark.evaluatedByName||'',evaluatedAt:mark.updatedAt||0});}
 const sort=(a,b)=>String(a.roll||'').localeCompare(String(b.roll||''),undefined,{numeric:true})||a.name.localeCompare(b.name);
 const result=[...groups.values()].map(group=>({...group,evaluated:group.evaluated.sort(sort),remaining:group.remaining.sort(sort)})).sort((a,b)=>String(a.section).localeCompare(String(b.section),undefined,{numeric:true}));
 return {groups:result,evaluated:result.reduce((n,g)=>n+g.evaluated.length,0),remaining:result.reduce((n,g)=>n+g.remaining.length,0),eligible:result.reduce((n,g)=>n+g.eligible,0)};
}

// Credit the recorded evaluator, including linked teacher identities. A corrected
// result is one evaluation, and another teacher's result is never inferred by name.
export function teacherMCQParticipation(mission,teacherIds){
 const ids=new Set(teacherIds),papers=new Map(),students=new Set();let evaluations=0,lastReportedAt=0;
 for(const [key,tests]of mcqAttendanceIndex(mission))for(const mark of tests.values()){
  if(!ids.has(mark.evaluatedBy))continue;
  const classId=key.split(':')[0],groupKey=classId+'|'+mark.paperId;
  if(!papers.has(groupKey))papers.set(groupKey,{paperId:mark.paperId,classId,subjectId:mark.subjectId,reportedAt:0,students:[]});
  const group=papers.get(groupKey);group.students.push({key,score:mark.score,maximum:mark.maximum,reportedAt:mark.updatedAt||0});group.reportedAt=Math.max(group.reportedAt,mark.updatedAt||0);students.add(key);evaluations++;lastReportedAt=Math.max(lastReportedAt,mark.updatedAt||0);
 }
 return {evaluations,studentCount:students.size,paperCount:papers.size,lastReportedAt,papers:[...papers.values()].sort((a,b)=>b.reportedAt-a.reportedAt||a.paperId.localeCompare(b.paperId))};
}
