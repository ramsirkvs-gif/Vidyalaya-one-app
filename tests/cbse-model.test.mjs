import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,validateDraft,clone,importCSVFiles,parseCSV,buildPublic,moveStudent} from '../cbse-model.js';
const csv='SNo,RollNo,StudentName,ENGLISH,MATHS STANDARD,MATHS BASIC\r\n1,001,"Student, One",ENGLISH,MATHS STANDARD,-\r\n2,002,Student Two,ENGLISH,-,MATHS BASIC\r\n';
const file={name:'Class_X_Sec_A_Students.csv',text:csv};
const seeded=()=>importCSVFiles(emptyDraft(),[file]).draft;
test('initial sections and streams match the school structure',()=>{
 const d=emptyDraft();assert.equal(Object.keys(d.classes.X.sections).length,4);assert.equal(Object.keys(d.classes.XII.sections).length,5);
 assert.equal(d.classes.XII.sections.a.stream,'science');assert.equal(d.classes.XII.sections.b.stream,'science');assert.equal(d.classes.XII.sections.c.stream,'commerce');assert.equal(d.classes.XII.sections.d.stream,'humanities');assert.equal(d.classes.XII.sections.e.stream,'humanities');
});
test('CSV retains leading-zero rolls, quoted names and separate subject choices',()=>{
 const d=seeded(),students=Object.values(d.classes.X.sections.a.students);
 assert.equal(students[0].roll,'001');assert.equal(students[0].name,'Student, One');assert.deepEqual(students[0].subjects,{english:true,maths_standard:true});assert.deepEqual(students[1].subjects,{english:true,maths_basic:true});
});
test('reimport updates matching rolls, adds new students and retains others',()=>{
 const d=seeded();const result=importCSVFiles(d,[{...file,text:'SNo,RollNo,StudentName,ENGLISH\n1,001,Changed Student,ENGLISH\n2,003,New Student,-\n'}]);
 assert.deepEqual(result.summary,[{classId:'X',section:'A',added:1,updated:1}]);assert.equal(Object.keys(result.draft.classes.X.sections.a.students).length,3);assert.equal(Object.values(result.draft.classes.X.sections.a.students).find(s=>s.roll==='001').name,'Changed Student');assert.equal(Object.values(d.classes.X.sections.a.students)[0].name,'Student, One');
});
test('malformed and duplicate CSV input is rejected without partial mutation',()=>{
 const d=emptyDraft(),before=clone(d);assert.throws(()=>importCSVFiles(d,[file,{name:'wrong.csv',text:csv}]),/Rename/);assert.deepEqual(d,before);
 assert.throws(()=>parseCSV('SNo,RollNo,StudentName\n1,1,One\n2,1,Two'),/Duplicate/);assert.throws(()=>parseCSV('SNo,RollNo,StudentName\n1,1,"open'),/unclosed/);assert.throws(()=>parseCSV('SNo,RollNo,StudentName\n1,1,One,Extra'),/columns/);
});
test('public snapshot contains only the approved student fields and is detached',()=>{
 const d=seeded();d.classes.X.sections.a.students.roll_001.privateNote='Do not publish';
 const pub=buildPublic(d);assert.deepEqual(Object.keys(pub.sections.X_a).sort(),['classId','count','section','stream','students']);assert.deepEqual(Object.keys(pub.sections.X_a.students.roll_001).sort(),['name','roll']);assert.ok(!JSON.stringify(pub).includes('privateNote'));assert.ok(!JSON.stringify(pub).includes('subjects'));
 d.classes.X.sections.a.students.roll_001.name='Unpublished change';assert.equal(pub.sections.X_a.students.roll_001.name,'Student, One');
});
test('counts-only publishing omits all student identifiers',()=>{
 const pub=buildPublic(seeded(),false);assert.equal(pub.sections.X_a.count,2);assert.equal(pub.sections.X_a.students,undefined);
});
test('transfers preserve the record and prevent duplicate rolls at destination',()=>{
 const d=seeded(),student=clone(d.classes.X.sections.a.students.roll_001);moveStudent(d,'X','a','b','roll_001',{...student,subjects:{}});validateDraft(d);assert.equal(Object.keys(d.classes.X.sections.a.students).length,1);assert.equal(Object.values(d.classes.X.sections.b.students)[0].name,'Student, One');
 assert.throws(()=>moveStudent(d,'X','a','b','roll_002',{name:'Duplicate',roll:'001',subjects:{}}),/already exists/);assert.equal(Object.keys(d.classes.X.sections.a.students).length,1);
});
test('unknown subjects, streams and duplicate sections are rejected',()=>{
 const d=seeded();d.classes.X.sections.a.students.roll_001.subjects.invalid=true;assert.throws(()=>validateDraft(d),/unknown subject/);delete d.classes.X.sections.a.students.roll_001.subjects.invalid;
 d.classes.X.sections.a.stream='missing';assert.throws(()=>validateDraft(d),/existing stream/);d.classes.X.sections.a.stream='';d.classes.X.sections.b.name='A';assert.throws(()=>validateDraft(d),/unique/);
});
