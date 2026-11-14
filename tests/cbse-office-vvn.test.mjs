import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeOfficeAuditSheets} from '../cbse-office-import.js';
import {officeFixture} from './office-fixture.mjs';
const sheets=[{name:'VVN',rows:[{number:5,values:[1,'2025-03-05','100','SBI','1000','1','346']},{number:6,values:[2,'2026-03-05','101','SBI','2000','1','346']}]},{name:'VVN Vouchers',rows:[{number:4,values:[1,346,'2025-03-05','1000','Example','Objection','JSA','No']},{number:5,values:[2,346,'2026-03-05','2000','Example 2','Objection','JSA','Yes']}]}];
test('VVN column offset, repeated voucher years and Sumit ownership are retained',()=>{
 const output=mergeOfficeAuditSheets(sheets,{'office:sumit-puri':{name:'Mr. Sumit Puri'}},'sumit-puri');assert.equal(output.memberId,'sumit-puri');assert.equal(output.rows.length,2);assert.equal(output.rows[0].voucherNo,'346');assert.equal(output.rows[0].chequeNo,'100');assert.equal(output.rows[1].chequeNo,'101');assert.equal(output.rows[0].fund,'VVN');assert.match(output.rows[0].task,/VVN Fund/);assert.deepEqual(output.rows[0].assignedIds,['office:sumit-puri']);assert.equal(output.rows[1].status,'resolved');assert.match(output.rows[0].sourceKey,/VVN Vouchers:4/);
});
test('Principal imports VVN into Sumit workspace while Pramod records stay separate',async()=>{
 const f=officeFixture(),memberId='sumit-puri',output=mergeOfficeAuditSheets(sheets,{},memberId);const before=(await f.db.ref('cbse/office/workspaces/pramod-paswan').get()).val();await f.service('office-workspace',{operation:'import',memberId,expectedRevision:0,rows:output.rows},'principal');const result=await f.service('office-workspace',{operation:'read',memberId},'principal');assert.equal(Object.keys(result.workspace.rows).length,2);assert.deepEqual((await f.db.ref('cbse/office/workspaces/pramod-paswan').get()).val(),before);
});
