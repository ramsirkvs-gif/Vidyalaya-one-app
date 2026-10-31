import {scryptSync} from 'node:crypto';
const viewSecret={salt:'synthetic-view-salt',hash:scryptSync('synthetic-curtain','synthetic-view-salt',64).toString('hex')};
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
 return {data,db,auth,service:createStaffService({db,auth,now:()=>1000000,displayKey:Buffer.alloc(32,7),viewSecret})};
}
test('PINs are salted and hashed and compared without storing the original value',async()=>{const first=await hashPIN('654321'),second=await hashPIN('654321');assert.notEqual(first.hash,second.hash);assert.ok(await verifyPIN('654321',first));assert.equal(await verifyPIN('123456',first),false);assert.ok(!JSON.stringify(first).includes('654321'));assert.ok(await verifyPIN('123',await hashPIN('123')));await assert.rejects(hashPIN('12'),/three-digit/);});
test('only Principal can set PINs; list/directory never disclose PIN hashes',async()=>{const{service}=fixture();await assert.rejects(service('set-pin',{staffId:'X:one',pin:'654321'},'outsider'),/Principal/);await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');const directory=await service('directory');assert.equal(directory.staff.length,1);const access=await service('list',{},'principal');assert.ok(access.access['X:one'].pinSet);assert.ok(!JSON.stringify(access).includes('salt'));assert.ok(!JSON.stringify(directory).includes('hash'));});
test('verified staff may comment on students but unassigned private details stay inaccessible',async()=>{const{service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');await assert.rejects(service('login',{staffId:'X:one',pin:'000000'},'', 'test-ip'),/correct PIN/);const{customToken}=await service('login',{staffId:'X:one',pin:'654321'},'','test-ip');const own=await service('profile',{studentKey:'X:a:one'},customToken);assert.ok(own.assigned);const other=await service('profile',{studentKey:'X:b:two'},customToken);assert.equal(other.contact,null);assert.equal(other.progress,null);assert.ok(!JSON.stringify(other).includes('PRIVATE_NOTE'));await service('comment',{pin:'654321',studentKey:'X:b:two',notes:'Synthetic support comment',authorName:'Spoofed Principal'},customToken);const comment=Object.values(data.cbse.mission.records).find(r=>r.kind==='faculty_comment');assert.equal(comment.authorName,'Synthetic Teacher');assert.equal(comment.authorId,'X:one');assert.equal(data.cbse.mission.revision,1);await assert.rejects(service('profile',{studentKey:'__proto__'},customToken),/not found/);});
test('reset and disabled access reject existing tokens immediately',async()=>{const{service}=fixture();await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');const{customToken}=await service('login',{staffId:'X:one',pin:'654321'},'','ip');await service('set-pin',{staffId:'X:one',pin:'123456'},'principal');await assert.rejects(service('students',{},customToken),/disabled or reset/);const fresh=await service('login',{staffId:'X:one',pin:'123456'},'','ip');await service('disable',{staffId:'X:one'},'principal');await assert.rejects(service('students',{},fresh.customToken),/disabled or reset/);});
test('repeated PIN attempts are limited and staff cannot update another person’s task',async()=>{const{service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');for(let i=0;i<8;i++)await assert.rejects(service('login',{staffId:'X:one',pin:'000000'},'','blocked-ip'));await assert.rejects(service('login',{staffId:'X:one',pin:'654321'},'','blocked-ip'),/Too many/);const{customToken}=await service('login',{staffId:'X:one',pin:'654321'},'','another-ip');data.cbse.mission.tasks.one={studentKey:'X:a:one',staffId:'support:other',status:'open'};await assert.rejects(service('update-task',{pin:'654321',studentKey:'X:a:one',taskId:'one',status:'done',outcome:'Wrong person'},customToken),/not assigned/);});

test('Principal generates three-digit PINs once, preserving existing and disabled PINs',async()=>{
 const {service,data}=fixture();
 await assert.rejects(service('generate-pins',{},'outsider'),/Principal/);
 const result=await service('generate-pins',{},'principal');assert.equal(result.created.length,1);const p=result.created[0];assert.match(p.pin,/^[0-9]{3}$/);assert.equal(p.staffId,'X:one');assert.ok(await verifyPIN(p.pin,data.cbse.staffAccess['X:one']));
 const token=(await service('login',{staffId:p.staffId,pin:p.pin},'','three-digit')).customToken;assert.ok((await service('students',{},token)).students.length);
 assert.equal((await service('generate-pins',{},'principal')).created.length,0);
 await service('disable',{staffId:p.staffId},'principal');assert.equal((await service('generate-pins',{},'principal')).created.length,0);assert.equal(data.cbse.staffAccess[p.staffId].enabled,false);
});

test('CSV PIN updates require Principal, validate before writing and invalidate previous sessions',async()=>{
 const {service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'654321'},'principal');const old=(await service('login',{staffId:'X:one',pin:'654321'},'','csv-ip')).customToken;
 const rows=[{staffId:'X:one',name:'Synthetic Teacher',pin:'029',enabled:true}];
 await assert.rejects(service('import-pins',{rows},'outsider'),/Principal/);
 const before=structuredClone(data.cbse.staffAccess);await assert.rejects(service('import-pins',{rows:[...rows,{staffId:'X:unknown',name:'Unknown',pin:'123',enabled:true}]},'principal'),/unknown/);assert.deepEqual(data.cbse.staffAccess,before);
 data.cbse.staffAccess.unlisted={enabled:false,hash:'retained'};
 const result=await service('import-pins',{rows},'principal');assert.equal(result.updated,1);assert.equal(result.access['X:one'].enabled,true);assert.ok(!JSON.stringify(result).includes('029'));assert.equal(data.cbse.staffAccess.unlisted.hash,'retained');assert.ok(await verifyPIN('029',data.cbse.staffAccess['X:one']));await assert.rejects(service('students',{},old),/disabled or reset/);
 const fresh=await service('login',{staffId:'X:one',pin:'029'},'','csv-ip');await service('import-pins',{rows:[{...rows[0],enabled:false}]},'principal');await assert.rejects(service('students',{},fresh.customToken),/disabled or reset/);
});

test('new faculty and initial PIN save atomically with Principal authorization and validation',async()=>{
 const {service,data}=fixture(),input={classId:'XII',name:'Synthetic New Teacher',designation:'PGT',subjects:'Physics',teachingSections:'A',pin:'047'};
 await assert.rejects(service('add-faculty-pin',input,'outsider'),/Principal/);
 const before=structuredClone(data.cbse);await assert.rejects(service('add-faculty-pin',{...input,name:''},'principal'),/faculty name/);assert.deepEqual(data.cbse,before);
 const result=await service('add-faculty-pin',input,'principal'),id=`XII:${result.teacherId}`;assert.equal(data.cbse.facultyDraft.classes.XII.teachers[result.teacherId].name,input.name);assert.ok(await verifyPIN('047',data.cbse.staffAccess[id]));assert.equal(data.cbse.staffAccess[id].enabled,true);
 const token=await service('login',{staffId:id,pin:'047'},'','new-person');assert.ok(token.customToken);
 const saved=structuredClone(data.cbse);await assert.rejects(service('add-faculty-pin',input,'principal'),/already exist/);assert.deepEqual(data.cbse,saved);assert.equal(data.cbse.adminUid,before.adminUid);assert.deepEqual(data.cbse.draft,before.draft);
});

test('only Principal can recover encrypted PIN list, stored database never contains clear PINs',async()=>{
 const {service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'029'},'principal');
 const record=data.cbse.staffAccess['X:one'];assert.ok(record.displayPIN);assert.equal(record.pin,undefined);assert.equal(record.displayPIN.ciphertext==='029',false);
 const list=await service('list',{},'principal');assert.equal(list.access['X:one'].pin,'029');await assert.rejects(service('list',{},'outsider'),/Principal/);
 const directory=await service('directory');assert.ok(!JSON.stringify(directory).includes('029'));assert.ok(!JSON.stringify(directory).includes('displayPIN'));
 record.displayPIN.tag='invalid';assert.equal((await service('list',{},'principal')).access['X:one'].pin,'');
});

test('staff contact updates are versioned, map-only updates work for any PIN holder, and protected phones stay scoped',async()=>{
 const {service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'123'},'principal');const token=(await service('login',{staffId:'X:one',pin:'123'},'','contact-test')).customToken;
 await service('update-contact',{pin:'123',studentKey:'X:b:two',expectedRevision:0,contact:{mapLocation:'27.1,93.7'}},token);assert.match(data.cbse.mission.students['X:b:two'].mapLocation,/google.com\/maps/);assert.equal(data.cbse.mission.students['X:b:two'].updatedBy,'X:one');assert.equal(data.cbse.mission.students['X:b:two'].phones,'private-phone');
 await assert.rejects(service('update-contact',{pin:'123',studentKey:'X:b:two',expectedRevision:1,contact:{numbers:{x:{label:'Father',phone:'1234567890'}}}},token),/assigned student/);
 await assert.rejects(service('update-contact',{pin:'123',studentKey:'X:b:two',expectedRevision:0,contact:{mapLocation:'27.2,93.8'}},token),/changed/);
 await assert.rejects(service('update-contact',{pin:'123',studentKey:'X:b:two',expectedRevision:1,contact:{mapLocation:'javascript:alert(1)'}},token),/Google Maps/);
 await service('update-contact',{pin:'123',studentKey:'X:a:one',expectedRevision:0,contact:{numbers:{one:{label:'Father',phone:'1234567890'}},mapLocation:'https://maps.app.goo.gl/example'}},token);assert.equal(data.cbse.mission.students['X:a:one'].numbers.one.phone,'1234567890');assert.equal((await service('profile',{studentKey:'X:a:one'},token)).contact.numbers.one.label,'Father');
});
test('remark roles are checked against live CT and subject allocations, and action replies retain identity',async()=>{
 const {service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'123'},'principal');const token=(await service('login',{staffId:'X:one',pin:'123'},'','roles-test')).customToken;
 await assert.rejects(service('comment',{pin:'123',studentKey:'X:a:one',notes:'Spoofed CT',role:'class_teacher'},token),/not assigned/);
 data.cbse.facultyDraft.classes.X.roles.a={classTeacher:'one',coClassTeacher:''};await service('comment',{pin:'123',studentKey:'X:a:one',notes:'CT watch',role:'class_teacher'},token);
 await assert.rejects(service('comment',{pin:'123',studentKey:'X:a:one',notes:'Spoofed subject',role:'subject_teacher',subjectId:'english'},token),/not assigned/);
 data.cbse.mission.allocations.a={classId:'X',sectionId:'a',subjectId:'english',staffId:'X:one'};await service('comment',{pin:'123',studentKey:'X:a:one',notes:'English practice',role:'subject_teacher',subjectId:'english'},token);
 const record=Object.values(data.cbse.mission.records).find(r=>r.notes==='English practice');assert.equal(record.authorRole,'subject_teacher');assert.equal(record.subjectId,'english');
 data.cbse.mission.tasks.mine={staffId:'X:one',studentKey:'X:a:one',status:'open',title:'Home visit'};await service('comment',{pin:'123',studentKey:'X:a:one',notes:'Visit planned',channel:'home_visit',taskId:'mine'},token);const reply=Object.values(data.cbse.mission.records).find(r=>r.notes==='Visit planned');assert.equal(reply.replyTo,'mine');assert.equal(reply.kind,'contact');assert.equal(reply.authorName,'Synthetic Teacher');
 await service('update-task',{pin:'123',studentKey:'X:a:one',taskId:'mine',status:'done',outcome:'Family contacted'},token);assert.ok(Object.values(data.cbse.mission.records).some(r=>r.notes==='Family contacted'&&r.replyTo==='mine'));
});

test('staff curtain gives read-only browsing without personal PIN and never exposes PIN or restricted records',async()=>{
 const {service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'123'},'principal');await assert.rejects(service('view-data'),/viewing password/);await assert.rejects(service('view-login',{password:'wrong'}),/staff viewing password/);
 const login=await service('view-login',{password:'synthetic-curtain'},'','viewer-ip');assert.match(login.viewerToken,/^[a-f0-9]{64}$/);const session={viewerToken:login.viewerToken};const view=await service('view-data',{},'','viewer-ip',session);assert.equal(view.mission.students['X:b:two'].phones,'private-phone');assert.ok(!JSON.stringify(view).includes('PRIVATE_NOTE'));assert.ok(!JSON.stringify(view).includes('displayPIN'));assert.equal(view.pinStaff[0].id,'X:one');assert.equal(view.mission.records.restricted,undefined);assert.ok(view.draft.classes.X.sections.b.students.two);
 const version=await service('view-version',{},'','viewer-ip',session);assert.ok(Array.isArray(version.versions));await service('view-logout',{},'','viewer-ip',session);await assert.rejects(service('view-data',{},'','viewer-ip',session),/viewing password/);
});
test('each direct submission verifies a fresh PIN without generating a login token',async()=>{
 const {service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'123'},'principal');data.cbse.facultyDraft.classes.X.roles.a={classTeacher:'one',coClassTeacher:''};const input={operation:'comment',studentKey:'X:a:one',staffId:'X:one',pin:'123',role:'class_teacher',notes:'Fresh PIN remark'};
 await assert.rejects(service('pin-submit',{...input,pin:'000'},'','submit-ip'),/PIN does not match/);const result=await service('pin-submit',input,'','submit-ip');assert.equal(result.ok,true);assert.equal(result.customToken,undefined);assert.ok(Object.values(data.cbse.mission.records).some(r=>r.notes==='Fresh PIN remark'&&r.authorId==='X:one'));
 await assert.rejects(service('pin-submit',{...input,operation:'set-pin'},'','submit-ip'),/Principal/);
});
test('a requested teacher report completes only for the exact verified recipient and role',async()=>{
 const {service,data}=fixture();await service('set-pin',{staffId:'X:one',pin:'123'},'principal');data.cbse.facultyDraft.classes.X.roles.a={classTeacher:'one',coClassTeacher:''};data.cbse.mission.reportRequests={r:{studentKey:'X:a:one',status:'open',targets:{ct:{staffId:'X:one',role:'class_teacher',subjectId:''}}}};
 data.cbse.mission.tasks.report={requestId:'r',requestTargetId:'ct',staffId:'X:one',studentKey:'X:a:one',status:'open'};const input={operation:'comment',studentKey:'X:a:one',staffId:'X:one',pin:'123',notes:'Requested CT report',requestId:'r',requestTargetId:'ct'};
 await assert.rejects(service('pin-submit',{...input,role:'faculty_support'},'','request-ip'),/not assigned/);await service('pin-submit',{...input,role:'class_teacher'},'','request-ip');assert.ok(Object.values(data.cbse.mission.records).some(r=>r.requestId==='r'&&r.requestTargetId==='ct'&&r.authorRole==='class_teacher'));assert.equal(data.cbse.mission.tasks.report.status,'done');
});

test('an existing staff login cannot bypass a fresh submission PIN',async()=>{
 const {service}=fixture();await service('set-pin',{staffId:'X:one',pin:'123'},'principal');const token=(await service('login',{staffId:'X:one',pin:'123'},'','legacy-submit')).customToken;
 await assert.rejects(service('comment',{studentKey:'X:a:one',notes:'No new PIN'},token),/personal PIN/);await service('comment',{pin:'123',studentKey:'X:a:one',notes:'Fresh PIN supplied'},token);
});
