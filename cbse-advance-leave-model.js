import {publishedReporting,snapshotAnswers} from './cbse-reporting-model.js';
import {rollStaffIdentityIds} from './cbse-roll-call-roster.js';
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function applyAdvanceLeave(current,input,actor,staff,now,id,reportingStore){
 const next=structuredClone(current||{});next.advanceLeaves||={};const today=new Date(now+19800000).toISOString().slice(0,10),op=input.rollOperation;
 if(op==='advance-leave-save'){
  if(actor.id==='principal'||staff[actor.id]?.status!=='active'||!actor.wing||input.wing!==actor.wing)throw Error('Choose your own active staff name and correct wing.');
  const form=publishedReporting(reportingStore);if(!form.enabled)throw Error('Reporting is not currently published.');if(input.formVersion!==form.version)throw Error('The leave questionnaire changed. Reopen it before submitting.');
  const dates=input.dates;if(!Array.isArray(dates)||!dates.length||dates.length>366||new Set(dates).size!==dates.length||dates.some(d=>!validDate(d)||d<today||d>String(Number(today.slice(0,4))+1)+today.slice(4)))throw Error('Choose distinct dates from today up to one year ahead.');
  const ids=rollStaffIdentityIds(staff,actor.id),overlap=Object.values(next.advanceLeaves).some(r=>ids.includes(r.staffId)&&['recorded','pending'].includes(r.status)&&dates.some(d=>r.dates.includes(d)&&!r.cancelledDates?.includes(d)));if(overlap)throw Error('Some dates are already reported. Cancel those dates before changing their leave report.');
  const questions=form.groups.advanceLeave,answers=snapshotAnswers(questions,input.answers),no=questions.filter(q=>q.type!=='text'&&answers[q.id]==='no'),reason=String(input.reason||'').trim();if(reason.length>2000||reason&&reason.split(/\s+/).length>100)throw Error('Keep the reason within 100 words.');if(no.length&&reason.length<10)throw Error('Explain No answers in 10 characters to 100 words for the Principal.');
  if(!id||Object.hasOwn(next.advanceLeaves,id))throw Error('Leave reference changed. Retry.');next.advanceLeaves[id]={id,staffId:actor.id,name:actor.name,wing:actor.wing,dates:[...dates].sort(),answers,questionSnapshot:structuredClone(questions),formVersion:form.version,reason,status:no.length?'pending':'recorded',submittedAt:now,updatedAt:now,revision:1,cancelledDates:[]};
 }else{
  const record=next.advanceLeaves[input.leaveId];if(!record)throw Error('Leave report no longer exists.');if(input.expectedRevision!==record.revision)throw Error('Leave report changed. Refresh and retry.');
  if(op==='advance-leave-cancel'){
   if(actor.id!=='principal'&&!rollStaffIdentityIds(staff,actor.id).includes(record.staffId))throw Error('Only this teacher or the Principal can cancel these leave dates.');
   const dates=input.dates;if(!Array.isArray(dates)||!dates.length||new Set(dates).size!==dates.length||dates.some(d=>!record.dates.includes(d)||d<today||record.cancelledDates?.includes(d)))throw Error('Choose remaining leave dates from today onwards.');record.cancelledDates=[...new Set([...(record.cancelledDates||[]),...dates])].sort();record.cancelledBy=actor.id;record.cancelledAt=now;
  }else if(['advance-leave-approve','advance-leave-reject'].includes(op)){
   if(actor.id!=='principal')throw Error('Principal review required.');if(record.status!=='pending')throw Error('This leave report is not awaiting review.');record.status=op==='advance-leave-approve'?'recorded':'not-approved';record.reviewedBy=actor.id;record.reviewedAt=now;
  }else throw Error('Unknown advance leave operation.');record.updatedAt=now;record.revision++;
 }
 next.revision=(next.revision||0)+1;return next;
}
export function publicAdvanceLeaves(leaves){return Object.fromEntries(Object.entries(leaves||{}).map(([id,r])=>[id,Object.fromEntries(['id','staffId','name','wing','dates','status','cancelledDates','submittedAt','updatedAt','revision','reviewedAt'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]))]));}
