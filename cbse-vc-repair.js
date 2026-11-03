// Generic Apps Script add-on: contains no student records, emails or meeting links.
export function calendarVCRepairScript(){return `/* VC Resume Fix (v3). Add this as a SEPARATE VCResumeFix.gs file.
Keep VCUpdate.gs: it contains your private VC_PLAN and workbook reference.
1. Run vcCheckIndividualProgress first: READ ONLY; changes no Calendar or sheet records.
2. After reviewing that log, use vcApplyNextBatchFixed instead of the old batch function.
No meetings are created, no links replaced, and no invitation emails requested.
Calendar guests are checked separately from Meet admission/co-hosts, which remain unverified.
*/
${[vcCheckIndividualProgress,vcApplyNextBatchFixed,vcFixedHash,vcFixedBook,vcFixedLink,vcFixedState,vcFixedSync].map(fn=>fn.toString()).join('\n')}
`;}
function vcCheckIndividualProgress(){return vcFixedSync(true);}
function vcApplyNextBatchFixed(){return vcFixedSync(false);}
function vcFixedHash(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function vcFixedBook(){const id=PropertiesService.getUserProperties().getProperty('vcUpdateBook');if(!id)throw Error('Run vcPrepareUpdate first.');return SpreadsheetApp.openById(id);}
function vcFixedLink(event){return String(event.hangoutLink||((event.conferenceData||{}).entryPoints||[]).filter(p=>p.entryPointType==='video').map(p=>p.uri)[0]||'').replace(/\/$/,'');}
function vcFixedState(event,row){
 const host=VC_PLAN.hostEmail.toLowerCase(),allowed=new Set(row.emails.map(e=>e.trim().toLowerCase()).filter(e=>e&&e!==host)),old=event.attendees||[],seen=new Set(),attendees=[];
 for(const guest of old){const email=String(guest.email||'').toLowerCase();if((allowed.has(email)||email===host)&&!seen.has(email)){attendees.push(guest);seen.add(email);}}
 for(const email of allowed)if(!seen.has(email)){attendees.push({email});seen.add(email);}
 const guests=old.length===attendees.length&&old.every(g=>allowed.has(String(g.email||'').toLowerCase())||String(g.email||'').toLowerCase()===host)&&[...allowed].every(email=>old.some(g=>String(g.email||'').toLowerCase()===email));
 const title='Online home visit / One to one VC · '+row.classId+'-'+row.section+' · '+row.name;
 // guestsCanModify defaults to false and may be absent in Google's response.
 const flags=event.guestsCanInviteOthers===false&&event.guestsCanModify!==true&&event.guestsCanSeeOtherGuests===false;
 return {attendees,title,guests,flags,complete:guests&&flags&&event.summary===title&&event.visibility==='private'};
}
function vcFixedSync(auditOnly){
 const lock=LockService.getUserLock();lock.waitLock(10000);
 try{
  if(typeof VC_PLAN==='undefined'||!Array.isArray(VC_PLAN.students))throw Error('Keep the current VCUpdate.gs file containing VC_PLAN in this project.');
  const host=VC_PLAN.hostEmail.toLowerCase();if(Calendar.CalendarList.get('primary').id.toLowerCase()!==host)throw Error('Use the school account '+VC_PLAN.hostEmail+'.');
  const props=PropertiesService.getUserProperties(),remembered=props.getProperties(),book=vcFixedBook(),sheet=book.getSheetByName('VC update');if(!sheet)throw Error('VC update sheet missing.');
  const saved=sheet.getDataRange().getDisplayValues().slice(1),work=VC_PLAN.students;
  if(saved.length!==work.length||saved.some((r,i)=>r[0]!=='Individual'||r[1]!==work[i].classId||r[2]!==work[i].section||r[3]!==work[i].name||r[4]!==work[i].meetingLink||r[5]!==work[i].emails.join('; ')))throw Error('Sheet does not match this export. Rerun vcPrepareUpdate and review current guests.');
  const byLink={},linkCounts={};for(const row of work)linkCounts[row.meetingLink]=(linkCounts[row.meetingLink]||0)+1;let pageToken;
  do{const result=Calendar.Events.list('primary',{maxResults:2500,showDeleted:false,...(pageToken?{pageToken}:{})});for(const event of result.items||[]){const link=vcFixedLink(event);if(link){if(!byLink[link])byLink[link]=[];byLink[link].push(event);}}pageToken=result.nextPageToken;}while(pageToken);
  const statuses=saved.map(r=>[r[6]||'Pending']),updates={},totals={patchedThisRun:0,verifiedComplete:0,pending:0,reviewRequired:0,guestListsMatch:0,omittedModifyDefaults:0},reasons={};
  const review=(i,message)=>{statuses[i]=[message];totals.reviewRequired++;reasons[message]=(reasons[message]||0)+1;};
  let failure;
  try{
   for(let i=0;i<work.length;i++){
    const row=work[i];if(row.readyForSync!==true){review(i,'Review required — incomplete student/team data');continue;}
    if(linkCounts[row.meetingLink]!==1){review(i,'Shared student meeting link; review manually');continue;}
    const matches=byLink[row.meetingLink]||[];if(matches.length!==1){review(i,matches.length?'Multiple Calendar events use this link; review manually':'Existing Meet link not found in school Calendar; review manually');continue;}let event=matches[0];
    if(event.status==='cancelled'){review(i,'Event cancelled; review manually');continue;}if(String((event.organizer&&event.organizer.email)||'').toLowerCase()!==host){review(i,'School account is not the organizer; review manually');continue;}
    if(!row.studentEmail||!(event.attendees||[]).some(g=>String(g.email||'').toLowerCase()===row.studentEmail.toLowerCase())){review(i,'Student identity not confirmed on existing event; review manually');continue;}
    let state=vcFixedState(event,row);if(state.guests)totals.guestListsMatch++;if(event.guestsCanModify===undefined)totals.omittedModifyDefaults++;
    const signature=vcFixedHash(JSON.stringify(['v3',host,row.meetingLink,row.studentEmail.toLowerCase(),state.title,row.emails.map(e=>e.trim().toLowerCase()).sort()])),key='vcSyncV3_'+vcFixedHash(host+'|'+row.meetingLink);let prior;
    try{prior=JSON.parse(remembered[key]||'null');}catch{prior=null;}
    if(state.complete){statuses[i]=['Guests updated; Meet access unverified'];totals.verifiedComplete++;continue;}
    if(prior&&prior.signature===signature&&prior.version===String(event.etag||'')){review(i,state.guests?'Guest list matches; Calendar controls need manual review':'Guest list mismatch after previous update; review manually');continue;}
    if(auditOnly||totals.patchedThisRun>=50){totals.pending++;statuses[i]=['Pending — fixed sync not yet applied'];continue;}
    try{
     const patch={summary:state.title,attendees:state.attendees,visibility:'private',guestsCanInviteOthers:false,guestsCanModify:false,guestsCanSeeOtherGuests:false};
     Calendar.Events.patch(patch,'primary',event.id,{sendUpdates:'none'});totals.patchedThisRun++;
     try{event=Calendar.Events.get('primary',event.id);}catch(error){review(i,'Update sent; could not verify Calendar response — review manually');failure=Error('Calendar update sent but verification failed. Stop and run vcCheckIndividualProgress before retrying.');break;}
     updates[key]=JSON.stringify({signature,version:String(event.etag||'')});
     if(vcFixedLink(event)!==row.meetingLink){review(i,'Calendar meeting link differs; stop and review manually');failure=Error('Meeting link differs after Calendar update. No portal links have been changed.');break;}
     state=vcFixedState(event,row);if(state.complete){statuses[i]=['Guests updated; Meet access unverified'];totals.verifiedComplete++;}else review(i,state.guests?'Guest list matches; Calendar controls need manual review':'Guest list mismatch after update; review manually');
    }catch(error){statuses[i]=['Stopped: '+String(error)];failure=error;break;}
   }
  }finally{
   // The progress check is read-only, including the private spreadsheet/properties.
   if(!auditOnly){if(statuses.length)sheet.getRange(2,7,statuses.length,1).setValues(statuses);if(Object.keys(updates).length)props.setProperties(updates,false);}
  }
  console.log((auditOnly?'READ-ONLY VC AUDIT: ':'VC FIXED SYNC: ')+JSON.stringify(totals));console.log('Review reasons (no student names/emails): '+JSON.stringify(reasons));console.log('Calendar/Meet admission and co-hosts remain unverified. No meetings created or invitation emails requested. Review '+book.getUrl());
  if(failure)throw failure;return totals;
 }finally{lock.releaseLock();}
}
