import {RETEST_TITLE,RETEST_HEADERS,RETEST_CSV_HEADERS,RETEST_FIELDS,RETEST_STEPS} from './cbse-task-retest-model.js';
import {openTaskStatusReport} from './cbse-task-status-report.js';
import {rollStaffStatus} from './cbse-roll-call-status.js';
import {rollDateText,rollTimestamp} from './cbse-roll-call-time.js';
import {signedSlipScan} from './cbse-task-scan-view.js';
import {isAvinashGuestProfile} from './cbse-faculty-guest.js';
import {buildTaskWorkbook} from './cbse-task-excel.js';
import {openTaskPresentation,closeTaskPresentation} from './cbse-task-presentation.js';
import {importTaskFiguresCSV,importTaskStrengthWorkbook,taskFiguresTemplate,decodePreparedTaskFigures,loadTaskWorkbook} from './cbse-task-manager-import.js';
import {TASK_CLASSES,TASK_AVAILABLE_CLASSES,TASK_PRIMARY_CLASSES,taskClasses,TASK_PRIORITIES,TASK_HEADERS,TASK_REPORT_COMMENTS,taskHeader,taskQuestions,taskQuestionLabels,taskCompatibleValues,taskSummary,taskQuestionIsWritten,taskQuestionWording,taskRemarkWordCount} from './cbse-task-manager-model.js';
import {el,options} from './cbse-ui.js';
import {renderPrincipalLogin} from './cbse-principal-login.js';
import {HALF_YEARLY_COLUMNS,HALF_YEARLY_CSV_LIMIT,CLASS_IX_EXAM,CLASS_IX_SEATING,CLASS_IX_SEATING_FIELDS,CLASS_IX_PAPERS} from './cbse-half-yearly-analyser-model.js';
import {renderPB1Analyser,PB1_ANALYSER,HALF_YEARLY_ANALYSER} from './cbse-pb1-analyser-view.js';
import {MONITORING_TITLE,MONITORING_SHEETS,MONITORING_LIMITS,monitoringFormula} from './cbse-task-workbook.js';
import {MONITORING_ROLES,MONITORING_STEPS,FINAL_EXAM_IC_NAMES,monitoringAssignments,monitoringAdvance,monitoringBundlesByExamDate,monitoringStage,monitoringPeople,monitoringExamDateKey,monitoringExamLabel,monitoringSlipFolder} from './cbse-task-monitoring-workflow.js';
function signedPdfUploadLink(section){
 const link=el('a','Upload signed PDF','button');
 link.href='https://drive.google.com/drive/folders/'+monitoringSlipFolder(section);link.target='_blank';link.rel='noopener noreferrer';
 return link;
}
const SAMAGAM_REPORTING_NOTICE='Upload marks to Samagam only after both the Subject Teacher and the Class Teacher have completed their reporting to the Principal.';
const host=document.getElementById('task-content'),nav=document.getElementById('task-nav'),status=document.getElementById('task-status');
const OVERALL_COMMENT_LABEL='Overall situation — comments by CT / Prime mentor / Survey IC';
let suppliedFigures=null,suppliedFiguresError='';const entryParams=new URLSearchParams(location.hash.slice(1));if(entryParams.has('figures')){try{suppliedFigures=decodePreparedTaskFigures(entryParams.get('figures'));}catch(error){suppliedFiguresError=error.message;}history.replaceState(null,'','#principal');}
let renderedMode='staff';
let auth,authApi,user=null,principal=false,busy=false,epoch=0,store={tasks:{}},staff={},selectedStaff='';
const mode=()=>location.hash==='#principal'?'principal':'staff';
const dirty=()=>!!document.querySelector('form[data-portal-dirty="true"]');
const discard=()=>!dirty()||confirm('Discard unsaved task entries?');
function message(value,error=false){status.textContent=value;status.className=error?'task-error':'';}
function field(parent,label,name,type='text',value=''){const wrap=el('label',label),input=el(['textarea','select'].includes(type)?type:'input');input.name=name;input.setAttribute('aria-label',label);if(input.tagName==='INPUT')input.type=type;input.value=value;wrap.append(input);parent.append(wrap);return input;}
function reportAnswers(answers){const list=el('dl',undefined,'task-report-answers');for(const {label,value,written}of answers){const row=el('div',undefined,'task-report-answer'+(written?' task-report-answer-written':''));row.append(el('dt',label),el('dd',String(value===''||value==null?'—':value)));list.append(row);}return list;}
function form(){const f=el('form');f.dataset.portalTrackDirty='true';return f;}
function button(label,fn){const b=el('button',label);b.type='button';b.onclick=()=>run(fn);return b;}
async function request(input,asPrincipal=false){const ticket=epoch,token=asPrincipal&&user?await user.getIdToken():'',controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);try{const response=await fetch('/api/staff-access',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(input)});const result=await response.json();if(ticket!==epoch)throw Error('Session changed. Reopen Task manager.');if(!response.ok){const error=Error(result.error||'Request failed. Entries are retained.');error.curtainRequired=result.curtainRequired;error.status=response.status;throw error;}return result;}catch(e){if(e.name==='AbortError')throw Error('Request timed out. Your entries are retained; refresh to check whether the save completed.');throw e;}finally{clearTimeout(timer);}}
async function run(fn){if(busy)return;busy=true;document.documentElement.dataset.portalBusy='true';const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(b=>!b.disabled);controls.forEach(b=>b.disabled=true);message('Please wait…');try{await fn();if(status.textContent==='Please wait…')message('');}catch(e){message(e.message,true);}finally{busy=false;document.documentElement.dataset.portalBusy='false';controls.forEach(b=>b.disabled=false);}}
function navigation(){
 if(principal){
  nav.replaceChildren(button('Sign out',async()=>{if(discard()){suppliedFigures=null;await authApi.signOut(auth);}}));
  return;
 }
 const panel=el('div',undefined,'task-principal-panel');panel.id='task-principal-sign-in';panel.hidden=true;
 const toggle=button('Principal sign-in',()=>{
  if(!discard())return;
  panel.hidden=!panel.hidden;
  toggle.setAttribute('aria-expanded',String(!panel.hidden));
  if(panel.hidden){panel.replaceChildren();return;}
  if(authApi){
   renderPrincipalLogin(panel,password=>authApi.signInWithEmailAndPassword(auth,'ramsirkvs@gmail.com',password));
   panel.querySelector('input').focus();
  }else panel.append(el('p','Principal sign-in is unavailable. Refresh to retry.'));
 });
 toggle.setAttribute('aria-expanded','false');
 toggle.setAttribute('aria-controls',panel.id);
 nav.replaceChildren(toggle,panel);
}
function clearSuppliedFigures(id){if(suppliedFigures?.taskId===id){suppliedFigures=null;document.querySelector('.task-import-ready')?.remove();}}
function adopt(result){store=result;staff=result.staff||staff;}
async function admin(input){const result=await request({action:'task-principal',...input},true);adopt(result);return result;}
async function load(){closeTaskPresentation();document.body.classList.remove('task-form-open');document.querySelectorAll('dialog.task-start-dialog').forEach(d=>d.remove());renderedMode=mode();navigation();host.replaceChildren();if(user){try{await admin({operation:'read'});principal=true;history.replaceState(null,'','#principal');navigation();drawPrincipal();return;}catch(error){if(![401,403].includes(error.status))throw error;}}
 adopt(await request({action:'task-read'}));drawStaff();}

