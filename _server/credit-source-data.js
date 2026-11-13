// These are calculation inputs only. Original questions, images and records stay untouched.
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
const map=(values,project)=>Object.fromEntries(Object.entries(values||{}).map(([id,value])=>[id,project(value||{})]));
export const creditQuestions=value=>map(value,q=>pick(q,['id','questionBankEpoch','deleted','contributorId','subjectName','createdAt']));
export const creditPapers=value=>map(value,p=>({...pick(p,['id','questionBankEpoch','deleted','createdBy','createdAt','subjectName','questionIds']),questions:(p.questions||[]).map(q=>pick(q,['id','questionBankEpoch']))}));
export const creditEvaluations=value=>map(value,r=>pick(r,['paperId','studentKey','score','maximum','originalEvaluatorId','evaluatorId','evaluatedAt']));
export const creditPosts=value=>map(value,p=>pick(p,['authorId','createdAt','text']));
export function creditMission(value){const out={...value};delete out.studentPhotos;delete out.staffPhotos;delete out.conversationAudit;return out;}
