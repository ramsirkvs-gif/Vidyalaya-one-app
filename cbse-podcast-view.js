import {el,options} from './cbse-ui.js';
import {compareRollStaff} from './cbse-roll-call-roster.js';
import {rollTimestamp} from './cbse-roll-call-time.js';
import {PODCAST_ACK} from './cbse-podcast-model.js';
import {mountPodcastVideo} from './cbse-youtube-player.js';
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
export function renderPodcastTeacher(parent,{data,api,run,askPIN}){
 const notice=el('p','Loading published videos…'),list=el('div',undefined,'podcast-catalogue');notice.className='podcast-catalogue-notice';notice.setAttribute('role','status');parent.append(notice,list);
 const load=async()=>{try{const result=await api({action:'chamber-read'});if(!parent.isConnected)return;notice.textContent='Choose a video. Use your Mission 100 PIN or given PIN to watch.';draw(result.videos||[]);}catch(e){if(parent.isConnected){notice.textContent=e.message;list.replaceChildren(button('Retry published videos',load));}}};
 function draw(videos){
  list.replaceChildren();
  if(!videos.length)list.append(el('p','No videos are currently published.'));
  for(const post of videos){
   const people=[...(post.recipients||[])].sort(compareRollStaff),single=people.length===1;
   const card=el('article',undefined,'roll-status-card podcast-video-card'),row=el('div',undefined,'podcast-video-row'),info=el('div',undefined,'podcast-video-info');
   const title=el('h3',post.title);title.title=post.title;
   const audience=single?'For '+people[0].name+(people[0].designation?' · '+people[0].designation:''):post.audience==='all'?'For all teachers':'For '+people.length+' assigned teachers';
   info.append(title,el('p',audience,'podcast-audience'));
   if(post.note){const note=el('p',post.note,'podcast-short-note');note.title=post.note;info.append(note);}
   if(!single&&post.audience!=='all'){const names=el('details');names.append(el('summary','Permitted teachers'),el('p',people.map(p=>p.name+(p.designation?' · '+p.designation:'')).join('; ')));info.append(names);}
   if(post.pendingList){const pending=el('details',undefined,'podcast-published-pending');pending.append(el('summary','Acknowledgement pending ('+post.pendingList.teachers.length+') · published by Principal'));if(!post.pendingList.teachers.length)pending.append(el('p','All teachers in this published list have acknowledged.'));else{const names=el('ul');for(const person of [...post.pendingList.teachers].sort(compareRollStaff))names.append(el('li',person.name+(person.designation?' · '+person.designation:'')));pending.append(names);}info.append(pending);}
   const access=el('form'),status=el('p'),content=el('div');access.hidden=true;status.setAttribute('role','status');
   let staff;
   const verify=()=>run(async()=>{
    const requested=single?people[0].id:staff.value;
    if(!requested)throw Error('Choose your name.');
    const pin=await askPIN('Open video: '+post.title,'Mission 100 PIN or given PIN');
    if(!pin)return;
    const result=await api({action:'pin-submit',operation:'podcast-list',staffId:requested,pin});
    if(!card.isConnected||!single&&staff.value!==requested)return;
    const video=(result.videos||[]).find(v=>v.id===post.id);
    if(!video){content.replaceChildren();throw Error('This video is not assigned to you or is no longer published. Refresh the video list.');}
    access.hidden=true;status.textContent='PIN verified.';row.classList.add('podcast-video-playing');showVideo(video,requested,content,status,slot,reset);if(video.ack)reportNotice(video,slot);
   });
   const preview=button('▶',()=>{if(single)verify();else{access.hidden=false;staff.focus();}});preview.className='podcast-locked-preview';preview.setAttribute('aria-label','Open video: '+post.title);preview.title=single?'Watch · enter your PIN':'Watch · choose your name and enter your PIN';
   const slot=el('div',undefined,'podcast-video-slot');slot.append(preview);const reset=()=>{slot.dataset.playbackGeneration=String(Number(slot.dataset.playbackGeneration||0)+1);preview.disabled=false;slot.replaceChildren(preview);row.classList.remove('podcast-video-playing');content.replaceChildren();status.textContent='';};
   if(!single){const label=el('label','Your name');staff=el('select');staff.name='podcast-staff';staff.required=true;options(staff,[['','Choose your name'],...people.map(p=>[p.id,p.name+(p.designation?' · '+p.designation:'')])]);label.append(staff);access.append(label,el('button','Verify PIN and watch'),button('Cancel',()=>{access.hidden=true;reset();staff.value='';}));staff.onchange=reset;access.onsubmit=e=>{e.preventDefault();verify();};}
   row.append(slot,info);card.append(row,access,status,content);list.append(card);
  }
 }
 function reportNotice(video,slot){
  const dialog=el('dialog',undefined,'podcast-report-notice'),title=video.ack?'You have already submitted this video report.':'Please submit your viewing report.';dialog.setAttribute('aria-label',title);dialog.append(el('h3',title),el('p',video.ack?'You can watch this assigned video again at any time.':'You can watch this assigned video again at any time. After watching, tick the confirmation below the video and select Submit viewing report.'));
  dialog.append(button('Continue watching',()=>dialog.close()));if(!video.ack)dialog.append(button('Go to viewing report',()=>{dialog.close();const form=slot.querySelector('.podcast-viewing-report');form?.scrollIntoView({block:'center',behavior:'smooth'});form?.querySelector('input')?.focus({preventScroll:true});}));dialog.onclose=()=>dialog.remove();slot.append(dialog);dialog.showModal();
 }
 function showVideo(video,identity,content,status,slot,reset){
  content.replaceChildren();
  const playbackGeneration=String(Number(slot.dataset.playbackGeneration||0)+1);slot.dataset.playbackGeneration=playbackGeneration;mountPodcastVideo(slot,video).catch(e=>{if(slot.isConnected&&slot.dataset.playbackGeneration===playbackGeneration){const frame=slot.querySelector('.podcast-player');if(frame)frame.textContent=e.message;}});
  if(video.ack){slot.append(el('p','You have already submitted this video report · '+rollTimestamp(video.ack.acknowledgedAt),'podcast-acknowledged'),button('Close video',reset));return;}
  let submitted=false;
  const form=el('form',undefined,'podcast-viewing-report'),ackLabel=el('label',PODCAST_ACK),check=el('input');
  check.type='checkbox';check.name='podcast-acknowledged';check.required=true;ackLabel.prepend(check);
  form.append(el('h4','Viewing report'),ackLabel,el('button','Submit viewing report'));
  const closeWithout=button('Close without reporting',reset);closeWithout.hidden=true;
  const close=button('Close video',()=>{if(submitted){reset();return;}status.textContent='Before closing, submit your viewing report below. If you have not finished watching, close without reporting; your report will remain pending.';closeWithout.hidden=false;reportNotice(video,slot);});
  const playbackControls=slot.querySelector('.podcast-playback');if(playbackControls)(playbackControls.closest('.podcast-video-player')||playbackControls).insertAdjacentElement('afterend',form);else slot.append(form);form.insertAdjacentElement('afterend',close);close.insertAdjacentElement('afterend',closeWithout);
  form.onsubmit=e=>{e.preventDefault();run(async()=>{const pin=await askPIN('Confirm submission','Mission 100 PIN or given PIN');if(!pin)return;const result=await api({action:'pin-submit',operation:'podcast-ack',staffId:identity,pin,id:video.id,version:video.version,acknowledged:check.checked});if(!content.isConnected)return;const updated=result.videos.find(v=>v.id===video.id&&v.version===video.version);if(updated?.ack){submitted=true;closeWithout.hidden=true;form.replaceWith(el('p','Viewing report submitted · '+rollTimestamp(updated.ack.acknowledgedAt),'podcast-acknowledged'));status.textContent='Viewing report submitted successfully.';}else{reset();status.textContent='Video access changed. Refresh the published video list.';}});};
 }

 load();
}