function catalogue(parent){
 const list=Object.entries(store.tasks||{}).map(([id,t])=>({
  title:t.draft.title,updatedAt:Math.max(t.updatedAt||t.createdAt||0,...Object.values(t.reports||{}).map(report=>report.updatedAt||0)),state:t.published?'Published':'Draft',
  open:()=>openPrincipalTask(id,t),
 }));
 list.push({title:'Task 4 — '+RETEST_TITLE,updatedAt:0,state:store.retestPublished?'High priority · Published':'High priority · Draft',open:openRetest});
 list.push({title:'Task 3 — Class IX Pre-Annual Exam',updatedAt:0,state:'Published',open:drawClassIXExam});
 list.push({title:MONITORING_TITLE,updatedAt:store.monitoringUpdatedAt||0,state:'Monitoring',open:openMonitoring});
 list.sort((a,b)=>b.updatedAt-a.updatedAt);
 const scroll=el('div',undefined,'task-scroll'),table=el('table',undefined,'task-totals task-register');
 const head=table.createTHead().insertRow(),body=table.createTBody();
 for(const label of ['Task','Status','Updated (IST)','Open']){
  const cell=el('th',label);cell.scope='col';head.append(cell);
 }
 for(const task of list){
  const row=body.insertRow(),title=el('th',task.title);title.scope='row';
  row.append(title,el('td',task.state),el('td',task.updatedAt?rollTimestamp(task.updatedAt):'—'));
  const open=button('Open task',task.open);open.setAttribute('aria-label','Open '+task.title);row.insertCell().append(open);
 }
 scroll.append(table);parent.append(scroll);
}
function openPrincipalTask(id,task){
 const card=el('section',undefined,'task-card');card.id='task-'+id;
 const actions=el('div',undefined,'task-actions');
 actions.append(button('Back to task list',()=>{if(discard())drawPrincipal();}),button('Refresh tasks',async()=>{
  if(!discard())return;
  await admin({operation:'read'});
  if(store.tasks[id])openPrincipalTask(id,store.tasks[id]);else drawPrincipal();
 }));
 host.replaceChildren(actions,card);
 drawAdminTask(card,id,task);host.scrollIntoView({block:'start'});
}
async function openMonitoring(){
 const {monitoring}=await request({action:'task-principal',operation:'monitoring-read'},true);
 drawMonitoring(monitoring);
}
async function openPublishedMonitoring(passwordValue,focusRow,staffId=''){
 try{
  if(passwordValue!==undefined)await request({action:'view-login',password:passwordValue});
  const {monitoring}=await request({action:'task-read',operation:'monitoring-read'});
  drawStaffBundles(monitoring,{focusRow,staffId});
 }catch(error){
  if(!error.curtainRequired&&passwordValue===undefined)throw error;
  if(passwordValue!==undefined)throw error;
  const login=form(),password=field(login,'Staff viewing password','monitoring-password','password');
  login.className='task-monitoring';
  password.required=true;
  login.append(el('button','Open published plan'));
  login.onsubmit=event=>{event.preventDefault();const secret=password.value;password.value='';run(()=>openPublishedMonitoring(secret,focusRow,staffId));};
  host.replaceChildren(button('Back to Task 2',drawStaffTask2),el('h2',MONITORING_TITLE),login);
 }
}
function drawMonitoringSettings(record,index){
 const overrides=structuredClone(record.overrides||{}),editor=form(),card=el('section',undefined,'task-card task-monitoring');
 const rows=monitoringAssignments(record.sheets,staff,overrides);
 host.replaceChildren(button('Back to plan',()=>{if(discard())drawMonitoring(record,{index});}),card);
 card.append(el('h2','Task 2 workflow settings'));
 const people=Object.entries(staff).sort(([,a],[,b])=>a.name.localeCompare(b.name)).map(([id,p])=>[id,p.name]);
 if(Object.keys(record.published?.assignments||{}).length)card.append(button('Emergency assignment',()=>{
  if(discard())drawMonitoring(record,{emergencyPeople:people});
 }));
 card.append(el('p','Final Exam IC report · '+FINAL_EXAM_IC_NAMES.join(' or ')));
 const entries=Object.entries(rows),rowPicker=field(editor,'Evaluation assignment','evaluation-row','select');
 card.append(el('p',entries.filter(([,row])=>MONITORING_ROLES.some(([role])=>!row.roles[role])).length+' rows need staff assignments in this saved draft.'));
 options(rowPicker,entries.map(([id,row])=>[id,id.slice(4)+' · '+row.subject+' · '+row.section+(MONITORING_ROLES.some(([role])=>!row.roles[role])?' · Assignment needed':'')]),entries[0]?.[0]||'');
 const fields=el('div');
 function showAssignments(){
  const key=rowPicker.value,row=rows[key];fields.replaceChildren();
  if(!row)return;
  for(const [role,label] of MONITORING_ROLES){
   const select=field(fields,label,role,'select');
   options(select,[['','Unassigned'],...people],overrides[key]?.[role]??row.roles[role]?.id??'');
   select.onchange=()=>{(overrides[key]??={})[role]=select.value;editor.dataset.portalDirty='true';};
  }
 }
 rowPicker.onchange=showAssignments;showAssignments();
 editor.append(fields,el('button','Save workflow settings'));
 editor.onsubmit=event=>{event.preventDefault();run(async()=>{
  const {monitoring}=await request({action:'task-principal',operation:'monitoring-settings',expectedRevision:record.revision,overrides},true);
  store.monitoringUpdatedAt=monitoring.updatedAt;editor.dataset.portalDirty='false';
  drawMonitoring(monitoring,{index});message('Workflow settings saved. Publish the plan to apply them to Staff View.');
 });};
 card.append(editor);
}
function openMonitoringStep(record,key,staffView,allowUpdate=true,practiceUpdate,staffId=''){
 const entry=(staffView?record:record.published).assignments[key],progress=record.progress?.[key];
 const stage=monitoringStage(progress),step=MONITORING_STEPS[stage],dialog=el('dialog',undefined,'task-start-dialog task-monitoring-dialog');
 const title=el('h2',step?.uploadPdf?[monitoringExamLabel(entry.section),entry.section,entry.subject].join(' · '):entry.subject+' · '+entry.section);
 title.id='task-monitoring-step-title';dialog.setAttribute('aria-labelledby',title.id);dialog.append(title);
 if(practiceUpdate)dialog.append(el('p','Mock practice · no real status will change.','task-monitoring-notice'));
 if(staffView&&step?.instruction)dialog.append(el('p',step.instruction,'task-monitoring-notice'));
 if(staffView&&step?.samagam)dialog.append(el('p',SAMAGAM_REPORTING_NOTICE,'task-monitoring-notice'));
 if(progress?.history?.length){
  const history=el('details');history.open=!allowUpdate;
  history.append(el('summary','Workflow history'));
  for(const item of progress.history){
   history.append(el('p',item.label+' · '+item.name+' · '+rollTimestamp(item.at)));
   if(item.remark)history.append(el('p',item.remark));
  }
  dialog.append(history);
 }
 const close=button('Close',()=>dialog.close());dialog.append(close);
 const eligible=monitoringPeople(record,entry,stage);
 let scan;
 if(staffView&&allowUpdate&&step&&eligible.length){
  const editor=form(),assigned=step.uploadPdf&&eligible.length===1?eligible[0]:null;
  const person=assigned?null:field(editor,'Your name','monitoring-staff','select');
  if(person){options(person,[['','Choose your name'],...eligible.map(({id,name})=>[id,name])],staffId);person.required=true;}
  else editor.append(el('p',assigned.name));
  const outcome=step.uploadPdf?null:field(editor,'Status','monitoring-outcome','select');
  if(outcome)options(outcome,[['','Choose status'],...step.options],'');
  else scan=signedSlipScan(editor,run);
  const remark=step.uploadPdf?null:field(editor,step.role==='exam'?'Final remark':'Remark','monitoring-remark','textarea');
  if(remark)remark.maxLength=500;
  const pin=field(editor,'Personal PIN','monitoring-pin','password');pin.inputMode='numeric';pin.autocomplete='new-password';
  pin.addEventListener('focus',()=>{pin.value='';},{once:true});
  pin.required=true;
  if(outcome){outcome.required=true;outcome.onchange=()=>{remark.required=step.role==='exam'||outcome.value==='return';};outcome.onchange();}
  const errorText=el('p',undefined,'task-error');errorText.setAttribute('role','status');
  editor.append(el('button',step.uploadPdf?(practiceUpdate?'Test scan':'Submit'):practiceUpdate?'Save practice status':'Save status'),errorText);dialog.append(editor);
  editor.onsubmit=event=>{event.preventDefault();run(async()=>{
   try{
    const pdf=scan?await scan.payload():undefined;
    const secret=pin.value;pin.value='';
    if(pdf)errorText.textContent=practiceUpdate?'Checking practice PDF…':'Uploading to Google Drive…';
    const result=await request({action:'pin-submit',operation:'task-manager',pdf:practiceUpdate?undefined:pdf,taskOperation:practiceUpdate?'monitoring-practice':'monitoring-update',staffId:assigned?.id||person.value,pin:secret,rowKey:key,publicationRevision:record.revision,expectedRevision:progress?.revision||0,stage,outcome:outcome?.value||'advance',remark:remark?.value});
    dialog.close();
    if(practiceUpdate){practiceUpdate(result);message('Practice status saved.');}
    else{await openPublishedMonitoring(undefined,key,staffId);message(pdf?'Signed PDF uploaded.':'Status saved.');}
   }catch(error){errorText.textContent=error.message;}
  });};
 }else if(staffView&&allowUpdate&&step)dialog.append(el('p','Awaiting a Principal assignment for '+step.label+'.'));
 dialog.addEventListener('close',()=>{scan?.clear();dialog.remove();},{once:true});document.body.append(dialog);dialog.showModal();
}
function openStaffSlipReplacement(record,key,staffId){
 const entry=record.assignments[key],progress=record.progress[key],dialog=el('dialog',undefined,'task-start-dialog task-monitoring-dialog'),editor=form();
 const title=el('h2','Replace signed PDF');title.id='task-slip-replace-title';dialog.setAttribute('aria-labelledby',title.id);
 const pin=field(editor,'Personal PIN','monitoring-replace-pin','password'),feedback=el('p',undefined,'task-error');
 pin.required=true;pin.autocomplete='new-password';pin.inputMode='numeric';
 pin.addEventListener('focus',()=>{pin.value='';},{once:true});
 feedback.setAttribute('role','status');
 editor.append(el('button','Remove current slip and reopen upload'),button('Cancel',()=>dialog.close()),feedback);
 dialog.append(title,el('p',entry.section+' · '+entry.subject),
  el('p','This removes the current slip from the bundle and reopens Step 4. The previous file stays in Drive.'),editor);
 editor.onsubmit=event=>{event.preventDefault();run(async()=>{
  const secret=pin.value;pin.value='';feedback.textContent='';
  try{await request({action:'pin-submit',operation:'task-manager',taskOperation:'monitoring-reopen-upload',
   staffId,pin:secret,rowKey:key,publicationRevision:record.revision,expectedRevision:progress.revision});}
  catch(error){feedback.textContent=error.message;return;}
  dialog.close();
  await openPublishedMonitoring(undefined,key,staffId);
  message('Previous slip removed. Scan the replacement at Step 4.');
 });};
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 document.body.append(dialog);dialog.showModal();
}
function drawStaffBundles(record,{focusRow,staffId=''}={}){
 const card=el('section',undefined,'task-card task-monitoring'),bundleList=el('div',undefined,'task-bundle-list'),detail=el('div');
 const bundles=Object.entries(record.assignments||{});
 const groups=[
  ['evaluator','Evaluator bundles'],['checker','Cross-checker bundles'],
  ['matching','Samagam Matching IC bundles'],['exam','Exam IC bundles'],
 ];
 const people=new Map(),bundlePeople=new Map(bundles.map(([key,entry])=>{
  const byRole=new Map(groups.map(([role])=>[role,new Set()]));
  for(const [index,step] of MONITORING_STEPS.entries()){
   const assigned=[entry.roles?.[step.role],...monitoringPeople(record,entry,index)].filter(Boolean);
   for(const {id,name} of assigned){people.set(id,name);byRole.get(step.role).add(id);}
  }
  return [key,byRole];
 }));
 card.append(el('h2',MONITORING_TITLE));
 const nameSearch=field(card,'Search by name','monitoring-name-search','search');
 nameSearch.placeholder='Type any part of your name';
 const teacher=field(card,'Select your name','monitoring-teacher','select');
 const names=[...people].sort(([,a],[,b])=>a.localeCompare(b));
 const searchKey=value=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase();
 function filterNames(selectedId){
  const terms=searchKey(nameSearch.value).trim().split(/\s+/).filter(Boolean);
  const matches=names.filter(([,name])=>terms.every(term=>searchKey(name).includes(term)));
  options(teacher,[['',matches.length?'Choose your name':'No teachers match'],...matches],selectedId);
 }
 filterNames(staffId);
 const practiceNotice=el('p','Mock practice · use your PIN. These changes stay in this tab.','task-monitoring-notice');
 practiceNotice.hidden=true;
 let practice=null,selected=focusRow;
 const toggle=button('Mock practice with PIN',()=>{
  practice=practice?null:{};
  practiceNotice.hidden=!practice;
  toggle.textContent=practice?'Exit mock practice':'Mock practice with PIN';
  drawBundles();
 });
 card.append(bundleList,detail,practiceNotice,toggle);
 host.replaceChildren(button('Back to Task 2',drawStaffTask2),card);
 const currentProgress=key=>practice?practice[key]:record.progress?.[key];
 const uploadLabel=MONITORING_STEPS.find(step=>step.uploadPdf).options[0][1];
 const uploadRecorded=progress=>progress?.history?.some(event=>event.label===uploadLabel);
 const completed=progress=>monitoringStage(progress)>=MONITORING_STEPS.length&&uploadRecorded(progress);
 const doneBadge=()=>el('strong','✓ Bundle complete','task-bundle-complete');
 function drawBundles(){
  bundleList.replaceChildren();
  if(!teacher.value){detail.replaceChildren();return;}
  const assigned=bundles.filter(([key])=>[...bundlePeople.get(key).values()].some(ids=>ids.has(teacher.value)));
  bundleList.append(el('h3','Your bundles · '+assigned.length));
  if(!assigned.some(([key])=>key===selected))selected=undefined;
  for(const [role,label] of groups){
   const papers=assigned.filter(([key])=>bundlePeople.get(key).get(role).has(teacher.value));
   if(!papers.length)continue;
   const section=el('section',undefined,'task-bundle-group task-bundle-group-'+role);
   section.append(el('h4',label+' · '+papers.length));
   for(const [key,entry] of papers){
    const choose=button(entry.section+' · '+entry.subject,()=>{
     selected=key;drawBundles();detail.scrollIntoView({block:'start'});
    });
    if(completed(currentProgress(key)))choose.append(doneBadge());
    choose.setAttribute('aria-pressed',String(selected===key));section.append(choose);
   }
   bundleList.append(section);
  }
  drawDetail();
 }
 function drawDetail(){
  detail.replaceChildren();
  if(!selected)return;
  const key=selected,entry=record.assignments[key],progress=currentProgress(key),stage=monitoringStage(progress);
  const view=practice?{...record,progress:practice}:record;
  const updatePractice=practice?({stage,event})=>{
   practice[key]={stage,separateMatching:true,history:[...(progress?.history||[]),event]};drawBundles();
  }:undefined;
  const info=el('section',undefined,'task-bundle-details'),roles=el('dl');
  info.append(el('h3',entry.section+' · '+entry.subject),el('p',monitoringExamLabel(entry.section)),roles);
  for(const [role,label] of MONITORING_ROLES)roles.append(el('dt',label),el('dd',entry.roles?.[role]?.name||'Assignment pending'));
  detail.append(info);
  const steps=el('section',undefined,'task-bundle-workflow'),items=el('ol');
  steps.append(el('h3','Workflow status'));
  if(completed(progress)){
   steps.append(doneBadge());
   const finalLabel=MONITORING_STEPS.at(-1).options[0][1];
   const final=progress.history.findLast(event=>event.label===finalLabel);
   if(final)steps.append(el('p',[finalLabel,final.name,final.remark].filter(Boolean).join(' · ')));
  }
  steps.append(items);
  for(const [position,step] of MONITORING_STEPS.entries()){
   const due=position===stage,done=position<stage,assigned=monitoringPeople(record,entry,position);
   const item=el('li',undefined,due?'task-bundle-due':done?'task-bundle-done':'task-bundle-pending');
   const pdfNotRecorded=step.uploadPdf&&done&&!uploadRecorded(progress);
   item.append(el('strong','Step '+(position+1)+' · '+step.label),el('span',pdfNotRecorded?'PDF status not recorded':done?'Done':due?'Action due':'Pending'));
   if(due)item.setAttribute('aria-current','step');
   if(assigned.length)item.append(el('p',assigned.map(person=>person.name).join(' / ')));
   else if(due)item.append(el('p','Assignment needed'));
   if(done&&!pdfNotRecorded)item.append(el('small',step.options[0][1]));
   if(step.uploadPdf&&progress?.signedSlip?.id){
    const link=el('a','View signed PDF','button');
    link.href='https://drive.google.com/file/d/'+encodeURIComponent(progress.signedSlip.id)+'/view';
    link.target='_blank';link.rel='noopener noreferrer';item.append(link);
    if(!practice&&stage===position+1&&assigned.some(person=>person.id===teacher.value))
     item.append(button('Replace signed PDF',()=>openStaffSlipReplacement(record,key,teacher.value)));
   }else if(pdfNotRecorded&&!practice)item.append(signedPdfUploadLink(entry.section));
   if(due&&assigned.some(person=>person.id===teacher.value))
    item.append(button(step.uploadPdf?'Scan signed marks slip':practice?'Practise status update':'Update status',
     ()=>openMonitoringStep(view,key,true,true,updatePractice,teacher.value)));
   if(due&&step.instruction)item.append(el('p',step.instruction));
   if(due&&step.samagam)item.append(el('p',SAMAGAM_REPORTING_NOTICE));
   items.append(item);
  }
  if(progress?.history?.length)steps.append(button('View history',()=>openMonitoringStep(view,key,true,false,updatePractice,teacher.value)));
  detail.append(steps);
 }
 teacher.onchange=()=>{selected=undefined;drawBundles();};
 nameSearch.oninput=()=>{
  const previous=teacher.value;
  filterNames(previous);
  if(previous!==teacher.value)teacher.onchange();
 };
 drawBundles();
}
function openMonitoringPractice(record,index){
 const actors=Object.fromEntries([...MONITORING_ROLES,['exam','Exam IC / Co-IC']].map(([id,label])=>[id,{id,name:'Practice '+label}]));
 const rowKey='row_1';
 const published={revision:1,examReviewers:[actors.exam],assignments:{
  [rowKey]:{subject:'Sample subject',section:'Sample class',roles:actors},
 }};
 let mock={published};
 function draw(){
  const progress=mock.progress?.[rowKey],stage=monitoringStage(progress),step=MONITORING_STEPS[stage];
  const card=el('section',undefined,'task-card task-monitoring'),actions=el('div',undefined,'task-actions');
  actions.append(button('Back to Task 2',()=>drawMonitoring(record,{index})),button('Reset practice',()=>{
   mock={published};draw();message('Practice reset to Evaluation.');
  }));
  card.append(el('h2','Task 2 · Mock practice'),el('p','Use the sample row to rehearse every handoff. Practice uses sample roles and requires no personal PIN.'),actions);
  const checklist=el('ol');
  MONITORING_STEPS.forEach(({label},position)=>{
   const state=position<stage?'Completed':position===stage?'Action due':'Waiting';
   const item=el('li',label+' · '+state);
   if(position===stage)item.setAttribute('aria-current','step');
   checklist.append(item);
  });
  card.append(checklist);
  if(step?.uploadPdf){
   const editor=el('form'),scan=signedSlipScan(editor,run),receipt=el('p');
   receipt.setAttribute('role','status');
   editor.append(el('button','Test scan without uploading'),receipt);card.append(editor);
   editor.onsubmit=event=>{event.preventDefault();run(async()=>{
    try{await scan.payload();}catch(error){receipt.textContent=error.message;return;}
    mock=monitoringAdvance(mock,{rowKey,publicationRevision:published.revision,expectedRevision:progress?.revision||0,outcome:'advance'},actors[step.role],Date.now());
    scan.clear();draw();message('Mock PDF prepared. No file was sent to Drive.');
   });};
  }else if(step){
   const editor=el('form'),outcome=field(editor,'Status','practice-status','select');
   options(outcome,[['','Choose status'],...step.options],'');outcome.required=true;
   const remark=field(editor,step.role==='exam'?'Final remark':'Remark','practice-remark','textarea');remark.maxLength=500;
   outcome.onchange=()=>{remark.required=step.role==='exam'||outcome.value==='return';};outcome.onchange();
   if(step.samagam)card.append(el('p',SAMAGAM_REPORTING_NOTICE,'task-monitoring-notice'));
   card.append(el('h3',actors[step.role].name),editor);
   editor.append(el('button','Save practice status'));
   editor.onsubmit=event=>{event.preventDefault();run(()=>{
    mock=monitoringAdvance(mock,{rowKey,publicationRevision:published.revision,expectedRevision:progress?.revision||0,outcome:outcome.value,remark:remark.value},actors[step.role],Date.now());
    draw();message('Practice status saved.');
   });};
  }else card.append(el('p','Practice complete. Reset practice to start again.'));
  if(progress?.history?.length){
   const history=el('details');history.append(el('summary','Practice history'));
   for(const item of progress.history)history.append(el('p',item.label+' · '+item.name+(item.remark?' · '+item.remark:'')));
   card.append(history);
  }
  host.replaceChildren(card);
 }
 draw();
}
function drawMonitoring(record,{index=0,editing=false,emergencyPeople,focusRow,searchQuery=''}={}){
 const sheets=structuredClone(emergencyPeople?record.published.sheets:record.sheets),editor=form(),scroll=el('div',undefined,'task-scroll task-monitoring-scroll');
 scroll.tabIndex=0;scroll.setAttribute('role','region');
 const scrollHint=el('p','Scroll sideways for more columns and down for more records.','task-monitoring-scroll-hint');
 const card=el('section',undefined,'task-card task-monitoring'),actions=el('div',undefined,'task-actions');
 const back=emergencyPeople?()=>drawMonitoringSettings(record,index):drawPrincipal;
 host.replaceChildren(button(emergencyPeople?'Back to workflow settings':'Back to task list',()=>{if(discard())back();}),card);
 card.append(el('h2',MONITORING_TITLE));
 const publication=record.published?.updatedAt;
 if(emergencyPeople)card.append(el('h3','Emergency assignment'),el('p','Choose a substitute in the workflow cell and save it there. Saved changes apply immediately to the published plan.'));
 else card.append(el('p',publication?'Published copy available to staff.':'Private draft'));
 const tabs=MONITORING_SHEETS.map(({name},position)=>button(name,()=>drawSheet(position)));
 actions.append(...tabs);
 const markDirty=()=>{editor.dataset.portalDirty='true';};
 async function update(operation){
  const {monitoring}=await request({action:'task-principal',operation,expectedRevision:record.revision,...(operation==='monitoring-save'?{sheets}:{})},true);
  store.monitoringUpdatedAt=monitoring.updatedAt;
  editor.dataset.portalDirty='false';
  drawMonitoring(monitoring,{index});
  message({'monitoring-save':'Draft saved.','monitoring-publish':'Plan published to staff.','monitoring-unpublish':'Publication stopped.'}[operation]);
 }
 if(editing){
  actions.append(button('Add row',()=>{
   const sheet=sheets[index],length=sheet.length;
   if(length>=MONITORING_LIMITS.rows)throw Error('This sheet has reached its row limit.');
   sheet.push(Array(sheet[0].length).fill(''));
   if(index===0){
    const range=new RegExp("('Evaluation Plan'!\\$?[A-L]\\$?\\d+:\\$?[A-L]\\$?)"+length+"(?=[,)])",'gi');
    for(const row of sheets[1])for(let c=0;c<row.length;c++)if(row[c].startsWith('='))row[c]=row[c].replace(range,(_,prefix)=>prefix+(length+1));
   }
   markDirty();drawSheet(index);scroll.querySelector('tbody tr:last-child [contenteditable]')?.focus();
  }),button('Add column',()=>{
   const sheet=sheets[index],width=sheet[0].length;
   if(width>=MONITORING_LIMITS.columns)throw Error('This sheet has reached its column limit.');
   sheet.forEach(row=>row.push(''));
   const headingCell=String.fromCharCode(65+width)+(index===0?5:8);
   markDirty();drawSheet(index);scroll.querySelector('[aria-label="'+headingCell+'"]')?.focus();
  }),el('button','Save draft'),button('Cancel edits',()=>{if(discard())drawMonitoring(record,{index});}));
 }else if(!emergencyPeople){
  actions.append(button('Edit cells',()=>drawMonitoring(record,{index,editing:true})),
   button('Workflow settings',()=>drawMonitoringSettings(record,index)),
   button('Mock practice',()=>openMonitoringPractice(record,index)),
   button(publication?'Update published plan':'Publish plan',async()=>{
    if(confirm('Publish this saved plan for staff with viewing access?'))await update('monitoring-publish');
   }));
  if(publication)actions.append(button('Task status report / PDF',async()=>{
   const {monitoring}=await request({action:'task-principal',operation:'monitoring-read'},true);
   openTaskStatusReport(monitoring);
  }));
  if(publication)actions.append(button('Stop publication',async()=>{
   if(confirm('Remove the published Task 2 plan from Staff View?'))await update('monitoring-unpublish');
  }));
 }
 const pendingSubstitutes=new Map();
 const searchPanel=el('div',undefined,'task-plan-search');
 const search=field(searchPanel,'Find a teacher, evaluator, subject or class','monitoring-search','search',searchQuery);
 const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase()
  .replace(/\b(10|11|12|x|xi|xii)(?:\s*[-–—]\s*|\s+)([a-e])\b/g,(_,standard,section)=>({x:'10',xi:'11',xii:'12'}[standard]||standard)+section)
  .replace(/\b(?:mr|mrs|ms|dr|shri|smt)\b/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const noMatch=el('p','No evaluation rows match your search.','task-plan-no-match');
 noMatch.hidden=true;
 function filterRows(){
  const terms=normalize(search.value).split(/\s+/).filter(Boolean);
  const rows=[...scroll.querySelectorAll('[data-monitoring-row]')];
  for(const row of rows){
   row.hidden=!terms.every(term=>row.dataset.monitoringSearch.includes(term));
  }
  noMatch.hidden=!rows.length||rows.some(row=>!row.hidden);
 }
 search.oninput=filterRows;
 function addEmergencyControl(cell,key,position,entry,step){
  const id=key+':'+position,current=entry.substitutes?.['step_'+position]?.id||'';
  const select=el('select',undefined,'task-emergency-select');
  select.setAttribute('aria-label','Emergency substitute for row '+key.slice(4)+' · '+step.label);
  const choices=[['','Use original assignment'],...emergencyPeople];
  const chosen=pendingSubstitutes.get(id)??current;
  const loadOptions=()=>{if(select.options.length===1)options(select,choices,select.value);};
  options(select,[choices.find(([value])=>value===chosen)||[chosen,entry.substitutes?.['step_'+position]?.name||'Unavailable substitute']],chosen);
  select.addEventListener('focus',loadOptions);select.addEventListener('pointerdown',loadOptions);
  const save=button('Save emergency assignment',async()=>{
   const {monitoring}=await request({action:'task-principal',operation:'monitoring-emergency',expectedRevision:record.revision,staffId:pendingSubstitutes.get(id),rowKey:key,stage:position},true);
   record=monitoring;store.monitoringUpdatedAt=monitoring.updatedAt;
   pendingSubstitutes.delete(id);editor.dataset.portalDirty=String(pendingSubstitutes.size>0);
   redrawSheet();message('Emergency assignment updated in the published plan.');
  });
  save.hidden=!pendingSubstitutes.has(id);
  select.onchange=()=>{
   if(select.value===current)pendingSubstitutes.delete(id);else pendingSubstitutes.set(id,select.value);
   save.hidden=!pendingSubstitutes.has(id);editor.dataset.portalDirty=String(pendingSubstitutes.size>0);
  };
  cell.append(select,save);
 }
 function addSlipActions(cell,key,entry,progress,stage,workflow){
  if(!progress?.signedSlip?.id)return;
  const link=el('a','View signed PDF','button');
  link.href='https://drive.google.com/file/d/'+encodeURIComponent(progress.signedSlip.id)+'/view';link.target='_blank';link.rel='noopener noreferrer';cell.append(link);
  if(MONITORING_STEPS[stage-1]?.uploadPdf)cell.append(button('Reopen signed PDF upload',async()=>{
   if(!confirm('Reopen the signed PDF upload for '+entry.section+' · '+entry.subject+'? The current file will stay in Drive.'))return;
   const {monitoring}=await request({action:'task-principal',operation:'monitoring-reopen-upload',
    rowKey:key,publicationRevision:workflow.revision,expectedRevision:progress.revision},true);
   drawMonitoring(monitoring,{index,focusRow:key,searchQuery:search.value});
   message('Signed PDF upload is Action due again.');
  }));
 }
 function drawSheet(position){
  index=position;
  tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));
  const sheet=sheets[index],table=el('table',undefined,'task-monitoring-sheet');
  table.setAttribute('aria-label',MONITORING_SHEETS[index].name);
  scroll.setAttribute('aria-label',MONITORING_SHEETS[index].name+' scroll area');
  const body=table.createTBody(),restore=[];
  const readable=!editing;
  table.classList.toggle('task-sheet-cards',readable);
  if(readable){table.setAttribute('role','table');body.setAttribute('role','rowgroup');}
  scroll.classList.toggle('task-sheet-card-scroll',readable);
  scrollHint.classList.toggle('task-sheet-card-hint',readable);
  searchPanel.hidden=!readable||index!==0;
  const display=value=>value.startsWith('=')?monitoringFormula(value,sheets,index):value;
  const width=sheet[0].length;
  const columnOrder=Array.from({length:width},(_,column)=>column);
  const workflow=!editing&&index===0&&record.published;
  const compact=workflow&&!emergencyPeople;
  if(compact){columnOrder.splice(7);table.classList.add('task-monitoring-compact');}
  else if(index===0&&!editing)columnOrder.splice(6,2,7,6);
  if(workflow)table.classList.add('task-monitoring-workflow');
  if(editing){
   const heading=table.createTHead().insertRow();heading.append(el('th','#'));
   for(let c=0;c<width;c++)heading.append(el('th',String.fromCharCode(65+c)));
  }
  sheet.forEach((values,r)=>{
   const spacer=index===0?r===3:[2,5,6].includes(r);
   if(!values.some(Boolean)&&(!editing||spacer))return;
   if(!editing&&(index===0?r<3:r<2)&&values[0]&&values.slice(1).every(value=>!value)){
    table.createCaption().append(el('p',values[0].replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z\b/g,stamp=>rollTimestamp(Date.parse(stamp)))));return;
   }
   const header=index===0?r===4:r===3||r===7;
   const row=!editing&&index===0&&header?table.createTHead().insertRow():body.insertRow();
   const entry=workflow&&r>4?workflow.assignments?.['row_'+values[0]]:null;
   const progress=entry?record.progress?.['row_'+values[0]]:null;
   const key='row_'+values[0];
   if(readable){
    row.setAttribute('role','row');
    if(header)row.classList.add('task-sheet-heading');
    else if(index===0&&r>4){
     row.dataset.monitoringRow=key;
     const people=[...Object.values(entry?.roles||{}),...Object.values(entry?.substitutes||{}),...(workflow?.examReviewers||[])];
     const names=[...values,...people.map(person=>person.name)];
     if(names.some(name=>isAvinashGuestProfile({name})))names.push('Avinash Singh','Avinash Bibek');
     row.dataset.monitoringSearch=names.map(value=>{
      const normalized=normalize(value);return normalized+' '+normalized.replaceAll(' ','');
     }).join(' ');
    }
   }
   if(editing)row.append(el('th',String(r+1)));
   columnOrder.forEach(c=>{
    const value=values[c];
    const isExamDate=index===0&&r>4&&c===3;
    const cellText=()=>isExamDate&&/^\d{4}-\d{2}-\d{2}$/.test(monitoringExamDateKey(values[c]))?rollDateText(monitoringExamDateKey(values[c])):display(values[c]);
    const cell=el(!editing&&header?'th':'td');row.append(cell);
    if(!editing)cell.setAttribute('role',header?'columnheader':'cell');
    if(header&&!editing)cell.scope='col';
    if(index===0)cell.dataset.planColumn=String(c);
    if(!editing){
     if(!header){
      const labels=index===0?sheet[4]:sheet[r<7?3:7];
      cell.dataset.columnLabel=c===6&&index===0?'Samagam entry and matching':labels?.[c]||'';
     }
     if(entry&&c===7){cell.textContent=monitoringStage(progress)>2?'Discussed with Principal and updated':'Pending Principal review';return;}
     if(index===0&&header&&c===6){cell.textContent='Samagam entry and matching / Core team member';return;}
     const assignedRole=entry&&MONITORING_ROLES[c-4]?.[0];
     cell.textContent=assignedRole?(entry.roles?.[assignedRole]?.name||value||'Unassigned'):cellText();
     return;
    }
    const input=el('div',String(cellText()),'task-monitoring-cell');
    input.contentEditable='plaintext-only';input.setAttribute('role','textbox');
    input.setAttribute('aria-label',String.fromCharCode(65+c)+(r+1));
    input.onfocus=()=>{input.textContent=isExamDate?cellText():values[c];};
    input.oninput=()=>{
     const next=input.innerText.slice(0,500);
     if(input.innerText.length>500)input.textContent=next;
     values[c]=isExamDate?monitoringExamDateKey(next):next;markDirty();
    };
    input.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();input.blur();}};
    input.onblur=()=>{restore.forEach(refresh=>refresh());};
    restore.push(()=>{if(document.activeElement!==input)input.textContent=cellText();});
    cell.append(input);
   });
   if(compact&&r>=4){
    const label='Pending steps / status';
    if(header){
     const cell=el('th',label);cell.scope='col';row.append(cell);return;
    }
    const cell=row.insertCell();cell.className='task-pending-status';cell.dataset.columnLabel=label;
    if(!entry){cell.append(el('span','Awaiting workflow publication'));return;}
    const stage=monitoringStage(progress),pending=el('ul');
    for(const [position,step] of MONITORING_STEPS.entries()){
     const missingPdf=step.uploadPdf&&position<stage&&!progress?.history?.some(item=>item.label===step.options[0][1]);
     if(position<stage&&!missingPdf)continue;
     const item=el('li','Step '+(position+1)+' · '+step.label+(missingPdf?' · PDF status not recorded':''));
     if(position===stage){
      item.className='task-pending-current';
      const names=monitoringPeople(workflow,entry,position).map(person=>person.name).join(' / ');
      item.append(el('strong',names?'Action due · '+names:'Assignment needed'));
      if(step.instruction)item.append(el('span',step.instruction));
     }
     pending.append(item);
    }
    if(pending.childElementCount)cell.append(pending);
    else cell.append(el('strong','✓ Done','task-bundle-complete'));
    addSlipActions(cell,key,entry,progress,stage,workflow);
    if(progress?.history?.length)cell.append(button('View history',()=>openMonitoringStep(record,key,false,false)));
    return;
   }
   if(workflow&&r>=4){
    const handover=MONITORING_STEPS.length-2;
    const finalColumn='Samagam slip submitted and Exam IC final report';
    if(r===4){
     for(const [position,{label,review}] of [...MONITORING_STEPS.slice(0,handover),{label:finalColumn}].entries()){
      const heading=el('th',position<handover?'Step '+(position+1)+' · '+label:label,'task-workflow-step');
      if(review)heading.classList.add('task-principal-review');
      heading.setAttribute('role','columnheader');heading.scope='col';row.append(heading);
     }
     return;
    }
    const stage=monitoringStage(progress);
    let finalCell;
    MONITORING_STEPS.forEach((step,position)=>{
     const combined=position>=handover;
     if(position===handover){
      finalCell=row.insertCell();finalCell.className='task-workflow-step task-workflow-final';finalCell.setAttribute('role','cell');
      finalCell.dataset.columnLabel=finalColumn;
     }
     const cell=combined?el('div',undefined,'task-workflow-substep'):row.insertCell();
     if(combined){
      finalCell.append(cell);
      cell.append(el('strong','Step '+(position+1)+' · '+step.label,'task-workflow-substep-label'));
     }else{
      cell.className='task-workflow-step';cell.setAttribute('role','cell');cell.dataset.columnLabel='Step '+(position+1)+' · '+step.label;
     }
     if(step.review)cell.classList.add('task-principal-review');
     if(!entry){cell.append(el('span','Awaiting workflow publication'));return;}
     const assigned=monitoringPeople(workflow,entry,position).map(({name})=>name).join(' / ');
     const listedMatching=step.samagam&&!assigned?values[6]?.trim():'';
     const current=position===stage,complete=position<stage;
     if(position===Math.min(stage,MONITORING_STEPS.length-1))(combined?finalCell:cell).classList.add('task-plan-current');
     const pdfNotRecorded=step.uploadPdf&&complete&&!progress?.history?.some(item=>item.label===step.options[0][1]);
     const state=pdfNotRecorded?'PDF status not recorded':complete?'Done':current?(assigned?'Action due':'Assignment needed'):'Pending';
     cell.append(el('strong',state,'task-workflow-state'+(current?' is-current':complete?' is-complete':'')));
     if(assigned)cell.append(el('span',assigned));
     else if(listedMatching)cell.append(el('span',listedMatching+' · PIN assignment pending'));
     else if(step.samagam)cell.append(el('span','Matching IC assignment pending'));
     if(entry.substitutes?.['step_'+position]&&!complete)cell.append(el('span','Emergency substitute'));
     if(complete&&!pdfNotRecorded){
      const label=step.options[0][1];
      const previous=step.samagam&&progress?.history?.findLast(item=>[label,'Matched Samagam marks with the mark slip'].includes(item.label));
      cell.append(el('span',previous?.label||label));
     }
     if(step.uploadPdf)addSlipActions(cell,key,entry,progress,stage,workflow);
     const latest=progress?.history?.at(-1)?.label;
     if(current&&latest&&MONITORING_STEPS.some(stage=>stage.options.some(([value,label])=>value==='return'&&label===latest)))
      cell.append(el('span',latest));
     if(emergencyPeople&&step.role!=='exam')addEmergencyControl(cell,key,position,entry,step);
     if(position===Math.min(stage,MONITORING_STEPS.length-1)&&progress?.history?.length)
      cell.append(button('View history',()=>openMonitoringStep(record,key,false,false)));
    });
   }

  });
  scroll.replaceChildren(table);filterRows();
 }
 function redrawSheet(){
  const {scrollTop,scrollLeft}=scroll;
  drawSheet(index);scroll.scrollTop=scrollTop;scroll.scrollLeft=scrollLeft;
 }
 drawSheet(index);
 editor.append(actions,noMatch,scrollHint,scroll);
 editor.onsubmit=event=>{event.preventDefault();if(editing)run(()=>update('monitoring-save'));};
 card.append(searchPanel,editor);
 if(focusRow){
  const target=[...scroll.querySelectorAll('[data-monitoring-row]')].find(row=>row.dataset.monitoringRow===focusRow);
  target?.scrollIntoView({block:'nearest',inline:'nearest'});
 }
}
async function openDailyPending(){
 const dashboard=el('section',undefined,'task-card'),actions=el('div',undefined,'task-actions'),date=el('p');
 const driveStatus=el('div');driveStatus.setAttribute('role','status');
 actions.append(button('Back to task list',drawPrincipal),button('Refresh pending list',openDailyPending),
  button('Check Drive connection',async()=>{
   driveStatus.textContent='Checking both Drive folders…';
   try{
    const {folders}=await request({action:'task-principal',operation:'monitoring-drive-check'},true);
    driveStatus.replaceChildren(...folders.map(({exam,ready})=>el('p',exam+' · '+(ready?'Upload access confirmed':'Upload access unavailable. Check folder permissions.'))));
   }catch(error){driveStatus.replaceChildren(el('p',error.message,'task-error'));}
  }));
 dashboard.append(el('h2','Principal’s daily pending list'),date,actions,driveStatus);
 const results=el('div');dashboard.append(results);host.replaceChildren(dashboard);
 const [roll,pb1,xi,workflow]=await Promise.allSettled([
  request({action:'roll-call-principal',rollOperation:'read'},true),
  request({action:'task-principal',operation:'pb1-read'},true),
  request({action:'task-principal',operation:'pb1-read',exam:'half-yearly'},true),
  request({action:'task-principal',operation:'monitoring-read'},true),
 ]);
 const list=(parent,label,items)=>{
  if(!items.length){parent.append(el('p',label+' · 0'));return;}
  const details=el('details'),entries=el('ul');
  details.append(el('summary',label+' · '+items.length),entries);
  for(const item of items){const row=el('li');row.append(item);entries.append(row);}
  parent.append(details);
 };
 const section=title=>{const block=el('section',undefined,'task-card');block.append(el('h3',title));results.append(block);return block;};
 const failure=(block,result)=>block.append(el('p',result.reason.message,'task-error'));
 const attendance=section('Morning Roll Call');
 const chamber=el('a','Open Principal Chamber','button');chamber.href='index.html#principal-chamber';attendance.append(chamber);
 if(roll.status==='fulfilled'){
  const data=roll.value;
  date.textContent=rollDateText(data.serverDate)+' · IST';
  for(const [wing,label] of [['primary','Primary wing'],['secondary','Secondary wing']]){
   const staff=rollStaffStatus(data,wing);
   list(attendance,label+' · not submitted',staff.filter(person=>person.id&&!person.morning&&!person.morningExcused).map(person=>person.name));
   list(attendance,label+' · profile setup pending',staff.filter(person=>person.unlinked).map(person=>person.name));
  }
 }else failure(attendance,roll);
 for(const [result,exam,examId] of [[pb1,PB1_ANALYSER,undefined],[xi,HALF_YEARLY_ANALYSER,'half-yearly']]){
  const block=section(exam.short+' · '+exam.classes);
  block.append(button('Open analyser',()=>openPB1Analyser(false,examId)));
  if(result.status==='rejected'){failure(block,result);continue;}
  const {scopes,rows}=result.value,counts=scopes.map(()=>({enrolled:0,pending:0}));
  for(const row of rows){counts[row.scope].enrolled++;if(!row.current)counts[row.scope].pending++;}
  if(!scopes.length){block.append(el('p','No papers are available.'));continue;}
  const label=paper=>'Class '+paper.classId+' '+paper.section+' · '+paper.subject+(paper.teacher?' · '+paper.teacher:'');
  const review=(paper,suffix='')=>button(label(paper)+suffix,()=>openPB1Analyser(true,examId,paper));
  list(block,'Papers with marks pending',scopes.flatMap((paper,index)=>counts[index].pending?[review(paper,' · '+counts[index].pending+' pending')]:[]));
  list(block,'Papers awaiting freeze',scopes.flatMap((paper,index)=>!paper.approvedAt&&counts[index].enrolled&&!counts[index].pending?[review(paper)]:[]));
 }
 const task=section('Task 2 · Pre-Samagam');
 task.append(button('Open Task 2',openMonitoring));
 if(workflow.status==='rejected'){failure(task,workflow);return;}
 const {monitoring}=workflow.value,published=monitoring.published;
 if(!published){task.append(el('p','Task 2 has no published workflow.'));return;}
 const due=monitoringBundlesByExamDate(published).map(bundle=>({...bundle,stage:monitoringStage(monitoring.progress?.[bundle.key])}));
 for(const step of MONITORING_STEPS.filter(item=>item.uploadPdf||item.samagam)){
  list(task,step.uploadPdf?'Awaiting signed slip':'Awaiting Samagam upload and matching',due
   .filter(({stage})=>MONITORING_STEPS[stage]===step)
   .map(({key,paper,date,stage})=>button((date?rollDateText(date)+' · ':'')+paper.section+' · '+paper.subject+' · '+(monitoringPeople(published,paper,stage).map(person=>person.name).join(' / ')||'Assignment needed'),()=>drawMonitoring(monitoring,{focusRow:key}))));
 }
}

