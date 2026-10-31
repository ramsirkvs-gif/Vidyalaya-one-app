import {resolvedFaculty,ORIGINAL_FACULTY_SHA} from './cbse-faculty-model.js';
const entries=v=>Object.entries(v||{});
export const normalizedGender=v=>({female:'girl',f:'girl',girl:'girl',male:'boy',m:'boy',boy:'boy'}[String(v||'').trim().toLowerCase()]||'unknown');
const subjectKey=v=>{const n=String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return /^(MATHEMATICS|MATHS|MATH)(STANDARD|BASIC)?$/.test(n)?'MATHS':/^(ENGLISH|ENGLISHLANGUAGEANDLITERATURE|ENGLISHCORE)$/.test(n)?'ENGLISH':/^(AI|ARTIFICIALINTELLIGENCE)$/.test(n)?'AI':n;};
export function resolvedAllocations(draft,faculty,mission){
 const out={...mission?.allocations};
 for(const[cl,c]of entries(draft?.classes))for(const[sid,section]of entries(c.sections))for(const[subId,subject]of entries(section.subjects)){
  if(Object.values(out).some(a=>a.classId===cl&&a.sectionId===sid&&a.subjectId===subId))continue;
  const candidates=entries(faculty?.classes?.[cl]?.teachers).filter(([tid,t])=>{if(!tid.startsWith(`pdf_${ORIGINAL_FACULTY_SHA.slice(0,16)}_`))return false;const subjects=[...new Set(String(t.subjects||'').split(/[·,+;/]/).map(subjectKey).filter(Boolean))];return t.status==='active'&&subjects.length===1&&subjects[0]===subjectKey(subject.name)&&String(t.teachingSections||'').split(/[,;]/).map(s=>s.trim().toUpperCase()).includes(section.name.toUpperCase());});
  // Only a single subject and a unique section match are unambiguous. Explicit
  // saved allocations always take precedence; mixed-subject rosters need review.
  if(candidates.length===1)out[`${cl}_${sid}_${subId}`]={classId:cl,sectionId:sid,subjectId:subId,staffId:cl+':'+candidates[0][0]};
 }
 return out;
}
export function resolvedViewingData(draft,faculty,mission){
 const f=resolvedFaculty(faculty,draft?.classes),students={...mission?.students};
 for(const[cl,c]of entries(draft?.classes))for(const[sid,s]of entries(c.sections))for(const[id,p]of entries(s.students)){
  const key=`${cl}:${sid}:${id}`,old=students[key]||{};
  students[key]={guardian:'',phones:'',location:'',...old,gender:normalizedGender(old.gender==='unknown'||!old.gender?p.gender:old.gender)};
 }
 return {faculty:f,mission:mission?{...mission,students,allocations:resolvedAllocations(draft,f,mission)}:mission};
}

export function teacherIdentityIds(id,faculty,mission={}){
 const [cl,...parts]=id.split(':'),own=faculty?.classes?.[cl]?.teachers?.[parts.join(':')];if(!own||own.status!=='active')return [id];
 const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toUpperCase();
 return entries(faculty.classes).flatMap(([c,g])=>entries(g.teachers).filter(([,t])=>t.status==='active'&&norm(t.name)===norm(own.name)&&norm(t.designation)===norm(own.designation)).map(([tid])=>`${c}:${tid}`));
}
