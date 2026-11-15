import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {taskFixture} from './task-manager-fixture.mjs';
import {applyTask,taskView,taskHeader,taskReport,TASK_CLASSES,TASK_PRIORITIES,TASK_FIELDS} from '../cbse-task-manager-model.js';
import {TASK1} from '../_server/task-manager-seed.js';
const report={examContext:'Synthetic preboard',passed:20,failed:4,ptms:40,firstGeneration:null};
async function setup(){const f=taskFixture();await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');await f.admin({operation:'create-task1'});let t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,assignments:{'IX A':'X:one','XI E':'X:two'},headers:{'IX A':{total:24,catV:0,st:null}}}});t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:t.revision});return f;}
test('exact class catalogue, unknown figures, independent overlapping categories and meeting counts',()=>{
 assert.equal(TASK_CLASSES.length,18);assert.ok(TASK_CLASSES.includes('XI E'));assert.ok(!TASK_CLASSES.includes('X E'));
 assert.deepEqual(taskHeader(),{total:null,catV:null,st:null});assert.equal(taskHeader({total:24,catV:0}).catV,0);
 assert.equal(taskReport({...report,hostel:24,sports:24},{total:24}).ptms,40);
 for(const v of [-1,1.5,'2',false,NaN])assert.throws(()=>taskReport({...report,passed:v},{total:24}),/Counts/);
 assert.throws(()=>taskReport({...report,failed:5},{total:24}),/Passed plus failed/);
 assert.throws(()=>taskReport({...report,sleepy:25},{total:24}),/enrollment/);
 assert.throws(()=>taskHeader({total:20,st:21}),/enrollment/);
 assert.throws(()=>taskReport({...report,studentNames:['Private']}),/Only aggregate/);
 assert.throws(()=>taskReport({...report,examContext:''}),/examination/);
 assert.equal(taskReport(report,{}).passed,20);
});
test('Task 1 creation is idempotent, unpublished, has no invented enrollment or deadline; outsiders denied',async()=>{
 const f=taskFixture();await assert.rejects(f.service('task-principal',{operation:'create-task1'},'outsider'),/Principal/);
 await assert.rejects(f.service('task-read'),/viewing password/);
 const a=await f.admin({operation:'create-task1'});assert.equal(a.tasks.task1.draft.title,TASK1.title);assert.equal(a.tasks.task1.draft.deadline,'');assert.deepEqual(a.tasks.task1.draft.headers,{});assert.ok(!a.tasks.task1.published);
 assert.deepEqual(taskView(f.data.cbse.taskManager).tasks,{});await f.admin({operation:'create-task1'});assert.equal(Object.keys(f.data.cbse.taskManager.tasks).length,1);
});
test('existing PINs authorize only assigned class reports, updates replace one class and reject stale revisions',async()=>{
 const f=await setup(),pins=structuredClone(f.data.cbse.staffAccess),read=await f.teacher();assert.deepEqual(read.tasks.task1.classes,['IX A']);assert.deepEqual(read.tasks.task1.headers['IX A'],{total:24,catV:0,st:null});
 await assert.rejects(f.teacher({},'X:one','000'),/PIN/);
 const input={taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:read.tasks.task1.revision,reportRevision:0,report};
 await assert.rejects(f.teacher({...input,classId:'XI E'}),/not assigned/);
 await assert.rejects(f.teacher({...input,taskOperation:'publish'}),/Teachers may only/);
 await f.teacher(input);await assert.rejects(f.teacher(input),/Class report changed/);
 await f.teacher({...input,reportRevision:1,report:{...report,passed:19}});
 const result=await f.admin({operation:'read'});assert.equal(result.tasks.task1.reports['IX A'].revision,2);assert.equal(Object.keys(result.tasks.task1.reports).length,1);assert.equal(result.tasks.task1.summary.totals.passed.total,19);assert.deepEqual(result.tasks.task1.summary.totals.passed.classes,['IX A']);assert.equal(result.tasks.task1.summary.totals.firstGeneration.total,null);assert.ok(result.tasks.task1.summary.pending.includes('XI E'));
 const other=await f.teacher({},'X:two','456');assert.ok(!JSON.stringify(other).includes('Synthetic preboard'));assert.deepEqual(other.tasks.task1.classes,['XI E']);assert.deepEqual(f.data.cbse.staffAccess,pins);
});
test('publishing instructions to all staff never exposes reports, private comments, drafts, headers or assignments',async()=>{
 const f=await setup(),t=f.data.cbse.taskManager.tasks.task1;await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:0,report});
 await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,title:'Private edited title',visibility:'all'}});
 assert.equal((await f.teacher()).tasks.task1.title,TASK1.title);assert.equal((await f.teacher()).tasks.task1.revision,t.publishedRevision);
 let current=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'comment',taskId:'task1',expectedRevision:current.revision,comment:'Principal private analysis'});current=f.data.cbse.taskManager.tasks.task1;
 await f.admin({operation:'publish',taskId:'task1',expectedRevision:current.revision});
 const remembered=await f.service('remember-view',{},'principal');const broad=await f.service('view-data',{},'','synthetic-ip',{viewerToken:remembered.viewerToken});assert.ok(!JSON.stringify(broad).includes('Synthetic preboard'));assert.ok(!JSON.stringify(broad).includes('Principal private analysis'));assert.ok(!JSON.stringify(broad).includes('taskManager'));
 const shared=taskView(f.data.cbse.taskManager);assert.equal(shared.tasks.task1.title,'Private edited title');assert.deepEqual(shared.tasks.task1.reports,{});assert.deepEqual(shared.tasks.task1.headers,{});assert.ok(!JSON.stringify(shared).includes('Principal private analysis'));assert.ok(!JSON.stringify(shared).includes('Synthetic preboard'));assert.ok(!shared.tasks.task1.assignments);
 current=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'unpublish',taskId:'task1',expectedRevision:current.revision});assert.deepEqual((await f.teacher()).tasks,{});assert.equal(f.data.cbse.taskManager.tasks.task1.reports['IX A'].values.passed,20);
 await assert.rejects(f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:current.revision,reportRevision:1,report}),/not assigned/);
});
test('reassignment, disabled PINs, task conflicts and invalid configuration are enforced by server',async()=>{
 const f=await setup();let t=f.data.cbse.taskManager.tasks.task1;
 await assert.rejects(f.admin({operation:'save',taskId:'task1',expectedRevision:0,draft:t.draft}),/Task changed/);
 await assert.rejects(f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,assignments:{'X E':'X:one'}}}),/Unknown class/);
 await assert.rejects(f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,assignments:{'IX A':'made-up'}}}),/active existing/);
 await assert.rejects(f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,priority:TASK_PRIORITIES[2]}}),/deadline/);
 await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,assignments:{'IX A':'X:two'}}});t=f.data.cbse.taskManager.tasks.task1;
 await f.admin({operation:'publish',taskId:'task1',expectedRevision:t.revision});assert.deepEqual((await f.teacher()).tasks,{});
 await f.service('disable',{staffId:'X:two'},'principal');await assert.rejects(f.teacher({},'X:two','456'),/correct PIN/);
 await assert.rejects(f.teacher({taskOperation:'submit',taskId:'__proto__',classId:'IX A'}),/Task not found/);
});
test('private Task 1 import is safe and Task manager namespace defaults to no client access',async()=>{
 const imported=JSON.parse(await fs.readFile(new URL('../private-templates/task1-draft.json',import.meta.url)));assert.equal(imported.draft.title,TASK1.title);assert.ok(!imported.published);assert.deepEqual(imported.reports,{});
 const rules=JSON.parse(await fs.readFile(new URL('../database.rules.json',import.meta.url))).rules;assert.equal(rules.cbse.taskManager['.read'],false);assert.equal(rules.cbse.taskManager['.write'],false);assert.equal(rules.cbse['.read'],undefined);
 const result=applyTask(null,{operation:'create-task1',draft:TASK1},{principal:true},{},100,'task1');assert.deepEqual(taskView(result,{ids:['X:one']}).tasks,{});assert.equal(Object.keys(TASK_FIELDS).length,16);
});
