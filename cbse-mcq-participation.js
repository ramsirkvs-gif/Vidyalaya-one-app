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
