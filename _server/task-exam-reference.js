import {createHash} from 'node:crypto';
import {applyTask,taskClasses,taskQuestions,taskQuestionWording} from '../cbse-task-manager-model.js';
// Principal-supplied aggregate exam screenshots. Kept out of the static website.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const version='principal-exam-screenshots-v1';
const groups=[
 ['IX','Periodic Test-2',[[43,39,13,33.33],[48,46,14,30.43],[40,37,12,32.43],[38,36,15,41.67]]],
 ['X','Monthly Test (X-Sept)',[[24,21,11,52.38],[27,27,18,66.67],[24,23,10,43.48],[24,23,14,60.87]]],
 ['XI','Periodic Test-1 — Class XI (All Streams)',[[42,39,15,38.46],[35,34,13,38.24],[40,35,24,68.57],[39,33,6,18.18],[37,36,14,38.89]]],
 ['XII','Monthly Test (XII-Sept) — Class XII (All Streams)',[[24,23,10,43.48],[29,27,14,51.85],[26,24,13,54.17],[35,34,13,38.24],[27,25,8,32.00]]]
];
const reference=groups.flatMap(([grade,exam,rows])=>rows.map(([enrolled,appeared,passed,passPercent],i)=>({classId:grade+' '+String.fromCharCode(65+i),exam,enrolled,appeared,passed,passPercent})));
export function examPassPreview(store,input,actor,staff){
 if(!actor?.principal)throw Error('Principal access required.');if(input.taskId!=='task1'||!store?.tasks?.task1)throw Error('This exam reference applies only to High Task-1.');
 const task=store.tasks.task1,config=task.published||task.draft,classes=taskClasses(config),rows=reference.filter(row=>classes.includes(row.classId)).map(source=>{
  const report=task.reports?.[source.classId],currentPassed=report?.values?.passed??null,currentFailed=report?.values?.failed??null;let status='unchanged',reason='Already matches the supplied exam record.';
  if(!report){status='missing';reason='No submitted report. No response will be created.';}
  else if(!taskQuestions(report).some(q=>q.id==='passed'&&q.kind==='students'&&taskQuestions(config).some(active=>active.id==='passed'&&active.kind==='students'&&taskQuestionWording(active.label)===taskQuestionWording(q.label)))){status='blocked';reason='This report has no compatible Passed question.';}
  else if(config.headers?.[source.classId]?.total!==source.enrolled){status='blocked';reason='Task enrollment does not match the supplied exam record. Review enrollment first.';}
  else if(currentPassed!==source.passed){try{applyTask(store,{operation:'edit-report',taskId:'task1',expectedRevision:task.revision,classId:source.classId,reportRevision:report.revision||0,report:{passed:source.passed}},actor,staff,0);status='ready';reason='Only Passed will change. Failed and other answers stay unchanged.';}catch(error){status='blocked';reason=error.message;}}
  return {...source,currentPassed,currentFailed,reportRevision:report?.revision||0,status,reason};
 });
 const token=createHash('sha256').update(JSON.stringify(canonical([version,task]))).digest('hex');
 return {version,taskRevision:task.revision,token,rows,ready:rows.filter(r=>r.status==='ready').length,blocked:rows.filter(r=>r.status==='blocked').length,missing:rows.filter(r=>r.status==='missing').length};
}
export function applyExamPassReference(store,input,actor,staff,stamp){
 const preview=examPassPreview(store,input,actor,staff);if(input.previewToken!==preview.token||input.expectedRevision!==preview.taskRevision)throw Error('Task or class responses changed. Reopen the exam preview before applying.');
 if(input.confirmApply!==true)throw Error('Review and confirm the exam pass-count changes.');
 let next=structuredClone(store);for(const row of preview.rows.filter(row=>row.status==='ready'))next=applyTask(next,{operation:'edit-report',taskId:'task1',expectedRevision:next.tasks.task1.revision,classId:row.classId,reportRevision:row.reportRevision,report:{passed:row.passed}},actor,staff,stamp);
 const task=next.tasks.task1,matched=preview.rows.filter(row=>['ready','unchanged'].includes(row.status));
 if(matched.length){const rows=Object.fromEntries(matched.map(({classId,exam,enrolled,appeared,passed,passPercent})=>[classId,{exam,enrolled,appeared,passed,passPercent}]));if(!preview.ready&&task.examPassReference?.version===version&&JSON.stringify(canonical(task.examPassReference.rows))===JSON.stringify(canonical(rows)))return next;task.examPassReference={version,source:'Principal-supplied latest-exam screenshots',appliedAt:stamp,rows};task.revision++;task.updatedAt=stamp;}
 return next;
}
