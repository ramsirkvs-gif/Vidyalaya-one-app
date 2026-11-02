import {clone,entries,uniqueKey} from './cbse-model.js';
import {meetingLink} from './cbse-contact-model.js';
export const facultyName=value=>String(value||'').toUpperCase().replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?\s*/g,'').replace(/[^A-Z0-9]/g,'');
const designationKind=value=>{const s=String(value||'').toUpperCase();return s.match(/\b(PGT|TGT|PRT)\b/)?.[1]||(/COUNS/.test(s)?'COUNSELLOR':/SPECIAL/.test(s)?'SPECIAL':/COMP/.test(s)?'COMPUTER':s.replace(/[^A-Z]/g,''));};
export const validFacultyEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const isAISubject=value=>['AI','ARTIFICIALINTELLIGENCE'].includes(String(value||'').toUpperCase().replace(/[^A-Z]/g,''));
export const supportRoleLabel=kind=>({prt:'PRT (Co-opted)',counsellor:'Counsellor',special_educator:'Special Educator',support:'AI Support'}[kind]||kind||'Support');
export function supportClasses(mission,draft,staffId){
 const sections=new Map();for(const a of supportDuties(mission,staffId)){const key=a.classId+':'+a.sectionId;sections.set(key,{classId:a.classId,sectionId:a.sectionId,name:draft.classes?.[a.classId]?.sections?.[a.sectionId]?.name||a.sectionId});}
 return [...sections.values()].sort((a,b)=>['X','XII'].indexOf(a.classId)-['X','XII'].indexOf(b.classId)||a.name.localeCompare(b.name,undefined,{numeric:true}));
}
const teachingSubject=value=>{const s=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return /^(MATHS|MATH|MATHEMATICS)(STANDARD|BASIC)?$/.test(s)?'MATHS':/^(ENGLISH|ENGLISHCORE|ENGLISHLANGUAGEANDLITERATURE)$/.test(s)?'ENGLISH':['AI','ARTIFICIALINTELLIGENCE'].includes(s)?'AI':['BSTD','BST','BUSINESSSTUDIES'].includes(s)?'BUSINESSSTUDIES':['CS','COMPUTERSCIENCE'].includes(s)?'CS':['IP','INFORMATICSPRACTICES'].includes(s)?'IP':['POLSCI','POLITICALSCIENCE'].includes(s)?'POLITICALSCIENCE':s;};
export function parseVCSetupCSV(header,rows){
 if(header.join(',')!=='RecordType,Name,Designation,Role,Purpose,Class,Sections,SubjectScope,Email,SourceVerified')throw Error('Use the prepared VC support CSV.');
 const members=new Map(),emails=[],teachingRows=[];
 for(const [i,row]of rows.entries()){
  if(row.length!==header.length)throw Error(`VC CSV row ${i+2} has the wrong number of columns.`);
  const [type,name,designation,kind,purpose,classId,sections,subjectScope,email,verified]=row;
  if(type==='Support'){
   const key=facultyName(name);if(!members.has(key))members.set(key,{name,designation,kind,purpose,scopes:[]});
   const member=members.get(key);if(member.designation!==designation||member.kind!==kind||member.purpose!==purpose)throw Error(`VC CSV row ${i+2}: conflicting support member.`);
   member.scopes.push({classId,sections:sections.split(';').map(s=>s.trim()).filter(Boolean),subjectScope});
  }else if(type==='Teaching'||type==='TemporaryTeaching'){
   const parts=kind.split(':');if(parts.length>2||parts.length===2&&!['X','XII'].includes(parts[0]))throw Error(`VC CSV row ${i+2}: invalid faculty reference.`);
   teachingRows.push({classId,teacherId:parts.at(-1),...(parts.length===2?{staffClassId:parts[0]}:{}),name,sections:sections.split(';').map(s=>s.trim()).filter(Boolean),subjects:purpose.split(';').map(s=>s.trim()).filter(Boolean),...(type==='TemporaryTeaching'?{temporary:true}:{})});
  }else if(type==='Email'){
   if(!['Verified','Not Verified'].includes(verified))throw Error(`VC CSV row ${i+2}: use Verified or Not Verified.`);
   emails.push({name,designation,email,sourceVerified:verified==='Verified'});
  }else throw Error(`VC CSV row ${i+2}: use Support, Email, Teaching or TemporaryTeaching record type.`);
 }
 if(!members.size&&!emails.length)throw Error('No VC setup records.');
 return {format:'mission-vc-support-v1',members:[...members.values()],emails,...(teachingRows.length?{teachingRows}:{})};
}
export function vcStaff(faculty,mission){
 const out={};for(const[cl,c]of entries(faculty?.classes))for(const[id,t]of entries(c.teachers))out[cl+':'+id]={...t,classId:cl,kind:'faculty'};
 for(const[id,t]of entries(mission?.staff))out['support:'+id]={...t,classId:''};
 for(const[id,t]of entries(out)){t.email=mission?.staffEmails?.[id]?.email||t.email||'';if(mission?.staffPhotos?.[id]?.data)t.photoData=mission.staffPhotos[id].data;}
 return out;
}
export function supportDuties(mission,staffId='',classId='',sectionId='',subjectIds=null){return entries(mission?.supportAssignments).map(([,a])=>a).filter(a=>(!staffId||a.staffId===staffId)&&(!classId||a.classId===classId)&&(!sectionId||a.sectionId===sectionId)&&(!subjectIds||subjectIds.includes(a.subjectId)));}
export function supportTeam(mission,faculty,classId,sectionId,subjectIds=null){
 const staff=vcStaff(faculty,mission),groups=new Map();for(const a of supportDuties(mission,'',classId,sectionId,subjectIds)){
  if(staff[a.staffId]?.status!=='active')continue;
  if(!groups.has(a.staffId))groups.set(a.staffId,{...staff[a.staffId],id:a.staffId,supportRole:a.role,purposes:new Set(),subjects:new Set()});
  groups.get(a.staffId).purposes.add(a.purpose);groups.get(a.staffId).subjects.add(a.subjectId);
 }
 return [...groups.values()].map(p=>({...p,purposes:[...p.purposes],subjects:[...p.subjects]}));
}
export function importVCSetup(pkg,mission,draft,faculty){
 if(pkg?.format!=='mission-vc-support-v1'||!Array.isArray(pkg.members)||!Array.isArray(pkg.emails))throw Error('Use the prepared VC support setup file.');
 const next=clone(mission),issues=[];next.staff||={};next.staffEmails||={};next.supportAssignments||={};let added=0,updated=0,assignments=0,emails=0;
 for(const member of pkg.members){
  if(!member.name||member.name.length>120||!['prt','counsellor','special_educator','support'].includes(member.kind)||!Array.isArray(member.scopes)||!member.purpose||member.purpose.length>300)throw Error('Invalid support member.');
  const candidates=entries(vcStaff(faculty,next)).filter(([id,t])=>facultyName(t.name)===facultyName(member.name)&&(id.startsWith('support:')||(t.designation||'').trim().toUpperCase()===(member.designation||'').trim().toUpperCase()||t.kind===member.kind));
  let staffId=candidates[0]?.[0];
  if(!staffId){const id=uniqueKey('vc_'+facultyName(member.name).toLowerCase(),next.staff);staffId='support:'+id;next.staff[id]={name:member.name,designation:member.designation,kind:member.kind,subjects:member.purpose,status:'active'};added++;}
  else if(staffId.startsWith('support:')){const id=staffId.slice(8),old=next.staff[id],value={...old,designation:old.designation||member.designation,kind:member.kind,subjects:old.subjects||member.purpose,status:'active'};if(JSON.stringify(old)!==JSON.stringify(value)){next.staff[id]=value;updated++;}}
  for(const scope of member.scopes){
   if(!['X','XII'].includes(scope.classId)||!['all','non_ai','ai'].includes(scope.subjectScope)||!Array.isArray(scope.sections))throw Error('Invalid support scope.');
   for(const name of scope.sections){const section=entries(draft.classes?.[scope.classId]?.sections).find(([,s])=>s.name.toUpperCase()===String(name).toUpperCase());if(!section){issues.push(`${member.name}: section ${scope.classId}-${name} not found.`);continue;}
    const[sid,s]=section;for(const[subId,sub]of entries(s.subjects)){if(scope.subjectScope==='ai'&&!isAISubject(sub.name)||scope.subjectScope==='non_ai'&&isAISubject(sub.name))continue;
     const id=`vc_${staffId}_${scope.classId}_${sid}_${subId}`,record={classId:scope.classId,sectionId:sid,subjectId:subId,staffId,purpose:member.purpose,role:member.kind};
     if(JSON.stringify(next.supportAssignments[id])!==JSON.stringify(record)){next.supportAssignments[id]=record;assignments++;}
    }
   }
  }
 }
 const staff=vcStaff(faculty,next),needed=new Set(pkg.members.map(m=>facultyName(m.name)));let ignored=0;
 for(const row of pkg.emails){if(!validFacultyEmail(row.email)){issues.push(`${row.name}: blank or invalid email.`);continue;}
  const candidates=entries(staff).filter(([id,t])=>t.status==='active'&&(!id.startsWith('support:')||needed.has(facultyName(t.name)))&&facultyName(t.name)===facultyName(row.name)&&(!row.designation||designationKind(t.designation||t.kind)===designationKind(row.designation)));
  if(!candidates.length){ignored++;continue;}
  const designations=new Set(candidates.map(([,t])=>String(t.designation||t.kind).toUpperCase().replace(/[^A-Z]/g,'')));if(designations.size>1){issues.push(`${row.name}: ambiguous faculty name; email unchanged.`);continue;}
  for(const[id]of candidates){const value={email:row.email.trim(),sourceVerified:row.sourceVerified===true};if(JSON.stringify(next.staffEmails[id])!==JSON.stringify(value)){next.staffEmails[id]=value;emails++;}}
 }
 let teaching=0;
 if(pkg.teachingRows){
  if(!Array.isArray(pkg.teachingRows))throw Error('Invalid source teaching rows.');
  const rows=pkg.teachingRows.filter(row=>{const t=faculty?.classes?.[row.staffClassId||row.classId]?.teachers?.[row.teacherId];if(!t||t.status!=='active'||facultyName(t.name)!==facultyName(row.name)){issues.push(`${row.name}: source faculty no longer matches; teaching assignments unchanged.`);return false;}if(!Array.isArray(row.sections)||!Array.isArray(row.subjects))throw Error('Invalid source subject/section list.');return true;});
  next.allocations||={};for(const[cl,c]of entries(draft.classes))for(const[sid,s]of entries(c.sections))for(const[subId,sub]of entries(s.subjects)){
   const old=entries(next.allocations).find(([,a])=>a.classId===cl&&a.sectionId===sid&&a.subjectId===subId);if(old&&vcStaff(faculty,next)[old[1].staffId]?.status==='active')continue;
   const matches=rows.filter(r=>r.classId===cl&&r.sections.includes(s.name)&&r.subjects.some(name=>teachingSubject(name)===teachingSubject(sub.name)));
   if(matches.length===1){next.allocations[old?.[0]||`source_${cl}_${sid}_${subId}`]={classId:cl,sectionId:sid,subjectId:subId,staffId:(matches[0].staffClassId||cl)+':'+matches[0].teacherId,...(matches[0].temporary?{temporary:true}:{})};teaching++;}
   else if(matches.length>1)issues.push(`${cl}-${s.name}: multiple source teachers for ${sub.name}; choose manually.`);
  }
 }
 return {next,added,updated,assignments,teaching,emails,ignored,issues};
}
export function importClassMeetings(rows,mission,draft){
 const next=clone(mission);next.classMeetings||={};let matched=0,changed=0;const seen=new Set();
 for(const row of rows){const classId=String(row.Class||'').trim(),section=entries(draft.classes?.[classId]?.sections).find(([,s])=>s.name===row.Section);if(!section)throw Error('Unknown class/section in Class VC file.');
  const sectionId=section[0],key=classId+':'+sectionId,link=meetingLink(String(row.MeetingLink||''));if(!link)throw Error('Missing Class VC link.');if(seen.has(key))throw Error('Duplicate Class VC section.');seen.add(key);
  if(entries(next.classMeetings).some(([other,m])=>other!==key&&m.meetingLink===link)||entries(next.students).some(([,p])=>p.meetingLink===link))throw Error('Class VC needs its own distinct meeting link.');
  const value={classId,sectionId,meetingLink:link};if(JSON.stringify(next.classMeetings[key])!==JSON.stringify(value)){next.classMeetings[key]=value;changed++;}matched++;
 }
 if(!matched)throw Error('No Class VC rows.');return {next,matched,changed};
}
export function calendarVCPlan(draft,faculty,mission){
 const staff=vcStaff(faculty,mission),issues=[],emailFor=(ids,label)=>{
  const emails=[];for(const id of new Set(ids.filter(Boolean))){const t=staff[id];if(!t||t.status!=='active')continue;if(validFacultyEmail(t.email))emails.push(t.email);else issues.push(`${label}: faculty email missing for ${t.name}.`);}return [...new Set(emails.map(e=>e.toLowerCase()))];
 },students=[],classes=[];
 for(const[cl,c]of entries(draft.classes))for(const[sid,s]of entries(c.sections)){
  const roles=faculty?.classes?.[cl]?.roles?.[sid]||{},leads=[roles.classTeacher&&cl+':'+roles.classTeacher,roles.coClassTeacher&&cl+':'+roles.coClassTeacher];
  for(const[field,label]of [['classTeacher','CT'],['coClassTeacher','Co-CT']])if(!roles[field])issues.push(`${cl}-${s.name}: ${label} not assigned.`);
  const universal=supportTeam(mission,faculty,cl,sid).filter(t=>['counsellor','special_educator'].includes(t.supportRole)),classStudents=[];
  for(const role of ['counsellor','special_educator'])if(!universal.some(t=>t.supportRole===role))issues.push(`${cl}-${s.name}: ${role.replace('_',' ')} not assigned.`);
  for(const[id,p]of entries(s.students)){
   const key=`${cl}:${sid}:${id}`,contact=mission.students?.[key]||{},email=validFacultyEmail(contact.email)?contact.email:'';
   if(!email)issues.push(`${cl}-${s.name} · ${p.name}: student email missing.`);else classStudents.push(email.toLowerCase());
   const teachers=entries(mission.allocations).map(([,a])=>a).filter(a=>a.classId===cl&&a.sectionId===sid&&p.subjects?.[a.subjectId]).map(a=>a.staffId);
   for(const[subId]of entries(p.subjects))if(!entries(mission.allocations).some(([,a])=>a.classId===cl&&a.sectionId===sid&&a.subjectId===subId))issues.push(`${cl}-${s.name}: subject teacher not assigned for ${s.subjects?.[subId]?.name||subId}.`);
   const support=supportTeam(mission,faculty,cl,sid,Object.keys(p.subjects||{})).map(t=>t.id);
   const guests=emailFor([...leads,...teachers,...support],`${cl}-${s.name}`);
   if(contact.meetingLink)students.push({classId:cl,section:s.name,name:p.name,meetingLink:meetingLink(contact.meetingLink),emails:[...new Set([email.toLowerCase(),...guests].filter(Boolean))]});else issues.push(`${cl}-${s.name} · ${p.name}: individual meeting link missing.`);
  }
  const teachers=emailFor([...leads,...universal.map(t=>t.id)],`${cl}-${s.name}`);
  classes.push({classId:cl,section:s.name,meetingLink:mission.classMeetings?.[cl+':'+sid]?.meetingLink||'',emails:[...new Set([...classStudents,...teachers])]});
 }
 return {format:'mission-calendar-vc-v1',hostEmail:'naharlagunkv1@gmail.com',students,classes,issues:[...new Set(issues)],unverifiedFaculty:entries(mission.staffEmails).filter(([,r])=>!r.sourceVerified).length};
}
