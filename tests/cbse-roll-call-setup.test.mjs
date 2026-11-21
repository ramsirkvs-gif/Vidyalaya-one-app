import test from 'node:test';import assert from 'node:assert/strict';import {planRollRosterProfiles} from '../cbse-roll-call-setup.js';import {emptyFaculty} from '../cbse-faculty-model.js';import {emptyMission} from '../cbse-mission-model.js';
test('setup adds reporting profiles without inventing teaching assignments and does not duplicate inactive or aliased staff',()=>{const f=emptyFaculty(),m=emptyMission();f.classes.XII.teachers.existing={name:'PARTHA PROTIM BORAH',designation:'PGT-CS',status:'active'};f.classes.X.teachers.inactive={name:'MR. ABHISHEK SINGH',designation:'TGT-English',status:'inactive'};const r=planRollRosterProfiles(m,f,100);assert.equal(r.created.length,42);assert.equal(r.next.revision,m.revision+1);assert.deepEqual(r.next.allocations,m.allocations);assert.ok(!Object.values(r.next.staff).some(p=>/Principal|VACANT/i.test(p.name)));assert.equal(planRollRosterProfiles(r.next,f,200).created.length,0);});

test('Principal can prepare Gocham Yagom alone and keeps her existing unique PIN',async()=>{
 const {taskFixture}=await import('./task-manager-fixture.mjs');
 const f=taskFixture();
 await f.service('set-pin',{staffId:'X:one',pin:'123'},'principal');
 await f.service('office-pin-settings',{operation:'set-pin',memberId:'sumit-puri',pin:'456'},'principal');
 const input={rosterName:'Ms. Gocham Yagom'};
 const {rollRoster}=await import('../cbse-roll-call-roster.js');
 const roster=async()=>rollRoster((await f.service('roll-call-read')).staff,'secondary');
 const row=async()=>(await roster()).find(person=>person.name==='MS. GOCHAM YAGOM');
 assert.equal((await row()).id,'');
 await assert.rejects(f.service('roll-call-setup',input,'outsider'),/Principal/);
 assert.deepEqual(await f.service('roll-call-setup',input,'principal'),{ok:true,createdStaff:1,createdPins:1});
 const list=await f.service('list',{},'principal');
 const [id,person]=Object.entries(list.staff).find(([,p])=>p.name==='MS. GOCHAM YAGOM');
 assert.equal((await row()).id,id);
 assert.equal(person.wing,'secondary');assert.equal(person.designation,'TGT-English');
 const pin=list.access[id].pin;
 assert.match(pin,/^\d{3}$/);assert.ok(!['123','456'].includes(pin));
 assert.deepEqual(await f.service('roll-call-setup',input,'principal'),{ok:true,createdStaff:0,createdPins:0});
 assert.equal((await f.service('list',{},'principal')).access[id].pin,pin);
});
