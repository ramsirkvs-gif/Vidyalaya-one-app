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
let busy=false,auth,authApi,watching=false,adminMode=false,savedSetupId=null;
function canLeave(except){
 const pending=[...content.querySelectorAll('form[data-portal-dirty="true"]')].filter(form=>!(Array.isArray(except)?except:[except]).includes(form));
 if(!pending.length)return true;
 const sections=[...new Set(pending.map(form=>form.dataset.meetingSection))];
 return confirm('Unsaved changes in '+sections.join(', ')+'. Discard these changes?');
}

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

async function run(fn,activeButton,feedback){
 if(busy)return;
 busy=true;document.documentElement.dataset.portalBusy='true';
 const controls=(activeButton?[activeButton]:[...document.querySelectorAll('button,input,select,textarea')]).filter(node=>!node.disabled);
 const report=feedback||message;
 for(const node of controls)node.disabled=true;
 if(!feedback)message('Please wait…');
 try{await fn();if(!feedback&&status.textContent==='Please wait…')message('');}
 catch(error){report(error.message,true);}
 finally{
  busy=false;document.documentElement.dataset.portalBusy='false';
  for(const node of controls)node.disabled=false;
 }
}

function button(text,fn){
 const button=el('button',text);button.type='button';button.onclick=()=>run(fn,button);return button;
}
function field(form,text,tag='input'){
 const label=el('label',text),input=el(tag);input.setAttribute('aria-label',text);label.append(input);form.append(label);return input;
}
function trackedForm(section){
 const form=el('form');form.dataset.meetingSection=section;
 form.addEventListener('input',event=>{
  if(!event.target.closest('.roll-objection-form'))form.dataset.portalDirty='true';
 });
 return form;
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
 content.replaceChildren(el('h2','Staff viewing access'),el('p','Enter the shared staff viewing password once to remember access on this browser.'));
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
  const activeMeetings=result.meetings.filter(entry=>!entry.completed);
  if(activeMeetings.length)content.append(button('Take attendance as Principal',()=>choosePrincipalAttendance(activeMeetings)));
  if(!result.meetings.length)content.append(el('p','No staff meetings have been recorded.'));
  for(const entry of activeMeetings){
   const card=meetingCard(entry,false);
   const actions=el('div',undefined,'meeting-actions');
   if(entry.attendanceTakers?.length){
    const attendance=button('Attendance taker · PIN',()=>showTaskLogin(entry,'attendance'));
    attendance.title=entry.attendanceTakers.map(person=>person.role+' · '+person.name).join(', ');
    actions.append(attendance);
   }
   for(const [language,label]of minuteLanguages){
    if(entry.submittedLanguages.includes(language)){
     actions.append(el('span',label+' minutes submitted'));
     continue;
    }
    const writers=meetingWriters(entry).filter(writer=>writer.language===language);
    if(!writers.length)continue;
    const signIn=button(entry.returnedLanguages?.includes(language)?'Revise '+label+' minutes · PIN':label+' writer · PIN',()=>showTaskLogin(entry,'minutes',language));
    signIn.title=writers.map(writer=>writer.name).join(', ');
    actions.append(signIn);
   }
   if(actions.childElementCount)card.append(actions);
   content.append(card);
  }
  const published=el('section',undefined,'meeting-register-section');
  published.append(el('h3','Published Meeting Minutes'));
  const reports=result.meetings.filter(entry=>entry.published)
   .sort((a,b)=>(b.scheduledAt??b.createdAt)-(a.scheduledAt??a.createdAt));
  if(reports.length){
   const {table,rows}=attendanceTable(['Meeting / agenda','Date and time','Report','Upload signed minutes']);
   table.classList.add('meeting-published-table');
   for(const entry of reports){
    const row=el('tr'),action=el('td');
    action.append(button('Read minutes / print',()=>showReport(entry.id)));
    const signed=el('td');
    signed.append(button(entry.signedMinutesRevision?'Replace signed PDF':'Upload signed PDF',()=>showSignedUploadChoices(entry)));
    if(entry.signedMinutesRevision)signed.append(button('Download signed PDF',()=>downloadSignedMinutes(entry)));
    row.append(el('td',entry.agenda||'Staff meeting'),el('td',stamp(entry.scheduledAt??entry.createdAt)),action,signed);
    rows.append(row);
   }
   published.append(table);
  }else published.append(el('p','No meeting minutes have been published.','meeting-register-empty'));
  content.append(published);
 }catch(error){if(error.curtainRequired){adminMode=false;showCurtain();}else throw error;}
}
function showSignedUploadChoices(entry){
 content.replaceChildren(meetingCard(entry,false),el('h2','Upload signed minutes'));
 if(meetingWriters(entry).length)content.append(button('Upload with writer PIN',()=>showSignedUpload(entry,false,showStaff)));
 content.append(button('Upload as Principal',()=>showPrincipal(()=>showSignedUpload(entry,true,showStaff))),
  button('Back to meeting register',showStaff));
}
function showSignedUpload(entry,principal,back){
 adminMode=principal;
 content.replaceChildren(meetingCard(entry,false),el('h2','Upload signed minutes'));
 const form=el('form');
 const file=field(form,'Signed PDF (up to 2 MB)');
 file.type='file';file.accept='.pdf,application/pdf';file.required=true;
 let person,pin;
 if(!principal){
  const writers=[...new Map(meetingWriters(entry).map(writer=>[writer.id,writer])).values()];
  person=field(form,'Choose your name','select');person.required=true;
  options(person,[['','Choose your name'],...writers.map(({id,name})=>[id,name])],writers.length===1?writers[0].id:'');
  pin=password(form,'Personal PIN',true);
 }
 const submit=el('button',entry.signedMinutesRevision?'Replace signed PDF':'Upload signed PDF');
 form.append(submit,button('Back to meeting register',back));
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const selected=file.files[0];
  if(!selected||selected.size>2097152)throw Error('Choose a PDF up to 2 MB.');
  const secret=pin?.value;
  if(pin)pin.value='';
  const pdf=await new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result.split(',')[1]);
   reader.onerror=()=>reject(Error('The PDF could not be read.'));
   reader.readAsDataURL(selected);
  });
  const values={meetingOperation:'signed-upload',meetingId:entry.id,expectedSignedRevision:entry.signedMinutesRevision||0,pdf};
  saved(await (principal?principalRequest(values):pinRequest({id:entry.id,writerId:person.value},secret,values)));
  await back();
  message('Signed minutes uploaded.');
 },submit);};
 content.append(form);
}
async function downloadSignedMinutes(entry){
 const {pdf}=await request({action:'staff-meetings-read',meetingId:entry.id,task:'signed-minutes'});
 const bytes=Uint8Array.from(atob(pdf),character=>character.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const link=el('a');link.href=url;link.download='signed-meeting-minutes.pdf';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function choosePrincipalAttendance(meetings){
 content.replaceChildren(el('h2','Take attendance as Principal'));
 const form=el('form'),meeting=field(form,'Choose a meeting','select');
 meeting.required=true;
 options(meeting,[['','Choose a meeting'],...meetings.map(entry=>[
  entry.id,(entry.agenda||'Meeting awaiting minutes').split('\n')[0]+' · '+stamp(entry.scheduledAt??entry.createdAt)
 ])],meetings.length===1?meetings[0].id:'');
 const actions=el('div',undefined,'meeting-actions');
 actions.append(el('button','Continue'),button('Back to meeting register',showStaff));
 form.append(actions);
 form.onsubmit=event=>{
  event.preventDefault();
  const entry=meetings.find(item=>item.id===meeting.value);
  if(entry)run(()=>showPrincipal(()=>openPrincipalAttendance(entry)),event.submitter);
 };
 content.append(form);
}
function meetingCard(entry,showWriters=true,headingTag='h3'){
 const card=el('article',undefined,'meeting-item');
 const [subject,...points]=(entry.agenda||'Meeting awaiting minutes').split('\n');
 card.append(el(headingTag,subject),el('p',stamp(entry.scheduledAt??entry.createdAt)));
 if(showWriters)card.append(el('p','Assigned writers: '+(meetingWriters(entry).map(writer=>writer.name).join(', ')||'Awaiting assignment')));
 if(points.length)card.append(el('p',points.join('\n'),'meeting-minutes-text'));
 return card;
}
function showTaskLogin(entry,task,language){
 const takeAttendance=task==='attendance';
 content.replaceChildren(meetingCard(entry),el('h2',takeAttendance?'Take attendance':'Write meeting minutes'));
 const form=el('form'),people=takeAttendance?entry.attendanceTakers:meetingWriters(entry).filter(writer=>writer.language===language);
 const person=field(form,'Choose your name','select');person.required=true;
 options(person,[['','Choose your name'],...people.map(({id,name,role})=>[id,role?role+' · '+name:name])],people.length===1?people[0].id:'');
 const pin=password(form,'Personal PIN',true);
 const actions=el('div',undefined,'meeting-actions');
 actions.append(el('button',takeAttendance?'Open attendance':'Open editable minutes'),button('Back to meeting register',showStaff));
 form.append(actions);
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const value=pin.value;pin.value='';
  const identity={id:entry.id,writerId:person.value};
  const {meeting}=await pinRequest(identity,value,{meetingOperation:'read',task,language});
  if(takeAttendance)showAttendance(meeting,identity);
  else showEditor(meeting,identity);
 });};
 content.append(form);
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
 const form=trackedForm('Take attendance'),{table,rows}=attendanceTable(['Staff member','Attendance']);
 const inputs=meeting.roster.map(person=>{
  const row=el('tr'),cell=el('td'),select=el('select');
  select.required=true;select.setAttribute('aria-label','Attendance for '+person.name);
  options(select,[['','Choose status'],['present','Present'],['absent','Not present']],meeting.attendance?.[person.id]||'');
  cell.append(select);row.append(el('td',rosterLabel(person)),cell);rows.append(row);return [person.id,select];
 });
 form.append(table);
 const pin=identity?password(form,'Personal PIN to save attendance',true):null;
 const actions=el('div',undefined,'meeting-actions');
 actions.append(el('button','Save / update attendance'),button('Back',async()=>{if(canLeave())await (identity?showStaff():drawPrincipal());}));
 form.append(actions);
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
 const form=trackedForm('Minutes');
 if(meeting.returnedAt)form.append(el('p','The Principal returned these minutes for revision. Edit and submit them again.'));
 const language=meeting.language;form.append(el('p',minuteLanguages.find(([id])=>id===language)?.[1]||'English'));
 const agenda=field(form,'Subject / Agenda','textarea');agenda.maxLength=500;agenda.rows=3;agenda.value=initial.agenda??meeting.meetingAgenda??'';
 const minutes=field(form,'Discussion & Minutes','textarea');minutes.className='meeting-minutes-input';minutes.maxLength=12000;minutes.value=initial.minutes||'';
 agenda.lang=minutes.lang=language;
 const pin=identity?password(form,'Personal PIN to save minutes',true):null;
 const submit=el('button',principalEdit?'Save Principal edits':'Submit minutes');submit.value=principalEdit?'minutes-edit':'minutes-submit';
 const actions=el('div',undefined,'meeting-actions meeting-minute-actions');
 const draft=el('button','Save draft');draft.value='minutes-draft';
 const edit=el('button','Edit draft');edit.type='button';edit.hidden=true;
 const receipt=el('p');receipt.hidden=true;receipt.setAttribute('role','status');
 const notify=(text,error=false)=>{
  receipt.hidden=false;receipt.textContent=text;
  receipt.className=error?'meeting-error':'meeting-saved';
 };
 let submitted=false;
 edit.onclick=()=>{
  if(busy)return;
  agenda.readOnly=minutes.readOnly=false;
  draft.hidden=false;edit.hidden=true;receipt.hidden=true;minutes.focus();
 };
 if(identity)actions.append(draft,edit);
 actions.append(submit,button('Back',async()=>{if(canLeave())await (identity?showStaff():drawPrincipal());}));
 form.append(actions,receipt);
 form.onsubmit=event=>{
  event.preventDefault();
  if(busy||submitted)return;
  const active=event.submitter||submit,operation=active.value;
  if(operation!=='minutes-draft'&&(!agenda.value.trim()||!minutes.value.trim())){
   notify('Enter the subject / agenda and minutes before submitting.',true);return;
  }
  run(async()=>{
   const values={meetingOperation:operation,meetingId:meeting.id,expectedRevision:meeting.revision,agenda:agenda.value,minutes:minutes.value,language};
   const secret=pin?.value;
   const wasReadOnly=minutes.readOnly,caption=active.textContent;
   agenda.readOnly=minutes.readOnly=true;
   if(pin)pin.readOnly=true;
   receipt.hidden=true;
   active.textContent=operation==='minutes-submit'?'Submitting…':'Saving…';
   try{
    const result=await (identity?pinRequest(identity,secret,values):principalRequest(values));
    saved(result);form.dataset.portalDirty='false';meeting.revision=result.revision;
    if(operation==='minutes-draft'){
     draft.hidden=true;edit.hidden=false;
     notify('Minutes saved successfully.');
    }else if(principalEdit){
     agenda.readOnly=minutes.readOnly=false;
     notify('Minutes saved successfully.');
    }else{
     submitted=true;draft.hidden=edit.hidden=submit.hidden=pin.closest('label').hidden=true;
     notify('Minutes submitted successfully.');
    }
   }catch(error){
    agenda.readOnly=minutes.readOnly=wasReadOnly;throw error;
   }finally{
    active.textContent=caption;
    if(pin){pin.value='';pin.readOnly=false;}
   }
  },active,notify);
 };
 content.append(form);
}
function reportSignatures(label,name,language='en'){
 const signatures=el('div',undefined,'meeting-signatures');
 const signer=el('div',undefined,'meeting-signature-block');
 const principal=el('div',undefined,'meeting-signature-block');
 const school=document.querySelector(`.meeting-letterhead p[lang="${language}"]`).textContent;
 signer.append(el('strong',label),el('div',name||'','meeting-signature-name'));
 principal.append(el('strong',language==='hi'?'प्राचार्य':'Principal'),el('div',school));
 signatures.append(signer,principal);
 return signatures;
}
// The report supplies its own signatures. Omit the old footer pasted into Hindi minutes.
const legacyHindiSignoff=/(?:\r?\n[ \t]*)+बैठक संयोजक[ \t]*\/[ \t]*प्रभारी[ \t]*\r?\n[ \t]*प्रधानाचार्य[ \t]*\r?\n[ \t]*पीएम[ \t]*श्री के(?:न्द्रीय|ंद्रीय) विद्यालय क्रमांक[ \t]*[-–—][ \t]*[1१],[ \t]*ईटानगर\s*$/u;
async function showReport(id,principal=false){
 const {report}=await (principal?principalRequest({meetingOperation:'read',task:'report',meetingId:id}):staffRead(id));
 content.replaceChildren(el('h2','Staff meeting report'),el('p',stamp(report.scheduledAt??report.createdAt)));
 for(const [language] of minuteLanguages){
  const version=report.versions.find(entry=>entry.language===language);
  if(!version)continue;
  const section=el('section',undefined,'meeting-report-version');section.lang=version.language;
  const hindi=version.language==='hi';
  section.append(
   el('h3',hindi?'कार्यवृत्त (हिन्दी)':'Minutes (in English)'),
   el('h4',version.agenda,'meeting-minutes-text'),
   el('p',hindi?version.minutes.replace(legacyHindiSignoff,''):version.minutes,'meeting-minutes-text'),
   reportSignatures(hindi?'कार्यवृत्त लेखक':'Minute writer',version.writerName,language)
  );
  content.append(section);
 }
 const {table,rows}=attendanceTable(['Staff member','Attendance','Signature']);
 for(const [label,people]of [['Present',report.present||[]],['Not present',report.absent||[]],['Not marked',report.unmarked||[]]])for(const person of people){
  const row=el('tr');row.append(el('td',[person.name,person.designation].filter(Boolean).join(' · ')),el('td',label),el('td',label==='Present'?'':'—','meeting-signature'));rows.append(row);
 }
 content.append(el('h3','Staff attendance'),table);
 if(report.writers?.length)content.append(el('p','Assigned writers: '+report.writers.map(writer=>writer.name+' ('+(writer.language==='hi'?'Hindi':'English')+')').join(', ')));
 content.append(reportSignatures('Attendance taker / SMT / HM',report.attendanceTakenBy));
 const actions=el('div',undefined,'meeting-actions no-print');
 actions.append(button('Print / Save as PDF',async()=>{await Promise.allSettled([...document.querySelectorAll('.meeting-letterhead img')].map(img=>img.decode()));window.print();}),button('Back to meeting register',()=>adminMode?drawPrincipal():showStaff()));
 content.append(actions);
}
async function openPrincipalAttendance(entry){
 const {meeting}=await principalRequest({meetingOperation:'read',task:'attendance',meetingId:entry.id});
 adminMode=true;
 showAttendance(meeting);
}
async function showPrincipal(afterSignIn=drawPrincipal){
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
  try{await afterSignIn();return;}
  catch(error){if(![401,403].includes(error.status))throw error;}
 }
 showPrincipalLogin(afterSignIn);
}
function showPrincipalLogin(afterSignIn){
 content.replaceChildren(el('h2','Principal sign-in'));
 renderPrincipalLogin(content,async secret=>{
  try{await authApi.signInWithEmailAndPassword(auth,'ramsirkvs@gmail.com',secret);}
  catch(error){if(/invalid-credential|wrong-password|user-not-found/.test(error.code||''))throw Error('Principal password is incorrect.');throw error;}
  await afterSignIn();
 });
}
async function drawPrincipal(){
 const {meetings,roster,recipientStaff={},assignments={},attendanceDefaults=[]}=await principalRequest({meetingOperation:'read'});
 await request({action:'remember-view'},true);
 adminMode=true;
 content.replaceChildren(el('h2','Manage staff meetings'));
 const meetingId=crypto.randomUUID().replaceAll('-','');
 const create=trackedForm('Create meeting'),date=field(create,'Meeting date'),time=field(create,'Meeting time (IST)'),agenda=field(create,'Meeting agenda','textarea');
 date.type='date';time.type='time';date.required=time.required=agenda.required=true;agenda.maxLength=500;agenda.rows=3;
 create.append(el('button','Create meeting'));
 create.onsubmit=event=>{event.preventDefault();if(!canLeave(create))return;run(async()=>{
  saved(await principalRequest({meetingOperation:'create',meetingId,meetingDate:date.value,meetingTime:time.value,meetingAgenda:agenda.value}));
  create.dataset.portalDirty='false';await drawPrincipal();message('Meeting created. Its date, time and agenda are visible in staff view.');
 });};
 const createSection=el('details',undefined,'meeting-setup meeting-create');
 createSection.append(el('summary','Plan a meeting'),create);
 createSection.open=!meetings.length;
 content.append(createSection);

 const now=Date.now(),scheduled=entry=>entry.scheduledAt??entry.createdAt;
 const upcoming=[],past=[];
 for(const entry of meetings){
  (scheduled(entry)>now?upcoming:past).push(entry);
 }
 const groups=[
  ['Upcoming meetings',upcoming.sort((a,b)=>scheduled(a)-scheduled(b)),'No upcoming meetings.'],
  ['Past meetings',past.sort((a,b)=>scheduled(b)-scheduled(a)),'No past meetings.']
 ];

 const choices=[['','Choose a staff member'],...roster.map(person=>[person.id,rosterLabel(person)])];
 const lookup=new Map();
 for(const wing of ['secondary','primary'])for(const teacher of objectionRoster(recipientStaff,wing,undefined,assignments))for(const id of teacher.ids)lookup.set(id,teacher);

 function editorSection(title){const section=el('details',undefined,'meeting-setup');section.append(el('summary',title));return section;}
 for(const [title,entries,empty]of groups){
  const section=el('section',undefined,'meeting-register-section');
  const heading=el('h3',title+' ('+entries.length+')');
  section.append(heading);content.append(section);
  if(!entries.length)section.append(el('p',empty,'meeting-register-empty'));
  for(const entry of entries)section.append(principalMeetingCard(entry));
 }
 function principalMeetingCard(entry){
  const card=meetingCard(entry,true,'h4');
  const reportActions=el('div',undefined,'meeting-actions meeting-report-actions');
  const setup=editorSection('Meeting setup');
  const assignedLanguages=new Set(meetingWriters(entry).map(writer=>writer.language));
  const minuteStatus=minuteLanguages.map(([id,label])=>{
   if(entry.submittedLanguages.includes(id))return label+' received';
   if(entry.returnedLanguages?.includes(id))return label+' returned for revision';
   return label+(assignedLanguages.has(id)?' awaited':' writer unassigned');
  });
  card.append(el('p',minuteStatus.join(' · '),'meeting-report-status'));
  if(entry.published)card.append(el('p','Published to staff view'));
  else if(entry.submittedLanguages.length)card.append(el('p','Ready for Principal review'));
  const attendanceSection=editorSection('1. Expected attendance · '+(attendanceWings.find(([id])=>id===entry.attendanceWing)?.[1]||'Both wings'));
  const meetingLabel=entry.agenda?.split('\n')[0];
  const sectionName=area=>meetingLabel?area+' ('+meetingLabel+')':area;
  const attendance=trackedForm(sectionName('Attendance assignments and expected attendees')),wing=field(attendance,'Attendance wings','select');
  options(wing,attendanceWings,entry.attendanceWing);
  attendance.append(el('p','Principal can take attendance. Assign additional senior teachers below.'));
  const assignedTakers=entry.attendanceTakersConfigured||entry.attendanceTakers?.length?entry.attendanceTakers||[]:attendanceDefaults;
  const takers=attendanceRoles.map(role=>{
   const fieldNode=field(attendance,role,'select');options(fieldNode,choices,assignedTakers.find(person=>person.role===role)?.id||'');
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
  attendance.onsubmit=event=>event.preventDefault();
  attendanceSection.append(attendance);
  const takeAttendance=button('Take attendance as Principal',async()=>{
   if(attendance.dataset.portalDirty==='true'){
    setup.open=attendanceSection.open=true;
    saveSetup.focus();
    message('Use Save meeting setup before taking attendance.',true);return;
   }
   if(!canLeave())return;
   await openPrincipalAttendance(entry);
  });

  const writerSection=editorSection('2. Minutes writers'),writerForm=trackedForm(sectionName('Minutes writers')),rows=el('div'),writers=new Set();
  const updateRemove=()=>{for(const button of rows.querySelectorAll('button'))button.hidden=writers.size===1;};
  writerForm.append(rows);
  const addWriter=value=>{
   const row=el('div',undefined,'meeting-actions meeting-writer-row'),writer=field(row,'Assigned minute writer','select');
   const language=field(row,'Writer language','select');options(language,minuteLanguages,value.language||'en');
   options(writer,choices,value.id);const selection={writer,language};writers.add(selection);
   const remove=el('button','Remove writer');remove.type='button';
   remove.onclick=()=>{if(writers.size===1)return;writers.delete(selection);row.remove();updateRemove();writerForm.dataset.portalDirty='true';};
   row.append(remove);rows.append(row);updateRemove();
  };
  const assigned=meetingWriters(entry);
  for(const writer of assigned.length?assigned:[{id:''}])addWriter(writer);
  const add=el('button','Add another writer');add.type='button';add.onclick=()=>{addWriter({id:''});writerForm.dataset.portalDirty='true';};
  writerForm.append(add);writerForm.onsubmit=event=>event.preventDefault();
  writerSection.append(writerForm);

  for(const [language,label]of minuteLanguages){
   if(!entry.submittedLanguages.includes(language))continue;
   reportActions.append(button('Edit '+label+' minutes',async()=>{
    if(!canLeave())return;
    const {meeting}=await principalRequest({meetingOperation:'read',task:'minutes',meetingId:entry.id,language});showEditor(meeting);
   }));
   if(assignedLanguages.has(language))reportActions.append(button('Return '+label+' minutes to writer',async()=>{
    if(!canLeave()||!confirm('Return the '+label+' minutes to the assigned writer for revision?'))return;
    saved(await principalRequest({meetingOperation:'minutes-return',meetingId:entry.id,language,expectedRevision:entry.minuteRevisions[language]}));
    await drawPrincipal();message(label+' minutes returned to the writer.');
   }));
  }
  if(entry.submittedLanguages.length)reportActions.prepend(button('Preview report / print',()=>{if(canLeave())return showReport(entry.id,true);}),button(entry.published?'Update published report':'Publish to staff view',async()=>{
   if(!canLeave())return;
   saved(await principalRequest({meetingOperation:'publish',meetingId:entry.id,expectedRevision:entry.revision}));
   await drawPrincipal();message('Report published to staff view.');
  }));
  if(entry.published)reportActions.append(button(entry.signedMinutesRevision?'Replace signed PDF':'Upload signed PDF',()=>{
   if(canLeave())showSignedUpload(entry,true,drawPrincipal);
  }),button('Stop publication',async()=>{
   if(!canLeave())return;
   saved(await principalRequest({meetingOperation:'unpublish',meetingId:entry.id,expectedRevision:entry.revision}));
   await drawPrincipal();message('Report hidden from staff view.');
  }));
  const saveSetup=button('Save meeting setup',async()=>{
   if(!canLeave([attendance,writerForm]))return;
   const attendanceTakers=takers.filter(([,select])=>select.value).map(([role,select])=>({role,id:select.value}));
   const expectedAttendees=eligible().filter(person=>selected.has(person.id)).map(person=>person.id);
   const writerAssignments=[...writers].filter(({writer})=>writer.value).map(({writer,language})=>({id:writer.value,language:language.value}));
   saved(await principalRequest({meetingOperation:'setup-save',meetingId:entry.id,expectedRevision:entry.revision,attendanceWing:wing.value,attendanceTakers,expectedAttendees,writers:writerAssignments}));
   attendance.dataset.portalDirty=writerForm.dataset.portalDirty='false';savedSetupId=entry.id;
   await drawPrincipal();message('Meeting saved successfully.');
  });
  const actions=el('div',undefined,'meeting-actions');
  actions.append(saveSetup);
  if(savedSetupId===entry.id){const receipt=el('p','✓ Meeting saved successfully.','meeting-saved');receipt.setAttribute('role','status');actions.append(receipt);}
  setup.append(attendanceSection,writerSection,actions);
  if(savedSetupId===entry.id)setup.open=true;
  if(reportActions.childElementCount)card.append(reportActions);
  card.append(takeAttendance,setup);
  return card;
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
