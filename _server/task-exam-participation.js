// Participation denominators from the four Principal-supplied exam screenshots.
// These are reference figures, not survey questions or automatic Passed entries.
const groups=[
 ['IX','Periodic Test-2',[[43,39],[48,46],[40,37],[38,36]]],
 ['X','Monthly Test (X-Sept)',[[24,21],[27,27],[24,23],[24,23]]],
 ['XI','Periodic Test-1 — Class XI',[[42,39],[35,34],[40,35],[39,33],[37,36]]],
 ['XII','Monthly Test (XII-Sept)',[[24,23],[29,27],[26,24],[35,34],[27,25]]]
];
export function withTaskExamParticipation(store){
 if(!store?.tasks?.task1)return store;const next=structuredClone(store),task=next.tasks.task1,config=task.published||task.draft,rows={};
 for(const [grade,exam,sections]of groups)sections.forEach(([enrolled,appeared],index)=>{const classId=grade+' '+String.fromCharCode(65+index);if(config?.headers?.[classId]?.total===enrolled)rows[classId]={exam,enrolled,appeared};});
 task.examParticipation={source:'Principal-supplied exam screenshots',rows};return next;
}
