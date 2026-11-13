const entries=value=>Object.entries(value||{});
const epoch=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const sourceKey=(id,value)=>epoch(value?.questionBankEpoch)+':'+id;
export const validMCQCreditEvaluation=r=>!!r&&!!r.paperId&&!!r.studentKey&&Number.isFinite(r.score)&&Number.isFinite(r.maximum)&&r.maximum>0&&r.score>=0&&r.score<=r.maximum;
// Preparation-only awards are replaced when this contributor evaluates that work.
export function mcqPreparationCredits({questions={},papers={},evaluations={}},canonical){
 const paperIndex=new Map();for(const[id,p]of entries(papers)){paperIndex.set(id,p);if(p.id)paperIndex.set(p.id,p);}
 const testedQuestions=new Set(),testedPapers=new Set();
 for(const r of Object.values(evaluations).filter(validMCQCreditEvaluation)){const member=canonical(r.originalEvaluatorId||r.evaluatorId),paper=paperIndex.get(r.paperId);if(!paper)continue;testedPapers.add(JSON.stringify([member,sourceKey(paper.id||r.paperId,paper)]));const snapshots=new Map((paper.questions||[]).filter(q=>q?.id).map(q=>[q.id,q]));for(const id of new Set([...(paper.questionIds||[]),...snapshots.keys()])){const snapshot=snapshots.get(id);testedQuestions.add(JSON.stringify([member,sourceKey(id,{questionBankEpoch:snapshot?.questionBankEpoch??paper.questionBankEpoch})]));}}
 const rows=[];
 for(const[id,q]of entries(questions)){if(!q||q.deleted||!q.contributorId)continue;const event=sourceKey(q.id||id,q);if(testedQuestions.has(JSON.stringify([canonical(q.contributorId),event])))continue;rows.push({kind:'mcqQuestion',member:q.contributorId,event,at:q.createdAt,detail:(q.id||id)+' · '+(q.subjectName||'MCQ question')+' · preparation',href:'cbse-mission.html#tab=mcq'});}
 for(const[id,p]of entries(papers)){if(!p||p.deleted||!p.createdBy||!(p.questionIds?.length||p.questions?.length))continue;const event=sourceKey(p.id||id,p);if(testedPapers.has(JSON.stringify([canonical(p.createdBy),event])))continue;rows.push({kind:'mcqPaper',member:p.createdBy,event,at:p.createdAt,detail:(p.id||id)+' · '+(p.subjectName||'Question paper')+' · preparation',href:'cbse-mission.html#tab=mcq'});}
 return rows;
}
