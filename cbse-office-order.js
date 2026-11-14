import {officeFinancialYear} from './cbse-office-dates.js';
// Newest financial year first, then highest voucher number; retain every source row.
export function officeVoucherRows(rows){
 const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
 return Object.values(rows||{}).sort((a,b)=>{
  const left=String(a.voucherNo||'').trim(),right=String(b.voucherNo||'').trim();
  if(Boolean(left)!==Boolean(right))return left?-1:1;
  if(/^\d/.test(left)!==/^\d/.test(right))return /^\d/.test(left)?-1:1;
  const leftYear=officeFinancialYear(a),rightYear=officeFinancialYear(b);if(leftYear!==rightYear)return (rightYear??-Infinity)-(leftYear??-Infinity);
  return collator.compare(right,left);
 });
}
