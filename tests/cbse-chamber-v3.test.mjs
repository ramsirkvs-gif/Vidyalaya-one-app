import test from 'node:test';import assert from 'node:assert/strict';
import {applyRollCall} from '../cbse-roll-call-model.js';
import {publishedReporting} from '../cbse-reporting-model.js';
import {rollRoleDirectory} from '../cbse-roll-call-roles.js';
import {rollRoster,rollDisplayName} from '../cbse-roll-call-roster.js';
import {rollStaffStatus} from '../cbse-roll-call-status.js';
import {publicAdvanceLeaves} from '../cbse-advance-leave-model.js';
const now=Date.parse('2026-11-12T04:00:00Z'),staff={a:{name:'Synthetic Teacher',designation:'TGT',wing:'secondary',status:'active'}},actor={id:'a',name:'Synthetic Teacher'},principal={id:'principal'},form=publishedReporting(null),yes=group=>Object.fromEntries(form.groups[group].map(q=>[q.id,'yes']));
const leave={rollOperation:'advance-leave-save',workflowVersion:3,wing:'secondary',formVersion:1,dates:['2026-11-13'],leaveKind:'Other',otherLeaveKind:'Approved special leave',undertaking:true,answers:yes('advanceLeave')};
const morning={rollOperation:'report',workflowVersion:3,formVersion:1,wing:'secondary',period:'morning',reported:'yes',undertaking:true,answers:yes('morning')};
test('leave corrections: types, default/published wording, NA for every checklist and per-answer comments',()=>{
 assert.ok(form.groups.advanceLeave.every(q=>q.type==='yesnona'));assert.match(form.groups.advanceLeave.find(q=>q.id==='advance_cover').label,/class teaching/);assert.match(form.groups.advanceLeave.find(q=>q.id==='advance_tasks').label,/high-priority/);
 const input={...leave,answers:{...leave.answers,advance_approval:'no',advance_exam:'na'},answerComments:{advance_approval:'Emergency approval has been requested.',advance_exam:'No examination work is assigned.'}};
 assert.throws(()=>applyRollCall({}, {...input,answerComments:{}},actor,staff,now,'x'),/comment/);
 assert.throws(()=>applyRollCall({}, {...input,answerComments:{...input.answerComments,advance_exam:Array(31).fill('word').join(' ')}},actor,staff,now,'x'),/30 words/);
 assert.throws(()=>applyRollCall({}, {...input,otherLeaveKind:''},actor,staff,now,'x'),/other leave type/);
 const next=applyRollCall({},input,actor,staff,now,'x'),r=next.advanceLeaves.x;assert.equal(r.status,'pending');assert.equal(r.leaveKind,'Other: Approved special leave');assert.deepEqual(r.answerComments,input.answerComments);assert.equal(publicAdvanceLeaves(next.advanceLeaves).x.answerComments,undefined);
});
test('daily No and NA comments are saved per question with no general reason',()=>{
 const input={...morning,answers:{...morning.answers,biometric:'no',register:'na'},answerComments:{biometric:'Device is unavailable; office has been informed.',register:'Register is being replaced today.'}};
 assert.throws(()=>applyRollCall({}, {...input,answerComments:{}},actor,staff,now),/comment/);
 const r=Object.values(applyRollCall({},input,actor,staff,now).reports)[0];assert.deepEqual(r.answerComments,input.answerComments);assert.equal(r.noReason,undefined);assert.equal(r.undertaking,true);
});
test('only Principal deletes a selected unchanged record; afternoon dependency and private archive are retained',()=>{
 let next=applyRollCall({},morning,actor,staff,now);const id=Object.keys(next.reports)[0],r=next.reports[id],del={rollOperation:'report-delete',reportId:id,expectedUpdatedAt:r.updatedAt,expectedSubmittedAt:r.submittedAt,confirmDelete:true};
 assert.throws(()=>applyRollCall(next,del,actor,staff,now),/Principal/);assert.throws(()=>applyRollCall(next,{...del,expectedUpdatedAt:0},principal,staff,now),/changed/);assert.throws(()=>applyRollCall(next,{...del,confirmDelete:false},principal,staff,now),/Confirm/);
 const aft={...morning,period:'afternoon',answers:yes('afternoon')};next=applyRollCall(next,aft,actor,staff,now+100);assert.throws(()=>applyRollCall(next,del,principal,staff,now+200),/afternoon/);
 const aid=Object.keys(next.reports).find(id=>next.reports[id].period==='afternoon'),ar=next.reports[aid];next=applyRollCall(next,{...del,reportId:aid,expectedUpdatedAt:ar.updatedAt,expectedSubmittedAt:ar.submittedAt},principal,staff,now+200);next=applyRollCall(next,del,principal,staff,now+300);assert.equal(Object.keys(next.reports).length,0);assert.equal(Object.keys(next.deletedRecords).length,2);
 let leaves=applyRollCall({},leave,actor,staff,now,'l');const dl={rollOperation:'advance-leave-delete',leaveId:'l',expectedRevision:1,confirmDelete:true};assert.throws(()=>applyRollCall(leaves,dl,actor,staff,now),/Principal/);leaves=applyRollCall(leaves,dl,principal,staff,now);assert.equal(leaves.advanceLeaves.l,undefined);assert.equal(Object.values(leaves.deletedRecords)[0].deletedBy,'principal');
});
test('only Roll Call display excludes the three employees; Avinash and Ganga aliases preserve identity',()=>{
 const people={...staff,ipi:{name:'MS. IPI RIBA',wing:'secondary'},jen:{name:'MR. JENLAN MONYAK',wing:'secondary'},miti:{name:'MR. MITI RATAN',wing:'secondary'},avi:{name:'AVINASH/Bibek',wing:'secondary'},ganga:{name:'LAISHRAM GANGA DEVI',wing:'secondary'}};
 const rows=rollRoster(people,'secondary');assert.ok(!rows.some(r=>/IPI RIBA|JENLAN MONYAK|MITI RATAN/.test(r.name)));assert.equal(rows.find(r=>r.ids.includes('avi')).name,'AVINASH');assert.equal(rollDisplayName('MR. AVINASH SINGH'),'AVINASH');assert.equal(rows.filter(r=>r.ids.includes('ganga')).length,1);assert.equal(people.avi.name,'AVINASH/Bibek');
});
test('CT picker uses exact section roles and propagates aliases, without guessing unassigned staff',()=>{
 const faculty={classes:{X:{teachers:{one:{...staff.a}},roles:{A:{classTeacher:'one',coClassTeacher:''}}},XII:{teachers:{},roles:{}}}},people={'X:one':staff.a,'support:alias':{...staff.a},'support:none':{...staff.a,name:'Other Teacher'}};
 const result=rollRoleDirectory(people,faculty,{X:{sections:{a:{name:'A'}}}});assert.equal(result['X:one'].classTeacher,true);assert.equal(result['support:alias'].classTeacher,true);assert.equal(result['support:none'].classTeacher,false);assert.ok(result['X:one'].classRoles.some(r=>r.sectionName==='A'&&r.role==='CT'));
});
test('OD outside uses the existing PIN submission, review and selected-date exemption workflow',()=>{
 const recorded=applyRollCall({}, {...leave,leaveKind:'OD outside'},actor,staff,now,'od_outside');assert.equal(recorded.advanceLeaves.od_outside.leaveKind,'OD outside');assert.equal(recorded.advanceLeaves.od_outside.status,'recorded');const attendance=rollStaffStatus({staff,rollCall:recorded,serverDate:'2026-11-13'},'secondary')[0];assert.equal(attendance.morningExcused,true);assert.equal(attendance.afternoonLeave,true);assert.equal(rollStaffStatus({staff,rollCall:recorded,serverDate:'2026-11-14'},'secondary')[0].morningExcused,false);assert.equal(publicAdvanceLeaves(recorded.advanceLeaves).od_outside.leaveKind,'OD outside');
 const pending=applyRollCall({}, {...leave,leaveKind:'OD outside',answers:{...leave.answers,advance_approval:'no'},answerComments:{advance_approval:'Awaiting approval for outside duty.'}},actor,staff,now,'od_pending');assert.equal(pending.advanceLeaves.od_pending.status,'pending');
});
