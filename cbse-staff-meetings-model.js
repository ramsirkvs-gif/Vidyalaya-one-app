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

export function meetingWriterMatches(staff,writerId,staffId){
 return !!staffId&&(staff[writerId]?.pinOwnerId===staffId||rollStaffIdentityIds(staff,writerId).includes(staffId));
}

const meetingKey=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
export function applyStaffMeeting(store,input,actor,staff,now){
 const meetings={...store},id=input.meetingId;
 if(!meetingKey(id))throw Error('Choose a valid staff meeting.');
 const meeting=meetings[id];
 if(input.meetingOperation==='create'||input.meetingOperation==='assign'){
  if(!actor.principal)throw Error('Only the Principal can assign a minute writer.');
  if(input.meetingOperation==='create'&&meeting)return meetings;
  const writer=Object.hasOwn(staff,input.writerId)?staff[input.writerId]:null;
  if(writer?.status!=='active'||!meetingRoster(staff).some(person=>person.id===input.writerId))throw Error('Choose an active staff member to write the minutes.');
  if(input.meetingOperation==='create'){
   meetings[id]={id,createdAt:now,revision:1,writerId:input.writerId,writerName:rollDisplayName(writer.name),roster:meetingRoster(staff)};
   return meetings;
  }
  if(!meeting||input.expectedRevision!==meeting.revision)throw Error('This meeting changed. Refresh it before assigning a writer.');
  meetings[id]={...meeting,writerId:input.writerId,writerName:rollDisplayName(writer.name),revision:meeting.revision+1};
  return meetings;
 }
 if(input.meetingOperation!=='save')throw Error('Choose a valid meeting operation.');
 if(!meeting||!meetingWriterMatches(staff,meeting.writerId,actor.staffId))throw Error('Only the Principal-assigned minute writer can save this meeting.');
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
 return Object.values(store||{}).sort((a,b)=>b.createdAt-a.createdAt).map(({id,createdAt,writerId,writerName,agenda,savedAt,revision})=>({id,createdAt,writerId,writerName,...(principal?{revision}:{}),...(savedAt?{agenda,savedAt}:{})}));
}
