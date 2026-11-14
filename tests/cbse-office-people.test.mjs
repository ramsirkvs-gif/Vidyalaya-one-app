import test from 'node:test';
import assert from 'node:assert/strict';
import {officeRegularDirectory} from '../cbse-office-regular.js';
import {officeVoucherPeople} from '../cbse-office-people.js';
import {searchOfficeRows} from '../cbse-office-model.js';
const directory=officeRegularDirectory({});
const idFor=name=>Object.entries(directory).find(([,person])=>person.name===name)?.[0];
test('workbook short names resolve to the exact official names supplied by Principal',()=>{
 const cases=[['TADA of Mr. Ajay KC','MR. AJAY KR. CHAUBEY'],['TADA of transfer of Pooranamal Meena 1/3','Mr. POORAN MAL MEENA'],['Petrol for Karmyogi Mr Bori','Mr. ARJUN BORI'],['Petrol for Karmyogi Mr Paul','MR. JITENDER PAUL'],['TADA Mr. Ajaya Pratap Dimapur youth Parliament','Ajay Pratap Singh Chauhan'],['TADA Ms. Anjali Dimapur youth Parliament','MS. ANJALI'],['TADA of HM rohatsh','Mr. ROTHASH'],['TADA of Mr. Rohtas, HM','Mr. ROTHASH'],['TADA of Mr. BL Meena','Mr. BHARAT LAL MEENA'],['TADA of Mr. DK Meena','DEVENDRA KUMAR MEENA'],['TD DA Principal passed from RO','MR. RAMKUMAR SINGH SIKARWAR'],['TADA of Mrs. ET Zirdo','Mrs. EJUM TAIPODIA ZIRDO']];
 for(const [details,name]of cases)assert.ok(officeVoucherPeople({details},directory).concerned.some(person=>person.name===name),details);
});
test('name selection and Pending search find unassigned legacy vouchers using their original short-name text',()=>{
 for(const [details,name]of [['TADA Mr Ajay KC','MR. AJAY KR. CHAUBEY'],['TADA of transfer of Pooranamal Meena 1/3','Mr. POORAN MAL MEENA'],['TADA Ms Anjali','MS. ANJALI'],['TADA HM Rohatsh','Mr. ROTHASH']]){
  const row={voucherNo:'225',status:'pending',details};const before=structuredClone(row),id=idFor(name);assert.equal(searchOfficeRows({row},{query:'pending',assignee:id,directory}).length,1);assert.equal(searchOfficeRows({row},{query:name,directory}).length,1);assert.deepEqual(row,before);
 }
});
test('Pooran Mal Meena remains distinct from Pooran',()=>{assert.deepEqual(officeVoucherPeople({details:'Pooranamal Meena'},directory).concerned.map(person=>person.name),['Mr. POORAN MAL MEENA']);assert.deepEqual(officeVoucherPeople({details:'Pooran PRT'},directory).concerned.map(person=>person.name),['MR. POORAN']);});
test('long and qualified names distinguish staff with shared first names',()=>{
 assert.deepEqual(officeVoucherPeople({details:'TADA Mr Sushil Kumar'},directory).concerned.map(person=>person.name),['Mr. SUSHIL KUMAR']);assert.deepEqual(officeVoucherPeople({details:'Mr Sushil PRT'},directory).concerned.map(person=>person.name),['MR. SUSHIL']);assert.deepEqual(officeVoucherPeople({details:'Mr Sushil'},directory).concerned.map(person=>person.name),['MR. SUSHIL']);
});
test('unassigned published or draft vouchers belong to their office IC for display and Pending search',()=>{
 const row={voucherNo:'175',details:'Tax payment',status:'pending',assignedIds:[],sourceResponsible:''},before=structuredClone(row);
 for(const [ownerId,name]of [['pramod-paswan','Mr. Pramod Paswan'],['sumit-puri','MR. SUMIT PURI'],['arjun-bori','Mr. ARJUN BORI']]){const person=officeVoucherPeople(row,directory,ownerId);assert.equal(person.defaulted,true);assert.deepEqual(person.responsible.map(p=>p.name),[name]);assert.equal(searchOfficeRows({row},{query:name,status:'pending',ownerId,directory}).length,1);assert.equal(searchOfficeRows({row},{assignee:'office:'+ownerId,status:'pending',ownerId,directory}).length,1);}assert.deepEqual(row,before);
 const assigned={...row,assignedIds:['office:sumit-puri']};assert.equal(officeVoucherPeople(assigned,directory,'pramod-paswan').defaulted,false);assert.equal(searchOfficeRows({assigned},{assignee:'office:pramod-paswan',ownerId:'pramod-paswan',directory}).length,0);
 const named={...row,sourceResponsible:'Mr Ajay KC'};assert.equal(officeVoucherPeople(named,directory,'pramod-paswan').defaulted,false);
});
