import test from 'node:test';import assert from 'node:assert/strict';
import {applyRollCall,rollToday} from '../cbse-roll-call-model.js';
import {activeAdvanceLeave} from '../cbse-roll-call-leave.js';
import {defaultReporting,applyReporting,publishedReporting} from '../cbse-reporting-model.js';
import {rollStaffStatus} from '../cbse-roll-call-status.js';
const now=Date.parse('2026-11-08T05:00:00Z'),staff={'X:one':{name:'Synthetic Teacher',designation:'TGT',status:'active',wing:'secondary'},'XII:one':{name:'Synthetic Teacher',designation:'TGT',status:'active',wing:'secondary'},'X:two':{name:'Other Teacher',designation:'TGT',status:'active',wing:'secondary'}},actor={id:'X:one',name:'Synthetic Teacher'},admin={id:'principal',name:'Principal'},answers=Object.fromEntries(defaultReporting().groups.advanceLeave.map(q=>[q.id,'yes'])),input={rollOperation:'advance-leave-save',wing:'secondary',formVersion:1,dates:['2026-11-09','2026-11-11'],answers};
test('non-consecutive recorded dates exempt only those days, across linked teacher identities, through final day',()=>{
 const s=applyRollCall({},input,actor,staff,now,'leave1');assert.equal(s.advanceLeaves.leave1.status,'recorded');assert.ok(activeAdvanceLeave(s.advanceLeaves,['X:one','XII:one'],'2026-11-09'));assert.equal(activeAdvanceLeave(s.advanceLeaves,['X:one'],'2026-11-10'),null);assert.ok(activeAdvanceLeave(s.advanceLeaves,['X:one'],'2026-11-11'));assert.equal(activeAdvanceLeave(s.advanceLeaves,['X:one'],'2026-11-12'),null);
 const dayNow=Date.parse('2026-11-09T04:00:00Z');assert.throws(()=>applyRollCall(s,{rollOperation:'report'},actor,staff,dayNow),/Advance leave reporting done/);
 const person=rollStaffStatus({rollCall:s,staff,serverDate:'2026-11-09'},'secondary').find(p=>p.id==='X:one');assert.equal(person.morningExcused,true);assert.equal(person.afternoonLeave,true);assert.equal(rollStaffStatus({rollCall:s,staff,serverDate:'2026-11-10'},'secondary').find(p=>p.id==='X:one').advanceLeave,null);
});
test('No answers require explanation and Principal review before exemption; teacher cannot approve own leave',()=>{
 const no={...input,answers:{...answers,advance_approval:'no'}};assert.throws(()=>applyRollCall({},no,actor,staff,now,'l'),/Explain/);let s=applyRollCall({},{...no,reason:'Approval is requested for a family emergency.'},actor,staff,now,'l');assert.equal(s.advanceLeaves.l.status,'pending');assert.equal(activeAdvanceLeave(s.advanceLeaves,['X:one'],'2026-11-09'),null);assert.throws(()=>applyRollCall(s,{rollOperation:'advance-leave-approve',leaveId:'l',expectedRevision:1},actor,staff,now),/Principal/);s=applyRollCall(s,{rollOperation:'advance-leave-approve',leaveId:'l',expectedRevision:1},admin,staff,now);assert.ok(activeAdvanceLeave(s.advanceLeaves,['X:one'],'2026-11-09'));
});
test('cancel selected future dates restores normal RC only on cancelled dates; protects other teachers and revisions',()=>{
 let s=applyRollCall({},input,actor,staff,now,'l');const cancel={rollOperation:'advance-leave-cancel',leaveId:'l',expectedRevision:1,dates:['2026-11-09']};assert.throws(()=>applyRollCall(s,cancel,{id:'X:two'},staff,now),/Only this teacher/);s=applyRollCall(s,cancel,actor,staff,now);assert.equal(activeAdvanceLeave(s.advanceLeaves,['X:one'],'2026-11-09'),null);assert.ok(activeAdvanceLeave(s.advanceLeaves,['X:one'],'2026-11-11'));assert.throws(()=>applyRollCall(s,cancel,admin,staff,now),/changed/);
});
test('past/duplicate/invalid/overlapping dates and stale questionnaire versions are rejected',()=>{
 for(const dates of [['2026-11-07'],['2026-11-09','2026-11-09'],['2027-02-30'],[]])assert.throws(()=>applyRollCall({},{...input,dates},actor,staff,now,'l'),/Choose distinct/);
 const s=applyRollCall({},input,actor,staff,now,'l');assert.throws(()=>applyRollCall(s,input,{id:'XII:one',name:actor.name},staff,now,'other'),/already reported/);
 const draft=defaultReporting();draft.groups.advanceLeave.push({id:'handover',label:'Handover completed?',type:'yesno',required:true});const store=applyReporting(null,{operation:'reporting-publish',expectedRevision:0,draft},now);assert.throws(()=>applyRollCall({},input,actor,staff,now,'l',store),/questionnaire changed/);assert.throws(()=>applyRollCall({},{...input,formVersion:2},actor,staff,now,'l',store),/Handover/);
 const legacy={published:{...defaultReporting(),version:4}};delete legacy.published.groups.advanceLeave;assert.equal(publishedReporting(legacy).groups.advanceLeave.length,4);assert.equal(rollToday(now),'2026-11-08');
});


test('new leave workflow records type and undertaking, rejects missing confirmation and remarks above 50 words',()=>{
 const report={...input,workflowVersion:2,leaveKind:'Casual leave (CL)',undertaking:true};
 assert.throws(()=>applyRollCall({}, {...report,undertaking:false},actor,staff,now,'new'),/undertaking/);
 assert.throws(()=>applyRollCall({}, {...report,leaveKind:'arbitrary'},actor,staff,now,'new'),/leave type/);
 assert.throws(()=>applyRollCall({}, {...report,reason:Array(51).fill('word').join(' ')},actor,staff,now,'new'),/50 words/);
 const next=applyRollCall({},report,actor,staff,now,'new');assert.equal(next.advanceLeaves.new.leaveKind,'Casual leave (CL)');assert.equal(next.advanceLeaves.new.undertaking,true);
});
