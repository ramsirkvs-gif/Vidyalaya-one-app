// Highest voucher numbers first, preserving every row and keeping cheque-only entries last.
export function officeVoucherRows(rows){
 const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
 return Object.values(rows||{}).sort((a,b)=>{
  const left=String(a.voucherNo||'').trim(),right=String(b.voucherNo||'').trim();
  if(Boolean(left)!==Boolean(right))return left?-1:1;
  if(/^\d/.test(left)!==/^\d/.test(right))return /^\d/.test(left)?-1:1;
  return collator.compare(right,left)||collator.compare(String(b.voucherDate||b.chequeDate||''),String(a.voucherDate||a.chequeDate||''))||collator.compare(String(a.chequeNo||''),String(b.chequeNo||''))||collator.compare(String(a.sourceKey||a.id||''),String(b.sourceKey||b.id||''));
 });
}
