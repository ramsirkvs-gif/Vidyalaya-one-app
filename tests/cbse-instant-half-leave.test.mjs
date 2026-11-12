import test from 'node:test';import assert from 'node:assert/strict';
import {applyRollCall} from '../cbse-roll-call-model.js';
import {publishedReporting} from '../cbse-reporting-model.js';
import {rollStaffStatus} from '../cbse-roll-call-status.js';
const now=Date.parse('2026-11-12T04:00:00Z'),staff={a:{name:'Synthetic Teacher',designation:'TGT',status:'active',wing:'secondary'},ic:{name:'Examination IC',designation:'TGT',status:'active',wing:'secondary'}},teacher={id:'a',name:'Synthetic Teacher'},principal={id:'principal'},form=publishedReporting(null),yes=g=>Object.fromEntries(form.groups[g].map(q=>[q.id,'yes'])),base={rollOperation:'report',workflowVersion:4,formVersion:form.version,wing:'secondary',date:'2026-11-12',undertaking:true};
const person=state=>rollStaffStatus({staff,rollCall:state,serverDate:'2026-11-12'},'secondary').find(p=>p.id==='a');
test('instant first-half leave records morning absence, exempts only morning and requires actual afternoon return',()=>{
 const input={...base,period:'morning',reported:'no',leaveType:'half',halfDay:'first',answers:yes('leave')};
 let s=applyRollCall({},input,teacher,staff,now);assert.equal(person(s).morning.reported,'no');assert.equal(person(s).morningExcused,true);assert.equal(person(s).afternoonLeave,false);assert.equal(person(s).afternoon,undefined);
 assert.throws(()=>applyRollCall({}, {...input,reported:'yes'},teacher,staff,now),/morning absence/);
 s=applyRollCall(s,{...base,period:'afternoon',reported:'yes',leaveType:'half',halfDay:'first',answers:yes('leave')},teacher,staff,now+100);assert.equal(person(s).afternoon.reported,'yes');assert.equal(person(s).afternoon.status,'pending');
});
test('instant second-half leave records morning presence, exempts only afternoon and retains Principal/NOC approval',()=>{
 const input={...base,period:'morning',reported:'yes',leaveType:'half',halfDay:'second',answers:yes('morning')};let s=applyRollCall({},input,teacher,staff,now),id=Object.keys(s.reports)[0];assert.equal(person(s).morningExcused,false);assert.equal(person(s).afternoonLeave,true);assert.equal(person(s).morning.status,'pending');
 assert.throws(()=>applyRollCall({}, {...input,reported:'no'},teacher,staff,now),/morning attendance/);
 s=applyRollCall(s,{rollOperation:'approve',reportId:id},principal,staff,now+1);assert.equal(s.reports[id].status,'approved');
 s=applyRollCall(s,{rollOperation:'object',wing:'secondary',targets:['a'],remark:'Return the examination bundle.'},{id:'ic',name:'Exam IC'},staff,now+2,'objection');assert.equal(s.reports[id].status,'blocked');assert.throws(()=>applyRollCall(s,{rollOperation:'approve',reportId:id},principal,staff,now+3),/pending roll call|Clear pending/);
 s=applyRollCall(s,{rollOperation:'clear',objectionId:'objection_a'},{id:'ic'},staff,now+4);assert.equal(s.reports[id].status,'pending');s=applyRollCall(s,{rollOperation:'reject',reportId:id},principal,staff,now+5);assert.equal(person(s).afternoonLeave,false);
});
