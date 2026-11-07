import {el,head,cell} from './cbse-ui.js';
import {studentRemedialParticipation} from './cbse-remedial-participation.js';
export function renderRemedialProfileAttendance(parent,mission,key,subjectScope=[]){
 const rows=studentRemedialParticipation(mission,key,subjectScope),details=el('details',undefined,'student-remedial-participation');
 details.append(el('summary','Remedial classes attended · '+rows.length+' · Principal approved'));
 if(!rows.length)details.append(el('p','No Principal-approved remedial attendance recorded yet.','muted'));
 else{
  const wrap=el('div',undefined,'table-scroll'),table=el('table'),thead=el('thead'),body=el('tbody');head(thead,['Date','Subject','Teacher','Time','Topic','Attendance / approval']);
  for(const record of rows){const row=el('tr');for(const value of [record.date,record.subjectName,record.teacherName,record.start+'–'+record.end,record.purpose,record.status])cell(row,value||'—');body.append(row);}
  table.append(thead,body);wrap.append(table);details.append(wrap);
 }
 parent.append(details);
}
