import test from 'node:test';
import assert from 'node:assert/strict';
import {rollCallCommitments} from '../cbse-roll-call-commitments.js';

test('counts one latest report per linked identity and day, split by period and question',()=>{
 const staff={a:{name:'Mr. Anil Kumar',designation:'PRT'},alias:{name:'Anil Kumar',designation:'PRT'}};
 const questions=[{id:'biometric',label:'Biometric attendance completed?'},{id:'reason',label:'Reflection',type:'text'}];
 const report=(staffId,date,period,value,updatedAt)=>({staffId,date,period,updatedAt,questionSnapshot:questions,answers:{biometric:value,reason:'yes'}});
 const reports={
  original:report('a','2026-11-17','morning','yes',1),
  corrected:report('alias','2026-11-17','morning','no',2),
  today:report('a','2026-11-18','morning','yes',3),
  afternoon:report('a','2026-11-18','afternoon','yes',4),
 };
 const morning=rollCallCommitments(reports,staff,{period:'morning'});
 assert.equal(morning.people.length,1);assert.equal(morning.people[0].days,2);
 assert.equal(morning.people[0].yes.get('biometric'),1);assert.equal(morning.people[0].designation,'PRT');
 assert.deepEqual(morning.questions.map(q=>q.id),['biometric']);
 assert.equal(rollCallCommitments(reports,staff,{period:'morning',to:'2026-11-17'}).people[0].yes.size,0);
 assert.equal(rollCallCommitments(reports,staff,{period:'afternoon'}).people[0].yes.get('biometric'),1);
});
