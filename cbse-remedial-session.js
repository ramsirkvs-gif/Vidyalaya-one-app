import {remedialPriorityAbsentees,remedialAbsenceReminderText} from './cbse-remedial-absence-reminder.js';
import {el,options} from './cbse-ui.js';
import {remedialToday} from './cbse-remedial-model.js';
const button=(label,fn)=>{const b=el('button',label);b.type='button';b.onclick=fn;return b;};
export function openRemedialClass(plan,ctx,credentials,refresh,initialDate){
 const dialog=el('dialog',undefined,'remedial-class-dialog'),dates=el('select'),body=el('div'),message=el('p'),actions=el('div',undefined,'actions');
 let stream,photo,evidence,saving=false,closed=false;
 const classPin=el('input');classPin.type='password';classPin.inputMode='numeric';classPin.autocomplete='off';classPin.placeholder='Your personal PIN';classPin.setAttribute('aria-label','Your personal PIN for this class');
 const stop=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;};
 const close=()=>{closed=true;stop();dialog.close();dialog.remove();};
 const dateLabel=el('label','Class date');dateLabel.append(dates);dates.setAttribute('aria-label','Scheduled class date');
 dialog.append(el('h3','Attendance & remedial class record'),el('p',plan.teacherName+' · '+plan.classId+'-'+(plan.sections||[plan.section]).join(', ')+' · '+plan.subjectName),dateLabel,body,message,actions,button('Close',close));
 message.setAttribute('role','status');document.body.append(dialog);dialog.addEventListener('close',stop);dialog.addEventListener('cancel',close);
 options(dates,plan.dates.map(d=>[d,d]),initialDate|| (plan.dates.includes(remedialToday())?remedialToday():plan.dates[0]));dialog.showModal();
 async function send(operation,extra={}){
  if(saving)return;const date=dates.value;saving=true;message.textContent=operation==='evidence'?'Loading photo…':'Saving…';dates.disabled=true;actions.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const r=await ctx.submit({...credentials(),...(!ctx.principal?{pin:classPin.value}:{}),operation,planId:plan.id,date,sessionRevision:plan.sessions?.[date]?.revision||0,...extra});
   if(closed)return;
   if(operation==='evidence'){message.textContent='';return r;}
   plan=(ctx.currentMission?.()||ctx.mission).remedialPlans[plan.id];refresh();draw();message.textContent=operation==='verify'?'Approved · class done.':'Record and attendance submitted · awaiting Principal approval.';return r;
  }catch(e){if(!closed)message.textContent=e.message+' Your attendance and photo remain here; you can retry.';}
  finally{saving=false;dates.disabled=false;actions.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 function draw(){
  stop();photo=null;evidence=null;body.replaceChildren();actions.replaceChildren();const session=plan.sessions?.[dates.value]||{};
  if(session.submittedAt){
   body.append(el('strong',session.status==='verified'?'Approved · class done':'Completed · awaiting Principal approval'),el('p',(session.presentKeys||[]).length+' present · '+(session.absentKeys||[]).length+' absent'),el('p','Submitted by '+session.submittedByName+' · '+new Date(session.submittedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})));
   const attendance=el('details');attendance.append(el('summary','View recorded attendance'));
   for(const key of plan.studentKeys){const [cl,sid,id]=key.split(':'),person=ctx.draft.classes?.[cl]?.sections?.[sid]?.students?.[id];attendance.append(el('p',(person?.name||key)+' · '+((session.presentKeys||[]).includes(key)?'Present':'Absent')));}body.append(attendance);
   if(ctx.principal){
    actions.append(button('View captured evidence',async()=>{const r=await send('evidence');if(r?.photo?.photo){body.querySelector('[data-class-photo]')?.remove();const holder=el('div'),image=el('img');holder.dataset.classPhoto='true';image.src=r.photo.photo;image.alt='Captured class evidence';image.style.maxWidth='100%';holder.append(image,el('p','Captured '+new Date(session.evidence.capturedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})));if(Number.isFinite(session.evidence.latitude)&&Number.isFinite(session.evidence.longitude)){const map=el('a','View photo location in Google Maps');map.href='https://www.google.com/maps?q='+session.evidence.latitude+','+session.evidence.longitude;map.target='_blank';map.rel='noopener';holder.append(map);}body.append(holder);}}));
    if(session.status!=='verified')actions.append(button('Approve · class done',()=>send('verify')));
   }return;
  }
  const attendance=el('div',undefined,'remedial-session-attendance'),checks=[],count=el('p');let remindedAbsent='';const remindAbsences=()=>{const absent=remedialPriorityAbsentees(ctx.draft,ctx.currentMission?.()||ctx.mission,plan,checks.filter(c=>c.checked).map(c=>c.value)),signature=JSON.stringify(absent.map(p=>[p.key,p.band]));if(!absent.length){remindedAbsent='';return;}if(signature===remindedAbsent)return;remindedAbsent=signature;window.alert(remedialAbsenceReminderText(absent));};
  const updateCount=()=>{count.textContent=checks.filter(c=>c.checked).length+' present · '+checks.filter(c=>!c.checked).length+' absent';};
  body.append(el('h4','1. Mark attendance'),el('p','Tick present students. Unticked students are absent.'),button('Mark all present',()=>{checks.forEach(c=>c.checked=true);remindedAbsent='';updateCount();}),count,attendance);
  for(const key of plan.studentKeys){const [cl,sid,id]=key.split(':'),person=ctx.draft.classes?.[cl]?.sections?.[sid]?.students?.[id],label=el('label',(person?.name||key)+' · Roll '+(person?.roll||'')),check=el('input');check.type='checkbox';check.value=key;check.onchange=()=>{updateCount();if(!check.checked)remindAbsences();else remindedAbsent='';};checks.push(check);label.prepend(check);attendance.append(label);}updateCount();
  const camera=el('div'),video=el('video'),preview=el('img'),cameraMessage=el('p');video.autoplay=true;video.muted=true;video.playsInline=true;video.hidden=preview.hidden=true;video.style.width=preview.style.width='100%';body.append(el('h4','2. Take class photo'),camera);
  const capture=button('Capture photo',()=>{try{
   if(!stream||!video.videoWidth)throw Error('Wait for the camera picture, then capture.');
   const canvas=document.createElement('canvas'),scale=Math.min(1,1000/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   const captured=canvas.toDataURL('image/jpeg',.6);if(captured.length>1000000)throw Error('Photo is too large. Retake it.');
   photo=captured;evidence={ref:'photo_'+crypto.randomUUID().replaceAll('-',''),capturedAt:Date.now(),locationStatus:'not-collected'};preview.src=photo;preview.hidden=false;video.hidden=true;stop();takePhoto.hidden=false;takePhoto.textContent='Retake photo';capture.hidden=true;cameraMessage.textContent='Photo ready · capture time recorded.';message.textContent='Ready to submit record and attendance.';
  }catch(e){cameraMessage.textContent=e.message;}});
  const takePhoto=button('Take photo',async()=>{if(saving)return;remindAbsences();stop();takePhoto.disabled=true;try{
   const opened=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1200}},audio:false});if(closed){opened.getTracks().forEach(t=>t.stop());return;}stream=opened;video.srcObject=stream;video.hidden=false;await video.play();preview.hidden=true;takePhoto.hidden=true;capture.hidden=false;cameraMessage.textContent='Tap Capture photo. No location permission needed.';
  }catch(e){cameraMessage.textContent='Allow camera access to take the photo. '+e.message;}finally{takePhoto.disabled=false;}});capture.hidden=true;camera.append(takePhoto,video,preview,cameraMessage,capture);
  body.append(el('h4','3. Submit record & attendance'));if(!ctx.principal)body.append(classPin);
  actions.append(button('Submit record & attendance',()=>{if(!photo||!evidence){message.textContent='Take and capture the class photo first.';return;}remindAbsences();send('complete',{presentKeys:checks.filter(c=>c.checked).map(c=>c.value),photo,evidence});}));
 }
 dates.onchange=()=>{message.textContent='';draw();};draw();
 if(!plan.sessions?.[dates.value]?.submittedAt)setTimeout(()=>{if(!closed)window.alert('If needed, call the Principal personally for observation. Then mark attendance, take a photo and submit the class record.');},0);
}
