import {el,options} from './cbse-ui.js';
import {objectionRoster,secondarySections} from './cbse-roll-objection-targets.js';

export function renderRollAssignmentEditor(parent,{data,state,api,run,refresh}){
 const form=el('form');
 form.dataset.portalTrackDirty='true';
 const assignments=data.rollCall?.objectionAssignments||{};
 const roster=objectionRoster(data.staff,'secondary',undefined,assignments);
 const heading=el('h3','Secondary Wing assignment register');
 const overview=el('details');overview.append(el('summary','View all class sections and teacher assignments'));
 const label=el('label','Class section to edit'),section=el('select');section.setAttribute('aria-label','Class section to edit');
 options(section,secondarySections.map(key=>[key,key]),state.assignmentSection||secondarySections[0]);
 label.append(section);
 const fields=el('div');
 form.append(heading,el('p','These assignments are used for afternoon objection and departure hold targeting.'),overview,label,fields);
 const sectionRoles=(key,role)=>roster.filter(p=>p.roles.some(([grade,letter,kind])=>grade+' '+letter===key&&kind===role));
 const sectionSubjects=(person,key)=>person.subjects.filter(([grade,letter])=>grade+' '+letter===key).map(([, ,subject])=>subject);
 for(const key of secondarySections){
  const group=el('section',undefined,'roll-status-card');
  group.append(el('h4',key),el('p','CT: '+(sectionRoles(key,'CT').map(p=>p.name).join(', ')||'Unassigned')),el('p','Co-CT: '+(sectionRoles(key,'Co-CT').map(p=>p.name).join(', ')||'Unassigned')));
  for(const person of roster){
   const subjects=sectionSubjects(person,key);
   if(subjects.length)group.append(el('p',person.name+' · '+subjects.join(', ')));
  }
  overview.append(group);
 }
 const draw=()=>{
  fields.replaceChildren();
  const key=section.value;
  const chooseRole=role=>{
   const label=el('label',role),select=el('select');select.setAttribute('aria-label',role);
   const holders=sectionRoles(key,role);
   options(select,[['','Unassigned'],...roster.map(p=>[p.id,p.name])],holders.length===1?holders[0].id:'');
   select.required=holders.length>1;
   if(holders.length>1)label.append(el('small','Multiple assignments are recorded. Choose the current '+role+'.'));
   label.append(select);fields.append(label);return select;
  };
  const ct=chooseRole('CT'),coCT=chooseRole('Co-CT');
  const subjectFields=el('fieldset');subjectFields.append(el('legend','Subject teachers'),el('p','Enter comma-separated subjects beside each teacher. Clear the field to remove that teacher’s subjects for this section.'));
  const inputs=roster.map(person=>{
   const label=el('label',person.name+' · '+person.designation),input=el('input');
   input.type='text';input.maxLength=300;
   input.value=sectionSubjects(person,key).join(', ');
   label.append(input);subjectFields.append(label);return [person.id,input];
  });
  const status=el('p');status.setAttribute('role','status');
  fields.append(subjectFields,status,el('button','Save section assignments'));
  form.onsubmit=event=>{
   event.preventDefault();
   const subjects=inputs.flatMap(([staffId,input])=>[...new Set(input.value.split(',').map(text=>text.trim()).filter(Boolean))].map(subject=>({staffId,subject})));
   run(async()=>{
    try{
     await api({action:'roll-call-principal',rollOperation:'objection-assignments-save',section:key,expectedRevision:assignments[key]?.revision||0,ct:ct.value,coCT:coCT.value,subjects});
     form.dataset.portalDirty='false';state.assignmentSaved=key;await refresh();
    }catch(error){status.textContent=error.message;throw error;}
   });
  };
 };
 section.onchange=()=>{
  if(form.dataset.portalDirty==='true'&&!confirm('Change section and discard unsaved assignment edits?')){section.value=state.assignmentSection;return;}
  state.assignmentSection=section.value;form.dataset.portalDirty='false';draw();
 };
 form.addEventListener('input',event=>{if(event.target!==section)form.dataset.portalDirty='true';});
 state.assignmentSection=section.value;
 if(state.assignmentSaved){const saved=el('p','Assignments saved for '+state.assignmentSaved+'.');saved.setAttribute('role','status');form.prepend(saved);delete state.assignmentSaved;}
 draw();parent.append(form);
}
