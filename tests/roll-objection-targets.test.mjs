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
