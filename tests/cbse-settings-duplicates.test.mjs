import test from 'node:test';
import assert from 'node:assert/strict';
import {planFacultySave} from '../cbse-faculty-editor-model.js';
import {emptyDraft} from '../cbse-model.js';
import {emptyFaculty} from '../cbse-faculty-model.js';
import {emptyMission} from '../cbse-mission-model.js';
import {rollSettingsRoster} from '../cbse-roll-call-roster.js';
function fixture(){const current={draft:emptyDraft(),facultyDraft:emptyFaculty(),mission:emptyMission()};current.facultyDraft.classes.X.teachers.one={name:'MR. PARTHA P. BORAH',designation:'PGT-Computer Science',subjects:'',teachingSections:'',status:'active'};return current;}
const input={name:'PARTHA PROTIM BORAH',designation:'PGT-Computer Science',status:'active',classes:['XII'],assignments:[],roles:[],expectedFacultyRevision:0,expectedMissionRevision:0};
test('new faculty cannot duplicate a Mission teacher under another class or known name alias',()=>{const current=fixture(),before=structuredClone(current);assert.throws(()=>planFacultySave(current,input,'duplicate',1),/already exists in Mission 100/);assert.deepEqual(current,before);});
test('existing Mission faculty cannot be re-added as support, but Edit can add their second standard',()=>{const current=fixture();assert.throws(()=>planFacultySave(current,{...input,memberType:'support',kind:'other_support',wing:'secondary'},'duplicate',1),/already exists in Mission 100/);const result=planFacultySave(current,{...input,staffId:'X:one',name:'MR. PARTHA P. BORAH',classes:['X','XII']},'linked',1);assert.equal(result.newStaffIds.length,1);assert.ok(result.staffIds.includes('X:one'));});
test('Settings presents one row for linked existing staff profiles without mutating them',()=>{const staff={a:{name:'Same Primary Teacher',designation:'PRT',wing:'primary'},b:{name:'Same Primary Teacher',designation:'PRT',wing:'primary'}};const rows=rollSettingsRoster(staff).filter(p=>p.id);assert.equal(rows.length,1);assert.deepEqual(rows[0].ids,['a','b']);assert.equal(Object.keys(staff).length,2);});
