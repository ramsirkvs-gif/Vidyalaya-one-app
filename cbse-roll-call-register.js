import {rollRecorded} from './cbse-roll-call-model.js';
import {advanceLeaveStatus} from './cbse-advance-leave-model.js';
import {rollDisplayName} from './cbse-roll-call-roster.js';
import {el} from './cbse-ui.js';
import {rollStaffStatus} from './cbse-roll-call-status.js';
import {rollDateText} from './cbse-roll-call-time.js';
export function renderDailyRollRegister(parent,data,wing,period,onOpen){
 const section=el('section',undefined,'roll-daily-register'),table=el('table',undefined,'roll-staff-table'),head=el('thead'),heading=el('tr'),body=el('tbody');
 section.append(el('h3',period==='morning'?'Morning Roll Call · '+rollDateText(data.serverDate):'Afternoon Roll Call · '+rollDateText(data.serverDate)));
 for(const text of ['S.No.','Name and designation','Roll Call / present in Vidyalaya','Status / submit'])heading.append(el('th',text));head.append(heading);table.append(head,body);
 const people=rollStaffStatus(data,wing,{includeLongLeave:true});
 const leaveToday=p=>!!(p.advanceLeave||p.longLeave)||p.morningExcused||p.afternoonLeave||[p.morning,p.afternoon].some(r=>r?.status==='approved'&&r.leaveType&&r.leaveType!=='none');
 // Stable partition preserves the roster order within each group.
 for(const p of [...people.filter(leaveToday),...people.filter(p=>!leaveToday(p))]){
  const row=el('tr',undefined,'roll-staff-row');row.dataset.staffId=p.id;
  const cell=(label)=>{const td=el('td');td.dataset.label=label;row.append(td);return td;};
  cell('S.No.').textContent=String(p.serial);const name=cell('Name and designation');name.append(el('strong',p.name),el('small',p.designation||''));
  const r=p[period],leave=p.advanceLeave||p.longLeave,excused=!!leave||(period==='morning'?p.morningExcused:p.afternoonLeave),present=r&&(r.reported==='yes'||period==='afternoon'&&!r.reported);
  cell('Roll Call / present in Vidyalaya').append(el('span',excused?'Leave / OD outside · exempt from Roll Call':present?'Present':r?'Roll Call submitted · Leave / OD outside':'No · not submitted',excused?'roll-rc-leave':present?'roll-rc-reported':'roll-rc-missing'));
  const status=cell('Status / submit');
  if(r)status.append(el('strong',period==='afternoon'?'✓ Submitted successfully':'Submitted successfully','roll-rc-reported'));
  if(p.principalHolds.length){status.append(el('strong','Principal hold · NOC required','roll-warning'));for(const hold of p.principalHolds)status.append(el('small',hold.remark));}
  if(leaveToday(p))status.append(el('strong','Leave/OD today','roll-rc-leave'));
  if(excused){status.append(el('span',leave?(leave.leaveKind||'Leave / OD outside')+' · recorded for today':period==='morning'?'First-half leave recorded · afternoon Roll Call required':'Approved leave · afternoon Roll Call not required','roll-rc-leave'));}
  else if(r&&!p.principalHolds.length)status.append(el('span',rollRecorded(r)?(r.reported==='no'?'Leave / OD outside recorded':'Present'):r.status==='approved'?'Leave / OD outside recorded':r.status==='blocked'?(period==='afternoon'?'IC objection open · NOC required · contact the concerned IC':'IC objection open · NOC required'):r.status==='not-approved'?'Not approved · discuss with Principal':'Submitted · waiting for Principal review',r.status==='approved'?'roll-rc-approved':'roll-rc-status'));
  else if(!r&&!p.principalHolds.length)status.append(el('span',leaveToday(p)?'Roll Call required for this period · not submitted':'No recorded Leave / OD outside · Roll Call not submitted','roll-rc-missing'));
  for(const comment of Object.values(r?.principalComments||{}))status.append(el('p','Principal: '+comment.text));
  const halfRecord=p.morning?.workflowVersion>=4&&p.morning.leaveType==='half'?p.morning:null;if(excused&&halfRecord)status.append(el('small',rollRecorded(halfRecord)?'Half-day leave recorded':halfRecord.status==='blocked'?'IC clearance required · departure not approved':halfRecord.status==='not-approved'?'Leave not approved · discuss with Principal':'Half-day leave reported · Principal approval awaited'));
  if(p.id&&r&&r.status!=='approved'&&!r.teacherEditLockedAt){const b=el('button','Edit with PIN');b.type='button';b.setAttribute('aria-label','Edit Roll Call for '+p.name);b.onclick=()=>onOpen(r.staffId||p.id,true);status.append(b);}else if(p.id&&!r&&!excused){const b=el('button','Submit Roll Call','roll-submit-missing');b.type='button';b.setAttribute('aria-label','Submit Roll Call for '+p.name);b.onclick=()=>onOpen(p.id,false);status.append(b);}else if(!p.id)status.append(el('small','Staff profile setup pending'));

  body.append(row);
 }
 section.append(table);parent.append(section);
}
export function renderReportedLeaveRegister(parent,data,wing='',onRefresh){
 const section=el('section',undefined,'roll-leave-register');section.append(el('h3',(wing==='primary'?'Primary wing · ':wing==='secondary'?'Secondary wing · ':'All ' )+'Leave / OD outside submissions'),el('p','For Samagam, timetable arrangements and CT / Co-CT accountability. This is not an office leave application or sanction.'));
 if(onRefresh){const refresh=el('button','Refresh submission list');refresh.type='button';refresh.onclick=onRefresh;section.append(refresh);}const table=el('table',undefined,'roll-staff-table'),head=el('thead'),tr=el('tr'),body=el('tbody');for(const label of ['S.No.','Name and designation','Leave / OD outside dates','Type of Leave / OD outside','Status','Principal comment'])tr.append(el('th',label));head.append(tr);table.append(head,body);
 const records=Object.values(data.rollCall?.advanceLeaves||{}).filter(r=>(!wing||(data.staff[r.staffId]?.wing||r.wing)===wing)&&r.dates?.length).sort((a,b)=>(b.submittedAt||0)-(a.submittedAt||0));
 records.forEach((r,i)=>{const row=el('tr',undefined,'roll-staff-row'),person=data.staff[r.staffId],dates=r.dates;for(const [label,value]of [['S.No.',String(i+1)],['Name and designation',rollDisplayName(r.name)+(person?.designation?' · '+person.designation:'')],['Leave / OD outside dates',dates.map(date=>rollDateText(date)+(r.cancelledDates?.includes(date)?' (cancelled)':'')).join(', ')],['Type of Leave / OD outside',(r.leaveKind||'Not specified (earlier report)')+(r.odDetails?' · Samagam: '+r.odDetails:'')],['Status',advanceLeaveStatus(r)],['Principal comment',r.reviewComment||'—']]){const td=el('td',value);td.dataset.label=label;row.append(td);}body.append(row);});
 section.append(table);if(!records.length)section.append(el('p','No Leave / OD outside submissions yet.'));parent.append(section);
}
