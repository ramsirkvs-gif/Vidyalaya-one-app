import {el} from './cbse-ui.js';
export function renderMCQStoreCoverage(parent,coverage){
 parent.classList.add('mcq-store-coverage');const used=coverage.groups.filter(g=>g.evaluated.length);
 parent.append(el('strong',used.length?'Used: '+used.map(g=>g.classId+'-'+g.section+' ('+g.evaluated.length+')').join(' · '):'Not evaluated yet','mcq-used-summary'));
 const details=el('details',undefined,'mcq-store-students');details.append(el('summary',coverage.evaluated+' evaluated · '+coverage.remaining+' remaining — view students'));parent.append(details);let ready=false;
 details.ontoggle=()=>{if(!details.open||ready)return;ready=true;
  if(!coverage.groups.length){details.append(el('p','No eligible students in the current subject roster.','muted'));return;}
  for(const group of coverage.groups){const section=el('section',undefined,'mcq-coverage-section');section.dataset.usageSection=group.sectionId;section.append(el('h4','Class '+group.classId+'-'+group.section));
   for(const [label,rows,attended]of [['Evaluated',group.evaluated,true],['Remaining',group.remaining,false]]){
    const list=el('details',undefined,'mcq-coverage-list');list.dataset.coverageList=attended?'evaluated':'remaining';list.append(el('summary',label+' ('+rows.length+')'));let loaded=false;
    list.ontoggle=()=>{if(!list.open||loaded)return;loaded=true;if(!rows.length){list.append(el('p',attended?'No saved evaluations.':group.eligible?'All eligible students have been evaluated.':'No current eligible students in this section.','muted'));return;}
     const names=el('ul');for(const student of rows){const item=el('li');if(student.former)item.append(el('span','Former student'));else{const profile=el('a',student.name+(student.roll?' · '+student.roll:''));profile.href='#student='+encodeURIComponent(student.key);item.append(profile);}
      if(attended)item.append(el('small',student.score+' / '+student.maximum+(student.evaluatedByName?' · '+student.evaluatedByName:'')));names.append(item);}list.append(names);
    };section.append(list);
   }details.append(section);
  }
 };
}
