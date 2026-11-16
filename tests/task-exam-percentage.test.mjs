import test from 'node:test';
import assert from 'node:assert/strict';
import {withTaskExamParticipation} from '../_server/task-exam-participation.js';
import {presentationData} from '../cbse-task-presentation.js';
import {buildSurveyPptx} from '../cbse-task-pptx.js';
import {taskFixture} from './task-manager-fixture.mjs';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
const rows=[['IX A',43,13],['IX B',48,14],['IX C',40,12],['IX D',38,15],['X A',24,11],['X B',27,18],['X C',24,10],['X D',24,14],['XI A',42,15],['XI B',35,13],['XI C',40,24],['XI D',39,6],['XI E',37,14],['XII A',24,10],['XII B',29,14],['XII C',26,13],['XII D',35,13],['XII E',27,8]];
const questions=[{id:'passed',label:'Passed in the latest examination',kind:'students'},{id:'firstGeneration',label:'First-generation learners',kind:'students'},{id:'ptms',label:'PTMs',kind:'meetings'}];
function task(){const cfg={title:'Synthetic exam test',selectedClasses:rows.map(r=>r[0]),questions,headers:Object.fromEntries(rows.map(([c,total])=>[c,{total}]))},t={draft:cfg,published:structuredClone(cfg),reports:Object.fromEntries(rows.map(([c,,passed])=>[c,{questions,values:{passed,firstGeneration:1,ptms:1},submittedBy:'synthetic'}]))};return withTaskExamParticipation({tasks:{task1:t}}).tasks.task1;}
test('all four screenshot exam percentages use appeared students; other surveys retain enrollment denominators',()=>{
 const t=task();for(const [grade,passed,appeared,percentage]of [['IX',54,158,34.18],['X',53,94,56.38],['XI',72,177,40.68],['XII',58,133,43.61]]){
  const classes=rows.map(r=>r[0]).filter(c=>c.split(' ')[0]===grade),section=presentationData(t,{},'',undefined,{classes}).sections[0],p=section.points.find(p=>p.id==='passed');assert.equal(p.total,passed);assert.equal(p.base,appeared);assert.equal(Number((100*p.total/p.base).toFixed(2)),percentage);assert.equal(p.basis,'Exam pass rate among appeared students');assert.equal(p.segments[0].label,'Passed');assert.equal(p.segments[1].label,'Other appeared students');assert.equal(section.points.find(p=>p.id==='firstGeneration').base,classes.reduce((n,c)=>n+t.published.headers[c].total,0));assert.equal(section.points.find(p=>p.id==='ptms').base,null);
 }
 const all=presentationData(t).sections[1].points.find(p=>p.id==='passed');assert.equal(all.total,237);assert.equal(all.base,562);assert.equal((100*all.total/all.base).toFixed(2),'42.17');
});
test('partial reports use matching participation only; missing, stale or invalid participation never falls back to enrollment',()=>{
 const t=task(),scope=['IX A','IX B'];t.reports['IX B'].values.passed=null;let p=presentationData(t,{},'',undefined,{classes:scope}).sections[0].points.find(point=>point.id==='passed');assert.equal(p.base,39);assert.equal(p.total,13);
 delete t.examParticipation;p=presentationData(t,{},'',undefined,{classes:scope}).sections[0].points.find(point=>point.id==='passed');assert.equal(p.base,null);assert.equal(p.total,13);assert.match(p.note,/matching appeared counts/);
 delete t.published.headers['IX A'];assert.doesNotThrow(()=>presentationData(t));
 const invalid=task();invalid.published.headers['IX A'].total=44;assert.equal(presentationData(invalid,{},'',undefined,{classes:['IX A']}).sections[0].points.find(point=>point.id==='passed').base,null);
 const zero=task();zero.examParticipation.rows['IX A'].appeared=0;zero.reports['IX A'].values.passed=0;p=presentationData(zero,{},'',undefined,{classes:['IX A']}).sections[0].points.find(point=>point.id==='passed');assert.equal(p.base,0);assert.match(p.note,/not applicable/);
});
test('PowerPoint exports the same 34.18% and appeared denominator as the HTML/PDF presentation',async()=>{
 const data=presentationData(task(),{},'',undefined,{classes:rows.map(r=>r[0]).filter(c=>c.startsWith('IX '))}),deck=buildSurveyPptx(PptxGenJS,data),zip=await JSZip.loadAsync(await deck.write({outputType:'nodebuffer'})),xml=(await Promise.all(Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')))).join('\n');assert.ok(xml.includes('34.18%'));assert.ok(xml.includes('54 out of 158 appeared students'));assert.ok(!xml.includes('32.0%'));
});
test('Principal receives matching reference denominators privately, and cannot save Passed above appeared',async()=>{
 const f=taskFixture();await f.admin({operation:'create-task1'});let t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'save',taskId:'task1',expectedRevision:t.revision,draft:{...t.draft,selectedClasses:['IX A'],headers:{'IX A':{total:43}},assignments:{'IX A':'X:one'}}});t=f.data.cbse.taskManager.tasks.task1;await f.admin({operation:'publish',taskId:'task1',expectedRevision:t.revision});await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');await f.teacher({taskOperation:'submit',taskId:'task1',classId:'IX A',expectedRevision:1,reportRevision:0,report:{firstGeneration:3}});t=(await f.admin({operation:'read'})).tasks.task1;assert.equal(t.examParticipation.rows['IX A'].appeared,39);await assert.rejects(f.admin({operation:'edit-report',taskId:'task1',expectedRevision:t.revision,classId:'IX A',reportRevision:1,report:{passed:40}}),/appeared count/);assert.ok(!JSON.stringify(await f.service('task-read')).includes('examParticipation'));assert.equal((await f.teacher()).tasks.task1.examParticipation,undefined);
});
