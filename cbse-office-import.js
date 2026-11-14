import {matchOfficeResponsibility} from './cbse-office-model.js';
const str=value=>{
 if(value===null||value===undefined)return '';
 if(value instanceof Date)return value.toISOString().slice(0,10);
 if(typeof value==='object'){if(value.result!==undefined)return str(value.result);if(value.text!==undefined)return String(value.text);if(value.richText)return value.richText.map(item=>item.text).join('');throw Error('Unsupported spreadsheet cell. Review its value before importing.');}
 return String(value).trim();
};
const range=value=>{const match=String(value).match(/^\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/);return match?[Number(match[1]),Number(match[2]||match[1])]:null;};
export function mergeOfficeAuditSheets(sheets,directory={}){
 const cheques=sheets.find(sheet=>sheet.name.trim().toLowerCase()==='sf'),vouchers=sheets.find(sheet=>sheet.name.trim().toLowerCase()==='sf vouchers');
 if(!cheques||!vouchers)throw Error('This workbook needs both SF and SF Vouchers sheets. They are imported into one register.');
 const payments=[],rows=[],warnings=[];let notes='';
 for(const {number,values} of cheques.rows){
  if(number<5){if(number<=2)for(const value of [values[0],values[11]])if(str(value))notes+=(notes?'\n':'')+str(value);continue;}
  const v=values.map(str);if(!v.slice(1,10).some(Boolean))continue;
  payments.push({sourceRow:number,chequeDate:v[1]||'',chequeNo:v[2]||'',bank:v[3]||'',chequeAmount:v[4]||'',voucherCount:v[5]||'',voucherRange:v[6]||'',voucherFile:v[7]||'',summarySheet:v[8]||'',registerPage:v[9]||'',used:false});
 }
 for(const {number,values} of vouchers.rows){
  if(number<=3)continue;const v=values.map(str);if(!v.slice(0,7).some(Boolean))continue;
  if(!v[0]){warnings.push('SF Vouchers row '+number+': no voucher number; retained as a review row.');}
  const voucher=range(v[0]),matches=voucher?payments.filter(payment=>{const covered=range(payment.voucherRange);return covered&&voucher[0]>=covered[0]&&voucher[1]<=covered[1];}):[];
  // Explicit voucher ranges are used, never a guessed cheque amount or date.
  const payment=matches.length===1?matches[0]:null;if(payment)payment.used=true;
  const {assignedIds,unmatched}=matchOfficeResponsibility(v[5],directory),review=[];
  if(!payment)review.push(matches.length?'Multiple cheque matches — select and verify cheque details.':'No explicit matching cheque range in SF — fill cheque details if applicable.');
  if(unmatched.length)review.push('Confirm responsibility from dropdown: '+unmatched.join('; '));
  if(v[1]&&!/^\d{4}-\d{2}-\d{2}$/.test(v[1]))review.push('Date retained exactly as supplied; review before date filtering.');
  if(v[2]&&!/^-?\d+(?:,\d{2,3})*(?:\.\d{1,2})?$/.test(v[2]))review.push('Amount retained exactly as supplied; verify its notation.');
  if(payment&&payment.chequeDate!==v[1])review.push('Cheque date differs from voucher date; source dates retained.');
  if(payment)review.push('Cheque source: SF row '+payment.sourceRow);
  const resolution=v[6]||'',status=/^(?:yes|successfully removed|removed successfully)\s*$/i.test(resolution)?'resolved':/^(?:na|n\/a)\s*$/i.test(v[4]||'')?'not-applicable':'pending';
  rows.push({task:'Pre-National audit Vidyalaya Level internal audit Paras',fund:'SF',voucherNo:v[0]||'',voucherDate:v[1]||'',amount:v[2]||'',details:v[3]||'',objections:v[4]||'',sourceResponsible:v[5]||'',resolution,status,assignedIds,...Object.fromEntries(Object.entries(payment||{}).filter(([key])=>!['used','sourceRow'].includes(key))),reviewNote:review.join('\n'),sourceKey:'audit-2026:SF Vouchers:'+number});
 }
 for(const payment of payments.filter(p=>!p.used))rows.push({task:'Pre-National audit Vidyalaya Level internal audit Paras',fund:'SF',voucherNo:'',voucherDate:'',amount:'',details:'Cheque entry — voucher details awaiting reconciliation',objections:'',sourceResponsible:'SSA',resolution:'',status:'pending',assignedIds:directory['office:pramod-paswan']?['office:pramod-paswan']:[],...Object.fromEntries(Object.entries(payment).filter(([key])=>!['used','sourceRow'].includes(key))),reviewNote:'No explicit matching voucher range was supplied. Cheque retained without guessing voucher links.',sourceKey:'audit-2026:SF:'+payment.sourceRow});
 return {version:1,memberId:'pramod-paswan',rows,notes,warnings,counts:{cheques:payments.length,vouchers:rows.length-payments.filter(p=>!p.used).length,unlinkedCheques:payments.filter(p=>!p.used).length,total:rows.length}};
}
export async function readOfficeWorkbook(buffer,ExcelJS,directory){
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer);return mergeOfficeAuditSheets(workbook.worksheets.map(sheet=>{const rows=[];sheet.eachRow({includeEmpty:false},(row,number)=>{rows.push({number,values:Array.from({length:Math.min(sheet.columnCount,28)},(_,index)=>row.getCell(index+1).value)});});return {name:sheet.name,rows};}),directory);
}
