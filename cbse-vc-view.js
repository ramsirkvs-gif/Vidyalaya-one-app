import {el} from './cbse-ui.js';
import {supportTeam,supportDuties} from './cbse-vc-model.js';
const labels={prt:'Co-opted PRT',counsellor:'Counsellor',special_educator:'Special educator',support:'AI support'};
export function renderSupportTeam(parent,mission,faculty,classId,sectionId,subjectIds,onTeacher){
 const members=supportTeam(mission,faculty,classId,sectionId,subjectIds);if(!members.length)return;
 const box=el('section',undefined,'vc-support-team');box.append(el('h3','Student support team'));
 for(const person of members){const row=el('div',undefined,'vc-support-member'),b=el('button',person.name);b.type='button';b.onclick=()=>onTeacher(person.id);row.append(b,el('small',`${labels[person.supportRole]||'Support'} · ${person.purposes.join(' · ')}`));box.append(row);}parent.append(box);
}
export function renderSupportResponsibilities(parent,mission,draft,staffId){
 const duties=supportDuties(mission,staffId),groups=new Map();for(const a of duties){const key=a.classId+':'+a.sectionId;if(!groups.has(key))groups.set(key,{...a,subjects:[],purposes:new Set()});const g=groups.get(key);g.subjects.push(draft.classes?.[a.classId]?.sections?.[a.sectionId]?.subjects?.[a.subjectId]?.name||a.subjectId);g.purposes.add(a.purpose);}
 if(!groups.size)return;const box=el('section',undefined,'vc-support-duties');box.append(el('h3','Assigned support duties'));
 for(const g of groups.values())box.append(el('p',`${g.classId}-${draft.classes?.[g.classId]?.sections?.[g.sectionId]?.name||g.sectionId} · ${[...g.purposes].join(' · ')} · Subjects: ${[...new Set(g.subjects)].join(', ')}`));parent.append(box);
}
