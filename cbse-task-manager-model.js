// Aggregate survey only. Never store student names or identifying narratives here.
export const TASK_CLASSES=['IX A','IX B','IX C','IX D','X A','X B','X C','X D','XI A','XI B','XI C','XI D','XI E','XII A','XII B','XII C','XII D','XII E'];
export const TASK_AVAILABLE_CLASSES=['VI A','VI B','VI C','VI D','VII A','VII B','VII C','VII D','VIII A','VIII B','VIII C','VIII D',...TASK_CLASSES];
export function taskClasses(config={}){const selected=config.selectedClasses===undefined?TASK_CLASSES:config.selectedClasses;if(!Array.isArray(selected)||!selected.length||selected.length>TASK_AVAILABLE_CLASSES.length||new Set(selected).size!==selected.length||selected.some(c=>!TASK_AVAILABLE_CLASSES.includes(c)))throw Error('Select at least one valid class, without duplicates.');return TASK_AVAILABLE_CLASSES.filter(c=>selected.includes(c));}
export const TASK_PRIORITIES=['High priority / Most urgent','Urgent / Priority','Priority / Time bound, with deadline'];
export const TASK_REPORT_COMMENTS={ro:'Efforts by Regional Office (RO)',deputyCommissioner:'Efforts / guidance by Deputy Commissioner',assistantCommissioner:'Efforts / guidance by Assistant Commissioner (AC)',principalAction:'Action taken by the Principal',higherOfficials:'Visits and guidance by higher KVS officials'};
export const TASK_HEADERS={total:'Total students',catV:'Cat-V students',st:'Total ST students'};
export const TASK_FIELDS={passed:'Number passed in the latest examination',failed:'Number failed in the latest examination',firstGeneration:'First-generation learners',hostel:'Students living in hostels',familyChallenges:'Students facing family challenges, including single-parent families, parental separation, or sociocultural circumstances',outsideMeals:'Students dependent on outside arrangements for breakfast, lunch, or other meals',socialIssues:'Students affected by family drug addiction or other social issues',lawAndOrder:'Students affected by law-and-order situations or protests',selfHarm:'Students reported to express suicide/self-harm threats when pressured about studies',sleepy:'Students frequently sleepy during class',counselling:'Students receiving regular counselling',samagam:'Students previously reluctant to attend whose attendance improved through Samagam follow-up, including teachers updating home locations and contact information',sports:'Students mainly interested in games and sports, especially football and martial arts',cultural:'Students mainly interested in cultural activities, dance, and stage presentations rather than studies',ptms:'Number of PTMs or parent meetings conducted about these concerns',parentsUnavailable:'Students whose parents did not attend despite repeated calls or declined responsibility for the student’s issues'};

