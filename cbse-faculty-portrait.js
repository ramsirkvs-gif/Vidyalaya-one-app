import {facultyPortraits} from './cbse-faculty-portrait-data.js';
const nameKey=value=>String(value||'').replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?\s*/gi,'').toUpperCase().replace(/[^A-Z]/g,'');
function portrait(person,size){const img=document.createElement('img');img.src=new URL('./'+person.file,import.meta.url).href;img.alt='';img.setAttribute('aria-hidden','true');img.width=size;img.height=size;img.className='faculty-portrait faculty-portrait--'+size;return img;}
export function showFacultyPortrait(root,getStaff){
 let scheduled=false;
 const maps=()=>{const staff=getStaff()||{},names=new Map(),ids=new Map();for(const item of facultyPortraits){const aliases=new Set(item.names.map(nameKey));const people=Object.entries(staff).filter(([id,t])=>t.status==='active'&&aliases.has(nameKey(t.name))&&(item.staffId?id===item.staffId:t.kind===item.kind));for(const[id,t]of people){ids.set(id,item);for(const alias of [...aliases,nameKey(t.name)]){if(!names.has(alias)||names.get(alias)?.file===item.file)names.set(alias,item);else names.set(alias,null);}}}return {names,ids};};
 const draw=()=>{scheduled=false;const {names,ids}=maps();if(!ids.size)return;
  for(const node of root.querySelectorAll('button,strong,h2,p')){
   if(node.querySelector('.faculty-portrait')||node.closest('[data-student-photo-key]'))continue;
   const label=node.getAttribute('aria-label')||'',card=label.startsWith('Teacher profile: ');if(node.classList.contains('student-card')&&!card)continue;
   const text=card?label.slice(17):node.textContent.trim().replace(/^Posting as /,'').split(' · ')[0],person=names.get(nameKey(text));if(!person)continue;
   if(node.tagName==='H2'&&node.closest('.student-identity-card'))continue;
   if(node.tagName==='H2'&&ids.get(new URLSearchParams(location.hash.slice(1)).get('staff'))!==person)continue;
   const size=node.tagName==='H2'?96:card?48:node.closest('.record-card')||node.tagName==='P'?32:28;
   node.prepend(portrait(person,size));node.classList.add('has-faculty-portrait');
  }
 };
 const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(draw);}});observer.observe(root,{childList:true,subtree:true});draw();
 root.addEventListener('change',event=>{const input=event.target;if(!input.matches('[name="comment-staff"]'))return;const label=input.closest('label');label.querySelector('.faculty-portrait')?.remove();const person=maps().ids.get(input.value);if(person)label.append(portrait(person,32));});
 return ()=>observer.disconnect();
}
