import test from 'node:test';
import assert from 'node:assert/strict';
import {officeFixture} from './office-fixture.mjs';
import {OFFICE_MEMBERS,applyOfficeWorkspace,emptyOfficeWorkspace,matchOfficeResponsibility,searchOfficeRows} from '../cbse-office-model.js';
import {mergeOfficeAuditSheets} from '../cbse-office-import.js';
const principal='principal',id='pramod-paswan';
const row={task:'Audit',fund:'SF',voucherNo:'222',voucherDate:'2026-03-01',amount:'4,38,000',details:'Synthetic audit record',objections:'Need receipt',assignedIds:['X:one'],status:'pending',sourceKey:'synthetic:row1'};
const setPIN=(service,memberId=id,pin='123')=>service('office-pin-settings',{operation:'set-pin',memberId,pin},principal);
async function login(service,memberId=id,pin='123'){const viewer=await service('view-login',{password:'synthetic-view'},'','office-view');const result=await service('office-login',{memberId,pin},'','office-test',{viewerToken:viewer.viewerToken});return {officeToken:result.officeToken,viewerToken:viewer.viewerToken};}
const call=(service,operation,values={},token=principal,session={})=>service('office-workspace',{memberId:id,operation,...values},token,'office-test',session);
test('office membership has exactly three separate office identities',()=>{assert.deepEqual(OFFICE_MEMBERS.map(p=>p.designation),['ASO','SSA','JSA']);assert.equal(OFFICE_MEMBERS[1].name,'Mr. Pramod Paswan');});
test('office PIN setup is Principal-only and does not modify Mission PINs or records',async()=>{
 const {service,data}=officeFixture(),before=structuredClone(data.cbse.staffAccess);
 await assert.rejects(service('office-pin-settings',{},'teacher'),/Principal/);await assert.rejects(service('office-pin-settings',{}),/Office login/);
 const result=await setPIN(service);assert.equal(result.members.find(m=>m.id===id).pin,'123');assert.deepEqual(data.cbse.staffAccess,before);assert.ok(data.cbse.officeAccess[id].hash);assert.ok(data.cbse.officeAccess[id].displayPIN);assert.equal(data.cbse.officeAccess[id].pin,undefined);
});
test('office sessions cannot open another member dashboard or grant Mission/Principal access',async()=>{
 const {service}=officeFixture();await setPIN(service);const session=await login(service);const result=await call(service,'read',{},'',session);assert.equal(result.actor.id,id);assert.equal(result.actor.principal,false);assert.ok(!JSON.stringify(result).includes('displayPIN'));
 await assert.rejects(service('office-workspace',{memberId:'arjun-bori',operation:'read'},'','ip',session),/concerned office/);
 await assert.rejects(service('office-pin-settings',{},'','ip',session),/Principal/);await assert.rejects(service('chamber-principal',{operation:'read'},'','ip',session));
 await assert.rejects(call(service,'read',{},'',{officeToken:'forged'}),/Office login/);
});
test('Pramod can update only Pending / Done using his own fresh PIN',async()=>{
 const {service}=officeFixture();await setPIN(service);await call(service,'save-row',{rowId:'office_1',expectedRevision:0,row});const session=await login(service),input={rowId:'office_1',rowRevision:1,expectedRevision:1,status:'resolved'};
 await assert.rejects(call(service,'set-voucher-status',input,'',session),/incorrect/);await assert.rejects(call(service,'set-voucher-status',{...input,pin:'999'},'',session),/incorrect/);
 const saved=await call(service,'set-voucher-status',{...input,pin:'123'},'',session);assert.equal(saved.workspace.rows.office_1.status,'resolved');assert.equal(saved.workspace.rows.office_1.statusUpdatedBy,id);
 for(const key of ['amount','details','objections','sourceKey','assignedIds'])assert.deepEqual(saved.workspace.rows.office_1[key],row[key]);
 for(const operation of ['save-row','import','save-settings','publish'])await assert.rejects(call(service,operation,{expectedRevision:2,rowId:'office_1',row,pin:'123'},'',session),/Principal/);
 await assert.rejects(call(service,'set-voucher-status',{...input,pin:'123'},'',session),/changed/);
});
test('reset, disable, logout and expiry revoke only office sessions',async()=>{
 const {service,setTime}=officeFixture();await setPIN(service);const old=await login(service);await setPIN(service,id,'456');await assert.rejects(call(service,'read',{},'',old),/changed/);
 const fresh=await login(service,id,'456');await service('office-logout',{},'','ip',fresh);await assert.rejects(call(service,'read',{},'',fresh),/expired/);
 const expiring=await login(service,id,'456');setTime(Date.parse('2026-11-15T10:00:00Z'));await assert.rejects(call(service,'read',{},'',expiring),/expired/);
 const disabled=await login(service,id,'456');await service('office-pin-settings',{operation:'disable',memberId:id},principal);await assert.rejects(call(service,'read',{},'',disabled),/changed/);
});
test('staff see only Principal-published snapshots behind the existing staff curtain',async()=>{
 const {service,reads}=officeFixture();await call(service,'save-row',{rowId:'office_1',expectedRevision:0,row});await assert.rejects(service('office-staff-read'),/viewing password/);
 const viewer=await service('view-login',{password:'synthetic-view'},'','viewer'),session={viewerToken:viewer.viewerToken};
 assert.deepEqual((await service('office-staff-read',{},'','ip',session)).summaries,[]);
 await call(service,'publish',{expectedRevision:1});const published=(await service('office-staff-read',{memberId:id},'','ip',session)).published;assert.equal(published.rows.office_1.assignedNames[0],'MR. JITENDER PAUL');
 await call(service,'save-row',{rowId:'office_1',expectedRevision:2,rowRevision:1,row:{...row,details:'PRIVATE NEW DRAFT'}});
 assert.equal((await service('office-staff-read',{memberId:id},'','ip',session)).published.rows.office_1.details,'Synthetic audit record');
 await call(service,'unpublish',{expectedRevision:3});assert.equal((await service('office-staff-read',{memberId:id},'','ip',session)).published,null);
 assert.ok(!reads.includes('cbse/draft'));assert.ok(!reads.includes('cbse/mission'));assert.ok(!reads.includes('cbse/chamber'));
});
test('duplicate imports skip existing source rows and preserve subsequent edits and notes',async()=>{
 const {service}=officeFixture();const imported=await call(service,'import',{expectedRevision:0,rows:[row,row],notes:'Original notes'});assert.equal(Object.keys(imported.workspace.rows).length,1);
 const [rowId]=Object.keys(imported.workspace.rows);await call(service,'save-row',{expectedRevision:1,rowId,rowRevision:1,row:{...row,details:'Corrected by office'}});await call(service,'save-settings',{expectedRevision:2,title:'Audit',notes:'Edited office notes'});
 const again=await call(service,'import',{expectedRevision:3,rows:[row],notes:'Original notes'});assert.equal(Object.keys(again.workspace.rows).length,1);assert.equal(again.workspace.rows[rowId].details,'Corrected by office');assert.equal(again.workspace.notes,'Edited office notes');
});
test('invalid assignees, revision conflicts and oversized fields never save',()=>{
 const base=emptyOfficeWorkspace(id),input={operation:'save-row',memberId:id,rowId:'office_1',expectedRevision:0,row};
 assert.throws(()=>applyOfficeWorkspace(base,input,{id:'arjun-bori'},{'X:one':{name:'Teacher'}},1),/concerned/);
 assert.throws(()=>applyOfficeWorkspace(base,input,{id,principal:true},{},1),/directory/);
 assert.throws(()=>applyOfficeWorkspace(base,{...input,row:{...row,details:'x'.repeat(12001)}},{id,principal:true},{'X:one':{}},1),/too long/);assert.deepEqual(base,emptyOfficeWorkspace(id));
});
test('import combines both sheets by explicit ranges and retains unmatched cheques and source notation',()=>{
 const sheets=[{name:'SF',rows:[{number:2,values:Array.from({length:12},(_,i)=>i===11?'Office bank notes':'')},{number:5,values:['1','2025-03-01','2876','SBI','4,38,000','2','222-223','4','1','36 SBI']},{number:6,values:['2','2025-04-01','2877','UBI','1000','','','','','']}]},{name:'SF Vouchers',rows:[{number:4,values:['222','2025-03-01','4,38,000','Synthetic detail','Need signed receipt','1-Mr. Jitender Paul\n2-SSA','']},{number:5,values:['223','06-07/03/2025','4,84.963','Synthetic detail','NA','TT IC','']}]}];
 const result=mergeOfficeAuditSheets(sheets,{'X:one':{name:'Jitendra Paul'},'office:pramod-paswan':{name:'Mr. Pramod Paswan'}});
 assert.deepEqual(result.counts,{cheques:2,vouchers:2,unlinkedCheques:1,total:3});assert.equal(result.rows[0].chequeNo,'2876');assert.equal(result.rows[1].amount,'4,84.963');assert.match(result.rows[1].reviewNote,/Date retained/);assert.deepEqual(result.rows[0].assignedIds,['X:one','office:pramod-paswan']);assert.equal(result.notes,'Office bank notes');assert.equal(result.rows[2].chequeNo,'2877');
 assert.throws(()=>mergeOfficeAuditSheets([]),/both/);
});
test('responsibility matching resolves unique names and office roles, leaving ambiguous committees unassigned',()=>{
 const directory={'X:one':{name:'Jitendra Paul'},'XII:one':{name:'Jitendra Paul'},'X:two':{name:'Anil Kumar'},'X:three':{name:'Anil Singh'},'office:pramod-paswan':{name:'Mr. Pramod Paswan'}};
 const result=matchOfficeResponsibility('1-Mr. Jitender Paul\n2-SSA\n3-Mr. Anil\n4-TT IC',directory);assert.deepEqual(result.assignedIds,['X:one','office:pramod-paswan']);assert.deepEqual(result.unmatched,['Mr. Anil','TT IC']);
});
test('advanced search combines cheque, voucher, assignee, status, bank, fund and date filters',()=>{
 const rows={one:{...row,chequeNo:'AB123',bank:'UBI',assignedNames:['Jitendra Paul']},two:{...row,voucherNo:'99',status:'resolved',bank:'SBI'}};
 assert.equal(searchOfficeRows(rows,{query:'222 AB123 Paul',assignee:'X:one',status:'pending',bank:'UBI',fund:'SF',from:'2026-03-01',to:'2026-03-02'}).length,1);
 assert.equal(searchOfficeRows(rows,{query:'missing'}).length,0);
});
test('office PIN login is throttled and teacher credentials cannot substitute for office credentials',async()=>{
 const {service}=officeFixture();await setPIN(service);const viewer=await service('view-login',{password:'synthetic-view'},'','gate');const session={viewerToken:viewer.viewerToken};for(let i=0;i<8;i++)await assert.rejects(service('office-login',{memberId:id,pin:'999'},'','blocked',session));
 await assert.rejects(service('office-login',{memberId:id,pin:'123'},'','blocked',session),/Too many/);
 await assert.rejects(service('office-workspace',{memberId:id,operation:'read'},'teacher'),/Principal/);
});

