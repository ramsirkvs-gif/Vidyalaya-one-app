import {clone,entries} from './cbse-model.js';
const normal=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function validateStudentPhoto(photo){
 if(!photo||typeof photo.dataUrl!=='string'||photo.dataUrl.length>160000||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.dataUrl)||!Number.isInteger(photo.width)||!Number.isInteger(photo.height)||photo.width<24||photo.height<24||photo.width>512||photo.height>512)throw Error('Invalid student portrait. Use a small PNG, JPEG or WebP photo.');
 return photo;
}
export function validateStudentPhotos(photos){
 if(!photos||typeof photos!=='object'||Array.isArray(photos))throw Error('Invalid student photo records.');let total=0;
 for(const[key,photo]of entries(photos)){if(!/^[A-Za-z0-9_:-]{1,300}$/.test(key)||['__proto__','constructor','prototype'].includes(key))throw Error('Invalid student photo key.');validateStudentPhoto(photo);total+=photo.dataUrl.length;}
 if(total>3000000)throw Error('Student photos exceed 3 MB. Use smaller portraits.');
}
export function importStudentPhotos(header,rows,mission,people){
 if(header.join(',')!=='Class,Section,StudentName,PhotoDataURL,Width,Height')throw Error('Use the prepared student photo CSV.');if(!rows.length)throw Error('No student photos found.');
 const next=clone(mission),issues=[],counts={},seen=new Set(),images=new Map(),matchedRows=[];next.studentPhotos||={};let matched=0,changed=0;
 for(const [i,row]of rows.entries()){
  if(row.length!==6)throw Error(`Photo CSV row ${i+2} has the wrong number of columns.`);
  const [cl,section,name,dataUrl,w,h]=row,candidates=entries(people).filter(([,p])=>p.classId===cl&&normal(p.section)===normal(section)&&normal(p.name)===normal(name));
  if(candidates.length!==1){issues.push(`Row ${i+2}: ${cl}-${section} · ${name}: no unique roster match; unchanged.`);continue;}
  const [key,person]=candidates[0];if(seen.has(key))throw Error(`Duplicate student photo at row ${i+2}.`);seen.add(key);
  const photo=validateStudentPhoto({dataUrl,width:Number(w),height:Number(h)});if(images.has(dataUrl)&&images.get(dataUrl)!==key)throw Error('Identical source photo assigned to different students. Review the source.');images.set(dataUrl,key);
  if(JSON.stringify(next.studentPhotos[key])!==JSON.stringify(photo)){next.studentPhotos[key]=photo;changed++;}
  matched++;counts[cl+'-'+section]=(counts[cl+'-'+section]||0)+1;matchedRows.push({key,name:person.name,classId:cl,section,photo});
 }
 validateStudentPhotos(next.studentPhotos);return {next,matched,changed,issues,counts,matchedRows,total:rows.length};
}
export function placeStudentPhoto(parent,person,photo){
 if(!photo)return;validateStudentPhoto(photo);const title=parent.querySelector('h2');if(!title||parent.querySelector('.student-profile-portrait'))return;
 const row=document.createElement('div');row.className='student-profile-heading';const image=document.createElement('img');image.src=photo.dataUrl;image.alt='Photo of '+person.name;image.className='student-profile-portrait';image.width=80;image.height=100;image.decoding='async';title.replaceWith(row);row.append(image,title);
}
export function markStudentPhoto(node,key,mode='name'){
 node.dataset.studentPhotoKey=key;node.dataset.studentPhotoMode=mode;if(mode==='avatar')node.dataset.studentPhotoInitials=node.textContent;return node;
}
export function observeStudentPhotos(root,getState){
 const cache=new Map(),waiting=new Set(),inflight=new Map();let version='',epoch=0,running=0,scheduled=false;
 const schedule=()=>{if(!scheduled){scheduled=true;queueMicrotask(draw);}};
 const paint=(node,photo)=>{let image=node.querySelector('.student-name-portrait');if(!photo){image?.remove();if(node.dataset.studentPhotoMode==='avatar'&&node.textContent!==(node.dataset.studentPhotoInitials||''))node.textContent=node.dataset.studentPhotoInitials||'';node.classList.remove('has-student-photo');return;}
  try{validateStudentPhoto(photo);}catch{return;}if(!image){image=document.createElement('img');image.className='student-name-portrait';image.alt='';image.setAttribute('aria-hidden','true');image.decoding='async';if(node.dataset.studentPhotoMode==='avatar')node.replaceChildren(image);else node.prepend(image);}
  if(image.getAttribute('src')!==photo.dataUrl)image.src=photo.dataUrl;node.classList.add('has-student-photo');
 };
 const start=state=>{while(running<2&&waiting.size){const keys=[...waiting].slice(0,20),task={epoch,keys};for(const key of keys){waiting.delete(key);inflight.set(key,task);}running++;
  Promise.resolve().then(()=>state.fetch(keys)).then(result=>{if(task.epoch!==epoch||!getState().enabled)return;for(const key of keys)cache.set(key,result.photos?.[key]||null);}).catch(()=>{if(task.epoch===epoch)for(const key of keys)cache.set(key,null);}).finally(()=>{for(const key of keys)if(inflight.get(key)===task)inflight.delete(key);running--;schedule();});
 }};
 const draw=()=>{scheduled=false;const state=getState(),nextVersion=String(state.enabled)+':'+state.revision;if(version!==nextVersion){version=nextVersion;epoch++;cache.clear();waiting.clear();inflight.clear();}if(!state.enabled)return;
  const nodes=[...root.querySelectorAll('[data-student-photo-key]')],visible=new Set(nodes.map(n=>n.dataset.studentPhotoKey));for(const key of waiting)if(!visible.has(key))waiting.delete(key);
  for(const node of nodes){const key=node.dataset.studentPhotoKey;if(state.local){paint(node,state.local[key]||null);continue;}if(cache.has(key))paint(node,cache.get(key));else if(!inflight.has(key))waiting.add(key);}
  if(!state.local)start(state);
 };
 const observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});schedule();return ()=>observer.disconnect();
}
