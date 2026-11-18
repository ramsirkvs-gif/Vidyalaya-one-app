import {attendanceWings,attendanceRoles,minuteLanguages,meetingWriters} from './cbse-staff-meetings-model.js';
import {el,options} from './cbse-ui.js';
import {renderPrincipalLogin} from './cbse-principal-login.js';

const content=document.getElementById('meetings-content'),status=document.getElementById('meetings-status');
const chamber=document.querySelector('.meeting-actions a');
const staffButton=document.getElementById('meetings-staff'),principalButton=document.getElementById('meetings-principal');
const ist=new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Kolkata'});
const stamp=ms=>ist.format(ms)+' IST';
let busy=false,auth,authApi,watching=false,adminMode=false;
const dirty=()=>!!content.querySelector('form[data-portal-dirty="true"]');
const canLeave=()=>!dirty()||confirm('Discard unsaved meeting changes?');

function message(text,error=false){
 status.textContent=text;status.classList.toggle('meeting-error',error);
}

async function request(input,principal=false){
 const user=principal?auth?.currentUser:null;
 if(principal&&!user)throw Error('Sign in as Principal to continue.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const token=user?await user.getIdToken():'';
  const response=await fetch('/api/staff-access',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(input)});
  const value=await response.json();
  if(user&&auth.currentUser?.uid!==user.uid)throw Error('The Principal session changed. Sign in again.');
  if(!response.ok)throw Object.assign(Error(value.error||'The meeting request could not be completed.'),{curtainRequired:value.curtainRequired,status:response.status});
  return value;
 }catch(error){
  if(error.name==='AbortError')throw Error('The request timed out. Check the meeting register before trying again.');
  throw error;
 }finally{clearTimeout(timeout);}
}

async function run(fn){
 if(busy)return;
 busy=true;document.documentElement.dataset.portalBusy='true';
 const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(node=>!node.disabled);
 for(const node of controls)node.disabled=true;
 message('Please wait…');
 try{await fn();if(status.textContent==='Please wait…')message('');}
 catch(error){message(error.message,true);}
 finally{
  busy=false;document.documentElement.dataset.portalBusy='false';
  for(const node of controls)node.disabled=false;
 }
}

function button(text,fn){
 const button=el('button',text);button.type='button';button.onclick=()=>run(fn);return button;
}
function field(form,text,tag='input'){
 const label=el('label',text),input=el(tag);input.setAttribute('aria-label',text);label.append(input);form.append(label);return input;
}
function trackedForm(){
 const form=el('form');form.dataset.portalTrackDirty='true';
 form.addEventListener('input',()=>{form.dataset.portalDirty='true';});return form;
}
function password(form,label,numeric=false){
 const pin=field(form,label);pin.type='password';pin.autocomplete='off';pin.required=true;
 if(numeric)pin.inputMode='numeric';
 return pin;
}
function saved(value){
 if(value.ok!==true)throw Error('The save was not confirmed. Check the register before retrying.');
}
const staffRead=(meetingId)=>request({action:'staff-meetings-read',meetingId});
const principalRequest=values=>request({action:'staff-meetings-principal',...values},true);
const pinRequest=(entry,pin,values)=>request({action:'pin-submit',operation:'staff-meetings',staffId:entry.writerId,meetingId:entry.id,pin,...values});

function showCurtain(){
 content.replaceChildren(el('h2','Staff viewing access'));
 const form=el('form'),input=password(form,'Staff viewing password');form.append(el('button','Open meeting register'));
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const secret=input.value;input.value='';
  await request({action:'view-login',password:secret});await showStaff();
 });};
 content.append(form);
}

