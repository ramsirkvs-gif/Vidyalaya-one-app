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
 box.append(el('p','Total fail = Critical fail + Fail (excluding critical). Total fail is a combined count, so do not add it again when counting all students. AB/unassessed is separate and is not zero. A student’s colour follows the weakest selected subject. A critical tile means at least one critical subject; student tiles list every critical subject, not just one example.','muted'));parent.append(box);return box;
}

export function renderCountStatistics(parent,counts,total,{onSelect,selected='all'}={}){
 const labels={critical:'Critical fail',red:'Fail (excluding critical)',fail:'Total fail · Critical + Fail',yellow:'Borderline',green:'Secure pass',grey:'AB / not assessed'};
 const box=el('div',undefined,'stats performance-counts large-statistics'),values={...counts,fail:(counts.critical||0)+(counts.red||0)};
 for(const key of ['critical','red','fail','yellow','green','grey']){const n=values[key]||0,tile=el(onSelect?'button':'div',undefined,`stat statistic-button ${key}`);if(onSelect){tile.type='button';tile.onclick=()=>onSelect(selected===key?'all':key);tile.setAttribute('aria-pressed',String(selected===key));}tile.setAttribute('aria-label',`${labels[key]}: ${outOf(n,total)}`);tile.append(el('strong',String(n)),el('span',labels[key]),el('small',`out of ${total} students · ${total?(n/total*100).toFixed(1):'0.0'}%`));box.append(tile);}parent.append(box);return box;
}

export function subjectCareLines(progress){
 const subjects=progress.subjects||[],lines=[];
 for(const[band,label]of [['critical','Critical subjects'],['red','Other failing subjects']]){const group=subjects.filter(s=>s.band===band&&s.latest);if(group.length)lines.push(`${label} (${group.length}): ${group.map(s=>`${s.name}: ${markPercentage(s.latest)}`).join(' · ')}`);}
 if(!lines.length){const appeared=subjects.filter(s=>s.latest&&!s.latest.absent).sort((a,b)=>a.latest.score/a.latest.maximum-b.latest.score/b.latest.maximum);if(appeared.length)lines.push(`Lowest recorded subject: ${appeared[0].name}: ${markPercentage(appeared[0].latest)}`);}
 return lines;
}
export function renderGenderStatistics(parent,counts,total,{selected='',onSelect}={}){
 const box=el('div',undefined,'stats gender-statistics');
 for(const[key,label,n]of [['','Students',total],['girl','Girls',counts.girl],['boy','Boys',counts.boy]]){const tile=el('button',undefined,'stat');tile.type='button';tile.setAttribute('aria-label',`${label}: ${outOf(n,total)}`);tile.setAttribute('aria-pressed',String(selected===key));tile.append(el('strong',String(n)),el('span',label),el('small',`out of ${total} students`));tile.onclick=()=>onSelect?.(key===selected?'':key);box.append(tile);}parent.append(box);return box;
}
