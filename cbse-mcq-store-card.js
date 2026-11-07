import {el} from './cbse-ui.js';
export function mcqStorePaperCard(row,paper){
 const cells=[...row.children],card=el('article',undefined,'mcq-store-card');card.dataset.paperId=paper.id;
 const header=el('header',undefined,'mcq-store-card-heading'),title=el('h4',paper.id),kind=el('span',paper.personalisedCount?'STUDENT-SPECIFIC · Assigned only · '+paper.personalisedCount+' students':'GENERAL · Reusable',paper.personalisedCount?'mcq-store-card-type is-assigned':'mcq-store-card-type');header.append(title,kind);
 const scope=paper.personalisedCount?'Named students only':paper.targetSectionNames?.length?'Sections '+paper.targetSectionNames.join(', '):'All sections';
 const brief=el('p',undefined,'mcq-store-card-summary');for(const [label,value]of [['Class','Class '+paper.classId],['Subject',paper.subjectName],['Questions',String(paper.count)]]){if(brief.childNodes.length)brief.append(document.createTextNode(' · '));const item=el('span',value);item.dataset.label=label;brief.append(item);}brief.append(document.createTextNode(' questions'));card.append(header,brief,el('p',scope,'mcq-store-card-scope'));
 const used=cells[2]?.querySelector('.mcq-used-summary');if(used)card.append(used);const totals=cells[2]?.querySelector('.mcq-store-students > summary')?.textContent.split(' — ')[0];if(totals)card.append(el('small',totals,'mcq-store-card-totals'));
 const printBox=el('section',undefined,'mcq-store-card-print'),printTitle=el('h5','Print / Save PDF'),printActions=el('div',undefined,'mcq-store-card-print-actions'),secondary=el('div',undefined,'mcq-store-card-secondary'),manage=el('div',undefined,'mcq-store-card-manage');printBox.append(printTitle,printActions);card.append(printBox);
 for(const action of [...cells[10].children]){
  const label=action.textContent;
  if(label.startsWith('Print')||!paper.personalisedCount&&label==='Create student-specific PDF')printActions.append(action);
  else if(label==='Open soft copy')secondary.append(action);
  else manage.append(action);
 }
 card.append(secondary);const details=el('details',undefined,'mcq-store-card-details');details.append(el('summary','Topics, usage & manage QP'));
 const meta=el('dl');for(const [label,index]of [['Prepared by',3],['Created',4],['Topics covered',7],['Saved for',8]]){const pair=el('div');const value=el('dd',cells[index].textContent);value.dataset.label=label;pair.append(el('dt',label),value);meta.append(pair);}details.append(meta);
 const assignedButton=cells[1]?.querySelector('button');if(assignedButton)details.append(assignedButton);
 const usage=el('section',undefined,'mcq-store-card-usage mcq-store-coverage');usage.append(el('h5','Evaluations & remaining students'),...cells[2].childNodes);details.append(usage,manage);card.append(details);return card;
}
