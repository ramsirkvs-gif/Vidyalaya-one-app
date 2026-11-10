export function remedialClassStatus(plan,date,now=Date.now()){
 if(plan.status==='cancelled')return 'Cancelled';const session=plan.sessions?.[date];if(session?.status==='returned')return 'Reverted by Principal';if(session?.status==='verified')return 'Approved';if(session?.submittedAt)return 'Waiting for approval';
 const today=new Date(now+19800000).toISOString().slice(0,10),clock=new Date(now+19800000).toISOString().slice(11,16);return date<today||date===today&&plan.end&&plan.end<=clock?'Planned but not done':date>today?'Planned for upcoming day':'Planned for today';
}
export function remedialPlanStatus(plan,now=Date.now()){
 if(plan.status==='cancelled')return 'CANCELLED';const groups=new Map();for(const date of plan.dates||[]){const label=remedialStatusLabel(plan,date,now);groups.set(label,(groups.get(label)||0)+1);}if(groups.size===1)return [...groups.keys()][0];return [...groups].map(([label,count])=>count+' '+label).join(' · ')||'Planned for upcoming day';
}

export function remedialStatusLabel(plan,date,now=Date.now()){const status=remedialClassStatus(plan,date,now);return status==='Approved'?'Successfully done and approved':status==='Waiting for approval'?'Class successfully done · waiting for approval':status;}

export function remedialTeacherCanEdit(plan,date,now=Date.now()){const session=plan.sessions?.[date]||{};return date===new Date(now+19800000).toISOString().slice(0,10)&&session.status!=='verified'&&!session.verifiedAt&&!Object.values(session.reviewHistory||{}).some(r=>r.verifiedAt||r.status==='verified');}
