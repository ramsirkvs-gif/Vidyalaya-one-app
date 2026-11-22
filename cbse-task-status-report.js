import {el} from './cbse-ui.js';
import {rollDateText,rollTimestamp} from './cbse-roll-call-time.js';
import {MONITORING_STEPS,monitoringBundlesByExamDate,monitoringPeople,monitoringStage} from './cbse-task-monitoring-workflow.js';

export function openTaskStatusReport({published,progress}){
 if(!published)throw Error('Publish Task 2 before opening the status report.');
 const papers=monitoringBundlesByExamDate(published);
 if(!papers.length)throw Error('The published plan has no bundles to report.');
 const uploadStage=MONITORING_STEPS.findIndex(step=>step.uploadPdf);
 const uploadLabel=MONITORING_STEPS[uploadStage].options[0][1];
 const groups=new Map();
 let completedCount=0,pendingCount=0;
 for(const {key,paper,date} of papers){
  const record=progress?.[key],stage=monitoringStage(record);
  const missingPDF=stage>uploadStage&&!record?.history?.some(item=>item.label===uploadLabel);
  const step=MONITORING_STEPS[stage],done=!step&&!missingPDF;
  const variant=/^(?:mathematics|maths)\s+(basic|standard)$/i.exec(paper.subject.trim())?.[1].toLowerCase();
  const groupKey=variant&&date?JSON.stringify([paper.section,date]):key;
  const group=groups.get(groupKey)||{date,section:paper.section,subject:paper.subject,entries:[]};
  const responsible=done?'':monitoringPeople(published,paper,step?stage:uploadStage).map(person=>person.name).join(' / ')||'Assignment needed';
  const action=done?'Done':step?'Step '+(stage+1)+' · '+step.label:'Confirm signed PDF upload';
  group.entries.push({variant,action,responsible,missingPDF,instruction:step?.instruction,done});
  groups.set(groupKey,group);
  if(done)completedCount++;else pendingCount++;
 }
 const pending=[],completed=[];
 for(const group of groups.values()){
  const combined=new Set(group.entries.map(item=>item.variant)).size===2;
  const bundle=group.section+' · '+(combined?'Maths Basic & Standard':group.subject);
  if(group.entries.every(item=>item.done)){completed.push({date:group.date,bundle});continue;}
  pending.push({...group,bundle,combined});
 }

 const report=el('article',undefined,'task-status-report-content');
 const timestamp=rollTimestamp(Date.now());
 const title=el('h2','Task 2 status report');title.id='task-status-report-title';
 report.append(el('p','PM SHRI Kendriya Vidyalaya No. 1, Itanagar'),title,
  el('p','PB-1 Classes X and XII · XI Half-Yearly · '+timestamp),
  el('p',papers.length+' bundles · '+completedCount+' complete · '+pendingCount+' need action','task-status-report-summary'),
  el('p','Thank you for keeping the evaluation, checking, and reporting moving. Please open your bundle in Task 2, complete the next action listed below, and update its status promptly so the next colleague can proceed.'));
 if(pending.length){
  const table=el('table'),header=table.createTHead().insertRow(),body=table.createTBody();
  for(const label of ['Exam date','Bundle','Next action','Responsible']){const cell=el('th',label);cell.scope='col';header.append(cell);}
  for(const {date,bundle,combined,entries} of pending){
   const row=body.insertRow();
   row.append(el('td',rollDateText(date)),el('td',bundle),el('td'),el('td'));
   const [,,next,people]=row.cells;
   for(const {variant,action,responsible,missingPDF,instruction} of entries){
    const label=combined?(variant==='basic'?'Basic · ':'Standard · '):'';
    const details=el('div',label+action);
    if(instruction)details.append(el('small',instruction));
    if(missingPDF)details.append(el('small','Signed PDF status is missing.'));
    next.append(details);
    if(responsible)people.append(el('div',label+responsible));
   }
  }
  report.append(el('h3','Bundles needing action'),table);
 }
 if(completed.length){
  const list=el('ul');
  for(const {date,bundle} of completed)list.append(el('li',(date?rollDateText(date)+' · ':'')+bundle));
  report.append(el('h3','✓ Completed bundles'),list);
 }
 const dialog=el('dialog',undefined,'task-start-dialog task-status-report-dialog'),actions=el('div',undefined,'task-actions');
 dialog.setAttribute('aria-labelledby',title.id);
 const print=el('button','Print / Save as PDF'),close=el('button','Close');
 print.type=close.type='button';print.onclick=()=>window.print();close.onclick=()=>dialog.close();
 actions.append(print,close);dialog.append(actions,report);
 const printable=report.cloneNode(true);printable.classList.add('task-status-print');
 printable.querySelector('[id]')?.removeAttribute('id');
 dialog.addEventListener('close',()=>{printable.remove();dialog.remove();},{once:true});
 document.body.append(dialog,printable);dialog.showModal();
}