function drawPrincipal(){if(suppliedFigures&&Object.hasOwn(store.tasks||{},suppliedFigures.taskId)){const task=store.tasks[suppliedFigures.taskId];task.draft.headers={...task.draft.headers,...suppliedFigures.headers};task.summary=taskSummary(task);}host.replaceChildren(el('h2','Create and manage tasks'));host.append(el('p','1. Create task → 2. Select classes → 3. Assign teachers → 4. Prepare shared questions → 5. Save and publish → 6. Track submissions.','task-flow-guide'));
 if(suppliedFigures){const banner=el('p',Object.keys(suppliedFigures.headers).length+(Object.hasOwn(store.tasks||{},suppliedFigures.taskId)?' supplied class rows are loaded into the shared draft. Review the figures, assign teachers, then Save and publish task.':' supplied class rows are ready. Create the Task 1 draft to load them.'),'task-import-ready');host.append(banner);}if(suppliedFiguresError)host.append(el('p',suppliedFiguresError,'task-error'));
 const actions=el('div',undefined,'task-actions');actions.append(button('Create Task 1 unpublished draft',async()=>{if(!discard())return;await admin({operation:'create-task1'});openPrincipalTask('task1',store.tasks.task1);message('Task 1 is an unpublished draft unless it was previously published. Existing content is preserved.');}),button('Create another task',()=>{if(!discard())return;newTask();}),button('Refresh tasks',async()=>{if(!discard())return;await admin({operation:'read'});drawPrincipal();}));actions.firstElementChild.hidden=!!store.tasks?.task1;actions.prepend(button('Daily pending list',openDailyPending));host.append(actions);catalogue(host);drawAnalyserCards();}
