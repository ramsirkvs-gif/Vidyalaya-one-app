import {secondarySections} from './cbse-roll-objection-targets.js';
import {currentAfternoonQuestion} from './cbse-afternoon-checklist.js';
import {isAvinashGuestProfile} from './cbse-faculty-guest.js';
import {primaryStaffEntry} from './cbse-primary-roster.js';
import {snapshotQuestionComments} from './cbse-roll-call-checklist.js';
import {applyAdvanceLeave} from './cbse-advance-leave-model.js';
import {activeRollLongLeave,activeAdvanceLeave,afternoonMorningRecord,afternoonFirstHalfReturn,afternoonMorningExemption,afternoonLeaveExemption} from './cbse-roll-call-leave.js';
import {secondaryStaffEntry,rollStaffIdentityIds,rollReportingStaff} from './cbse-roll-call-roster.js';
import {ROLL_CHECKS,LEAVE_CHECKS} from './cbse-roll-call-defaults.js';
export {ROLL_CHECKS,LEAVE_CHECKS} from './cbse-roll-call-defaults.js';
import {publishedReporting,reportingQuestions,snapshotAnswers} from './cbse-reporting-model.js';
export const rollToday=(now=Date.now())=>new Date(now+19800000).toISOString().slice(0,10);
export const openPrincipalNOCs=objections=>Object.entries(objections||{}).filter(([,hold])=>hold.kind==='principal-hold'&&hold.status==='open');
export function nocGroupKey(hold,date){
 if(!hold?.createdBy||!Number.isFinite(hold.createdAt)||rollToday(hold.createdAt)!==date||!hold.remark?.trim())return '';
 return JSON.stringify([hold.createdBy,hold.kind||'task',hold.department||'',hold.remark.trim()]);
}
export function rollWing(p){if(isAvinashGuestProfile(p))return 'secondary';if(primaryStaffEntry(p))return 'primary';if(['primary','secondary'].includes(p?.wing))return p.wing;if(secondaryStaffEntry(p))return 'secondary';if(p?.wing==='primary'||p?.kind==='prt'||/\bPRT\b/i.test(p?.designation||''))return 'primary';if(p?.wing==='secondary'||p?.kind==='faculty'||/\b(?:TGT|PGT)\b/i.test(p?.designation||''))return 'secondary';return '';}
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export const rollReasonWordCount=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
export function rollNoAnswers(input){const labels=new Map(input.questionSnapshot?input.questionSnapshot.filter(q=>q.type!=='text').map(q=>[q.id,q.label]):[...ROLL_CHECKS,...LEAVE_CHECKS].map(([k,label])=>[k,label]));const out=[];if(input.reported==='no')out.push('Reported in Vidyalaya: No');for(const[k,v]of Object.entries(input.answers||{}))if(v==='no'&&labels.has(k))out.push(labels.get(k));return out;}
export const rollRecorded=r=>!!r&&!['today','long'].includes(r.leaveType)&&['pending','review','submitted','recorded','approved'].includes(r.status);
export const rollNeedsApproval=r=>!!r&&!rollRecorded(r)&&['morning','afternoon'].includes(r.period)&&['pending','review','submitted'].includes(r.status);
export function applyRollCall(current,input,actor,staff,now=Date.now(),id='',reportingStore=null){const next=structuredClone(current||{});next.reports||={};next.objections||={};const day=rollToday(now),op=input.rollOperation;
 if(String(op).startsWith('advance-leave-'))return applyAdvanceLeave(current,input,{...actor,wing:rollWing(staff[actor.id])},staff,now,id,reportingStore);
 if(op==='report'){
  if(input.workflowVersion>=2&&input.undertaking!==true)throw Error('Accept the duty undertaking before submitting Roll Call.');
  const form=publishedReporting(reportingStore);if(!form.enabled)throw Error('Reporting is not currently published.');if((input.formVersion??1)!==form.version)throw Error('The reporting form changed. Reopen it to use the latest published questions.');
  if(activeAdvanceLeave(next.advanceLeaves,rollStaffIdentityIds(staff,actor.id),day))throw Error('Advance leave reporting done for today. Morning and afternoon Roll Call are not required.');
  if(activeRollLongLeave(next.reports,rollStaffIdentityIds(staff,actor.id),day))throw Error('You are on recorded long leave. Morning and afternoon roll calls are not required during this period.');
  if(input.date!==undefined&&input.date!==day)throw Error('Roll calls can be submitted only for today. Past and future reporting is not allowed.');
  if(!staff[actor.id]||!rollReportingStaff(staff[actor.id])||staff[actor.id].status!=='active')throw Error('Choose an active staff member.');
  const wing=input.wing;if(!['primary','secondary'].includes(wing)||rollWing(staff[actor.id])&&wing!==rollWing(staff[actor.id]))throw Error('Choose your assigned wing.');
  if(!['morning','afternoon'].includes(input.period))throw Error('Choose morning or afternoon.');
  const key=day+'_'+input.period+'_'+actor.id,old=next.reports[key];if(old?.status==='approved'||old?.teacherEditLockedAt)throw Error('This roll call is already approved.');
  if(input.workflowVersion>=5&&input.period==='morning'&&(!['first','present'].includes(input.morningMode)||input.reported!==(input.morningMode==='first'?'no':'yes')||(input.leaveType||'none')!==(input.morningMode==='first'?'half':'none')||input.morningMode==='first'&&input.halfDay!=='first'))throw Error('Choose first-half instant leave or present; other leave must use leave reporting.');
  const r={...(input.morningMode?{morningMode:input.morningMode}:{}),revision:(old?.revision||0)+1,...(input.workflowVersion>=2?{workflowVersion:input.workflowVersion,undertaking:true}:{}),staffId:actor.id,name:actor.name,wing,date:day,period:input.period,submittedAt:old?.submittedAt||now,updatedAt:now,status:'pending',requiresReview:true,hasNoAnswers:false};
  const afternoon=input.period==='afternoon';
  const ids=rollStaffIdentityIds(staff,actor.id);
  const morning=afternoon?afternoonMorningRecord(next.reports,ids,day):null;
  const returning=afternoonFirstHalfReturn(morning);
  if(afternoon){
   if(afternoonMorningExemption(morning))throw Error('Your saved leave record exempts you from afternoon Roll Call.');
   if(!returning&&morning?.reported!=='yes')throw Error('Submit today’s morning Roll Call before afternoon Roll Call.');
   if(returning){r.leaveType='half';r.halfDay='first';r.reported='yes';}
  }
  const leave=afternoon?'none':input.leaveType||'none';if(input.workflowVersion>=4&&['today','long'].includes(leave))throw Error('For leave longer than half a day, fill leave status first.');if(!['none','today','long','half'].includes(leave))throw Error('Choose the leave period.');
  if(leave==='long'&&(input.period!=='morning'||input.reported!=='no'))throw Error('Record long-leave details as not reported in the morning leave form.');
  if(leave!=='none'){r.leaveType=leave;if(leave==='half'){if(!['first','second'].includes(input.halfDay))throw Error('Choose first half or second half.');r.halfDay=input.halfDay;if(input.halfDay==='first'&&input.period!=='afternoon'&&!(input.workflowVersion>=4&&input.period==='morning'))throw Error('First-half leave permits afternoon roll call only.');}if(leave==='long'){if(!validDate(input.from)||!validDate(input.to)||input.from>day||input.to<day||input.to<input.from)throw Error('Leave dates must include today.');r.from=input.from;r.to=input.to;}}
  if(input.workflowVersion>=4&&leave==='half'&&input.period==='morning'&&input.reported!==(input.halfDay==='first'?'no':'yes'))throw Error('First-half leave records morning absence; second-half leave requires morning attendance. For a longer absence, fill leave status first.');
  if(!afternoon){
   if(!['yes','no'].includes(input.reported))throw Error('Choose whether you reported today.');r.reported=input.reported;r.answers={};
   if(input.reported==='no'&&leave==='none')throw Error('Choose the leave period.');
   if(input.reported==='no'){r.remark=String(input.remark||'').trim();if(r.remark.length>1000||r.remark.split(/\s+/).filter(Boolean).length>50)throw Error('Keep your action-plan remark within 50 words.');}
  }
  r.formVersion=form.version;r.formTitle=form.title;r.questionSnapshot=structuredClone(reportingQuestions(form,input));r.answers=snapshotAnswers(r.questionSnapshot,input.answers);if(input.workflowVersion>=3||afternoon)r.answerComments=snapshotQuestionComments(r.questionSnapshot,r.answers,input.answerComments);const noAnswers=rollNoAnswers(r);if(input.workflowVersion>=3){r.hasNoAnswers=noAnswers.length>0;r.requiresCommentReview=Object.keys(r.answerComments).length>0;if(r.requiresCommentReview&&input.period==='morning')r.status='review';}if(!afternoon&&(input.workflowVersion<3||input.workflowVersion===undefined))if(noAnswers.length){const reason=String(input.noReason||'').trim();if(!reason||reason.length>4000||rollReasonWordCount(reason)>(input.workflowVersion===2?50:100))throw Error('Explain the reason / emergency for every No answer for Principal review. Use no more than '+(input.workflowVersion===2?50:100)+' words.');r.noReason=reason;r.noAnswers=noAnswers;r.hasNoAnswers=true;r.requiresReview=true;if(input.period==='morning')r.status='review';}
  if(!['today','long'].includes(r.leaveType)){r.status='recorded';r.approvalRequired=false;r.requiresReview=false;}
  if(afternoon&&Object.values(next.objections).some(o=>o.status==='open'&&ids.includes(o.staffId)))r.status='blocked';
  if(old){if(old.principalComments)r.principalComments=structuredClone(old.principalComments);if(old.reviewedAt)r.reviewedAt=old.reviewedAt;next.reportEdits||={};next.reportEdits[key+'_'+(next.revision||0)]={record:structuredClone(old),changedBy:actor.id,changedAt:now};}next.reports[key]=r;
 }else if(op==='report-edit'){
  if(actor.id!=='principal')throw Error('Principal access required to correct a submitted Roll Call.');const r=Object.hasOwn(next.reports,input.reportId)?next.reports[input.reportId]:null;if(!r||input.expectedUpdatedAt!==(r.updatedAt||r.submittedAt)||input.expectedSubmittedAt!==r.submittedAt)throw Error('Roll Call changed. Refresh before editing.');const historical=r.date!==day,previousStatus=r.status,previousReview=r.requiresReview,questions=r.period==='afternoon'&&Array.isArray(r.questionSnapshot)?r.questionSnapshot.map(currentAfternoonQuestion):r.questionSnapshot;if(!Array.isArray(questions))throw Error('This older record has no saved question list. Review or delete it instead.');const answers=snapshotAnswers(questions,input.answers),comments=r.workflowVersion>=3?snapshotQuestionComments(questions,answers,input.answerComments):{};next.reportEdits||={};next.reportEdits[input.reportId+'_'+(next.revision||0)]={record:structuredClone(r),changedBy:'principal',changedAt:now};if(r.status==='approved'||r.approvedAt)r.teacherEditLockedAt=r.teacherEditLockedAt||r.approvedAt||now;r.answers=answers;if(r.period==='afternoon')r.questionSnapshot=questions;if(r.workflowVersion>=3)r.answerComments=comments;r.hasNoAnswers=rollNoAnswers(r).length>0;r.requiresCommentReview=Object.keys(comments).length>0;r.status=historical?previousStatus:r.hasNoAnswers||r.requiresCommentReview?'review':'pending';r.requiresReview=historical?previousReview:true;if(!historical&&!['today','long'].includes(r.leaveType)){r.status='recorded';r.approvalRequired=false;r.requiresReview=false;}if(!historical&&r.period==='afternoon'&&Object.values(next.objections).some(o=>o.status==='open'&&rollStaffIdentityIds(staff,r.staffId).includes(o.staffId)))r.status='blocked';r.updatedAt=now;r.revision=(r.revision||0)+1;r.correctedBy='principal';r.correctedAt=now;r.updatedByName='Principal';if(!historical){delete r.approvedBy;delete r.approvedAt;}
 }else if(op==='report-comment'){
  if(actor.id!=='principal')throw Error('Principal access required to comment on Roll Call.');const r=Object.hasOwn(next.reports,input.reportId)?next.reports[input.reportId]:null;
  if(!r||input.expectedUpdatedAt!==(r.updatedAt||r.submittedAt)||input.expectedSubmittedAt!==r.submittedAt)throw Error('Roll Call changed. Refresh before commenting.');
  const comment=String(input.comment||'').trim();if(!text(comment,2000))throw Error('Enter a Principal comment within 2000 characters.');
  r.principalComments||={};r.principalComments['review_'+(next.revision||0)]={text:comment,by:'principal',at:now};r.reviewedAt=now;r.updatedAt=now;r.revision=(r.revision||0)+1;
 }else if(op==='report-delete'){
  if(actor.id!=='principal')throw Error('Principal access required to delete a Roll Call.');const record=Object.hasOwn(next.reports,input.reportId)?next.reports[input.reportId]:null;if(!record||!Number.isFinite(input.expectedUpdatedAt)||!Number.isFinite(input.expectedSubmittedAt)||input.expectedUpdatedAt!==(record.updatedAt||record.submittedAt)||input.expectedSubmittedAt!==record.submittedAt)throw Error('Roll Call changed. Refresh before deleting.');if(input.confirmDelete!==true)throw Error('Confirm deletion of this Roll Call.');if(record.period==='morning'&&Object.values(next.reports).some(r=>r.date===record.date&&r.period==='afternoon'&&rollStaffIdentityIds(staff,record.staffId).includes(r.staffId)))throw Error('Delete the associated afternoon Roll Call first.');next.deletedRecords||={};next.deletedRecords['report_'+input.reportId+'_'+(next.revision||0)]={kind:'report',record:structuredClone(record),deletedBy:'principal',deletedAt:now};delete next.reports[input.reportId];
 }else if(op==='objection-assignments-save'){
  if(actor.id!=='principal')throw Error('Only the Principal can edit teacher assignments.');
  const {section,ct,coCT,subjects,expectedRevision}=input;
  if(!secondarySections.includes(section))throw Error('Choose a Secondary Wing class section.');
  const eligible=staffId=>typeof staffId==='string'&&Object.hasOwn(staff,staffId)&&staff[staffId].status==='active'&&rollReportingStaff(staff[staffId])&&rollWing(staff[staffId])==='secondary';
  if((ct!==''&&!eligible(ct))||(coCT!==''&&!eligible(coCT)))throw Error('Choose active Secondary Wing teachers.');
  if(ct&&coCT&&rollStaffIdentityIds(staff,ct).includes(coCT))throw Error('Choose different teachers for CT and Co-CT.');
  if(!Array.isArray(subjects)||subjects.length>300||subjects.some(row=>!row||!eligible(row.staffId)||!text(row.subject,80)))throw Error('Enter valid subjects for active Secondary Wing teachers.');
  next.objectionAssignments||={};
  const revision=next.objectionAssignments[section]?.revision||0;
  if(expectedRevision!==revision)throw Error('These assignments changed. Refresh before editing.');
  const clean=subjects.map(row=>({staffId:row.staffId,subject:row.subject.trim()}));
  next.objectionAssignments[section]={ct,coCT,subjects:[...new Map(clean.map(row=>[JSON.stringify([row.staffId,row.subject.toLowerCase()]),row])).values()],revision:revision+1,updatedAt:now};
 }else if(op==='object'||op==='principal-hold'){
  const principalHold=op==='principal-hold';if(principalHold&&actor.id!=='principal')throw Error('Only the Principal can place a departure hold.');if(principalHold&&!['all','selected'].includes(input.targetMode))throw Error('Choose all staff or selected employees.');
  if(principalHold&&!['','primary','secondary'].includes(input.wing||''))throw Error('Choose a valid wing.');
  if(principalHold&&input.targetMode==='all')input={...input,targets:Object.entries(staff).filter(([,p])=>p.status==='active'&&rollReportingStaff(p)&&(!input.wing||rollWing(p)===input.wing)).map(([key])=>key)};
  if(principalHold&&(!text(input.remark,120)))throw Error('Enter a short hold remark within 120 characters.');
  const department=String(input.department||'IC Objection');if(!text(department,100)||!text(input.remark,1000))throw Error('Enter a short pending-task remark.');
  if(!Array.isArray(input.targets))throw Error('Select employees of the concerned wing.');const targets=[...new Set(input.targets)];if(actor.id!=='principal'&&targets.some(id=>rollStaffIdentityIds(staff,actor.id).includes(id)))throw Error('Select other teachers, not yourself.');if(!targets.length||targets.length>200||targets.some(k=>!staff[k]||staff[k].status!=='active'||(principalHold?!rollReportingStaff(staff[k])||input.wing&&rollWing(staff[k])!==input.wing:rollWing(staff[k])!==input.wing)))throw Error('Select employees of the concerned wing.');
  const eligible=targets.filter(target=>!afternoonLeaveExemption(next,rollStaffIdentityIds(staff,target),day));
  if(!eligible.length)throw Error('The selected employees are already exempt from afternoon Roll Call due to leave or OD outside.');
  for(const target of eligible.filter((target,index)=>!principalHold||!eligible.slice(0,index).some(previous=>rollStaffIdentityIds(staff,target).includes(previous)))){const key=id+'_'+target;next.objections[key]={id:key,staffId:target,name:staff[target].name,wing:rollWing(staff[target]),...(principalHold?{kind:'principal-hold',date:day}:{}),department:principalHold?'Principal hold':department.trim(),remark:input.remark.trim(),createdBy:actor.id,createdName:actor.name,createdAt:now,status:'open'};
   const linked=rollStaffIdentityIds(staff,target);for(const r of Object.values(next.reports)){if(r.date!==day||!linked.includes(r.staffId)||!(r.period==='afternoon'||r.period==='morning'&&r.workflowVersion>=4&&r.leaveType==='half'&&r.halfDay==='second'))continue;if(r.approvedAt)r.teacherEditLockedAt=r.teacherEditLockedAt||r.approvedAt;r.status='blocked';r.updatedAt=now;delete r.approvedAt;delete r.approvedBy;}
  }
 }else if(op==='clear'||op==='clear-group'||op==='clear-principal-holds'){
  const holds=Object.values(next.objections);
  let releasing;
  if(op==='clear-principal-holds'){
   if(actor.id!=='principal')throw Error('Only the Principal can release all Principal holds.');
   const pending=openPrincipalNOCs(next.objections),confirmed=new Set(Array.isArray(input.holdIds)?input.holdIds:[]);
   if(input.date!==day||confirmed.size!==pending.length||pending.some(([id])=>!confirmed.has(id)))
    throw Error('The NOC list changed. Refresh before releasing all holds.');
   if(!pending.length)throw Error('There are no open Principal holds to release.');
   releasing=pending.map(([,hold])=>hold);
  }else{
   const hold=Object.hasOwn(next.objections,input.objectionId)?next.objections[input.objectionId]:null;
   if(!hold||hold.status!=='open'||actor.id!=='principal'&&(hold.kind==='principal-hold'||hold.createdBy!==actor.id))throw Error('Only the reporting IC or Principal can clear this objection.');
   const key=op==='clear-group'?nocGroupKey(hold,day):'';
   if(op==='clear-group'&&(!key||input.date!==day))throw Error('Group release is available for today’s holds only. Refresh and try again.');
   releasing=key?holds.filter(other=>other.status==='open'&&nocGroupKey(other,day)===key):[hold];
  }
  const staffIds=new Set(releasing.map(item=>item.staffId));
  for(const item of releasing){item.status='cleared';item.clearedBy=actor.id;item.clearedAt=now;}
  for(const r of Object.values(next.reports)){
   if(r.date!==day||r.status!=='blocked'||!(r.period==='afternoon'||r.period==='morning'&&r.workflowVersion>=4&&r.leaveType==='half'&&r.halfDay==='second'))continue;
   const ids=rollStaffIdentityIds(staff,r.staffId);
   if(!ids.some(id=>staffIds.has(id))||holds.some(other=>other.status==='open'&&ids.includes(other.staffId)))continue;
   r.requiresReview=['today','long'].includes(r.leaveType);r.status=r.requiresReview?'pending':'recorded';r.updatedAt=now;
  }
 }else if(op==='approve'||op==='reject'){
  if(actor.id!=='principal')throw Error('Principal approval required.');const r=next.reports[input.reportId];if(!r||r.date!==day||!rollNeedsApproval(r)&&!rollRecorded(r))throw Error('Choose today’s pending roll call for review.');if(op==='approve'&&(r.period==='afternoon'||r.workflowVersion>=4&&r.leaveType==='half'&&r.halfDay==='second')&&Object.values(next.objections).some(o=>rollStaffIdentityIds(staff,r.staffId).includes(o.staffId)&&o.status==='open'))throw Error('Clear pending-task objections first.');r.updatedAt=now;r.requiresReview=false;if(op==='approve'){r.status='approved';r.approvedBy=actor.id;r.approvedAt=now;r.teacherEditLockedAt=r.teacherEditLockedAt||now;}else{r.status='not-approved';r.rejectedBy=actor.id;r.rejectedAt=now;delete r.approvedAt;delete r.approvedBy;}
 }else throw Error('Unknown roll-call operation.');
 next.revision=(next.revision||0)+1;return next;
}
