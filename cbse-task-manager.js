import {buildTaskWorkbook} from './cbse-task-excel.js';
import {openTaskPresentation,closeTaskPresentation} from './cbse-task-presentation.js';
import {importTaskFiguresCSV,importTaskStrengthWorkbook,taskFiguresTemplate,decodePreparedTaskFigures,loadTaskWorkbook} from './cbse-task-manager-import.js';
import {TASK_CLASSES,TASK_AVAILABLE_CLASSES,TASK_PRIMARY_CLASSES,taskClasses,TASK_PRIORITIES,TASK_HEADERS,TASK_REPORT_COMMENTS,taskHeader,taskQuestions,taskQuestionLabels,taskCompatibleValues,taskSummary,taskQuestionIsWritten,taskQuestionWording,taskRemarkWordCount} from './cbse-task-manager-model.js';
import {el,options} from './cbse-ui.js';
import {renderPrincipalLogin} from './cbse-principal-login.js';
import {MONITORING_TITLE,MONITORING_SHEETS,MONITORING_LIMITS,monitoringFormula} from './cbse-task-workbook.js';
import {MONITORING_ROLES,MONITORING_STEPS,monitoringAssignments} from './cbse-task-monitoring-workflow.js';
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
function navigation(){nav.replaceChildren(principal?button('Sign out',async()=>{if(discard()){suppliedFigures=null;await authApi.signOut(auth);}}):button('Principal sign in / Manage tasks',()=>switchMode('principal')));}
async function switchMode(next){if(!discard())return;history.replaceState(null,'','#'+next);await load();}
function clearSuppliedFigures(id){if(suppliedFigures?.taskId===id){suppliedFigures=null;document.querySelector('.task-import-ready')?.remove();}}
function adopt(result){store=result;staff=result.staff||staff;}
async function admin(input){const result=await request({action:'task-principal',...input},true);adopt(result);return result;}
async function load(){closeTaskPresentation();document.body.classList.remove('task-form-open');document.querySelectorAll('dialog.task-start-dialog').forEach(d=>d.remove());renderedMode=mode();navigation();host.replaceChildren();if(user){try{await admin({operation:'read'});principal=true;history.replaceState(null,'','#principal');navigation();drawPrincipal();return;}catch(error){if(![401,403].includes(error.status))throw error;}}
 adopt(await request({action:'task-read'}));drawStaff();if(mode()==='principal'){const login=el('section',undefined,'task-card');login.append(el('h2','Principal sign-in'),el('p','Sign in once to create a task, select classes, assign teachers and publish.'));renderPrincipalLogin(login,async password=>{await authApi.signInWithEmailAndPassword(auth,'ramsirkvs@gmail.com',password);});host.prepend(login);}}

