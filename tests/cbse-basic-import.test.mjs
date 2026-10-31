import test from 'node:test';
import assert from 'node:assert/strict';
import {importBasicStudents} from '../cbse-basic-import.js';
import {emptyMission} from '../cbse-mission-model.js';
const draft={classes:{X:{sections:{a:{name:'A',students:{one:{name:'Test Student',roll:'9'}}}}}}};
const header='Class,Section,StudentName,Gender,FatherName,FatherMobile,CurrentAddress,RollNo\n';
test('matches by section and full name without guessing XA serial as roll',()=>{const m=emptyMission();m.students['X:a:one']={gender:'unknown',guardian:'',phones:'old',location:''};const r=importBasicStudents(header+'X,A, Test   Student,Female,Parent,123,"Sector, City",',m,draft);assert.equal(r.matched,1);assert.equal(r.next.students['X:a:one'].gender,'girl');assert.equal(r.next.students['X:a:one'].phones,'Father: 123');assert.match(r.next.students['X:a:one'].location,/Sector, City/);assert.equal(m.students['X:a:one'].gender,'unknown');});
test('retains blank fields and does not match a different name with same roll',()=>{const m=emptyMission();m.students['X:a:one']={gender:'boy',guardian:'Old',phones:'123',location:'Home'};const r=importBasicStudents(header+'X,A,Test Student,,,,,\nX,A,Other Student,Male,,,,9',m,draft);assert.equal(r.matched,1);assert.equal(r.issues.length,1);assert.deepEqual(r.next.students,m.students);});
test('duplicate matched students and malformed rows reject the whole import',()=>{assert.throws(()=>importBasicStudents(header+'X,A,Test Student,Male,,,,\nX,A,Test Student,Female,,,,',emptyMission(),draft),/Duplicate/);assert.throws(()=>importBasicStudents(header+'X,A,Test Student,Male',emptyMission(),draft),/columns/);});
