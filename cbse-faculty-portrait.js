// Single, user-requested layout pilot. Replace with the original source portrait
// when supplied; this asset is the screenshot-derived test preview.
const staffId='XII:pdf_02222829e8b1896e_5';
const source=new URL('./faculty-ramesh-yadav-test.png',import.meta.url).href;
const nameKey=value=>String(value||'').replace(/\b(MRS|MR|MS|DR)\b\.?\s*/gi,'').toUpperCase().replace(/[^A-Z]/g,'');
function portrait(size){const img=document.createElement('img');img.src=source;img.alt='';img.setAttribute('aria-hidden','true');img.width=size;img.height=size;img.className='faculty-portrait faculty-portrait--'+size;return img;}
export function showFacultyPortrait(root,getStaff){
 let scheduled=false;
 const draw=()=>{scheduled=false;const teacher=getStaff()?.[staffId];if(!teacher||teacher.status!=='active'||nameKey(teacher.name)!=='RAMESHYADAV')return;
  for(const node of root.querySelectorAll('button,strong,h2,p')){
   if(node.querySelector('.faculty-portrait'))continue;
   const label=node.getAttribute('aria-label')||'',card=label.startsWith('Teacher profile: '),text=card?label.slice(17):node.textContent.trim().replace(/^Posting as /,'').split(' · ')[0];
   if(nameKey(text)!=='RAMESHYADAV')continue;
   const size=node.tagName==='H2'?96:card?48:node.closest('.record-card')||node.tagName==='P'?32:28;
   node.prepend(portrait(size));node.classList.add('has-faculty-portrait');
  }
 };
 const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(draw);}});observer.observe(root,{childList:true,subtree:true});draw();
 root.addEventListener('change',event=>{const input=event.target;if(!input.matches('[name="comment-staff"]'))return;const label=input.closest('label');label.querySelector('.faculty-portrait')?.remove();if(input.value===staffId&&getStaff()?.[staffId])label.append(portrait(32));});
 return ()=>observer.disconnect();
}