let excelLoading;
async function taskExcel(){if(globalThis.ExcelJS&&globalThis.JSZip)return {ExcelJS:globalThis.ExcelJS,JSZip:globalThis.JSZip};excelLoading||=Promise.all([['ExcelJS','vendor/exceljs/exceljs.min.js'],['JSZip','vendor/mcq/jszip.min.js']].map(([name,src])=>globalThis[name]?Promise.resolve():new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{excelLoading=null;reject(Error('Excel reader could not load. Retry the import.'));};document.head.append(script);}))).then(()=>({ExcelJS:globalThis.ExcelJS,JSZip:globalThis.JSZip}));return excelLoading;}
function fixedClassQuestions(parent,headers={}){parent.replaceChildren();let number=0;for(const [key,label]of Object.entries(TASK_HEADERS)){const item=el('div',undefined,'task-fixed-question');item.dataset.fixedQuestion=key;item.append(el('small','Q'+(++number)+' · View only'),el('span',label),el('strong',String(headers[key]??'Unprovided'),headers[key]==null?'task-header-missing':undefined));parent.append(item);}}
function configuration(parent,draft,{saveImport}={}){
 const f=form(),title=field(f,'Task title','title','text',draft.title),priority=field(f,'Priority','priority','select'),deadline=field(f,'Deadline (leave blank if not provided)','deadline','date',draft.deadline),visibility=field(f,'Instruction visibility','visibility','select'),instructions=field(f,'Task instructions (no student identifiers)','instructions','textarea',draft.instructions);title.required=true;title.maxLength=240;instructions.maxLength=3000;options(priority,TASK_PRIORITIES.map(p=>[p,p]),draft.priority);options(visibility,[['all','All staff'],['concerned','Concerned staff only, after personal PIN verification']],draft.visibility);
 const selected=new Set(taskClasses(draft)),scope=el('section',undefined,'task-class-selection'),scopeNote=el('strong',undefined,'task-scope-note');scope.append(el('h3','Applies to selected classes'),el('p','Prepare one shared task and questionnaire here. Save and publish once for every selected class. Only Q1–Q3 figures and the assigned teacher differ by class. Unselecting a class hides its form after publication; existing reports are retained.'),scopeNote);
 const choices=el('div',undefined,'task-class-choices'),checks={};for(const c of TASK_AVAILABLE_CLASSES){const label=el('label',c),check=el('input');check.type='checkbox';check.name='selected-class';check.value=c;check.checked=selected.has(c);check.setAttribute('aria-label','Apply task to '+c);label.prepend(check);choices.append(label);checks[c]=check;}
 const choose=classes=>{selected.clear();classes.forEach(c=>selected.add(c));for(const [c,check]of Object.entries(checks))check.checked=selected.has(c);f.dataset.portalDirty='true';updateScope();};scope.append(el('p','Primary targets I–V are whole-class groups. No section or class-teacher assignment is assumed; select the concerned teacher below.'),button('Select IX–XII classes',()=>choose(TASK_CLASSES)),button('Select all VI–XII classes',()=>choose(TASK_AVAILABLE_CLASSES.filter(c=>!TASK_PRIMARY_CLASSES.includes(c)))),button('Select Primary classes I–V',()=>choose(TASK_PRIMARY_CLASSES)),button('Clear class selection',()=>choose([])),choices);f.append(scope);
 f.append(el('h3','Shared survey questions'),el('p','Add, edit or delete this questionnaire once for all selected classes. There is no separate questionnaire to edit for IX A or another class. Q1–Q3 are fixed class figures; fillable questions start at Q4. Earlier submitted answers are preserved.'));
 const fixedSection=el('section',undefined,'task-fixed-editor'),fixedValues=el('div',undefined,'task-readonly-figures');const directImport=el('button',saveImport?'Import and save class figures':'Import class figures');directImport.type='button';directImport.onclick=()=>importFile.click();fixedSection.append(el('h4','Q1–Q3 · Class-wise figures · View only'),el('p','Import the supplied CSV or Excel file once. Figures are applied across the class rows; questions below remain shared.'),directImport,fixedValues);f.append(fixedSection);
 const questionList=el('div',undefined,'task-question-list'),questionRows=[];
 const renumberQuestions=()=>questionRows.forEach((q,index)=>{const name='Question '+(index+4);q.label.parentElement.firstChild.textContent=name;q.label.setAttribute('aria-label',name);q.remove.setAttribute('aria-label','Delete '+name);});
 const addQuestion=q=>{const number=questionRows.length+4,row=el('section',undefined,'task-question-editor'),label=field(row,'Question '+number,'question-label-'+q.id,'textarea',taskQuestionWording(q.label));label.required=true;label.maxLength=600;const remove=button('Delete question',()=>{if(questionRows.length===1)throw Error('Keep at least one fillable question.');if(!confirm('Delete this question from the shared task draft for all selected classes? Earlier submitted answers will be preserved.'))return;questionRows.splice(questionRows.findIndex(item=>item.id===q.id),1);row.remove();renumberQuestions();f.dataset.portalDirty='true';message('Question removed from the shared draft. Save and Publish once for all selected classes.');});remove.setAttribute('aria-label','Delete Question '+number);questionRows.push({id:q.id,label,kind:q.kind,remove});const format=el('p',undefined,'task-answer-format');const showFormat=()=>{format.textContent=taskQuestionIsWritten({id:q.id,label:label.value,kind:q.kind})?'Answer: written remarks / observations (50–100 words)':'Answer: manual number entry';};label.addEventListener('input',showFormat);showFormat();row.append(format,remove);questionList.append(row);return row;};
 taskQuestions(draft).forEach(addQuestion);f.append(questionList,button('Add survey question',()=>{if(questionRows.length>=60)throw Error('A survey supports up to 60 questions.');const row=addQuestion({id:'q_'+crypto.randomUUID().replaceAll('-',''),label:'',kind:'students'});f.dataset.portalDirty='true';row.scrollIntoView({block:'center',behavior:'smooth'});row.querySelector('textarea').focus();}));
 const finalComment=el('section',undefined,'task-final-comment');finalComment.append(el('h4','Final comment · text response'));const commentPreview=field(finalComment,OVERALL_COMMENT_LABEL,'overall-comment-preview','textarea');commentPreview.disabled=true;commentPreview.placeholder='The assigned CT / Prime mentor / Survey IC writes their overall class assessment here.';finalComment.append(el('p','Appears after the shared questions in every selected class form.'));f.append(finalComment);
 const assignments=el('section',undefined,'task-assignment-section');assignments.append(el('h3','Assign teachers and class figures'),el('p','Assign a teacher and supply Q1–Q3 separately for each selected class. The single questionnaire below applies to every selected class. Assigned teachers use their existing PIN to open and submit. Import the supplied CSV or Excel file to fill all figures together.'));
 const download=el('a','Download class figures CSV template','button');download.href='Task_Class_Figures_Template.csv';download.download='Task_Class_Figures_Template.csv';download.onclick=()=>{const url=URL.createObjectURL(new Blob([taskFiguresTemplate(TASK_AVAILABLE_CLASSES.filter(c=>selected.has(c)))],{type:'text/csv;charset=utf-8'}));download.href=url;setTimeout(()=>URL.revokeObjectURL(url),2000);};assignments.append(download);
 const importFile=field(assignments,saveImport?'Import class figures and save shared draft (CSV, Excel or JSON)':'Import class figures CSV, Excel or JSON','header-import','file');importFile.accept='.csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json';const scroll=el('div',undefined,'task-scroll'),table=el('table'),head=el('tr');for(const label of ['Class','Assigned teacher',...Object.values(TASK_HEADERS)])head.append(el('th',label));table.append(head);scroll.append(table);assignments.append(scroll);scope.after(assignments);const rows={};
 for(const c of TASK_AVAILABLE_CLASSES){const row=el('tr');row.dataset.assignmentClass=c;row.append(el('th',c));const td=el('td'),select=field(td,'Teacher for '+c,'teacher-'+c,'select');options(select,[['','Unassigned'],...Object.entries(staff).map(([id,p])=>[id,p.name])],draft.assignments?.[c]||'');row.append(td);const counts={};for(const [k,label]of Object.entries(TASK_HEADERS)){const cell=el('td'),input=field(cell,label+' · '+c,k+'-'+c,'number',draft.headers?.[c]?.[k]??'');input.min='0';input.step='1';input.placeholder='Unprovided';counts[k]=input;row.append(cell);}rows[c]={select,counts,row};table.append(row);}
 const headers=()=>Object.fromEntries(TASK_AVAILABLE_CLASSES.map(c=>[c,Object.fromEntries(Object.entries(rows[c].counts).map(([k,input])=>[k,input.value===''?null:Number(input.value)]))]));
 const updateFixed=()=>{const values=headers(),wrap=el('div',undefined,'task-scroll'),table=el('table'),head=el('tr');head.append(el('th','Class'));let n=0;for(const [key,label]of Object.entries(TASK_HEADERS)){const th=el('th','Q'+(++n)+'. '+label);th.dataset.fixedQuestion=key;head.append(th);}table.append(head);for(const c of TASK_AVAILABLE_CLASSES.filter(c=>selected.has(c))){const row=el('tr');row.dataset.figureClass=c;row.append(el('th',c));for(const key of Object.keys(TASK_HEADERS)){const td=el('td',String(values[c][key]??'Unprovided'));td.dataset.figureField=key;row.append(td);}table.append(row);}wrap.append(table);fixedValues.replaceChildren(wrap);};
 const updateScope=()=>{scopeNote.textContent='One shared questionnaire · '+selected.size+' selected classes';for(const c of TASK_AVAILABLE_CLASSES)rows[c].row.hidden=!selected.has(c);updateFixed();};for(const [c,check]of Object.entries(checks))check.onchange=()=>{if(check.checked)selected.add(c);else selected.delete(c);f.dataset.portalDirty='true';updateScope();};for(const row of Object.values(rows))for(const input of Object.values(row.counts))input.addEventListener('input',updateFixed);updateScope();
 const value=()=>{if(!selected.size)throw Error('Select at least one class for this task.');return {title:title.value,priority:priority.value,deadline:deadline.value,visibility:visibility.value,instructions:instructions.value,questions:questionRows.map(q=>({id:q.id,label:q.label.value,kind:q.kind})),selectedClasses:TASK_AVAILABLE_CLASSES.filter(c=>selected.has(c)),assignments:Object.fromEntries(TASK_AVAILABLE_CLASSES.filter(c=>rows[c].select.value).map(c=>[c,rows[c].select.value])),headers:headers()};};
 importFile.onchange=()=>run(async()=>{const file=importFile.files[0];if(!file)return;const isWorkbook=file.name.toLowerCase().endsWith('.xlsx');if(file.size>(isWorkbook?2000000:64000))throw Error('Class figures file is too large.');let values,assignments={};const content=isWorkbook?'':await file.text();if(isWorkbook){const reader=await taskExcel();const imported=await importTaskStrengthWorkbook(await file.arrayBuffer(),reader.ExcelJS,reader.JSZip,{classes:TASK_AVAILABLE_CLASSES,requiredClasses:[...selected]});values=imported.headers;}else if(file.name.toLowerCase().endsWith('.csv')){const imported=importTaskFiguresCSV(content,staff);values=imported.headers;assignments=imported.assignments;}else{const parsed=JSON.parse(content);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.keys(parsed).some(c=>!TASK_AVAILABLE_CLASSES.includes(c)))throw Error('Use valid class names, including XI E.');values=Object.fromEntries(Object.entries(parsed).map(([c,v])=>{if(Object.keys(v||{}).some(k=>!Object.hasOwn(TASK_HEADERS,k)))throw Error('Only total, catV and st are accepted.');return [c,taskHeader(v)];}));}for(const [c,h]of Object.entries(values))for(const k of Object.keys(TASK_HEADERS))rows[c].counts[k].value=h[k]??'';for(const [c,id]of Object.entries(assignments))rows[c].select.value=id;updateFixed();f.dataset.portalDirty='true';if(saveImport){await saveImport(value());f.dataset.portalDirty='false';}else message('Figures imported into the form. Save the shared draft when ready.');});
 parent.append(f);return {form:f,value};
}
function newTask(){const card=el('section',undefined,'task-card');host.prepend(card);card.append(el('h2','New private draft'));const editor=configuration(card,{title:'',priority:TASK_PRIORITIES[0],deadline:'',visibility:'concerned',assignments:{},headers:store.classFigures||{},instructions:'Aggregate counts only. No student identifiers.'});editor.form.append(el('button','Create unpublished draft'));editor.form.onsubmit=e=>{e.preventDefault();run(async()=>{const result=await admin({operation:'create',draft:editor.value()});editor.form.dataset.portalDirty='false';openPrincipalTask(result.taskId,store.tasks[result.taskId]);message('Unpublished draft created.');});};}
function drawAdminTask(card,id,t){
 card.replaceChildren(el('h2',t.draft.title),el('p',t.published?'Published instructions active. Draft edits require Publish.':'Unpublished — private to Principal'));if(t.principalExamOnly)card.append(el('p','Passed students are entered only by the Principal. Failed entry has been removed. Open each submitted class report and choose Edit submitted answers. Passed values you save are retained; earlier Failed values remain in edit history.','task-exam-entry-note'));
 const details=el('details',undefined,'task-editor');details.open=true;details.append(el('summary','Edit task, survey questions and teacher assignments'));card.append(details);const editor=configuration(details,t.draft,{saveImport:async draft=>{if([...card.querySelectorAll('form[data-portal-dirty="true"]')].some(f=>f!==editor.form)&&!confirm('Discard the unsaved Principal comment before importing?'))throw Error('Import save cancelled. Imported figures remain in the editor.');await admin({operation:'save',taskId:id,expectedRevision:t.revision,draft,rememberFigures:true});clearSuppliedFigures(id);drawAdminTask(card,id,store.tasks[id]);card.querySelector('details.task-editor').open=true;card.querySelector('.task-fixed-editor').scrollIntoView({block:'start',behavior:'smooth'});message('Class figures saved for '+draft.selectedClasses.length+' selected classes in one shared draft. Publish once to apply.');}});if(suppliedFigures?.taskId===id)editor.form.dataset.portalDirty='true';editor.form.append(el('button','Save private draft'));editor.form.onsubmit=e=>{e.preventDefault();if([...card.querySelectorAll('form[data-portal-dirty="true"]')].some(f=>f!==editor.form)&&!confirm('Discard the unsaved Principal comment?'))return;run(async()=>{await admin({operation:'save',taskId:id,expectedRevision:t.revision,draft:editor.value(),rememberFigures:suppliedFigures?.taskId===id});clearSuppliedFigures(id);editor.form.dataset.portalDirty='false';drawAdminTask(card,id,store.tasks[id]);card.querySelector('details.task-editor').open=true;message('Private draft saved. Publish when ready.');});};
 const actions=el('div',undefined,'task-actions task-publish-actions'),publish=button('Save and publish task',async()=>{if([...card.querySelectorAll('form[data-portal-dirty="true"]')].some(f=>f!==editor.form)&&!confirm('Discard the unsaved Principal comment?'))return;const saved=await admin({operation:'save',taskId:id,expectedRevision:t.revision,draft:editor.value(),rememberFigures:suppliedFigures?.taskId===id});clearSuppliedFigures(id);t.revision=saved.tasks[id].revision;editor.form.dataset.portalDirty='false';await admin({operation:'publish',taskId:id,expectedRevision:t.revision});drawAdminTask(card,id,store.tasks[id]);message('Published. Reports remain restricted to Principal and assigned teachers.');});publish.classList.add('primary');actions.append(publish,button('Stop publication',async()=>{if(!discard())return;await admin({operation:'unpublish',taskId:id,expectedRevision:t.revision});drawAdminTask(card,id,store.tasks[id]);message('Publication stopped. All submitted reports are retained.');}));actions.lastElementChild.disabled=!t.published;details.append(actions);

 const results=el('section',undefined,'task-results');results.tabIndex=-1;results.setAttribute('aria-label','Submission status and results');results.append(el('h3','Submission status and results'));const shortcuts=el('div',undefined,'task-actions task-section-shortcuts');shortcuts.append(button('Download Excel · IX–X–XI–XII',async()=>{if(dirty())throw Error('Save your task edits before downloading Excel.');await admin({operation:'read'});const {ExcelJS}=await taskExcel(),workbook=buildTaskWorkbook(ExcelJS,store.tasks[id]),bytes=await workbook.xlsx.writeBuffer(),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=document.createElement('a');link.href=url;link.download='survey-'+id+'-IX-X-XI-XII.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Excel report downloaded: separate IX, X, XI and XII worksheets.');}),button('Prepare presentation report',async()=>{if(dirty())throw Error('Save your task edits and Principal comment before preparing the presentation.');await admin({operation:'read'});openTaskPresentation(store.tasks[id],staff);}),el('span','Separate annexures:'),button('RO / DC / AC remarks annexure',async()=>{if(dirty())throw Error('Save your edits before generating the remarks annexure.');await admin({operation:'read'});openTaskPresentation(store.tasks[id],staff,{remarksOnly:true});}),button('Teachers’ comments annexure',async()=>{if(dirty())throw Error('Save your edits before generating the comments annexure.');await admin({operation:'read'});openTaskPresentation(store.tasks[id],staff,{commentsOnly:true});}),button('Class-wise reports annexure',async()=>{if(dirty())throw Error('Save your edits before generating class-wise reports.');await admin({operation:'read'});openTaskPresentation(store.tasks[id],staff,{classReportsOnly:true});}),button('View submission status',()=>{results.focus({preventScroll:true});results.scrollIntoView({block:'start',behavior:'smooth'});}),button('Edit task / classes / teachers',()=>{details.open=true;details.scrollIntoView({block:'start',behavior:'smooth'});}));details.before(shortcuts);
 const overview=el('div',undefined,'task-overview');
 for(const [value,label]of [[t.summary.submitted.length,'Reports submitted'],[t.summary.pending.length,'Reports pending'],[taskClasses(t.draft).filter(c=>t.draft.assignments?.[c]).length,'Classes assigned']]){const box=el('div');box.append(el('strong',String(value)),el('span',label));overview.append(box);}results.append(overview);
 const manage=button('Manage class assignments and figures',()=>{details.open=true;details.scrollIntoView({block:'start',behavior:'smooth'});});results.append(manage);
 const grid=el('div',undefined,'task-class-grid');grid.setAttribute('aria-label','Class reporting status');
 for(const c of taskClasses(t.draft)){const submitted=t.summary.submitted.includes(c),teacher=staff[t.draft.assignments?.[c]]?.name||'Teacher not assigned',tile=el('div',undefined,'task-class-status'+(submitted?' is-submitted':'')),state=el('span',submitted?'✓ Submitted':'Pending','task-badge');tile.append(el('strong',c),state,el('span',teacher,'task-teacher'));
 const supplied=Object.values(t.draft.headers?.[c]||{}).filter(v=>v!=null).length;tile.append(el('small',supplied+'/3 class figures provided'));
 if(submitted)tile.append(button('Open report for '+c,()=>{const report=results.querySelector('[data-report-class="'+c+'"]');report.open=true;report.scrollIntoView({block:'start',behavior:'smooth'});}));grid.append(tile);}results.append(grid);
 const consolidation=el('details',undefined,'task-consolidation');consolidation.open=t.summary.submitted.length>0;consolidation.append(el('summary','Consolidated totals'),el('p','Each field is counted separately. Categories overlap; PTMs count meetings. Unknown figures are excluded. Totals follow saved draft question wording; changed questions exclude earlier answers until teachers confirm again. Class reports retain their original question wording. Class figures include supplied enrollment data for pending classes.'));
 const available=Object.entries({...TASK_HEADERS,...taskQuestionLabels(t.draft,{countsOnly:true})}).filter(([k])=>t.summary.totals[k].classes.length);
 if(!available.length)consolidation.append(el('p','No figures supplied yet. Totals will appear after class figures or reports are saved.','task-empty'));
 else{const scroll=el('div',undefined,'task-scroll'),table=el('table',undefined,'task-totals'),thead=el('thead'),head=el('tr');for(const label of ['Survey field','Total','Coverage'])head.append(el('th',label));thead.append(head);table.append(thead);const body=el('tbody');
 for(const [k,label]of available){const v=t.summary.totals[k],row=el('tr'),name=el('th',label),total=el('td',String(v.total)),coverage=el('td'),breakdown=el('details');name.scope='row';breakdown.append(el('summary',v.classes.length+'/'+taskClasses(t.draft).length+' classes'+(v.missing.length?' · Incomplete':'')),el('p','Supplied: '+v.classes.join(', ')),el('p','Missing: '+(v.missing.join(', ')||'None')));coverage.append(breakdown);row.append(name,total,coverage);body.append(row);}table.append(body);scroll.append(table);consolidation.append(scroll);
 const unknown=Object.entries({...TASK_HEADERS,...taskQuestionLabels(t.draft,{countsOnly:true})}).filter(([k])=>!t.summary.totals[k].classes.length);if(unknown.length){const missing=el('details');missing.append(el('summary',unknown.length+' fields not yet provided'),el('p',unknown.map(([,label])=>label).join(' · ')));consolidation.append(missing);}}
 results.append(consolidation);
 if(!t.summary.submitted.length)results.append(el('p','No class reports submitted yet. Assign teachers and provide class figures above. Assigned teachers can submit after publication.','task-empty'));
 if(t.summary.archivedClasses?.length)results.append(el('p','Reports retained for removed classes (excluded from current totals): '+t.summary.archivedClasses.join(', ')));
 for(const c of [...t.summary.submitted,...(t.summary.archivedClasses||[])]){const report=t.reports[c],d=el('details',undefined,'task-report');d.dataset.reportClass=c;d.append(el('summary',c+' · '+(staff[report.submittedBy]?.name||report.submittedBy)),el('p','Updated '+rollTimestamp(report.updatedAt)));const figures=t.published?.headers?.[c]||t.draft.headers?.[c]||{},list=reportAnswers([...Object.entries(TASK_HEADERS).map(([key,label],index)=>({label:'Q'+(index+1)+'. '+label+' · View only',value:figures[key]??'Unprovided'})),...taskQuestions(report).map((q,index)=>({label:'Q'+(index+4)+'. '+taskQuestionWording(q.label),value:report.values[q.id],written:taskQuestionIsWritten(q)}))]);const archived=[];if(Object.keys(report.retiredAnswers||{}).length){const retired=el('details');retired.append(el('summary','Earlier answers to deleted or changed questions'));const oldList=reportAnswers(Object.values(report.retiredAnswers).map(answer=>({label:answer.label,value:answer.value,written:typeof answer.value==='string'})));retired.append(oldList);archived.push(retired);}d.append(list,...archived,el('h4',OVERALL_COMMENT_LABEL),el('p',report.values.remarks||'No additional remarks.','task-teacher-remarks'));if(report.principalEditedAt)d.append(el('p','Saved by Principal · '+rollTimestamp(report.principalEditedAt),'task-save-confirmation'));d.append(button('Edit submitted answers — '+c,()=>{if(d.querySelector('.task-principal-report-editor'))return;principalReportEditor(d,card,id,t,c);}));results.append(d);}if(t.published)card.insertBefore(results,details);else card.append(results);
 const comment=form(),input=field(comment,'Principal comment (private, after results)','principal-comment','textarea',t.comment||'');input.maxLength=4000;comment.append(el('button','Save Principal comment'));comment.onsubmit=e=>{e.preventDefault();run(async()=>{await admin({operation:'comment',taskId:id,expectedRevision:t.revision,comment:input.value});comment.dataset.portalDirty='false';t.revision=store.tasks[id].revision;message('Principal comment saved.');});};if(t.published)results.append(comment);else card.append(comment);const closing=el('details',undefined,'task-closing-comments');closing.append(el('summary','Closing comments for the whole report'));const closingForm=form(),closingInputs={};for(const [key,label]of Object.entries(TASK_REPORT_COMMENTS)){const input=field(closingForm,label,'closing-'+key,'textarea',t.reportComments?.[key]||'');input.maxLength=4000;closingInputs[key]=input;}closingForm.append(el('button','Save closing report comments'));closingForm.onsubmit=event=>{event.preventDefault();run(async()=>{await admin({operation:'report-comments',taskId:id,expectedRevision:t.revision,comments:Object.fromEntries(Object.entries(closingInputs).map(([key,input])=>[key,input.value]))});closingForm.dataset.portalDirty='false';t.revision=store.tasks[id].revision;t.reportComments=store.tasks[id].reportComments;message('Closing report comments saved successfully. Available in the separate remarks annexure.');});};closing.append(el('p','Saved privately for this whole task. Saving does not automatically include these notes in exports. Open the separate RO / DC / AC remarks annexure to choose saved notes and download PDF or PPTX.'),closingForm);results.append(closing);
}
function principalReportEditor(parent,card,id,t,c){
 const old=t.reports[c],headers=t.published?.headers?.[c]||t.draft.headers?.[c]||{},editor=form(),inputs={};editor.className='task-principal-report-editor';editor.append(el('h4','Edit submitted answers — '+c),el('p','Edit this class report using its original submitted questions. Q1–Q3 stay read-only. Saving updates totals and the presentation; the original submitting teacher is retained.'));
 const participation=t.examParticipation?.rows?.[c];if(participation)editor.append(el('p','Exam pass rate uses '+participation.appeared+' appeared students · '+participation.exam+' (reference only).'));
 let n=3;for(const q of taskQuestions(old)){const written=q.kind==='text',input=field(editor,'Q'+(++n)+'. '+taskQuestionWording(q.label),q.id,written?'textarea':'number',old.values[q.id]??'');if(written){input.maxLength=10000;editor.append(remarkWordLimit(input,old.values[q.id]||''));}else{input.min='0';input.step='1';input.inputMode='numeric';if(q.kind==='students'&&headers.total!=null)input.max=String(q.id==='passed'&&Number.isSafeInteger(participation?.appeared)?Math.min(headers.total,participation.appeared):headers.total);}inputs[q.id]=input;}
 const remarks=field(editor,OVERALL_COMMENT_LABEL+' (optional)','principal-teacher-remarks','textarea',old.values.remarks||'');remarks.maxLength=10000;editor.append(remarkWordLimit(remarks,old.values.remarks||''));const actions=el('div',undefined,'task-actions');actions.append(el('button','Save submitted answers'),button('Cancel answer edits',()=>{if(editor.dataset.portalDirty==='true'&&!confirm('Discard these unsaved answer edits?'))return;editor.remove();}));editor.append(actions);editor.onsubmit=event=>{event.preventDefault();if([...card.querySelectorAll('form[data-portal-dirty="true"]')].some(f=>f!==editor)){message('Save other task edits and comments before saving these answers.',true);return;}run(async()=>{const values={remarks:remarks.value,...Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.tagName==='TEXTAREA'?input.value:input.value===''?null:Number(input.value)]))};await admin({operation:'edit-report',taskId:id,classId:c,expectedRevision:t.revision,reportRevision:old.revision||0,report:values});editor.dataset.portalDirty='false';drawAdminTask(card,id,store.tasks[id]);const saved=card.querySelector('[data-report-class="'+c+'"]');saved.open=true;saved.scrollIntoView({block:'start',behavior:'smooth'});message(c+' submitted answers saved successfully by Principal.');});};parent.append(editor);editor.scrollIntoView({block:'start',behavior:'smooth'});editor.querySelector('input,textarea')?.focus();
}
function teacherTaskHeading(task,tag='h2',urgentText='Most urgent task · Handle with care'){const heading=el(tag,undefined,'task-title-heading');if(task.priority===TASK_PRIORITIES[0]){heading.classList.add('task-urgent-heading');const icon=el('span','🚨','task-alarm-icon');icon.setAttribute('aria-hidden','true');heading.append(icon,el('span',urgentText,'task-importance-label'),el('span',task.title,'task-heading-title'));}else heading.textContent=task.title;return heading;}
async function openNamedPB1Results(exam,remedial=false){
 const read=()=>request({action:'task-read',operation:'pb1-named',exam,remedial});
 try{return await read();}catch(error){if(!error.curtainRequired)throw error;}
 return new Promise(resolve=>{
  const dialog=el('dialog',undefined,'task-start-dialog'),heading=el('h2','Show student names');
  heading.id='pb1-viewing-title';dialog.setAttribute('aria-labelledby',heading.id);
  const login=el('form'),password=field(login,'Staff viewing password','pb1-viewing-password','password');
  password.required=true;password.autocomplete='off';
  const error=el('p',undefined,'task-error');error.setAttribute('role','alert');
  const submit=el('button','Show names'),cancel=el('button','Cancel');cancel.type='button';cancel.onclick=()=>dialog.close();
  login.append(submit,cancel,error);dialog.append(heading,login);
  let result;
  login.onsubmit=async event=>{
   event.preventDefault();submit.disabled=true;error.textContent='';
   const secret=password.value;password.value='';
   try{await request({action:'view-login',password:secret});result=await read();dialog.close();}
   catch(failure){error.textContent=failure.message;}
   finally{submit.disabled=false;}
  };
  dialog.addEventListener('close',()=>{dialog.remove();resolve(result);},{once:true});
  document.body.append(dialog);dialog.showModal();
 });
}
function halfYearlyImportPanel(roster,upload,exam){
 const standard=exam?.classId||'XI',label='Class '+standard,examName=exam?.name||'Half-Yearly',baseline=exam?.baseline||'PT-1';
 const columns=exam?HALF_YEARLY_COLUMNS.map(column=>column==='HalfYearlyMM'?exam.column:column):HALF_YEARLY_COLUMNS;
 const details=el('details'),editor=form(),template=el('a','Download CSV template');
 template.href='data:text/csv;charset=utf-8,'+encodeURIComponent(columns.join(',')+'\r\n');
 template.download='Class-'+standard+'-'+examName.replaceAll(' ','-')+'-template.csv';
 const file=field(editor,label+' roster and '+baseline+' marks CSV','xi-roster-csv','file');
 file.accept='.csv,text/csv';file.required=true;
 const feedback=el('p');
 feedback.setAttribute('role','status');
 feedback.hidden=true;
 editor.append(el('button','Import '+label+' CSV'),feedback);
 editor.onsubmit=event=>{
  event.preventDefault();
  run(async()=>{
   feedback.hidden=true;
   feedback.className='';
   try{
    const selected=file.files[0];
    if(!selected||selected.size>HALF_YEARLY_CSV_LIMIT)throw Error('Choose a CSV up to 256 KB.');
    if([...host.querySelectorAll('form[data-portal-dirty="true"]')].some(active=>active!==editor))throw Error('Save your mark changes before importing a roster.');
    if(!confirm('Import this '+label+' roster and previous marks? Saved '+examName+' marks are retained.'))return;
    feedback.textContent='Importing '+label+' roster and '+baseline+' marks…';
    feedback.hidden=false;
    await upload(await selected.text());
   }catch(error){
    feedback.className='task-error';
    feedback.textContent=error.message;
    feedback.hidden=false;
    throw error;
   }
  });
 };
 details.append(el('summary','Import '+label+' roster and '+baseline+' marks'),el('p','Use one row per student and subject. '+(exam?'Enter 80 as the Pre-Annual maximum. ':'Enter the previous and Half-Yearly maximum marks for each paper. ')+'Use - for subjects the student is not enrolled in. Use AB for enrolled students who were absent from '+baseline+'. Leave marks blank only if an enrolled student’s '+baseline+' result is unavailable. Teacher accepts the exact portal name or staff ID. Leave it blank for Principal-only entry.'),template,editor);
 const counts=new Map();
 for(const {section} of roster)counts.set(section,(counts.get(section)||0)+1);
 const sections=[...counts.keys()].sort();
 const summary=sections.length?'Imported roster · '+sections.map(section=>standard+' '+section+': '+counts.get(section)).join(' · '):
  'No '+label+' roster has been imported yet.';
 const panel=el('div');
 panel.append(el('p',summary),details);
 return panel;
}

