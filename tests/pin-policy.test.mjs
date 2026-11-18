import test from 'node:test';
import assert from 'node:assert/strict';
import {taskFixture} from './task-manager-fixture.mjs';
import {hashPIN} from '../_server/staff-service.js';
import {encryptDisplayPIN} from '../_server/pin-vault.js';
async function setup(){const f=taskFixture();await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');await f.service('set-pin',{staffId:'X:two',pin:'456'},'principal');return f;}
test('manual staff PIN changes, imports and faculty creation reject another employee’s PIN without changing records',async()=>{const f=await setup(),before=structuredClone(f.data.cbse);await assert.rejects(f.service('set-pin',{staffId:'X:two',pin:'123'},'principal'),/already assigned/);await assert.rejects(f.service('import-pins',{rows:[{staffId:'X:two',name:'Synthetic Teacher two',pin:'123',enabled:true}]},'principal'),/already assigned/);await assert.rejects(f.service('import-pins',{rows:[{staffId:'X:one',name:'Synthetic Teacher one',pin:'789',enabled:true},{staffId:'X:two',name:'Synthetic Teacher two',pin:'789',enabled:true}]},'principal'),/two different employees/);await assert.rejects(f.service('add-faculty-pin',{classId:'X',name:'Another Synthetic Person',designation:'TGT',subjects:'English',teachingSections:'A',pin:'123'},'principal'),/already assigned/);assert.deepEqual(f.data.cbse,before);await f.service('set-pin',{staffId:'X:two',pin:'789'},'principal');});
test('staff and office PIN writes share one collision policy, and different office members cannot reuse a PIN',async()=>{const f=await setup();await assert.rejects(f.service('office-pin-settings',{operation:'set-pin',memberId:'pramod-paswan',pin:'123'},'principal'),/already assigned/);await f.service('office-pin-settings',{operation:'set-pin',memberId:'pramod-paswan',pin:'789'},'principal');await assert.rejects(f.service('set-pin',{staffId:'X:two',pin:'789'},'principal'),/already assigned/);await assert.rejects(f.service('office-pin-settings',{operation:'set-pin',memberId:'sumit-puri',pin:'789'},'principal'),/already assigned/);});
test('a valid PIN for another employee is rejected against the selected name for login and submissions',async()=>{const f=await setup(),before=structuredClone(f.data.cbse.staffAccess);await assert.rejects(f.service('login',{staffId:'X:one',pin:'456'}),/correct PIN/);for(const operation of ['task-manager','movement','comment'])await assert.rejects(f.service('pin-submit',{staffId:'X:one',pin:'456',operation}),/does not match/);assert.deepEqual(f.data.cbse.staffAccess,before);});
test('legacy collisions are flagged only in Principal settings and block ambiguous PIN use until corrected',async()=>{const f=await setup();f.data.cbse.staffAccess['X:two']={...await hashPIN('123'),...encryptDisplayPIN('123','X:two',Buffer.alloc(32,7)),enabled:true,version:'legacy-duplicate'};const audit=await f.service('list',{},'principal');assert.equal(audit.pinAudit.duplicates.length,1);assert.equal(audit.pinAudit.duplicates[0].accounts.length,2);await assert.rejects(f.service('list',{},'outsider'),/Principal/);await assert.rejects(f.service('pin-submit',{staffId:'X:one',pin:'123',operation:'task-manager'}),/conflicts with another/);await f.service('set-pin',{staffId:'X:two',pin:'789'},'principal');assert.equal((await f.service('list',{},'principal')).pinAudit.duplicates.length,0);});
test('linked profiles of the same employee retain one shared PIN without a false collision',async()=>{const f=await setup();f.data.cbse.facultyDraft.classes.XII.teachers.alias={...f.data.cbse.facultyDraft.classes.X.teachers.one};await f.service('set-pin',{staffId:'XII:alias',pin:'123'},'principal');const listed=await f.service('list',{},'principal');assert.equal(listed.access['X:one'].pin,'123');assert.equal(listed.access['XII:alias'].pin,'123');assert.equal(listed.pinAudit.duplicates.length,0);});
test('concurrent manual assignments cannot reserve the same PIN for different employees',async()=>{const f=await setup(),results=await Promise.allSettled([f.service('set-pin',{staffId:'X:one',pin:'789'},'principal'),f.service('set-pin',{staffId:'X:two',pin:'789'},'principal')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);const listed=await f.service('list',{},'principal');assert.equal(['X:one','X:two'].filter(id=>listed.access[id].pin==='789').length,1);assert.equal(listed.pinAudit.duplicates.length,0);});
test('PIN collision checks include older records without display values and leave their PINs untouched',async()=>{const f=await setup();f.data.cbse.officeAccess={legacy:{...await hashPIN('789'),enabled:false,version:'legacy'}};const original=structuredClone(f.data.cbse.officeAccess);await assert.rejects(f.service('set-pin',{staffId:'X:two',pin:'789'},'principal'),/already assigned/);assert.deepEqual(f.data.cbse.officeAccess,original);});
test('an out-of-date display value cannot hide the actual PIN hash from uniqueness checks',async()=>{const f=await setup();f.data.cbse.officeAccess={legacy:{...await hashPIN('789'),...encryptDisplayPIN('999','office:legacy',Buffer.alloc(32,7)),enabled:true}};await assert.rejects(f.service('set-pin',{staffId:'X:two',pin:'789'},'principal'),/already assigned/);f.data.cbse.staffAccess['X:two']={...await hashPIN('789'),...encryptDisplayPIN('999','X:two',Buffer.alloc(32,7)),enabled:true};const list=await f.service('list',{},'principal');assert.equal(list.access['X:two'].pin,'');assert.ok(list.pinAudit.unavailable.includes('staff:X:two'));});

test('Principal generates unique Office PINs for missing members without replacing existing PINs',async()=>{
 const f=await setup(),call=(memberId,token='principal')=>f.service('office-pin-settings',{operation:'generate-pin',memberId},token);
 await f.service('office-pin-settings',{operation:'set-pin',memberId:'pramod-paswan',pin:'789'},'principal');
 const staff=structuredClone(f.data.cbse.staffAccess),pramod=structuredClone(f.data.cbse.officeAccess['pramod-paswan']);
 await assert.rejects(call('arjun-bori','outsider'),/Principal/);
 await Promise.all([call('arjun-bori'),call('sumit-puri')]);
 const result=await f.service('office-pin-settings',{operation:'read'},'principal');
 const pins=result.members.filter(member=>['arjun-bori','sumit-puri'].includes(member.id)).map(member=>{
  assert.equal(member.enabled,true);assert.match(member.pin,/^[0-9]{3}$/);return member.pin;
 });
 assert.equal(new Set(['123','456','789',...pins]).size,5);
 assert.deepEqual(result.pinAudit.duplicates,[]);
 await assert.rejects(call('arjun-bori'),/already has a PIN/);
 assert.deepEqual(f.data.cbse.staffAccess,staff);
 assert.deepEqual(f.data.cbse.officeAccess['pramod-paswan'],pramod);
});

test('Office generation confirms the conditional Firebase save and returns only the selected member',async()=>{
 const transactions=[];
 const f=taskFixture({restTransaction:async(db,path,update)=>{
  transactions.push(path);
  return db.ref(path).transaction(update);
 }});
 const memberId='arjun-bori';
 const response=await f.service('office-pin-settings',{operation:'generate-pin',memberId},'principal');
 assert.deepEqual(transactions,['cbse']);
 assert.equal(response.members.length,1);
 assert.equal(response.members[0].id,memberId);
 assert.match(response.members[0].pin,/^\d{3}$/);
 assert.equal(response.members[0].enabled,true);
 assert.equal(response.pinAudit,undefined);
});
