import {rollDisplayName,rollStaffIdentityIds} from './cbse-roll-call-roster.js';

export const attendanceWings=[['both','Both wings'],['secondary','Secondary wing'],['primary','Primary wing']];
export const attendanceRoles=['SMT-1','SMT-2','SMT-3'];
export const minuteLanguages=[['hi','Hindi (Rajbhasha)'],['en','English']];

export function meetingRoster(staff){
 const covered=new Set(),roster=[{id:'principal',name:'Principal',designation:''}];
 for(const [id,person] of Object.entries(staff)){
  if(person.status!=='active'||covered.has(id)||!person.name?.trim()||(/\bvacant\b/i.test(person.name+' '+(person.designation||''))||/^principal$/i.test(person.designation?.trim()||'')))continue;
  for(const linked of rollStaffIdentityIds(staff,id))covered.add(linked);
  roster.push({id,name:rollDisplayName(person.name),designation:person.designation||'',wing:person.wing||''});
 }
 return [roster[0],...roster.slice(1).sort((a,b)=>a.name.localeCompare(b.name))];
}

export function meetingWriters(meeting){
 return meeting.writers||(meeting.writerId?[{id:meeting.writerId,name:meeting.writerName}]:[]);
}
export function meetingAttendanceRoster(meeting,staff={}){
 const wing=meeting.attendanceWing||'both';
 return meeting.roster.filter(person=>wing==='both'||person.id==='principal'||(person.wing||staff[person.id]?.wing)===wing);
}
function matches(staff,people,staffId){
 return !!staffId&&people.some(({id})=>staff[id]?.pinOwnerId===staffId||rollStaffIdentityIds(staff,id).includes(staffId));
}
export function canOpenMeeting(staff,meeting,actor,task){
 if(task==='attendance')return actor.principal||matches(staff,meeting.attendanceTakers||[],actor.staffId);
 if(task!=='minutes')return false;
 return actor.principal?!!meeting.savedAt:matches(staff,meetingWriters(meeting),actor.staffId);
}

const meetingKey=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
function knownWriters(ids,roster){
 const available=new Map(roster.filter(person=>person.id!=='principal').map(person=>[person.id,person.name]));
 if(!Array.isArray(ids)||ids.length>available.size||new Set(ids).size!==ids.length||ids.some(id=>!available.has(id)))throw Error('Choose different active staff members.');
 return ids.map(id=>({id,name:available.get(id)}));
}
function minuteText({agenda,minutes,language},required){
 if(!minuteLanguages.some(([id])=>id===language))throw Error('Choose Hindi (Rajbhasha) or English.');
 if(typeof agenda!=='string'||agenda.length>500||required&&!agenda.trim())throw Error('Enter the agenda / subject in up to 500 characters.');
 if(typeof minutes!=='string'||minutes.length>12000||required&&!minutes.trim())throw Error('Enter the meeting minutes in up to 12,000 characters.');
 return {agenda:agenda.trim(),minutes:minutes.trim(),language};
}
export function applyStaffMeeting(store,input,actor,staff,now){
 const meetings={...store},id=input.meetingId,operation=input.meetingOperation;
 if(!meetingKey(id))throw Error('Choose a valid staff meeting.');
 const meeting=meetings[id];
 if(operation==='create'){
  if(!actor.principal)throw Error('Only the Principal can create a meeting.');
  if(meeting)return meetings;
  const roster=meetingRoster(staff),writers=knownWriters(input.writerIds??(input.writerId?[input.writerId]:[]),roster);
  meetings[id]={id,createdAt:now,revision:1,writers,roster,attendanceWing:'both'};
  return meetings;
 }
 if(!meeting)throw Error('Choose an existing staff meeting.');
 if(input.expectedRevision!==meeting.revision)throw Error('This meeting changed. Reopen it to check the latest version before saving.');
 let changes;
 if(operation==='assign'){
  if(!actor.principal)throw Error('Only the Principal can assign minute writers.');
  const writers=knownWriters(input.writerIds??[input.writerId],meetingRoster(staff));
  if(!writers.length)throw Error('Assign at least one minute writer.');
  changes={writers};
 }else if(operation==='attendance-assign'){
  if(!actor.principal)throw Error('Only the Principal can assign attendance.');
  const {attendanceWing,attendanceTakers}=input;
  if(!attendanceWings.some(([id])=>id===attendanceWing)||!Array.isArray(attendanceTakers)||attendanceTakers.length>3)throw Error('Choose valid attendance assignments.');
  const roles=attendanceTakers.map(row=>row?.role);
  if(new Set(roles).size!==roles.length||roles.some(role=>!attendanceRoles.includes(role)))throw Error('Choose each SMT role once.');
  const people=knownWriters(attendanceTakers.map(row=>row.id),meetingRoster(staff));
  changes={attendanceWing,attendanceTakers:people.map((person,index)=>({...person,role:roles[index]}))};
 }else if(operation==='attendance-save'){
  if(!canOpenMeeting(staff,meeting,actor,'attendance'))throw Error('Only the Principal or an assigned SMT can take attendance.');
  const roster=meetingAttendanceRoster(meeting,staff),{attendance}=input;
  if(!attendance||typeof attendance!=='object'||Array.isArray(attendance)||Object.keys(attendance).length!==roster.length||roster.some(({id})=>!Object.hasOwn(attendance,id)||!['present','absent'].includes(attendance[id])))throw Error('Mark each staff member Present or Not present.');
  changes={attendance:{...meeting.attendance,...attendance}};
 }else if(['minutes-draft','minutes-submit','minutes-edit'].includes(operation)){
  if(!canOpenMeeting(staff,meeting,actor,'minutes'))throw Error('Only the Principal-assigned minute writers can enter minutes.');
  if(actor.principal?operation!=='minutes-edit':operation==='minutes-edit'||!!meeting.savedAt)throw Error('Submitted minutes can be edited only by the Principal.');
  const text=minuteText(input,operation!=='minutes-draft');
  if(operation==='minutes-draft')changes={draft:text};
  else changes={...text,draft:null,savedAt:meeting.savedAt||now,savedByName:actor.principal?meeting.savedByName||meetingWriters(meeting)[0]?.name||'Principal':rollDisplayName(staff[actor.staffId].name),updatedAt:now};
 }else throw Error('Choose a valid meeting operation.');
 const {writerId,writerName,...previous}=meeting;
 meetings[id]={...previous,writers:meetingWriters(meeting),...changes,revision:meeting.revision+1};
 return meetings;
}

export function staffMeetingList(store,{principal=false}={}){
 return Object.values(store||{}).sort((a,b)=>b.createdAt-a.createdAt).map(meeting=>{
  const {id,createdAt,agenda,savedAt,revision}=meeting,writers=meetingWriters(meeting);
  return {id,createdAt,writers,attendanceWing:meeting.attendanceWing||'both',attendanceTakers:meeting.attendanceTakers||[],...(principal?{revision}:{}),...(savedAt?{agenda,savedAt}:{})};
 });
}
