import test from 'node:test';
import assert from 'node:assert/strict';
import {taskFixture} from './task-manager-fixture.mjs';
import {TASK1} from '../_server/task-manager-seed.js';
import {examPassPreview,applyExamPassReference} from '../_server/task-exam-reference.js';
import {presentationData} from '../cbse-task-presentation.js';
async function fixture(){const f=taskFixture();await f.admin({operation:'create-task1'});let t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...TASK1,selectedClasses:['IX A','IX B','X A'],assignments:{'IX A':'X:one','IX B':'X:two','X A':'X:two'},headers:{'IX A':{total:43},'IX B':{total:48},'X A':{total:24}}}});t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:t.revision});await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:1,reportRevision:0,report:{passed:15,failed:27,firstGeneration:3}});return f;}
test('Principal-only preview and apply correct Passed with audit and preserve every other answer and identity',async()=>{
 const f=await fixture(),before=structuredClone(f.data.cbse.taskManager),old=before.tasks.task1.reports['IX A'];
 await assert.rejects(f.service('task-principal',{operation:'exam-pass-preview',taskId:'task1'},'outsider'),/Principal/);
 await assert.rejects(f.teacher({taskOperation:'exam-pass-apply',taskId:'task1'}),/Teachers may only/);
 const {preview}=await f.admin({operation:'exam-pass-preview',taskId:'task1'});assert.deepEqual(f.data.cbse.taskManager,before);assert.equal(preview.ready,1);assert.equal(preview.missing,2);assert.equal(preview.rows[0].passed,13);assert.equal(preview.rows[0].passPercent,33.33);
 await f.admin({operation:'exam-pass-apply',taskId:'task1',expectedRevision:preview.taskRevision,previewToken:preview.token,confirmApply:true,report:{passed:999,failed:0}});const task=(await f.admin({operation:'read'})).tasks.task1,saved=task.reports['IX A'];
 assert.deepEqual(saved.values,{...old.values,passed:13});assert.equal(saved.submittedBy,old.submittedBy);assert.deepEqual(saved.questions,old.questions);assert.deepEqual(saved.principalEditHistory.revision_1.values,old.values);assert.equal(saved.revision,old.revision+1);assert.equal(task.summary.totals.passed.total,13);assert.equal(task.reports['IX B'],undefined);assert.equal(task.publishedRevision,before.tasks.task1.publishedRevision);
 const point=presentationData(task).sections[0].points.find(p=>p.id==='passed');assert.equal(point.total,13);assert.equal(point.base,43);assert.match(point.note,/33.33% \(13\/39 appeared\)/);
 const publicText=JSON.stringify(await f.service('task-read'));assert.ok(!publicText.includes('examPassReference'));assert.ok(!publicText.includes('Periodic Test-2'));
 await assert.rejects(f.admin({operation:'exam-pass-apply',taskId:'task1',expectedRevision:preview.taskRevision,previewToken:preview.token,confirmApply:true}),/changed/);
 const next=(await f.admin({operation:'exam-pass-preview',taskId:'task1'})).preview,unchanged=structuredClone(f.data.cbse.taskManager);await f.admin({operation:'exam-pass-apply',taskId:'task1',expectedRevision:next.taskRevision,previewToken:next.token,confirmApply:true});assert.deepEqual(f.data.cbse.taskManager,unchanged);
});
test('preview skips incompatible enrollment, missing reports and pass/fail conflicts without altering Failed',async()=>{
 const f=await fixture(),store=f.data.cbse.taskManager,task=store.tasks.task1;task.published.headers['IX A'].total=42;
 let p=examPassPreview(store,{taskId:'task1'},{principal:true},{});assert.equal(p.rows[0].status,'blocked');assert.match(p.rows[0].reason,/enrollment/);task.published.headers['IX A'].total=43;task.reports['IX A'].values.failed=40;
 p=examPassPreview(store,{taskId:'task1'},{principal:true},{});assert.equal(p.ready,0);assert.match(p.rows[0].reason,/Passed plus failed/);assert.equal(p.rows[0].currentFailed,40);assert.equal(p.missing,2);
 assert.throws(()=>examPassPreview(store,{taskId:'other'},{principal:true},{}),/only/);assert.throws(()=>examPassPreview(store,{taskId:'task1'},{principal:false},{}),/Principal/);
});
test('a changed teacher response or task invalidates the entire preview; object ordering does not',async()=>{
 const f=await fixture(),before=structuredClone(f.data.cbse.taskManager),p=examPassPreview(before,{taskId:'task1'},{principal:true},{}),input={taskId:'task1',expectedRevision:p.taskRevision,previewToken:p.token,confirmApply:true};
 const reordered=Object.fromEntries(Object.entries(before.tasks.task1).reverse());assert.equal(examPassPreview({tasks:{task1:reordered}},{taskId:'task1'},{principal:true},{}).token,p.token);
 before.tasks.task1.reports['IX A'].revision++;assert.throws(()=>applyExamPassReference(before,input,{principal:true},{},123),/changed/);assert.equal(before.tasks.task1.reports['IX A'].values.passed,15);
 const fresh=structuredClone(f.data.cbse.taskManager);assert.throws(()=>applyExamPassReference(fresh,{...input,confirmApply:false},{principal:true},{},123),/confirm/);
});
test('multiple corrections are committed together and a teacher edit invalidates the whole batch',async()=>{
 const f=await fixture();await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX B',expectedRevision:1,reportRevision:0,report:{passed:16,failed:30}},'X:two','456');
 const old=(await f.admin({operation:'exam-pass-preview',taskId:'task1'})).preview;assert.equal(old.ready,2);
 await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX B',expectedRevision:1,reportRevision:1,report:{passed:17,failed:30}},'X:two','456');const snapshot=structuredClone(f.data.cbse.taskManager);
 await assert.rejects(f.admin({operation:'exam-pass-apply',taskId:'task1',expectedRevision:old.taskRevision,previewToken:old.token,confirmApply:true}),/changed/);assert.deepEqual(f.data.cbse.taskManager,snapshot);
 const next=(await f.admin({operation:'exam-pass-preview',taskId:'task1'})).preview;await f.admin({operation:'exam-pass-apply',taskId:'task1',expectedRevision:next.taskRevision,previewToken:next.token,confirmApply:true});const reports=f.data.cbse.taskManager.tasks.task1.reports;assert.equal(reports['IX A'].values.passed,13);assert.equal(reports['IX B'].values.passed,14);assert.equal(reports['IX A'].values.failed,27);assert.equal(reports['IX B'].values.failed,30);assert.equal(reports['X A'],undefined);
});
test('reference contains exactly the 18 supplied sections, counts Class X once and matches screenshot totals',()=>{
 const p=examPassPreview({tasks:{task1:{revision:1,draft:{},reports:{}}}},{taskId:'task1'},{principal:true},{});assert.equal(p.rows.length,18);assert.equal(new Set(p.rows.map(r=>r.classId)).size,18);
 for(const [grade,passed,percent]of [['IX',54,34.18],['X',53,56.38],['XI',72,40.68],['XII',58,43.61]]){const rows=p.rows.filter(r=>r.classId.split(' ')[0]===grade);assert.equal(rows.reduce((n,r)=>n+r.passed,0),passed);assert.equal(Number((100*passed/rows.reduce((n,r)=>n+r.appeared,0)).toFixed(2)),percent);for(const row of rows)assert.equal(Number((100*row.passed/row.appeared).toFixed(2)),row.passPercent);}
});
