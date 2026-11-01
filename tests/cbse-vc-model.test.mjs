import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft} from '../cbse-model.js';
import {emptyMission,validateMission,staffCanView,studentIndex,staffIndex} from '../cbse-mission-model.js';
import {emptyFaculty} from '../cbse-faculty-model.js';
import {importVCSetup,supportTeam,supportDuties,calendarVCPlan,importClassMeetings,parseVCSetupCSV} from '../cbse-vc-model.js';
import {teacherReviewRows} from '../cbse-teacher-review.js';
function fixture(){
 const draft=emptyDraft(),faculty=emptyFaculty(),mission=emptyMission();
 for(const[cl,g]of Object.entries(draft.classes))for(const[sid,s]of Object.entries(g.sections)){
  s.subjects={english:{name:'English',code:''},ai:{name:'Artificial Intelligence',code:''}};
  s.students={one:{name:`Synthetic ${cl} ${sid}`,roll:'1',subjects:{english:true,ai:true}},two:{name:`Synthetic non AI ${cl} ${sid}`,roll:'2',subjects:{english:true}}};
  for(const id of ['one','two'])mission.students[cl+':'+sid+':'+id]={gender:'unknown',guardian:'Keep guardian',phones:'',location:'',email:`${cl}${sid}${id}@example.org`};
 }
 faculty.classes.X.teachers.teacher={name:'MR. Synthetic Teacher',designation:'TGT',subjects:'English',teachingSections:'A',status:'active'};
 faculty.classes.X.roles.a={classTeacher:'teacher',coClassTeacher:''};
 mission.allocations.old={classId:'X',sectionId:'a',subjectId:'english',staffId:'X:teacher'};
 const pkg={format:'mission-vc-support-v1',members:[
  {name:'Synthetic PRT',kind:'prt',designation:'PRT',purpose:'MCQs & writing practice implementation',scopes:[{classId:'X',sections:['A'],subjectScope:'non_ai'}]},
  {name:'Synthetic Counsellor',kind:'counsellor',designation:'Counsellor',purpose:'Mental health counselling',scopes:[{classId:'X',sections:[...'ABCD'],subjectScope:'all'},{classId:'XII',sections:[...'ABCDE'],subjectScope:'all'}]},
  {name:'Synthetic Special Educator',kind:'special_educator',designation:'Special Educator',purpose:'Fine motor skills',scopes:[{classId:'X',sections:[...'ABCD'],subjectScope:'all'},{classId:'XII',sections:[...'ABCDE'],subjectScope:'all'}]},
  {name:'Synthetic AI Support',kind:'support',designation:'Computer Instructor',purpose:'AI support',scopes:[{classId:'X',sections:[...'ABCD'],subjectScope:'ai'},{classId:'XII',sections:[...'ABCDE'],subjectScope:'ai'}]}
 ],emails:[{name:'Synthetic Teacher',email:'teacher@example.org',sourceVerified:false},{name:'Synthetic Counsellor',email:'counsellor@example.org',sourceVerified:true},{name:'Synthetic Special Educator',email:'special@example.org',sourceVerified:false},{name:'Synthetic PRT',email:'prt@example.org',sourceVerified:true},{name:'Synthetic AI Support',email:'ai@example.org',sourceVerified:true},{name:'Unrelated employee',email:'unrelated@example.org',sourceVerified:true}]};
 return {draft,faculty,mission,pkg};
}
test('readable VC CSV preserves separate support scopes and source email verification',()=>{
 const header='RecordType,Name,Designation,Role,Purpose,Class,Sections,SubjectScope,Email,SourceVerified'.split(',');
 const rows=[['Support','Synthetic PRT','PRT','prt','Practice','X','A;B','non_ai','',''],['Support','Synthetic PRT','PRT','prt','Practice','XII','C','non_ai','',''],['Email','Synthetic PRT','PRT','','','','','','prt@example.org','Not Verified']];
 const pkg=parseVCSetupCSV(header,rows);assert.equal(pkg.members.length,1);assert.equal(pkg.members[0].scopes.length,2);assert.deepEqual(pkg.members[0].scopes[0].sections,['A','B']);assert.equal(pkg.emails[0].sourceVerified,false);
 assert.throws(()=>parseVCSetupCSV(header,[['Other']]),/wrong number/);assert.throws(()=>parseVCSetupCSV(header,[rows[0],['Support','Synthetic PRT','PRT','counsellor','Practice','X','A','all','','']]),/conflicting/);
});
test('reviewed support import adds only needed records, preserves teaching assignments and is idempotent',()=>{
 const f=fixture(),before=structuredClone(f);const r=importVCSetup(f.pkg,f.mission,f.draft,f.faculty);
 assert.equal(r.added,4);assert.equal(r.emails,5);assert.equal(r.ignored,1);assert.deepEqual(r.next.allocations,f.mission.allocations);assert.deepEqual(r.next.students,f.mission.students);assert.deepEqual(f,before);validateMission(r.next,f.draft,f.faculty);
 assert.equal(r.next.staffEmails['X:teacher'].sourceVerified,false);
 const again=importVCSetup(f.pkg,r.next,f.draft,f.faculty);assert.equal(again.added,0);assert.equal(again.assignments,0);assert.equal(again.emails,0);
 const prt=Object.keys(staffIndex(f.faculty,r.next)).find(id=>id.includes('syntheticprt'));
 assert.equal(supportDuties(r.next,prt).length,1);assert.equal(supportDuties(r.next,prt)[0].subjectId,'english');
 assert.equal(teacherReviewRows(prt,f.faculty,r.next,studentIndex(f.draft)).length,2);
});
test('counsellor and special educator cover every section, AI support never gains non-AI students',()=>{
 const f=fixture(),m=importVCSetup(f.pkg,f.mission,f.draft,f.faculty).next;
 const ids=Object.keys(staffIndex(f.faculty,m)),ai=ids.find(id=>id.includes('syntheticai')),counsellor=ids.find(id=>id.includes('syntheticcounsellor'));
 assert.equal(staffCanView(ai,'X:a:one',m,f.draft,f.faculty),true);assert.equal(staffCanView(ai,'X:a:two',m,f.draft,f.faculty),false);
 for(const cl of ['X','XII'])for(const sid of Object.keys(f.draft.classes[cl].sections)){
  assert.equal(staffCanView(counsellor,`${cl}:${sid}:two`,m,f.draft,f.faculty),true);
  const team=supportTeam(m,f.faculty,cl,sid,['english']);assert.ok(team.some(t=>t.supportRole==='counsellor'));assert.ok(team.some(t=>t.supportRole==='special_educator'));assert.ok(!team.some(t=>t.id===ai));
 }
});
test('existing named support is reused and enriched while unrelated support emails remain untouched',()=>{
 const f=fixture();f.mission.staff.old={name:'Synthetic PRT',kind:'support',subjects:'Existing expertise',status:'inactive'};
 f.mission.staff.other={name:'Unrelated employee',kind:'support',subjects:'Other duties',status:'active'};
 const r=importVCSetup(f.pkg,f.mission,f.draft,f.faculty);assert.equal(r.added,3);assert.equal(r.updated,1);assert.equal(r.next.staff.old.status,'active');assert.equal(r.next.staff.old.kind,'prt');assert.equal(r.next.staff.old.subjects,'Existing expertise');assert.equal(r.next.staffEmails['support:old'].email,'prt@example.org');assert.equal(r.next.staffEmails['support:other'],undefined);validateMission(r.next,f.draft,f.faculty);
});
test('calendar plan separates class guests from individual subject/support teachers and retains links',()=>{
 const f=fixture(),m=importVCSetup(f.pkg,f.mission,f.draft,f.faculty).next;m.students['X:a:one'].meetingLink='https://meet.google.com/abc-defg-hij';
 const plan=calendarVCPlan(f.draft,f.faculty,m);assert.equal(plan.classes.length,9);assert.equal(plan.students.length,1);assert.ok(plan.issues.length);
 const child=plan.students[0];assert.ok(child.emails.includes('teacher@example.org'));assert.ok(child.emails.includes('prt@example.org'));assert.ok(child.emails.includes('ai@example.org'));assert.equal(child.meetingLink,m.students['X:a:one'].meetingLink);
 const group=plan.classes.find(c=>c.classId==='X'&&c.section==='A');assert.ok(group.emails.includes('teacher@example.org'));assert.ok(group.emails.includes('counsellor@example.org'));assert.ok(group.emails.includes('special@example.org'));assert.ok(!group.emails.includes('prt@example.org'));assert.ok(!group.emails.includes('ai@example.org'));assert.equal(new Set(group.emails).size,group.emails.length);
});
test('class links import only into matching sections and cannot reuse individual links',()=>{
 const f=fixture(),rows=[{Class:'X',Section:'A',MeetingLink:'https://meet.google.com/abc-defg-hij'}];const r=importClassMeetings(rows,f.mission,f.draft);assert.equal(r.matched,1);assert.deepEqual(r.next.students,f.mission.students);assert.equal(importClassMeetings(rows,r.next,f.draft).changed,0);validateMission(r.next,f.draft,f.faculty);
 assert.throws(()=>importClassMeetings([...rows,{...rows[0],Section:'B'}],f.mission,f.draft),/distinct/);assert.throws(()=>importClassMeetings([{...rows[0],Section:'Z'}],f.mission,f.draft),/Unknown/);
 f.mission.students['X:a:one'].meetingLink=rows[0].MeetingLink;assert.throws(()=>importClassMeetings(rows,f.mission,f.draft),/distinct/);
});
