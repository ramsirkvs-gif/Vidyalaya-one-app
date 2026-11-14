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
