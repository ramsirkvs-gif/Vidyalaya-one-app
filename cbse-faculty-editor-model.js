import {rollNameKey,secondaryStaffEntry,rollStaffIdentityIds} from './cbse-roll-call-roster.js';
import {recordContactChanges} from './cbse-contact-audit.js';
import {emptyFaculty,validateFaculty,clearTeacherRoles} from './cbse-faculty-model.js';
import {emptyMission,validateMission,staffIndex} from './cbse-mission-model.js';
import {teacherIdentityIds} from './cbse-view-data.js';
import {dialNumber} from './cbse-contact-model.js';
const entries=x=>Object.entries(x||{}),check=(ok,msg)=>{if(!ok)throw Error(msg);},key=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);
export function findExistingStaff(current,name,editing=''){const key=rollNameKey(name);if(!key)return null;const staff=staffIndex(current.facultyDraft||emptyFaculty(),current.mission||emptyMission()),excluded=new Set(editing?rollStaffIdentityIds(staff,editing):[]),official=secondaryStaffEntry({name});return Object.entries(staff).find(([id,p])=>!excluded.has(id)&&(rollNameKey(p.name)===key||official&&secondaryStaffEntry(p)?.serial===official.serial))||null;}
function preventDuplicateStaff(current,input,editing){if(input.status==='vacant')return;const match=findExistingStaff(current,input.name,editing);check(!match,'This staff member already exists in Mission 100. Open Edit on the existing record instead of adding a duplicate.');}
export function planFacultySave(current,input,newId,now){
 if(input.memberType==='support'||String(input.staffId||'').startsWith('support:'))return planSupportSave(current,input,newId,now);
 const next=structuredClone(current),f=next.facultyDraft||emptyFaculty(),m=next.mission||emptyMission(),d=next.draft;
 check(input.expectedFacultyRevision===(f.revision||0)&&input.expectedMissionRevision===(m.revision||0),'Faculty or assignments changed. Reload before saving.');
 const editing=String(input.staffId||''),[oldClass,oldId]=editing.split(':');check(!editing||['X','XII'].includes(oldClass)&&editing===oldClass+':'+oldId&&key(oldId)&&f.classes[oldClass]?.teachers?.[oldId],'Faculty member not found.');
 const old=editing?f.classes[oldClass].teachers[oldId]:null,aliases=editing?teacherIdentityIds(editing,f,m):[],sourcePhoto=aliases.map(id=>m.staffPhotos?.[id]).find(Boolean),ids=new Set(aliases);
 const classes=[...new Set(input.classes||[])];check(Array.isArray(input.classes)&&classes.length>0&&classes.every(c=>['X','XII'].includes(c)),'Select Class X, XII, or both.');
 const name=String(input.name||'').trim(),designation=String(input.designation||'').trim(),email=String(input.email||'').trim(),mobile=String(input.mobile||'').trim(),whatsapp=String(input.whatsapp||'').trim();
 check(!email||email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Enter a valid email.');check(!mobile||dialNumber(mobile),'Enter a valid mobile number.');check(!whatsapp||dialNumber(whatsapp),'Enter a valid WhatsApp number.');
 preventDuplicateStaff(current,input,editing);const status=input.status||old?.status||'active';check(['active','inactive','vacant'].includes(status),'Choose a valid faculty status.');check(status==='active'||!input.assignments?.length&&!input.roles?.length,'Remove teaching assignments and responsibilities before marking faculty inactive or vacant.');const photo=String(input.photoData||'');check(!photo||photo.length<=45000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(photo),'Choose a JPG, PNG or WebP photo using Upload photo.');
 check(Array.isArray(input.assignments)&&input.assignments.length<=150&&Array.isArray(input.roles)&&input.roles.length<=60,'Invalid assignments or roles.');
 // Retain existing identities, history and PINs even when a standard is no longer taught.
 for(const cl of classes){let id=aliases.find(id=>id.startsWith(cl+':'));if(!id){const match=entries(f.classes[cl].teachers).find(([,t])=>t.name.trim().toUpperCase()===name.toUpperCase()&&t.designation.trim().toUpperCase()===designation.toUpperCase());check(!match,'This faculty already exists. Open Edit instead of adding a duplicate.');id=cl+':'+newId;f.classes[cl].teachers||={};f.classes[cl].teachers[id.split(':')[1]]={};}ids.add(id);}
 const targetFor=cl=>[...ids].find(id=>id.startsWith(cl+':'));
 for(const id of ids){const[cl,tid]=id.split(':');const t=f.classes[cl].teachers[tid];f.classes[cl].teachers[tid]={...t,name,designation,subjects:String(input.subjects||'').trim(),teachingSections:input.assignments.filter(a=>a.classId===cl).map(a=>d?.classes?.[cl]?.sections?.[a.sectionId]?.name).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', '),status};clearTeacherRoles(f.classes[cl],tid);m.facultyProfiles||={};m.facultyProfiles[id]={standards:classes};if(Object.hasOwn(input,'photoData')){m.staffPhotos||={};if(photo)m.staffPhotos[id]={data:photo};else delete m.staffPhotos[id];}else if(sourcePhoto&&!m.staffPhotos?.[id]){m.staffPhotos||={};m.staffPhotos[id]=structuredClone(sourcePhoto);}m.staffEmails||={};m.staffContacts||={};if(email)m.staffEmails[id]={email,sourceVerified:m.staffEmails[id]?.email===email&&m.staffEmails[id]?.sourceVerified===true};else delete m.staffEmails[id];m.staffContacts[id]={mobile:dialNumber(mobile),whatsapp:dialNumber(whatsapp)};}
 m.allocations||={};const previousAllocations=Object.values(m.allocations).filter(a=>ids.has(a.staffId));for(const[k,a]of entries(m.allocations))if(ids.has(a.staffId))delete m.allocations[k];
 const seen=new Set();for(const a of input.assignments){check(classes.includes(a.classId)&&key(a.sectionId)&&key(a.subjectId)&&d?.classes?.[a.classId]?.sections?.[a.sectionId]?.subjects?.[a.subjectId],'Choose a valid class, section and subject.');const k=`${a.classId}_${a.sectionId}_${a.subjectId}`;check(!seen.has(k),'Duplicate subject assignment.');seen.add(k);const conflict=Object.values(m.allocations).find(other=>other.classId===a.classId&&other.sectionId===a.sectionId&&other.subjectId===a.subjectId);check(!conflict||ids.has(conflict.staffId),'This subject already has a teacher. Change that assignment first.');m.allocations[k]={...previousAllocations.find(other=>other.classId===a.classId&&other.sectionId===a.sectionId&&other.subjectId===a.subjectId),classId:a.classId,sectionId:a.sectionId,subjectId:a.subjectId,staffId:targetFor(a.classId)};}
 for(const r of input.roles){check(classes.includes(r.classId)&&key(r.sectionId)&&d?.classes?.[r.classId]?.sections?.[r.sectionId]&&['classTeacher','coClassTeacher','other'].includes(r.role),'Choose a valid section responsibility.');const tid=targetFor(r.classId).split(':')[1],area=f.classes[r.classId];area.roles||={};const roles=area.roles[r.sectionId]||={classTeacher:'',coClassTeacher:''};if(r.role==='other'){check(typeof r.label==='string'&&r.label.trim()&&r.label.length<=60,'Enter the responsibility name.');roles.other||={};let index=0;while(roles.other['editor_'+index])index++;const id='editor_'+index;roles.other[id]={label:r.label.trim(),teacherId:tid};}else{check(!roles[r.role]||roles[r.role]===tid,'This section responsibility already belongs to another teacher. Change it first.');roles[r.role]=tid;}}
 recordContactChanges(current.mission||{},m,{id:'principal',name:'Principal'},now,'faculty_contact_'+newId+'_'+(current.mission?.revision||0));validateFaculty(f);f.revision++;f.updatedAt=now;m.revision=(m.revision||0)+1;m.updatedAt=now;next.facultyDraft=f;next.mission=m;return {next,staffIds:[...ids],newStaffIds:[...ids].filter(id=>!aliases.includes(id)),staffId:targetFor(classes[0]),teacher:old};
}

