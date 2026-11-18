import {primaryStaffEntry} from './cbse-primary-roster.js';
import {rollDisplayName,rollNameKey,rollStaffIdentityIds,secondaryStaffEntry} from './cbse-roll-call-roster.js';

export const attendanceWings=[['both','Both wings'],['secondary','Secondary wing'],['primary','Primary wing']];
export const attendanceRoles=['SMT-1','SMT-2','SMT-3'];
export const minuteLanguages=[['hi','Hindi (Rajbhasha)'],['en','English']];

// Bengia is listed between Priyanka Gupta and Pankaj Pandey in the supplied order.
const primaryMeetingOrder=new Map([['BENGIAYAPI',22.5]]);
function meetingWing(person){
 return primaryStaffEntry(person)||rollNameKey(person.name)==='BENGIAYAPI'?'primary':person.wing||'';
}
function meetingRank(person){
 if(person.id==='principal')return 0;
 if(/^PGT\b/i.test(person.designation||''))return 1;
 if(/^TGT\b/i.test(person.designation||''))return 2;
 if(meetingWing(person)==='secondary')return 3;
 if(meetingWing(person)==='primary')return 4;
 return 5;
}
function meetingOrder(person){
 const primary=primaryStaffEntry(person),key=rollNameKey(primary?.name||person.name);
 if(meetingWing(person)==='primary')return primaryMeetingOrder.get(key)??primary?.serial??9999;
 const serial=secondaryStaffEntry(person)?.serial;
 if(serial)return serial;
 if(key==='GOCHAMYAGOM')return secondaryStaffEntry({name:'Ms. M.T. Munya'}).serial-.5;
 if(key==='BAMANGMEHA')return secondaryStaffEntry({name:'Ms. Tailyang Yasung'}).serial-.5;
 return 9999;
}
function sortMeetingRoster(roster){
 return [...roster].sort((a,b)=>meetingRank(a)-meetingRank(b)||meetingOrder(a)-meetingOrder(b)||a.name.localeCompare(b.name));
}

export function meetingRoster(staff){
 const covered=new Set(),roster=[{id:'principal',name:'Principal',designation:''}];
 for(const [id,person] of Object.entries(staff)){
  if(['JENLANMONYAK','DAMIANGMEHA'].includes(rollNameKey(person.name))||person.status!=='active'||covered.has(id)||!person.name?.trim()||(/\bvacant\b/i.test(person.name+' '+(person.designation||''))||/^principal$/i.test(person.designation?.trim()||'')))continue;
  for(const linked of rollStaffIdentityIds(staff,id))covered.add(linked);
  roster.push({id,name:rollDisplayName(person.name),designation:person.designation||'',wing:meetingWing(person)});
 }
 return sortMeetingRoster(roster);
}

