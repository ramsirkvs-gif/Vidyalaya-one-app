import test from 'node:test';
import assert from 'node:assert/strict';
import {importBasicStudents} from '../cbse-basic-import.js';
import {emptyMission} from '../cbse-mission-model.js';
const draft={classes:{X:{sections:{a:{name:'A',students:{one:{name:'Test Student',roll:'9'}}}}}}};
const header='Class,Section,StudentName,Gender,FatherName,FatherMobile,CurrentAddress,RollNo\n';
test('matches by section and full name without guessing XA serial as roll',()=>{const m=emptyMission();m.students['X:a:one']={gender:'unknown',guardian:'',phones:'old',location:''};const r=importBasicStudents(header+'X,A, Test   Student,Female,Parent,123,"Sector, City",',m,draft);assert.equal(r.matched,1);assert.equal(r.next.students['X:a:one'].gender,'girl');assert.equal(r.next.students['X:a:one'].phones,'Father: 123');assert.match(r.next.students['X:a:one'].location,/Sector, City/);assert.equal(m.students['X:a:one'].gender,'unknown');});
test('retains blank fields and does not match a different name with same roll',()=>{const m=emptyMission();m.students['X:a:one']={gender:'boy',guardian:'Old',phones:'123',location:'Home'};const r=importBasicStudents(header+'X,A,Test Student,,,,,\nX,A,Other Student,Male,,,,9',m,draft);assert.equal(r.matched,1);assert.equal(r.issues.length,1);assert.deepEqual(r.next.students,m.students);});
test('duplicate matched students and malformed rows reject the whole import',()=>{assert.throws(()=>importBasicStudents(header+'X,A,Test Student,Male,,,,\nX,A,Test Student,Female,,,,',emptyMission(),draft),/Duplicate/);assert.throws(()=>importBasicStudents(header+'X,A,Test Student,Male',emptyMission(),draft),/columns/);});
test('email-only import changes only the matched email and preserves every other field',()=>{
 const m=emptyMission();m.students['X:a:one']={gender:'girl',guardian:'Parent',phones:'123',location:'Home',numbers:{one:{label:'Parent',phone:'1234567890'}},revision:7,email:'old@example.org'};
 m.attendance={saved:{studentKey:'X:a:one',present:true}};const before=structuredClone(m),roster=structuredClone(draft);
 const r=importBasicStudents('Class,Section,StudentName,Email\nX,A,Test Student,new@example.org',m,draft);
 assert.equal(r.emailOnly,true);assert.equal(r.matched,1);assert.equal(r.changed,1);
 const expected=structuredClone(m);expected.students['X:a:one'].email='new@example.org';assert.deepEqual(r.next,expected);assert.deepEqual(m,before);assert.deepEqual(draft,roster);
 assert.equal(importBasicStudents('Class,Section,StudentName,Email\nX,A,Test Student,new@example.org',r.next,draft).changed,0);
});
test('email-only import skips blanks, invalid addresses and mismatches; rejects other columns and duplicates',()=>{
 const m=emptyMission();const h='Class,Section,StudentName,Email\n';
 for(const row of ['X,A,Test Student,','X,A,Test Student,bad','X,A,Other Student,a@example.org','X,A,Test Student,a..b@example.org']){const r=importBasicStudents(h+row,m,draft);assert.equal(r.matched,0);assert.deepEqual(r.next,m);}
 assert.throws(()=>importBasicStudents('Class,Section,StudentName,Email,Gender\nX,A,Test Student,a@example.org,Female',m,draft),/exactly/);
 assert.throws(()=>importBasicStudents(h+'X,A,Test Student,a@example.org\nX,A,Test Student,b@example.org',m,draft),/Duplicate/);
});
