import {calendarVCRepairScript} from './cbse-vc-repair.js';
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
${calendarVCRepairScript()}
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
function vcApplyNextBatch(){return vcApplyNextBatchFixed();}
