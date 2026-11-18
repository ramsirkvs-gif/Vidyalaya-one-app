// Principal-approved common afternoon checklist for both wings and all return modes.
const labels=[
 'Have you carefully read all messages shared in the Vidyalaya group and taken responsibility for any tasks assigned to you?',
 'Have you checked all emails forwarded to you, including circulars received from HQ or RO?',
 'Have you completed all work carried over from yesterday that was due today?',
 'Have you logged in to the Samagam portal at least once today, checked all relevant sections and completed all work due today?',
 'Have you called the identified students or their parents to follow up on low attendance?',
 'Have you conducted or planned a remedial class today?',
 'Have you completed all bundle-checking work and urgent tasks due from you for the Examination Department today?',
 'Have you completed all work due from you for every department today and obtained clearance for all blocking NOC objections?',
 'Have you carried out your Prime Mentor duties as CT / Co-CT today to support your class’s academic progress and reduce absenteeism?'
];
export const AFTERNOON_QUESTIONS=[...labels.map((label,i)=>({id:'afternoon_check_'+(i+1),label,type:'yesno',required:true,commentMinWords:20,commentMaxWords:50})),{id:'afternoon_reflection',label:'Describe your contributions today, any lapses and your action plan for tomorrow.',type:'text',required:true,minWords:50,maxWords:100}];

// Existing Principal corrections retain the saved wording and use the current remark limit.
export function currentAfternoonQuestion(q){
 const policy=AFTERNOON_QUESTIONS.find(question=>question.id===q.id);
 return policy?.commentMaxWords&&q.type==='yesno'?{...q,commentMinWords:policy.commentMinWords,commentMaxWords:policy.commentMaxWords}:{...q};
}
