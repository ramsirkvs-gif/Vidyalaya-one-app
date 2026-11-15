import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {taskFixture} from './task-manager-fixture.mjs';
import {applyTask,taskView,taskHeader,taskReport,TASK_CLASSES,TASK_PRIORITIES,TASK_FIELDS} from '../cbse-task-manager-model.js';
import {TASK1} from '../_server/task-manager-seed.js';
import {taskQuestions,taskCompatibleValues} from '../cbse-task-manager-model.js';
import {taskFiguresTemplate,importTaskFiguresCSV,importTaskStrengthWorkbook} from '../cbse-task-manager-import.js';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
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
test('Principal can edit and add draft questions without changing published forms or reinterpreting old reports',async()=>{
 const f=await setup();let t=f.data.cbse.taskManager.tasks.task1;
 await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:0,report:{...report,sleepy:3}});
 t=f.data.cbse.taskManager.tasks.task1;const original=structuredClone(t.reports['IX A']);
 const questions=taskQuestions(t.draft).map(q=>q.id==='sleepy'?{...q,label:'Students sleepy in at least three lessons this week'}:q);questions.push({id:'q_additional_students',label:'Additional synthetic student category',kind:'students'},{id:'q_extra_meetings',label:'Additional synthetic meetings',kind:'meetings'});
 await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,questions}});
 let current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.summary.totals.sleepy.total,null);assert.equal(current.summary.totals.passed.total,20);assert.equal(current.summary.totals.q_additional_students.total,null);assert.deepEqual(current.reports['IX A'],original);
 assert.equal((await f.teacher()).tasks.task1.questions.length,16);
 await f.admin({operation:'publish',taskId:'task1',expectedRevision:current.revision});const mine=(await f.teacher()).tasks.task1;assert.equal(mine.questions.length,18);assert.equal(taskCompatibleValues(mine.reports['IX A'],mine).sleepy,null);assert.equal(taskCompatibleValues(mine.reports['IX A'],mine).passed,20);
 const input={taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:mine.revision,reportRevision:1,report:{...report,sleepy:2,q_additional_students:25,q_extra_meetings:50}};
 await assert.rejects(f.teacher(input),/enrollment/);await assert.rejects(f.teacher({...input,report:{...report,forgedField:1}}),/Only aggregate/);
 await f.teacher({...input,report:{...input.report,q_additional_students:4}});current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.summary.totals.q_extra_meetings.total,50);assert.equal(current.summary.totals.q_additional_students.total,4);assert.equal(current.summary.totals.sleepy.total,2);assert.equal(Object.keys(current.reports).length,1);
});
test('question definitions reject duplicates, invalid identifiers, narrative types and loss of passed/failed count checks',()=>{
 const questions=taskQuestions();for(const invalid of [[],[...questions,questions[0]],[{id:'__proto__',label:'Invalid',kind:'students'}],[{id:'q_new_question',label:'',kind:'students'}],[{id:'q_new_question',label:'Names',kind:'text'}],[{id:'passed',label:'Passed',kind:'meetings'}]])assert.throws(()=>taskQuestions({questions:invalid}));
 assert.equal(taskQuestions({}).length,16);
});
test('one CSV imports all 18 classes, names and figures; blanks stay unknown and invalid rows reject the whole file',async()=>{
 const staff={'X:one':{name:'Synthetic Teacher one',status:'active'},'X:two':{name:'Synthetic Teacher two',status:'active'}};
 const template=taskFiguresTemplate(),blank=importTaskFiguresCSV(template,staff);assert.equal(Object.keys(blank.headers).length,18);assert.deepEqual(blank.headers['XI E'],{total:null,catV:null,st:null});assert.deepEqual(blank.assignments,{});
 assert.equal((await fs.readFile(new URL('../Task_Class_Figures_Template.csv',import.meta.url),'utf8')).replaceAll('\r',''),template.replaceAll('\r',''));
 const filled=template.replace('IX A,,,,','IX A,Synthetic Teacher one,24,0,5').replace('XI E,,,,','XI E,Synthetic Teacher two,30,,');const imported=importTaskFiguresCSV(filled,staff);assert.equal(Object.keys(imported.headers).length,18);assert.equal(imported.assignments['IX A'],'X:one');assert.equal(imported.assignments['XI E'],'X:two');assert.equal(imported.headers['IX A'].catV,0);assert.equal(imported.headers['XI E'].catV,null);
 for(const invalid of [filled.replace('24,0,5','24,0,25'),filled.replace('24,0,5','-1,0,5'),filled.replace('24,0,5','2.5,0,1'),filled.replace('XI E,Synthetic Teacher two,30,,','X E,Synthetic Teacher two,30,,'),filled.replace('Synthetic Teacher one','Unknown Teacher'),filled+'IX A,,,,\r\n'])assert.throws(()=>importTaskFiguresCSV(invalid,staff));
 assert.throws(()=>importTaskFiguresCSV(filled,{...staff,duplicate:staff['X:one']}),/ambiguous/);
});
test('school-strength Excel import maps all task classes, ignores younger classes and summary sheets, and rejects incomplete/invalid sheets',async()=>{
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Class Strength Data');sheet.addRow(['CLASS','TOTAL STUDENTS','CAT-V STUDENTS','TOTAL ST STUDENTS']);sheet.addRow(['VI A',24,2,3]);for(const c of TASK_CLASSES)sheet.addRow([c,24,2,3]);sheet.addRow(['TOTAL (VI-A to XII-E)',null,null,null]);book.addWorksheet('Summary & Chart').addRow(['CLASS GROUP','TOTAL STUDENTS','CAT-V STUDENTS','TOTAL ST STUDENTS']);
 const value=await importTaskStrengthWorkbook(await book.xlsx.writeBuffer(),ExcelJS,JSZip);assert.equal(Object.keys(value.headers).length,18);assert.deepEqual(value.headers['XI E'],{total:24,catV:2,st:3});assert.deepEqual(value.ignored,['VI A']);assert.deepEqual(value.assignments,{});
 sheet.getRow(3).getCell(3).value=25;await assert.rejects(importTaskStrengthWorkbook(await book.xlsx.writeBuffer(),ExcelJS,JSZip),/enrollment/);
 sheet.getRow(3).getCell(3).value=2;sheet.getRow(3).getCell(1).value='X E';await assert.rejects(importTaskStrengthWorkbook(await book.xlsx.writeBuffer(),ExcelJS,JSZip),/XI E/);
 sheet.getRow(3).getCell(1).value='';await assert.rejects(importTaskStrengthWorkbook(await book.xlsx.writeBuffer(),ExcelJS,JSZip),/missing task classes/);
});
