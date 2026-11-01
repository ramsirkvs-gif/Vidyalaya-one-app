import {markStudentPhoto} from './cbse-student-photo.js';
import {renderStreamTiles} from './cbse-stream-view.js';
import {xiiStreamGroups} from './cbse-stream-model.js';
import {teacherIdentityIds} from './cbse-view-data.js';
import {markPercentage,outOf,renderPerformanceCriteria} from './cbse-performance-display.js';
import {renderSectionTeam,sectionTeam} from './cbse-section-team.js';
import {gradeThresholds} from './cbse-mission-model.js';
import {entries} from './cbse-model.js';
import {el,cell,head,options} from './cbse-ui.js';
import {academicMarkBand,overallAcademicBand} from './cbse-academic-model.js';
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
export const reviewLabels={all:'Total students',critical:'Critical fail',red:'Fail (excluding critical)',fail:'Total fail · Critical + Fail',yellow:'Borderline',green:'Secure pass',grey:'AB / not assessed'};
export function teacherResponsibilities(id,faculty,mission){
 const identities=teacherIdentityIds(id,faculty,mission),ct=[];
 for(const identity of identities){const [cl,...parts]=identity.split(':'),teacher=parts.join(':');for(const[sid,roles]of entries(faculty?.classes?.[cl]?.roles))if(roles.classTeacher===teacher||roles.coClassTeacher===teacher)ct.push({classId:cl,sectionId:sid,role:roles.classTeacher===teacher?'Class teacher':'Co-class teacher'});}
 return {ct,subjects:[...entries(mission.allocations),...entries(mission.supportAssignments)].filter(([,a])=>identities.includes(a.staffId)).map(([,a])=>a)};
}
export function teacherReviewRows(id,faculty,mission,people,mode='subject'){
 const responsibilities=teacherResponsibilities(id,faculty,mission),groups=mode==='ct'?responsibilities.ct:responsibilities.subjects,latest=new Map();
 for(const[,m]of entries(mission.marks)){const exam=mission.exams?.[m.examId];if(!exam)continue;const key=m.studentKey+'|'+m.subjectId,old=latest.get(key);if(!old||exam.date>old.exam.date||exam.date===old.exam.date&&(m.updatedAt||0)>=(old.updatedAt||0))latest.set(key,{...m,exam});}
 return entries(people).flatMap(([key,p])=>{const assigned=groups.filter(g=>g.classId===p.classId&&g.sectionId===p.sectionId),ids=mode==='ct'&&assigned.length?Object.keys(p.subjects||{}):[...new Set(assigned.map(g=>g.subjectId).filter(s=>p.subjects?.[s]))];if(!ids.length)return [];const subjects=ids.map(subjectId=>{const mark=latest.get(key+'|'+subjectId),rule=gradeThresholds(mission,p.classId,subjectId,mark?.examId||'');return {id:subjectId,name:p.subjectCatalog?.[subjectId]?.name||subjectId,mark,band:academicMarkBand(mark,rule.redBelow,rule.greenFrom)};});const appeared=subjects.filter(s=>s.mark&&!s.mark.absent),score=appeared.reduce((n,s)=>n+s.mark.score,0),maximum=appeared.reduce((n,s)=>n+s.mark.maximum,0);return [{key,person:p,subjects,band:overallAcademicBand(subjects.map(s=>s.band)),score,maximum}];}).sort((a,b)=>['X','XII'].indexOf(a.person.classId)-['X','XII'].indexOf(b.person.classId)||a.person.section.localeCompare(b.person.section,undefined,{numeric:true})||String(a.person.roll).localeCompare(String(b.person.roll),undefined,{numeric:true})||a.person.name.localeCompare(b.person.name));
}
export function teacherReportScopes(id,faculty,mission,people){
 const duties=teacherResponsibilities(id,faculty,mission),sections=new Map(),name=(cl,sid)=>Object.values(people).find(p=>p.classId===cl&&p.sectionId===sid)?.section||sid,scopes=[];
 if(duties.ct.length)scopes.push({key:'ct',mode:'ct',label:'CT / Co-CT',sections:duties.ct.map(g=>g.classId+':'+g.sectionId),detail:duties.ct.map(g=>`${g.role}: ${g.classId}-${name(g.classId,g.sectionId)}`).join(' · ')});
 for(const g of duties.subjects){const key=g.classId+':'+g.sectionId;if(!sections.has(key))sections.set(key,{classId:g.classId,sectionId:g.sectionId,names:[],support:!!g.purpose});const sample=Object.values(people).find(p=>p.classId===g.classId&&p.sectionId===g.sectionId);sections.get(key).names.push(sample?.subjectCatalog?.[g.subjectId]?.name||g.subjectId);}
 const sorted=[...sections].sort(([,a],[,b])=>['X','XII'].indexOf(a.classId)-['X','XII'].indexOf(b.classId)||name(a.classId,a.sectionId).localeCompare(name(b.classId,b.sectionId),undefined,{numeric:true}));
 for(const[key,g]of sorted)scopes.push({key:'subject:'+key,mode:'subject',label:`${g.support?'Support':'Subject teacher'} · ${g.classId}-${name(g.classId,g.sectionId)}`,sections:[key],detail:`${g.support?'Support subjects':'Subject teacher'}: ${[...new Set(g.names)].join(', ')} · ${g.classId}-${name(g.classId,g.sectionId)}`});
 if(sorted.length>1)scopes.push({key:'combined',mode:'subject',label:`Combined (${sorted.map(([,g])=>g.classId+'-'+name(g.classId,g.sectionId)).join(' + ')})`,sections:sorted.map(([key])=>key),detail:'Subject report across all allocated sections · each student counted once'});
 return scopes;
}
export function sectionReviewBreakdown(rows,visible){
 const groups=new Map();for(const r of rows){const key=r.person.classId+':'+r.person.sectionId;if(!groups.has(key))groups.set(key,{section:r.person.classId+'-'+r.person.section,total:0,listed:0});groups.get(key).total++;}
 for(const r of visible){const g=groups.get(r.person.classId+':'+r.person.sectionId);if(g)g.listed++;}return [...groups.values()];
}
export function renderTeacherMeeting(parent,id,faculty,mission,people,ctx){
 const state=ctx.state||{},responsibilities=teacherResponsibilities(id,faculty,mission),scopes=teacherReportScopes(id,faculty,mission,people),rolesHost=ctx.rolesHost||parent;rolesHost.append(el('h2','Teacher profile · roles & progress'));
 let selectedScope=scopes.find(s=>s.key===state.scopeKey)||scopes.find(s=>s.key==='combined')||scopes.find(s=>s.mode==='subject')||scopes[0]||{key:'none',mode:'subject',sections:[]};
 const roles=el('div',undefined,'teacher-roles teacher-report-scopes');roles.setAttribute('aria-label','Teacher report choices');for(const scope of scopes){const tile=button('',()=>{selectedScope=scope;state.scopeKey=scope.key;stream.value='';band='all';state.review=null;draw();});tile.className='teacher-scope-tile';tile.dataset.scopeKey=scope.key;tile.setAttribute('aria-label',scope.label);tile.append(el('strong',scope.label),el('small',scope.detail));roles.append(tile);}if(!scopes.length)roles.append(el('p','No confirmed CT or subject allocations yet.','muted'));rolesHost.append(roles);
 const controls=el('div',undefined,'result-filters');
 const stream={value:state.stream||''},content=el('div');parent.append(controls,content);
 let band=state.band||'all',reviewHost,returnFocus,returnY=0;
 const openStudent=(key,subjects='',extra={},origin)=>{
  if(!people[key])return;if(!state.review&&!extra.restore)state.returnY=scrollY;returnY=state.returnY??scrollY;state.review={key,subjects,extra};returnFocus=origin||returnFocus;reviewHost.replaceChildren();reviewHost.hidden=false;
  const bar=el('div',undefined,'inline-review-bar'),close=button('← Back to teacher list',()=>{state.review=null;reviewHost.hidden=true;reviewHost.replaceChildren();returnFocus?.focus({preventScroll:true});window.scrollTo({top:returnY,behavior:'instant'});});close.dataset.closeReview='true';bar.append(close,markStudentPhoto(el('strong',`Student review · ${people[key].name}`),key));const body=el('div');reviewHost.append(bar,body);
  ctx.onStudent(key,subjects,body,{...extra,openFull:()=>openStudent(key,'',extra,origin)});if(!extra.restore)requestAnimationFrame(()=>reviewHost.scrollIntoView({block:'start',behavior:'smooth'}));
 };
 const draw=()=>{
  state.scopeKey=selectedScope.key;state.mode=selectedScope.mode;state.stream=stream.value;state.band=band;for(const tile of roles.querySelectorAll('button'))tile.setAttribute('aria-pressed',String(tile.dataset.scopeKey===selectedScope.key));content.replaceChildren();
  const base=teacherReviewRows(id,faculty,mission,people,selectedScope.mode).filter(r=>selectedScope.sections.includes(r.person.classId+':'+r.person.sectionId)),streamPeople=Object.fromEntries(base.map(r=>[r.key,r.person])),groups=xiiStreamGroups(streamPeople);controls.replaceChildren();if(groups.length>1)renderStreamTiles(controls,streamPeople,{selected:stream.value,allLabel:'All assigned sections',onSelect:value=>{stream.value=value;band='all';state.review=null;draw();}});else if(groups.length===1)controls.append(el('p',`XII: ${groups[0].name} · Sections ${groups[0].sections.join(' / ')}`,'stream-fixed'));const rows=base.filter(r=>!stream.value||r.person.stream===stream.value),total=rows.length,counts={all:total,critical:0,red:0,fail:0,yellow:0,green:0,grey:0};for(const r of rows){counts[r.band]++;if(['critical','red'].includes(r.band))counts.fail++;}
  content.append(el('p',selectedScope.mode==='subject'?'Only this teacher’s allocated subjects are counted. Students taught in more than one subject are counted once.':'Whole-student progress for this teacher’s CT / Co-CT sections.','scope-notice'));
  const summary=el('div',undefined,'stats performance-counts large-statistics');for(const[k,n]of Object.entries(counts)){const tile=button('',()=>{band=k;state.review=null;draw();});tile.className='stat statistic-button '+k;tile.setAttribute('aria-label',`${reviewLabels[k]}: ${n} out of ${total} students`);tile.setAttribute('aria-pressed',String(k===band));tile.append(el('strong',String(n)),el('span',reviewLabels[k]),el('small',`out of ${total} students · ${total?(n/total*100).toFixed(1):'0.0'}%`));summary.append(tile);}content.append(summary);
  const visible=rows.filter(r=>band==='all'||band==='fail'?band==='all'||['critical','red'].includes(r.band):r.band===band);content.append(el('h3',`${reviewLabels[band]} · ${visible.length} students`),el('p',`out of ${total} students in this report`,'list-population-note'));const breakdown=sectionReviewBreakdown(rows,visible),split=el('div',undefined,'section-breakdown');split.setAttribute('aria-label','Selected students by section');for(const g of breakdown){const item=el('span',undefined,'section-breakdown-item');item.append(el('strong',`${g.section}: ${g.listed}`),el('small',` out of ${g.total} students`));split.append(item);}content.append(split);let previous='',body;
  for(const r of visible){const p=r.person,group=p.classId+':'+p.sectionId;if(group!==previous){previous=group;const box=el('section',undefined,'teacher-section-list');const sectionCount=breakdown.find(g=>g.section===p.classId+'-'+p.section);box.append(el('h3',`Class ${p.classId}-${p.section}`),el('p',`${sectionCount.listed} listed · out of ${sectionCount.total} students in this section`,'list-population-note'));const scroll=el('div',undefined,'table-scroll'),table=el('table'),thead=el('thead');body=el('tbody');head(thead,['Student','Subject / latest marks','Status','Percentage','Profile']);table.append(thead,body);scroll.append(table);box.append(scroll);content.append(box);}const row=el('tr');markStudentPhoto(cell(row,p.name),r.key);cell(row,r.subjects.map(s=>`${s.name}: ${s.mark?s.mark.absent?'AB':s.mark.score+'/'+s.mark.maximum:'Not recorded'}`).join(' · '));cell(row,'').append(el('span',reviewLabels[r.band],`band ${r.band}`));cell(row,r.subjects.length===1?markPercentage(r.subjects[0].mark):r.maximum?(r.score/r.maximum*100).toFixed(1)+'%':'—');const review=button(selectedScope.mode==='subject'?'Review this subject':'Open full profile',()=>openStudent(r.key,selectedScope.mode==='subject'?r.subjects.map(s=>s.id).join(','):'',{},review));cell(row,'').append(review);body.append(row);}
  if(!rows.length)content.append(el('p',selectedScope.mode==='subject'?'No confirmed subject allocations. Use the section subject-teacher assignment to link this teacher.':'No CT / Co-CT section assigned.','muted'));
  reviewHost=el('section',undefined,'teacher-inline-review');reviewHost.hidden=true;content.append(reviewHost);if(state.review){const selected=state.review;openStudent(selected.key,selected.subjects,{...selected.extra,restore:true});}

  const teams=el('div',undefined,'section-team-grid compact-teams teacher-review-teams'),seen=new Set();for(const row of rows){const p=row.person,key=p.classId+':'+p.sectionId;if(seen.has(key))continue;seen.add(key);renderSectionTeam(teams,sectionTeam(faculty,p.classId,p.sectionId,p.section,mission),{onTeacher:ctx.onTeacher});}content.append(teams);
  renderPerformanceCriteria(content,rows.flatMap(r=>r.subjects.map(s=>s.mark)).filter(Boolean),mission);
 };
 draw();return {openStudent};
}
