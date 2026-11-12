import {rollDisplayName} from './cbse-roll-call-roster.js';
import {el} from './cbse-ui.js';
import {rollStaffStatus} from './cbse-roll-call-status.js';
import {rollDateText} from './cbse-roll-call-time.js';
export function renderDailyRollRegister(parent,data,wing,period,onOpen){
 const section=el('section',undefined,'roll-daily-register'),table=el('table',undefined,'roll-staff-table'),head=el('thead'),heading=el('tr'),body=el('tbody');
 section.append(el('h3',period==='morning'?'Morning Roll Call · '+rollDateText(data.serverDate):'Afternoon Roll Call · '+rollDateText(data.serverDate)));
 for(const text of ['S.No.','Name and designation','Roll Call / present in Vidyalaya','Status / submit'])heading.append(el('th',text));head.append(heading);table.append(head,body);
 for(const p of rollStaffStatus(data,wing,{includeLongLeave:true})){
  const row=el('tr',undefined,'roll-staff-row');row.dataset.staffId=p.id;
  const cell=(label)=>{const td=el('td');td.dataset.label=label;row.append(td);return td;};
  cell('S.No.').textContent=String(p.serial);const name=cell('Name and designation');name.append(el('strong',p.name),el('small',p.designation||''));
  const r=p[period],leave=p.advanceLeave||p.longLeave,excused=!!leave||(period==='morning'?p.morningExcused:p.afternoonLeave),present=r&&(r.reported==='yes'||period==='afternoon'&&!r.reported);
  cell('Roll Call / present in Vidyalaya').append(el('span',present?'Yes · Roll Call submitted':r?'Roll Call submitted · on leave':'No · not submitted',present?'roll-rc-reported':'roll-rc-missing'));
  const status=cell('Status / submit');
  if(excused){const dates=leave?.dates?.filter(d=>!leave.cancelledDates?.includes(d))||[],till=leave?.to||dates.filter(d=>d>=data.serverDate).sort().at(-1);status.append(el('span',till?'On leave · recorded dates through '+rollDateText(till):'On leave · Roll Call not required','roll-rc-leave'));}
  else if(r)status.append(el('span',r.status==='approved'?'Approved':r.status==='not-approved'?'Not approved · discuss with Principal':'Submitted · waiting for Principal review',r.status==='approved'?'roll-rc-approved':'roll-rc-status'));
  else status.append(el('span','No recorded leave · Roll Call not submitted','roll-rc-missing'));
  if(p.id&&!excused&&r?.status!=='approved'){const b=el('button',r?'View / update Roll Call':'Submit Roll Call',r?'':'roll-submit-missing');b.type='button';b.setAttribute('aria-label',(r?'View / update Roll Call for ':'Submit Roll Call for ')+p.name);b.onclick=()=>onOpen(p.id);status.append(b);}else if(!p.id)status.append(el('small','Staff profile setup pending'));
  body.append(row);
 }
 section.append(table);parent.append(section);
}
export function renderReportedLeaveRegister(parent,data,wing){
 const section=el('section',undefined,'roll-leave-register');section.append(el('h3','Reported leave · staff coordination'),el('p','For Samagam, timetable arrangements and CT / Co-CT accountability. This is not an office leave application or sanction.'));
 const table=el('table',undefined,'roll-staff-table'),head=el('thead'),tr=el('tr'),body=el('tbody');for(const label of ['S.No.','Name and designation','Leave dates','Type of leave','Remark / Roll Call'])tr.append(el('th',label));head.append(tr);table.append(head,body);
 const records=Object.values(data.rollCall?.advanceLeaves||{}).filter(r=>r.wing===wing&&r.dates?.some(d=>!r.cancelledDates?.includes(d))).sort((a,b)=>(b.submittedAt||0)-(a.submittedAt||0));
 records.forEach((r,i)=>{const row=el('tr',undefined,'roll-staff-row'),person=data.staff[r.staffId],dates=r.dates.filter(d=>!r.cancelledDates?.includes(d));for(const [label,value]of [['S.No.',String(i+1)],['Name and designation',rollDisplayName(r.name)+(person?.designation?' · '+person.designation:'')],['Leave dates',dates.map(rollDateText).join(', ')],['Type of leave',r.leaveKind||'Not specified (earlier report)'],['Remark / Roll Call',r.status==='recorded'?'Recorded · no Roll Call on selected dates':r.status==='pending'?'Review pending · Roll Call required':'Not approved · Roll Call required']]){const td=el('td',value);td.dataset.label=label;row.append(td);}body.append(row);});
 section.append(table);if(!records.length)section.append(el('p','No leave reports for this wing.'));parent.append(section);
}
