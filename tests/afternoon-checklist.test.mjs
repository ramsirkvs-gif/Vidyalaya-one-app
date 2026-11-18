import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedReporting,reportingQuestions,snapshotAnswers,validateReporting} from '../cbse-reporting-model.js';
import {snapshotQuestionComments} from '../cbse-roll-call-checklist.js';
import {applyRollCall,rollToday} from '../cbse-roll-call-model.js';
const words=n=>Array(n).fill('synthetic').join(' '),form=publishedReporting(null),questions=form.groups.afternoon;
const answers=()=>Object.fromEntries(questions.map(q=>[q.id,q.type==='text'?words(50):'yes']));
test('legacy publications receive the same ten afternoon questions for both return modes; morning untouched',()=>{
 const old={published:{title:'Saved title',version:8,enabled:true,groups:{morning:[],leave:[{id:'old_leave',type:'yesno',label:'Old leave',required:true}],afternoon:[]}}},before=structuredClone(old);
 const fixed=publishedReporting(old);assert.equal(fixed.version,8);assert.equal(fixed.title,'Saved title');
 for(const input of [{period:'afternoon'},{period:'afternoon',leaveType:'half',halfDay:'first',reported:'yes'}])assert.deepEqual(reportingQuestions(fixed,input),questions);
 assert.equal(questions.length,10);assert.ok(questions.slice(0,9).every(q=>q.type==='yesno'));assert.equal(questions[9].type,'text');assert.deepEqual(old,before);
 assert.deepEqual(validateReporting(fixed).groups.afternoon,questions);
});
test('No comments and final reflections are optional, with a 100-word cap',()=>{
 assert.throws(()=>snapshotAnswers(questions,{...answers(),afternoon_reflection:words(101)}),/at most 100 words/);
 for(const n of [0,1,100])assert.equal(snapshotAnswers(questions,{...answers(),afternoon_reflection:words(n)}).afternoon_reflection,words(n));
 const no={...answers(),afternoon_check_1:'no'};
 assert.throws(()=>snapshotQuestionComments(questions,no,{afternoon_check_1:words(101)}),/at most 100 words/);
 assert.deepEqual(snapshotQuestionComments(questions,no,{}),{});
 for(const n of [1,100])assert.equal(snapshotQuestionComments(questions,no,{afternoon_check_1:words(n)}).afternoon_check_1,words(n));
 assert.deepEqual(snapshotQuestionComments(questions,answers(),{}),{});
 assert.throws(()=>snapshotAnswers(questions,{...answers(),afternoon_check_1:'na'}),/Complete/);
});
test('server accepts both wings and first-half return, saves required answers, and retains NOC blocking',()=>{
 const now=Date.now(),day=rollToday(now);
 for(const wing of ['primary','secondary'])for(const first of [false,true]){
  const staff={one:{name:'Synthetic Teacher',wing,status:'active'}},current={reports:{[day+'_morning_one']:{staffId:'one',date:day,period:'morning',reported:first?'no':'yes',...(first?{leaveType:'half',halfDay:'first'}:{})}},objections:{}};
  const input={rollOperation:'report',workflowVersion:4,formVersion:1,undertaking:true,wing,date:day,period:'afternoon',answers:answers()};
  const result=applyRollCall(current,input,{id:'one',name:'Synthetic Teacher'},staff,now);
  assert.equal(result.reports[day+'_afternoon_one'].questionSnapshot.length,10);
  assert.equal(result.reports[day+'_afternoon_one'].status,'recorded');
  assert.equal(result.reports[day+'_afternoon_one'].halfDay,first?'first':undefined);
  assert.throws(()=>applyRollCall({}, {...input,leaveType:'half',halfDay:'first',reported:'yes'},{id:'one'},staff,now),/morning/);
  const exempt={reports:{[day+'_morning_one']:{...current.reports[day+'_morning_one'],workflowVersion:4,leaveType:'half',halfDay:'second',status:'blocked',reported:'yes'}}};
  assert.throws(()=>applyRollCall(exempt,input,{id:'one'},staff,now),/exempts/);
  assert.doesNotThrow(()=>applyRollCall(current,{...input,answers:{...answers(),afternoon_check_1:'no',afternoon_reflection:''}},{id:'one'},staff,now));
  current.objections.hold={staffId:'one',status:'open',kind:'principal-hold'};
  const withNo={...input,answers:{...input.answers,afternoon_check_1:'no'},answerComments:{afternoon_check_1:words(50)}};
  const held=applyRollCall(current,withNo,{id:'one'},staff,now),reportId=day+'_afternoon_one',report=held.reports[reportId];
  assert.equal(report.status,'blocked');assert.equal(report.answerComments.afternoon_check_1,words(50));
  const corrected=applyRollCall(held,{rollOperation:'report-edit',reportId,expectedSubmittedAt:now,expectedUpdatedAt:now,answers:report.answers,answerComments:report.answerComments},{id:'principal'},staff,now+1);
  assert.equal(corrected.reports[reportId].status,'blocked');
  current.objections.block={staffId:'one',status:'open',kind:'task'};
  current.objections.block.createdBy='ic';
  let both=applyRollCall(current,input,{id:'one'},staff,now);
  assert.equal(both.reports[reportId].status,'blocked');
  assert.throws(()=>applyRollCall(both,{rollOperation:'clear',objectionId:'block'},{id:'other'},staff,now),/Only/);
  both=applyRollCall(both,{rollOperation:'clear',objectionId:'block'},{id:'ic'},staff,now+1);
  assert.equal(both.reports[reportId].status,'blocked');
  assert.throws(()=>applyRollCall(both,{rollOperation:'clear',objectionId:'hold'},{id:'ic'},staff,now),/Only/);
  const released=applyRollCall(both,{rollOperation:'clear',objectionId:'hold'},{id:'principal'},staff,now+2);
  assert.equal(released.reports[reportId].status,'recorded');
 }
});
test('published forms use the common checklist without overwriting stored data',()=>{
 const saved={published:{...form,groups:{...form.groups,afternoon:[{...questions[2],commentMaxWords:30,label:'Have you confirmed that no pending work from yesterday remains due today?'},{...questions[3],label:'Custom Principal wording'}]}}},before=structuredClone(saved);
 const current=publishedReporting(saved);
 assert.deepEqual(current.groups.afternoon,questions);assert.deepEqual(validateReporting(saved.published).groups.afternoon,questions);assert.deepEqual(saved,before);
});

