import {effectiveStudentMarks} from './cbse-maths-carryover.js';
import {clone,entries} from './cbse-model.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toUpperCase();
export const validMonth=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export function academicMarkBand(mark,red=33,green=75){
 if(!mark||mark.absent||!Number.isFinite(mark.score))return 'grey';
 if(mark.importSource==='monthly_workbook_v1')return mark.score<mark.criticalBelow?'critical':mark.score<mark.passFrom?'red':mark.score<mark.secureFrom?'yellow':'green';
 const pct=mark.score/mark.maximum*100;return pct<red?'red':pct<green?'yellow':'green';
}
export function overallAcademicBand(bands){for(const value of ['critical','red','grey','yellow'])if(bands.includes(value))return value;return bands.length?'green':'grey';}
export function importAcademicHistory(pkg,mission,draft,{replaceExisting=false}={}){
 assert(pkg?.format==='mission-academic-history-v1'&&/^\d{4}-\d{2}$/.test(pkg.session),'Choose the prepared academic-history JSON package.');
 assert(Array.isArray(pkg.records)&&pkg.records.length>0&&pkg.records.length<=30000,'Academic package must contain 1–30000 results.');
 const next=clone(mission),lookup=new Map(),latestPeriods=new Map(),counts={},seen=new Set();
 for(const[cl,c]of entries(draft.classes))for(const[sid,s]of entries(c.sections))for(const[id,p]of entries(s.students)){
  const k=`${cl}|${norm(s.name)}|${norm(p.name)}`,item={...p,key:`${cl}:${sid}:${id}`,classId:cl,sectionId:sid,section:s.name,catalog:s.subjects||{}};
  if(lookup.has(k))lookup.set(k,null);else lookup.set(k,item);
 }
 const resolve=r=>{assert(r&&typeof r==='object','Invalid academic row.');const identity=`${r.classId}|${norm(r.section)}|${norm(r.name)}`,person=lookup.get(identity);assert(person,`No unique roster match for ${r.classId}-${r.section} ${String(r.name||'')}.`);return person;};
 next.exams||={};next.marks||={};next.academicAttendance||={};let added=0,updated=0,skipped=0,absent=0,inferred=0;
 for(const[rindex,r]of pkg.records.entries()){
  const p=resolve(r);assert(validMonth(r.period),'Each result needs a real YYYY-MM period; exact dates are not invented.');
  const sessionStart=Number(pkg.session.slice(0,4)),year=Number(r.period.slice(0,4)),month=Number(r.period.slice(5));assert(Number(pkg.session.slice(5))===(sessionStart+1)%100&&year===(month>=4?sessionStart:sessionStart+1),'A result falls outside the selected academic session.');
  const matches=entries(p.catalog).filter(([,s])=>norm(s.name)===norm(r.subject));assert(matches.length===1,`Unknown/ambiguous subject for row ${rindex+1}: ${r.subject}.`);const sid=matches[0][0];assert(p.subjects?.[sid],`${r.subject} is not selected for ${p.name}; it cannot be imported as AB.`);
  assert(typeof r.absent==='boolean'&&Number.isFinite(r.maximum)&&r.maximum>0&&r.maximum<=1000&&(r.absent?r.score===null:Number.isFinite(r.score)&&r.score>=0&&r.score<=r.maximum),'Expected valid marks/maximum, or an explicit AB without a numeric score.');
  assert([r.passFrom,r.secureFrom,r.criticalBelow].every(Number.isFinite)&&r.criticalBelow>=0&&r.criticalBelow<=r.passFrom&&r.passFrom<r.secureFrom&&r.secureFrom<=r.maximum,'Review the critical, pass and secure-pass marks for this paper maximum.');
  assert(typeof r.inferredAbsent==='boolean'&&(!r.inferredAbsent||r.absent)&&typeof r.sourceValue==='string'&&r.sourceValue.length<=30,'Invalid source/absence metadata.');
  const type=r.examType||'monthly';assert(['monthly','test','PB-1','PB-2','weekly','mock'].includes(type),'Invalid exam type.');const suffix=type==='monthly'?'':'_'+String(r.examKey||type).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70);const examId=`academic_${p.classId}_${r.period.replace('-','_')}${suffix}`,id=`academic_${p.key.replaceAll(':','_')}_${r.period.replace('-','_')}_${sid}${suffix}`;
  assert(!seen.has(id),`Duplicate result for ${p.name}, ${r.subject}, ${r.period}.`);seen.add(id);
  if(!latestPeriods.has(p.key)||r.period>latestPeriods.get(p.key))latestPeriods.set(p.key,r.period);
  const old=next.marks[id];if(old&&!replaceExisting){skipped++;continue;}if(old)updated++;else added++;
  const existing=next.exams[examId];assert(!existing||existing.classId===p.classId&&existing.date===r.period&&existing.datePrecision==='month','An existing exam conflicts with this import.');
  next.exams[examId]={name:String(r.examName||`Monthly Test · ${r.period}`).slice(0,100),classId:p.classId,type,date:r.period,datePrecision:'month',session:pkg.session};
  next.marks[id]={updatedAt:Date.now(),studentKey:p.key,subjectId:sid,examId,maximum:r.maximum,score:r.score,absent:r.absent,importSource:'monthly_workbook_v1',sourceValue:r.sourceValue,inferredAbsent:r.inferredAbsent,passFrom:r.passFrom,secureFrom:r.secureFrom,criticalBelow:r.criticalBelow};
  absent+=r.absent?1:0;inferred+=r.inferredAbsent?1:0;const section=`${p.classId}-${p.section}`;counts[section]||={students:new Set(),results:0};counts[section].students.add(p.key);counts[section].results++;
 }
 assert(pkg.attendance===undefined||Array.isArray(pkg.attendance)&&pkg.attendance.length<=2000,'Invalid attendance summary.');
 const attendanceSeen=new Set();for(const r of pkg.attendance||[]){const p=resolve(r);assert(!attendanceSeen.has(p.key),'Duplicate attendance summary.');attendanceSeen.add(p.key);assert(latestPeriods.has(p.key),'Attendance summary has no matching academic results.');assert(Number.isFinite(r.percentage)&&r.percentage>=0&&r.percentage<=100&&r.session===pkg.session,'Invalid cumulative attendance percentage.');next.academicAttendance[p.key]={percentage:r.percentage,session:pkg.session,source:'consolidated_workbook',throughPeriod:latestPeriods.get(p.key)||''};}
 return {next,added,updated,skipped,absent,inferred,summary:Object.entries(counts).map(([section,c])=>({section,students:c.students.size,results:c.results})).sort((a,b)=>a.section.localeCompare(b.section))};
}
export function academicPeriods(mission){return [...new Set(entries(mission.exams).map(([,e])=>String(e.date||'').slice(0,7)).filter(validMonth))].sort();}
export function periodRange(periods){if(!periods.length)return [];const sorted=[...periods].sort(),out=[];let year=Number(sorted[0].slice(0,4)),month=Number(sorted[0].slice(5));for(let i=0;i<120;i++){const p=`${year}-${String(month).padStart(2,'0')}`;if(p>sorted.at(-1))break;out.push(p);if(++month>12){month=1;year++;}}return out;}
export function academicSnapshot(person,mission,period){
 const selected={};for(const[id,m]of entries(effectiveStudentMarks(person,mission.marks))){const exam=mission.exams?.[m.examId];if(m.studentKey!==person.key||!exam||period&&String(exam.date).slice(0,7)!==period)continue;const previous=selected[m.subjectId];if(!previous||exam.date>previous.exam.date||exam.date===previous.exam.date&&(m.updatedAt||0)>=(previous.updatedAt||0))selected[m.subjectId]={...m,id,exam};}
 const subjects=entries(person.subjects).filter(([,on])=>on).map(([id])=>{const mark=selected[id],rules=entries(mission.gradingRules).map(([,r])=>r).filter(r=>r.classId===person.classId&&(!r.subjectId||r.subjectId===id)&&(!r.examId||r.examId===mark?.examId)).sort((a,b)=>(b.subjectId?2:0)+(b.examId?1:0)-(a.subjectId?2:0)-(a.examId?1:0))[0]||mission.settings;return {id,name:person.subjectCatalog?.[id]?.name||id,mark,band:academicMarkBand(mark,rules.redBelow,rules.greenFrom)};});
 const appeared=subjects.filter(s=>s.mark&&!s.mark.absent),total=appeared.reduce((n,s)=>n+s.mark.score,0),maximum=appeared.reduce((n,s)=>n+s.mark.maximum,0);
 return {subjects,total,maximum,percentage:maximum?total/maximum*100:null,appeared:appeared.length,expected:subjects.length,absent:subjects.filter(s=>s.mark?.absent).length,unrecorded:subjects.filter(s=>!s.mark).length,academic:overallAcademicBand(subjects.map(s=>s.band)),failing:subjects.filter(s=>['critical','red'].includes(s.band)).length,critical:subjects.filter(s=>s.band==='critical').length};
}

export const latestAcademicSnapshot=(person,mission)=>academicSnapshot(person,mission,null);
export function recordedProgressRange(mission,keys){const selected=keys?new Set(keys):null,periods=Object.values(mission.marks||{}).filter(m=>!selected||selected.has(m.studentKey)).map(m=>String(mission.exams?.[m.examId]?.date||'').slice(0,7)).filter(validMonth).sort();return {from:periods[0]||'',to:periods.at(-1)||''};}
