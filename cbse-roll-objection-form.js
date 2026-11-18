import {el,options} from './cbse-ui.js';
import {objectionRoster,objectionTargets,secondaryStandards} from './cbse-roll-objection-targets.js';

export function renderRollObjectionForm(host,{staff,wing,actorId,onSubmit}){
 const form=el('form',undefined,'roll-objection-form');
 form.dataset.portalTrackDirty='true';
 const field=(text,tag='select')=>{
  const label=el('label',text),input=el(tag);input.setAttribute('aria-label',text);label.append(input);form.append(label);return input;
 };
 const mode=field('Select recipients'),grade=field('Standard'),subject=field('Subject');
 mode.name='roll-target-mode';
 const secondary=wing==='secondary',roster=objectionRoster(staff,wing,actorId);
 options(mode,[['manual','Select teachers individually'],['all','All teachers'],['ct','All CTs and Co-CTs'],...(secondary?[
  ['lower','CTs and Co-CTs · VI–VIII'],['upper','CTs and Co-CTs · IX–XII'],
  ['sections','CTs and Co-CTs by class section'],['subject','Subject teachers by standard']
 ]:[])],'manual');
 options(grade,[['','Choose standard'],...secondaryStandards.map(value=>[value,value])],'');
 const sections=el('fieldset',undefined,'roll-objection-sections');
 sections.append(el('legend','Select class sections'));
 if(secondary)for(const level of secondaryStandards){
  const group=el('div');group.append(el('strong',level));
  const letters=['A','B','C','D',...(['XI','XII'].includes(level)?['E']:[])];
  for(const letter of letters){
   const label=el('label',letter),check=el('input');check.type='checkbox';check.value=level+' '+letter;
   check.setAttribute('aria-label',check.value);label.prepend(check);group.append(label);
  }
  sections.append(group);
 }
 form.append(sections);
 const search=field('Search names, standards, subjects or roles','input');search.type='search';search.name='roll-search';
 const picks=el('div',undefined,'roll-employee-picks'),count=el('p');count.setAttribute('role','status');
 const checks=new Map();
 for(const p of roster){
  const label=el('label'),check=el('input');check.type='checkbox';check.value=p.id;
  const roles=p.roles.map(([level,section,role])=>level+' '+section+' '+role);
  const subjects=[...new Set(p.subjects.map(([level,,name])=>level+' '+name))];
  const text=[p.name,p.designation,...roles,...subjects].filter(Boolean).join(' · ');
  label.append(check,el('span',text));picks.append(label);checks.set(p.id,check);
 }
 form.append(picks,count);
 const remark=field('Short remark — pending task','textarea');remark.name='roll-objection-remark';remark.required=true;remark.maxLength=500;
 form.append(el('button','Raise objection'));
 const selected=()=>[...checks.values()].filter(check=>check.checked).map(check=>check.value);
 const updateCount=()=>{count.textContent=selected().length+' teachers selected';};
 const apply=()=>{
  const ids=new Set(objectionTargets(roster,{mode:mode.value,sections:[...sections.querySelectorAll('input:checked')].map(n=>n.value),grade:grade.value,subject:subject.value}));
  for(const [id,check]of checks)check.checked=ids.has(id);
  updateCount();
 };
 const subjectsForGrade=()=>{
  const names=[...new Set(roster.flatMap(p=>p.subjects.filter(([level])=>level===grade.value).map(([, ,name])=>name)))].sort();
  options(subject,[['','Choose subject'],...names.map(name=>[name,name])],'');
 };
 mode.onchange=()=>{
  sections.hidden=mode.value!=='sections';
  grade.parentElement.hidden=subject.parentElement.hidden=mode.value!=='subject';
  apply();
 };
 grade.onchange=()=>{subjectsForGrade();apply();};
 subject.onchange=sections.onchange=apply;
 for(const check of checks.values())check.onchange=updateCount;
 search.oninput=()=>{
  const query=search.value.trim().toLowerCase();
  for(const check of checks.values())check.parentElement.hidden=!check.parentElement.textContent.toLowerCase().includes(query);
 };
 form.addEventListener('input',event=>{if(event.target!==search)form.dataset.portalDirty='true';});
 form.onsubmit=event=>{
  event.preventDefault();
  const targets=selected();if(!targets.length){count.textContent='Select at least one teacher.';return;}
  onSubmit({wing,targets,remark:remark.value});
 };
 subjectsForGrade();mode.onchange();host.append(form);
}
