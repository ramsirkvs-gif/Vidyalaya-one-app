import {activeRollLongLeave} from './cbse-roll-call-leave.js';
import {secondaryStaffEntry,rollStaffIdentityIds} from './cbse-roll-call-roster.js';
import {ROLL_CHECKS,LEAVE_CHECKS} from './cbse-roll-call-defaults.js';
export {ROLL_CHECKS,LEAVE_CHECKS} from './cbse-roll-call-defaults.js';
import {publishedReporting,reportingQuestions,snapshotAnswers} from './cbse-reporting-model.js';
export const rollToday=(now=Date.now())=>new Date(now+19800000).toISOString().slice(0,10);
export function rollWing(p){if(['primary','secondary'].includes(p?.wing))return p.wing;if(secondaryStaffEntry(p))return 'secondary';if(p?.wing==='primary'||p?.kind==='prt'||/\bPRT\b/i.test(p?.designation||''))return 'primary';if(p?.wing==='secondary'||p?.kind==='faculty'||/\b(?:TGT|PGT)\b/i.test(p?.designation||''))return 'secondary';return '';}
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export const rollReasonWordCount=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
export function rollNoAnswers(input){const labels=new Map(input.questionSnapshot?input.questionSnapshot.filter(q=>q.type!=='text').map(q=>[q.id,q.label]):[...ROLL_CHECKS,...LEAVE_CHECKS].map(([k,label])=>[k,label]));const out=[];if(input.reported==='no')out.push('Reported in Vidyalaya: No');for(const[k,v]of Object.entries(input.answers||{}))if(v==='no'&&labels.has(k))out.push(labels.get(k));return out;}
export const rollNeedsApproval=r=>!!r&&['morning','afternoon'].includes(r.period)&&['pending','review','submitted'].includes(r.status);
export function applyRollCall(current,input,actor,staff,now=Date.now(),id='',reportingStore=null){const next=structuredClone(current||{});next.reports||={};next.objections||={};const day=rollToday(now),op=input.rollOperation;
 if(op==='report'){
  const form=publishedReporting(reportingStore);if(!form.enabled)throw Error('Reporting is not currently published.');if((input.formVersion??1)!==form.version)throw Error('The reporting form changed. Reopen it to use the latest published questions.');
  if(activeRollLongLeave(next.reports,rollStaffIdentityIds(staff,actor.id),day))throw Error('You are on recorded long leave. Morning and afternoon roll calls are not required during this period.');
  if(input.date!==undefined&&input.date!==day)throw Error('Roll calls can be submitted only for today. Past and future reporting is not allowed.');
  if(!staff[actor.id]||staff[actor.id].status!=='active')throw Error('Choose an active staff member.');
  const wing=input.wing;if(!['primary','secondary'].includes(wing)||rollWing(staff[actor.id])&&wing!==rollWing(staff[actor.id]))throw Error('Choose your assigned wing.');
  if(!['morning','afternoon'].includes(input.period))throw Error('Choose morning or afternoon.');
  const key=day+'_'+input.period+'_'+actor.id,old=next.reports[key];if(old?.status==='approved')throw Error('This roll call is already approved.');
  const r={staffId:actor.id,name:actor.name,wing,date:day,period:input.period,submittedAt:now,updatedAt:now,status:'pending',requiresReview:true,hasNoAnswers:false};
  const leave=input.leaveType||'none';if(!['none','today','long','half'].includes(leave))throw Error('Choose the leave period.');
  if(leave==='long'&&(input.period!=='morning'||input.reported!=='no'))throw Error('Record long-leave details as not reported in the morning leave form.');
  if(leave!=='none'){r.leaveType=leave;if(leave==='half'){if(!['first','second'].includes(input.halfDay))throw Error('Choose first half or second half.');r.halfDay=input.halfDay;if(input.halfDay==='first'&&input.period!=='afternoon')throw Error('First-half leave permits afternoon roll call only.');}if(leave==='long'){if(!validDate(input.from)||!validDate(input.to)||input.from>day||input.to<day||input.to<input.from)throw Error('Leave dates must include today.');r.from=input.from;r.to=input.to;}}
  const firstHalf=leave==='half'&&input.halfDay==='first';
  if(input.period==='morning'||firstHalf){
   if(!['yes','no'].includes(input.reported))throw Error('Choose whether you reported today.');r.reported=input.reported;r.answers={};
   if(input.reported==='no'&&leave==='none')throw Error('Choose the leave period.');
   if(input.reported==='no'){r.remark=String(input.remark||'').trim();if(r.remark.length>1000||r.remark.split(/\s+/).filter(Boolean).length>50)throw Error('Keep your action-plan remark within 50 words.');}
  }
  if(input.period==='afternoon'){
   const morning=next.reports[day+'_morning_'+actor.id];if(!firstHalf&&(!morning||morning.reported!=='yes'))throw Error('Submit today’s morning roll call as reported before afternoon roll call, or select first-half leave.');
   if(Object.values(next.objections).some(o=>rollStaffIdentityIds(staff,actor.id).includes(o.staffId)&&o.status==='open'))throw Error('A task is pending. Collect NOC from the concerned IC / Principal before submitting afternoon roll call.');
  }
  r.formVersion=form.version;r.formTitle=form.title;r.questionSnapshot=structuredClone(reportingQuestions(form,input));r.answers=snapshotAnswers(r.questionSnapshot,input.answers);const noAnswers=rollNoAnswers(r);if(noAnswers.length){const reason=String(input.noReason||'').trim();if(reason.length<10||reason.length>4000||rollReasonWordCount(reason)>100)throw Error('Explain the reason / emergency for every No answer for Principal review. Use at least 10 characters and no more than 100 words.');r.noReason=reason;r.noAnswers=noAnswers;r.hasNoAnswers=true;r.requiresReview=true;if(input.period==='morning')r.status='review';}
  next.reports[key]=r;
 }else if(op==='object'){
  const department=String(input.department||'IC Objection');if(!text(department,100)||!text(input.remark,1000))throw Error('Enter a short pending-task remark.');
  if(!Array.isArray(input.targets))throw Error('Select employees of the concerned wing.');const targets=[...new Set(input.targets)];if(actor.id!=='principal'&&targets.some(id=>rollStaffIdentityIds(staff,actor.id).includes(id)))throw Error('Select other teachers, not yourself.');if(!targets.length||targets.length>200||targets.some(k=>!staff[k]||staff[k].status!=='active'||rollWing(staff[k])!==input.wing))throw Error('Select employees of the concerned wing.');
  for(const target of targets){const key=id+'_'+target;next.objections[key]={id:key,staffId:target,name:staff[target].name,wing:input.wing,department:department.trim(),remark:input.remark.trim(),createdBy:actor.id,createdName:actor.name,createdAt:now,status:'open'};
   const r=next.reports[day+'_afternoon_'+target];if(r){r.status='blocked';delete r.approvedAt;delete r.approvedBy;}
  }
 }else if(op==='clear'){
  const o=next.objections[input.objectionId];if(!o||o.status!=='open'||actor.id!=='principal'&&o.createdBy!==actor.id)throw Error('Only the reporting IC or Principal can clear this objection.');o.status='cleared';o.clearedBy=actor.id;o.clearedAt=now;
 }else if(op==='approve'||op==='reject'){
  if(actor.id!=='principal')throw Error('Principal approval required.');const r=next.reports[input.reportId];if(!r||r.date!==day||!rollNeedsApproval(r))throw Error('Choose today’s pending roll call for review.');if(op==='approve'&&r.period==='afternoon'&&Object.values(next.objections).some(o=>rollStaffIdentityIds(staff,r.staffId).includes(o.staffId)&&o.status==='open'))throw Error('Clear pending-task objections first.');r.updatedAt=now;r.requiresReview=false;if(op==='approve'){r.status='approved';r.approvedBy=actor.id;r.approvedAt=now;}else{r.status='not-approved';r.rejectedBy=actor.id;r.rejectedAt=now;delete r.approvedAt;delete r.approvedBy;}
 }else throw Error('Unknown roll-call operation.');
 next.revision=(next.revision||0)+1;return next;
}
