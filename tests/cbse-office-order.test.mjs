import test from 'node:test';
import assert from 'node:assert/strict';
import {officeVoucherRows} from '../cbse-office-order.js';
test('all voucher rows sort naturally, including ranges, suffixes and cheque-only records',()=>{
 const rows=Object.fromEntries(['276','21','2','100 B','100 A','239-241','1',''].map((voucherNo,index)=>['random_'+index,{id:'row_'+index,voucherNo,chequeNo:String(index)}]));
 const before=structuredClone(rows),sorted=officeVoucherRows(rows);assert.deepEqual(sorted.map(row=>row.voucherNo),['1','2','21','100 A','100 B','239-241','276','']);assert.equal(sorted.length,Object.keys(rows).length);assert.deepEqual(rows,before);
});
test('large registers keep every row without pagination or dropping duplicate voucher numbers',()=>{
 const rows=Object.fromEntries(Array.from({length:220},(_,index)=>['random_'+index,{id:'row_'+index,voucherNo:String(220-index)}]));rows.extra={id:'extra',voucherNo:'21'};const sorted=officeVoucherRows(rows);assert.equal(sorted.length,221);assert.equal(sorted[0].voucherNo,'1');assert.equal(sorted.at(-1).voucherNo,'220');assert.equal(sorted.filter(row=>row.voucherNo==='21').length,2);
});
