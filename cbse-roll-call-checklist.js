// No and Not applicable answers can include an optional comment.
export const rollCommentMaxWords=100;
export const rollCommentMaxLength=10000;
export const rollCommentWords=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
export function chamberQuestions(questions){return questions.map(q=>q.type==='text'?{...q}:{...q,type:'yesnona',naLabel:q.naLabel||'Not applicable'});}
export function snapshotQuestionComments(questions,answers,comments={}){
 if(!comments||typeof comments!=='object'||Array.isArray(comments))throw Error('Enter valid question comments.');
 const out={};
 for(const q of questions){
  if(q.type==='text'||!['no','na'].includes(answers[q.id]))continue;
  const text=comments[q.id];
  if(text===undefined||typeof text==='string'&&!text.trim())continue;
  if(typeof text!=='string'||text.length>rollCommentMaxLength||rollCommentWords(text)>rollCommentMaxWords)throw Error('Use at most '+rollCommentMaxWords+' words for the comment: '+q.label);
  out[q.id]=text.trim();
 }
 return out;
}
export const LEAVE_KINDS=['Casual leave (CL)','Earned leave (EL)','Unpaid contractual leave','Paid contractual leave','OD outside','Other'];
export function chamberLeaveKind(input){if(!LEAVE_KINDS.includes(input.leaveKind))throw Error('Select a valid leave type.');if(input.leaveKind!=='Other')return input.leaveKind;const other=String(input.otherLeaveKind||'').trim();if(!other||other.length>100)throw Error('Enter the other leave type (up to 100 characters).');return 'Other: '+other;}
