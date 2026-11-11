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

test('Ganga Devi is one subject teacher with combined credit across both names',async()=>{
 const {teacherIdentityIds}=await import('../cbse-view-data.js');
 const faculty={classes:{XII:{teachers:{ganga:{name:'LAISHRAM GANGA DEVI',status:'active',designation:'PGT-Chemistry'}}}}};
 const mission={staff:{duplicate:{name:'MS. L. GANGA DEVI',status:'active',kind:'other_support',designation:'PGT-Chemistry'}}};
 const before=JSON.stringify({faculty,mission});
 assert.deepEqual(teacherIdentityIds('support:duplicate',faculty,mission),['XII:ganga','support:duplicate']);
 assert.deepEqual(missionTeamCounts(faculty,mission),{total:1,X:0,XII:1,coopted:0});
 const result=creditSummary({faculty,mission,draft:{classes:{}},posts:{one:{authorId:'support:duplicate',text:'First contribution',createdAt:1},two:{authorId:'XII:ganga',text:'Second contribution',createdAt:2}}});
 assert.equal(result.members.length,1);assert.equal(result.members[0].name,'LAISHRAM GANGA DEVI');assert.equal(result.members[0].isCoopted,false);assert.equal(result.totalPoints,40);
 assert.equal(JSON.stringify({faculty,mission}),before);
});
