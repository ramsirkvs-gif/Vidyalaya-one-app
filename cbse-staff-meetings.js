import {renderRollObjectionForm} from './cbse-roll-objection-form.js';
import {objectionRoster} from './cbse-roll-objection-targets.js';
import {attendanceWings,attendanceRoles,minuteLanguages,meetingWriters} from './cbse-staff-meetings-model.js';
import {el,options} from './cbse-ui.js';
import {renderPrincipalLogin} from './cbse-principal-login.js';

const content=document.getElementById('meetings-content'),status=document.getElementById('meetings-status');
const chamber=document.querySelector('.meeting-actions a');
const staffButton=document.getElementById('meetings-staff'),manageButton=document.getElementById('meetings-manage');
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
 adminMode=false;staffButton.hidden=true;manageButton.hidden=false;
 if(location.hash==='#principal')history.replaceState(null,'',location.pathname+location.search);
 try{
  const result=await staffRead();
  content.replaceChildren(el('h2','Meeting register'));
  if(!result.meetings.length)content.append(el('p','No staff meetings have been recorded.'));
  for(const entry of result.meetings){
   const card=meetingCard(entry);
   if(entry.published)card.append(button('Read minutes / print',()=>showReport(entry.id)));
   const signin=el('div',undefined,'meeting-staff-signin');
   const attendance=el('section',undefined,'meeting-setup');
   attendance.append(el('h4','Attendance takers'));
   if(entry.attendanceTakers?.length)attendance.append(el('p',entry.attendanceTakers.map(person=>person.role+' · '+person.name).join(', ')),button('Attendance taker · Sign in with PIN',()=>showTaskLogin(entry,'attendance')));
   else attendance.append(el('p','No staff attendance taker is assigned.'));
   const minutes=el('section',undefined,'meeting-setup');minutes.append(el('h4','Minutes writers'));
   for(const [language,label]of minuteLanguages){
    const writers=meetingWriters(entry).filter(writer=>writer.language===language);
    if(!writers.length)continue;
    minutes.append(el('p',label+' · '+writers.map(writer=>writer.name).join(', ')));
    if(entry.submittedLanguages.includes(language))minutes.append(el('small','Submitted'));
    else minutes.append(button(label+' writer · Sign in with PIN',()=>showTaskLogin(entry,'minutes',language)));
   }
   if(!meetingWriters(entry).length)minutes.append(el('p','Awaiting writer assignment.'));
   signin.append(attendance,minutes);card.append(signin);
   content.append(card);
  }
 }catch(error){if(error.curtainRequired){adminMode=false;showCurtain();}else throw error;}
}
function meetingCard(entry){
 const card=el('article',undefined,'meeting-item');
 const [subject,...points]=(entry.agenda||'Meeting awaiting minutes').split('\n');
 card.append(el('h3',subject),el('p',stamp(entry.scheduledAt??entry.createdAt)),el('p','Assigned writers: '+(meetingWriters(entry).map(writer=>writer.name).join(', ')||'Awaiting assignment')));
 if(points.length)card.append(el('p',points.join('\n'),'meeting-minutes-text'));
 return card;
}
function showTaskLogin(entry,task,language){
 const takeAttendance=task==='attendance';
 content.replaceChildren(meetingCard(entry),el('h2',takeAttendance?'Take attendance':'Write meeting minutes'));
 const form=el('form'),people=takeAttendance?entry.attendanceTakers:meetingWriters(entry).filter(writer=>writer.language===language);
 const person=field(form,'Choose your name','select');person.required=true;
 options(person,[['','Choose your name'],...people.map(({id,name,role})=>[id,role?role+' · '+name:name])],people.length===1?people[0].id:'');
 const pin=password(form,'Personal PIN',true);form.append(el('button',takeAttendance?'Open attendance':'Open editable minutes'));
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const value=pin.value;pin.value='';
  const identity={id:entry.id,writerId:person.value};
  const {meeting}=await pinRequest(identity,value,{meetingOperation:'read',task,language});
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
const rosterLabel=person=>[person.name,person.designation,person.wing==='primary'?'Primary Wing':''].filter(Boolean).join(' · ');
function showAttendance(meeting,identity){
 if(!meeting.roster.length)throw Error('Ask the Principal to select expected attendees first.');
 content.replaceChildren(el('h2','Take attendance'),el('p',stamp(meeting.scheduledAt??meeting.createdAt)),el('p',attendanceWings.find(([value])=>value===meeting.attendanceWing)?.[1]||'Both wings'));
 const form=trackedForm(),{table,rows}=attendanceTable(['Staff member','Attendance']);
 const inputs=meeting.roster.map(person=>{
  const row=el('tr'),cell=el('td'),select=el('select');
  select.required=true;select.setAttribute('aria-label','Attendance for '+person.name);
  options(select,[['','Choose status'],['present','Present'],['absent','Not present']],meeting.attendance?.[person.id]||'');
  cell.append(select);row.append(el('td',rosterLabel(person)),cell);rows.append(row);return [person.id,select];
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
 content.replaceChildren(el('h2',principalEdit?'Edit submitted minutes':'Write meeting minutes'),el('p',stamp(meeting.scheduledAt??meeting.createdAt)));
 const form=trackedForm();
 const language=meeting.language;form.append(el('p',minuteLanguages.find(([id])=>id===language)?.[1]||'English'));
 const agenda=field(form,'Subject / Agenda','textarea');agenda.maxLength=500;agenda.rows=3;agenda.value=initial.agenda??meeting.meetingAgenda??'';
 const minutes=field(form,'Discussion & Minutes','textarea');minutes.className='meeting-minutes-input';minutes.maxLength=12000;minutes.value=initial.minutes||'';
 agenda.lang=minutes.lang=language;
 const pin=identity?password(form,'Personal PIN to save minutes',true):null;
 const submit=el('button',principalEdit?'Save Principal edits':'Submit minutes');submit.value=principalEdit?'minutes-edit':'minutes-submit';
 if(identity){const draft=el('button','Save / update draft');draft.value='minutes-draft';form.append(draft);}
 form.append(submit,button('Back',async()=>{if(canLeave())await (identity?showStaff():drawPrincipal());}));
 form.onsubmit=event=>{
  event.preventDefault();
  const operation=event.submitter?.value||submit.value;
  if(operation!=='minutes-draft'&&(!agenda.value.trim()||!minutes.value.trim())){message('Enter the subject / agenda and minutes before submitting.',true);return;}
  run(async()=>{
   const values={meetingOperation:operation,meetingId:meeting.id,expectedRevision:meeting.revision,agenda:agenda.value,minutes:minutes.value,language};
   const secret=pin?.value;if(pin)pin.value='';
   const result=await (identity?pinRequest(identity,secret,values):principalRequest(values));
   saved(result);form.dataset.portalDirty='false';
   if(operation==='minutes-draft'){meeting.revision=result.revision;message('Draft saved. Submit when the minutes are ready.');}
   else{await (principalEdit?showReport(meeting.id,true):showStaff());message(principalEdit?'Principal edits saved. Publish the report to share them.':'Minutes submitted for Principal publication.');}
  });
 };
 content.append(form);
}
async function showReport(id,principal=false){
 const {report}=await (principal?principalRequest({meetingOperation:'read',task:'report',meetingId:id}):staffRead(id));
 content.replaceChildren(el('h2','Staff meeting report'),el('p',stamp(report.scheduledAt??report.createdAt)));
 for(const version of report.versions){
  const section=el('section',undefined,'meeting-report-version');section.lang=version.language;
  const hindi=version.language==='hi';
  section.append(el('h3',hindi?'हिन्दी (राजभाषा) कार्यवृत्त':'English minutes'),el('h4',version.agenda,'meeting-minutes-text'),el('p',version.minutes,'meeting-minutes-text'),el('p',(hindi?'कार्यवृत्त लेखक: ':'Minute writer: ')+version.writerName));
  content.append(section);
 }
 const {table,rows}=attendanceTable(['Staff member','Attendance','Signature']);
 for(const [label,people]of [['Present',report.present||[]],['Not present',report.absent||[]],['Not marked',report.unmarked||[]]])for(const person of people){
  const row=el('tr');row.append(el('td',[person.name,person.designation].filter(Boolean).join(' · ')),el('td',label),el('td',label==='Present'?'':'—','meeting-signature'));rows.append(row);
 }
 content.append(el('h3','Staff attendance'),table);
 if(report.writers?.length)content.append(el('p','Assigned writers: '+report.writers.map(writer=>writer.name+' ('+(writer.language==='hi'?'Hindi':'English')+')').join(', ')));
 const signatures=el('div',undefined,'meeting-signatures');
 signatures.append(el('p','Attendance recorded by: '+(report.attendanceTakenBy||'________________'),undefined),el('p','Attendance signature: __________________'),el('p','Principal signature: __________________'));
 content.append(signatures);
 const actions=el('div',undefined,'meeting-actions no-print');
 actions.append(button('Print / Save as PDF',async()=>{await Promise.allSettled([...document.querySelectorAll('.meeting-letterhead img')].map(img=>img.decode()));window.print();}),button('Back to meeting register',()=>adminMode?drawPrincipal():showStaff()));
 content.append(actions);
}
async function showPrincipal(){
 staffButton.hidden=false;manageButton.hidden=true;
 if(!auth){
  const [client,module]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
  auth=client.auth;authApi=module;
 }
 await auth.authStateReady();
 if(!watching){
  watching=true;
  authApi.onAuthStateChanged(auth,user=>{if(!user&&adminMode){adminMode=false;content.replaceChildren();if(!busy)run(showStaff);}});
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
 const {meetings,roster,recipientStaff={},assignments={}}=await principalRequest({meetingOperation:'read'});
 await request({action:'remember-view'},true);
 adminMode=true;
 content.replaceChildren(el('h2','Manage staff meetings'));
 const meetingId=crypto.randomUUID().replaceAll('-','');
 const create=trackedForm(),date=field(create,'Meeting date'),time=field(create,'Meeting time (IST)'),agenda=field(create,'Meeting agenda','textarea');
 date.type='date';time.type='time';date.required=time.required=agenda.required=true;agenda.maxLength=500;agenda.rows=3;
 create.append(el('button','Create meeting'));
 create.onsubmit=event=>{event.preventDefault();run(async()=>{
  saved(await principalRequest({meetingOperation:'create',meetingId,meetingDate:date.value,meetingTime:time.value,meetingAgenda:agenda.value}));
  create.dataset.portalDirty='false';await drawPrincipal();message('Meeting created. Its date, time and agenda are visible in staff view.');
 });};
 content.append(create);

 const choices=[['','Choose a staff member'],...roster.map(person=>[person.id,rosterLabel(person)])];
 const lookup=new Map();
 for(const wing of ['secondary','primary'])for(const teacher of objectionRoster(recipientStaff,wing,undefined,assignments))for(const id of teacher.ids)lookup.set(id,teacher);

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
  const picker=el('div');
  attendance.append(el('h4','Expected attendees'),picker);
  const snapshots=entry.roster||[],selected=new Set(entry.expectedAttendees??snapshots.map(person=>person.id));
  const wingOf=person=>person.wing||recipientStaff[person.id]?.wing||'';
  const eligible=()=>snapshots.filter(person=>wing.value==='both'||person.id==='principal'||wingOf(person)===wing.value);
  const drawPicker=()=>{
   picker.replaceChildren();
   const visible=eligible().map(person=>{
    const details=lookup.get(person.id);
    return {...person,roles:details?.roles||[],subjects:details?.subjects||[],isCT:!!details?.isCT};
   });
   renderRollObjectionForm(picker,{wing:wing.value,selection:{roster:visible,selectedIds:[...selected],heldIds:entry.heldAttendees||[],onChange:ids=>{
    for(const person of visible)selected.delete(person.id);
    for(const id of ids)selected.add(id);
    attendance.dataset.portalDirty='true';
   }}});
  };
  wing.onchange=drawPicker;drawPicker();
  attendance.append(el('button','Save attendance assignments and expected list'));
  attendance.onsubmit=e=>{e.preventDefault();saveConfig(attendance,entry,{meetingOperation:'attendance-assign',attendanceWing:wing.value,expectedAttendees:eligible().filter(person=>selected.has(person.id)).map(person=>person.id),attendanceTakers:takers.filter(([,select])=>select.value).map(([role,select])=>({role,id:select.value}))});};
  attendanceSection.append(attendance,button('Take attendance as Principal',async()=>{
   if(!canLeave())return;
   const {meeting}=await principalRequest({meetingOperation:'read',task:'attendance',meetingId:entry.id});showAttendance(meeting);
  }));

  const writerSection=editorSection('2. Minutes writers'),writerForm=trackedForm(),rows=el('div'),writers=new Set();
  const updateRemove=()=>{for(const button of rows.querySelectorAll('button'))button.hidden=writers.size===1;};
  writerForm.append(rows);
  const addWriter=value=>{
   const row=el('div',undefined,'meeting-actions meeting-writer-row'),writer=field(row,'Assigned minute writer','select');writer.required=true;
   const language=field(row,'Writer language','select');options(language,minuteLanguages,value.language||'en');
   options(writer,choices,value.id);const selection={writer,language};writers.add(selection);
   const remove=el('button','Remove writer');remove.type='button';
   remove.onclick=()=>{if(writers.size===1)return;writers.delete(selection);row.remove();updateRemove();writerForm.dataset.portalDirty='true';};
   row.append(remove);rows.append(row);updateRemove();
  };
  const assigned=meetingWriters(entry);
  for(const writer of assigned.length?assigned:[{id:''}])addWriter(writer);
  const add=el('button','Add another writer');add.type='button';add.onclick=()=>{addWriter({id:''});writerForm.dataset.portalDirty='true';};
  writerForm.append(add,el('button','Save writer assignments'));
  writerForm.onsubmit=e=>{e.preventDefault();saveConfig(writerForm,entry,{meetingOperation:'assign',writers:[...writers].map(({writer,language})=>({id:writer.value,language:language.value}))});};
  writerSection.append(writerForm);

  const minutes=editorSection('3. Minutes · Hindi (Rajbhasha) / English');
  for(const [language,label]of minuteLanguages)if(entry.submittedLanguages.includes(language))minutes.append(button('Edit '+label+' minutes',async()=>{
   if(!canLeave())return;
   const {meeting}=await principalRequest({meetingOperation:'read',task:'minutes',meetingId:entry.id,language});showEditor(meeting);
  }));
  if(entry.submittedLanguages.length)minutes.append(button('Preview report / print',()=>{if(canLeave())return showReport(entry.id,true);}),button(entry.published?'Update published report':'Publish report',async()=>{
   if(!canLeave())return;
   saved(await principalRequest({meetingOperation:'publish',meetingId:entry.id,expectedRevision:entry.revision}));
   await drawPrincipal();message('Report published to staff view.');
  }));
  else minutes.append(el('p','Waiting for assigned writers to submit.'));
  if(entry.published)minutes.append(button('Stop publication',async()=>{
   if(!canLeave())return;
   saved(await principalRequest({meetingOperation:'unpublish',meetingId:entry.id,expectedRevision:entry.revision}));
   await drawPrincipal();message('Report hidden from staff view.');
  }));
  card.append(attendanceSection,writerSection,minutes);content.append(card);
 }
 content.append(button('Sign out as Principal',async()=>{if(canLeave()){await authApi.signOut(auth);await showStaff();}}));
}
staffButton.onclick=()=>{if(canLeave())run(showStaff);};
manageButton.onclick=()=>{
 if(!canLeave())return;
 run(async()=>{history.replaceState(null,'','#principal');await showPrincipal();});
};
chamber.onclick=event=>{if(!canLeave())event.preventDefault();};
run(location.hash==='#principal'?showPrincipal:showStaff);
