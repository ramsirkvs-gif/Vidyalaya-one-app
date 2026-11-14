import test from 'node:test';
import assert from 'node:assert/strict';
import {officeVoucherRows} from '../cbse-office-order.js';
test('all voucher rows sort naturally, including ranges, suffixes and cheque-only records',()=>{
 const rows=Object.fromEntries(['276','21','2','100 B','100 A','239-241','1',''].map((voucherNo,index)=>['random_'+index,{id:'row_'+index,voucherNo,chequeNo:String(index)}]));
 const before=structuredClone(rows),sorted=officeVoucherRows(rows);assert.deepEqual(sorted.map(row=>row.voucherNo),['276','239-241','100 B','100 A','21','2','1','']);assert.equal(sorted.length,Object.keys(rows).length);assert.deepEqual(rows,before);
});
test('large registers keep every row without pagination or dropping duplicate voucher numbers',()=>{
 const rows=Object.fromEntries(Array.from({length:220},(_,index)=>['random_'+index,{id:'row_'+index,voucherNo:String(220-index)}]));rows.extra={id:'extra',voucherNo:'21'};const sorted=officeVoucherRows(rows);assert.equal(sorted.length,221);assert.equal(sorted[0].voucherNo,'220');assert.equal(sorted.at(-1).voucherNo,'1');assert.equal(sorted.filter(row=>row.voucherNo==='21').length,2);
});

test('financial-year reset puts post-March vouchers above larger numbers from the previous year',()=>{
 const rows={old:{voucherNo:'278',voucherDate:'2025-03-31'},new:{voucherNo:'1',voucherDate:'2025-05-05'},later:{voucherNo:'157',voucherDate:'2025-09-17'},january:{voucherNo:'160',voucherDate:'2026-01-12'},next:{voucherNo:'2',voucherDate:'2026-04-02'}};
 assert.deepEqual(officeVoucherRows(rows).map(row=>row.voucherNo),['2','160','157','1','278']);
});
test('dates display as DD/MM/YYYY without guessing malformed dates or losing source ranges',async()=>{
 const {officeDisplayDate,officeISODate,officeFinancialYear}=await import('../cbse-office-dates.js');assert.equal(officeDisplayDate('2025-03-31'),'31/03/2025');assert.equal(officeDisplayDate('5/5/2025'),'05/05/2025');assert.equal(officeISODate('05/05/2025'),'2025-05-05');assert.equal(officeDisplayDate('06-07/03/2025'),'06-07/03/2025');assert.equal(officeDisplayDate('2025-02-31'),'2025-02-31');assert.equal(officeFinancialYear({voucherDate:'31/03/2025'}),2024);assert.equal(officeFinancialYear({voucherDate:'01/04/2025'}),2025);
});

test('voucher dates alone determine financial years, regardless of entry/update time',()=>{
 const createdAt=Date.parse('2026-11-14T10:00:00Z'),rows={existing:{voucherNo:'157',voucherDate:'2026-09-17'},added158:{voucherNo:'158',voucherDate:'03/10/2025',createdAt},added159:{voucherNo:'159',voucherDate:'03/10/2025',createdAt,updatedAt:createdAt+86400000}};
 assert.deepEqual(officeVoucherRows(rows).map(row=>row.voucherNo),['157','159','158']);assert.equal(rows.added158.voucherDate,'03/10/2025');
});
test('undated imported rows and explicitly dated manual vouchers retain their original financial-year treatment',async()=>{
 const {officeFinancialYear}=await import('../cbse-office-dates.js');const createdAt=Date.parse('2026-11-14T10:00:00Z');assert.equal(officeFinancialYear({sourceKey:'import:1',createdAt}),null);assert.equal(officeFinancialYear({createdAt}),null);assert.equal(officeFinancialYear({voucherDate:'2025-03-31',createdAt}),2024);assert.equal(officeFinancialYear({voucherDate:'unclear source date',createdAt}),null);
});
