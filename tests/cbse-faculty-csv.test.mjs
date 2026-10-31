import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyFaculty} from '../cbse-faculty-model.js';
import {emptyDraft,clone} from '../cbse-model.js';
import {exportFacultyCSV,importFacultyCSV,FACULTY_CSV_HEADERS} from '../cbse-faculty-csv.js';
const classes=emptyDraft().classes;
const teacher=name=>({name,designation:'TGT, English',subjects:'English, Hindi',teachingSections:'A, B',status:'active'});
function seed(){const value=emptyFaculty();value.classes.X.teachers={one:teacher('Synthetic "One"'),two:teacher('Synthetic Two')};value.classes.X.roles={a:{classTeacher:'one',coClassTeacher:'two'},b:{classTeacher:'',coClassTeacher:'two'}};return value;}
test('CSV round-trip preserves quoted text, identifiers, both standards and multiple co-teacher assignments',()=>{
 const data=seed(),csv=exportFacultyCSV(data,classes);assert.deepEqual(importFacultyCSV(emptyFaculty(),csv,classes).data,data);assert.ok(csv.includes('A;B'));
});
test('matching IDs update names without duplicating records; unlisted faculty and custom roles remain',()=>{
 const data=seed();data.classes.X.roles.a.other={mentor:{label:'Mentor',teacherId:'two'}};
 const edited=clone(data);edited.classes.X.teachers.one.name='Renamed Faculty';delete edited.classes.X.teachers.two;edited.classes.X.roles={a:{classTeacher:'one',coClassTeacher:''}};
 const result=importFacultyCSV(data,exportFacultyCSV(edited,classes),classes);assert.equal(result.summary.X.updated,1);assert.equal(Object.keys(result.data.classes.X.teachers).length,2);assert.equal(result.data.classes.X.teachers.one.name,'Renamed Faculty');assert.equal(result.data.classes.X.roles.a.other.mentor.teacherId,'two');
});
test('blank primary role cells clear only imported teachers; inactive status clears all their responsibilities',()=>{
 const data=seed(),update=clone(data);update.classes.X.roles={};update.classes.X.teachers.one.status='inactive';delete update.classes.X.teachers.two;
 const result=importFacultyCSV(data,exportFacultyCSV(update,classes),classes);assert.equal(result.data.classes.X.roles.a.classTeacher,'');assert.equal(result.data.classes.X.roles.a.coClassTeacher,'two');
});
test('unknown sections, duplicate rows and conflicting imported assignments fail atomically',()=>{
 const data=seed(),before=clone(data),header=FACULTY_CSV_HEADERS.join(',');
 assert.throws(()=>importFacultyCSV(data,header+'\none,X,One,TGT,English,A,active,Z,\n',classes),/section Z/);
 assert.throws(()=>importFacultyCSV(data,header+'\none,X,One,TGT,English,A,active,A,\none,X,One,TGT,English,A,active,A,\n',classes),/duplicate/);
 assert.throws(()=>importFacultyCSV(data,header+'\none,X,One,TGT,English,A,active,A,\ntwo,X,Two,TGT,English,A,active,A,\n',classes),/more than one/);assert.deepEqual(data,before);
});
test('spreadsheet formula text is quoted safely and restores without changing the faculty name',()=>{
 const data=emptyFaculty();data.classes.X.teachers.one=teacher('=SyntheticFormula');const csv=exportFacultyCSV(data,classes);assert.ok(csv.includes("'=SyntheticFormula"));assert.equal(importFacultyCSV(emptyFaculty(),csv,classes).data.classes.X.teachers.one.name,'=SyntheticFormula');
});