function planSupportSave(current,input,newId,now){
 const next=structuredClone(current),f=next.facultyDraft||emptyFaculty(),m=next.mission||emptyMission();
 check(input.expectedFacultyRevision===(f.revision||0)&&input.expectedMissionRevision===(m.revision||0),'Faculty or assignments changed. Reload before saving.');
 const editing=String(input.staffId||''),id=editing||'support:'+newId,tid=id.slice(8);
 check(id.startsWith('support:')&&key(tid)&&(!editing||m.staff?.[tid]),'Support member not found.');
 const name=String(input.name||'').trim(),kind=input.kind,status=input.status||'active',subjects=String(input.subjects||'').trim();
 check(name&&name.length<=120&&['prt','counsellor','special_educator','support','other_support'].includes(kind)&&['active','inactive'].includes(status)&&subjects.length<=300,'Enter valid support member details.');
 check(!Object.entries(m.staff||{}).some(([k,t])=>k!==tid&&t.name.trim().toUpperCase()===name.toUpperCase()&&t.kind===kind),'This support member already exists. Open Edit instead.');
 preventDuplicateStaff(current,input,editing);
 const designation=String(input.designation??m.staff?.[tid]?.designation??'').trim();check(designation.length<=100,'Enter a valid designation.');
 m.staff||={};m.staff[tid]={...m.staff[tid],name,designation,kind,status,subjects};if(input.wing!==undefined){check(['primary','secondary'].includes(input.wing),'Choose Primary or Secondary reporting wing.');m.staff[tid].wing=input.wing;}
 const email=String(input.email||'').trim(),mobile=String(input.mobile||'').trim(),whatsapp=String(input.whatsapp||'').trim();
 check(!mobile||dialNumber(mobile),'Enter a valid mobile number.');check(!whatsapp||dialNumber(whatsapp),'Enter a valid WhatsApp number.');
 m.staffContacts||={};m.staffContacts[id]={...m.staffContacts[id],mobile:dialNumber(mobile),whatsapp:dialNumber(whatsapp)};
 m.staffEmails||={};if(email)m.staffEmails[id]={email,sourceVerified:m.staffEmails[id]?.email===email&&m.staffEmails[id]?.sourceVerified===true};else delete m.staffEmails[id];
 if(Object.hasOwn(input,'photoData')){m.staffPhotos||={};if(input.photoData)m.staffPhotos[id]={data:input.photoData};else delete m.staffPhotos[id];}
 check(Array.isArray(input.assignments)&&input.assignments.length<=150,'Invalid support responsibilities.');
 check(status==='active'||!input.assignments.length,'Remove support responsibilities before marking the member inactive.');
 m.supportAssignments||={};const previous=Object.entries(m.supportAssignments).filter(([,a])=>a.staffId===id);for(const[k]of previous)delete m.supportAssignments[k];
 const seen=new Set();for(const a of input.assignments){
  check(['X','XII'].includes(a.classId)&&key(a.sectionId)&&key(a.subjectId)&&next.draft?.classes?.[a.classId]?.sections?.[a.sectionId]?.subjects?.[a.subjectId]&&typeof a.purpose==='string'&&a.purpose.trim()&&a.purpose.length<=300,'Choose a valid class, section, subject and support responsibility.');
  const scope=a.classId+':'+a.sectionId+':'+a.subjectId;check(!seen.has(scope),'Duplicate support responsibility.');seen.add(scope);
  const prior=previous.find(([,v])=>v.classId===a.classId&&v.sectionId===a.sectionId&&v.subjectId===a.subjectId),k=prior?.[0]||'support_'+tid+'_'+seen.size;
  check(!m.supportAssignments[k],'Support responsibility changed. Reload and retry.');m.supportAssignments[k]={...prior?.[1],staffId:id,classId:a.classId,sectionId:a.sectionId,subjectId:a.subjectId,role:kind,purpose:a.purpose.trim()};
 }
 recordContactChanges(current.mission||{},m,{id:'principal',name:'Principal'},now,'support_contact_'+newId+'_'+(current.mission?.revision||0));m.revision=(m.revision||0)+1;m.updatedAt=now;validateMission(m,next.draft,f);next.mission=m;next.facultyDraft=f;
 return {next,staffId:id,staffIds:[id],newStaffIds:editing?[]:[id]};
}
