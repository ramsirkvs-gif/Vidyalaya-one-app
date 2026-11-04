const prefix='mission-mcq-selection:';
const key=(ctx,subject)=>prefix+ctx.classId+':'+(ctx.state.staffId||'shared')+':'+subject;
export function readMCQSelectionDraft(ctx,subject){try{const value=JSON.parse(sessionStorage.getItem(key(ctx,subject))||'null');return value&&Array.isArray(value.ids)?value:null;}catch{return null;}}
export function saveMCQSelectionDraft(ctx,subject,selected,settings,targetSections){if(!subject)return;try{sessionStorage.setItem(key(ctx,subject),JSON.stringify({ids:Object.keys(selected),settings,targetSections,bankEpoch:ctx.state.questionBankEpoch||0}));}catch{}}
export function clearMCQSelectionDrafts(){try{for(const name of Object.keys(sessionStorage))if(name.startsWith(prefix)||name.startsWith('mcq-entry-selection:'))sessionStorage.removeItem(name);}catch{}}
