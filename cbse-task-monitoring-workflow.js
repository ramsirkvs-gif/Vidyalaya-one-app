export const MONITORING_ROLES=[['evaluator','Evaluator'],['checker','Checker'],['matching','Matching IC']];
export const MONITORING_STEPS=[
 {role:'evaluator',label:'Evaluation',options:[['advance','Evaluated and submitted to Checker']]},
 {role:'checker',label:'Cross-check',options:[['advance','Checked and returned to Evaluator'],['return','Corrections required']]},
 {role:'evaluator',label:'Principal discussion',review:true,options:[['advance','Discussed with Principal and updated']]},
 {role:'evaluator',label:'Samagam upload',options:[['advance','Uploaded on Samagam']]},
 {role:'matching',label:'Matching by Core Team member',options:[['advance','Matched Samagam marks with the mark slip']]},
 {role:'matching',label:'Slip handover',options:[['advance','Samagam slip submitted to Exam Department']]},
 {role:'exam',label:'Exam Department verification',options:[['advance','Received and verified'],['return','Returned for correction']]},
];

export function monitoringStage(progress){
 const stage=progress?.stage||0;
 // The previous upload step already included matching.
 return progress?.separateMatching||stage<4?stage:stage+1;
}

export function monitoringPeople(published,entry,position){
 const substitute=entry?.substitutes?.['step_'+position];
 if(substitute)return [substitute];
 const role=MONITORING_STEPS[position]?.role;
 return role==='exam'?published?.examReviewers||[]:[entry?.roles?.[role]].filter(Boolean);
}

export function monitoringAssignments(sheets,staff,overrides={}){
 const names=new Map(),records={};
 const normalize=name=>String(name||'').toLowerCase().replace(/^(mr|mrs|ms|dr|shri|smt)\.?\s+/,'').replace(/[^\p{L}\p{N}]/gu,'');
 for(const [id,person] of Object.entries(staff)){
  if(person.status!=='active')continue;
  const key=normalize(person.name),owner=person.pinOwnerId||id;
  if(key){const matches=names.get(key)||new Set();matches.add(owner);names.set(key,matches);}
 }
 for(const row of sheets[0].slice(5)){
  if(!row.some(Boolean))continue;
  const [serial,subject,section]=row,key='row_'+serial;
  if(!/^[1-9]\d{0,5}$/.test(serial)||!subject.trim()||!section.trim()||Object.hasOwn(records,key))
   throw Error('Each evaluation row needs a unique positive SN, subject and class / section.');
  const roles={};
  MONITORING_ROLES.forEach(([role],index)=>{
   const selected=overrides[key]?.[role],matches=names.get(normalize(row[index+4]));
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
 const progress={stage,separateMatching:true,revision:previous.revision+1,identity:{subject,section},history:[...previous.history,{label:option[1],name:actor.name,remark,at:stamp}]};
 return {...record,progress:{...record.progress,[input.rowKey]:progress}};
}
