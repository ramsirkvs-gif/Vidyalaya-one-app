import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {taskFixture} from './task-manager-fixture.mjs';
import {applyTask,taskView,taskHeader,taskReport,TASK_CLASSES,TASK_PRIORITIES,TASK_FIELDS} from '../cbse-task-manager-model.js';
import {TASK1} from '../_server/task-manager-seed.js';
import {taskQuestions,taskCompatibleValues} from '../cbse-task-manager-model.js';
import {taskFiguresTemplate,importTaskFiguresCSV,importTaskStrengthWorkbook,decodePreparedTaskFigures} from '../cbse-task-manager-import.js';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {TASK1_ROSTER,taskRosterStore} from '../cbse-task-manager-roster.js';
import {TASK_AVAILABLE_CLASSES,taskClasses} from '../cbse-task-manager-model.js';
import {MONITORING_SHEETS,monitoringFormula} from '../cbse-task-workbook.js';
import {monitoringStage} from '../cbse-task-monitoring-workflow.js';
import {pb1CategoryCounts,pb1Metrics,pb1Risk,pb1SmartSummary,pb1ResultBand} from '../cbse-pb1-analyser-model.js';
import {studentIndex,studentProgress} from '../cbse-mission-model.js';
import {academicSnapshot,latestAcademicSnapshot} from '../cbse-academic-model.js';

test('Wisdom Analyser includes 25 in critical fail and 33 through 40 in borderline pass',()=>{
 assert.deepEqual([null,0,25,25.01,32.99,33,40,40.01,74.99,75,90].map(pb1ResultBand),
  ['grey','critical','critical','red','red','yellow','yellow','pass','pass','green','green']);
});

test('smart PB-1 summary counts each student once and compares matching papers',()=>{
 const mark=(percentage,band='green')=>({percentage,band,failed:['red','critical'].includes(band)});
 const rows=[
  {key:'a',before:mark(70),current:mark(95)},{key:'a',before:mark(80),current:mark(85)},
  {key:'b',before:mark(25,'red'),current:mark(34,'yellow')},{key:'b',before:mark(45),current:null},
  {key:'c',before:null,current:mark(20,'critical')},{key:'d',before:mark(55),current:{absent:true}},
 ];
 assert.deepEqual(pb1SmartSummary(rows),{students:4,assessed:3,incomplete:2,absent:1,pending:1,passed:2,enrolledPassed:1,failed:1,critical:1,
  borderline:1,score90:1,score75:1,score50:1,paired:2,previousPassed:1,pairedPassed:2});
});
test('PB-1 appeared and enrolled results distinguish retest from pending marks',()=>{
 const pass={percentage:60,band:'pass',failed:false};
 const rows=Array.from({length:23},(_,index)=>({key:String(index),current:pass}));
 for(const current of [{absent:true},null]){
  const results=[...rows,{key:'23',current}],summary=pb1SmartSummary(results);
  assert.equal(summary.students,24);
  assert.equal(summary.passed/summary.assessed*100,100);
  assert.equal((summary.enrolledPassed/summary.students*100).toFixed(1),'95.8');
  assert.equal(summary.absent,current?1:0);
  assert.equal(summary.pending,current?0:1);
  assert.equal(pb1CategoryCounts(results,'current').enrolledPassPercentage.toFixed(1),'95.8');
 }
});

test('PB-1 uses assigned enrolled students, paper maxima, explicit absence and paired comparisons',async()=>{
 const f=taskFixture(),draft=f.data.cbse.draft,mission=f.data.cbse.mission;
 const section=(name)=>({name,subjects:{english:{name:'English',code:'184'}},students:{
  one:{name:'Synthetic Student',roll:1,subjects:{english:true}},two:{name:'Synthetic Absentee',roll:2,subjects:{english:true}},
  three:{name:'Not enrolled',roll:3,subjects:{}},
 }});
 draft.classes.X.sections={a:section('A'),b:section('B')};
 mission.allocations={a:{classId:'X',sectionId:'a',subjectId:'english',staffId:'X:one'},b:{classId:'X',sectionId:'b',subjectId:'english',staffId:'X:two'}};
 mission.exams={earlier:{name:'October test',classId:'X',type:'test',date:'2026-10-19'},
  practice:{name:'English MCQs',classId:'X',type:'test',date:'2026-11-10'}};
 mission.marks={earlier:{studentKey:'X:a:one',subjectId:'english',examId:'earlier',maximum:40,score:12,absent:false},
  practice:{studentKey:'X:a:one',subjectId:'english',examId:'practice',maximum:10,score:10,absent:false}};
 await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');
 const data=await f.teacher({taskOperation:'pb1-read'});
 assert.equal(data.scopes.length,1);
 assert.equal(data.scopes[0].maximum,80);
 assert.equal(data.rows.length,2);
 assert.equal(data.rows[0].before.exam,'October test');
 assert.equal(pb1Risk(data.rows,'before')[0].failed.length,1);
 const save=(entries,extra={})=>f.teacher({taskOperation:'pb1-save',classId:'X',sectionId:'a',subjectId:'english',expectedRevision:0,entries,...extra});
 const approve=(expectedRevision)=>f.admin({operation:'pb1-approve',classId:'X',sectionId:'a',subjectId:'english',expectedRevision});
 await assert.rejects(approve(0),/every enrolled student/);
 await assert.rejects(save([{key:'X:b:one',mark:55}]),/enrolled/);
 await assert.rejects(save([{key:'X:a:one',mark:55}],{sectionId:'b'}),/assigned/);
 await assert.rejects(save([{key:'X:a:one',mark:81}]),/between 0 and 80/);
 const saved=await save([{key:'X:a:one',mark:28},{key:'X:a:two',mark:'AB'}]);
 assert.equal(saved.rows[0].current.percentage,35);
 assert.equal(saved.rows[1].current.absent,true);
 assert.deepEqual(pb1Metrics(saved.rows),{paired:1,total:2,recorded:2,absent:1,beforePass:0,currentPass:100,beforeAverage:30,currentAverage:35});
 assert.equal(pb1Risk(saved.rows)[0].borderline.length,1);
 assert.equal(pb1CategoryCounts(saved.rows,'before').failed,1);
 const categories=pb1CategoryCounts(saved.rows,'current');
 assert.equal(categories.yellow,1);
 assert.equal(categories.absent,1);
 assert.equal(categories.passPercentage,100);
 assert.equal(categories.average,35);
 assert.equal(categories.critical,0);
 await assert.rejects(save([{key:'X:a:one',mark:30}]),/results changed/);
 const principal=await f.admin({operation:'pb1-read'});assert.equal(principal.scopes.length,2);
 await assert.rejects(f.service('task-read',{operation:'pb1-public'}),/not published/);
 await assert.rejects(f.service('task-read',{operation:'pb1-read'}),/teacher PIN/);
 await f.admin({operation:'monitoring-publish',expectedRevision:0});
 const publicReport=await f.service('task-read',{operation:'pb1-public'});
 assert.equal(publicReport.scopes.length,2);
 const anonymous=publicReport.rows.find(row=>row.current?.score===28);
 assert.match(anonymous.name,/^Student [A-F0-9]{10}$/);
 assert.equal(anonymous.before.maximum,40);
 assert.equal(anonymous.current.maximum,80);
 assert.equal(anonymous.roll,undefined);
 assert.equal(anonymous.markId,undefined);
 assert.ok(!JSON.stringify(publicReport).includes('Synthetic Student'));
 await assert.rejects(f.service('task-read',{operation:'pb1-named'}),/viewing password/);
 const viewing=await f.service('remember-view',{},'principal');
 const named=await f.service('task-read',{operation:'pb1-named'},'','test',{viewerToken:viewing.viewerToken});
 assert.equal(named.rows.find(row=>row.current?.score===28).name,'Synthetic Student');
 const student=studentIndex(draft)['X:a:one'],latest=()=>studentProgress(student.key,f.data.cbse.mission,draft).subjects[0].latest;
 assert.equal(latest().score,12);
 await assert.rejects(f.teacher({taskOperation:'pb1-approve'}),/Teachers may only/);
 const frozen=await approve(saved.revision);
 assert.ok(frozen.scopes[0].approvedAt);
 assert.equal(frozen.scopes[1].approvedAt,0);
 assert.equal(latest().score,28);
 assert.equal(latestAcademicSnapshot(student,f.data.cbse.mission).subjects[0].mark.approvedPB1,true);
 assert.equal(academicSnapshot(student,f.data.cbse.mission,'2026-10').subjects[0].mark.score,12);
 await assert.rejects(save([{key:student.key,mark:30}],{expectedRevision:frozen.revision}),/approved and frozen/);
 f.data.cbse.mission.marks[saved.rows[0].markId].score=50;
 assert.equal(latest().score,28);
 assert.equal((await f.admin({operation:'pb1-read'})).rows[0].current.score,28);
});

