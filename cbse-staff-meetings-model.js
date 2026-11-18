import {rollDisplayName,rollStaffIdentityIds} from './cbse-roll-call-roster.js';

export function meetingRoster(staff){
 const covered=new Set(),roster=[{id:'principal',name:'Principal',designation:''}];
 for(const [id,person] of Object.entries(staff)){
  if(person.status!=='active'||covered.has(id)||!person.name?.trim()||(/\bvacant\b/i.test(person.name+' '+(person.designation||''))||/^principal$/i.test(person.designation?.trim()||'')))continue;
  for(const linked of rollStaffIdentityIds(staff,id))covered.add(linked);
  roster.push({id,name:rollDisplayName(person.name),designation:person.designation||''});
 }
 return [roster[0],...roster.slice(1).sort((a,b)=>a.name.localeCompare(b.name))];
}

export function meetingWriters(meeting){
 return meeting.writers||[{id:meeting.writerId,name:meeting.writerName}];
}

export function meetingWriterMatches(staff,meeting,staffId){
 return !!staffId&&meetingWriters(meeting).some(({id})=>staff[id]?.pinOwnerId===staffId||rollStaffIdentityIds(staff,id).includes(staffId));
}

const meetingKey=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
export function applyStaffMeeting(store,input,actor,staff,now){
 const meetings={...store},id=input.meetingId;
 if(!meetingKey(id))throw Error('Choose a valid staff meeting.');
 const meeting=meetings[id];
 if(input.meetingOperation==='create'||input.meetingOperation==='assign'){
  if(!actor.principal)throw Error('Only the Principal can assign a minute writer.');
  if(input.meetingOperation==='create'&&meeting)return meetings;
  const ids=input.writerIds??[input.writerId],roster=meetingRoster(staff);
  const available=new Map(roster.filter(person=>person.id!=='principal').map(person=>[person.id,person.name]));
  if(!Array.isArray(ids)||!ids.length||ids.length>available.size||new Set(ids).size!==ids.length||ids.some(id=>!available.has(id)))throw Error('Choose one or more different active staff members to write the minutes.');
  const writers=ids.map(id=>({id,name:available.get(id)}));
  if(input.meetingOperation==='create'){
   meetings[id]={id,createdAt:now,revision:1,writers,roster};
   return meetings;
  }
  if(!meeting||input.expectedRevision!==meeting.revision)throw Error('This meeting changed. Refresh it before assigning writers.');
  const {writerId,writerName,...previous}=meeting;
  meetings[id]={...previous,writers,revision:meeting.revision+1};
  return meetings;
 }
 if(input.meetingOperation!=='save')throw Error('Choose a valid meeting operation.');
 if(!meeting||!meetingWriterMatches(staff,meeting,actor.staffId))throw Error('Only the Principal-assigned minute writer can save this meeting.');
 if(input.expectedRevision!==meeting.revision)throw Error('This meeting changed. Reopen it to check the latest version before saving.');
 const {agenda,minutes,attendance}=input;
 if(typeof agenda!=='string'||!agenda.trim()||agenda.length>500)throw Error('Enter the agenda / subject in up to 500 characters.');
 if(typeof minutes!=='string'||!minutes.trim()||minutes.length>12000)throw Error('Enter the meeting minutes in up to 12,000 characters.');
 const valid=attendance&&typeof attendance==='object'&&!Array.isArray(attendance)&&Object.keys(attendance).length===meeting.roster.length&&meeting.roster.every(({id})=>Object.hasOwn(attendance,id)&&['present','absent'].includes(attendance[id]));
 if(!valid)throw Error('Mark each staff member Present or Not present.');
 meetings[id]={...meeting,agenda:agenda.trim(),minutes:minutes.trim(),attendance,savedByName:rollDisplayName(staff[actor.staffId].name),savedAt:now,revision:meeting.revision+1};
 return meetings;
}

export function staffMeetingList(store,{principal=false}={}){
 return Object.values(store||{}).sort((a,b)=>b.createdAt-a.createdAt).map(meeting=>{
  const {id,createdAt,agenda,savedAt,revision}=meeting,writers=meetingWriters(meeting);
  return {id,createdAt,writers,writerId:writers[0].id,writerName:writers[0].name,...(principal?{revision}:{}),...(savedAt?{agenda,savedAt}:{})};
 });
}
