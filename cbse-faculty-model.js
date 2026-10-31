import {clone,entries,uniqueKey} from './cbse-model.js';
export function emptyFaculty(){return {schemaVersion:1,revision:0,classes:{X:{classId:'X',teachers:{},roles:{}},XII:{classId:'XII',teachers:{},roles:{}}}};}
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const keys=value=>record(value)&&Object.keys(value).every(id=>/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id));
const string=(v,n,required=false)=>typeof v==='string'&&v.length<=n&&(!required||v.trim().length>0);
export function validateFaculty(value){
 assert(record(value)&&value.schemaVersion===1&&Number.isInteger(value.revision)&&value.revision>=0,'Invalid faculty data format.');
 assert(record(value.classes)&&Object.keys(value.classes).length===2&&value.classes.X&&value.classes.XII,'Class X and XII faculty areas are required.');
 for(const[cl,area]of entries(value.classes)){
  assert(area.classId===cl,'Invalid faculty class.');
  assert(!area.teachers||keys(area.teachers),'Invalid faculty identifiers.');
  assert(!area.roles||keys(area.roles),'Invalid section roles.');
  const names=new Set();
  for(const[,teacher]of entries(area.teachers)){
   assert(record(teacher)&&string(teacher.name,120,true),'Enter a faculty name (up to 120 characters).');
   assert(string(teacher.designation,100,true),'Enter a designation (up to 100 characters).');
   assert(string(teacher.subjects,300)&&string(teacher.teachingSections,150),'Subject or teaching-section text is too long.');
   assert(['active','vacant','inactive'].includes(teacher.status),'Choose Active, Vacant or Inactive.');
   const identity=`${teacher.name.trim().toLowerCase()}|${teacher.designation.trim().toLowerCase()}`;
   assert(!names.has(identity),'This faculty name and designation already exist in this class.');names.add(identity);
  }
  const classTeachers=new Set();
  for(const[,roles]of entries(area.roles)){
   assert(record(roles)&&string(roles.classTeacher,100)&&string(roles.coClassTeacher,100),'Invalid teacher roles.');
   const check=id=>assert(!id||(area.teachers?.[id]&&area.teachers[id].status!=='inactive'),'Choose an available faculty member from this class.');
   check(roles.classTeacher);check(roles.coClassTeacher);
   assert(!roles.classTeacher||roles.classTeacher!==roles.coClassTeacher,'Class teacher and co-class teacher must be different people.');
   if(roles.classTeacher){assert(!classTeachers.has(roles.classTeacher),'A class teacher can lead only one section in the same standard.');classTeachers.add(roles.classTeacher);}
   assert(!roles.other||(keys(roles.other)&&entries(roles.other).length<=10),'Use at most 10 additional roles per section.');
   for(const[,role]of entries(roles.other)){assert(record(role)&&string(role.label,60,true)&&string(role.teacherId,100,true),'Additional roles need a label and a faculty member.');check(role.teacherId);}
  }
 }
 return value;
}
export function clearTeacherRoles(area,id){
 for(const[,roles]of entries(area.roles)){
  if(roles.classTeacher===id)roles.classTeacher='';if(roles.coClassTeacher===id)roles.coClassTeacher='';
  for(const[key,role]of entries(roles.other))if(role.teacherId===id)delete roles.other[key];
 }
}
export function removeFaculty(value,classId,id){const result=clone(value),area=result.classes[classId];delete area.teachers[id];clearTeacherRoles(area,id);return validateFaculty(result);}
const clean=text=>text.replace(/\\([()])/g,'$1').replace(/\s+/g,' ').trim();
// Parse only the four left-hand roster columns. QP setters/evaluators are not
// treated as class-teacher assignments or used to invent faculty records.
export function extractFacultyRoster(pages){
 const records=[];let current=null,pending=null;
 for(const page of pages){
  const rows=[];
  const items=page.items.filter(i=>i.text.trim()&&i.y>124&&i.y<530&&i.x<301).sort((a,b)=>a.y-b.y||a.x-b.x);
  for(const item of items){let row=rows.find(row=>Math.abs(row.y-item.y)<2);if(!row){row={y:item.y,items:[]};rows.push(row);}row.items.push(item);}
  rows.sort((a,b)=>a.y-b.y);
  for(const row of rows){
   const col=(min,max)=>clean(row.items.filter(i=>i.x>=min&&i.x<max).sort((a,b)=>a.x-b.x).map(i=>i.text).join(' '));
   const serial=col(0,45),faculty=col(45,160),classText=col(160,220),subject=col(220,301);
   if(/^\d+$/.test(serial)){current={serial:Number(serial),faculty:[],teaching:[]};records.push(current);pending=null;}
   if(!current)continue;
   if(faculty&&faculty!=='-')current.faculty.push(faculty);
   if(/^Class(?:\s|$)/.test(classText)){pending={classText,subject};current.teaching.push(pending);}
   else if(pending){if(classText)pending.classText+=' '+classText;if(subject)pending.subject+=' '+subject;}
  }
 }
 const roster=records.map(record=>{
  const text=clean(record.faculty.join(' ')),match=/^(.*?)\s*\(([^)]+)\)/.exec(text);
  const name=match?match[1].trim():text,designation=match?match[2].trim():'Faculty';
  const teaching=record.teaching.map(row=>{
   const match=/^Class\s+(XII|X)-([A-Z0-9]+)\b/.exec(clean(row.classText));
   const subject=clean(row.subject).replace(/\s*\(\d+\)\s*/g,' ').trim();
   return match&&subject&&subject!=='-'?{classId:match[1],section:match[2],subject}:null;
  }).filter(Boolean);
  return {serial:record.serial,name,designation,teaching,status:/vacant/i.test(text)?'vacant':'active'};
 });
 assert(roster.length&&roster.some(r=>r.teaching.length),'No Class X/XII faculty found. Use the original VEMS faculty roster PDF.');
 return roster;
}
// Captured from the supplied screenshot. X-A is cropped out and remains unset.
const SCREENSHOT_ROLES={X:{B:[19,33],C:[26,35],D:[33,43]},XII:{A:[10,11],B:[11,16],C:[3,12],D:[5,4],E:[9,4]}};
export const ORIGINAL_FACULTY_SHA='02222829e8b1896edee71ed6be370756139438895389e8ea8a859542e858999f';
export function mergeFacultyRoster(value,roster,studentClasses,digest){
 const result=clone(value),summary={X:{added:0,kept:0},XII:{added:0,kept:0}},ids={X:{},XII:{}};
 for(const cl of ['X','XII']){
  const area=result.classes[cl];area.teachers||={};area.roles||={};
  for(const person of roster){
   const taught=person.teaching.filter(t=>t.classId===cl);if(!taught.length)continue;
   const sourceId=`pdf_${digest.slice(0,16)}_${person.serial}`;
   const matched=area.teachers[sourceId]?sourceId:entries(area.teachers).find(([,t])=>t.name.toLowerCase()===person.name.toLowerCase()&&t.designation.toLowerCase()===person.designation.toLowerCase())?.[0];
   const id=matched||sourceId;ids[cl][person.serial]=id;
   if(matched){summary[cl].kept++;continue;}
   area.teachers[id]={name:person.name,designation:person.designation,subjects:[...new Set(taught.map(t=>t.subject))].join(' · '),teachingSections:[...new Set(taught.map(t=>t.section))].sort().join(', '),status:person.status};summary[cl].added++;
  }
  // Apply screenshot defaults only for the exact original PDF, never to a new
  // roster whose serial numbers could represent different people.
  if(digest===ORIGINAL_FACULTY_SHA)for(const[section,pair]of entries(SCREENSHOT_ROLES[cl])){
   const sid=entries(studentClasses[cl]?.sections).find(([,s])=>s.name.toUpperCase()===section)?.[0];
   if(!sid||area.roles[sid])continue;
   const lead=ids[cl][pair[0]],co=ids[cl][pair[1]];
   const alreadyLeads=entries(area.roles).some(([,r])=>r.classTeacher===lead);
   if(lead&&co&&!alreadyLeads&&area.teachers[lead].status!=='inactive'&&area.teachers[co].status!=='inactive')area.roles[sid]={classTeacher:lead,coClassTeacher:co};
  }
 }
 validateFaculty(result);return {data:result,summary,screenshotApplied:digest===ORIGINAL_FACULTY_SHA};
}