test('Task 2 workbook stays private and saves editable cells with revision checks',async()=>{
 const f=taskFixture();
 const sheets=MONITORING_SHEETS.map(({rows,columns})=>Array.from({length:rows},()=>Array(columns).fill('')));
 sheets[0][5].splice(0,3,'1','English','X A');
 sheets[0][5][4]='Teacher One';sheets[1][8][0]='Teacher One';
 sheets[1][8][1]="=COUNTIF('Evaluation Plan'!\$E\$6:\$E\$109, A9)";
 sheets[1][8][4]='=SUM(B9:D9)';
 assert.equal(monitoringFormula(sheets[1][8][4],sheets,1),1);
 await assert.rejects(f.service('task-principal',{operation:'monitoring-read'},'outsider'),/Principal/);
 const save=(expectedRevision)=>f.admin({operation:'monitoring-save',sheets,expectedRevision});
 assert.equal((await save(0)).monitoring.revision,1);
 sheets[0][5][4]='Teacher Two';
 assert.equal(monitoringFormula(sheets[1][8][4],sheets,1),0);
 await assert.rejects(save(0),/changed/);
 assert.equal((await save(1)).monitoring.revision,2);
 assert.deepEqual((await f.admin({operation:'monitoring-read'})).monitoring.sheets,sheets);
 assert.deepEqual(await f.service('task-read'),{tasks:{}});
 await f.admin({operation:'monitoring-publish',expectedRevision:2});
 await assert.rejects(f.service('task-read',{operation:'monitoring-read'}),/viewing password/);
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const staffRead=()=>f.service('task-read',{operation:'monitoring-read'},'','test',{viewerToken});
 assert.equal((await staffRead()).monitoring.sheets[0][5][4],'Teacher Two');
 sheets[0][5][4]='Private edit';sheets[0].forEach(row=>row.push(''));sheets[0].push(Array(9).fill(''));
 await save(3);
 assert.equal((await staffRead()).monitoring.sheets[0][5][4],'Teacher Two');
 await f.admin({operation:'monitoring-unpublish',expectedRevision:4});
 await assert.rejects(staffRead(),/no longer published/);
});
test('Task 2 tracks PIN-gated handoffs, corrections and authorized Exam closure across republication',async()=>{
 const f=taskFixture();
 f.data.cbse.facultyDraft.classes.X.teachers.one.name='MR. PARAMVEER MEENA';
 f.data.cbse.facultyDraft.classes.X.teachers.two.name='MR. SUNIL KUMAR';
 f.data.cbse.facultyDraft.classes.X.teachers.three={name:'Synthetic Other IC',status:'active',designation:'PGT-Commerce'};
 const sheets=MONITORING_SHEETS.map(({rows,columns})=>Array.from({length:rows},()=>Array(columns).fill('')));
 sheets[0][5].splice(0,7,'1','English','X A','','MR. PARAMVEER MEENA','MR. SUNIL KUMAR','MR. SUNIL KUMAR');
 await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');
 await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');
 await f.service('set-pin',{staffId:'X:three',pin:'789'},'principal');
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const session={viewerToken};
 await f.admin({operation:'monitoring-save',expectedRevision:0,sheets});
 await f.admin({operation:'monitoring-settings',expectedRevision:1,overrides:{}});
 await f.admin({operation:'monitoring-publish',expectedRevision:2});
 const submit=(staff,expectedRevision,outcome='advance',remark='',publicationRevision=3)=>f.service('pin-submit',{
  operation:'task-manager',taskOperation:'monitoring-update',staffId:'X:'+staff,pin:{one:'123',two:'456',three:'789'}[staff],rowKey:'row_1',publicationRevision,expectedRevision,outcome,remark,
 },'','test',session);
 const practice=(staff,pin)=>f.service('pin-submit',{
  operation:'task-manager',taskOperation:'monitoring-practice',staffId:'X:'+staff,pin,rowKey:'row_1',publicationRevision:3,stage:0,outcome:'advance',
 },'','test',session);
 await assert.rejects(practice('one','000'),/PIN/);
 await assert.rejects(practice('two','456'),/another staff member/);
 assert.equal((await practice('one','123')).stage,1);
 assert.equal(f.data.cbse.taskMonitoring.progress,undefined);
 await assert.rejects(submit('two',0),/another staff member/);
 await submit('one',0);
 await submit('two',1,'return','Recheck totals');
 await assert.rejects(submit('two',2),/another staff member/);
 await submit('one',2);
 await submit('two',3);
 await submit('one',4);
 await assert.rejects(submit('two',5),/another staff member/);
 await submit('one',5);
 await assert.rejects(submit('one',6),/another staff member/);
 await submit('two',6);
 await submit('two',7);
 await assert.rejects(submit('three',8,'advance','Received'),/another staff member/);
 await assert.rejects(submit('one',8),/Enter a remark/);
 await f.admin({operation:'monitoring-publish',expectedRevision:3});
 await assert.rejects(submit('one',8,'advance','Received'),/changed/);
 const emergency={operation:'monitoring-emergency',rowKey:'row_1',stage:6,staffId:'X:two',expectedRevision:4};
 await assert.rejects(f.service('task-principal',emergency,'outsider'),/Principal/);
 await assert.rejects(f.admin(emergency),/Only the two named/);
 const legacy=f.data.cbse.taskMonitoring.published;
 legacy.examReviewers=[{id:'X:three',name:'Synthetic Other IC'}];
 legacy.assignments.row_1.substitutes={step_6:{id:'X:three',name:'Synthetic Other IC'}};
 const current=await f.service('task-read',{operation:'monitoring-read'},'','test',session);
 assert.deepEqual(current.monitoring.examReviewers.map(({name})=>name),['Mr. Paramveer Meena','Mr. Sunil Kumar']);
 await assert.rejects(submit('three',8,'advance','Received',4),/another staff member/);
 await assert.rejects(submit('one',8),/changed/);
 await submit('two',8,'advance','Received',4);
 const {monitoring}=await f.service('task-read',{operation:'monitoring-read'},'','test',session);
 assert.equal(monitoringStage(monitoring.progress.row_1),7);
 assert.equal(monitoring.progress.row_1.history.at(-1).remark,'Received');
 assert.equal(monitoring.progress.row_1.history.at(-1).name,'MR. SUNIL KUMAR');
});
test('existing Task 2 progress treats the old combined upload and matching step as complete',()=>{
 assert.deepEqual([0,1,2,3,4,5,6].map(stage=>monitoringStage({stage})),[0,1,2,3,5,6,7]);
 assert.equal(monitoringStage({stage:4,separateMatching:true}),4);
});
const remark=lead=>lead+" "+'These are synthetic class-level observations for testing the survey. Regular practice, accessible materials, guided revision, and coordinated support may improve participation. Teachers can review progress weekly, discuss general learning barriers, provide clear feedback, and adjust classroom activities. No student names, identifying family details, private health information, or real school records are included.';
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
 assert.equal(taskReport({...report,examContext:''}).examContext,'');
 assert.equal(taskReport(report,{}).passed,20);
});
test('Task 1 creation is idempotent, unpublished, has no invented enrollment or deadline; outsiders denied',async()=>{
 const f=taskFixture();await assert.rejects(f.service('task-principal',{operation:'create-task1'},'outsider'),/Principal/);
 assert.deepEqual(await f.service('task-read'),{tasks:{}});
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
 const result=await f.admin({operation:'read'});assert.equal(result.tasks.task1.reports['IX A'].revision,2);assert.equal(Object.keys(result.tasks.task1.reports).length,1);assert.equal(result.tasks.task1.summary.totals.passed.total,null);assert.deepEqual(result.tasks.task1.summary.totals.passed.classes,[]);assert.equal(result.tasks.task1.summary.totals.firstGeneration.total,null);assert.ok(result.tasks.task1.summary.pending.includes('XI E'));
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
 current=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'unpublish',taskId:'task1',expectedRevision:current.revision});assert.deepEqual((await f.teacher()).tasks,{});assert.equal(f.data.cbse.taskManager.tasks.task1.reports['IX A'].values.passed,null);
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
 let current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.summary.totals.sleepy.total,null);assert.equal(current.summary.totals.passed.total,null);assert.equal(current.summary.totals.q_additional_students.total,null);assert.deepEqual(current.reports['IX A'],original);
 assert.equal((await f.teacher()).tasks.task1.questions.length,14);
 await f.admin({operation:'publish',taskId:'task1',expectedRevision:current.revision});const mine=(await f.teacher()).tasks.task1;assert.equal(mine.questions.length,16);assert.equal(taskCompatibleValues(mine.reports['IX A'],mine).sleepy,null);assert.equal(taskCompatibleValues(mine.reports['IX A'],mine).passed,undefined);
 const input={taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:mine.revision,reportRevision:1,report:{...report,sleepy:2,q_additional_students:25,q_extra_meetings:50}};
 await assert.rejects(f.teacher(input),/enrollment/);await assert.rejects(f.teacher({...input,report:{...report,forgedField:1}}),/Only aggregate/);
 await f.teacher({...input,report:{...input.report,q_additional_students:4}});current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.summary.totals.q_extra_meetings.total,50);assert.equal(current.summary.totals.q_additional_students.total,4);assert.equal(current.summary.totals.sleepy.total,2);assert.equal(Object.keys(current.reports).length,1);
});
test('question definitions reject duplicates, invalid identifiers, answer types and loss of passed/failed count checks',()=>{
 const questions=taskQuestions();for(const invalid of [[],[...questions,questions[0]],[{id:'__proto__',label:'Invalid',kind:'students'}],[{id:'q_new_question',label:'',kind:'students'}],[{id:'q_new_question',label:'Invalid format',kind:'unsupported'}],[{id:'passed',label:'Passed',kind:'meetings'}]])assert.throws(()=>taskQuestions({questions:invalid}));
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
test('teacher remarks are optional, bounded, editable and private to assigned class access',async()=>{
 assert.equal(taskReport(report).remarks,'');assert.throws(()=>taskReport({...report,remarks:'x'.repeat(2001)}),/teacher remarks/);assert.throws(()=>taskReport({...report,remarks:42}),/teacher remarks/);
 const f=await setup(),t=f.data.cbse.taskManager.tasks.task1,input={taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:0,report:{...report,remarks:remark('Synthetic class perspective: irregular practice.\nSupport: guided revision.')}};
 await f.teacher(input);assert.equal((await f.teacher()).tasks.task1.reports['IX A'].values.remarks,input.report.remarks);
 await assert.rejects(f.teacher({...input,reportRevision:1},'X:two','456'),/not assigned/);await assert.rejects(f.teacher({...input,reportRevision:1},'X:one','000'),/PIN/);
 const other=await f.teacher({},'X:two','456');assert.ok(!JSON.stringify(other).includes('irregular practice'));
 let current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.reports['IX A'].values.remarks,input.report.remarks);assert.ok(!Object.hasOwn(current.summary.totals,'remarks'));
 await f.admin({operation:'save',taskId:'task1',expectedRevision:current.revision,draft:{...current.draft,visibility:'all'}});current=(await f.admin({operation:'read'})).tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:current.revision});assert.ok(!JSON.stringify(taskView(f.data.cbse.taskManager)).includes('irregular practice'));
 const published=(await f.teacher()).tasks.task1;await f.teacher({...input,expectedRevision:published.revision,reportRevision:1,report:{...report,remarks:remark('Synthetic updated perspective.')}});
 await f.teacher({...input,expectedRevision:published.revision,reportRevision:2,report});assert.equal((await f.teacher()).tasks.task1.reports['IX A'].values.remarks,remark('Synthetic updated perspective.'));
 await f.teacher({...input,expectedRevision:published.revision,reportRevision:3,report:{...report,remarks:''}});current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.reports['IX A'].values.remarks,'');assert.equal(Object.keys(current.reports).length,1);
});
test('public task list exposes published mentor/support/status only; questionnaires and all report data require assigned PIN',async()=>{
 const f=await setup(),t=f.data.cbse.taskManager.tasks.task1;
 await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:0,report:{...report,remarks:remark('PRIVATE_CLASS_REMARK')}});
 const output=await f.service('task-read');assert.equal(output.tasks.task1.rows.length,18);assert.equal(output.tasks.task1.rows[0].mentor,'Synthetic Teacher one');assert.equal(output.tasks.task1.rows[0].status,'Submitted');assert.equal(output.tasks.task1.rows[2].support,'Mr. Nitish Raj Sharma');assert.equal(output.tasks.task1.rows[1].status,'Pending');
 const json=JSON.stringify(output);for(const secret of ['PRIVATE_CLASS_REMARK','Synthetic preboard','firstGeneration','questions','headers','reports','instructions','summary','comment','salt','hash'])assert.ok(!json.includes(secret),secret);
 const mine=await f.teacher({taskId:'task1',classId:'IX A'});assert.deepEqual(mine.tasks.task1.classes,['IX A']);assert.equal(mine.tasks.task1.questions.length,14);assert.equal(mine.tasks.task1.reports['IX A'].values.remarks,remark('PRIVATE_CLASS_REMARK'));
 await assert.rejects(f.teacher({taskId:'task1',classId:'XI E'}),/not assigned/);await assert.rejects(f.teacher({taskId:'__proto__',classId:'IX A'}),/not assigned/);
 const current=(await f.admin({operation:'read'})).tasks.task1;await f.admin({operation:'unpublish',taskId:'task1',expectedRevision:current.revision});assert.deepEqual(await f.service('task-read'),{tasks:{}});await assert.rejects(f.teacher({taskId:'task1',classId:'IX A'}),/not assigned/);
});
test('supplied roster maps documented mentor names safely, retains explicit assignments, and does not authorize technical support',async()=>{
 assert.deepEqual(TASK1_ROSTER.map(r=>r.classId),TASK_CLASSES);assert.equal(TASK1_ROSTER.at(-1).mentor,'Dr. Mohan Singh');assert.equal(TASK1_ROSTER.find(r=>r.classId==='X B').support,'Ms. Monika');
 const source={tasks:{task1:{draft:{assignments:{}},published:{assignments:{'IX B':'explicit'}}}}},staff={mentor:{name:'MR. ABHISHEK SINGH',status:'active'},support:{name:'MR. NITISH RAJ SHARMA',status:'active'}};
 const resolved=taskRosterStore(source,staff);assert.equal(resolved.tasks.task1.published.assignments['IX A'],'mentor');assert.equal(resolved.tasks.task1.published.assignments['IX B'],'explicit');assert.equal(resolved.tasks.task1.published.assignments['IX C'],undefined);assert.deepEqual(source.tasks.task1.draft.assignments,{});
 const ambiguous=taskRosterStore(source,{...staff,another:{...staff.mentor}});assert.equal(ambiguous.tasks.task1.published.assignments['IX A'],undefined);
 const linked=taskRosterStore(source,{...staff,another:{...staff.mentor}},()=>['mentor','another']);assert.ok(['mentor','another'].includes(linked.tasks.task1.published.assignments['IX A']));
 resolved.tasks.task1.published.assignments={};assert.deepEqual(taskRosterStore(resolved,staff).tasks.task1.published.assignments,{});
 const f=taskFixture();f.data.cbse.facultyDraft.classes.X.teachers.one.name='MR. ABHISHEK SINGH';f.data.cbse.facultyDraft.classes.X.teachers.two.name='MR. NITISH RAJ SHARMA';await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');await f.admin({operation:'create-task1'});await f.admin({operation:'publish',taskId:'task1',expectedRevision:1});
 assert.equal((await f.service('task-read')).tasks.task1.rows[0].staffId,'X:one');assert.equal((await f.teacher({taskId:'task1',classId:'IX A'})).tasks.task1.classes[0],'IX A');await assert.rejects(f.teacher({taskId:'task1',classId:'IX C'},'X:two','456'),/not assigned/);
});
test('Principal deletes questions in a private draft; publishing updates forms while original answers survive resubmission',async()=>{
 const f=await setup();let t=f.data.cbse.taskManager.tasks.task1;
 await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:0,report:{...report,hostel:3}});
 t=f.data.cbse.taskManager.tasks.task1;const previous=structuredClone(t.reports['IX A']),questions=taskQuestions(t.draft).filter(q=>q.id!=='hostel');
 await assert.rejects(f.service('task-principal',{operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,questions}},'outsider'),/Principal/);
 await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,questions}});assert.deepEqual(f.data.cbse.taskManager.tasks.task1.reports['IX A'],previous);assert.ok((await f.teacher()).tasks.task1.questions.some(q=>q.id==='hostel'));
 t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:t.revision});let mine=(await f.teacher()).tasks.task1;assert.ok(!mine.questions.some(q=>q.id==='hostel'));assert.equal(mine.reports['IX A'].values.hostel,3);
 await assert.rejects(f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:mine.revision,reportRevision:1,report:{...report,hostel:4}}),/Only aggregate/);
 await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:mine.revision,reportRevision:1,report});
 let current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.reports['IX A'].retiredAnswers.hostel.value,3);assert.equal(current.reports['IX A'].retiredAnswers.hostel.label,TASK_FIELDS.hostel);assert.ok(!Object.hasOwn(current.summary.totals,'hostel'));assert.equal(Object.keys(current.reports).length,1);
 mine=(await f.teacher()).tasks.task1;await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:mine.revision,reportRevision:2,report:{...report,passed:19}});current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.reports['IX A'].retiredAnswers.hostel.value,3);assert.ok(!JSON.stringify(await f.service('task-read')).includes('retiredAnswers'));assert.ok(!JSON.stringify(await f.teacher({},'X:two','456')).includes('retiredAnswers'));
});
test('one shared questionnaire applies to selected classes; class removal hides access but retains reports and excludes them from totals',async()=>{
 const f=await setup();let t=f.data.cbse.taskManager.tasks.task1;const questions=taskQuestions(t.draft).map(q=>q.id==='firstGeneration'?{...q,label:'Shared first-generation count for every concerned class'}:q);
 await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,questions,selectedClasses:['IX A','XI E']}});assert.equal((await f.service('task-read')).tasks.task1.rows.length,18);
 t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:t.revision});assert.deepEqual((await f.service('task-read')).tasks.task1.rows.map(r=>r.classId),['IX A','XI E']);
 const first=(await f.teacher()).tasks.task1,second=(await f.teacher({},'X:two','456')).tasks.task1;assert.deepEqual(first.questions,second.questions);assert.equal(first.questions[0].label,'Shared first-generation count for every concerned class');
 await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:first.revision,reportRevision:0,report:{...report,firstGeneration:20}});await f.teacher({taskOperation:'submit',taskId:'task1',classId:'XI E',expectedRevision:second.revision,reportRevision:0,report:{...report,firstGeneration:3}},'X:two','456');
 let current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.summary.totals.firstGeneration.total,23);await f.admin({operation:'save',taskId:'task1',expectedRevision:current.revision,draft:{...current.draft,selectedClasses:['XI E']}});current=(await f.admin({operation:'read'})).tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:current.revision});
 await assert.rejects(f.teacher({taskId:'task1',classId:'IX A'}),/not assigned/);current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.reports['IX A'].values.firstGeneration,20);assert.deepEqual(current.summary.archivedClasses,['IX A']);assert.equal(current.summary.totals.firstGeneration.total,3);assert.equal((await f.service('task-read')).tasks.task1.rows.length,1);
 await f.admin({operation:'save',taskId:'task1',expectedRevision:current.revision,draft:{...current.draft,selectedClasses:['VI A','IX A','XI E'],assignments:{...current.draft.assignments,'VI A':'X:one'},headers:{...current.draft.headers,'VI A':{total:30,catV:0,st:5}}}});current=(await f.admin({operation:'read'})).tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:current.revision});assert.deepEqual((await f.teacher()).tasks.task1.classes,['VI A','IX A']);assert.equal((await f.teacher()).tasks.task1.reports['IX A'].values.firstGeneration,20);
 current=(await f.admin({operation:'read'})).tasks.task1;const oldClient={...current.draft};delete oldClient.selectedClasses;await f.admin({operation:'save',taskId:'task1',expectedRevision:current.revision,draft:oldClient});assert.deepEqual(f.data.cbse.taskManager.tasks.task1.draft.selectedClasses,['VI A','IX A','XI E']);
 for(const selectedClasses of [[],['X E'],['IX A','IX A']])assert.throws(()=>taskClasses({selectedClasses}),/Select/);assert.equal(TASK_AVAILABLE_CLASSES.length,35);
});
test('an authenticated figures import saves private defaults for later tasks without changing existing published figures',async()=>{
 const f=await setup(),t=f.data.cbse.taskManager.tasks.task1;
 await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,rememberFigures:true,draft:{...t.draft,headers:{'IX A':{total:30,catV:4,st:5},'VI A':{total:24,catV:2,st:3}}}});
 const current=await f.admin({operation:'read'});assert.equal(current.classFigures['IX A'].total,30);assert.equal(current.tasks.task1.published.headers['IX A'].total,24);assert.equal(current.tasks.task1.draft.headers['IX A'].total,30);
 const created=await f.admin({operation:'create',draft:{...TASK1,title:'Another synthetic shared survey'}});assert.equal(created.tasks[created.taskId].draft.headers['IX A'].total,30);assert.equal(created.tasks[created.taskId].draft.headers['VI A'].total,24);assert.ok(!JSON.stringify(await f.service('task-read')).includes('classFigures'));
});
test('prepared figures payload accepts only valid aggregate class data and never includes credentials or report fields',()=>{
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 assert.deepEqual(decodePreparedTaskFigures(encode({taskId:'task1',rows:[['IX A',24,0,null]]})),{taskId:'task1',headers:{'IX A':{total:24,catV:0,st:null}}});
 for(const value of [{taskId:'__proto__',rows:[['IX A',24,0,1]]},{taskId:'task1',rows:[['X E',24,0,1]]},{taskId:'task1',rows:[['IX A',24,0,25]]},{taskId:'task1',rows:[['IX A',-1,0,0]]},{taskId:'task1',rows:[['IX A',2.5,0,0]]},{taskId:'task1',rows:[['IX A',24,0,0],['IX A',24,0,0]]}])assert.throws(()=>decodePreparedTaskFigures(encode(value)));
 assert.throws(()=>decodePreparedTaskFigures('invalid!'));assert.throws(()=>decodePreparedTaskFigures('a'.repeat(10001)));
});
test('Counselor/Special Educator/Yoga remarks use private written answers, stay out of totals and preserve an older numeric answer',async()=>{
 const f=await setup();let current=(await f.admin({operation:'read'})).tasks.task1;const question={id:'q_counselor_remarks',label:'Remarks / observations obtained from the Counselor, Special Educator, or Yoga Teacher',kind:'students'};
 await f.admin({operation:'save',taskId:'task1',expectedRevision:current.revision,draft:{...current.draft,questions:[...taskQuestions(current.draft),question]}});current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.draft.questions.at(-1).kind,'text');await f.admin({operation:'publish',taskId:'task1',expectedRevision:current.revision});
 const input={taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:(await f.teacher()).tasks.task1.revision,reportRevision:0,report:{...report,[question.id]:remark('Synthetic counselling observations.\nGuided revision recommended.')}};
 await assert.rejects(f.teacher({...input,report:{...report,[question.id]:3}}),/written remarks answer/);await assert.rejects(f.teacher({...input,report:{...report,[question.id]:'x'.repeat(2001)}}),/written remarks answer/);await f.teacher(input);
 current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.reports['IX A'].values[question.id],input.report[question.id]);assert.ok(!Object.hasOwn(current.summary.totals,question.id));assert.equal(current.summary.totals.passed.total,null);assert.ok(!JSON.stringify(await f.service('task-read')).includes('Guided revision'));assert.ok(!JSON.stringify(await f.teacher({},'X:two','456')).includes('Guided revision'));
 // Simulate a report submitted by the older numeric-only questionnaire.
 const legacy=f.data.cbse.taskManager.tasks.task1.reports['IX A'];legacy.questions=legacy.questions.map(q=>q.id===question.id?{...q,kind:'students'}:q);legacy.values[question.id]=2;
 assert.equal(taskQuestions(legacy).at(-1).kind,'students');const mine=(await f.teacher()).tasks.task1;assert.equal(taskCompatibleValues(mine.reports['IX A'],mine)[question.id],null);
 await f.teacher({...input,reportRevision:1});current=(await f.admin({operation:'read'})).tasks.task1;assert.equal(current.reports['IX A'].retiredAnswers[question.id].value,2);assert.equal(current.reports['IX A'].values[question.id],input.report[question.id]);
});
test('new written comments require 50–100 words while blank answers and unchanged legacy comments remain valid',async()=>{
 const words=n=>Array.from({length:n},(_,i)=>'word'+i).join(' ');
 for(const n of [49,101])assert.throws(()=>taskReport({...report,remarks:words(n)}),/50–100 words/);
 for(const n of [50,100])assert.equal(taskReport({...report,remarks:words(n)}).remarks,words(n));assert.equal(taskReport({...report,remarks:''}).remarks,'');
 const f=await setup(),t=f.data.cbse.taskManager.tasks.task1;await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:0,report:{...report,remarks:words(50)}});
 f.data.cbse.taskManager.tasks.task1.reports['IX A'].values.remarks='Older short comment';await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:1,report:{...report,remarks:'Older short comment'}});assert.equal((await f.teacher()).tasks.task1.reports['IX A'].values.remarks,'Older short comment');
 await assert.rejects(f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:t.publishedRevision,reportRevision:2,report:{...report,remarks:'A newly written short comment'}}),/50–100 words/);
});
test('Principal edits submitted answers with revision checks, retains teacher attribution and original questions, and updates private totals',async()=>{
 const f=await setup();let teacher=(await f.teacher()).tasks.task1;await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:teacher.revision,reportRevision:0,report});
 let t=(await f.admin({operation:'read'})).tasks.task1;const original=structuredClone(t.reports['IX A']);const edit={operation:'edit-report',taskId:'task1',classId:'IX A',expectedRevision:t.revision,reportRevision:original.revision,report:{passed:19,failed:5,remarks:remark('Synthetic Principal correction.')}};
 await assert.rejects(f.service('task-principal',edit,'outsider'),/Principal/);await assert.rejects(f.teacher({...edit,operation:'task-manager',taskOperation:'edit-report'}),/Teachers may only/);
 await assert.rejects(f.admin({...edit,report:{passed:25}}),/enrollment/);assert.ok(!t.reports['IX A'].questions.some(q=>q.id==='failed'));
 await f.admin(edit);t=(await f.admin({operation:'read'})).tasks.task1;const saved=t.reports['IX A'];assert.equal(saved.values.passed,19);assert.equal(saved.values.ptms,40);assert.equal(saved.submittedBy,original.submittedBy);assert.deepEqual(saved.questions,original.questions);assert.equal(saved.revision,original.revision+1);assert.ok(saved.principalEditedAt);assert.deepEqual(saved.principalEditHistory.revision_1.values,original.values);assert.equal(t.summary.totals.passed.total,19);assert.equal(t.summary.submitted.length,1);
 await assert.rejects(f.admin(edit),/Task changed/);await assert.rejects(f.admin({...edit,expectedRevision:t.revision}),/Class report changed/);await assert.rejects(f.admin({...edit,expectedRevision:t.revision,classId:'IX B',reportRevision:0}),/not found/);await assert.rejects(f.admin({...edit,expectedRevision:t.revision,classId:'__proto__',reportRevision:0}),/not found/);
 teacher=(await f.teacher()).tasks.task1;assert.equal(teacher.reports['IX A'].values.passed,19);await assert.rejects(f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:teacher.revision,reportRevision:1,report}),/Class report changed/);
 await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:teacher.revision,reportRevision:2,report});assert.deepEqual((await f.admin({operation:'read'})).tasks.task1.reports['IX A'].principalEditHistory.revision_1.values,original.values);
 const publicText=JSON.stringify(await f.service('task-read'));assert.ok(!publicText.includes('principalEditHistory'));assert.ok(!publicText.includes('Synthetic Principal correction'));
});
test('Principal corrections edit retained reports after unpublication without changing shared questionnaire wording',async()=>{
 const f=await setup();let teacher=(await f.teacher()).tasks.task1;await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:teacher.revision,reportRevision:0,report});let t=(await f.admin({operation:'read'})).tasks.task1;
 await f.admin({operation:'unpublish',taskId:'task1',expectedRevision:t.revision});t=(await f.admin({operation:'read'})).tasks.task1;const qs=taskQuestions(t.reports['IX A']);await f.admin({operation:'edit-report',taskId:'task1',classId:'IX A',expectedRevision:t.revision,reportRevision:1,report:{passed:18,failed:6}});t=(await f.admin({operation:'read'})).tasks.task1;assert.equal(t.reports['IX A'].values.passed,18);assert.deepEqual(taskQuestions(t.reports['IX A']),qs);assert.deepEqual(taskQuestions(t.draft),qs);assert.equal(t.published,undefined);
});
test('whole-report closing comments are Principal-only, revision checked and excluded from public and teacher views',async()=>{const f=await setup();let t=(await f.admin({operation:'read'})).tasks.task1;const input={operation:'report-comments',taskId:'task1',expectedRevision:t.revision,comments:{ro:'Synthetic RO support.',deputyCommissioner:'Synthetic DC guidance.',assistantCommissioner:'Synthetic AC review.',principalAction:'Synthetic Principal action.',higherOfficials:'Synthetic official visit.'}};await assert.rejects(f.service('task-principal',input,'outsider'),/Principal/);await f.admin(input);t=(await f.admin({operation:'read'})).tasks.task1;assert.deepEqual(t.reportComments,input.comments);assert.ok(t.reportCommentsUpdatedAt);await assert.rejects(f.admin(input),/Task changed/);await assert.rejects(f.admin({...input,expectedRevision:t.revision,comments:{unknown:'No'}}),/valid closing/);await assert.rejects(f.admin({...input,expectedRevision:t.revision,comments:{ro:'x'.repeat(4001)}}),/valid closing/);assert.ok(!JSON.stringify(await f.service('task-read')).includes('Synthetic RO support'));assert.ok(!JSON.stringify(await f.teacher()).includes('Synthetic RO support'));});
test('Principal title correction applies to existing Task 1 views even after roster migration and preserves other titles and answers',()=>{const old='IX-XII : High-urgency survey for HQ meeting — regional inputs relevant to our Vidyalaya — Confidential student data for higher level submission',store={tasks:{task1:{revision:9,rosterAssignmentsApplied:true,draft:{title:old},published:{title:old},publishedRevision:3,reports:{'IX A':{values:{passed:12},revision:2}}},other:{draft:{title:old}}}};const before=structuredClone(store),updated=taskRosterStore(store,{});assert.equal(updated.tasks.task1.draft.title,TASK1.title);assert.equal(updated.tasks.task1.published.title,TASK1.title);assert.equal(updated.tasks.task1.reports['IX A'].values.passed,12);assert.equal(updated.tasks.task1.reports['IX A'].principalEditHistory.exam_policy_2.values.passed,12);assert.equal(updated.tasks.task1.revision,11);assert.equal(updated.tasks.task1.publishedRevision,5);assert.equal(updated.tasks.other.draft.title,old);assert.deepEqual(store,before);store.tasks.task1.draft.title='A different custom task title';assert.equal(taskRosterStore(store,{}).tasks.task1.draft.title,'A different custom task title');});

