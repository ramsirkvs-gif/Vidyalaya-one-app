import {el,options} from './cbse-ui.js';
import {rollCommentWords,rollCommentMaxWords,rollCommentMaxLength} from './cbse-roll-call-checklist.js';
export function reportingFieldComments(fields){return Object.fromEntries(Object.entries(fields).filter(([,n])=>n.commentInput&&['no','na'].includes(n.value)).map(([id,n])=>[id,n.commentInput.value.trim()]));}
export function renderReportingFields(parent,questions,start=1,{comments=false,strips=false,values={},savedComments={}}={}){
 const fields={};for(const q of questions){const label=el('label',`${start++}. ${q.label}${q.required?'':' (optional)'}`),input=el(q.type==='text'?'textarea':'select');input.name='roll-'+q.id;input.required=q.required;
 if(q.type==='text')input.maxLength=q.maxWords?10000:500;else options(input,[...(!q.required?[['','Not answered']]:[]),['no','No'],['yes','Yes'],...(q.type==='yesnona'?[['na',q.naLabel||'Not applicable']]:[])],values[q.id]??'yes');if(q.type==='text')input.value=values[q.id]||'';label.append(input);parent.append(label);fields[q.id]=input;if(q.type==='text'&&q.minWords){const count=el('small');label.append(count);const sync=()=>{const words=rollCommentWords(input.value);count.textContent=words+' words · Maximum: '+q.maxWords;input.setCustomValidity(((q.required||words>0)&&words<q.minWords)||words>q.maxWords?(words<q.minWords?'Enter a response.':'Use at most '+q.maxWords+' words.'):'');};input.addEventListener('input',sync);sync();}
 if(strips&&q.type!=='text'){input.classList.add('roll-answer-source');input.tabIndex=-1;input.setAttribute('aria-hidden','true');const group=el('div',undefined,'roll-answer-strips');group.setAttribute('role','group');group.setAttribute('aria-label',q.label);for(const value of ['yes','no',...(q.type==='yesnona'?['na']:[])]){const b=el('button',value==='yes'?'Yes':value==='no'?'No':q.naLabel||'Not applicable','roll-answer-'+value);b.type='button';b.dataset.answer=value;b.onclick=()=>{input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new Event('input',{bubbles:true}));};group.append(b);}const sync=()=>{for(const b of group.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.answer===input.value));};input.addEventListener('change',sync);sync();parent.append(group);}

 if(comments&&q.type!=='text'){
  const wrap=el('label','Comment · optional · maximum '+rollCommentMaxWords+' words','roll-question-comment'),comment=el('textarea'),count=el('small');
  comment.name='roll-comment-'+q.id;comment.maxLength=rollCommentMaxLength;comment.value=savedComments[q.id]||'';input.commentInput=comment;
  wrap.append(comment,count);parent.append(wrap);
  const sync=()=>{
   const show=['no','na'].includes(input.value);
   wrap.hidden=!show;comment.disabled=!show;
   const words=rollCommentWords(comment.value);
   count.textContent=words+' / '+rollCommentMaxWords+' words';
   comment.setCustomValidity(show&&words>rollCommentMaxWords?'Use at most '+rollCommentMaxWords+' words.':'');
  };
  input.addEventListener('change',sync);comment.oninput=sync;sync();
 }
 }return fields;
}
