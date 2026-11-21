import {isGangaDeviProfile} from '../cbse-faculty-guest.js';
import {compareRollStaff} from '../cbse-roll-call-roster.js';

const aliases={ENGLISHCORE:'ENGLISH',ENGLISHLANGUAGEANDLITERATURE:'ENGLISH',HINDICORE:'HINDI',
 ARTIFICIALINTELLIGENCE:'AI',COMPUTERSCIENCE:'CS',INFORMATICSPRACTICES:'IP',POLITICALSCIENCE:'POLSCI',
 BUSINESSSTUDIES:'BSTD',MATHEMATICS:'MATHS',MATHEMATICSBASIC:'MATHSBASIC',MATHEMATICSSTANDARD:'MATHSSTANDARD'};
const subjectKey=value=>{
 const key=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 return aliases[key]||key;
};

const paperKey=(classId,section,subject)=>JSON.stringify([classId,String(section).trim().toUpperCase(),subjectKey(subject)]);
const classIds={'10':'X','11':'XI','12':'XII'};

function publishedAssignments(published,role,step){
 const assignments=new Map();
 for(const entry of Object.values(published?.assignments||{})){
  const section=String(entry.section||'').trim().match(/^(?:Class\s+)?(10|11|12|XII|XI|X)\s*-?\s*([A-E])$/i);
  const id=(entry.substitutes?.[step]||entry.roles?.[role])?.id;
  if(!section||!id)continue;
  const standard=section[1].toUpperCase(),key=paperKey(classIds[standard]||standard,section[2],entry.subject);
  const people=assignments.get(key)||new Set();
  people.add(id);assignments.set(key,people);
 }
 return ({classId,section,subject,paperName})=>[...(assignments.get(paperKey(classId,section,paperName||subject))||[])];
}

export function publishedMarksCheckers(published,staff={},identityIds=id=>[id],overrides={}){
 const assigned=publishedAssignments(published,'checker','step_1');
 const recover=new Map();
 const owners=new Set(Object.entries(staff).filter(([,person])=>person.status==='active'&&isGangaDeviProfile(person))
  .map(([id])=>identityIds(id).sort()[0]||id));
 // Older published plans can have an empty checker ID for the verified Ganga Devi alias.
 if(owners.size===1){
  const [id]=owners;
  for(const [serial,subject,section,,,checker] of published?.sheets?.[0]?.slice(5)||[]){
   const key='row_'+serial,entry=published.assignments?.[key];
   if(entry?.subject===subject&&entry.section===section&&!entry.roles?.checker&&!entry.substitutes?.step_1&&
      !Object.hasOwn(overrides[key]||{},'checker')&&isGangaDeviProfile({name:checker}))
    recover.set(key,{...entry,roles:{...entry.roles,checker:{id}}});
  }
 }
 const recovered=publishedAssignments({assignments:Object.fromEntries(recover)},'checker','step_1');
 return paper=>[...assigned(paper),...recovered(paper)];
}

export function withPublishedPB1Evaluators(mission,published,scopes){
 const evaluators=publishedAssignments(published,'evaluator','step_0');
 const allocations={...mission.allocations};
 for(const scope of scopes){
  const {classId,sectionId,subjectId}=scope;
  for(const staffId of evaluators(scope)){
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