test('named PB-1 roster includes all enrolled sections even without paper registrations or marks',async()=>{
 const f=taskFixture();
 for(const [classId,sections] of [['X','ABCD'],['XII','ABCDE']]){
  f.data.cbse.draft.classes[classId].sections=Object.fromEntries([...sections].map(section=>[section,{
   name:section,subjects:{},students:{one:{name:'Synthetic '+classId+' '+section,roll:1,subjects:{}}},
  }]));
 }
 await f.admin({operation:'monitoring-publish',expectedRevision:0});
 const anonymous=await f.service('task-read',{operation:'pb1-public'});
 assert.equal(anonymous.roster,undefined);
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const named=await f.service('task-read',{operation:'pb1-named'},'','test',{viewerToken});
 assert.equal(named.roster.length,9);
 assert.equal(named.roster.find(row=>row.classId==='XII'&&row.section==='E').name,'Synthetic XII E');
});

test('Class XI CSV import, PIN entry and approval keep Half-Yearly results separate from PB-1',async()=>{
 const f=taskFixture(),exam='half-yearly';
 await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');
 await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');
 await f.admin({operation:'monitoring-publish',expectedRevision:0});
 const header='Section,RollNo,StudentName,Subject,PreviousMarks,PreviousMM,HalfYearlyMM,Teacher\n';
 const csv=header+'A,1,"Synthetic, First",English,15,40,80,X:one\nA,2,Synthetic Second,English,,,80,X:one\n';
 const upload={operation:'half-yearly-import',exam,expectedRevision:0,csv};
 await assert.rejects(f.service('task-principal',upload,'outsider'),/Principal access/);
 await assert.rejects(f.admin({...upload,csv:csv+'A,1,"Synthetic, First",English,15,40,80,X:one\n'}),/already has a row/);
 const imported=await f.admin(upload);
 assert.equal(imported.rows[0].before.percentage,37.5);
 assert.equal(imported.rows[1].before,null);
 assert.equal(imported.roster.length,2);
 assert.equal(imported.scopes[0].maximum,80);
 const {classId,sectionId,subjectId}=imported.scopes[0],paper={exam,classId,sectionId,subjectId};
 const save={...paper,taskOperation:'pb1-save',expectedRevision:imported.revision,entries:imported.rows.map(({key},i)=>({key,mark:i?'AB':36}))};
 await assert.rejects(f.teacher(save,'X:two','456'),/outside your assigned teaching scope/);
 const saved=await f.teacher(save);
 assert.equal(saved.rows[0].current.percentage,45);
 assert.equal(saved.rows[1].current.absent,true);
 const restored=await f.admin({...upload,expectedRevision:saved.revision});
 assert.equal(restored.rows[0].current.score,36);
 const approved=await f.admin({...paper,operation:'pb1-approve',expectedRevision:restored.revision,discussionComment:'XI discussion feedback'});
 assert.equal(approved.scopes[0].discussionComment,'XI discussion feedback');
 assert.ok(approved.scopes[0].approvedAt);
 await assert.rejects(f.teacher({...save,expectedRevision:approved.revision}),/approved and frozen/);
 const reopened=await f.admin({...paper,operation:'pb1-unfreeze',expectedRevision:approved.revision});
 assert.ok(!reopened.scopes[0].approvedAt);
 assert.equal(reopened.scopes[0].discussionComment,'XI discussion feedback');
 const correction=await f.teacher({...save,expectedRevision:reopened.revision});
 assert.equal(correction.rows[0].current.score,36);

 const publicReport=await f.service('task-read',{exam,operation:'pb1-public'});
 assert.equal(publicReport.roster,undefined);
 assert.ok(!JSON.stringify(publicReport).includes('Synthetic, First'));
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const named=await f.service('task-read',{exam,operation:'pb1-named'},'','test',{viewerToken});
 assert.equal(named.roster[0].name,'Synthetic, First');
 assert.equal((await f.admin({operation:'pb1-read'})).rows.length,0);
 assert.deepEqual(f.data.cbse.mission.marks,{});
});