const own=(o,k)=>Object.hasOwn(o||{},k);
function fail(message){throw Error(message);}
function text(value,max,label,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())fail('Enter a valid '+label+'.');return value.trim();}
function count(value){if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>1000000)fail('Counts must be non-negative whole numbers or unconfirmed.');return value;}
export function taskRemarkWordCount(value){return typeof value==='string'&&value.trim()?value.trim().split(/\s+/u).length:0;}
function remarkAnswer(value,label,config,key){const answer=text(value??'',10000,label),words=taskRemarkWordCount(answer),legacy=own(config,'values')||answer===config.previousAnswers?.[key];if(answer&&!legacy&&(words<50||words>100))fail(label+' must contain 50–100 words, or be left blank.');return answer;}
export function taskQuestionIsWritten(q){return q.kind==='text'||(!own(TASK_FIELDS,q.id)&&/^(remarks?|observations?)\b/i.test(String(q.label||'').trim())&&/(counsell?or|special\s+educator|yoga\s+teacher)/i.test(q.label));}
export function taskQuestionWording(value){return String(value).trim().replace(/^no\.?\s*of\s+(?:of\s+)?/i,'Number of ').replace(/^Number of Students\b/,'Number of students').replace(/^Number passed in the latest examination$/,'Number of students who passed the latest examination').replace(/^Number failed in the latest examination$/,'Number of students who failed the latest examination').replace(/\bpassed students\b/gi,'students who passed').replace(/\bfailed students\b/gi,'students who failed').replace(/\bstudents do not ready to\b/gi,'students who are not ready to').replace(/\bfrequently sleepy during class in this week\b/gi,'frequently sleepy during class this week').replace(/\bStudents frequently sleepy during class$/,'Students who are frequently sleepy during class').replace(/\bshow resistance\/show self harm threats\b/gi,'show resistance / make self-harm threats').replace(/\bself harm\b/gi,'self-harm').replace(/\btake pressure about studies\b/gi,'handle pressure related to studies').replace(/\(if observation\)/gi,'(if observed)').replace(/\bcounselling on various issues\b/gi,'counselling for various issues').replace(/\ballto\s*gether\b/gi,'all together').replace(/\bsarvey\b/gi,'survey').replace(/\bcounseler\b/gi,'counsellor').replace(/\bspecial educater\b/gi,'special educator').replace(/^((?:Number of\s+)?First[- ]generation learners)\s*:?(?:\s*\(either one or both parents are uneducated\))?$/i,'$1 (either one or both parents are uneducated)');}
export function taskQuestions(config={}){
 const questions=config.questions===undefined?Object.entries(TASK_FIELDS).map(([id,label])=>({id,label,kind:id==='ptms'?'meetings':'students'})):config.questions;
 if(!Array.isArray(questions)||!questions.length||questions.length>60)fail('Provide between 1 and 60 survey questions.');const ids=new Set();
 return questions.map(q=>{if(!q||typeof q!=='object'||typeof q.id!=='string'||(!own(TASK_FIELDS,q.id)&&!/^q_[a-zA-Z0-9_]{8,50}$/.test(q.id))||ids.has(q.id))fail('Each question needs a unique valid ID.');ids.add(q.id);if(!['students','meetings','text'].includes(q.kind))fail('Choose a valid answer format.');const label=text(q.label,600,'survey question',true),kind=!own(config,'values')&&taskQuestionIsWritten({...q,label})?'text':q.kind;if((own(TASK_FIELDS,q.id)&&kind==='text')||(['passed','failed'].includes(q.id)&&kind!=='students')||(q.id==='ptms'&&kind!=='meetings'))fail('Passed/failed count students; PTMs count meetings.');return {id:q.id,label,kind};});
}
export function taskQuestionLabels(config={}, {countsOnly=false}={}){return Object.fromEntries(taskQuestions(config).filter(q=>!countsOnly||q.kind!=='text').map(q=>[q.id,taskQuestionWording(q.label)]));}
export function taskCompatibleValues(report,config={}){
 if(!report)return {};const old=new Map(taskQuestions(report).map(q=>[q.id,q]));
 return Object.fromEntries(taskQuestions(config).map(q=>{const previous=old.get(q.id);return [q.id,previous&&taskQuestionWording(previous.label)===taskQuestionWording(q.label)&&previous.kind===q.kind?report.values?.[q.id]??null:null];}));
}
export function taskHeader(value={}){if(!value||typeof value!=='object'||Array.isArray(value))fail('Invalid class figures.');const h=Object.fromEntries(Object.keys(TASK_HEADERS).map(k=>[k,count(value[k])]));for(const k of ['catV','st'])if(h.total!==null&&h[k]!==null&&h[k]>h.total)fail('Class figures cannot exceed enrollment.');return h;}
export function taskReport(value,header={},config={}){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Enter aggregate report counts.');
 const questions=taskQuestions(config),ids=new Set(questions.map(q=>q.id));if(Object.keys(value).some(k=>!ids.has(k)&&!['examContext','remarks'].includes(k)))fail('Only aggregate survey fields and teacher remarks are accepted.');
 const report={examContext:text(value.examContext??'',200,'examination context'),remarks:remarkAnswer(value.remarks,'teacher remarks',config,'remarks')};
 for(const q of questions){report[q.id]=q.kind==='text'?remarkAnswer(value[q.id],'written remarks answer',config,q.id):count(value[q.id]);if(q.kind==='students'&&header.total!=null&&report[q.id]!==null&&report[q.id]>header.total)fail(q.label+' cannot exceed enrollment.');}
 if(header.total!=null&&report.passed!=null&&report.failed!=null&&report.passed+report.failed>header.total)fail('Passed plus failed cannot exceed enrollment.');return report;
}
function config(value,staff){
 const c={title:text(value.title,240,'title',true),instructions:text(value.instructions,3000,'instructions'),priority:value.priority,deadline:text(value.deadline||'',10,'deadline'),visibility:value.visibility,questions:taskQuestions(value),selectedClasses:taskClasses(value),assignments:{},headers:{}};
 if(!TASK_PRIORITIES.includes(c.priority)||!['all','concerned'].includes(c.visibility))fail('Choose priority and visibility.');
 if(c.deadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(c.deadline)||new Date(c.deadline).toISOString().slice(0,10)!==c.deadline))fail('Enter a valid deadline.');
 if(c.priority===TASK_PRIORITIES[2]&&!c.deadline)fail('Time-bound tasks require a deadline.');
 for(const key of Object.keys(value.assignments||{})){if(!TASK_AVAILABLE_CLASSES.includes(key))fail('Unknown class.');const id=value.assignments[key];if(id&&(typeof id!=='string'||id.length>200||c.selectedClasses.includes(key)&&(!own(staff,id)||staff[id].status!=='active')))fail('Assign an active existing staff member.');if(id)c.assignments[key]=id;}
 for(const key of Object.keys(value.headers||{})){if(!TASK_AVAILABLE_CLASSES.includes(key))fail('Unknown class.');c.headers[key]=taskHeader(value.headers[key]);}return c;
}
export function taskSummary(task){
 const reports=task.reports||{},selectedClasses=taskClasses(task.draft),submitted=selectedClasses.filter(c=>own(reports,c)),pending=selectedClasses.filter(c=>!own(reports,c));
 const compatible=Object.fromEntries(submitted.map(c=>[c,taskCompatibleValues(reports[c],task.draft)]));
 const totals={};for(const k of [...Object.keys(TASK_HEADERS),...taskQuestions(task.draft).filter(q=>q.kind!=='text').map(q=>q.id)]){
  const classes=selectedClasses.filter(c=>{const value=own(TASK_HEADERS,k)?task.draft.headers?.[c]?.[k]:compatible[c]?.[k];return value!=null;});
  totals[k]={total:classes.length?classes.reduce((sum,c)=>sum+(own(TASK_HEADERS,k)?task.draft.headers[c][k]:compatible[c][k]),0):null,classes,missing:selectedClasses.filter(c=>!classes.includes(c))};
 }return {submitted,pending,totals,selectedClasses,archivedClasses:Object.keys(reports).filter(c=>!selectedClasses.includes(c))};
}
export function taskView(store={},actor={ids:[]}){
 const tasks={};for(const [id,t] of Object.entries(store.tasks||{})){
  if(actor.principal){tasks[id]={...structuredClone(t),summary:taskSummary(t)};continue;}
  const p=t.published;if(!p)continue;
  const classes=taskClasses(p).filter(c=>actor.ids.includes(p.assignments?.[c]));
  if(p.visibility==='concerned'&&!classes.length)continue;
  tasks[id]={revision:t.publishedRevision,title:p.title,priority:p.priority,deadline:p.deadline,instructions:p.instructions,questions:taskQuestions(p),visibility:p.visibility,classes,headers:Object.fromEntries(classes.map(c=>[c,p.headers?.[c]||taskHeader()])),reports:Object.fromEntries(classes.filter(c=>own(t.reports,c)).map(c=>[c,structuredClone(t.reports[c])]))};
 }return {tasks};
}
export function taskCatalogue(store={},staff={},roster=[]){
 const tasks={};for(const [id,t]of Object.entries(store.tasks||{})){
  const p=t.published;if(!p)continue;
  tasks[id]={title:p.title,priority:p.priority,deadline:p.deadline,rows:taskClasses(p).map((classId,index)=>{const reference=id==='task1'?roster.find(row=>row.classId===classId):null,staffId=p.assignments?.[classId]||'',person=staff[staffId];return {number:index+1,classId,mentor:person?.name||reference?.mentor||'Not assigned',support:reference?.support||'',staffId:person?.status==='active'?staffId:'',status:t.reports?.[classId]?'Submitted':'Pending'};})};
 }return {tasks};
}
export function applyTask(store,input,actor,staff,stamp,id){
 const next=structuredClone(store||{tasks:{}});next.tasks||={};
 const operation=input.operation;
 if(operation==='create'||operation==='create-task1'){
  if(!actor.principal)fail('Principal access required.');
  if(operation==='create-task1'){id='task1';if(own(next.tasks,id))return next;}
  next.tasks[id]={revision:1,draft:config({...input.draft,headers:{...next.classFigures,...input.draft.headers}},staff),reports:{},comment:'',createdAt:stamp,updatedAt:stamp};return next;
 }
 if(typeof input.taskId!=='string'||!own(next.tasks,input.taskId))fail('Task not found.');const t=next.tasks[input.taskId];
 if(operation==='submit'){
  const c=input.classId,p=t.published;if(!p||!taskClasses(p).includes(c)||!actor.ids.includes(p.assignments?.[c]))fail('This published class report is not assigned to you.');
  if(input.expectedRevision!==t.publishedRevision)fail('Task instructions or assignments changed. Refresh before saving.');
  if(input.reportRevision!==(t.reports?.[c]?.revision||0))fail('Class report changed. Refresh before saving.');
  const report=input.report&&typeof input.report==='object'&&!Array.isArray(input.report)?{...input.report,...(!own(input.report,'remarks')?{remarks:t.reports?.[c]?.values?.remarks||''}:{}),...(!own(input.report,'examContext')?{examContext:t.reports?.[c]?.values?.examContext||''}:{})}:input.report;
  const previous=t.reports?.[c],questions=taskQuestions(p),activeIds=new Set(questions.map(q=>q.id)),retired=structuredClone(previous?.retiredAnswers||{});
  if(previous)for(const q of taskQuestions(previous))if((!activeIds.has(q.id)||questions.find(current=>current.id===q.id)?.kind!==q.kind)&&own(previous.values,q.id))retired[q.id]={...q,value:previous.values[q.id]??null,submittedBy:previous.submittedBy,updatedAt:previous.updatedAt};
  t.reports||={};t.reports[c]={values:taskReport(report,p.headers?.[c],{...p,previousAnswers:previous?.values}),questions,revision:(previous?.revision||0)+1,submittedBy:actor.id,updatedAt:stamp,...(Object.keys(retired).length?{retiredAnswers:retired}:{}),...(previous?.principalEditHistory?{principalEditHistory:previous.principalEditHistory}:{})};return next;
 }
 if(!actor.principal)fail('Principal access required.');
 if(input.expectedRevision!==t.revision)fail('Task changed. Refresh before saving.');
 if(operation==='edit-report'){
  const c=input.classId;if(typeof c!=='string'||!own(t.reports,c))fail('Submitted class report not found.');const previous=t.reports[c];
  if(input.reportRevision!==(previous.revision||0))fail('Class report changed. Refresh before saving.');
  if(!input.report||typeof input.report!=='object'||Array.isArray(input.report))fail('Enter aggregate report counts.');
  const values=taskReport({...previous.values,...input.report},t.published?.headers?.[c]||t.draft.headers?.[c]||{},{questions:taskQuestions(previous),previousAnswers:previous.values});
  const history=structuredClone(previous.principalEditHistory||{});history['revision_'+(previous.revision||0)]={values:previous.values,questions:taskQuestions(previous),updatedAt:previous.updatedAt,editedAt:stamp};
  t.reports[c]={...previous,values,revision:(previous.revision||0)+1,originalSubmittedAt:previous.originalSubmittedAt||previous.updatedAt,updatedAt:stamp,principalEditedAt:stamp,principalEditHistory:history};
 }
 else if(operation==='save'){t.draft=config({...input.draft,questions:input.draft.questions===undefined?t.draft.questions:input.draft.questions,selectedClasses:input.draft.selectedClasses===undefined?t.draft.selectedClasses:input.draft.selectedClasses},staff);for(const [c,r]of Object.entries(t.reports||{}))taskReport(r.values,t.draft.headers[c],r);if(input.rememberFigures){next.classFigures||={};for(const [c,h]of Object.entries(t.draft.headers))if(Object.values(h).some(v=>v!=null))next.classFigures[c]=structuredClone(h);next.classFiguresUpdatedAt=stamp;}}
 else if(operation==='publish'){t.published=config(t.draft,staff);t.publishedRevision=(t.publishedRevision||0)+1;for(const [c,r]of Object.entries(t.reports||{}))taskReport(r.values,t.published.headers[c],r);t.publishedAt=stamp;}
 else if(operation==='unpublish'){delete t.published;}
 else if(operation==='report-comments'){
  if(!input.comments||typeof input.comments!=='object'||Array.isArray(input.comments)||Object.keys(input.comments).some(key=>!own(TASK_REPORT_COMMENTS,key)))fail('Enter valid closing report comments.');
  t.reportComments=Object.fromEntries(Object.keys(TASK_REPORT_COMMENTS).map(key=>[key,text(input.comments[key]??'',4000,'closing report comment')]));t.reportCommentsUpdatedAt=stamp;
 }
 else if(operation==='comment')t.comment=text(input.comment,4000,'Principal comment');
 else fail('Unknown task operation.');
 t.revision++;t.updatedAt=stamp;return next;
}
