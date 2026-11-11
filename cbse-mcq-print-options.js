import {mcqPreviewPaper} from './cbse-mcq-personalised.js';
import {renderMCQPageSetup} from './cbse-mcq-page-setup-view.js';
import {mcqSavedPageSettings} from './cbse-mcq-page-settings.js';
import {el} from './cbse-ui.js';
import {showMCQAssignedCopies} from './cbse-mcq-assigned-copies-view.js';
import {printMCQPaper} from './cbse-mcq-print.js';
export function mcqPhotocopyPaper(paper){const result={...paper,copyAssignments:[],paperType:'general'};delete result.studentCopy;delete result.targetStudentKeys;return result;}
export async function showMCQPrintOptions(summary,ctx){
 const paper=summary.questions?summary:(await ctx.read({paperId:summary.id,papersOnly:true})).paper;if(!paper)throw Error('Paper not found.');
 const dialog=el('dialog',undefined,'mcq-manage-dialog mcq-print-options'),message=el('p');message.setAttribute('role','alert');dialog.append(el('h3',paper.id+' · Choose print format'),el('p','Layout changes here apply to this print run. Saved questions, student assignments and results stay unchanged.'));let working=false,setup,personalised=!!paper.copyAssignments?.length;
 const button=(label,fn)=>{const b=el('button',label);b.type='button';b.onclick=async()=>{if(working)return;working=true;message.textContent='';try{await fn();}catch(e){message.textContent=e.message;}finally{working=false;}};return b;};
 const named=button('1 · Student-specific PDF / Print',async()=>{personalised=true;const pageSettings=await setup.ready();await showMCQAssignedCopies(paper,ctx,{pageSettings});dialog.close();});named.disabled=!paper.copyAssignments?.length;
 dialog.append(named,button('2 · Normal QP for photocopying',async()=>{personalised=false;const pageSettings=await setup.ready();await printMCQPaper({...mcqPhotocopyPaper(paper),pageSettings});}),message,button('Close',()=>dialog.close()));const previewHost=el('section');previewHost.append(el('h4','Exact A4 preview · selected print layout'));dialog.append(previewHost);document.body.append(dialog);dialog.showModal();setup=renderMCQPageSetup(previewHost,{initial:mcqSavedPageSettings(summary.pageSettings??paper.pageSettings),paper:()=>personalised?mcqPreviewPaper(paper,ctx.draft):mcqPhotocopyPaper(paper)});setup.changed();dialog.onclose=()=>{setup.dispose();dialog.remove();};
}