test('PB-1 reclassifies a monthly borderline student immediately and Mission follows after freeze',async()=>{
 const f=taskFixture(),{draft,mission}=f.data.cbse,key='X:a:one';
 draft.classes.X.sections={a:{name:'A',subjects:{english:{name:'English',code:'184'}},students:{
  one:{name:'Synthetic Student',roll:1,subjects:{english:true}},
 }}};
 mission.exams={oct:{name:'October test',type:'monthly',classId:'X',date:'2026-10-15'}};
 mission.marks={oct:{studentKey:key,subjectId:'english',examId:'oct',score:15,maximum:40,absent:false}};
 const person=studentIndex(draft)[key],latest=()=>studentProgress(key,f.data.cbse.mission,draft);
 const paper={classId:'X',sectionId:'a',subjectId:'english'};
 const saved=await f.admin({operation:'pb1-save',...paper,expectedRevision:0,entries:[{key,mark:48}]});
 assert.equal(saved.rows[0].before.band,'yellow');
 assert.equal(saved.rows[0].current.band,'pass');
 assert.equal(pb1CategoryCounts(saved.rows,'current').yellow,0);
 assert.equal(latest().academic,'yellow');
 assert.equal(latest().subjects[0].latest.score,15);
 const approval={operation:'pb1-approve',...paper,expectedRevision:saved.revision};
 const comment='Synthetic private discussion note';
 await assert.rejects(f.admin({...approval,discussionComment:'x'.repeat(1001)}),/up to 1000/);
 await f.admin({...approval,discussionComment:comment});
 await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');
 f.data.cbse.mission.allocations={one:{classId:'X',sectionId:'a',subjectId:'english',staffId:'X:one'}};
 assert.equal((await f.teacher({taskOperation:'pb1-read'})).scopes[0].discussionComment,comment);
 await f.admin({operation:'monitoring-publish',expectedRevision:0});
 assert.ok(!JSON.stringify(await f.service('task-read',{operation:'pb1-public'})).includes(comment));
 assert.equal(latest().academic,'pass');
 assert.equal(latest().subjects[0].latest.score,48);
 assert.equal(latestAcademicSnapshot(person,f.data.cbse.mission).subjects[0].band,'pass');
 assert.equal(academicSnapshot(person,f.data.cbse.mission,'2026-10').subjects[0].band,'yellow');
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const {mission:staffView}=await f.service('view-data',{},'','test',{viewerToken});
 assert.equal(latestAcademicSnapshot(person,staffView).subjects[0].band,'pass');
 assert.ok(!JSON.stringify(staffView).includes(comment));
 const unfreeze={operation:'pb1-unfreeze',...paper,expectedRevision:f.data.cbse.mission.revision};
 const correction={taskOperation:'pb1-save',...paper,entries:[{key,mark:62}]};
 await assert.rejects(f.teacher({...correction,expectedRevision:unfreeze.expectedRevision}),/frozen/);
 await assert.rejects(f.teacher({...paper,taskOperation:'pb1-unfreeze',expectedRevision:unfreeze.expectedRevision}),/Teachers may only/);
 await assert.rejects(f.service('task-principal',unfreeze,'outsider'),/Principal/);
 await assert.rejects(f.admin({...unfreeze,expectedRevision:0}),/results changed/);
 const reopened=await f.admin(unfreeze);
 assert.equal(reopened.scopes[0].approvedAt,0);
 assert.equal(reopened.scopes[0].discussionComment,comment);
 assert.equal(reopened.rows[0].current.score,48);
 assert.equal(latest().subjects[0].latest.score,15);
 const corrected=await f.teacher({...correction,expectedRevision:reopened.revision});
 assert.equal(corrected.rows[0].current.score,62);
 assert.equal(latest().subjects[0].latest.score,15);
 await f.admin({...approval,discussionComment:comment,expectedRevision:corrected.revision});
 assert.equal(latest().subjects[0].latest.score,62);

});

