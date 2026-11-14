import {remedialToday} from './cbse-remedial-model.js';
import {el,head,cell} from './cbse-ui.js';
import {upcomingRemedialClasses} from './cbse-remedial-upcoming.js';
export function renderUpcomingRemedialClasses(parent,mission,{studentKey='',teacherIds=[],subjectScope=[],principal=false,now}={}){
 const rows=upcomingRemedialClasses(mission,{studentKey,teacherIds,subjectScope,now}),section=el('section',undefined,'remedial-upcoming-strip');section.dataset.upcomingAudience=studentKey?'student':teacherIds.length?'teacher':'principal';
 section.append(el('h3','Upcoming remedial classes · '+rows.length),el('p',rows.filter(r=>r.dayLabel==='Today').length+' today · '+rows.filter(r=>r.dayLabel==='Tomorrow').length+' tomorrow','remedial-upcoming-count'));
 if(!rows.length)section.append(el('p','No upcoming remedial classes planned.','muted'));
 else{
  const wrap=el('div',undefined,'table-scroll'),table=el('table'),header=el('thead'),body=el('tbody');wrap.tabIndex=0;wrap.setAttribute('aria-label','Upcoming remedial classes · scroll horizontally');head(header,['When','Time','Class / subject','Teacher',studentKey?'Your class':'Targeted students','Topic']);table.append(header,body);wrap.append(table);section.append(wrap);let limit=12;
  const more=el('button','Show more upcoming classes');more.type='button';const draw=()=>{body.replaceChildren();for(const r of rows.slice(0,limit)){const row=el('tr');if(r.dayLabel)row.className='remedial-upcoming-'+r.dayLabel.toLowerCase();for(const text of [(r.dayLabel?r.dayLabel+' · ':'')+r.date,r.start+'–'+r.end,r.classId+'-'+r.sections.join(', ')+' · '+r.subjectName,r.teacherName,studentKey?'You are selected':String(r.studentCount),r.purpose])cell(row,text||'—');body.append(row);}more.hidden=limit>=rows.length;};more.onclick=()=>{limit+=12;draw();};section.append(more);draw();
 }
 if(teacherIds.length){const today=remedialToday(now),reports=Object.values(mission.remedialPlans||{}).filter(plan=>teacherIds.includes(plan.teacherId)&&plan.status!=='cancelled'&&plan.dates.includes(today));for(const plan of reports){const report=el('a','Report remedial class · attendance & photo · '+plan.subjectName,'button');report.href='#'+new URLSearchParams({tab:'remedial',reportPlan:plan.id,reportDate:today});section.append(report);}section.append(el('p','Attendance → photo evidence → existing personal PIN. Reporting remains open until 11:59 PM IST on the scheduled date.','muted'));}
 const manager=el('a',principal?'Manage plans / approve completed classes':'Open Remedial Class Manager','button');manager.href='#tab=remedial';section.append(manager);parent.append(section);return section;
}
