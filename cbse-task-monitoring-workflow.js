import {isAvinashGuestProfile} from './cbse-faculty-guest.js';

export const monitoringExamLabel=section=>/\b(?:11|XI)\b/i.test(section)?'XI Half-Yearly':'PB-1';

export const FINAL_EXAM_IC_NAMES=['Mr. Paramveer Meena','Mr. Sunil Kumar'];
export const MONITORING_ROLES=[['evaluator','Evaluator'],['checker','Checker'],['matching','Matching IC']];
export const MONITORING_STEPS=[
 {role:'evaluator',label:'Evaluation',options:[['advance','Evaluated and submitted to Checker']]},
 {role:'checker',label:'Cross-check',options:[['advance','Checked and returned to Evaluator'],['return','Corrections required']]},
 {role:'evaluator',label:'Principal discussion',review:true,options:[['advance','Discussed with Principal and updated']]},
 {role:'evaluator',label:'Upload signed PDF',uploadPdf:true,options:[['advance','Signed PDF uploaded']]},
 {role:'matching',label:'Samagam upload with Matching IC (Exam Core Team)',samagam:true,options:[['advance','Uploaded on Samagam and matched with the mark slip']]},
 {role:'matching',label:'Hand over Samagam slip to Exam Department',options:[['advance','Samagam slip handed over to Exam Department']]},
 {role:'exam',label:'Final report by Exam IC',options:[['advance','Final report completed by Exam IC'],['return','Returned for correction']]},
];

export function monitoringStage(progress){
 const stage=progress?.stage||0;
 // The previous upload step already included matching.
 return progress?.separateMatching||stage<4?stage:stage+1;
}

export function monitoringPeople(published,entry,position){
 const role=MONITORING_STEPS[position]?.role;
 if(role==='exam')return published?.examReviewers||[];
 const substitute=entry?.substitutes?.['step_'+position];
 return [substitute||entry?.roles?.[role]].filter(Boolean);
}

const assignmentNameKey=name=>isAvinashGuestProfile({name})?'avinashsingh':
 String(name||'').toLowerCase().replace(/^(mr|mrs|ms|dr|shri|smt)\.?\s+/,'').replace(/[^\p{L}\p{N}]/gu,'');

export function resolvePublishedAvinashAssignments(published,staff,overrides={}){
 if(!published?.assignments||!Array.isArray(published.sheets?.[0]))return published;
 const owners=new Set(Object.entries(staff).filter(([,person])=>person.status==='active'&&isAvinashGuestProfile(person))
  .map(([id,person])=>person.pinOwnerId||id).filter(id=>staff[id]?.status==='active'));
 if(owners.size!==1)return published;
 const id=[...owners][0],assignments={...published.assignments};
 for(const [serial,subject,section,...cells] of published.sheets[0].slice(5)){
  const key='row_'+serial,entry=assignments[key];
  if(!entry||entry.subject!==subject||entry.section!==section)continue;
  const roles={...entry.roles};
  MONITORING_ROLES.forEach(([role],index)=>{
   if(!roles[role]&&!Object.hasOwn(overrides[key]||{},role)&&isAvinashGuestProfile({name:cells[index+1]}))
    roles[role]={id,name:staff[id].name};
  });
  assignments[key]={...entry,roles};
 }
 return {...published,assignments};
}

export function monitoringAssignments(sheets,staff,overrides={}){
 const names=new Map(),records={};
 for(const [id,person] of Object.entries(staff)){
  if(person.status!=='active')continue;
  const key=assignmentNameKey(person.name),owner=person.pinOwnerId||id;
  if(key){const matches=names.get(key)||new Set();matches.add(owner);names.set(key,matches);}
 }
 for(const row of sheets[0].slice(5)){
  if(!row.some(Boolean))continue;
  const [serial,subject,section]=row,key='row_'+serial;
  if(!/^[1-9]\d{0,5}$/.test(serial)||!subject.trim()||!section.trim()||Object.hasOwn(records,key))
   throw Error('Each evaluation row needs a unique positive SN, subject and class / section.');
  const roles={};
  MONITORING_ROLES.forEach(([role],index)=>{
   const selected=overrides[key]?.[role],matches=names.get(assignmentNameKey(row[index+4]));
   const id=selected===undefined?(matches?.size===1?[...matches][0]:''):selected;
   const owner=Object.hasOwn(staff,id)?staff[id].pinOwnerId||id:'';
   if(owner&&staff[owner]?.status==='active')roles[role]={id:owner,name:staff[owner].name};
  });
  records[key]={subject,section,roles};
 }
 return records;
}

export function monitoringAdvance(record,input,actor,stamp){
 const entry=Object.hasOwn(record.published?.assignments||{},input.rowKey)?record.published.assignments[input.rowKey]:null;
 if(!entry)throw Error('This evaluation row is unavailable.');
 const previous=record.progress?.[input.rowKey]||{stage:0,revision:0,history:[]};
 if(input.expectedRevision!==previous.revision||input.publicationRevision!==record.published.revision)
  throw Error('This row or its assignments changed. Reopen it before saving.');
 const currentStage=monitoringStage(previous);
 const step=MONITORING_STEPS[currentStage];
 if(!step)throw Error('This row is already closed.');
 const eligible=monitoringPeople(record.published,entry,currentStage);
 if(!eligible?.some(person=>person?.id===actor.id))throw Error('This step is assigned to another staff member.');
 const option=step.options.find(([value])=>value===input.outcome);
 if(!option)throw Error('Choose a valid status.');
 const remark=typeof input.remark==='string'?input.remark.trim():'';
 if(remark.length>500||((input.outcome==='return'||step.role==='exam')&&!remark))throw Error('Enter a remark of up to 500 characters.');
 const stage=input.outcome==='return'?(currentStage===1?0:3):currentStage+1;
 const {subject,section}=entry;
 const progress={stage,separateMatching:true,revision:previous.revision+1,identity:{subject,section},...(previous.signedSlip?{signedSlip:previous.signedSlip}:{}),history:[...previous.history,{label:option[1],name:actor.name,remark,at:stamp}]};
 return {...record,progress:{...record.progress,[input.rowKey]:progress}};
}
