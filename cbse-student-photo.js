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
