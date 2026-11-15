// Aggregate survey only. Never store student names or identifying narratives here.
export const TASK_CLASSES=['IX A','IX B','IX C','IX D','X A','X B','X C','X D','XI A','XI B','XI C','XI D','XI E','XII A','XII B','XII C','XII D','XII E'];
export const TASK_PRIORITIES=['High priority / Most urgent','Urgent / Priority','Priority / Time bound, with deadline'];
export const TASK_HEADERS={total:'Total students',catV:'Cat-V students',st:'Total ST students'};
export const TASK_FIELDS={passed:'Number passed in the latest examination',failed:'Number failed in the latest examination',firstGeneration:'First-generation learners',hostel:'Students living in hostels',familyChallenges:'Students facing family challenges, including single-parent families, parental separation, or sociocultural circumstances',outsideMeals:'Students dependent on outside arrangements for breakfast, lunch, or other meals',socialIssues:'Students affected by family drug addiction or other social issues',lawAndOrder:'Students affected by law-and-order situations or protests',selfHarm:'Students reported to express suicide/self-harm threats when pressured about studies',sleepy:'Students frequently sleepy during class',counselling:'Students receiving regular counselling',samagam:'Students previously reluctant to attend whose attendance improved through Samagam follow-up, including teachers updating home locations and contact information',sports:'Students mainly interested in games and sports, especially football and martial arts',cultural:'Students mainly interested in cultural activities, dance, and stage presentations rather than studies',ptms:'Number of PTMs or parent meetings conducted about these concerns',parentsUnavailable:'Students whose parents did not attend despite repeated calls or declined responsibility for the student’s issues'};