test('class teacher analysis counts each enrolled student and separates AB, missing, failures and AI',async()=>{
 const {pb1ClassAnalysis}=await import('../cbse-pb1-class-analysis.js');
 const sections=[{classId:'X',section:'A'},{classId:'X',section:'B'}];
 const scopes=[
  {...sections[0],subject:'English'},{...sections[0],subject:'Science'},{...sections[0],subject:'AI',additional:true},
  {...sections[1],subject:'English'},
 ];
 const roster=['a','b','c','d','g'].map(key=>({key,name:key,roll:key,...sections[0]}))
  .concat([{key:'e',name:'e',roll:1,...sections[1]},{key:'f',name:'f',roll:2,...sections[1]}]);
 const pass={percentage:75,failed:false},fail={percentage:22,failed:true},absent={absent:true};
 const marks=[
  ['a',[pass,pass,fail]],['b',[absent,fail,absent]],['c',[absent,absent,pass]],
  ['d',[pass,null,pass]],['g',[fail,fail,pass]],
 ];
 const rows=marks.flatMap(([key,papers])=>papers.map((current,scope)=>({key,scope,current})))
  .concat([{key:'e',scope:3,current:pass}]);
 const core=pb1ClassAnalysis({roster,rows,scopes},{classId:'X'});
 assert.deepEqual([core.enrolled,core.appearedAll,core.absentOne,core.absentMultiple,core.pending,core.unmapped,core.passedAll,core.failed],[7,3,1,1,1,1,2,2]);
 const all=pb1ClassAnalysis({classRoster:roster,rows,scopes},{classId:'X',section:'A',includeAdditional:true});
 assert.deepEqual([all.enrolled,all.appearedAll,all.absentOne,all.absentMultiple,all.pending,all.passedAll,all.failed],[5,2,0,2,1,0,3]);
 assert.deepEqual(all.failures.map(row=>row.failed.map(paper=>paper.subject)),[['AI'],['Science'],['English','Science']]);
});

