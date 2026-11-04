import test from 'node:test';import assert from 'node:assert/strict';
import {mcqContributors,mcqTopicChoices} from '../cbse-mcq-model.js';
import {emptyFaculty} from '../cbse-faculty-model.js';import {emptyMission} from '../cbse-mission-model.js';
import {MCQ_SYLLABUS,syllabusTopicSource} from '../cbse-mcq-syllabus.js';
test('contributor list contains only active subject teachers of chosen class, including cross-class teaching assignments',()=>{const f=emptyFaculty(),m=emptyMission(),teacher=(name,subjects,status='active')=>({name,subjects,status,designation:'TGT'});f.classes.X.teachers={junior:teacher('Junior','English'),inactive:teacher('Inactive','Science','inactive'),empty:teacher('No subject','')};f.classes.XII.teachers={senior:teacher('Senior','Chemistry')};m.staff={support:teacher('Support','English')};assert.deepEqual(mcqContributors(f,m,'X').map(t=>t.id),['X:junior']);assert.deepEqual(mcqContributors(f,m,'XII').map(t=>t.id),['XII:senior']);m.allocations={a:{classId:'XII',staffId:'X:junior',subjectId:'ai'}};assert.deepEqual(mcqContributors(f,m,'XII').map(t=>t.id),['X:junior','XII:senior']);});
test('topic choices contain saved names only, with no built-in syllabus topics',()=>{for(const [cl,name] of [['X','Science'],['X','Mathematics'],['XII','Chemistry']]){assert.deepEqual(mcqTopicChoices(name,[],cl),[]);assert.deepEqual(mcqTopicChoices(name,['Uploaded topic'],cl),['Uploaded topic']);}});

test('contributor choices match both selected class and subject, including subject allocations',()=>{
 const f=emptyFaculty(),m=emptyMission(),teacher=(name,subjects)=>({name,subjects,status:'active',designation:'TGT'});
 f.classes.X.teachers={english:teacher('English Teacher','English'),science:teacher('Science Teacher','Science'),maths:teacher('Maths Teacher','Mathematics')};f.classes.XII.teachers={english:teacher('Senior English','English Core')};
 assert.deepEqual(mcqContributors(f,m,'X','english','English').map(t=>t.id),['X:english']);assert.deepEqual(mcqContributors(f,m,'X','maths_standard','Mathematics (Standard)').map(t=>t.id),['X:maths']);assert.deepEqual(mcqContributors(f,m,'XII','english','English Core').map(t=>t.id),['XII:english']);
 m.allocations={cross:{classId:'XII',staffId:'X:science',subjectId:'chemistry'}};assert.deepEqual(mcqContributors(f,m,'XII','chemistry','Chemistry').map(t=>t.id),['X:science']);assert.deepEqual(mcqContributors(f,m,'X','history','History'),[]);
});
