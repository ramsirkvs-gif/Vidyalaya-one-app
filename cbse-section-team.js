import {el} from './cbse-ui.js';
import {supportTeam,supportRoleLabel} from './cbse-vc-model.js';
export function sectionTeam(faculty,classId,sectionId,sectionName=sectionId,mission={},subjectIds=null){
 const group=faculty?.classes?.[classId],roles=group?.roles?.[sectionId]||{};
 const member=field=>{const id=roles[field],teacher=id&&group?.teachers?.[id];return teacher?{id:`${classId}:${id}`,name:teacher.name,status:teacher.status}:null;};
 return {classId,sectionId,sectionName,classTeacher:member('classTeacher'),coClassTeacher:member('coClassTeacher'),supportMembers:supportTeam(mission,faculty,classId,sectionId,subjectIds)};
}
export function sectionTeamText(team){return `CT: ${team.classTeacher?.name||'Not assigned'} · Co-CT: ${team.coClassTeacher?.name||'Not assigned'}${team.supportMembers?.length?' · '+team.supportMembers.map(p=>supportRoleLabel(p.supportRole)+': '+p.name).join(' · '):''}`;}
export function renderSectionTeam(parent,team,{onTeacher,heading=true}={}){
 const box=el('section',undefined,'section-team');box.setAttribute('aria-label',`Class ${team.classId}-${team.sectionName} team`);if(heading)box.append(el('h3',`Class ${team.classId}-${team.sectionName} · section team`));
 for(const[field,label]of [['classTeacher','Prime mentor of class (CT)'],['coClassTeacher','Prime mentor of class (Co CT)']]){const row=el('div',undefined,'section-team-member'),person=team[field];row.append(el('small',label));const text=person?person.name+(person.status==='active'?'':` · ${person.status}`):'Not assigned';if(person&&onTeacher){const b=el('button',text);b.type='button';b.onclick=()=>onTeacher(person.id);row.append(b);}else row.append(el('strong',text));box.append(row);}
 if(team.supportMembers?.length){const support=el('section',undefined,'vc-support-team');support.append(el('h3','Student support team'));for(const person of team.supportMembers){const row=el('div',undefined,'section-team-member section-support-member');row.append(el('small',`${supportRoleLabel(person.supportRole)} · ${team.classId}-${team.sectionName}`));if(onTeacher){const b=el('button',person.name);b.type='button';b.onclick=()=>onTeacher(person.id);row.append(b);}else row.append(el('strong',person.name));row.append(el('small',person.purposes.join(' · ')));support.append(row);}box.append(support);}parent.append(box);return box;
}
export function renderSectionTeams(parent,draft,faculty,{classId='',sectionId='',onTeacher,mission={}}={}){
 const container=el('div',undefined,'section-team-grid');for(const[cl,c]of Object.entries(draft?.classes||{}))if(!classId||classId===cl)for(const[sid,s]of Object.entries(c.sections||{}))if(!sectionId||sid===sectionId)renderSectionTeam(container,sectionTeam(faculty,cl,sid,s.name,mission),{onTeacher});parent.append(container);return container;
}