test('PB-1 class breakdown includes coded enrollment, class teacher and AI metadata',async()=>{
 const f=taskFixture();
 f.data.cbse.draft.classes.X.sections={a:{name:'A',subjects:{english:{name:'English',code:'184'},ai:{name:'Artificial Intelligence',code:'417'}},students:{
  one:{name:'Synthetic Class Student',roll:1,subjects:{english:true,ai:true}},
  two:{name:'Synthetic No Papers',roll:2,subjects:{}},
 }}};
 f.data.cbse.facultyDraft.classes.X.roles={a:{classTeacher:'one'}};
 await f.admin({operation:'monitoring-publish',expectedRevision:0});
 const report=await f.service('task-read',{operation:'pb1-public'});
 assert.deepEqual(report.classSections.find(row=>row.classId==='X'),{classId:'X',section:'A',teacher:'Synthetic Teacher one'});
 assert.equal(report.scopes.find(row=>/intelligence/i.test(row.subject)).additional,true);
 assert.equal(report.classRoster.length,2);
 assert.ok(report.classRoster.every(row=>/^Student [A-F0-9]{10}$/.test(row.name)));
 assert.ok(report.rows.every(row=>report.classRoster.some(student=>student.key===row.key)));
 assert.ok(!JSON.stringify(report).includes('Synthetic No Papers'));
});

