import test from 'node:test';
import assert from 'node:assert/strict';
import {officeRegularDirectory} from '../cbse-office-regular.js';
import {officeVoucherPeople} from '../cbse-office-people.js';
import {searchOfficeRows} from '../cbse-office-model.js';
const directory=officeRegularDirectory({});
const idFor=name=>Object.entries(directory).find(([,person])=>person.name===name)?.[0];
test('workbook short names resolve to the exact official names supplied by Principal',()=>{
 const cases=[['TADA of Mr. Ajay KC','MR. AJAY KR. CHAUBEY'],['TADA Ms. Anjali Dimapur youth Parliament','MS. ANJALI'],['TADA of HM rohatsh','Mr. ROTHASH'],['TADA of Mr. Rohtas, HM','Mr. ROTHASH'],['TADA of Mr. BL Meena','Mr. BHARAT LAL MEENA'],['TADA of Mr. DK Meena','DEVENDRA KUMAR MEENA'],['TD DA Principal passed from RO','MR. RAMKUMAR SINGH SIKARWAR'],['TADA of Mrs. ET Zirdo','Mrs. EJUM TAIPODIA ZIRDO']];
 for(const [details,name]of cases)assert.ok(officeVoucherPeople({details},directory).concerned.some(person=>person.name===name),details);
});
test('name selection and Pending search find unassigned legacy vouchers using their original short-name text',()=>{
 for(const [details,name]of [['TADA Mr Ajay KC','MR. AJAY KR. CHAUBEY'],['TADA Ms Anjali','MS. ANJALI'],['TADA HM Rohatsh','Mr. ROTHASH']]){
  const row={voucherNo:'225',status:'pending',details};const before=structuredClone(row),id=idFor(name);assert.equal(searchOfficeRows({row},{query:'pending',assignee:id,directory}).length,1);assert.equal(searchOfficeRows({row},{query:name,directory}).length,1);assert.deepEqual(row,before);
 }
});
test('long and qualified names distinguish staff with shared first names',()=>{
 assert.deepEqual(officeVoucherPeople({details:'TADA Mr Sushil Kumar'},directory).concerned.map(person=>person.name),['Mr. SUSHIL KUMAR']);assert.deepEqual(officeVoucherPeople({details:'Mr Sushil PRT'},directory).concerned.map(person=>person.name),['MR. SUSHIL']);assert.deepEqual(officeVoucherPeople({details:'Mr Sushil'},directory).concerned.map(person=>person.name),['MR. SUSHIL']);
});
