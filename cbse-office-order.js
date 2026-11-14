// Natural voucher order: 2 precedes 21; 100 A precedes 100 B. Preserve every row.
export function officeVoucherRows(rows){
 const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
 return Object.values(rows||{}).sort((a,b)=>{
  const left=String(a.voucherNo||'').trim(),right=String(b.voucherNo||'').trim();
  if(Boolean(left)!==Boolean(right))return left?-1:1;
  return collator.compare(left,right)||collator.compare(String(a.voucherDate||a.chequeDate||''),String(b.voucherDate||b.chequeDate||''))||collator.compare(String(a.chequeNo||''),String(b.chequeNo||''))||collator.compare(String(a.sourceKey||a.id||''),String(b.sourceKey||b.id||''));
 });
}