function halfYearlyTransferPanel(data,transfer){
 if(!data.roster.length)return;
 const details=el('details'),editor=form();
 const student=field(editor,'Student','xi-transfer-student','select');
 const from=field(editor,'Current subject','xi-transfer-from','select');
 const to=field(editor,'New subject','xi-transfer-to','select');
 const roster=[...data.roster].sort((a,b)=>a.section.localeCompare(b.section)||a.name.localeCompare(b.name));
 options(student,[['','Choose a Class XI student'],...roster.map(person=>[person.key,'XI '+person.section+' · '+person.name+' · Roll '+person.roll])],'');
 const action=el('button','Confirm subject transfer'),feedback=el('p');
 feedback.setAttribute('role','status');
 editor.append(action,feedback);details.append(el('summary','Transfer a student to another subject'),
  el('p','Previous marks stay in the subject transfer history. The new subject opens with blank marks.'),editor);
 function subjects(){
  const person=roster.find(item=>item.key===student.value);
  const enrolled=new Set(data.rows.filter(row=>row.key===student.value).map(row=>row.scope));
  const choices=active=>data.scopes.flatMap((paper,index)=>paper.section===person?.section&&enrolled.has(index)===active?[[paper.subjectId,paper.subject]]:[]);
  options(from,[['','Choose current subject'],...choices(true)],'');
  options(to,[['','Choose new subject'],...choices(false)],'');
 }
 for(const input of [student,from,to])input.required=true;
 student.onchange=subjects;subjects();
 editor.onsubmit=event=>{event.preventDefault();run(async()=>{
  if([...host.querySelectorAll('form[data-portal-dirty="true"]')].some(active=>active!==editor)){
   feedback.textContent='Save your mark changes before transferring a subject.';
   feedback.className='task-error';
   return;
  }
  const person=roster.find(item=>item.key===student.value);
  if(!confirm('Transfer '+person.name+' from '+from.selectedOptions[0].text+' to '+to.selectedOptions[0].text+'?'))return;
  try{await transfer({studentKey:student.value,fromSubjectId:from.value,toSubjectId:to.value});}
  catch(error){feedback.textContent=error.message;feedback.className='task-error';}
 });};
 if(data.transfers?.length){
  const history=el('details');
  const marks=mark=>mark?(mark.absent?'AB':mark.score+'/'+mark.maximum):'Pending';
  history.append(el('summary','Subject transfer history'));
  for(const item of [...data.transfers].sort((a,b)=>b.at-a.at)){
   const person=roster.find(row=>row.key===item.studentKey);
   history.append(el('p',(person?.name||'Student')+' · '+item.from+' → '+item.to+' · '+rollTimestamp(item.at).split(' ')[0]+
    ' · Archived '+item.from+' PT-1 '+marks(item.before)+' · Half-Yearly '+marks(item.current)));
  }
  details.append(history);
 }
 return details;
}

