// Derive attendance from approved class records; do not create duplicate student records.
export function studentRemedialParticipation(mission,key,subjectScope=[]){
 const [classId,sectionId]=String(key).split(':'),rows=[];
 for(const plan of Object.values(mission?.remedialPlans||{})){
  if(plan.status==='cancelled'||!plan.studentKeys?.includes(key))continue;
  if(subjectScope.length&&!subjectScope.some(id=>(plan.scopes||[[plan.classId,plan.sectionId,plan.subjectId].join('|')]).includes([classId,sectionId,id].join('|'))))continue;
  for(const [date,session]of Object.entries(plan.sessions||{})){
   if(session.status!=='verified'||!session.submittedAt||!session.verifiedAt||session.verifiedBy!=='principal'||!session.presentKeys?.includes(key)||!plan.dates?.includes(date))continue;
   rows.push({planId:plan.id,date,start:plan.start,end:plan.end,subjectName:plan.subjectName,teacherName:plan.teacherName,purpose:plan.purpose,approvedAt:session.verifiedAt,status:'Present · approved by Principal'});
  }
 }
 return rows.sort((a,b)=>b.date.localeCompare(a.date)||String(b.start).localeCompare(String(a.start))||String(a.planId).localeCompare(String(b.planId)));
}