async function showStaff(){
 try{
  const result=await staffRead();adminMode=false;
  content.replaceChildren(el('h2','Meeting register'));
  if(!result.meetings.length)content.append(el('p','No staff meetings have been recorded.'));
  for(const entry of result.meetings){
   const card=meetingCard(entry);
   if(entry.savedAt)card.append(button('Read minutes / print',()=>showReport(entry.id)));
   if(!entry.savedAt&&meetingWriters(entry).length)card.append(button('Minutes writers · Sign in',()=>showTaskLogin(entry,'minutes')));
   if(entry.attendanceTakers?.length)card.append(button('Take attendance · Sign in',()=>showTaskLogin(entry,'attendance')));
   content.append(card);
  }
 }catch(error){if(error.curtainRequired){adminMode=false;showCurtain();}else throw error;}
}
function meetingCard(entry){
 const card=el('article',undefined,'meeting-item');
 const [subject,...points]=(entry.agenda||'Meeting awaiting minutes').split('\n');
 card.append(el('h3',subject),el('p',stamp(entry.createdAt)),el('p','Assigned writers: '+(meetingWriters(entry).map(writer=>writer.name).join(', ')||'Awaiting assignment')));
 if(points.length)card.append(el('p',points.join('\n'),'meeting-minutes-text'));
 return card;
}
function showTaskLogin(entry,task){
 const takeAttendance=task==='attendance';
 content.replaceChildren(meetingCard(entry),el('h2',takeAttendance?'Take attendance':'Write meeting minutes'));
 const form=el('form'),people=takeAttendance?entry.attendanceTakers:meetingWriters(entry);
 const person=field(form,'Choose your name','select');person.required=true;
 options(person,[['','Choose your name'],...people.map(({id,name,role})=>[id,role?role+' · '+name:name])],people.length===1?people[0].id:'');
 const pin=password(form,'Personal PIN',true);form.append(el('button',takeAttendance?'Open attendance':'Open editable minutes'));
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const value=pin.value;pin.value='';
  const identity={id:entry.id,writerId:person.value};
  const {meeting}=await pinRequest(identity,value,{meetingOperation:'read',task});
  if(takeAttendance)showAttendance(meeting,identity);
  else showEditor(meeting,identity);
 });};
 content.append(form,button('Back to meeting register',showStaff));
}
function attendanceTable(headers){
 const table=el('table',undefined,'meeting-attendance'),head=el('thead'),heading=el('tr'),rows=el('tbody');
 for(const text of headers){const cell=el('th',text);cell.scope='col';heading.append(cell);}
 head.append(heading);table.append(head,rows);return {table,rows};
}
function showAttendance(meeting,identity){
 content.replaceChildren(el('h2','Take attendance'),el('p',stamp(meeting.createdAt)),el('p',attendanceWings.find(([value])=>value===meeting.attendanceWing)?.[1]||'Both wings'));
 const form=trackedForm(),{table,rows}=attendanceTable(['Staff member','Attendance']);
 const inputs=meeting.roster.map(person=>{
  const row=el('tr'),cell=el('td'),select=el('select');
  select.required=true;select.setAttribute('aria-label','Attendance for '+person.name);
  options(select,[['','Choose status'],['present','Present'],['absent','Not present']],meeting.attendance?.[person.id]||'');
  cell.append(select);row.append(el('td',[person.name,person.designation].filter(Boolean).join(' · ')),cell);rows.append(row);return [person.id,select];
 });
 form.append(table);
 const pin=identity?password(form,'Personal PIN to save attendance',true):null;
 form.append(el('button','Save / update attendance'),button('Back',async()=>{if(canLeave())await (identity?showStaff():drawPrincipal());}));
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const values={meetingOperation:'attendance-save',meetingId:meeting.id,expectedRevision:meeting.revision,attendance:Object.fromEntries(inputs.map(([id,input])=>[id,input.value]))};
  const secret=pin?.value;if(pin)pin.value='';
  saved(await (identity?pinRequest(identity,secret,values):principalRequest(values)));
  form.dataset.portalDirty='false';await (identity?showStaff():drawPrincipal());message('Attendance saved.');
 });};
 content.append(form);
}
function showEditor(meeting,identity){
 const principalEdit=!identity,initial=principalEdit?meeting:meeting.draft||meeting;
 content.replaceChildren(el('h2',principalEdit?'Edit submitted minutes':'Write meeting minutes'),el('p',stamp(meeting.createdAt)));
 const form=trackedForm();
 const language=field(form,'Minutes language','select');options(language,minuteLanguages,initial.language||'en');
 const agenda=field(form,'Subject / Agenda','textarea');agenda.maxLength=500;agenda.rows=3;agenda.value=initial.agenda||'';
 const minutes=field(form,'Discussion & Minutes','textarea');minutes.className='meeting-minutes-input';minutes.maxLength=12000;minutes.value=initial.minutes||'';
 const syncLanguage=()=>{agenda.lang=minutes.lang=language.value;};language.onchange=syncLanguage;syncLanguage();
 const pin=identity?password(form,'Personal PIN to save minutes',true):null;
 const submit=el('button',principalEdit?'Save Principal edits':'Submit minutes');submit.value=principalEdit?'minutes-edit':'minutes-submit';
 if(identity){const draft=el('button','Save / update draft');draft.value='minutes-draft';form.append(draft);}
 form.append(submit,button('Back',async()=>{if(canLeave())await (identity?showStaff():drawPrincipal());}));
 form.onsubmit=event=>{
  event.preventDefault();
  const operation=event.submitter?.value||submit.value;
  if(operation!=='minutes-draft'&&(!agenda.value.trim()||!minutes.value.trim())){message('Enter the subject / agenda and minutes before submitting.',true);return;}
  run(async()=>{
   const values={meetingOperation:operation,meetingId:meeting.id,expectedRevision:meeting.revision,agenda:agenda.value,minutes:minutes.value,language:language.value};
   const secret=pin?.value;if(pin)pin.value='';
   const result=await (identity?pinRequest(identity,secret,values):principalRequest(values));
   saved(result);form.dataset.portalDirty='false';
   if(operation==='minutes-draft'){meeting.revision=result.revision;message('Draft saved. Submit when the minutes are ready.');}
   else{await showReport(meeting.id);message(principalEdit?'Principal edits saved.':'Minutes submitted and available in staff view.');}
  });
 };
 content.append(form);
}
async function showReport(id){
 const {report}=await staffRead(id);
 content.replaceChildren(el('h2',report.agenda,'meeting-minutes-text'),el('p',stamp(report.createdAt)),el('p','Minute writer: '+report.writerName),el('p',minuteLanguages.find(([id])=>id===report.language)?.[1]||'English'),
  el('h3','Discussion and decisions'),el('p',report.minutes,'meeting-minutes-text'));
 const {table,rows}=attendanceTable(['Staff member','Attendance','Signature']);
 for(const [label,people]of [['Present',report.present],['Not present',report.absent],['Not marked',report.unmarked||[]]])for(const person of people){
  const row=el('tr');row.append(el('td',[person.name,person.designation].filter(Boolean).join(' · ')),el('td',label),el('td',label==='Present'?'':'—','meeting-signature'));rows.append(row);
 }
 content.append(el('h3','Staff attendance'),table);
 const actions=el('div',undefined,'meeting-actions no-print');
 actions.append(button('Print / Save as PDF',async()=>{await Promise.allSettled([...document.querySelectorAll('.meeting-letterhead img')].map(img=>img.decode()));window.print();}),button('Back to meeting register',()=>adminMode?drawPrincipal():showStaff()));
 content.append(actions);
}
async function showPrincipal(){
 if(!auth){
  const [client,module]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
  auth=client.auth;authApi=module;
 }
 await auth.authStateReady();
 if(!watching){
  watching=true;
  authApi.onAuthStateChanged(auth,user=>{if(!user&&adminMode){adminMode=false;showPrincipalLogin();}});
 }
 if(auth.currentUser){
  try{await drawPrincipal();return;}
  catch(error){if(![401,403].includes(error.status))throw error;}
 }
 showPrincipalLogin();
}
function showPrincipalLogin(){
 content.replaceChildren(el('h2','Principal sign-in'));
 renderPrincipalLogin(content,async secret=>{
  try{await authApi.signInWithEmailAndPassword(auth,'ramsirkvs@gmail.com',secret);}
  catch(error){if(/invalid-credential|wrong-password|user-not-found/.test(error.code||''))throw Error('Principal password is incorrect.');throw error;}
  await drawPrincipal();
 });
}
async function drawPrincipal(){
 const {meetings,roster}=await principalRequest({meetingOperation:'read'});
 await request({action:'remember-view'},true);
 adminMode=true;
 content.replaceChildren(el('h2','Manage staff meetings'));
 const meetingId=crypto.randomUUID().replaceAll('-','');
 content.append(button('Create meeting',async()=>{saved(await principalRequest({meetingOperation:'create',meetingId}));await drawPrincipal();message('Meeting created with the current date and time.');}));
 const choices=[['','Choose a staff member'],...roster.map(person=>[person.id,[person.name,person.designation].filter(Boolean).join(' · ')])];
 function editorSection(title){const section=el('details',undefined,'meeting-setup');section.append(el('summary',title));return section;}
 function saveConfig(form,entry,values){
  return run(async()=>{
   saved(await principalRequest({meetingId:entry.id,expectedRevision:entry.revision,...values}));
   form.dataset.portalDirty='false';await drawPrincipal();message('Meeting assignments saved.');
  });
 }
 for(const entry of meetings){
  const card=meetingCard(entry);
  const attendanceSection=editorSection('1. Take attendance · '+(attendanceWings.find(([id])=>id===entry.attendanceWing)?.[1]||'Both wings'));
  const attendance=trackedForm(),wing=field(attendance,'Attendance wings','select');
  options(wing,attendanceWings,entry.attendanceWing);
  attendance.append(el('p','Principal can take attendance. Assign additional senior teachers below.'));
  const takers=attendanceRoles.map(role=>{
   const fieldNode=field(attendance,role,'select');options(fieldNode,choices,entry.attendanceTakers?.find(person=>person.role===role)?.id||'');
   return [role,fieldNode];
  });
  attendance.append(el('button','Save attendance assignments'));
  attendance.onsubmit=e=>{e.preventDefault();saveConfig(attendance,entry,{meetingOperation:'attendance-assign',attendanceWing:wing.value,attendanceTakers:takers.filter(([,select])=>select.value).map(([role,select])=>({role,id:select.value}))});};
  attendanceSection.append(attendance,button('Take attendance as Principal',async()=>{
   if(!canLeave())return;
   const {meeting}=await principalRequest({meetingOperation:'read',task:'attendance',meetingId:entry.id});showAttendance(meeting);
  }));

  const writerSection=editorSection('2. Minutes writers'),writerForm=trackedForm(),rows=el('div'),writers=new Set();
  const updateRemove=()=>{for(const button of rows.querySelectorAll('button'))button.hidden=writers.size===1;};
  writerForm.append(rows);
  const addWriter=value=>{
   const row=el('div',undefined,'meeting-actions meeting-writer-row'),writer=field(row,'Assigned minute writer','select');writer.required=true;
   options(writer,choices,value);writers.add(writer);
   const remove=el('button','Remove writer');remove.type='button';
   remove.onclick=()=>{if(writers.size===1)return;writers.delete(writer);row.remove();updateRemove();writerForm.dataset.portalDirty='true';};
   row.append(remove);rows.append(row);updateRemove();
  };
  const assigned=meetingWriters(entry);
  for(const writer of assigned.length?assigned:[{id:''}])addWriter(writer.id);
  const add=el('button','Add another writer');add.type='button';add.onclick=()=>{addWriter('');writerForm.dataset.portalDirty='true';};
  writerForm.append(add,el('button','Save writer assignments'));
  writerForm.onsubmit=e=>{e.preventDefault();saveConfig(writerForm,entry,{meetingOperation:'assign',writerIds:[...writers].map(writer=>writer.value)});};
  writerSection.append(writerForm);

  const minutes=editorSection('3. Minutes · Hindi (Rajbhasha) / English');
  if(entry.savedAt)minutes.append(button('Edit submitted minutes',async()=>{
   if(!canLeave())return;
   const {meeting}=await principalRequest({meetingOperation:'read',task:'minutes',meetingId:entry.id});showEditor(meeting);
  }),button('Read minutes / print',()=>{if(canLeave())return showReport(entry.id);}));
  else minutes.append(el('p','Waiting for the assigned writers to submit.'));
  card.append(attendanceSection,writerSection,minutes);content.append(card);
 }
 content.append(button('Sign out as Principal',async()=>{if(canLeave())await authApi.signOut(auth);}));
}
staffButton.onclick=()=>{if(canLeave())run(showStaff);};
principalButton.onclick=()=>{if(canLeave())run(showPrincipal);};
chamber.onclick=event=>{if(!canLeave())event.preventDefault();};
run(showStaff);