function drawClassIXRemedial(data,back,{teachers=[],save,openNames,filters={}}={}){
 const panel=el('section',undefined,'task-card');
 panel.append(el('h2','Class IX weekly remedial action'),
  el('p','Critical fail, Fail, and Borderline are all remedial targets. Each subject uses PT-2 until its Pre-Annual mark is entered, then switches to the Pre-Annual result.'));
 if(save)panel.append(el('p','Record the support given and the next check. A new entry updates the comment for the current week.'));
 if(openNames)panel.append(button('Show student names',()=>{if(discard())return openNames(filters);}));
 const groups=[['critical','Critical fail'],['red','Fail'],['yellow','Borderline']];
 const bandLabels=new Map(groups);
 groups.push(['history','Previous targets with recorded actions']);
 const bandFor=row=>(row.current||row.before)?.band;
 const filterBar=el('div',undefined,'pb1-filters'),results=el('div');
 panel.append(filterBar,results);
 const filterValue=(paper,key)=>key==='teacher'?(paper.teacher||'Teacher assignment pending'):paper[key];
 for(const [key,label] of [['subject','Subject'],['section','Section'],['teacher','Teacher']]){
  const select=field(filterBar,label,'remedial-filter-'+key,'select');
  const values=[...new Set(data.scopes.map(paper=>filterValue(paper,key)))].sort((a,b)=>a.localeCompare(b));
  options(select,[['','All '+label.toLowerCase()+'s'],...values.map(value=>[value,key==='section'?'IX '+value:value])],filters[key]||'');
  filters[key]=select.value;
  select.onchange=()=>{
   if(!discard()){select.value=filters[key];return;}
   filters[key]=select.value;drawResults();
  };
 }
 function drawResults(){
  results.replaceChildren();
  const targetStudents=new Map(),subjects=new Map();
  for(const row of data.rows){
   const band=bandFor(row),paper=data.scopes[row.scope];
   if(Object.entries(filters).some(([key,value])=>value&&filterValue(paper,key)!==value))continue;
   if(bandLabels.has(band)){
    const records=targetStudents.get(row.key)||[];
    records.push(row);targetStudents.set(row.key,records);
   }else if(!(row.actionWeeks?.length||Object.keys(row.weeklyActions||{}).length))continue;
   const records=subjects.get(paper.subject)||[];
   records.push(row);subjects.set(paper.subject,records);
  }
  const studentLabel=row=>{
   const paper=data.scopes[row.scope];
   return [paper.classId+' '+paper.section,row.roll?'Roll '+row.roll:'',row.name].filter(Boolean).join(' · ');
  };
  results.append(el('p',targetStudents.size+(targetStudents.size===1?' student needs support.':' students need support.')+' A student can appear under more than one subject.'));
  if(targetStudents.size){
   const overview=el('details'),students=el('ul');
   overview.append(el('summary','View student-wise overview'),students);
   for(const records of targetStudents.values()){
    const item=el('li');item.append(el('strong',studentLabel(records[0])));
    item.append(el('div',records.map(row=>data.scopes[row.scope].subject+' · '+bandLabels.get(bandFor(row))).join(' | ')));
    students.append(item);
   }
   results.append(overview);
  }
  for(const [subject,records] of [...subjects].sort(([a],[b])=>a.localeCompare(b))){
   const subjectBlock=el('section',undefined,'task-report');
   subjectBlock.append(el('h3',subject));
   for(const [band,label] of groups){
    const rows=records.filter(row=>band==='history'?!bandLabels.has(bandFor(row)):bandFor(row)===band);
    const section=el('details');section.append(el('summary',label+' · '+new Set(rows.map(row=>row.key)).size));
    for(const row of rows){
     const paper=data.scopes[row.scope],mark=row.current||row.before,history=Object.entries(row.weeklyActions||{}).sort(([a],[b])=>b.localeCompare(a));
     const card=el('div',undefined,'task-report');
     card.append(el('h4',studentLabel(row)),
      el('p',paper.teacher||'Teacher assignment pending'),
      el('p',mark?(row.current?'Pre-Annual':'PT-2 · Provisional')+' · '+(mark.absent?'AB':mark.score+'/'+mark.maximum):'Result pending'));
     for(const [week,{comment}] of history)card.append(el('p','Week of '+rollDateText(week)+' · '+comment));
     const actionStatus=el('p',row.actionSaved?'Action recorded for this week':row.actionWeeks?.length?
      'Action recorded · '+rollDateText([...row.actionWeeks].sort().at(-1)):'');
     if(row.actionWeeks)card.append(actionStatus);
     if(save&&band!=='history'&&paper.teachers?.length){
      const action=el('details'),editor=form();
      action.append(el('summary','Action taken report'),editor);
      const person=field(editor,'Select your name','remedial-teacher','select');
      options(person,[['','Choose your name'],...teachers.map(({id,name})=>[id,name])],'');
      person.required=true;
      const comment=field(editor,'Weekly action taken for '+row.name+' · '+subject,'remedial-comment','textarea');
      comment.required=true;comment.maxLength=1000;
      const pin=field(editor,'Personal PIN','remedial-pin','password');pin.required=true;pin.inputMode='numeric';pin.autocomplete='off';
      editor.append(el('button','Save weekly action'));
      editor.onsubmit=event=>{event.preventDefault();const secret=pin.value;pin.value='';run(async()=>{
       const {revision}=await save({classId:paper.classId,sectionId:paper.sectionId,subjectId:paper.subjectId,
        codedStudent:row.key,comment:comment.value,expectedRevision:data.revision},person.value,secret);
       data.revision=revision;row.actionSaved=true;
       editor.reset();editor.dataset.portalDirty='false';action.open=false;
       actionStatus.textContent='Action recorded for this week';
       message('Weekly action saved.');
      });};
      card.append(action);
     }
     section.append(card);
    }
    subjectBlock.append(section);
   }
   results.append(subjectBlock);
  }
 }
 drawResults();
 host.replaceChildren(button('Back to Task 3',()=>{if(discard())return back();}),panel);
}
async function openPB1Analyser(entryOnly=false,examId,requestedPaper,remedial=false){
 const classIX=examId==='class-ix';
 const exam=classIX?{title:'Class IX Pre-Annual Wisdom Analyser',short:'Pre-Annual',current:'Pre-Annual Exam',previous:CLASS_IX_EXAM.previous,baseline:CLASS_IX_EXAM.baseline,classId:'IX',classes:'Class IX'}:examId==='half-yearly'?HALF_YEARLY_ANALYSER:PB1_ANALYSER;
 const openExam=(entry=false)=>openPB1Analyser(entry,examId);
 const asPrincipal=principal;
 if(!asPrincipal&&remedial){
  const read=operation=>request({action:'task-read',operation,exam:examId,remedial:true});
  let coded=false;
  const [data,{teachers}]=await Promise.all([
   read('pb1-named').catch(error=>{if(!error.curtainRequired)throw error;coded=true;return read('pb1-public');}),
   request({action:'task-read',operation:'pb1-directory',exam:examId}),
  ]);
  const save=(values,staffId,pin)=>request({
   action:'pin-submit',operation:'task-manager',taskOperation:'class-ix-remedial-save',exam:examId,staffId,pin,...values,
  });
  drawClassIXRemedial(data,drawClassIXExam,{teachers,save,openNames:coded?async filters=>{
   const named=await openNamedPB1Results(examId,true);
   if(named)drawClassIXRemedial(named,drawClassIXExam,{teachers,save,filters});
  }:undefined});
  return;
 }
 if(!asPrincipal&&!entryOnly&&!remedial){
  const read=named=>request({action:'task-read',operation:named?'pb1-named':'pb1-public',exam:examId});
  let data,publicView=classIX;
  try{data=await read(!classIX);}catch(error){
   if(!error.curtainRequired)throw error;
   data=await read(false);publicView=true;
  }
  renderPB1Analyser(host,data,{button,run,exam,publicView,back:classIX?drawClassIXExam:drawStaff,backLabel:classIX?'Back to Task 3':undefined,openEntry:paper=>openPB1Analyser(true,examId,paper),
   openNames:publicView&&!classIX?()=>openNamedPB1Results(examId):undefined,refresh:named=>read(!classIX&&named)});
  return;
 }
 const open=async(staffId='',pin='',savedReport)=>{
  const send=(operation,values={},secret='')=>request(asPrincipal?{action:'task-principal',operation,exam:examId,...values}:
   {action:'pin-submit',operation:'task-manager',taskOperation:operation,exam:examId,staffId,pin:secret,...values},asPrincipal);
  const data=savedReport||await send('pb1-read',{},pin);
  if(remedial){drawClassIXRemedial(data,drawClassIXExam);return;}
  const setup=asPrincipal&&examId?revision=>{
   const panel=halfYearlyImportPanel(data.roster,async csv=>{
    const imported=await send('half-yearly-import',{csv,expectedRevision:revision()});
    await open('', '', imported);
    const pending=classIX?imported.scopes.filter(paper=>paper.teacherAssignmentPending).length:0;
    message((classIX?'Class IX':'Class XI')+' roster and '+(classIX?'PT-2':'PT-1')+' marks imported.'+
     (pending?' PIN assignment pending for '+pending+' '+(pending===1?'paper.':'papers.'):''));
   },classIX?CLASS_IX_EXAM:undefined);
   if(classIX)return panel;
   const transfer=halfYearlyTransferPanel(data,async values=>{
    const updated=await send('half-yearly-transfer',{...values,expectedRevision:revision()});
    await open('', '', updated);
    message('Subject transferred. The previous marks were kept in transfer history.');
   });
   if(transfer)panel.append(transfer);
   return panel;
  }:undefined;
  renderPB1Analyser(host,data,{button,run,exam,setup,teacher:!asPrincipal,entryOnly,requestedPaper,backLabel:classIX?'Back to Task 3':undefined,
   back:()=>{if(discard())return classIX?drawClassIXExam():asPrincipal?drawPrincipal():openExam();},
   unfreeze:asPrincipal?async({classId,sectionId,subjectId},expectedRevision)=>{
    const result=await send('pb1-unfreeze',{classId,sectionId,subjectId,expectedRevision});
    message(exam.current+' marks reopened for correction.');return result;
   }:undefined,
   approve:asPrincipal?async({classId,sectionId,subjectId,freezeToken},expectedRevision,discussionComment)=>{
    const result=await send('pb1-approve',{classId,sectionId,subjectId,expectedRevision,discussionComment,freezeToken});
    message(exam.current+' marks approved and frozen.'+(exam.mission?' Mission 100 now uses them for this paper.':''));return result;
   }:undefined,
   save:async({classId,sectionId,subjectId,maximum},expectedRevision,entries,secret)=>{
    const result=await send('pb1-save',{classId,sectionId,subjectId,expectedRevision,expectedMaximum:maximum,entries},secret);
    message(exam.current+' marks saved.'+(exam.mission?' Mission 100 uses them after Principal approval.':''));return result;
   }});
 };
 if(asPrincipal){await open();return;}
 const {teachers,paperCount}=await request({action:'task-read',operation:'pb1-directory',exam:examId});
 const login=form(),card=el('section',undefined,'task-card pb1-marks-login');
 card.append(el('h2','Update '+exam.short+' marks'));
 if(teachers.length){
  const person=field(login,'Evaluator or cross-checker','pb1-teacher','select'),pin=field(login,'Personal PIN','pb1-pin','password');
  options(person,[['','Choose your name'],...teachers.map(({id,name})=>[id,name])],'');
  person.required=pin.required=true;pin.inputMode='numeric';pin.autocomplete='off';
  login.append(el('button','Open marks entry'));
  login.onsubmit=event=>{event.preventDefault();const secret=pin.value;pin.value='';run(()=>open(person.value,secret));};
  card.append(login);
 }else if(paperCount===0){
  card.append(el('p',classIX?'The list opens after the Principal imports the Class IX roster and PT-2 marks.':'Class XI marks entry opens after the Principal imports the roster and PT-1 marks in the XI Half-Yearly Analyser.'));
 }else card.append(el('p','No evaluators or cross-checkers are assigned to '+exam.current+' papers.'));
 host.replaceChildren(button(classIX?'Back to Task 3':'Back to Wisdom Analyser',()=>{
  if(discard())return classIX?drawClassIXExam():openExam();
 }),card);
}
function drawAnalyserCards(){
 const cards=el('div',undefined,'task-analyser-cards');
 for(const [exam,examId] of [[PB1_ANALYSER,undefined],[HALF_YEARLY_ANALYSER,'half-yearly']]){
  const card=el('section',undefined,'task-card pb1-analyser');
  const label=examId?'Open XI Half-Yearly Analyser':'Open Wisdom Analyser';
  const actions=el('div',undefined,'task-actions');
  actions.append(button(label,()=>openPB1Analyser(false,examId)),
   button(principal?'Review / freeze '+exam.short+' marks':'Update '+exam.short+' marks',()=>openPB1Analyser(true,examId)));
  card.append(el('h3',exam.title),actions);
  cards.append(card);
 }
 host.append(cards);
}
function classIXTable(panel,{headers,columns,rows,editors}){
 const editor=form(),scroll=el('div',undefined,'task-exam-table-scroll');
 const grid=el('table',undefined,'task-exam-table'),head=grid.createTHead().insertRow(),body=grid.createTBody();
 for(const label of [...headers,...columns.map(([,title])=>title)]){
  const cell=el('th',label);cell.scope='col';head.append(cell);
 }
 scroll.append(grid);
 editor.append(scroll);
 const controls=el('div',undefined,'task-exam-table-actions');
 editor.append(controls);
 panel.append(editor);
 function draw(editing){
  body.replaceChildren();controls.replaceChildren();
  const inputs=new Map();
  for(const {key,label,cells,values} of rows){
   const row=body.insertRow();
   cells.forEach(value=>{
    const cell=row.insertCell();
    if(Array.isArray(value)){
     const list=el('ul');
     value.forEach(item=>list.append(el('li',item)));
     cell.append(list);
    }else cell.textContent=value;
   });
   const editable={};
   for(const [name,title,type,maximum] of columns){
    const cell=row.insertCell(),value=values[name]||'';
    cell.className='task-exam-table-value';
    if(!editing){cell.textContent=value||(name==='area'?'Room to be assigned':'—');continue;}
    const input=el(type==='textarea'?'textarea':'input');
    if(type!=='textarea')input.type=type;
    input.setAttribute('aria-label',label+' · '+title);
    input.value=value;
    if(type==='textarea')input.maxLength=maximum||500;
    if(type==='text')input.maxLength=80;
    cell.append(input);editable[name]=input;
   }
   inputs.set(key,editable);
  }
  editor.onsubmit=null;
  editor.dataset.portalDirty='false';
  if(!editing){
   for(const option of editors.filter(item=>item.save))controls.append(button(option.editLabel,()=>draw(option)));
   return;
  }
  const {pinRequired,saveLabel,save}=editing;
  const pin=pinRequired?field(controls,'Exam IC personal PIN','class-ix-pin','password'):null;
  if(pin){pin.required=true;pin.inputMode='numeric';pin.autocomplete='off';}
  controls.append(el('button',saveLabel),button('Cancel',()=>draw()));
  editor.onsubmit=event=>{event.preventDefault();run(async()=>{
   const values=Object.fromEntries([...inputs].map(([key,fields])=>[key,
    Object.fromEntries(Object.entries(fields).map(([name,input])=>[name,input.value]))]));
   const secret=pin?.value;
   if(pin)pin.value='';
   await save(values,secret);
   for(const row of rows)row.values={...row.values,...values[row.key]};
   draw();message('Task 3 updated.');
  });};
 }
 draw();
}

