import {parseCSVRows} from './cbse-basic-import.js';
const normal=value=>String(value||'').trim().replace(/\s+/g,' ').toUpperCase();
export function validatePINRows(rows,staff){
 if(!Array.isArray(rows)||!rows.length||rows.length>200)throw Error('Import between 1 and 200 staff PIN rows.');
 const seen=new Set();
 return rows.map((r,i)=>{
  if(!r||typeof r!=='object'||Array.isArray(r))throw Error(`Row ${i+2}: invalid staff entry.`);
  const id=String(r.staffId||''),person=Object.hasOwn(staff,id)?staff[id]:null;
  if(!person||person.status!=='active')throw Error(`Row ${i+2}: staff ID is missing, inactive or unknown. Download a fresh staff template.`);
  if(seen.has(id))throw Error(`Row ${i+2}: duplicate staff ID.`);seen.add(id);
  if(!normal(r.name)||normal(r.name)!==normal(person.name))throw Error(`Row ${i+2}: name does not match the staff ID. Check the current faculty list.`);
  if(typeof r.pin!=='string'||!/^\d{3}$/.test(r.pin))throw Error(`Row ${i+2}: PIN must contain exactly three digits.`);
  if(typeof r.enabled!=='boolean')throw Error(`Row ${i+2}: Enabled must be Yes or No.`);
  return {staffId:id,name:person.name,pin:r.pin,enabled:r.enabled};
 });
}
export function parsePINCSV(text,staff){
 const rows=parseCSVRows(text.replace(/^\uFEFF/,'')),header=rows.shift()||[],expected=['StaffID','StaffName','PIN','Enabled'];
 if(new Set(header).size!==header.length||!expected.every(h=>header.includes(h)))throw Error('Expected columns: StaffID, StaffName, PIN, Enabled.');
 return validatePINRows(rows.map((values,i)=>{
  if(values.length!==header.length)throw Error(`Row ${i+2}: wrong number of columns.`);
  const r=Object.fromEntries(header.map((h,j)=>[h,values[j]])),enabled=normal(r.Enabled);
  if(!['YES','NO'].includes(enabled))throw Error(`Row ${i+2}: Enabled must be Yes or No.`);
  return {staffId:r.StaffID,name:r.StaffName,pin:r.PIN,enabled:enabled==='YES'};
 }),staff);
}
export function pinTemplateCSV(staff){
 const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 return '\uFEFF'+[['StaffID','StaffName','Class','PIN','Enabled'],...Object.entries(staff).filter(([,p])=>p.status==='active').map(([id,p])=>[id,p.name,p.classId||p.kind,'','Yes'])].map(row=>row.map(quote).join(',')).join('\r\n');
}