test('the staff register lists hold owners without private remarks and verifies the releasing IC',async()=>{
 const {taskFixture}=await import('./task-manager-fixture.mjs');
 const f=taskFixture();
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const session={viewerToken};
 const call=(action,input,token='')=>f.service(action,input,token,'synthetic-noc-ip',session);
 await call('set-pin',{staffId:'X:one',pin:'123'},'principal');
 await call('set-pin',{staffId:'X:two',pin:'456'},'principal');
 const ic={operation:'roll-call',staffId:'X:one',pin:'123'};
 await call('pin-submit',{...ic,rollOperation:'object',wing:'secondary',targets:['X:two'],remark:'Private pending task'});
 const board=await call('roll-call-read',{});
 const hold=board.rollCall.noc.find(row=>row.staffId==='X:two');
 assert.equal(hold.createdBy,'X:one');
 assert.equal(hold.status,'open');
 assert.equal(hold.remark,undefined);
 const release={rollOperation:'clear',objectionId:hold.id};
 await assert.rejects(call('pin-submit',{...ic,...release,staffId:'X:two',pin:'456'}),/Only the reporting IC/);
 await call('pin-submit',{...ic,...release});
 assert.equal((await call('roll-call-read',{})).rollCall.noc.find(row=>row.id===hold.id).status,'cleared');
});

test('group release clears the same issuer, day and task atomically, keeping other NOCs open',()=>{
 const now=Date.parse('2026-11-18T08:00:00+05:30'),date=rollToday(now);
 const staff=Object.fromEntries(['one','two','ic','other'].map(id=>[id,{name:id,wing:'secondary',status:'active'}]));
 const held=(staffId,extra={})=>({staffId,createdBy:'ic',createdAt:now,remark:'Check the exam bundle',status:'open',...extra});
 const reports=Object.fromEntries(['one','two'].map(staffId=>[staffId,{staffId,date,period:'afternoon',status:'blocked'}]));
 const store={reports,objections:{one:held('one'),two:held('two'),yesterday:held('two',{createdAt:now-86400000}),other:held('two',{createdBy:'other'}),unrelated:held('two',{remark:'Return the register'})}};
 const call={rollOperation:'clear-group',objectionId:'one',date};
 assert.throws(()=>applyRollCall(store,call,{id:'other'},staff,now),/Only/);
 assert.throws(()=>applyRollCall(store,{...call,objectionId:'yesterday'},{id:'ic'},staff,now),/today/);
 const single=applyRollCall(store,{...call,rollOperation:'clear'},{id:'ic'},staff,now);
 assert.equal(single.objections.two.status,'open');
 const grouped=applyRollCall(store,call,{id:'ic'},staff,now);
 for(const key of ['one','two'])assert.equal(grouped.objections[key].status,'cleared');
 for(const key of ['yesterday','other','unrelated'])assert.equal(grouped.objections[key].status,'open');
 assert.equal(grouped.reports.one.status,'recorded');assert.equal(grouped.reports.two.status,'blocked');
});

test('Principal and IC holds skip afternoon leave and OD but include first-half returns',()=>{
 const now=Date.parse('2026-11-18T08:00:00+05:30'),date=rollToday(now);
 const ids=['ic','od','long','second','first'];
 const staff=Object.fromEntries(ids.map(id=>[id,{name:id,wing:'secondary',status:'active'}]));
 const morning=(staffId,fields)=>({staffId,period:'morning',date,workflowVersion:5,...fields});
 const current={advanceLeaves:{od:{staffId:'od',dates:[date],status:'recorded'}},reports:{
  long:morning('long',{reported:'no',leaveType:'long',status:'approved',from:'2026-11-17',to:'2026-11-19'}),
  second:morning('second',{reported:'yes',leaveType:'half',halfDay:'second',status:'recorded'}),
  first:morning('first',{reported:'no',leaveType:'half',halfDay:'first',status:'recorded'}),
 }};
 const objection={rollOperation:'object',wing:'secondary',targets:ids.slice(1),remark:'Check the exam bundle'};
 const ic=applyRollCall(current,objection,{id:'ic'},staff,now,'ic');
 assert.deepEqual(Object.values(ic.objections).map(o=>o.staffId),['first']);
 assert.throws(()=>applyRollCall(current,{...objection,targets:['od']},{id:'ic'},staff,now,'ic'),/already exempt/);
 const all=applyRollCall(current,{...objection,rollOperation:'principal-hold',targetMode:'all'},{id:'principal'},staff,now,'all');
 assert.deepEqual(Object.values(all.objections).map(o=>o.staffId),['ic','first']);
});
