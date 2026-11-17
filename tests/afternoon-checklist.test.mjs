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
test('No comments enforce 20–30 words, final response enforces 50–100 words, and Yes needs no comment',()=>{
 for(const n of [49,101])assert.throws(()=>snapshotAnswers(questions,{...answers(),afternoon_reflection:words(n)}),/50–100/);
 for(const n of [50,100])assert.equal(snapshotAnswers(questions,{...answers(),afternoon_reflection:words(n)}).afternoon_reflection,words(n));
 const no={...answers(),afternoon_check_1:'no'};
 for(const n of [0,19,31])assert.throws(()=>snapshotQuestionComments(questions,no,{afternoon_check_1:words(n)}),/20–30/);
 for(const n of [20,30])assert.equal(snapshotQuestionComments(questions,no,{afternoon_check_1:words(n)}).afternoon_check_1,words(n));
 assert.deepEqual(snapshotQuestionComments(questions,answers(),{}),{});
 assert.throws(()=>snapshotAnswers(questions,{...answers(),afternoon_check_1:'na'}),/Complete/);
});
test('server accepts both wings and first-half return, saves required answers, and retains NOC blocking',()=>{
 const now=Date.now(),day=rollToday(now);
 for(const wing of ['primary','secondary'])for(const first of [false,true]){
  const staff={one:{name:'Synthetic Teacher',wing,status:'active'}},current={reports:{[day+'_morning_one']:{staffId:'one',date:day,period:'morning',reported:first?'no':'yes'}},objections:{}};
  const input={rollOperation:'report',workflowVersion:4,formVersion:1,undertaking:true,wing,date:day,period:'afternoon',answers:answers(),...(first?{leaveType:'half',halfDay:'first',reported:'yes'}:{})};
  const result=applyRollCall(current,input,{id:'one',name:'Synthetic Teacher'},staff,now);
  assert.equal(result.reports[day+'_afternoon_one'].questionSnapshot.length,10);
  assert.equal(result.reports[day+'_afternoon_one'].status,'recorded');
  assert.throws(()=>applyRollCall(current,{...input,answers:{...answers(),afternoon_reflection:''}},{id:'one'},staff,now),/50–100/);
  current.objections.block={staffId:'one',status:'open',kind:'task'};
  assert.throws(()=>applyRollCall(current,input,{id:'one'},staff,now),/NOC/);
 }
});
