import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {TEAM_X_WEEKLY_TIMETABLE as data} from '../cbse-team-x-timetable-data.js';
import {teamXTimetableTeachers,isClassXLesson} from '../cbse-team-x-timetable-model.js';
test('only active Team X faculty appear; matching never assigns a timetable by a stale profile ID alone',()=>{
 const id='pdf_02222829e8b1896e_19',faculty={classes:{X:{teachers:{[id]:{name:'MR. BHARAT LAL MEENA',designation:'TGT-Hindi',status:'active'},inactive:{name:'MRS. SWETA KESTWAL',status:'inactive'},vacant:{name:'Vacant',status:'vacant'},new:{name:'New Team X Teacher',status:'active'}}},XII:{teachers:{one:{name:'MRS. JYOTI VERMA',status:'active'}}}}};
 const rows=teamXTimetableTeachers(faculty);assert.equal(rows.length,2);assert.equal(rows.find(r=>r.id==='X:'+id).timetable.sourcePages[0],26);assert.equal(rows.find(r=>r.id==='X:new').timetable,null);assert.ok(!rows.some(r=>r.name.includes('JYOTI')));
 faculty.classes.X.teachers[id].name='A Different Teacher';assert.equal(teamXTimetableTeachers(faculty).find(r=>r.id==='X:'+id).timetable,null);
});
test('known Avinash naming difference resolves exactly; Class X highlighting excludes XI/XII lessons',()=>{
 const rows=teamXTimetableTeachers({classes:{X:{teachers:{updated:{name:'MR. AVINASH SINGH',status:'active'}}}}});assert.equal(rows[0].timetable.staffId,'X:pdf_02222829e8b1896e_43');assert.equal(isClassXLesson('10A\n(Science)'),true);assert.equal(isClassXLesson('12A\n(Physics)'),false);assert.equal(isClassXLesson('11B\n(English)'),false);
});
test('source extraction has all 15 Team X timetables, six days and eight source periods with consistent weekly loads',()=>{
 assert.equal(data.teachers.length,15);assert.equal(new Set(data.teachers.map(t=>t.staffId)).size,15);assert.equal(data.periods.length,8);assert.equal(data.periods[0].time,'08:20–09:00');assert.equal(data.periods[4].time,'11:30–12:10');
 for(const teacher of data.teachers){assert.deepEqual(teacher.days.map(d=>d.day),['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);assert.ok(teacher.days.every(d=>d.periods.length===8));assert.equal(teacher.days.reduce((n,d)=>n+d.load,0),teacher.weeklyLoad);assert.ok(fs.existsSync(new URL('../'+teacher.pdf,import.meta.url)));}
 const jyoti=data.teachers.find(t=>t.staffId.endsWith('_32'));assert.deepEqual(jyoti.sourcePages,[42,43]);assert.match(jyoti.days[1].periods[6],/MCQs\/wrting/);assert.equal(data.teachers.some(t=>t.sourceName.includes('BIBEK')),false);
});
