import {el} from './cbse-ui.js';
export const percentage=value=>Number.isFinite(value)?value.toFixed(1)+'%':'—';
export function markPercentage(mark){return !mark?'—':mark.absent?'AB':Number.isFinite(mark.score)&&mark.maximum>0?percentage(mark.score/mark.maximum*100):'—';}
export const outOf=(count,total,unit='students')=>`${count} out of ${total} ${unit}`;
const number=value=>Number(value.toFixed(2)).toString();
export function renderPerformanceCriteria(parent,marks,mission,{classId=''}={}){
 const groups=new Map();for(const m of marks){if(!m||!Number.isFinite(m.maximum)||m.maximum<=0)continue;let critical=null,pass,secure;
  if(m.importSource==='monthly_workbook_v1'){critical=m.criticalBelow/m.maximum*100;pass=m.passFrom/m.maximum*100;secure=m.secureFrom/m.maximum*100;}
  else{const cl=mission.exams?.[m.examId]?.classId||classId,rules=Object.values(mission.gradingRules||{}).filter(r=>r.classId===cl&&(!r.subjectId||r.subjectId===m.subjectId)&&(!r.examId||r.examId===m.examId)).sort((a,b)=>(b.subjectId?2:0)+(b.examId?1:0)-(a.subjectId?2:0)-(a.examId?1:0))[0]||mission.settings;pass=rules.redBelow;secure=rules.greenFrom;}
  const key=[m.maximum,critical,pass,secure].join('|');if(!groups.has(key))groups.set(key,{maximum:m.maximum,critical,pass,secure});
 }
 if(!groups.size)return;
 const box=el('section',undefined,'performance-criteria');box.append(el('h3','How the colours are decided · percentage criteria'));
 for(const g of groups.values()){const row=el('div',undefined,'performance-legend');row.append(el('strong',`Papers out of ${g.maximum}: `));if(g.critical!==null)row.append(el('span',`Critical fail: below ${number(g.critical)}%`,'band critical'));row.append(el('span',`Fail${g.critical!==null?' (excluding critical): '+number(g.critical)+'% to below ':': below '}${number(g.pass)}%`,'band red'),el('span',`Borderline: ${number(g.pass)}% to below ${number(g.secure)}%`,'band yellow'),el('span',`Secure pass: ${number(g.secure)}% and above`,'band green'));box.append(row);}
 if([...groups.values()].some(g=>g.maximum===40&&g.pass===32.5))box.append(el('p','For these /40 papers, 13/40 = 32.5% is the pass mark used by the workbook.','muted'));
 box.append(el('p','Critical fail is part of total failures. The two fail tiles are separate groups. AB/unassessed is separate and is not treated as zero. A student’s colour follows the weakest subject.','muted'));parent.append(box);return box;
}
