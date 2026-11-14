// Read source dates conservatively; numbering restarts on 1 April.
export function officeDateParts(value){
 const text=String(value||'').trim();let year,month,day,firstDay;
 let match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(match){[,year,month,day]=match;}else{
  match=text.match(/^(\d{1,2})(?:-(\d{1,2}))?\/(\d{1,2})\/(\d{4})$/);
  if(!match)return null;firstDay=match[2]?Number(match[1]):undefined;day=match[2]||match[1];month=match[3];year=match[4];
 }
 year=Number(year);month=Number(month);day=Number(day);const valid=d=>{const date=new Date(Date.UTC(year,month-1,d));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===d;};
 if(!valid(day)||firstDay!==undefined&&(!valid(firstDay)||firstDay>day))return null;
 return {year,month,day,...(firstDay!==undefined?{firstDay}:{})};
}
export function officeDisplayDate(value){const date=officeDateParts(value);if(!date)return String(value||'');const pad=value=>String(value).padStart(2,'0');return (date.firstDay!==undefined?pad(date.firstDay)+'-':'')+pad(date.day)+'/'+pad(date.month)+'/'+date.year;}
export function officeISODate(value){const date=officeDateParts(value);return date&&date.firstDay===undefined?`${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`:'';}
export function officeFinancialYear(row){const date=officeDateParts(row.voucherDate);return date?date.year-(date.month<4?1:0):null;}