test('PB-1 evaluator names follow seniority, consolidate aliases and include published paper assignments',async()=>{
 const f=taskFixture(),{draft,facultyDraft,mission}=f.data.cbse;
 const teacher=(name,designation)=>({name,designation,status:'active',subjects:'',teachingSections:''});
 facultyDraft.classes.X.teachers={
  junior:teacher('MR. ABHISHEK SINGH','TGT-English'),
  senior:teacher('MRS. E.T. ZIRDO','PGT-English'),
  ganga:teacher('LAISHRAM GANGA DEVI','PGT-Chemistry'),
 };
 facultyDraft.classes.XII.teachers={ganga:teacher('MS. L. GANGA DEVI','PGT-Chemistry')};
 draft.classes.X.sections={a:{name:'A',subjects:{english:{name:'English',code:'184'}},students:{
  one:{name:'Synthetic Student',roll:1,subjects:{english:true}},
 }}};
 draft.classes.XII.sections={a:{name:'A',subjects:{chem:{name:'Chemistry',code:'043'}},students:{}}};
 mission.allocations={one:{classId:'X',sectionId:'a',subjectId:'english',staffId:'X:junior'},
  two:{classId:'XII',sectionId:'a',subjectId:'chem',staffId:'X:ganga'}};
 f.data.cbse.taskMonitoring={published:{assignments:{
  row_1:{subject:'ENGLISH',section:'Class 10-A',roles:{evaluator:{id:'X:senior'}}},
  row_2:{subject:'ENGLISH',section:'Class 11-A',roles:{evaluator:{id:'XII:ganga'}}},
 }}};
 await f.service('set-pin',{staffId:'X:senior',pin:'321'},'principal');
 await f.service('set-pin',{staffId:'XII:ganga',pin:'654'},'principal');
 f.data.cbse.staffAccess['X:ganga'].enabled=false;
 const {teachers}=await f.service('task-read',{operation:'pb1-directory'});
 assert.deepEqual(teachers.map(({id})=>id),['X:senior','XII:ganga','X:junior']);
 const own=await f.teacher({taskOperation:'pb1-read'},'X:senior','321');
 assert.equal(own.scopes.length,1);
 assert.equal(own.scopes[0].subjectId,'english');
 const saved=await f.teacher({taskOperation:'pb1-save',classId:'X',sectionId:'a',subjectId:'english',expectedRevision:own.revision,entries:[{key:own.rows[0].key,mark:40}]},'X:senior','321');
 assert.equal(saved.rows[0].current.score,40);
});