function catalogue(parent){
 const list=Object.entries(store.tasks||{}).map(([id,t])=>({
  title:t.draft.title,updatedAt:Math.max(t.updatedAt||t.createdAt||0,...Object.values(t.reports||{}).map(report=>report.updatedAt||0)),state:t.published?'Published':'Draft',
  open:()=>openPrincipalTask(id,t),
 }));
 list.push({title:MONITORING_TITLE,updatedAt:store.monitoringUpdatedAt||0,state:'Monitoring',open:openMonitoring});
 list.sort((a,b)=>b.updatedAt-a.updatedAt);
 const scroll=el('div',undefined,'task-scroll'),table=el('table',undefined,'task-totals task-register');
 const head=table.createTHead().insertRow(),body=table.createTBody();
 for(const label of ['Task','Status','Updated (IST)','Open']){
  const cell=el('th',label);cell.scope='col';head.append(cell);
 }
 for(const task of list){
  const row=body.insertRow(),title=el('th',task.title);title.scope='row';
  row.append(title,el('td',task.state),el('td',task.updatedAt?new Date(task.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'—'));
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
async function openPublishedMonitoring(passwordValue){
 try{
  if(passwordValue!==undefined)await request({action:'view-login',password:passwordValue});
  const {monitoring}=await request({action:'task-read',operation:'monitoring-read'});
  drawMonitoring(monitoring,{staffView:true});
 }catch(error){
  if(!error.curtainRequired&&passwordValue===undefined)throw error;
  if(passwordValue!==undefined)throw error;
  const login=form(),password=field(login,'Staff viewing password','monitoring-password','password');
  password.required=true;
  login.append(el('button','Open published plan'));
  login.onsubmit=event=>{event.preventDefault();const secret=password.value;password.value='';run(()=>openPublishedMonitoring(secret));};
  host.replaceChildren(button('Back to task list',drawStaff),el('h2',MONITORING_TITLE),login);
 }
}
function drawMonitoringSettings(record,index){
 const overrides=structuredClone(record.overrides||{}),editor=form(),card=el('section',undefined,'task-card');
 const rows=monitoringAssignments(record.sheets,staff,overrides);
 host.replaceChildren(button('Back to plan',()=>{if(discard())drawMonitoring(record,{index});}),card);
 card.append(el('h2','Task 2 workflow settings'));
 const people=Object.entries(staff).sort(([,a],[,b])=>a.name.localeCompare(b.name)).map(([id,p])=>[id,p.name]);
 const reviewers=['Exam IC','Exam Co-IC'].map((label,i)=>{
  const select=field(editor,label,'exam-reviewer-'+i,'select');options(select,[['','No final-remark permission'],...people],record.reviewerIds?.[i]||'');return select;
 });
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
 reviewers.forEach(select=>{select.onchange=()=>{editor.dataset.portalDirty='true';};});
 editor.append(fields,el('button','Save workflow settings'));
 editor.onsubmit=event=>{event.preventDefault();run(async()=>{
  const {monitoring}=await request({action:'task-principal',operation:'monitoring-settings',expectedRevision:record.revision,overrides,reviewerIds:reviewers.map(select=>select.value)},true);
  store.monitoringUpdatedAt=monitoring.updatedAt;editor.dataset.portalDirty='false';
  drawMonitoring(monitoring,{index});message('Workflow settings saved. Publish the plan to apply them to Staff View.');
 });};
 card.append(editor);
}
function openMonitoringStep(record,key,staffView,allowUpdate=true){
 const entry=(staffView?record:record.published).assignments[key],progress=record.progress?.[key];
 const stage=progress?.stage||0,step=MONITORING_STEPS[stage],dialog=el('dialog',undefined,'task-start-dialog');
 dialog.append(el('h2',entry.subject+' · '+entry.section));
 if(staffView&&step?.label==='Samagam upload')dialog.append(el('p',SAMAGAM_REPORTING_NOTICE,'task-monitoring-notice'));
 for(const item of progress?.history||[]){
  dialog.append(el('p',item.label+' · '+item.name+' · '+new Date(item.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})));
  if(item.remark)dialog.append(el('p',item.remark));
 }
 const close=button('Close',()=>dialog.close());dialog.append(close);
 const eligible=step?.role==='exam'?record.examReviewers||[]:[entry.roles?.[step?.role]].filter(Boolean);
 if(staffView&&allowUpdate&&step&&eligible.length){
  const editor=form(),person=field(editor,'Your name','monitoring-staff','select'),outcome=field(editor,'Status','monitoring-outcome','select');
  options(person,[['','Choose your name'],...eligible.map(({id,name})=>[id,name])],'');
  options(outcome,[['','Choose status'],...step.options],'');
  const remark=field(editor,step.role==='exam'?'Final remark':'Remark','monitoring-remark','textarea');remark.maxLength=500;
  const pin=field(editor,'Personal PIN','monitoring-pin','password');pin.inputMode='numeric';pin.autocomplete='off';
  for(const input of [person,outcome,pin])input.required=true;
  outcome.onchange=()=>{remark.required=step.role==='exam'||outcome.value==='return';};outcome.onchange();
  const errorText=el('p',undefined,'task-error');errorText.setAttribute('role','status');
  editor.append(el('button','Save status'),errorText);dialog.append(editor);
  editor.onsubmit=event=>{event.preventDefault();const secret=pin.value;pin.value='';run(async()=>{
   try{
    await request({action:'pin-submit',operation:'task-manager',taskOperation:'monitoring-update',staffId:person.value,pin:secret,rowKey:key,publicationRevision:record.revision,expectedRevision:progress?.revision||0,outcome:outcome.value,remark:remark.value});
    dialog.close();await openPublishedMonitoring();message('Status saved.');
   }catch(error){errorText.textContent=error.message;}
  });};
 }else if(staffView&&allowUpdate&&step)dialog.append(el('p','Awaiting a Principal assignment for '+step.label+'.'));
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
function drawMonitoring(record,{staffView=false,index=0,editing=false}={}){
 const sheets=structuredClone(record.sheets),editor=form(),scroll=el('div',undefined,'task-scroll');
 const card=el('section',undefined,'task-card task-monitoring'),actions=el('div',undefined,'task-actions');
 const back=staffView?drawStaff:drawPrincipal;
 host.replaceChildren(button('Back to task list',()=>{if(discard())back();}),card);
 card.append(el('h2',MONITORING_TITLE));
 if(staffView)card.append(el('p',SAMAGAM_REPORTING_NOTICE,'task-monitoring-notice'));
 const publication=record.published?.updatedAt;
 if(!staffView)card.append(el('p',publication?'Published copy available to staff.':'Private draft'));
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
 }else if(!staffView){
  actions.append(button('Edit cells',()=>drawMonitoring(record,{index,editing:true})),
   button('Workflow settings',()=>drawMonitoringSettings(record,index)),
   button(publication?'Update published plan':'Publish plan',async()=>{
    if(confirm('Publish this saved plan for staff with viewing access?'))await update('monitoring-publish');
   }));
  if(publication)actions.append(button('Stop publication',async()=>{
   if(confirm('Remove the published Task 2 plan from Staff View?'))await update('monitoring-unpublish');
  }));
 }
 function drawSheet(position){
  index=position;
  tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===index)));
  const sheet=sheets[index],table=el('table',undefined,'task-totals task-monitoring-sheet');
  table.setAttribute('aria-label',MONITORING_SHEETS[index].name);
  const body=table.createTBody(),restore=[];
  const display=value=>value.startsWith('=')?monitoringFormula(value,sheets,index):value;
  const width=sheet[0].length;
  const workflow=!editing&&index===0&&(staffView?record:record.published);
  if(workflow)table.classList.add('task-monitoring-workflow');
  if(editing){
   const heading=table.createTHead().insertRow();heading.append(el('th','#'));
   for(let c=0;c<width;c++)heading.append(el('th',String.fromCharCode(65+c)));
  }
  sheet.forEach((values,r)=>{
   const spacer=index===0?r===3:[2,5,6].includes(r);
   if(!values.some(Boolean)&&(!editing||spacer))return;
   const row=body.insertRow();
   if(!editing&&(index===0?r<3:r<2)&&values[0]&&values.slice(1).every(value=>!value)){
    const heading=el('th',values[0],'task-monitoring-caption');heading.colSpan=width+(workflow?MONITORING_STEPS.length:0);row.append(heading);return;
   }
   const header=index===0?r===4:r===3||r===7;
   const entry=workflow&&r>4?workflow.assignments?.['row_'+values[0]]:null;
   const progress=entry?record.progress?.['row_'+values[0]]:null;
   if(editing)row.append(el('th',String(r+1)));
   values.forEach((value,c)=>{
    const cell=el(!editing&&header?'th':'td');row.append(cell);
    if(!editing){
     const assignedRole=entry&&MONITORING_ROLES[c-4]?.[0];
     cell.textContent=assignedRole?(entry.roles?.[assignedRole]?.name||value||'Unassigned'):display(value);
     return;
    }
    const input=el('div',String(display(value)),'task-monitoring-cell');
    input.contentEditable='plaintext-only';input.setAttribute('role','textbox');
    input.setAttribute('aria-label',String.fromCharCode(65+c)+(r+1));
    input.onfocus=()=>{input.textContent=values[c];};
    input.oninput=()=>{
     const next=input.innerText.slice(0,500);
     if(input.innerText.length>500)input.textContent=next;
     values[c]=next;markDirty();
    };
    input.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();input.blur();}};
    input.onblur=()=>{restore.forEach(refresh=>refresh());};
    restore.push(()=>{if(document.activeElement!==input)input.textContent=display(values[c]);});
    cell.append(input);
   });
   if(workflow&&r>=4){
    if(r===4){
     for(const {label} of MONITORING_STEPS){const heading=el('th',label,'task-workflow-step');heading.scope='col';row.append(heading);}
     return;
    }
    const key='row_'+values[0],stage=progress?.stage||0;
    MONITORING_STEPS.forEach((step,position)=>{
     const cell=row.insertCell();cell.className='task-workflow-step';
     if(!entry){cell.textContent='Awaiting workflow publication';return;}
     const assigned=step.role==='exam'?workflow.examReviewers?.map(person=>person.name).join(' / '):entry.roles?.[step.role]?.name;
     const current=position===stage,complete=position<stage;
     const state=complete?'Completed':current?(assigned?'Action due':'Assignment needed'):'Waiting';
     cell.append(el('strong',state,'task-workflow-state'+(current?' is-current':complete?' is-complete':'')));
     if(assigned)cell.append(el('span',assigned));
     if(complete)cell.append(el('span',step.options[0][1]));
     const latest=progress?.history?.at(-1)?.label;
     if(current&&latest&&MONITORING_STEPS.some(stage=>stage.options.some(([value,label])=>value==='return'&&label===latest)))
      cell.append(el('span',latest));
     if(current&&staffView)cell.append(button('Update status',()=>openMonitoringStep(record,key,true)));
     if(position===Math.min(stage,MONITORING_STEPS.length-1)&&progress?.history?.length)
      cell.append(button('View history',()=>openMonitoringStep(record,key,staffView,false)));
    });
   }
  });
  scroll.replaceChildren(table);
 }
 drawSheet(index);
 editor.append(actions,scroll);
 editor.onsubmit=event=>{event.preventDefault();if(editing)run(()=>update('monitoring-save'));};
 card.append(editor);
}
function drawPrincipal(){if(suppliedFigures&&Object.hasOwn(store.tasks||{},suppliedFigures.taskId)){const task=store.tasks[suppliedFigures.taskId];task.draft.headers={...task.draft.headers,...suppliedFigures.headers};task.summary=taskSummary(task);}host.replaceChildren(el('h2','Create and manage tasks'));host.append(el('p','1. Create task → 2. Select classes → 3. Assign teachers → 4. Prepare shared questions → 5. Save and publish → 6. Track submissions.','task-flow-guide'));
 if(suppliedFigures){const banner=el('p',Object.keys(suppliedFigures.headers).length+(Object.hasOwn(store.tasks||{},suppliedFigures.taskId)?' supplied class rows are loaded into the shared draft. Review the figures, assign teachers, then Save and publish task.':' supplied class rows are ready. Create the Task 1 draft to load them.'),'task-import-ready');host.append(banner);}if(suppliedFiguresError)host.append(el('p',suppliedFiguresError,'task-error'));
 const actions=el('div',undefined,'task-actions');actions.append(button('Create Task 1 unpublished draft',async()=>{if(!discard())return;await admin({operation:'create-task1'});openPrincipalTask('task1',store.tasks.task1);message('Task 1 is an unpublished draft unless it was previously published. Existing content is preserved.');}),button('Create another task',()=>{if(!discard())return;newTask();}),button('Refresh tasks',async()=>{if(!discard())return;await admin({operation:'read'});drawPrincipal();}));actions.firstElementChild.hidden=!!store.tasks?.task1;host.append(actions);catalogue(host);}
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
 for(const c of [...t.summary.submitted,...(t.summary.archivedClasses||[])]){const report=t.reports[c],d=el('details',undefined,'task-report');d.dataset.reportClass=c;d.append(el('summary',c+' · '+(staff[report.submittedBy]?.name||report.submittedBy)),el('p','Updated '+new Date(report.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})));const figures=t.published?.headers?.[c]||t.draft.headers?.[c]||{},list=reportAnswers([...Object.entries(TASK_HEADERS).map(([key,label],index)=>({label:'Q'+(index+1)+'. '+label+' · View only',value:figures[key]??'Unprovided'})),...taskQuestions(report).map((q,index)=>({label:'Q'+(index+4)+'. '+taskQuestionWording(q.label),value:report.values[q.id],written:taskQuestionIsWritten(q)}))]);const archived=[];if(Object.keys(report.retiredAnswers||{}).length){const retired=el('details');retired.append(el('summary','Earlier answers to deleted or changed questions'));const oldList=reportAnswers(Object.values(report.retiredAnswers).map(answer=>({label:answer.label,value:answer.value,written:typeof answer.value==='string'})));retired.append(oldList);archived.push(retired);}d.append(list,...archived,el('h4',OVERALL_COMMENT_LABEL),el('p',report.values.remarks||'No additional remarks.','task-teacher-remarks'));if(report.principalEditedAt)d.append(el('p','Saved by Principal · '+new Date(report.principalEditedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),'task-save-confirmation'));d.append(button('Edit submitted answers — '+c,()=>{if(d.querySelector('.task-principal-report-editor'))return;principalReportEditor(d,card,id,t,c);}));results.append(d);}if(t.published)card.insertBefore(results,details);else card.append(results);
 const comment=form(),input=field(comment,'Principal comment (private, after results)','principal-comment','textarea',t.comment||'');input.maxLength=4000;comment.append(el('button','Save Principal comment'));comment.onsubmit=e=>{e.preventDefault();run(async()=>{await admin({operation:'comment',taskId:id,expectedRevision:t.revision,comment:input.value});comment.dataset.portalDirty='false';t.revision=store.tasks[id].revision;message('Principal comment saved.');});};if(t.published)results.append(comment);else card.append(comment);const closing=el('details',undefined,'task-closing-comments');closing.append(el('summary','Closing comments for the whole report'));const closingForm=form(),closingInputs={};for(const [key,label]of Object.entries(TASK_REPORT_COMMENTS)){const input=field(closingForm,label,'closing-'+key,'textarea',t.reportComments?.[key]||'');input.maxLength=4000;closingInputs[key]=input;}closingForm.append(el('button','Save closing report comments'));closingForm.onsubmit=event=>{event.preventDefault();run(async()=>{await admin({operation:'report-comments',taskId:id,expectedRevision:t.revision,comments:Object.fromEntries(Object.entries(closingInputs).map(([key,input])=>[key,input.value]))});closingForm.dataset.portalDirty='false';t.revision=store.tasks[id].revision;t.reportComments=store.tasks[id].reportComments;message('Closing report comments saved successfully. Available in the separate remarks annexure.');});};closing.append(el('p','Saved privately for this whole task. Saving does not automatically include these notes in exports. Open the separate RO / DC / AC remarks annexure to choose saved notes and download PDF or PPTX.'),closingForm);results.append(closing);
}
function principalReportEditor(parent,card,id,t,c){
 const old=t.reports[c],headers=t.published?.headers?.[c]||t.draft.headers?.[c]||{},editor=form(),inputs={};editor.className='task-principal-report-editor';editor.append(el('h4','Edit submitted answers — '+c),el('p','Edit this class report using its original submitted questions. Q1–Q3 stay read-only. Saving updates totals and the presentation; the original submitting teacher is retained.'));
 const participation=t.examParticipation?.rows?.[c];if(participation)editor.append(el('p','Exam pass rate uses '+participation.appeared+' appeared students · '+participation.exam+' (reference only).'));
 let n=3;for(const q of taskQuestions(old)){const written=q.kind==='text',input=field(editor,'Q'+(++n)+'. '+taskQuestionWording(q.label),q.id,written?'textarea':'number',old.values[q.id]??'');if(written){input.maxLength=10000;editor.append(remarkWordLimit(input,old.values[q.id]||''));}else{input.min='0';input.step='1';input.inputMode='numeric';if(q.kind==='students'&&headers.total!=null)input.max=String(q.id==='passed'&&Number.isSafeInteger(participation?.appeared)?Math.min(headers.total,participation.appeared):headers.total);}inputs[q.id]=input;}
 const remarks=field(editor,OVERALL_COMMENT_LABEL+' (optional)','principal-teacher-remarks','textarea',old.values.remarks||'');remarks.maxLength=10000;editor.append(remarkWordLimit(remarks,old.values.remarks||''));const actions=el('div',undefined,'task-actions');actions.append(el('button','Save submitted answers'),button('Cancel answer edits',()=>{if(editor.dataset.portalDirty==='true'&&!confirm('Discard these unsaved answer edits?'))return;editor.remove();}));editor.append(actions);editor.onsubmit=event=>{event.preventDefault();if([...card.querySelectorAll('form[data-portal-dirty="true"]')].some(f=>f!==editor)){message('Save other task edits and comments before saving these answers.',true);return;}run(async()=>{const values={remarks:remarks.value,...Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.tagName==='TEXTAREA'?input.value:input.value===''?null:Number(input.value)]))};await admin({operation:'edit-report',taskId:id,classId:c,expectedRevision:t.revision,reportRevision:old.revision||0,report:values});editor.dataset.portalDirty='false';drawAdminTask(card,id,store.tasks[id]);const saved=card.querySelector('[data-report-class="'+c+'"]');saved.open=true;saved.scrollIntoView({block:'start',behavior:'smooth'});message(c+' submitted answers saved successfully by Principal.');});};parent.append(editor);editor.scrollIntoView({block:'start',behavior:'smooth'});editor.querySelector('input,textarea')?.focus();
}
function teacherTaskHeading(task,tag='h2'){const heading=el(tag,undefined,'task-title-heading');if(task.priority===TASK_PRIORITIES[0]){heading.classList.add('task-urgent-heading');const icon=el('span','🚨','task-alarm-icon');icon.setAttribute('aria-hidden','true');heading.append(icon,el('span','Highly important · Most urgent','task-importance-label'),el('span',task.title,'task-heading-title'));}else heading.textContent=task.title;return heading;}
function drawStaff(){
 host.replaceChildren(el('h2','Published tasks'),el('p','The mentor list and submission status are open to everyone. Click Start & Submit Now for your class, then verify your existing personal PIN to open the questionnaire.'));
 host.append(button('Refresh status',async()=>{await load();}));
 if(store.monitoringPublishedAt){
  const plan=el('section',undefined,'task-card');
  plan.append(el('h3',MONITORING_TITLE),button('Open published plan',()=>openPublishedMonitoring()));
  host.append(plan);
 }
 if(!store.monitoringPublishedAt&&!Object.keys(store.tasks||{}).length){host.append(el('p','No tasks are currently published.'));return;}
 for(const [id,t]of Object.entries(store.tasks)){const card=el('section',undefined,'task-card task-public-card');card.append(teacherTaskHeading(t),el('p',t.priority+(t.deadline?' · Deadline: '+t.deadline:'')));const table=el('table',undefined,'task-public-list'),thead=el('thead'),heading=el('tr');for(const label of ['SN','Class','Prime mentor / Survey IC','Tech / analytical support','Status','Action'])heading.append(el('th',label));thead.append(heading);table.append(thead);const tbody=el('tbody');
  for(const row of t.rows||[]){const tr=el('tr');tr.dataset.taskClass=row.classId;for(const [label,value]of [['SN',row.number],['Class',row.classId],['Prime mentor / Survey IC',row.mentor],['Tech / analytical support',row.support||'—'],['Status',row.status]]){const td=el('td',label==='Status'&&value==='Submitted'?'✓ Submitted':String(value));td.dataset.label=label;if(label==='Status')td.className=row.status==='Submitted'?'task-row-submitted':'task-row-pending';tr.append(td);}const action=el('td'),start=button('Start & Submit Now',()=>startSurvey(id,row));action.dataset.label='Action';if(!row.staffId){start.disabled=true;action.append(el('small','Principal assignment needed'));}action.append(start);tr.append(action);tbody.append(tr);}table.append(tbody);card.append(table);host.append(card);
 }
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
async function initialize(){try{const modules=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);auth=modules[0].auth;authApi=modules[1];authApi.onAuthStateChanged(auth,current=>{closeTaskPresentation();epoch++;user=current;principal=false;selectedStaff='';store={tasks:{}};staff={};host.replaceChildren();navigation();load().catch(e=>message(e.message,true));});}catch(e){if(mode()==='staff')await load().catch(e=>message(e.message,true));else message('Principal authentication could not load. Check connectivity and retry.',true);}}
initialize();