export function meetingWriters(meeting){
 return (meeting.writers||(meeting.writerId?[{id:meeting.writerId,name:meeting.writerName}]:[])).map(writer=>({...writer,language:writer.language||meeting.language||meeting.draft?.language||'en'}));
}
export function meetingAttendanceRoster(meeting,staff={}){
 const wing=meeting.attendanceWing||'both';
 const roster=meeting.roster.map(person=>({...person,wing:meetingWing({...person,wing:person.wing||staff[person.id]?.wing})}));
 return sortMeetingRoster(roster.filter(person=>wing==='both'||person.id==='principal'||person.wing===wing));
}
function matches(staff,people,staffId){
 return !!staffId&&people.some(({id})=>staff[id]?.pinOwnerId===staffId||rollStaffIdentityIds(staff,id).includes(staffId));
}
export function meetingMinute(meeting,language){
 if(!minuteLanguages.some(([id])=>id===language))return {};
 if(meeting.versions?.[language])return meeting.versions[language];
 if((meeting.language||meeting.draft?.language||'en')!==language)return {};
 if(meeting.savedAt)return {agenda:meeting.agenda,minutes:meeting.minutes,savedAt:meeting.savedAt,savedByName:meeting.savedByName||meetingWriters(meeting)[0]?.name||'Principal'};
 return meeting.draft?{draft:meeting.draft}:{};
}
export function meetingReport(meeting,staff){
 const roster=meetingAttendanceRoster(meeting,staff),attendance=meeting.attendance||{};
 const people=status=>roster.filter(person=>attendance[person.id]===status).map(({name,designation})=>({name,designation}));
 const versions=minuteLanguages.flatMap(([language])=>{
  const {agenda,minutes,savedByName,savedAt}=meetingMinute(meeting,language);
  return savedAt?[{language,agenda,minutes,writerName:savedByName}]:[];
 });
 return {createdAt:meeting.createdAt,scheduledAt:meeting.scheduledAt||meeting.createdAt,versions,writers:meetingWriters(meeting).map(({name,language})=>({name,language})),attendanceTakenBy:meeting.attendanceTakenBy||'',attendanceWing:meeting.attendanceWing||'both',present:people('present'),absent:people('absent'),unmarked:people(undefined)};
}
export function publishedMeetingReport(meeting,staff){
 return meeting.publishedReport===undefined&&meeting.savedAt?meetingReport(meeting,staff):meeting.publishedReport||null;
}
export function canOpenMeeting(staff,meeting,actor,task,language){
 if(task==='attendance')return actor.principal||matches(staff,meeting.attendanceTakers||[],actor.staffId);
 if(task!=='minutes'||!minuteLanguages.some(([id])=>id===language))return false;
 return actor.principal?!!meetingMinute(meeting,language).savedAt:matches(staff,meetingWriters(meeting).filter(writer=>writer.language===language),actor.staffId);
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
  const {meetingDate,meetingTime,meetingAgenda}=input;
  const validDate=typeof meetingDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)&&Number.isFinite(Date.parse(meetingDate))&&new Date(meetingDate).toISOString().slice(0,10)===meetingDate;
  if(!validDate||typeof meetingTime!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(meetingTime))throw Error('Enter a valid meeting date and time in IST.');
  if(typeof meetingAgenda!=='string'||!meetingAgenda.trim()||meetingAgenda.length>500)throw Error('Enter a meeting agenda in up to 500 characters.');
  const scheduledAt=Date.parse(meetingDate+'T'+meetingTime+':00+05:30');
  const roster=meetingRoster(staff),writers=knownWriters(input.writerIds??(input.writerId?[input.writerId]:[]),roster);
  meetings[id]={id,createdAt:now,scheduledAt,meetingAgenda:meetingAgenda.trim(),revision:1,writers,roster,attendanceWing:'both'};
  return meetings;
 }
 if(!meeting)throw Error('Choose an existing staff meeting.');
 const isMinutes=['minutes-draft','minutes-submit','minutes-edit'].includes(operation),isAttendance=operation==='attendance-save';
 const minute=isMinutes?meetingMinute(meeting,input.language):null;
 const revision=isMinutes?minute.revision||0:isAttendance?meeting.attendanceRevision||0:meeting.revision;
 if(input.expectedRevision!==revision)throw Error('This meeting changed. Reopen it to check the latest version before saving.');
 let changes;
 if(operation==='assign'){
  if(!actor.principal)throw Error('Only the Principal can assign minute writers.');
  const assignments=input.writers??(input.writerIds??[input.writerId]).map(id=>({id,language:'en'}));
  if(!Array.isArray(assignments)||!assignments.length||assignments.some(writer=>!minuteLanguages.some(([id])=>writer?.language===id)))throw Error('Assign at least one minute writer and choose their language.');
  const writers=knownWriters(assignments.map(writer=>writer.id),meetingRoster(staff));
  changes={writers:writers.map((writer,index)=>({...writer,language:assignments[index].language}))};
 }else if(operation==='attendance-assign'){
  if(!actor.principal)throw Error('Only the Principal can assign attendance.');
  const {attendanceWing,attendanceTakers}=input;
  if(!attendanceWings.some(([id])=>id===attendanceWing)||!Array.isArray(attendanceTakers)||attendanceTakers.length>3)throw Error('Choose valid attendance assignments.');
  const roles=attendanceTakers.map(row=>row?.role);
  if(new Set(roles).size!==roles.length||roles.some(role=>!attendanceRoles.includes(role)))throw Error('Choose each SMT role once.');
  const people=knownWriters(attendanceTakers.map(row=>row.id),meetingRoster(staff));
  changes={attendanceWing,attendanceRevision:(meeting.attendanceRevision||0)+1,attendanceTakers:people.map((person,index)=>({...person,role:roles[index]}))};
 }else if(operation==='attendance-save'){
  if(!canOpenMeeting(staff,meeting,actor,'attendance'))throw Error('Only the Principal or an assigned SMT can take attendance.');
  const roster=meetingAttendanceRoster(meeting,staff),{attendance}=input;
  if(!attendance||typeof attendance!=='object'||Array.isArray(attendance)||Object.keys(attendance).length!==roster.length||roster.some(({id})=>!Object.hasOwn(attendance,id)||!['present','absent'].includes(attendance[id])))throw Error('Mark each staff member Present or Not present.');
  changes={attendance:{...meeting.attendance,...attendance},attendanceRevision:revision+1,attendanceTakenBy:actor.principal?'Principal':rollDisplayName(staff[actor.staffId].name)};
 }else if(isMinutes){
  if(!canOpenMeeting(staff,meeting,actor,'minutes',input.language))throw Error('Only the assigned minute writer can enter minutes for this language.');
  if(actor.principal?operation!=='minutes-edit':operation==='minutes-edit'||!!minute.savedAt)throw Error('Submitted minutes can be edited only by the Principal.');
  const text=minuteText(input,operation!=='minutes-draft'),version=operation==='minutes-draft'?{draft:text,revision:revision+1}:{
   ...text,savedAt:minute.savedAt||now,savedByName:actor.principal?minute.savedByName:rollDisplayName(staff[actor.staffId].name),revision:revision+1
  };
  changes={versions:{...meeting.versions,[input.language]:version}};
 }else if(operation==='publish'||operation==='unpublish'){
  if(!actor.principal)throw Error('Only the Principal can publish or stop publication.');
  const report=meetingReport(meeting,staff);
  if(operation==='publish'&&!report.versions.length)throw Error('Submit minutes before publishing the report.');
  changes={publishedReport:operation==='publish'?report:false};
 }else throw Error('Choose a valid meeting operation.');
 const {writerId,writerName,...previous}=meeting;
 meetings[id]={...previous,publishedReport:publishedMeetingReport(meeting,staff)||false,writers:meetingWriters(meeting),...changes,revision:meeting.revision+(isMinutes||isAttendance?0:1)};
 return meetings;
}

export function staffMeetingList(store,{principal=false}={}){
 return Object.values(store||{}).sort((a,b)=>b.createdAt-a.createdAt).map(meeting=>{
  const {id,createdAt,revision}=meeting,writers=meetingWriters(meeting);
  const versions=minuteLanguages.filter(([language])=>meetingMinute(meeting,language).savedAt).map(([language])=>language);
  const published=!!meeting.publishedReport||meeting.publishedReport===undefined&&!!meeting.savedAt;
  const agenda=meeting.meetingAgenda||meeting.publishedReport?.versions?.[0]?.agenda||(published?meeting.agenda:undefined);
  return {id,createdAt,scheduledAt:meeting.scheduledAt||createdAt,writers,published,submittedLanguages:versions,attendanceWing:meeting.attendanceWing||'both',attendanceTakers:meeting.attendanceTakers||[],...(principal?{revision}:{}),...(agenda?{agenda}:{})};
 });
}
