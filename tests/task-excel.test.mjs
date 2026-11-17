import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {buildTaskWorkbook} from '../cbse-task-excel.js';
const questions=[{id:'passed',label:'Passed',kind:'students'},{id:'hostel',label:'Hostel',kind:'students'},{id:'familyChallenges',label:'Family challenges',kind:'students'},{id:'ptms',label:'PTMs',kind:'meetings'},{id:'q_written01',label:'Written observations',kind:'text'}];
const cfg={title:'Synthetic survey',selectedClasses:['IX A','IX B','X A','XI A','XII A'],questions,headers:Object.fromEntries(['IX A','IX B','X A','XI A','XII A'].map(c=>[c,{total:20,catV:4,st:2}]))};
const task={published:cfg,reports:{'IX A':{questions,values:{passed:9,hostel:3,familyChallenges:4,ptms:2,q_written01:'=Synthetic text',remarks:'Synthetic remarks'}}},examParticipation:{rows:{'IX A':{enrolled:20,appeared:10}}}};
test('simple workbook has four class sheets and exactly two columns with presentation percentages',async()=>{
 const before=structuredClone(task),book=buildTaskWorkbook(ExcelJS,task);
 const restored=new ExcelJS.Workbook();await restored.xlsx.load(await book.xlsx.writeBuffer());
 assert.deepEqual(restored.worksheets.map(s=>s.name),['IX','X','XI','XII']);
 const sheet=restored.getWorksheet('IX'),rows=[];sheet.eachRow(r=>rows.push(r.values.slice(1)));
 const row=q=>rows.find(r=>String(r[0]).endsWith('. '+q));
 assert.equal(sheet.columnCount,2);assert.equal(sheet.getCell('A1').value,'Class IX — Survey Report');
 assert.deepEqual(sheet.getRow(3).values.slice(1),['Question','Answer / %']);
 assert.equal(row('Passed')[1],'90.00% (9 out of 10 appeared students) · Missing: IX B');
 assert.equal(row('Hostel')[1],'15.0% (3 out of 20 students) · Missing: IX B');assert.equal(row('Family challenges')[1],'20.0% (4 out of 20 students) · Missing: IX B');
 assert.equal(row('PTMs')[1],'2 · Missing: IX B');assert.ok(row('Written observations')[1].includes('IX A: =Synthetic text'));
 assert.equal(sheet.getRow(2).height,46);assert.ok(sheet.getRow(4).height<100);
 assert.equal(restored.getWorksheet('X').getCell('B'+(restored.getWorksheet('X').rowCount-2)).value,'98.91%');
 assert.deepEqual(task,before);
});
test('missing grades and zero appeared counts never generate invented percentages',()=>{
 const t=structuredClone(task);t.examParticipation.rows['IX A'].appeared=0;t.reports['IX A'].values.passed=0;t.published.selectedClasses=['IX A'];
 const book=buildTaskWorkbook(ExcelJS,t),rows=[];book.getWorksheet('IX').eachRow(r=>rows.push(r.values.slice(1)));
 assert.equal(rows.find(r=>r[0]==='Q4. Passed')[1],'0');
 assert.equal(book.getWorksheet('X').getCell('B4').value,'No sections selected for this class.');
});

test('total and Cat-V answers match the supplied presentation example',()=>{
 const t=structuredClone(task);t.published.selectedClasses=['IX A'];t.published.headers['IX A']={total:169,catV:125,st:0};
 const rows=[];buildTaskWorkbook(ExcelJS,t).getWorksheet('IX').eachRow(r=>rows.push(r.values.slice(1)));
 assert.equal(rows.find(r=>r[0].startsWith('Q1.'))[1],'169');
 assert.equal(rows.find(r=>r[0].startsWith('Q2.'))[1],'74.0% (125 out of 169 students)');
});
