import {remedialToday} from './cbse-remedial-model.js';
export function upcomingRemedialClasses(mission,{studentKey='',teacherIds=[],subjectScope=[],now=Date.now()}={}){
 const today=remedialToday(now),tomorrow=remedialToday(now+86400000),parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now),clock=parts.find(p=>p.type==='hour').value+':'+parts.find(p=>p.type==='minute').value,rows=[],seen=new Set();
 const [classId,sectionId]=studentKey.split(':');
 for(const [id,plan]of Object.entries(mission?.remedialPlans||{})){
  if(plan.status==='cancelled'||studentKey&&!plan.studentKeys?.includes(studentKey)||teacherIds.length&&!teacherIds.includes(plan.teacherId))continue;
  if(studentKey&&subjectScope.length&&!subjectScope.some(s=>(plan.scopes||[[plan.classId,plan.sectionId,plan.subjectId].join('|')]).includes([classId,sectionId,s].join('|'))))continue;
  for(const date of plan.dates||[]){
   const key=id+'|'+date;if(seen.has(key)||date<today||date===today&&plan.end<=clock||plan.sessions?.[date]?.submittedAt)continue;seen.add(key);
   rows.push({planId:id,date,start:plan.start,end:plan.end,teacherId:plan.teacherId,teacherName:plan.teacherName,subjectName:plan.subjectName,classId:plan.classId,sections:plan.sections||[plan.section],studentCount:plan.studentKeys?.length||0,purpose:plan.purpose,dayLabel:date===today?'Today':date===tomorrow?'Tomorrow':''});
  }
 }
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||String(a.teacherName).localeCompare(String(b.teacherName))||a.planId.localeCompare(b.planId));
}
