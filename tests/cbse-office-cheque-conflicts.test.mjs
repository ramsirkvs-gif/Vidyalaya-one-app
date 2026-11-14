import test from 'node:test';
import assert from 'node:assert/strict';
import {officeChequeConflicts} from '../cbse-office-model.js';
const rows={one:{id:'one',bank:'S.B.I.',chequeNo:'001234',chequeAmount:'₹ 10,000.00',amount:'100'},two:{id:'two',bank:'UBI',chequeNo:'1234',chequeAmount:'200'}};
test('same bank and cheque warns only when recorded cheque amount differs',()=>{
 assert.equal(officeChequeConflicts(rows,{bank:' sbi ',chequeNo:'1234',chequeAmount:'11000'}).length,1);
 assert.equal(officeChequeConflicts(rows,{bank:'SBI',chequeNo:'1234',chequeAmount:'10000',amount:'200'}).length,0);
 assert.equal(officeChequeConflicts(rows,{bank:'OTHER',chequeNo:'1234',chequeAmount:'11000'}).length,0);
 assert.equal(officeChequeConflicts(rows,{bank:'SBI',chequeNo:'9999',chequeAmount:'11000'}).length,0);
 assert.equal(officeChequeConflicts(rows,{bank:'SBI',chequeNo:'1234',chequeAmount:''}).length,0);
 assert.equal(officeChequeConflicts(rows,{bank:'SBI',chequeNo:'1234',chequeAmount:'11000'},'one').length,0);
});

test('UBI cheque 613 across vouchers compares the full cheque amount, including Indian comma notation',()=>{const records={a:{id:'a',voucherNo:'101',bank:'UBI',chequeNo:'613',chequeAmount:'2,46,078',amount:'12000'},b:{id:'b',voucherNo:'102',bank:'UBI',chequeNo:'613',chequeAmount:'246078.00',amount:'30000'}};assert.equal(officeChequeConflicts(records,{bank:'ubi',chequeNo:'000613',chequeAmount:'2,46,078'}).length,0);assert.equal(officeChequeConflicts(records,{bank:'UBI',chequeNo:'613',chequeAmount:'2,46,780'}).length,2);});
test('commas and decimal zeroes never cause false cheque amount mismatch warnings',()=>{const rows={a:{id:'a',bank:'UBI',chequeNo:'613',chequeAmount:'3,385'}};for(const chequeAmount of ['3385','3,385','3,385.00','3385.0'])assert.equal(officeChequeConflicts(rows,{bank:'UBI',chequeNo:'613',chequeAmount}).length,0);assert.equal(officeChequeConflicts(rows,{bank:'UBI',chequeNo:'613',chequeAmount:'3,386'}).length,1);});
