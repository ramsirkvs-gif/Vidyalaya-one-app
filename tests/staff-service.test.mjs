import test from 'node:test';
import assert from 'node:assert/strict';
import {createStaffService,hashPIN,verifyPIN} from '../_server/staff-service.js';
import {emptyDraft} from '../cbse-model.js';
import {emptyFaculty} from '../cbse-faculty-model.js';
import {emptyMission} from '../cbse-mission-model.js';
function fixture(){
 const draft=emptyDraft(),faculty=emptyFaculty(),mission=emptyMission();
 draft.classes.X.sections.a.subjects={english:{name:'English',code:''}};draft.classes.X.sections.a.students={one:{name:'Synthetic Student',roll:'001',subjects:{english:true}}};draft.classes.X.sections.b.students={two:{name:'Other Synthetic Student',roll:'002',subjects:{}}};
 faculty.classes.X.teachers.one={name:'Synthetic Teacher',designation:'TGT',subjects:'English',teachingSections:'A',status:'active'};
 mission.students['X:b:two']={gender:'unknown',guardian:'Private Guardian',phones:'private-phone',location:'private-address'};
 mission.records={restricted:{kind:'counselling',studentKey:'X:b:two',visibility:'restricted',authorId:'principal',notes:'PRIVATE_NOTE'}};
 const data={cbse:{adminUid:'principal-uid',draft,facultyDraft:faculty,mission}};
 const copy=v=>v===undefined?null:structuredClone(v);
 const at=path=>path.split('/').reduce((value,key)=>value?.[key],data);
 const put=(path,value)=>{const keys=path.split('/');let parent=data;for(const key of keys.slice(0,-1))parent=parent[key]||={};if(value===null)delete parent[keys.at(-1)];else parent[keys.at(-1)]=copy(value);};
 const db={ref:path=>({get:async()=>({val:()=>copy(at(path))}),set:async v=>put(path,v),update:async v=>put(path,{...at(path),...v}),remove:async()=>put(path,null),transaction:async fn=>{const next=fn(copy(at(path)));if(next===undefined)return {committed:false};put(path,next);return {committed:true,snapshot:{val:()=>copy(next)}};}})};
 const auth={verifyIdToken:async token=>token==='principal'?{uid:'principal-uid'}:token==='outsider'?{uid:'not-principal'}:JSON.parse(token),createCustomToken:async(uid,claims)=>JSON.stringify({uid,...claims}),revokeRefreshTokens:async()=>{}};
 return {data,db,auth,service:createStaffService({db,auth,now:()=>1000000})};
}
test('PINs are salted and hashed and compared without storing the original value',async()=>{const first=await hashPIN('654321'),second=await hashPIN('654321');assert.notEqual(first.hash,second.hash);assert.ok(await verifyPIN('654321',first));assert.equal(await verifyPIN('123456',first),false);assert.ok(!JSON.stringify(first).includes('654321'));assert.ok(await verifyPIN('123',await hashPIN('123')));await assert.rejects(hashPIN('12'),/three-digit/);});
test('only Principal can set PINs; list/directory never disclose PIN hashes',async()=>{const{service}=fixture();await assert.rejects(service('set-pin',{staffId:'X:one',pin:'654321'},'outsider'),/Principal/);await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');const directory=await service('directory');assert.equal(directory.staff.length,1);const access=await service('list',{},'principal');assert.ok(access.access['X:one'].pinSet);assert.ok(!JSON.stringify(access).includes('salt'));assert.ok(!JSON.stringify(directory).includes('hash'));});
test('verified staff may comment on students but unassigned private details stay inaccessible',async()=>{const{service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');await assert.rejects(service('login',{staffId:'X:one',pin:'000000'},'', 'test-ip'),/correct PIN/);const{customToken}=await service('login',{staffId:'X:one',pin:'654321'},'','test-ip');const own=await service('profile',{studentKey:'X:a:one'},customToken);assert.ok(own.assigned);const other=await service('profile',{studentKey:'X:b:two'},customToken);assert.equal(other.contact,null);assert.equal(other.progress,null);assert.ok(!JSON.stringify(other).includes('PRIVATE_NOTE'));await service('comment',{studentKey:'X:b:two',notes:'Synthetic support comment',authorName:'Spoofed Principal'},customToken);const comment=Object.values(data.cbse.mission.records).find(r=>r.kind==='faculty_comment');assert.equal(comment.authorName,'Synthetic Teacher');assert.equal(comment.authorId,'X:one');assert.equal(data.cbse.mission.revision,1);await assert.rejects(service('profile',{studentKey:'__proto__'},customToken),/not found/);});
test('reset and disabled access reject existing tokens immediately',async()=>{const{service}=fixture();await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');const{customToken}=await service('login',{staffId:'X:one',pin:'654321'},'','ip');await service('set-pin',{staffId:'X:one',pin:'123456'},'principal');await assert.rejects(service('students',{},customToken),/disabled or reset/);const fresh=await service('login',{staffId:'X:one',pin:'123456'},'','ip');await service('disable',{staffId:'X:one'},'principal');await assert.rejects(service('students',{},fresh.customToken),/disabled or reset/);});
test('repeated PIN attempts are limited and staff cannot update another person’s task',async()=>{const{service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');for(let i=0;i<8;i++)await assert.rejects(service('login',{staffId:'X:one',pin:'000000'},'','blocked-ip'));await assert.rejects(service('login',{staffId:'X:one',pin:'654321'},'','blocked-ip'),/Too many/);const{customToken}=await service('login',{staffId:'X:one',pin:'654321'},'','another-ip');data.cbse.mission.tasks.one={studentKey:'X:a:one',staffId:'support:other',status:'open'};await assert.rejects(service('update-task',{studentKey:'X:a:one',taskId:'one',status:'done',outcome:'Wrong person'},customToken),/not assigned/);});

test('Principal generates three-digit PINs once, preserving existing and disabled PINs',async()=>{
 const {service,data}=fixture();
 await assert.rejects(service('generate-pins',{},'outsider'),/Principal/);
 const result=await service('generate-pins',{},'principal');assert.equal(result.created.length,1);const p=result.created[0];assert.match(p.pin,/^[0-9]{3}$/);assert.equal(p.staffId,'X:one');assert.ok(await verifyPIN(p.pin,data.cbse.staffAccess['X:one']));
 const token=(await service('login',{staffId:p.staffId,pin:p.pin},'','three-digit')).customToken;assert.ok((await service('students',{},token)).students.length);
 assert.equal((await service('generate-pins',{},'principal')).created.length,0);
 await service('disable',{staffId:p.staffId},'principal');assert.equal((await service('generate-pins',{},'principal')).created.length,0);assert.equal(data.cbse.staffAccess[p.staffId].enabled,false);
});