test('ASO and JSA each open and save only their own dashboard with their own office PIN',async()=>{
 const {service}=officeFixture();for(const member of OFFICE_MEMBERS.filter(member=>member.id!==id)){
  await setPIN(service,member.id,'456');const session=await login(service,member.id,'456');const result=await service('office-workspace',{memberId:member.id,operation:'read'},'','role-ip',session);assert.equal(result.actor.id,member.id);
  const saved=await service('office-workspace',{memberId:member.id,operation:'save-row',rowId:'office_role',expectedRevision:0,row:{...row,assignedIds:[]},pin:'456'},'','role-ip',session);assert.equal(saved.workspace.rows.office_role.updatedBy,member.id);
  await assert.rejects(service('office-workspace',{memberId:id,operation:'read'},'','role-ip',session),/concerned office/);
 }
});

test('office directory and notification filters retain existing linked teacher identities',async()=>{
 const {service}=officeFixture(),result=await call(service,'read');assert.ok(result.directory['X:one'].identityIds.includes('X:one'));assert.ok(result.directory['X:one'].identityIds.includes('XII:linked'));
 assert.equal(searchOfficeRows({one:row},{assignee:'XII:linked',assigneeIds:result.directory['X:one'].identityIds}).length,1);
});

test('simple OK reports require concerned PIN, are visible to Principal, and retain reviewed history',async()=>{
 const {service}=officeFixture();await setPIN(service);const session=await login(service);
 await assert.rejects(call(service,'submit-report',{expectedRevision:0,reportText:'OK'},'',session),/incorrect/);
 const saved=await call(service,'submit-report',{expectedRevision:0,reportText:'OK',pin:'123'},'',session);assert.equal(saved.workspace.report.text,'OK');assert.equal(saved.workspace.report.status,'submitted');
 await assert.rejects(call(service,'review-report',{expectedRevision:1,pin:'123'},'',session),/Principal/);
 const summary=await service('office-workspace',{operation:'report-summary'},'principal');assert.equal(summary.reports.find(item=>item.member.id===id).report.text,'OK');
 await call(service,'review-report',{expectedRevision:1});const again=await call(service,'submit-report',{expectedRevision:2,reportText:'OK — checked again',pin:'123'},'',session);assert.equal(again.workspace.reportHistory.report_1.status,'reviewed');assert.equal(again.workspace.report.revision,2);
});
test('editing one remarks field preserves source responsibility and previous remarks, including retained identities',()=>{
 const old={...row,id:'office_existing',revision:1,sourceResponsible:'Original teacher and committee',resolution:'Previous resolution',reviewNote:'Source date warning',assignedIds:['historical-id']};const current={...emptyOfficeWorkspace(id),revision:1,rows:{office_existing:old}};
 const saved=applyOfficeWorkspace(current,{memberId:id,operation:'save-row',rowId:old.id,rowRevision:1,expectedRevision:1,row:{...old,objections:'Updated single remark'}},{id,principal:true},{},1);
 assert.equal(saved.rows.office_existing.resolution,old.resolution);assert.equal(saved.rows.office_existing.reviewNote,old.reviewNote);assert.equal(saved.rows.office_existing.sourceResponsible,old.sourceResponsible);assert.deepEqual(saved.rows.office_existing.assignedIds,old.assignedIds);
 assert.throws(()=>applyOfficeWorkspace(current,{memberId:id,operation:'save-row',rowId:old.id,rowRevision:1,expectedRevision:1,row:{...old,assignedIds:['new-unknown-id']}},{id,principal:true},{},1),/directory/);
});

