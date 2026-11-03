// This module contains no school records. The Principal downloads a private copy
// with the current portal's participants inserted locally in their browser.
export function calendarVCScript(plan){const individual={...plan,scope:'individual-only',classes:[]};return `/* School account: ${plan.hostEmail}
INDIVIDUAL VC ONLY. Class VC is paused. Existing Meet links are retained.
Replace only the earlier VCUpdate.gs update file, or add it if absent. Keep the original meeting-generation script and Calendar advanced service.
1. Run vcPrepareUpdate; review the Guests column and Issues tab in the private sheet.
2. Run vcApplyNextBatch to update at most 50 EXISTING individual events per run.
   This sets the exact saved student/concerned-team guest list, removing other guests.
   Incomplete enrolment/team/email records are skipped, not guessed.
No meetings are created. No invitation emails are requested (sendUpdates:none).
Calendar guests do NOT configure Meet admission or co-hosts. Status only confirms guests.
The school organizer must verify Restricted access, uninvited-join/request controls,
and eligible teacher co-hosts in Meet. Account/licence restrictions may require the organizer
present. Never share the school password. These settings cannot be verified by this script.
Review missing/ambiguous assignments and emails before applying. Keep this file private.
*/
const VC_PLAN=${JSON.stringify(individual,null,2)};
${vcBook.toString()}
${vcPrepareUpdate.toString()}
${vcLink.toString()}
${vcApplyNextBatch.toString()}
`;}
function vcBook(){const id=PropertiesService.getUserProperties().getProperty('vcUpdateBook');if(!id)throw Error('Run vcPrepareUpdate first.');return SpreadsheetApp.openById(id);}
function vcPrepareUpdate(){
 const lock=LockService.getUserLock();lock.waitLock(10000);
 try{
 const account=Calendar.CalendarList.get('primary').id;if(account.toLowerCase()!==VC_PLAN.hostEmail.toLowerCase())throw Error('Use the school account '+VC_PLAN.hostEmail+'.');
 const props=PropertiesService.getUserProperties(),existing=props.getProperty('vcUpdateBook');
 const book=existing?SpreadsheetApp.openById(existing):SpreadsheetApp.create('Private individual VC update'),sheet=existing?book.getSheetByName('VC update'):book.getSheets()[0];
 if(!sheet)throw Error('The saved update workbook is missing its VC update tab.');if(!existing)sheet.setName('VC update');
 const key=row=>JSON.stringify(row.slice(0,4)),old=new Map((existing?sheet.getDataRange().getDisplayValues().slice(1):[]).map(row=>[key(row),row]));
 const guests=value=>[...new Set(String(value||'').split(';').map(s=>s.trim().toLowerCase()).filter(Boolean))].sort().join(';');
 const rows=VC_PLAN.students.map(s=>['Individual',s.classId,s.section,s.name,s.meetingLink,s.emails.join('; '),s.readyForSync===true?'Pending':'Review required — incomplete student/team data']);
 for(const row of rows){const previous=old.get(key(row));if(previous&&row[6]==='Pending'&&previous[6]==='Guests updated; Meet access unverified'&&previous[4]===row[4]&&guests(previous[5])===guests(row[5]))row[6]=previous[6];}
 sheet.clearContents();
 sheet.getRange(1,1,1,7).setValues([['Type','Class','Section','StudentName','MeetingLink','Guests','Status']]);
 if(rows.length)sheet.getRange(2,1,rows.length,7).setNumberFormat('@').setValues(rows);sheet.setFrozenRows(1);
 const issues=book.getSheetByName('Issues')||book.insertSheet('Issues');issues.clearContents();issues.getRange(1,1).setValue('Current export: review before Calendar updates');
 const notes=[...VC_PLAN.issues,VC_PLAN.unverifiedFaculty+' faculty email records are marked Not Verified in the uploaded source.'];issues.getRange(2,1,notes.length,1).setNumberFormat('@').setValues(notes.map(s=>[s]));
 props.setProperty('vcUpdateBook',book.getId());
 console.log((existing?'Refreshed':'Private')+' update sheet: '+book.getUrl());
 console.log('Current export: '+VC_PLAN.students.length+' individual meetings; '+VC_PLAN.issues.length+' review items; '+rows.filter(r=>r[6]==='Pending').length+' pending updates. Existing links are preserved.');
 }finally{lock.releaseLock();}
}
function vcLink(event){return event.hangoutLink||((event.conferenceData||{}).entryPoints||[]).filter(p=>p.entryPointType==='video').map(p=>p.uri)[0]||'';}
function vcApplyNextBatch(){
 const lock=LockService.getUserLock();lock.waitLock(10000);
 try{
  if(Calendar.CalendarList.get('primary').id.toLowerCase()!==VC_PLAN.hostEmail.toLowerCase())throw Error('Use the school account '+VC_PLAN.hostEmail+'.');
  const book=vcBook(),sheet=book.getSheetByName('VC update'),byLink={},work=VC_PLAN.students;let pageToken;
  do{const result=Calendar.Events.list('primary',{maxResults:2500,showDeleted:false,...(pageToken?{pageToken}:{})});for(const event of result.items||[]){const link=vcLink(event);if(link){if(!byLink[link])byLink[link]=[];byLink[link].push(event);}}pageToken=result.nextPageToken;}while(pageToken);
  const saved=sheet.getDataRange().getDisplayValues().slice(1);
  if(saved.length!==work.length||saved.some((r,i)=>r[0]!=='Individual'||r[1]!==work[i].classId||r[2]!==work[i].section||r[3]!==work[i].name||r[4]!==work[i].meetingLink||r[5]!==work[i].emails.join('; ')))throw Error('Sheet does not match this export. Rerun vcPrepareUpdate and review current guests.');
  let processed=0;
  for(let i=0;i<work.length&&processed<50;i++){
   const row=work[i],status=message=>sheet.getRange(i+2,7).setValue(message),title='Online home visit / One to one VC · '+row.classId+'-'+row.section+' · '+row.name;
   if(row.readyForSync!==true){status('Review required — incomplete student/team data');continue;}
   if(work.filter(other=>other.meetingLink===row.meetingLink).length!==1){status('Shared student meeting link; review manually');continue;}
   const matches=byLink[row.meetingLink]||[];if(matches.length!==1){status(matches.length?'Multiple Calendar events use this link; review manually':'Existing Meet link not found in school Calendar; review manually');continue;}const event=matches[0];
   if(event.status==='cancelled'){status('Event cancelled; review manually');continue;}if(String((event.organizer&&event.organizer.email)||'').toLowerCase()!==VC_PLAN.hostEmail.toLowerCase()){status('School account is not the organizer; review manually');continue;}
   if(!row.studentEmail||!(event.attendees||[]).some(g=>String(g.email||'').toLowerCase()===row.studentEmail.toLowerCase())){status('Student identity not confirmed on existing event; review manually');continue;}
   const host=VC_PLAN.hostEmail.toLowerCase(),allowed=new Set(row.emails.map(email=>email.toLowerCase()).filter(email=>email!==host)),old=event.attendees||[],seen=new Set(),attendees=[];
   for(const guest of old){const email=String(guest.email||'').toLowerCase();if((allowed.has(email)||email===host)&&!seen.has(email)){attendees.push(guest);seen.add(email);}}
   for(const email of allowed)if(!seen.has(email)){attendees.push({email});seen.add(email);}
   const exact=old.length===attendees.length&&old.every(g=>allowed.has(String(g.email||'').toLowerCase())||String(g.email||'').toLowerCase()===host)&&[...allowed].every(email=>old.some(g=>String(g.email||'').toLowerCase()===email));
   if(exact&&event.summary===title&&event.visibility==='private'&&event.guestsCanInviteOthers===false&&event.guestsCanModify===false&&event.guestsCanSeeOtherGuests===false){status('Guests updated; Meet access unverified');continue;}
   try{Calendar.Events.patch({summary:title,attendees,visibility:'private',guestsCanInviteOthers:false,guestsCanModify:false,guestsCanSeeOtherGuests:false},'primary',event.id,{sendUpdates:'none'});status('Guests updated; Meet access unverified');processed++;}catch(error){status('Stopped: '+String(error));throw error;}
  }
  console.log('Updated '+processed+' existing individual events. No meetings created or invitation emails requested. Meet admission/co-hosts remain unverified. Review '+book.getUrl());
 }finally{lock.releaseLock();}
}
