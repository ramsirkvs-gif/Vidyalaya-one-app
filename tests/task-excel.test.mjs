import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {buildTaskWorkbook} from '../cbse-task-excel.js';
const questions=[{id:'passed',label:'Passed',kind:'students'},{id:'hostel',label:'Hostel',kind:'students'},{id:'familyChallenges',label:'Family challenges',kind:'students'},{id:'ptms',label:'PTMs',kind:'meetings'},{id:'q_written01',label:'Written observations',kind:'text'}];
const cfg={title:'Synthetic survey',selectedClasses:['IX A','IX B','X A','XI A','XII A'],questions,headers:Object.fromEntries(['IX A','IX B','X A','XI A','XII A'].map(c=>[c,{total:20,catV:4,st:2}]))};
const task={published:cfg,reports:{'IX A':{questions,values:{passed:9,hostel:3,familyChallenges:4,ptms:2,q_written01:'=Synthetic text',remarks:'Synthetic remarks'}}},examParticipation:{rows:{'IX A':{enrolled:20,appeared:10}}}};
test('Excel has four ordered grade sheets, every separate question, section answers and presentation denominators',async()=>{
 const before=structuredClone(task),book=buildTaskWorkbook(ExcelJS,task);
 const restored=new ExcelJS.Workbook();await restored.xlsx.load(await book.xlsx.writeBuffer());
 assert.deepEqual(restored.worksheets.map(s=>s.name),['IX','X','XI','XII']);
 const sheet=restored.getWorksheet('IX'),rows=[];sheet.eachRow(r=>rows.push(r.values.slice(1)));
 const row=q=>rows.find(r=>r[1]===q);
 assert.equal(row('Passed')[2],9);assert.equal(row('Passed')[3],'Not provided');assert.equal(row('Passed')[5],10);assert.equal(row('Passed')[6],.9);
 assert.equal(row('Hostel')[6],.15);assert.equal(row('Family challenges')[6],.2);
 assert.equal(row('PTMs')[6],'Not applicable');assert.equal(row('Written observations')[2],'=Synthetic text');assert.equal(row('Written observations')[6],'Not applicable');
 assert.ok(row('Passed')[7].includes('IX B'));assert.ok(!rows.some(r=>String(r[1]).includes('Combined groups')));
 assert.ok(restored.getWorksheet('X').getRow(restored.getWorksheet('X').rowCount).values.includes('98.91%'));
 assert.deepEqual(task,before);
});
test('missing grades and zero appeared counts never generate invented percentages',()=>{
 const t=structuredClone(task);t.examParticipation.rows['IX A'].appeared=0;t.reports['IX A'].values.passed=0;t.published.selectedClasses=['IX A'];
 const book=buildTaskWorkbook(ExcelJS,t),rows=[];book.getWorksheet('IX').eachRow(r=>rows.push(r.values.slice(1)));
 assert.equal(rows.find(r=>r[1]==='Passed')[5],'Not applicable');
 assert.equal(book.getWorksheet('X').getRow(5).getCell(2).value,'No sections selected for this class.');
});
