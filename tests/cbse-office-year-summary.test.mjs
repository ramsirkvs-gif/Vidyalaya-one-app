import test from 'node:test';
import assert from 'node:assert/strict';
import {officeYearSummary} from '../cbse-office-model.js';
test('consolidated voucher totals keep repeated numbers in their own financial years',()=>{
 const report=officeYearSummary({a:{voucherNo:'1',voucherDate:'2025-03-31',status:'resolved'},b:{voucherNo:'1',voucherDate:'2025-04-01',status:'pending'},c:{voucherNo:'2',voucherDate:'2026-03-31',status:'resolved'},d:{voucherNo:'3',status:'pending'},e:{chequeNo:'99',status:'pending'}});
 assert.deepEqual(report,{groups:[{year:2025,total:2,pending:1,done:1},{year:2024,total:1,pending:0,done:1},{year:null,total:1,pending:1,done:0}],otherRecords:1});
});
