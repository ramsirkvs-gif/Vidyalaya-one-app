import {el} from './cbse-ui.js';
import {MONITORING_STEPS,monitoringBundlesByExamDate,monitoringPeople,monitoringStage} from './cbse-task-monitoring-workflow.js';

export function openTaskStatusReport({published,progress}){
 if(!published)throw Error('Publish Task 2 before opening the status report.');
 const papers=monitoringBundlesByExamDate(published);
 if(!papers.length)throw Error('The published plan has no bundles to report.');
 const uploadStage=MONITORING_STEPS.findIndex(step=>step.uploadPdf);
 const uploadLabel=MONITORING_STEPS[uploadStage].options[0][1];
 const pending=[],completed=[];
 for(const {key,paper,date} of papers){
  const record=progress?.[key],stage=monitoringStage(record);
  const missingPDF=stage>uploadStage&&!record?.history?.some(item=>item.label===uploadLabel);
  const step=MONITORING_STEPS[stage];
  const bundle=paper.section+' · '+paper.subject;
  if(!step&&!missingPDF){completed.push(bundle);continue;}
  const responsible=monitoringPeople(published,paper,step?stage:uploadStage).map(person=>person.name).join(' / ');
  pending.push([date,bundle,step?'Step '+(stage+1)+' · '+step.label:'Confirm signed PDF upload',responsible||'Assignment needed',missingPDF,step?.instruction]);
 }

 const report=el('article',undefined,'task-status-report-content');
 const timestamp=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date());
 const title=el('h2','Task 2 status report');title.id='task-status-report-title';
 report.append(el('p','PM SHRI Kendriya Vidyalaya No. 1, Itanagar'),title,
  el('p','PB-1 Classes X and XII · XI Half-Yearly · '+timestamp+' IST'),
  el('p',papers.length+' bundles · '+completed.length+' complete · '+pending.length+' need action','task-status-report-summary'),
  el('p','Thank you for keeping the evaluation, checking, and reporting moving. Please open your bundle in Task 2, complete the next action listed below, and update its status promptly so the next colleague can proceed.'));
 if(pending.length){
  const table=el('table'),header=table.createTHead().insertRow(),body=table.createTBody();
  for(const label of ['Exam date','Bundle','Next action','Responsible']){const cell=el('th',label);cell.scope='col';header.append(cell);}
  for(const [date,bundle,action,responsible,missingPDF,instruction] of pending){
   const row=body.insertRow(),next=el('td',action);
   if(instruction)next.append(el('small',instruction));
   if(missingPDF)next.append(el('small','Signed PDF status is missing.'));
   row.append(el('td',date||'—'),el('td',bundle),next,el('td',responsible));
  }
  report.append(el('h3','Bundles needing action'),table);
 }
 if(completed.length){
  const list=el('ul');
  for(const bundle of completed)list.append(el('li',bundle));
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
