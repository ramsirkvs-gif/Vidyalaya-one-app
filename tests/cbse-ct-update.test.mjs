import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyFaculty,ORIGINAL_FACULTY_SHA,applyCapturedTeacherRoles} from '../cbse-faculty-model.js';
import {emptyDraft} from '../cbse-model.js';
test('updated screenshot fills all nine pairs including X-A and preserves other responsibilities',()=>{
 const value=emptyFaculty(),serials={X:[30,32,19,33,26,35,43],XII:[10,11,16,3,12,5,4,9]};
 for(const[cl,list]of Object.entries(serials))for(const n of list)value.classes[cl].teachers[`pdf_${ORIGINAL_FACULTY_SHA.slice(0,16)}_${n}`]={name:`Synthetic ${cl} ${n}`,designation:'Teacher',subjects:'Subject',teachingSections:'A',status:'active'};
 value.classes.X.roles.a={classTeacher:'',coClassTeacher:'',other:{mentor:{label:'Mentor',teacherId:`pdf_${ORIGINAL_FACULTY_SHA.slice(0,16)}_32`}}};
 const result=applyCapturedTeacherRoles(value,emptyDraft().classes);assert.equal(result.changes.length,9);assert.deepEqual(result.missing,[]);assert.equal(result.data.classes.X.roles.a.classTeacher,`pdf_${ORIGINAL_FACULTY_SHA.slice(0,16)}_30`);assert.equal(result.data.classes.X.roles.a.coClassTeacher,`pdf_${ORIGINAL_FACULTY_SHA.slice(0,16)}_32`);assert.ok(result.data.classes.X.roles.a.other.mentor);assert.equal(applyCapturedTeacherRoles(result.data,emptyDraft().classes).changes.length,0);
});