test('office assignment dropdown is exactly the approved 51 regular employees, without creating login identities',async()=>{
 const {OFFICE_REGULAR_EMPLOYEES,officeRegularDirectory}=await import('../cbse-office-regular.js');const directory=officeRegularDirectory({'X:one':{name:'Jitendra Paul',designation:'TGT'},contract:{name:'Contractual Teacher',designation:'Instructor'}});
 assert.equal(Object.keys(directory).length,51);assert.deepEqual(Object.values(directory).map(person=>person.name),OFFICE_REGULAR_EMPLOYEES.map(([name])=>name));assert.equal(directory.contract,undefined);assert.equal(directory['X:one'].name,'MR. JITENDER PAUL');
 const {service,data}=officeFixture(),before=structuredClone(data.cbse.staffAccess),result=await call(service,'read');assert.equal(Object.keys(result.directory).length,51);assert.deepEqual(data.cbse.staffAccess,before);
});

test('a staff viewing session never authorizes voucher status changes',async()=>{
 const {service}=officeFixture();await call(service,'save-row',{rowId:'office_1',expectedRevision:0,row});const viewer=await service('view-login',{password:'synthetic-view'},'','viewer');
 await assert.rejects(call(service,'set-voucher-status',{rowId:'office_1',expectedRevision:1,rowRevision:1,status:'resolved',pin:'123'},'',{viewerToken:viewer.viewerToken}),/Office login/);
 const saved=await call(service,'read');assert.equal(saved.workspace.rows.office_1.status,'pending');
});

test('header search finds full regular-employee names even when the workbook uses an abbreviation',()=>{assert.equal(searchOfficeRows({one:{...row,sourceResponsible:'SSA',assignedIds:['office:pramod-paswan']}},{query:'Pramod Paswan',directory:{'office:pramod-paswan':{name:'Mr. Pramod Paswan'}}}).length,1);});

test('office PIN login and restored office sessions also require the existing curtain',async()=>{
 const {service}=officeFixture();await setPIN(service);
 await assert.rejects(service('office-login',{memberId:id,pin:'123'},'','first-login'),error=>error.curtainRequired===true);
 const session=await login(service);assert.equal((await call(service,'read',{},'',session)).actor.id,id);
 await assert.rejects(call(service,'read',{},'',{officeToken:session.officeToken}),error=>error.curtainRequired===true);
});
