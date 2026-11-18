import {meetingWriters} from './cbse-staff-meetings-model.js';
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
   card.append(button('Open as assigned minute writer',()=>showWriterLogin(entry)));
   content.append(card);
  }
 }catch(error){if(error.curtainRequired){adminMode=false;showCurtain();}else throw error;}
}
function meetingCard(entry){
 const card=el('article',undefined,'meeting-item');
 const [subject,...points]=(entry.agenda||'Meeting awaiting minutes').split('\n');
 card.append(el('h3',subject),el('p',stamp(entry.createdAt)),el('p','Assigned writers: '+meetingWriters(entry).map(writer=>writer.name).join(', ')));
 if(points.length)card.append(el('p',points.join('\n'),'meeting-minutes-text'));
 return card;
}
function showWriterLogin(entry){
 content.replaceChildren(meetingCard(entry));
 const form=el('form'),writers=meetingWriters(entry);
 const writer=field(form,'Choose your name','select');writer.required=true;
 options(writer,writers.map(person=>[person.id,person.name]),writers[0].id);
 const pin=password(form,'Personal PIN',true);form.append(el('button','Open editable minutes'));
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  const value=pin.value;pin.value='';
  const result=await pinRequest({...entry,writerId:writer.value},value,{meetingOperation:'read'});showEditor(result.meeting,writer.value);
 });};
 content.append(form,button('Back to meeting register',showStaff));
}
function attendanceTable(headers){
 const table=el('table',undefined,'meeting-attendance'),head=el('thead'),heading=el('tr'),rows=el('tbody');
 for(const text of headers){const cell=el('th',text);cell.scope='col';heading.append(cell);}
 head.append(heading);table.append(head,rows);return {table,rows};
}
function showEditor(meeting,writerId){
 content.replaceChildren(el('h2','Write meeting minutes'),el('p',stamp(meeting.createdAt)),el('p','Assigned minute writer: '+meetingWriters(meeting).find(writer=>writer.id===writerId).name));
 const form=trackedForm();
 const agenda=field(form,'Agenda / subject and points','textarea');agenda.maxLength=500;agenda.rows=3;agenda.required=true;agenda.value=meeting.agenda||'';
 const minutes=field(form,'It was discussed and decided that','textarea');minutes.className='meeting-minutes-input';minutes.maxLength=12000;minutes.required=true;minutes.value=meeting.minutes||'';
 form.append(el('h3','Staff attendance'));
 const {table,rows}=attendanceTable(['Staff member','Attendance']);
 const inputs=meeting.roster.map(person=>{
  const row=el('tr'),cell=el('td'),select=el('select');
  select.required=true;select.setAttribute('aria-label','Attendance for '+person.name);
  options(select,[['','Choose status'],['present','Present'],['absent','Not present']],meeting.attendance?.[person.id]||'');
  cell.append(select);row.append(el('td',[person.name,person.designation].filter(Boolean).join(' · ')),cell);rows.append(row);return [person.id,select];
 });
 form.append(table,el('p','Saving makes these minutes and the attendance report available in staff view.'));
 const pin=password(form,'Personal PIN to save minutes',true);
 form.append(el('button',meeting.savedAt?'Update meeting minutes':'Save meeting minutes'),button('Cancel',async()=>{if(canLeave())await showStaff();}));
 form.onsubmit=event=>{
  event.preventDefault();
  run(async()=>{
   const secret=pin.value;pin.value='';
   const attendance=Object.fromEntries(inputs.map(([id,input])=>[id,input.value]));
   const result=await pinRequest({id:meeting.id,writerId},secret,{meetingOperation:'save',expectedRevision:meeting.revision,agenda:agenda.value,minutes:minutes.value,attendance});
   saved(result);form.dataset.portalDirty='false';await showReport(meeting.id);message('Meeting minutes saved.');
  });
 };
 content.append(form);
}
async function showReport(id){
 const {report}=await staffRead(id);
 content.replaceChildren(el('h2',report.agenda,'meeting-minutes-text'),el('p',stamp(report.createdAt)),el('p','Minute writer: '+report.writerName),
  el('h3','Discussion and decisions'),el('p',report.minutes,'meeting-minutes-text'));
 const {table,rows}=attendanceTable(['Staff member','Attendance','Signature']);
 for(const [label,people]of [['Present',report.present],['Not present',report.absent]])for(const person of people){
  const row=el('tr');row.append(el('td',[person.name,person.designation].filter(Boolean).join(' · ')),el('td',label),el('td',label==='Present'?'':'—','meeting-signature'));rows.append(row);
 }
 content.append(el('h3','Staff attendance'),table);
 const actions=el('div',undefined,'meeting-actions no-print');
 actions.append(button('Print / Save as PDF',async()=>{await Promise.allSettled([...document.querySelectorAll('.meeting-letterhead img')].map(img=>img.decode()));window.print();}),button('Back to meeting register',showStaff));
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
 content.replaceChildren(el('h2','Assign staff meeting minute writers'));
 const choices=[['','Choose a staff member'],...roster.map(person=>[person.id,[person.name,person.designation].filter(Boolean).join(' · ')])];
 const assignment=(parent,entry)=>{
  const form=trackedForm(),rows=el('div'),writers=new Set();
  const updateRemove=()=>{for(const button of rows.querySelectorAll('button'))button.hidden=writers.size===1;};
  form.append(rows);
  const addWriter=value=>{
   const row=el('div',undefined,'meeting-actions meeting-writer-row'),writer=field(row,'Assigned minute writer','select');writer.required=true;
   options(writer,choices,value);writers.add(writer);
   const remove=el('button','Remove writer');remove.type='button';
   remove.onclick=()=>{if(writers.size===1)return;writers.delete(writer);row.remove();updateRemove();form.dataset.portalDirty='true';};
   row.append(remove);rows.append(row);updateRemove();
  };
  for(const writer of entry?meetingWriters(entry):[{id:''}])addWriter(writer.id);
  const add=el('button','Add another writer');add.type='button';
  add.onclick=()=>{addWriter('');form.dataset.portalDirty='true';};
  form.append(add,el('button',entry?'Save writer assignments':'Create meeting and assign writers'));
  const meetingId=entry?.id||crypto.randomUUID().replaceAll('-','');
  form.onsubmit=event=>{event.preventDefault();run(async()=>{
   const result=await principalRequest({meetingOperation:entry?'assign':'create',meetingId,writerIds:[...writers].map(writer=>writer.value),expectedRevision:entry?.revision});
   saved(result);form.dataset.portalDirty='false';await drawPrincipal();message(entry?'Minute writers updated.':'Meeting created with the current date and time.');
  });};
  parent.append(form);
 };
 assignment(content);
 for(const entry of meetings){
  const card=meetingCard(entry);assignment(card,entry);
  if(entry.savedAt)card.append(button('Read minutes / print',()=>{if(canLeave())return showReport(entry.id);}));
  content.append(card);
 }
 content.append(button('Sign out as Principal',async()=>{if(canLeave())await authApi.signOut(auth);}));
}
staffButton.onclick=()=>{if(canLeave())run(showStaff);};
principalButton.onclick=()=>{if(canLeave())run(showPrincipal);};
chamber.onclick=event=>{if(!canLeave())event.preventDefault();};
run(showStaff);
