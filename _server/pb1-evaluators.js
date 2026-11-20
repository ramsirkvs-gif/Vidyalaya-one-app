import {compareRollStaff} from '../cbse-roll-call-roster.js';

const aliases={ENGLISHCORE:'ENGLISH',ENGLISHLANGUAGEANDLITERATURE:'ENGLISH',HINDICORE:'HINDI',
 ARTIFICIALINTELLIGENCE:'AI',COMPUTERSCIENCE:'CS',INFORMATICSPRACTICES:'IP',POLITICALSCIENCE:'POLSCI',
 BUSINESSSTUDIES:'BSTD',MATHEMATICS:'MATHS',MATHEMATICSBASIC:'MATHSBASIC',MATHEMATICSSTANDARD:'MATHSSTANDARD'};
const subjectKey=value=>{
 const key=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 return aliases[key]||key;
};

export function withPublishedPB1Evaluators(mission,published,scopes){
 const assignments=new Map();
 for(const entry of Object.values(published?.assignments||{})){
  const section=String(entry.section||'').match(/^(?:Class\s+)?(10|12|XII|X)\s*-?\s*([A-E])$/i);
  const id=(entry.substitutes?.step_0||entry.roles?.evaluator)?.id;
  if(!section||!id)continue;
  const classId=['10','X'].includes(section[1].toUpperCase())?'X':'XII';
  const key=JSON.stringify([classId,section[2].toUpperCase(),subjectKey(entry.subject)]);
  const evaluators=assignments.get(key)||new Set();
  evaluators.add(id);assignments.set(key,evaluators);
 }
 const allocations={...mission.allocations};
 for(const {classId,sectionId,section,subjectId,subject,paperName} of scopes){
  const evaluators=assignments.get(JSON.stringify([classId,section.trim().toUpperCase(),subjectKey(paperName||subject)]));
  for(const staffId of evaluators||[]){
   allocations[JSON.stringify(['pb1 evaluator',classId,sectionId,subjectId,staffId])]={classId,sectionId,subjectId,staffId};
  }
 }
 return {...mission,allocations};
}

export function evaluatorDirectory(staff,access,identityIds,assigned,pinOwner=id=>id){
 const groups=new Map();
 for(const [id,person] of Object.entries(staff)){
  if(person.status!=='active')continue;
  const ids=identityIds(id);
  if(!ids.some(key=>assigned.has(key)))continue;
  const key=[...ids].sort().join('|');
  const owner=pinOwner(id);
  const candidates=groups.get(key)||new Map();
  candidates.set(owner,staff[owner]||person);
  groups.set(key,candidates);
 }
 return [...groups.values()].map(candidates=>{
  const [id,person]=[...candidates].sort(([a],[b])=>Number(!!access[b]?.enabled)-Number(!!access[a]?.enabled)||a.localeCompare(b))[0];
  return {...person,id};
 }).sort(compareRollStaff).map(({id,name})=>({id,name}));
}
