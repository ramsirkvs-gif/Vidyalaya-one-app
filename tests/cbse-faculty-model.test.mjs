import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyFaculty,validateFaculty,mergeFacultyRoster,removeFaculty,clearTeacherRoles,extractFacultyRoster,ORIGINAL_FACULTY_SHA} from '../cbse-faculty-model.js';
import {emptyDraft,buildPublic,clone} from '../cbse-model.js';
const teacher=(name='Synthetic Teacher')=>({name,designation:'TGT',subjects:'Science',teachingSections:'A',status:'active'});
const seed=()=>{const d=emptyFaculty();d.classes.X.teachers={one:teacher(),two:teacher('Synthetic Colleague')};d.classes.X.roles={a:{classTeacher:'one',coClassTeacher:'two',other:{support:{label:'Mentor',teacherId:'one'}}}};return d;};
test('Class X and XII faculty stay independent and backward-compatible with student data',()=>{
 const d=seed();d.classes.XII.teachers={one:teacher('Another Standard')};validateFaculty(d);assert.notEqual(d.classes.X.teachers.one.name,d.classes.XII.teachers.one.name);
 const students=emptyDraft();students.faculty=d;assert.ok(!JSON.stringify(buildPublic(students)).includes('Synthetic Teacher'));
});
test('removing faculty clears all their responsibilities only in the selected standard',()=>{
 const d=seed();d.classes.XII.teachers={one:teacher('Other Standard')};const updated=removeFaculty(d,'X','one');assert.equal(updated.classes.X.roles.a.classTeacher,'');assert.equal(updated.classes.X.roles.a.coClassTeacher,'two');assert.deepEqual(updated.classes.X.roles.a.other,{});assert.ok(updated.classes.XII.teachers.one);assert.ok(d.classes.X.teachers.one);
});
test('inactive faculty cannot be assigned; deactivation can clear responsibilities',()=>{
 const d=seed();d.classes.X.teachers.one.status='inactive';assert.throws(()=>validateFaculty(d),/available/);clearTeacherRoles(d.classes.X,'one');validateFaculty(d);
});
test('invalid faculty references, duplicate class teachers and same-person pairs are rejected',()=>{
 const d=seed();d.classes.X.roles.a.coClassTeacher='missing';assert.throws(()=>validateFaculty(d),/available/);d.classes.X.roles.a.coClassTeacher='one';assert.throws(()=>validateFaculty(d),/different people/);d.classes.X.roles.a.coClassTeacher='two';d.classes.X.roles.b={classTeacher:'one',coClassTeacher:''};assert.throws(()=>validateFaculty(d),/only one section/);
});
test('first-time merge captures only X/XII; repeat imports preserve manual edits and roles',()=>{
 const r=[{serial:1,name:'Synthetic One',designation:'TGT',status:'active',teaching:[{classId:'X',section:'A',subject:'English'}]},{serial:2,name:'Synthetic Two',designation:'PGT',status:'vacant',teaching:[{classId:'XII',section:'B',subject:'Chemistry'}]},{serial:3,name:'Unrelated',designation:'PRT',status:'active',teaching:[]}];
 const first=mergeFacultyRoster(emptyFaculty(),r,emptyDraft().classes,'a'.repeat(64));assert.equal(first.summary.X.added,1);assert.equal(first.summary.XII.added,1);assert.equal(first.screenshotApplied,false);
 const id=Object.keys(first.data.classes.X.teachers)[0];first.data.classes.X.teachers[id].name='Edited Name';first.data.classes.X.roles.a={classTeacher:id,coClassTeacher:''};
 const again=mergeFacultyRoster(first.data,r,emptyDraft().classes,'a'.repeat(64));assert.equal(again.summary.X.added,0);assert.equal(again.summary.X.kept,1);assert.equal(again.data.classes.X.teachers[id].name,'Edited Name');assert.equal(again.data.classes.X.roles.a.classTeacher,id);
});
test('screenshot presets apply only to original PDF and use current section identifiers',()=>{
 const serials={X:[19,33,26,35,43],XII:[10,11,16,3,12,5,4,9]};const records=[];
 for(const[cl,ids]of Object.entries(serials))for(const serial of ids)records.push({serial,name:`Synthetic ${cl} ${serial}`,designation:'Teacher',status:'active',teaching:[{classId:cl,section:'A',subject:'Subject'}]});
 const classes=emptyDraft().classes;classes.X.sections.renamedB=classes.X.sections.b;delete classes.X.sections.b;
 const merged=mergeFacultyRoster(emptyFaculty(),records,classes,ORIGINAL_FACULTY_SHA);assert.equal(Object.keys(merged.data.classes.X.roles).length,3);assert.equal(Object.keys(merged.data.classes.XII.roles).length,5);assert.ok(merged.data.classes.X.roles.renamedB);assert.equal(merged.data.classes.X.roles.a,undefined);
 assert.equal(Object.keys(mergeFacultyRoster(emptyFaculty(),records,classes,'b'.repeat(64)).data.classes.X.roles).length,0);
});
test('PDF parser distinguishes wrapped XII rows from unrelated XI rows and ignores evaluator columns',()=>{
 const item=(text,x,y)=>({text,x,y});const page={items:[item('19',27,132),item('Synthetic Teacher',49,132),item('(TGT-English)',49,141),item('Class XI-A',169,132),item('ENGLISH (20)',224,132),item('Evaluator Name',529,132),item('-',49,165),item('Class',169,165),item('XII-A',169,174),item('ENGLISH (24)',224,165),item('20',27,198),item('Synthetic Teacher Two',49,198),item('(TGT-Science)',49,207),item('Class X-B',169,198),item('SCIENCE (27)',224,198),item('Footer Name',49,550)]};
 const parsed=extractFacultyRoster([page]);assert.equal(parsed.length,2);assert.deepEqual(parsed[0].teaching,[{classId:'XII',section:'A',subject:'ENGLISH'}]);assert.equal(parsed[1].name,'Synthetic Teacher Two');assert.equal(parsed[1].teaching[0].classId,'X');assert.ok(!JSON.stringify(parsed).includes('Evaluator Name'));assert.ok(!JSON.stringify(parsed).includes('Footer Name'));
});
