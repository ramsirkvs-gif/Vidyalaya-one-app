import {teacherIdentityIds} from './cbse-view-data.js';
// Count scheduled class dates, rather than treating a month-long plan as one class.
export function remedialTeacherSummary(plans,faculty,mission){
 const groups=new Map();for(const plan of plans){const aliases=teacherIdentityIds(plan.teacherId,faculty,mission),id=[...aliases].sort().join('|')||plan.teacherId;let row=groups.get(id);if(!row){row={id:plan.teacherId,aliases,name:plan.teacherName,plans:0,total:0,planned:0,completed:0,approved:0,cancelled:0};groups.set(id,row);}row.plans++;
 for(const date of plan.dates){row.total++;if(plan.status==='cancelled'){row.cancelled++;continue;}const session=plan.sessions?.[date];if(session?.status==='verified')row.approved++;else if(session?.submittedAt)row.completed++;else row.planned++;}}
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
