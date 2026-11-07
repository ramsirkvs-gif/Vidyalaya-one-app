export const ROLL_CHECKS=[
 ['biometric','Biometric attendance completed?'],['register','Staff attendance register signed?'],['sop','Checked and proceeding for SOP duty?','No SOP duty today'],['assembly','Aware and bringing your class to MP Hall for assembly?','I am not CT / Co-CT'],['attendance','Ensuring timely Samagam student attendance?','I am not CT / Co-CT'],['timetable','Checking timetable / arrangements in the Vidyalaya App for every period?'],['lunch','Checked and ensuring lunch duty?','No lunch duty today'],['dispersal','Checked and ensuring dispersal duty?','No dispersal duty today'],['samagam','Checked today’s Samagam data-updating action plan?'],['messages','Read and noted today’s Vidyalaya WhatsApp group messages?']];
export const LEAVE_CHECKS=[['informed','Informed the group of your leave type?'],['cover','Informed Co-CT / colleague about Samagam student attendance?'],['exam','Arranged any due exam QP submission, bundle collection or checking?','No exam / duty assigned'],['data','Ensured Samagam data updates for all your roles?','Under progress']];
export const rollToday=(now=Date.now())=>new Date(now+19800000).toISOString().slice(0,10);
export function rollWing(p){if(p?.wing==='primary'||p?.kind==='prt'||/\bPRT\b/i.test(p?.designation||''))return 'primary';if(p?.wing==='secondary'||p?.kind==='faculty'||/\b(?:TGT|PGT)\b/i.test(p?.designation||''))return 'secondary';return '';}
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function applyRollCall(current,input,actor,staff,now=Date.now(),id=''){const next=structuredClone(current||{});next.reports||={};next.objections||={};const day=rollToday(now),op=input.rollOperation;
 if(op==='report'){
  if(input.date!==undefined&&input.date!==day)throw Error('Roll calls can be submitted only for today. Past and future reporting is not allowed.');
  if(!staff[actor.id]||staff[actor.id].status!=='active')throw Error('Choose an active staff member.');
  const wing=input.wing;if(!['primary','secondary'].includes(wing)||rollWing(staff[actor.id])&&wing!==rollWing(staff[actor.id]))throw Error('Choose your assigned wing.');
  if(!['morning','afternoon'].includes(input.period))throw Error('Choose morning or afternoon.');
  const key=day+'_'+input.period+'_'+actor.id,old=next.reports[key];if(old?.status==='approved')throw Error('This roll call is already approved.');
  const r={staffId:actor.id,name:actor.name,wing,date:day,period:input.period,submittedAt:now,updatedAt:now,status:input.period==='afternoon'?'pending':'submitted'};
  if(input.period==='morning'){
   if(!['yes','no'].includes(input.reported))throw Error('Choose whether you reported today.');r.reported=input.reported;r.answers={};
   for(const[k,,na]of input.reported==='yes'?ROLL_CHECKS:LEAVE_CHECKS){const v=input.answers?.[k];if(!['yes','no',...(na?['na']:[])].includes(v))throw Error('Complete each checklist item.');r.answers[k]=v;}
   if(input.reported==='no'){
    if(!['today','long'].includes(input.leaveType))throw Error('Choose the leave period.');r.leaveType=input.leaveType;
    if(input.leaveType==='long'){if(!validDate(input.from)||!validDate(input.to)||input.from>day||input.to<day||input.to<input.from)throw Error('Leave dates must include today.');r.from=input.from;r.to=input.to;}
    r.remark=String(input.remark||'').trim();if(r.remark.length>1000||r.remark.split(/\s+/).filter(Boolean).length>50)throw Error('Keep your action-plan remark within 50 words.');
   }
  }else{
   const morning=next.reports[day+'_morning_'+actor.id];if(!morning||morning.reported!=='yes')throw Error('Submit today’s morning roll call as reported before afternoon roll call.');
   if(Object.values(next.objections).some(o=>o.staffId===actor.id&&o.status==='open'))throw Error('A task is pending. Collect NOC from the concerned IC / Principal before submitting afternoon roll call.');
  }
  next.reports[key]=r;
 }else if(op==='object'){
  if(!text(input.department,100)||!text(input.remark,1000))throw Error('Enter the department / IC responsibility and pending-task remark.');
  if(!Array.isArray(input.targets))throw Error('Select employees of the concerned wing.');const targets=[...new Set(input.targets)];if(!targets.length||targets.length>200||targets.some(k=>!staff[k]||staff[k].status!=='active'||rollWing(staff[k])!==input.wing))throw Error('Select employees of the concerned wing.');
  for(const target of targets){const key=id+'_'+target;next.objections[key]={id:key,staffId:target,name:staff[target].name,wing:input.wing,department:input.department.trim(),remark:input.remark.trim(),createdBy:actor.id,createdName:actor.name,createdAt:now,status:'open'};
   const r=next.reports[day+'_afternoon_'+target];if(r){r.status='blocked';delete r.approvedAt;delete r.approvedBy;}
  }
 }else if(op==='clear'){
  const o=next.objections[input.objectionId];if(!o||o.status!=='open'||actor.id!=='principal'&&o.createdBy!==actor.id)throw Error('Only the reporting IC or Principal can clear this objection.');o.status='cleared';o.clearedBy=actor.id;o.clearedAt=now;
 }else if(op==='approve'){
  if(actor.id!=='principal')throw Error('Principal approval required.');const r=next.reports[input.reportId];if(!r||r.period!=='afternoon'||r.date!==day||r.status!=='pending')throw Error('Choose today’s pending afternoon roll call.');if(Object.values(next.objections).some(o=>o.staffId===r.staffId&&o.status==='open'))throw Error('Clear pending-task objections first.');r.status='approved';r.approvedBy=actor.id;r.approvedAt=now;
 }else throw Error('Unknown roll-call operation.');
 next.revision=(next.revision||0)+1;return next;
}
