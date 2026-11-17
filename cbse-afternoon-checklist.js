// Principal-approved common afternoon checklist for both wings and all return modes.
const labels=[
 'Have you carefully read all messages shared in the Vidyalaya group and taken up any tasks assigned to you?',
 'Have you checked all emails forwarded to you, including any circulars received from HQ / RO?',
 'Have you confirmed that no pending work from yesterday remains due today?',
 'Have you logged in to the Samagam portal at least once today, visited all sections and confirmed that no work is due?',
 'Have you called the targeted students / parents concerning low attendance?',
 'Have you taken or planned a remedial class today?',
 'Have you ensured that no bundle checking or urgent task is pending from your side for the examination department?',
 'Have you ensured that no work is pending from your side for any department and that all blocking NOCs raised for today are resolved?',
 'Have you performed your Prime Mentor duties as CT / Co-CT today to support class academic progress and reduce absenteeism?'
];
export const AFTERNOON_QUESTIONS=[...labels.map((label,i)=>({id:'afternoon_check_'+(i+1),label,type:'yesno',required:true,commentMinWords:20,commentMaxWords:30})),{id:'afternoon_reflection',label:'Any other remarks on today’s contribution, lapses and action plan for tomorrow?',type:'text',required:true,minWords:50,maxWords:100}];
