// This module contains no school records. The Principal downloads a private copy
// with the current portal's participants inserted locally in their browser.
export function calendarVCScript(plan){return `/* School account: ${plan.hostEmail}
Add this as a NEW Apps Script file (VCUpdate.gs) in your existing project.
Keep the Calendar advanced service enabled. Do not replace your earlier code.
1. Run vcPrepareUpdate; open the private sheet URL from the log and review guests.
2. Run vcApplyNextBatch until every row is Ready (50 events per run).
3. Run vcExportClassCSV; click the direct CSV download URL from the log.
4. Portal > Principal controls > Import VC setup / Class VC links > select CSV > Save.
This adds guests to existing individual events without replacing their Meet links,
and creates nine separate Class VC links. No recurring appointments are created.
Calendar updates request sendUpdates:none. Guest calendars may not sync until
you send an invitation from Calendar. This does NOT configure Meet admission.
Check Restricted access / host controls in Google Meet. Personal Gmail limitations apply.
Review the Issues tab: missing/ambiguous teachers or emails are not guessed.
Email source verification is not proof of mailbox ownership. Keep this file private.
*/
const VC_PLAN=${JSON.stringify(plan,null,2)};
${vcBook.toString()}
${vcPrepareUpdate.toString()}
${vcLink.toString()}
${vcEventId.toString()}
${vcApplyNextBatch.toString()}
${vcExportClassCSV.toString()}
`;}
function vcBook(){const id=PropertiesService.getUserProperties().getProperty('vcUpdateBook');if(!id)throw Error('Run vcPrepareUpdate first.');return SpreadsheetApp.openById(id);}
function vcPrepareUpdate(){
 const account=Calendar.CalendarList.get('primary').id;if(account.toLowerCase()!==VC_PLAN.hostEmail.toLowerCase())throw Error('Use the school account '+VC_PLAN.hostEmail+'.');
 const props=PropertiesService.getUserProperties(),existing=props.getProperty('vcUpdateBook');
 if(existing){console.log('Existing update sheet: '+SpreadsheetApp.openById(existing).getUrl());console.log('This export has '+VC_PLAN.students.length+' individual meetings and '+VC_PLAN.classes.length+' classes. A new export does not duplicate completed Calendar events.');return;}
 const book=SpreadsheetApp.create('Private VC update · students and classes'),sheet=book.getSheets()[0];sheet.setName('VC update');
 const rows=[...VC_PLAN.students.map(s=>['Individual',s.classId,s.section,s.name,s.meetingLink,s.emails.join('; '),'Pending']),...VC_PLAN.classes.map(c=>['Class',c.classId,c.section,'Class VC',c.meetingLink,c.emails.join('; '),'Pending'])];
 sheet.getRange(1,1,1,7).setValues([['Type','Class','Section','StudentName','MeetingLink','Guests','Status']]);
 if(rows.length)sheet.getRange(2,1,rows.length,7).setNumberFormat('@').setValues(rows);sheet.setFrozenRows(1);
 const issues=book.insertSheet('Issues');issues.getRange(1,1).setValue('Review before Calendar updates');
 const notes=[...VC_PLAN.issues,VC_PLAN.unverifiedFaculty+' faculty email records are marked Not Verified in the uploaded source.'];issues.getRange(2,1,notes.length,1).setNumberFormat('@').setValues(notes.map(s=>[s]));
 book.insertSheet('Class VC upload');props.setProperty('vcUpdateBook',book.getId());console.log('Private update sheet: '+book.getUrl());
}
function vcLink(event){return event.hangoutLink||((event.conferenceData||{}).entryPoints||[]).filter(p=>p.entryPointType==='video').map(p=>p.uri)[0]||'';}
function vcEventId(c){return 'c'+Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,VC_PLAN.hostEmail+'|class-vc|'+c.classId+'|'+c.section,Utilities.Charset.UTF_8).map(b=>((b+256)%256).toString(16).padStart(2,'0')).join('');}
function vcApplyNextBatch(){
 const lock=LockService.getUserLock();lock.waitLock(10000);
 try{
  if(Calendar.CalendarList.get('primary').id.toLowerCase()!==VC_PLAN.hostEmail.toLowerCase())throw Error('Use the school account '+VC_PLAN.hostEmail+'.');
  const book=vcBook(),sheet=book.getSheetByName('VC update'),byLink={};let pageToken;
  do{const result=Calendar.Events.list('primary',{maxResults:2500,showDeleted:false,...(pageToken?{pageToken}:{})});for(const event of result.items||[]){const link=vcLink(event);if(link)byLink[link]=event;}pageToken=result.nextPageToken;}while(pageToken);
  const work=[...VC_PLAN.students.map(s=>({...s,type:'Individual'})),...VC_PLAN.classes.map(s=>({...s,type:'Class'}))];let processed=0;
  const saved=sheet.getDataRange().getDisplayValues().slice(1);
  if(saved.length!==work.length||saved.some((r,i)=>r[0]!==work[i].type||r[1]!==work[i].classId||r[2]!==work[i].section||(work[i].type==='Individual'&&r[3]!==work[i].name)))throw Error('Sheet does not match the current portal export. Clear only the vcUpdateBook user property and rerun vcPrepareUpdate.');
  for(let i=0;i<work.length&&processed<50;i++){
   const row=work[i],title=(row.type==='Class'?'Class VC':'Online home visit / One to one VC')+' · '+row.classId+'-'+row.section+(row.name?' · '+row.name:'');
   let event=byLink[row.meetingLink||saved[i][4]];
   if(saved[i][6]==='Ready'&&event&&event.summary===title&&row.emails.every(email=>(event.attendees||[]).some(a=>a.email.toLowerCase()===email.toLowerCase())||email.toLowerCase()===VC_PLAN.hostEmail.toLowerCase()))continue;
   if(!event&&row.type==='Individual'){sheet.getRange(i+2,7).setValue('Existing Meet link not found in school Calendar; review manually');continue;}
   try{
    if(!event){try{event=Calendar.Events.get('primary',vcEventId(row));}catch(error){if(!/not found|404/i.test(String(error)))throw error;}}
    if(event?.status==='cancelled'){sheet.getRange(i+2,7).setValue('Event cancelled; review manually');continue;}
    const attendees=[...(event?.attendees||[])],seen=new Set(attendees.map(a=>a.email.toLowerCase()));
    for(const email of row.emails)if(email.toLowerCase()!==VC_PLAN.hostEmail.toLowerCase()&&!seen.has(email.toLowerCase())){attendees.push({email});seen.add(email.toLowerCase());}
    if(event){event=Calendar.Events.patch({summary:title,attendees,guestsCanInviteOthers:false,guestsCanModify:false,guestsCanSeeOtherGuests:false},'primary',event.id,{sendUpdates:'none'});}
    else{const start=new Date(Date.now()+7*86400000);event=Calendar.Events.insert({id:vcEventId(row),summary:title,description:'Reusable Class VC link. Date is provisional; school informs families of the actual meeting time.',visibility:'private',transparency:'transparent',start:{dateTime:start.toISOString(),timeZone:'Asia/Kolkata'},end:{dateTime:new Date(start.getTime()+600000).toISOString(),timeZone:'Asia/Kolkata'},attendees,guestsCanInviteOthers:false,guestsCanModify:false,guestsCanSeeOtherGuests:false,reminders:{useDefault:false},conferenceData:{createRequest:{requestId:vcEventId(row),conferenceSolutionKey:{type:'hangoutsMeet'}}}},'primary',{conferenceDataVersion:1,sendUpdates:'none'});}
    const link=vcLink(event);sheet.getRange(i+2,5).setValue(link||row.meetingLink||'');sheet.getRange(i+2,7).setValue(link?'Ready':'Conference pending; run again');processed++;
   }catch(error){sheet.getRange(i+2,7).setValue('Stopped: '+String(error));throw error;}
  }
  console.log('Processed '+processed+' events. Review remaining rows in '+book.getUrl());
 }finally{lock.releaseLock();}
}
function vcExportClassCSV(){
 const book=vcBook(),rows=book.getSheetByName('VC update').getDataRange().getDisplayValues().slice(1).filter(r=>r[0]==='Class'&&r[6]==='Ready'&&/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(r[4]));
 if(rows.length!==VC_PLAN.classes.length)throw Error('All '+VC_PLAN.classes.length+' Class VC links must be ready before export.');
 const out=book.getSheetByName('Class VC upload');out.clearContents();out.getRange(1,1,1,3).setValues([['Class','Section','MeetingLink']]);out.getRange(2,1,rows.length,3).setNumberFormat('@').setValues(rows.map(r=>[r[1],r[2],r[4]]));book.setActiveSheet(out);
 console.log('Download Class VC CSV: https://docs.google.com/spreadsheets/d/'+book.getId()+'/export?format=csv&gid='+out.getSheetId());console.log('Individual Meet links have been kept; only Class VC links need portal import.');
}
