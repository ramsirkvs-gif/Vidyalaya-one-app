import {el} from './cbse-ui.js';
import {renderMCQSectionScope} from './cbse-mcq-section-scope.js';
import {renderMCQStudentTargets} from './cbse-mcq-student-targets-view.js';
import {showMCQAssignedCopies} from './cbse-mcq-assigned-copies-view.js';
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
export async function createMCQStudentPDF(summary,ctx,{identity,errorNode,guarded,onCreated=()=>{}}){
 const dialog=el('dialog',undefined,'mcq-manage-dialog mcq-student-pdf-dialog'),content=el('section'),status=el('p','Loading saved question paper…');dialog.append(button('Close',()=>dialog.close()),el('h3','Create student-specific PDF'),el('p','Keep the saved questions. Choose one or more sections, then select the students who will take this test.'),content,status);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
 try{
  const {paper}=await ctx.read({paperId:summary.id});if(!dialog.isConnected)return;if(!paper)throw Error('Paper not found.');status.remove();
  const local={...ctx,classId:paper.classId,requireStudentTargets:true,state:{...ctx.state,subjectId:paper.subjectId,studentSpecific:true,targetStudentKeys:[],mcqPrintSelectionMode:'selected',mcqAbsentPrintKeys:[],mcqAbsentSubject:paper.subjectId}},form=el('form',undefined,'mcq-student-pdf-form');form.dataset.portalTrackDirty='true';content.append(el('p',paper.id+' · '+paper.subjectName+' · '+paper.count+' questions · Original paper remains unchanged.'),form);
  let requestId='student_pdf_'+crypto.randomUUID().replaceAll('-','');const sections=renderMCQSectionScope(form,local,paper.targetSections||[]),picker=renderMCQStudentTargets(form,local,()=>paper.subjectId,sections.roster,()=>{requestId='student_pdf_'+crypto.randomUUID().replaceAll('-','');form.dataset.portalDirty='true';});sections.onChange(()=>{picker.refresh();requestId='student_pdf_'+crypto.randomUUID().replaceAll('-','');form.dataset.portalDirty='true';});
  const who=identity(form,local),error=errorNode(form),save=el('button',ctx.principal?'Save student-specific QP':'Save student-specific QP with PIN','primary');save.type='submit';form.append(save);
  form.onsubmit=event=>{event.preventDefault();guarded(form,error,save,who.pin,async()=>{
   sections.requireValid();if(!picker.enabled()||!picker.value().length)throw Error('Select at least one student. This action creates only student-specific papers.');
   const response=await ctx.submit('mcq-paper',{...who.values(),classId:paper.classId,subjectId:paper.subjectId,requestId,questionIds:paper.questions.map(q=>q.id),pageSettings:paper.pageSettings,paperType:'student-specific',targetStudentKeys:picker.value(),targetSections:sections.value(),questionBankEpoch:paper.questionBankEpoch||0});
   who.remember();form.dataset.portalDirty='false';content.replaceChildren();const result=el('section',undefined,'mcq-student-pdf-result');result.setAttribute('role','status');result.append(el('strong','STUDENT-SPECIFIC QP saved · '+response.paperId),el('p',picker.value().length+' students assigned. Print all named papers together, or choose one student below.'));
   const resultError=el('p');   result.append(button('Print all student-specific QPs / Save PDF',async()=>{try{await showMCQAssignedCopies({id:response.paperId},ctx);}catch(e){resultError.textContent=e.message;}}),button('Print by student / Save PDF',()=>showMCQAssignedCopies({id:response.paperId},ctx)),resultError);content.append(result);try{await onCreated(response.paperId);}catch{resultError.textContent='QP saved. Refresh the ready-made list to see it.';}
  });};
 }catch(e){status.textContent=e.message;}
}
