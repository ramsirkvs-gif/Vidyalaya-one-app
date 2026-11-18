import test from 'node:test';
import assert from 'node:assert/strict';
import {objectionRoster,objectionTargets} from '../cbse-roll-objection-targets.js';

const teacher=(name,designation,extra={})=>({name,designation,wing:'secondary',...extra});
const staff={
 z:teacher('Mrs. E.T. Zirdo','PGT-English'),
 m:teacher('Ms. M.T. Munya','TGT-English'),
 d:teacher('Mr. Suraj Dahal','TGT-Sanskrit'),
 p:teacher('Mr. Paramveer Meena','PGT-English'),
 live:teacher('Synthetic Current Teacher','TGT-English',{classRoles:[{classId:6,sectionName:'a',role:'CT'}]}),
 other:{name:'Synthetic Primary',wing:'primary',designation:'PRT'}
};

test('objection targeting joins active staff, excludes the IC and prefers current roles over workbook fallbacks',()=>{
 const roster=objectionRoster(staff,'secondary','p');
 const select=options=>objectionTargets(roster,options).sort();
 assert.deepEqual(select({mode:'all'}),['d','live','m','z']);
 assert.deepEqual(select({mode:'sections',sections:['VI A']}),['d','live']);
 assert.deepEqual(select({mode:'sections',sections:['XII C']}),['z']);
 assert.ok(select({mode:'lower'}).includes('live'));
 assert.deepEqual(select({mode:'upper'}),['z']);
 assert.deepEqual(select({mode:'subject',grade:'XII',subject:'English'}),['z']);
 assert.deepEqual(select({mode:'manual'}),[]);
 assert.ok(select({mode:'ct'}).includes('d'));
});

test('Principal changes a section CT and subject teachers for both recipient pickers',async()=>{
 const {applyRollCall}=await import('../cbse-roll-call-model.js');
 const active=Object.fromEntries(Object.entries(staff).map(([id,p])=>[id,{...p,status:'active'}]));
 const input={rollOperation:'objection-assignments-save',section:'XII C',expectedRevision:0,ct:'m',coCT:'',subjects:[{staffId:'d',subject:'Hindi'}]};
 const now=Date.now();
 assert.throws(()=>applyRollCall({},input,{id:'m'},active,now),/Only the Principal/);
 assert.throws(()=>applyRollCall({}, {...input,ct:'other'},{id:'principal'},active,now),/Secondary Wing/);
 const saved=applyRollCall({},input,{id:'principal'},active,now);
 assert.throws(()=>applyRollCall(saved,input,{id:'principal'},active,now),/changed/);
 const roster=objectionRoster(active,'secondary',undefined,saved.objectionAssignments);
 assert.deepEqual(objectionTargets(roster,{mode:'sections',sections:['XII C']}),['m']);
 assert.deepEqual(objectionTargets(roster,{mode:'subject',grade:'XII',subject:'Hindi'}),['d']);
 assert.ok(objectionTargets(roster,{mode:'subject',grade:'XII',subject:'__all__'}).includes('d'));
 assert.ok(roster.find(p=>p.id==='z').subjects.every(([grade,section])=>grade!=='XII'||section!=='C'));
});