const own=(o,k)=>Object.hasOwn(o||{},k);
function fail(message){throw Error(message);}
function text(value,max,label,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())fail('Enter a valid '+label+'.');return value.trim();}
function count(value){if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>1000000)fail('Counts must be non-negative whole numbers or unconfirmed.');return value;}
export function taskHeader(value={}){if(!value||typeof value!=='object'||Array.isArray(value))fail('Invalid class figures.');const h=Object.fromEntries(Object.keys(TASK_HEADERS).map(k=>[k,count(value[k])]));for(const k of ['catV','st'])if(h.total!==null&&h[k]!==null&&h[k]>h.total)fail('Class figures cannot exceed enrollment.');return h;}
export function taskReport(value,header={}){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Enter aggregate report counts.');
 if(Object.keys(value).some(k=>!own(TASK_FIELDS,k)&&k!=='examContext'))fail('Only aggregate survey fields are accepted.');
 const report={examContext:text(value.examContext,200,'latest examination name/context',true)};
 for(const k of Object.keys(TASK_FIELDS)){report[k]=count(value[k]);if(k!=='ptms'&&header.total!=null&&report[k]!==null&&report[k]>header.total)fail(TASK_FIELDS[k]+' cannot exceed enrollment.');}
 if(header.total!=null&&report.passed!==null&&report.failed!==null&&report.passed+report.failed>header.total)fail('Passed plus failed cannot exceed enrollment.');return report;
}
function config(value,staff){
 const c={title:text(value.title,240,'title',true),instructions:text(value.instructions,3000,'instructions'),priority:value.priority,deadline:text(value.deadline||'',10,'deadline'),visibility:value.visibility,assignments:{},headers:{}};
 if(!TASK_PRIORITIES.includes(c.priority)||!['all','concerned'].includes(c.visibility))fail('Choose priority and visibility.');
 if(c.deadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(c.deadline)||new Date(c.deadline).toISOString().slice(0,10)!==c.deadline))fail('Enter a valid deadline.');
 if(c.priority===TASK_PRIORITIES[2]&&!c.deadline)fail('Time-bound tasks require a deadline.');
 for(const key of Object.keys(value.assignments||{})){if(!TASK_CLASSES.includes(key))fail('Unknown class.');const id=value.assignments[key];if(id&&(!own(staff,id)||staff[id].status!=='active'))fail('Assign an active existing staff member.');if(id)c.assignments[key]=id;}
 for(const key of Object.keys(value.headers||{})){if(!TASK_CLASSES.includes(key))fail('Unknown class.');c.headers[key]=taskHeader(value.headers[key]);}return c;
}
export function taskSummary(task){
 const reports=task.reports||{},submitted=TASK_CLASSES.filter(c=>own(reports,c)),pending=TASK_CLASSES.filter(c=>!own(reports,c));
 const totals={};for(const k of [...Object.keys(TASK_HEADERS),...Object.keys(TASK_FIELDS)]){
  const classes=TASK_CLASSES.filter(c=>{const value=own(TASK_HEADERS,k)?task.draft.headers?.[c]?.[k]:reports[c]?.values?.[k];return value!=null;});
  totals[k]={total:classes.length?classes.reduce((sum,c)=>sum+(own(TASK_HEADERS,k)?task.draft.headers[c][k]:reports[c].values[k]),0):null,classes,missing:TASK_CLASSES.filter(c=>!classes.includes(c))};
 }return {submitted,pending,totals};
}
export function taskView(store={},actor={ids:[]}){
 const tasks={};for(const [id,t] of Object.entries(store.tasks||{})){
  if(actor.principal){tasks[id]={...structuredClone(t),summary:taskSummary(t)};continue;}
  const p=t.published;if(!p)continue;
  const classes=TASK_CLASSES.filter(c=>actor.ids.includes(p.assignments?.[c]));
  if(p.visibility==='concerned'&&!classes.length)continue;
  tasks[id]={revision:t.publishedRevision,title:p.title,priority:p.priority,deadline:p.deadline,instructions:p.instructions,visibility:p.visibility,classes,headers:Object.fromEntries(classes.map(c=>[c,p.headers?.[c]||taskHeader()])),reports:Object.fromEntries(classes.filter(c=>own(t.reports,c)).map(c=>[c,structuredClone(t.reports[c])]))};
 }return {tasks};
}
export function applyTask(store,input,actor,staff,stamp,id){
 const next=structuredClone(store||{tasks:{}});next.tasks||={};
 const operation=input.operation;
 if(operation==='create'||operation==='create-task1'){
  if(!actor.principal)fail('Principal access required.');
  if(operation==='create-task1'){id='task1';if(own(next.tasks,id))return next;}
  next.tasks[id]={revision:1,draft:config(input.draft,staff),reports:{},comment:'',createdAt:stamp,updatedAt:stamp};return next;
 }
 if(typeof input.taskId!=='string'||!own(next.tasks,input.taskId))fail('Task not found.');const t=next.tasks[input.taskId];
 if(operation==='submit'){
  const c=input.classId,p=t.published;if(!p||!TASK_CLASSES.includes(c)||!actor.ids.includes(p.assignments?.[c]))fail('This published class report is not assigned to you.');
  if(input.expectedRevision!==t.publishedRevision)fail('Task instructions or assignments changed. Refresh before saving.');
  if(input.reportRevision!==(t.reports?.[c]?.revision||0))fail('Class report changed. Refresh before saving.');
  t.reports||={};t.reports[c]={values:taskReport(input.report,p.headers?.[c]),revision:(t.reports[c]?.revision||0)+1,submittedBy:actor.id,updatedAt:stamp};return next;
 }
 if(!actor.principal)fail('Principal access required.');
 if(input.expectedRevision!==t.revision)fail('Task changed. Refresh before saving.');
 if(operation==='save'){t.draft=config(input.draft,staff);for(const [c,r]of Object.entries(t.reports||{}))taskReport(r.values,t.draft.headers[c]);}
 else if(operation==='publish'){t.published=config(t.draft,staff);t.publishedRevision=(t.publishedRevision||0)+1;for(const [c,r]of Object.entries(t.reports||{}))taskReport(r.values,t.published.headers[c]);t.publishedAt=stamp;}
 else if(operation==='unpublish'){delete t.published;}
 else if(operation==='comment')t.comment=text(input.comment,4000,'Principal comment');
 else fail('Unknown task operation.');
 t.revision++;t.updatedAt=stamp;return next;
}