async function drawClassIXExam(){
 const steps=el('ol',undefined,'task-exam-flow');
 host.replaceChildren(button('Back to task list',()=>{if(discard())return principal?drawPrincipal():drawStaff();}),
  el('h2','Task 3 — Class IX Pre-Annual Exam'),steps);
 const addStep=(title,copy)=>{
  const item=el('li',undefined,'task-exam-step');
  item.append(el('h3',title));if(copy)item.append(el('p',copy));
  steps.append(item);return item;
 };
 const dates=addStep('Date sheet'),submission=addStep('Question paper submission'),seating=addStep('Seating and invigilation');
 const marks=addStep('Marks entry and Wisdom Analyser','Enter marks out of 80 for your assigned subject. Compare results with PT-2 in the Wisdom Analyser.');
 marks.append(button(principal?'Import roster / open analyser':'Open Wisdom Analyser',()=>{if(discard())return openPB1Analyser(false,'class-ix');}));
 const remedial=addStep('Remedial action plan','Review critical fail, fail and borderline students by subject. The assigned teacher records action taken each week with their PIN.');
 remedial.append(button(principal?'Review remedial actions':'Open weekly remedial action',()=>{if(discard())return openPB1Analyser(false,'class-ix',undefined,true);}));
 host.scrollIntoView({block:'start'});
 let data={};
 try{data=await request({action:'task-read',operation:'class-ix-seating-read'});}
 catch(error){message(error.message,true);}
 const pinSend=(taskOperation,values,pin)=>request({action:'pin-submit',operation:'task-manager',taskOperation,staffId:data.icId,pin,...values});
 const commentSave=(record,column,send)=>async (rows,pin)=>{
  const values=Object.fromEntries(Object.entries(rows).map(([key,fields])=>[key,fields[column]]));
  record.revision=(await send({values,expectedRevision:record.revision||0},pin)).revision;
 };
 const dateNotes=data.dateNotes||{},qpAssignments=data.qpAssignments||{};
 classIXTable(dates,{
  headers:['Date','Day','Subject'],columns:[['comment','Instructions from Exam Department','textarea']],
  rows:CLASS_IX_PAPERS.map(([date,day,subject])=>({key:subject,label:subject,cells:[date,day,subject],values:{comment:dateNotes.values?.[subject]}})),
  editors:[{editLabel:'Edit date-sheet instructions',saveLabel:'Save instructions',pinRequired:true,
   save:data.icId?commentSave(dateNotes,'comment',(values,pin)=>pinSend('class-ix-date-notes-save',values,pin)):undefined}],
 });
 classIXTable(submission,{
  headers:['Subject','Teachers from master timetable'],
  columns:[['comment','Exam / Principal','textarea',1001]],
  rows:CLASS_IX_PAPERS.map(([, ,subject,names])=>({key:subject,label:subject,cells:[subject,names.split(' | ')],
   values:{comment:qpAssignments.values?.[subject]}})),
  editors:[
   {editLabel:'Edit question-paper instructions',saveLabel:'Save question-paper instructions',pinRequired:true,
    save:data.icId?commentSave(qpAssignments,'comment',(values,pin)=>pinSend('class-ix-qp-notes-save',values,pin)):undefined},
   {editLabel:'Edit QP assignments',saveLabel:'Save QP assignments',
    save:principal&&data.qpAssignments?commentSave(qpAssignments,'comment',values=>request({action:'task-principal',operation:'class-ix-qp-save',...values},true)):undefined},
  ],
 });
 let seatingRevision=data.revision||0;
 classIXTable(seating,{
  headers:['Section','Roll numbers'],columns:CLASS_IX_SEATING_FIELDS,
  rows:CLASS_IX_SEATING.map(({key,section,start,end})=>({key,label:'IX '+section+' · '+start+'–'+end,cells:['IX '+section,start+'–'+end],
   values:data.duties?.[key]||{area:data.rooms?.[key]}})),
  editors:[{editLabel:'Edit seating and invigilation',saveLabel:'Save seating and invigilation',pinRequired:true,
  save:data.icId?async (duties,pin)=>{
   seatingRevision=(await pinSend('class-ix-seating-save',{duties,expectedRevision:seatingRevision},pin)).revision;
  }:undefined}],
 });
 if(!data.icId)seating.append(el('p','Seating edits open when the Exam IC’s PIN is enabled.'));
}

function drawStaffTask2(){
 const plan=el('section',undefined,'task-card');
 plan.append(el('h3','Update workflow status'));
 if(store.monitoringPublishedAt){
  plan.append(button('Open Pre-Samagam Evaluation Monitoring',()=>openPublishedMonitoring()),
   el('p','Update your bundle status before entering marks.'));
 }else plan.append(el('p','The monitoring plan is awaiting publication.'));
 host.replaceChildren(button('Back to task list',drawStaff),el('h2',MONITORING_TITLE),plan);
 drawAnalyserCards();
 host.append(el('p','Discuss the results with the Principal, get the mark slip signed, and upload it in Task 2. Then upload marks on Samagam with the Matching IC.'));
 host.scrollIntoView({block:'start'});
}

