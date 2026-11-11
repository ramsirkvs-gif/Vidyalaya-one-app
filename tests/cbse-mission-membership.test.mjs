import test from 'node:test';
import assert from 'node:assert/strict';
import {missionMemberAllowed} from '../cbse-mission-membership.js';
import {vcStaff} from '../cbse-vc-model.js';
import {missionTeamCounts} from '../cbse-mission-summary.js';
import {creditSummary} from '../cbse-contribution-credit-model.js';
test('excluded staff and aliases disappear from Mission ranks, credits and counts but remain in school roster',()=>{
 const names=['IPI RIBA','AJAY KUMAR CHAUBEY','JITENDRA PAUL','SANTOSH KUMAR YADAV','VANSHITA SHARMA','JENLAN MONYAK','M.T. MUNYA','RANJAN CHETRY','RAJEN KUMAR','SURAJ DAHAL','MITI RATAN','SAMIRAN BORAGOHAIN','TADO KARNIK','TAGE YASUNG','ZEEME GIASING'];
 const mission={staff:Object.fromEntries([...names,'MICHI LODER','PREETI','BAMANG MEHA'].map((name,i)=>['s'+i,{name:'MR. '+name,status:'active',kind:'other_support'}]))};
 names.forEach(name=>assert.equal(missionMemberAllowed({name:'Ms. '+name}),false));
 assert.equal(missionMemberAllowed({name:'MR. MICHI LODER'}),true);
 assert.equal(Object.values(vcStaff({},mission)).filter(p=>p.status==='active').length,3);
 assert.equal(Object.values(vcStaff({},mission,{includeRollOnly:true})).filter(p=>p.status==='active').length,18);
 assert.equal(missionTeamCounts({},mission).total,3);
 const posts={excluded:{authorId:'support:s0',text:'saved history',createdAt:1},kept:{authorId:'support:s15',text:'kept work',createdAt:2}};
 const result=creditSummary({faculty:{},draft:{classes:{}},mission,posts});
 assert.equal(result.members.length,3);assert.equal(result.totalPoints,20);assert.equal(result.ledger.length,1);
 assert.equal(mission.staff.s0.status,'active');
});
