import {createHash} from 'node:crypto';
import {PB1_SAMAGAM_SOURCE,pb1ApprovalKey} from '../cbse-academic-exam-kind.js';
import {pb1Scopes} from '../cbse-pb1-analyser-model.js';
import {studentIndex} from '../cbse-mission-model.js';
import {samagamSections} from '../cbse-samagam-pb1-import.js';

const normalize=name=>String(name||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keyOf=paper=>pb1ApprovalKey(paper.classId,paper.sectionId,paper.subjectId);
const maths=new Set(['041','241']);
const check=(condition,message)=>{if(!condition)throw Error(message);};

export function planSamagamPB1(files,draft,mission,stamp){
 check(Array.isArray(files)&&files.length===samagamSections.length&&new Set(files.map(file=>file?.section)).size===samagamSections.length&&
  files.every(file=>samagamSections.includes(file.section)&&Array.isArray(file.rows)&&file.rows.length>0&&file.rows.length<=100),
  'Upload one final marks statement for each of the nine sections.');
 const papers=pb1Scopes(draft,mission,{}),roster=Object.values(studentIndex(draft));
 const approved={},exams={...mission.exams},changedCourses=[];
 let nextDraft=draft,students=0,entries=0,absences=0,rollDifferences=0;
 for(const {section,rows} of [...files].sort((a,b)=>a.section.localeCompare(b.section))){
  const classId=section.startsWith('10')?'X':'XII',letter=section.slice(-1);
  const sectionRoster=roster.filter(person=>person.classId===classId&&String(person.section).trim().toUpperCase()===letter);
  check(sectionRoster.length===rows.length,'Samagam and app enrollment differ in '+section+'.');
  const scope=papers.filter(paper=>paper.classId===classId&&String(paper.section).trim().toUpperCase()===letter);
  const byCode=new Map(scope.map(paper=>[paper.code,paper]));
  check(byCode.size===scope.length,'The app has ambiguous PB-1 subject mappings in '+section+'.');
  const used=new Set();
  for(const row of rows){
   const name=row?.name;
   check(typeof name==='string'&&name.length<=120&&normalize(name)&&Array.isArray(row.marks)&&row.marks.length===6,
    'Every student needs six recorded Samagam subjects, including AI ('+section+').');
   const match=sectionRoster.filter(person=>normalize(person.name)===normalize(name));
   check(match.length===1&&!used.has(match[0]?.key),'No unique app roster match for '+name+' in '+section+'.');
   const [person]=match;
   used.add(person.key);students++;
   if(String(person.roll??'').replace(/^(?:10|12)[1-9](?=\d\d$)/,'').replace(/^0+/,'')!==String(row.roll).replace(/^0+/,''))rollDifferences++;
   const enrolled=new Set(scope.filter(paper=>person.subjects?.[paper.subjectId]).map(paper=>paper.code));
   const incoming=new Set(row.marks.map(mark=>mark?.[0]));
   check(incoming.size===row.marks.length,'Duplicate Samagam subject for '+name+'.');
   if(classId==='X'){
    const before=[...enrolled].find(code=>maths.has(code)),after=[...incoming].find(code=>maths.has(code));
    if(before&&after&&before!==after&&byCode.has(after)){
     const oldPaper=byCode.get(before),newPaper=byCode.get(after);
     if(nextDraft===draft)nextDraft=structuredClone(draft);
     const studentId=person.key.split(':').slice(2).join(':');
     const subjectChoices=nextDraft.classes[classId].sections[person.sectionId].students[studentId].subjects;
     delete subjectChoices[oldPaper.subjectId];subjectChoices[newPaper.subjectId]=true;
     enrolled.delete(before);enrolled.add(after);
     changedCourses.push({section,name,from:oldPaper.paperName,to:newPaper.paperName});
    }
   }
   check(incoming.size===enrolled.size&&[...incoming].every(code=>enrolled.has(code)),
    'Samagam subject choices do not match app enrollment for '+name+' in '+section+'.');
   for(const [code,maximum,mark] of row.marks){
    const paper=byCode.get(code),absent=mark==='AB';
    const expected=code==='029'&&classId==='XII'?80:paper?.maximum;
    check(paper&&maximum===expected&&(absent||Number.isFinite(mark)&&mark>=0&&mark<=maximum),
     'Invalid mark or maximum for '+name+' in '+section+' ('+code+').');
    const key=keyOf(paper),examId='samagam_pb1_'+classId+'_'+code,
     exam={name:'PB-1 · Samagam final',classId,type:'PB-1',date:paper.date};
    exams[examId]=exam;
    const approval=approved[key]??={approvedAt:stamp,source:PB1_SAMAGAM_SOURCE,maximum,marks:{},
     discussionComment:mission.pb1Approvals?.[key]?.discussionComment||''};
    approval.marks[person.key]={studentKey:person.key,subjectId:paper.subjectId,examId,exam,maximum,absent,
     score:absent?null:mark,importSource:PB1_SAMAGAM_SOURCE};
    entries++;if(absent)absences++;
   }
  }
 }
 if(nextDraft!==draft)nextDraft.revision=(draft.revision||0)+1;
 const summary={students,entries,absences,papers:Object.keys(approved).length,rollDifferences,changedCourses};
 const fingerprint=digest(Object.entries(approved).sort().map(([key,a])=>[key,a.maximum,Object.entries(a.marks).sort()]));
 // Keep the prior locally frozen snapshots for audit, outside normal result selection.
 const prior=mission.samagamPB1?.fingerprint===fingerprint?mission.samagamPB1.prior:
  mission.samagamPB1?.prior||mission.pb1Approvals||{};
 const approvals={...mission.pb1Approvals,...approved};
 for(const paper of papers)if(!approved[keyOf(paper)])delete approvals[keyOf(paper)];
 return {summary,draft:nextDraft,mission:{...mission,exams,pb1Approvals:approvals,
  samagamPB1:{fingerprint,importedAt:stamp,prior},revision:(mission.revision||0)+1}};
}