async function openRetest(){
 const asPrincipal=principal;
 const send=(operation,values={})=>request({action:asPrincipal?'task-principal':'task-read',operation,...values},asPrincipal);
 const back=button('Back to task list',()=>{if(discard())return asPrincipal?drawPrincipal():drawStaff();});
 const panel=el('section',undefined,'task-card');
 const alert=el('aside',undefined,'task-retest-alert');
 alert.setAttribute('aria-label','High alert');
 alert.append(el('h3','High alert'),
  el('p','Do not upload exam dates or retest marks to Samagam before discussing them with the Principal.'),
  el('p','Record all retest updates only in the Vidyalaya app.'),
  el('p','We will ask the Regional Office (RO) for common retest dates and conduct our retests in advance while awaiting its response.'));
 panel.append(el('h2','Task 4 — '+RETEST_TITLE),el('strong','High priority','task-importance-label'),alert);
 host.replaceChildren(back,panel);
 let plan;
 try{plan=await send('retest-read');}
 catch(error){
  if(!error.curtainRequired)throw error;
  const login=form(),password=field(login,'Staff viewing password','retest-password','password');
  password.required=true;password.autocomplete='off';
  login.append(el('button','Open retest tracker'));
  login.onsubmit=event=>{event.preventDefault();const value=password.value;password.value='';run(async()=>{
   await request({action:'view-login',password:value});await openRetest();
  });};
  panel.append(login);return;
 }
 const filters=el('div',undefined,'pb1-filters'),content=el('div');
 const search=field(filters,'Search student, subject or teacher','retest-search','search');
 const section=field(filters,'Class / section','retest-section','select');
 panel.append(filters,content);
 search.oninput=section.onchange=()=>draw();

 function openProgress(id,row){
  const staff=plan.editors[id];
  const dialog=el('dialog',undefined,'task-start-dialog');
  const title=el('h2','Update retest progress');title.id='retest-progress-title';
  dialog.setAttribute('aria-labelledby',title.id);
  const editor=form(),person=field(editor,'Select your name','retest-teacher','select');
  options(person,[['','Choose your name'],...staff.map(({id,name})=>[id,name])],'');person.required=true;
  const step=field(editor,'Retest step','retest-step','select');
  options(step,RETEST_STEPS.map(([key,label])=>[key,label]),RETEST_STEPS[0][0]);
  const fields=el('div'),pinFields=el('div');
  const pin=field(pinFields,'Personal PIN','retest-pin','password');
  pin.required=true;pin.inputMode='numeric';pin.autocomplete='off';
  let value,comment;
  function drawStep(){
   fields.replaceChildren();
   const [key,label,type]=RETEST_STEPS.find(([key])=>key===step.value);
   value=field(fields,label,'retest-value',Array.isArray(type)?'select':type,row[key]||'');
   if(Array.isArray(type))options(value,[['','—'],...type.map(item=>[item,item])],row[key]||'');
   comment=field(fields,label+' comment','retest-comment','textarea',row[key+'Comment']||'');comment.maxLength=500;
  }
  let selectedStep=step.value;
  step.onchange=()=>{
   const changed=value.value!==(row[selectedStep]||'')||comment.value!==(row[selectedStep+'Comment']||'');
   if(changed&&!confirm('Discard this step’s unsaved changes?')){step.value=selectedStep;return;}
   selectedStep=step.value;drawStep();editor.dataset.portalDirty='false';
  };
  drawStep();
  const cancel=button('Cancel',()=>{if(discard())dialog.close();});
  editor.append(fields,pinFields,el('button','Save progress'),cancel);
  editor.onsubmit=event=>{event.preventDefault();const secret=pin.value;pin.value='';run(async()=>{
   const result=await request({action:'pin-submit',operation:'task-manager',taskOperation:'retest-teacher-save',
    staffId:person.value,pin:secret,rowId:id,step:step.value,value:value.value,comment:comment.value,expectedRevision:plan.revision});
   plan.revision=result.revision;plan.rows[id]=result.row;
   editor.dataset.portalDirty='false';dialog.close();draw();message('Retest progress saved.');
  });};
  dialog.append(title,el('p',[row.name,row.classLabel,row.subject].join(' · ')),editor);
  dialog.addEventListener('cancel',event=>{if(!discard())event.preventDefault();});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();
 }

 function draw(editing=false){
  content.replaceChildren();
  const all=Object.entries(plan.rows||{}),selected=section.value,query=search.value.trim().toLowerCase();
  const sections=[...new Set(all.map(([,row])=>row.classLabel))].sort();
  options(section,[['','All sections'],...sections.map(value=>[value,value])],selected);
  filters.hidden=editing||!all.length;
  const rows=all.filter(([,row])=>editing||(!selected||row.classLabel===selected)&&
   [row.name,row.roll,row.subject,row.subjectTeacher,row.classTeacher].join(' ').toLowerCase().includes(query))
   .sort(([,a],[,b])=>a.classLabel.localeCompare(b.classLabel)||
    a.examDate.localeCompare(b.examDate)||a.subject.localeCompare(b.subject)||Number(a.roll)-Number(b.roll));
  const state=asPrincipal?(plan.published?'Published to staff':'Draft for Principal review'):(plan.published?'':'The retest list is awaiting publication.');
  if(state)content.append(el('p',state));
  if(!editing&&asPrincipal){
   const importer=form(),file=field(importer,'Task 4 absentee CSV','retest-csv','file');
   file.accept='.csv,text/csv';file.required=true;
   importer.append(el('button','Import Task 4 CSV'));
   importer.onsubmit=event=>{event.preventDefault();run(async()=>{
    const upload=file.files[0];
    if(!upload||upload.size>64000)throw Error('Choose a CSV up to 64 KB.');
    plan=await send('retest-import',{csv:await upload.text(),expectedRevision:plan.revision});
    draw();message('Task 4 absentee list imported.');
   });};
   const template=el('a','Download CSV template');
   template.href='data:text/csv;charset=utf-8,'+encodeURIComponent(RETEST_CSV_HEADERS.join(',')+'\n');
   template.download='Task-4-retest-template.csv';
   importer.append(template);content.append(importer);
   if(all.length){
    const actions=el('div',undefined,'task-actions');
    actions.append(button('Edit retest details',()=>draw(true)),button(plan.published?'Stop publication':'Publish to staff',async()=>{
     plan=await send(plan.published?'retest-unpublish':'retest-publish',{expectedRevision:plan.revision});
     store.retestPublished=!!plan.published;draw();
    }));
    content.append(actions);
   }
  }
  if(!rows.length){if(all.length)content.append(el('p','No retests match the filters.'));return;}
  content.append(el('p',rows.length+' missed papers · '+new Set(rows.map(([,row])=>row.classLabel+' '+row.roll)).size+
   ' students · '+rows.filter(([,row])=>row.retestDate).length+' scheduled · '+rows.filter(([,row])=>row.testDone==='Done').length+' completed'));
  const editor=editing?form():el('div'),scroll=el('div',undefined,'task-exam-table-scroll');
  const table=el('table',undefined,'task-exam-table'),head=table.createTHead().insertRow(),tbody=table.createTBody();
  for(const label of [...RETEST_HEADERS,...RETEST_FIELDS.map(([,label])=>label)]){
   const th=el('th',label);th.scope='col';head.append(th);
  }
  const inputs=new Map();
  for(const [id,row] of rows){
   const tr=tbody.insertRow(),identity=row.name+' · '+row.subject;
   const student=tr.insertCell();
   student.append(el('strong',row.name));
   if(!asPrincipal&&plan.editors?.[id]?.length){
    const edit=button('Update progress',()=>openProgress(id,row));edit.setAttribute('aria-label','Update progress for '+identity);
    const action=el('div');action.append(edit);student.append(action);
   }
   for(const value of [row.classLabel,row.roll,row.subject,rollDateText(row.examDate)])tr.insertCell().textContent=value;
   const fields={};
   for(const [key,label,type] of RETEST_FIELDS){
    const td=tr.insertCell(),value=row[key]||'';
    td.className='task-exam-table-value';
    const status=RETEST_STEPS.some(([step])=>step===key);
    if(!editing){
     td.textContent=(type==='date'&&value?rollDateText(value):value)||'—';
     if(status&&row[key+'Comment'])td.append(el('div',row[key+'Comment'],'task-retest-comment'));
     continue;
    }
    const control=el(Array.isArray(type)?'select':'input');
    control.setAttribute('aria-label',identity+' · '+label);
    if(Array.isArray(type))options(control,[['','—'],...type.map(choice=>[choice,choice])],value);
    else{control.type=type;control.value=value;if(type==='text')control.maxLength=120;}
    td.append(control);fields[key]=control;
    if(status){
     const comment=el('textarea');comment.maxLength=500;comment.value=row[key+'Comment']||'';
     comment.setAttribute('aria-label',identity+' · '+label+' comment');
     td.append(comment);fields[key+'Comment']=comment;
    }
   }
   inputs.set(id,fields);
  }
  scroll.append(table);editor.append(scroll);content.append(editor);
  if(!editing)return;
  const actions=el('div',undefined,'task-actions');
  actions.append(el('button','Save retest details'),button('Cancel',()=>{if(discard())draw();}));
  editor.append(actions);
  editor.onsubmit=event=>{event.preventDefault();run(async()=>{
   const changes=Object.fromEntries([...inputs].flatMap(([id,fields])=>{
    const updates=Object.entries(fields).filter(([key,control])=>(plan.rows[id][key]||'')!==control.value.trim())
     .map(([key,control])=>[key,control.value.trim()]);
    return updates.length?[[id,Object.fromEntries(updates)]]:[];
   }));
   if(!Object.keys(changes).length){draw();return;}
   plan=await send('retest-save',{changes,expectedRevision:plan.revision});
   draw();message('Retest details saved.');
  });};
 }
 draw();
}

function drawStaff(){
 const tasks=Object.entries(store.tasks||{}).filter(([id])=>id!=='task1')
  .sort(([,a],[,b])=>TASK_PRIORITIES.indexOf(a.priority)-TASK_PRIORITIES.indexOf(b.priority));
 const list=el('ol',undefined,'task-stage-list');
 for(const [number,title,status,style,open] of [
  ['Task 1','HQ Survey','Done','done'],
  ['Task 2','Pre-Samagam Evaluation Monitoring','Running','running',drawStaffTask2],
  ['Task 3','Class IX Pre-Annual Exam','Running','upcoming',drawClassIXExam],
  ['Task 4',RETEST_TITLE,'High priority','priority',openRetest],
 ]){
  const item=el('li'),strip=open?button('',open):el('div');
  strip.className='task-stage-strip is-'+style;
  const info=el('span',undefined,'task-stage-info');
  info.append(el('span',number,'task-stage-number'),el('strong',title,'task-stage-title'));
  if(number==='Task 2'||number==='Task 3')info.append(el('span',number==='Task 2'?'Wisdom Analyser · PB-1 & Half-Yearly':'Date sheet, seating, marks and remedial action','task-stage-subtitle'));
  const state=el('span',undefined,'task-stage-state');
  if(style==='done'||open){
   const symbol=el('span',style==='done'?'✓':'→');
   symbol.setAttribute('aria-hidden','true');state.append(symbol);
  }
  state.append(el('span',status));strip.append(info,state);item.append(strip);list.append(item);
 }
 host.replaceChildren(el('h2','Task list'),list);
 for(const [id,t]of tasks){const card=el('section',undefined,'task-card task-public-card');card.append(teacherTaskHeading(t),el('p',t.priority+(t.deadline?' · Deadline: '+rollDateText(t.deadline):'')));const table=el('table',undefined,'task-public-list'),thead=el('thead'),heading=el('tr');for(const label of ['SN','Class','Prime mentor / Survey IC','Tech / analytical support','Status','Action'])heading.append(el('th',label));thead.append(heading);table.append(thead);const tbody=el('tbody');
  for(const row of t.rows||[]){const tr=el('tr');tr.dataset.taskClass=row.classId;for(const [label,value]of [['SN',row.number],['Class',row.classId],['Prime mentor / Survey IC',row.mentor],['Tech / analytical support',row.support||'—'],['Status',row.status]]){const td=el('td',label==='Status'&&value==='Submitted'?'✓ Submitted':String(value));td.dataset.label=label;if(label==='Status')td.className=row.status==='Submitted'?'task-row-submitted':'task-row-pending';tr.append(td);}const action=el('td'),start=button('Start & Submit Now',()=>startSurvey(id,row));action.dataset.label='Action';if(!row.staffId){start.disabled=true;action.append(el('small','Principal assignment needed'));}action.append(start);tr.append(action);tbody.append(tr);}table.append(tbody);card.append(table);host.append(card);
 }
 host.append(button('Refresh status',()=>load()));
}
function startSurvey(id,row){
 if(!discard())return;const dialog=el('dialog',undefined,'task-start-dialog'),title=el('h2','Start survey · '+row.classId);dialog.append(title,el('p',row.mentor+' · Verify your existing personal portal PIN.'));const f=form(),pin=field(f,'Existing personal portal PIN','start-pin','password'),error=el('p',undefined,'task-error');error.setAttribute('role','alert');pin.inputMode='numeric';pin.autocomplete='off';pin.required=true;f.append(error,el('button','Verify PIN and open survey'),button('Cancel',()=>{pin.value='';f.dataset.portalDirty='false';dialog.close();dialog.remove();}));
 f.onsubmit=e=>{e.preventDefault();run(async()=>{try{const result=await request({action:'pin-submit',operation:'task-manager',taskOperation:'read',taskId:id,classId:row.classId,staffId:row.staffId,pin:pin.value});pin.value='';f.dataset.portalDirty='false';selectedStaff=row.staffId;dialog.close();dialog.remove();adopt(result);openSurveyPage(id,row,result.tasks[id]);}catch(e){error.textContent=e.message;throw e;}});};dialog.addEventListener('cancel',event=>{if(busy){event.preventDefault();return;}pin.value='';f.dataset.portalDirty='false';dialog.remove();});dialog.append(f);document.body.append(dialog);dialog.showModal();pin.focus();
}
function openSurveyPage(id,row,t){
 document.body.classList.add('task-form-open');const page=el('section',undefined,'task-submission-page'),header=el('header',undefined,'task-form-heading');header.append(button('← Back to task list',async()=>{if(discard()){selectedStaff='';await load();}}),el('h2',row.classId+' · '+row.mentor),teacherTaskHeading(t,'h3'));page.append(header,el('p',t.instructions));const formHost=el('section');page.append(formHost);host.replaceChildren(page);reportForm(formHost,id,t,row.classId);window.scrollTo({top:0,behavior:'instant'});message('Questionnaire opened. Use your existing PIN again to submit or update this class report.');
}
function remarkWordLimit(input,original=''){const counter=el('small',undefined,'task-word-count');const update=()=>{const words=taskRemarkWordCount(input.value),valid=!words||words>=50&&words<=100||input.value===original;counter.textContent=words+' words · 50–100 words';counter.classList.toggle('task-error',!valid);input.setCustomValidity(valid?'':'Please write 50–100 words, or leave this optional comment blank.');};input.addEventListener('input',update);update();return counter;}
function reportForm(parent,id,t,c){parent.replaceChildren(el('h3',c));const h=t.headers?.[c]||{},header=el('div',undefined,'task-header');fixedClassQuestions(header,h);parent.append(header,el('p','Principal-supplied figures are read-only. Missing enrollment prevents enrollment-based checks until provided. Do not enter student names, locations or identifying details. Categories overlap; PTMs are meeting counts.'));
 const old=t.reports?.[c],questions=taskQuestions(t),compatible=taskCompatibleValues(old,t),f=form(),inputs={};
 if(old&&JSON.stringify(taskQuestions(old).map(q=>({...q,label:taskQuestionWording(q.label)})))!==JSON.stringify(questions.map(q=>({...q,label:taskQuestionWording(q.label)}))))f.append(el('p','The survey questions have changed. Earlier reports are preserved; review all current questions and confirm updated answers before resubmitting.','task-empty'));
 let questionNumber=3;for(const {id:k,label:originalLabel,kind}of questions.filter(q=>!t.principalExamOnly||!['passed','failed'].includes(q.id))){const label=taskQuestionWording(originalLabel),written=kind==='text',row=el('div',undefined,'task-count'+(written?' task-written-answer':'')),l=el('label','Q'+(++questionNumber)+'. '+label),input=el(written?'textarea':'input');input.name=k;input.id='count-'+id+'-'+k;l.htmlFor=input.id;if(written){input.maxLength=10000;input.rows=5;input.placeholder='Write class-level remarks / observations here. No student names or identifying details.';}else{input.type='number';input.min='0';input.step='1';input.inputMode='numeric';input.placeholder='';if(kind==='students'&&h.total!=null)input.max=String(h.total);}input.value=compatible[k]??'';row.append(l,input);if(written)row.append(remarkWordLimit(input,old?.values[k]||''));f.append(row);inputs[k]=input;}
 const remarks=field(f,OVERALL_COMMENT_LABEL+' (optional)','teacher-remarks','textarea',old?.values.remarks||'');remarks.maxLength=10000;remarks.placeholder='Describe the overall class situation, reasons for academic difficulties, steps taken and support needed.';f.append(remarkWordLimit(remarks,old?.values.remarks||''),el('p','50–100 words. Use general class-level observations only; do not include student names or identifying family/health details. Visible only to the assigned teacher and Principal.'));

 const pin=field(f,'Your existing personal PIN to submit / update','submission-pin','password');pin.required=true;pin.autocomplete='off';pin.inputMode='numeric';const receipt=el('p',undefined,'task-save-confirmation');receipt.setAttribute('role','status');f.append(el('button',old?'Update class report':'Submit class report'),receipt);f.onsubmit=e=>{e.preventDefault();run(async()=>{const report={remarks:remarks.value,...Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,input.tagName==='TEXTAREA'?input.value:input.value===''?null:Number(input.value)]))};const result=await request({action:'pin-submit',operation:'task-manager',taskOperation:'submit',staffId:selectedStaff,pin:pin.value,taskId:id,classId:c,expectedRevision:t.revision,reportRevision:t.reports?.[c]?.revision||0,report}).catch(error=>{receipt.textContent=error.message;receipt.classList.add('task-error');throw error;});receipt.classList.remove('task-error');pin.value='';f.dataset.portalDirty='false';Object.assign(t,result.tasks[id]);f.querySelector('button').textContent='Update class report';receipt.textContent='Submission confirmed. Your class report and remarks are saved.';message(c+' report saved. You remain at this class form.');});};parent.append(f);
}
window.addEventListener('beforeunload',e=>{if(dirty()||busy){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',()=>{if(dirty()){history.replaceState(null,'','#'+renderedMode);message('Save your entries or use the view buttons to discard them.');return;}run(load);});
async function initialize(){try{const modules=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);auth=modules[0].auth;authApi=modules[1];authApi.onAuthStateChanged(auth,current=>{closeTaskPresentation();epoch++;user=current;principal=false;selectedStaff='';store={tasks:{}};staff={};host.replaceChildren();navigation();load().catch(e=>message(e.message,true));});}catch(e){await load().catch(error=>message(error.message,true));}}
initialize();
