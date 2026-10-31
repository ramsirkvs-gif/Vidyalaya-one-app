import {el,head,cell} from './cbse-ui.js';
import {attendanceDate} from './cbse-attendance-display.js';
const month=p=>new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(p+'-01T00:00:00Z'));
const percentage=v=>v.working?(v.present/v.working*100).toFixed(2)+'%':'—';
function table(parent,columns){const scroll=el('div',undefined,'table-scroll'),t=el('table'),h=el('thead'),b=el('tbody');head(h,columns);t.append(h,b);scroll.append(t);parent.append(scroll);return b;}
export function renderAttendanceDetails(parent,key,mission){
 const records=Object.values(mission.attendanceRegisters||{}).filter(r=>r.studentKey===key).sort((a,b)=>a.period.localeCompare(b.period));if(!records.length)return;
 const details=el('details',undefined,'attendance-details');details.append(el('summary','Attendance details · month-wise'));const body=table(details,['Month','Attended / working','Percentage','Arrear','Cumulative']);
 for(const r of records){const row=el('tr');cell(row,month(r.period));cell(row,r.current.present+'/'+r.current.working);cell(row,percentage(r.current));cell(row,r.arrear?r.arrear.present+'/'+r.arrear.working:'—');cell(row,r.total.present+'/'+r.total.working+' · '+percentage(r.total));body.append(row);}
 const first=records[0];if(first.previous.working)details.append(el('p',`Before ${month(first.period)} (combined): ${first.previous.present}/${first.previous.working} · ${percentage(first.previous)}. Separate earlier months were not supplied.`,'muted'));
 for(const r of records){const daily=el('details',undefined,'register-daily-details');daily.append(el('summary',month(r.period)+' · daily entries'));const rows=table(daily,['Date','Status']),labels={P:'Present',A:'Absent',H:'Holiday',S:'Sunday',L:'Leave',ML:'Medical leave · counted present','O/D':'On duty · counted present',NF:'Not filled'};r.days.forEach((code,i)=>{const row=el('tr');cell(row,`${String(i+1).padStart(2,'0')}-${r.period.slice(5)}-${r.period.slice(0,4)}`);cell(row,labels[code]||code);rows.append(row);});daily.append(el('p',`Source: ${r.sourceFile} · Attendance through ${attendanceDate(r.asOf)}`,'muted'));details.append(daily);}
 parent.append(details);
}
