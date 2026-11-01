import test from 'node:test';import assert from 'node:assert/strict';
import {importStudentPhotos,validateStudentPhoto} from '../cbse-student-photo.js';
import {emptyMission} from '../cbse-mission-model.js';
const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABQAQMAAACTceEGAAAAA1BMVEVWhXdH3udJAAAAD0lEQVQoz2NgGAWjYPgAAALQAAGOX/gHAAAAAElFTkSuQmCC';
const header=['Class','Section','StudentName','PhotoDataURL','Width','Height'],row=['X','A','Synthetic Student',data,'64','80'],people={'X:a:one':{classId:'X',section:'A',name:'Synthetic Student'},'X:b:two':{classId:'X',section:'B',name:'Other Student'}};
test('private photos match only unique class/section/name and preserve other data',()=>{
 const m=emptyMission();m.students={'X:a:one':{gender:'girl',guardian:'Keep',phones:'123',location:'Home',meetingLink:'https://meet.google.com/abc-defg-hij'}};m.marks={keep:{score:20}};const before=structuredClone(m);
 const r=importStudentPhotos(header,[row],m,people);assert.equal(r.matched,1);assert.equal(r.changed,1);assert.equal(r.next.studentPhotos['X:a:one'].dataUrl,data);assert.deepEqual(r.next.students,m.students);assert.deepEqual(r.next.marks,m.marks);assert.deepEqual(m,before);assert.equal(importStudentPhotos(header,[row],r.next,people).changed,0);
 const wrong=importStudentPhotos(header,[[...row.slice(0,1),'B',...row.slice(2)]],m,people);assert.equal(wrong.matched,0);assert.equal(wrong.issues.length,1);
});
test('duplicates, ambiguous names, wrong MIME and large portraits are rejected or skipped',()=>{
 assert.throws(()=>importStudentPhotos(header,[row,row],emptyMission(),people),/Duplicate/);
 assert.throws(()=>importStudentPhotos(header,[row,['X','B','Other Student',data,'64','80']],emptyMission(),people),/Identical source photo/);
 const ambiguous={...people,duplicate:people['X:a:one']};assert.equal(importStudentPhotos(header,[row],emptyMission(),ambiguous).matched,0);
 assert.throws(()=>validateStudentPhoto({dataUrl:'data:image/svg+xml;base64,PHN2Zz4=',width:64,height:80}));assert.throws(()=>validateStudentPhoto({dataUrl:data,width:1000,height:80}));
});
