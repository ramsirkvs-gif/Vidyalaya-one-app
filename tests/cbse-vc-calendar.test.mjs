import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {calendarVCScript} from '../cbse-vc-calendar.js';
class Sheet{
 constructor(){this.rows=[];}
 setName(){return this;}setFrozenRows(){}
 getRange(r,c,n=1,m=1){return {setValues:v=>{for(let i=0;i<n;i++){this.rows[r-1+i]||=[];for(let j=0;j<m;j++)this.rows[r-1+i][c-1+j]=v[i][j];}return this.getRange(r,c,n,m);},setValue:v=>{this.rows[r-1]||=[];this.rows[r-1][c-1]=v;},setNumberFormat:()=>this.getRange(r,c,n,m)};}
 getDataRange(){return {getDisplayValues:()=>this.rows.map(r=>r.map(v=>String(v??'')))};}
 clearContents(){this.rows=[];}getSheetId(){return 123;}
}
test('Calendar script preserves individual links/guests, creates distinct Class VC once, resumes batches and exports only classes',()=>{
 const hostEmail='school@example.org',students=Array.from({length:53},(_,i)=>({classId:'X',section:'A',name:'Synthetic '+i,meetingLink:'https://meet.google.com/abc-defg-'+String.fromCharCode(97+Math.floor(i/26),97+i%26,97),emails:['student'+i+'@example.org','teacher@example.org']}));
 students.push({classId:'X',section:'A',name:'Missing Calendar event',meetingLink:'https://meet.google.com/zzz-zzzz-zzz',emails:['missing@example.org']});
 const plan={hostEmail,students,classes:[{classId:'X',section:'A',meetingLink:'',emails:['teacher@example.org','student0@example.org']}],issues:['Synthetic missing email'],unverifiedFaculty:1};
 const sheets={'VC update':new Sheet(),Issues:new Sheet(),'Class VC upload':new Sheet()},book={getSheets:()=>[sheets['VC update']],insertSheet:n=>sheets[n],getSheetByName:n=>sheets[n],getId:()=> 'syntheticbook',getUrl:()=> 'https://example.org/book',setActiveSheet(){}};
 const props={},events=new Map(students.slice(0,53).map((s,i)=>['old'+i,{id:'old'+i,hangoutLink:s.meetingLink,summary:'Old title',attendees:[{email:'student'+i+'@example.org',responseStatus:'accepted'}]}]));
 let patches=0,inserts=0,account=hostEmail;const context={console:{log(){}},Date,Error,PropertiesService:{getUserProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},SpreadsheetApp:{create:()=>book,openById:()=>book},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...createHash('sha256').update(s).digest()]},LockService:{getUserLock:()=>({waitLock(){},releaseLock(){}})},Calendar:{CalendarList:{get:()=>({id:account})},Events:{
  list:()=>({items:[...events.values()]}),get:(_,id)=>{if(!events.has(id))throw Error('404 Not Found');return events.get(id);},
  patch:(patch,calendar,id,options)=>{assert.equal(options.sendUpdates,'none');assert.equal(patch.conferenceData,undefined);assert.equal(patch.guestsCanInviteOthers,false);const next={...events.get(id),...patch};events.set(id,next);patches++;return next;},
  insert:(event,calendar,options)=>{assert.equal(options.sendUpdates,'none');assert.equal(options.conferenceDataVersion,1);assert.equal(event.recurrence,undefined);assert.equal(event.visibility,'private');assert.equal(event.guestsCanSeeOtherGuests,false);const saved={...event,hangoutLink:'https://meet.google.com/uvw-xyza-bcd'};events.set(event.id,saved);inserts++;return {...saved,hangoutLink:''};}
 }}};
 vm.createContext(context);vm.runInContext(calendarVCScript(plan),context);context.vcPrepareUpdate();assert.equal(inserts,0);assert.equal(patches,0);
 context.vcApplyNextBatch();assert.equal(patches,50);context.vcApplyNextBatch();assert.equal(patches,53);assert.equal(inserts,1);assert.throws(()=>context.vcExportClassCSV(),/must be ready/);
 context.vcApplyNextBatch();context.vcExportClassCSV();const calls=patches;context.vcApplyNextBatch();assert.equal(patches,calls);assert.equal(inserts,1);
 for(let i=0;i<53;i++){const e=events.get('old'+i);assert.equal(e.hangoutLink,students[i].meetingLink);assert.equal(e.attendees[0].responseStatus,'accepted');assert.equal(e.attendees.filter(a=>a.email==='teacher@example.org').length,1);}
 assert.deepEqual(sheets['Class VC upload'].rows,[['Class','Section','MeetingLink'],['X','A','https://meet.google.com/uvw-xyza-bcd']]);
 assert.ok(sheets['VC update'].rows.some(r=>r[6]==='Existing Meet link not found in school Calendar; review manually'));
 // A newer portal export must replace stale issue/guest lists in the same book,
 // retain completed Class VC links, and retry only changed participant rows.
 vm.runInContext("VC_PLAN.students[0].emails.push('new-support@example.org');VC_PLAN.issues=['Only current issue'];",context);
 context.vcPrepareUpdate();assert.equal(patches,calls);assert.equal(inserts,1);
 assert.equal(sheets['VC update'].rows[1][6],'Pending');assert.match(sheets['VC update'].rows[1][5],/new-support@example.org/);assert.equal(sheets['VC update'].rows[2][6],'Ready');
 assert.equal(sheets['VC update'].rows.at(-1)[4],'https://meet.google.com/uvw-xyza-bcd');assert.equal(sheets['VC update'].rows.at(-1)[6],'Ready');assert.equal(sheets.Issues.rows[1][0],'Only current issue');assert.equal(sheets.Issues.rows.some(r=>r[0]==='Synthetic missing email'),false);
 context.vcApplyNextBatch();assert.equal(inserts,1);assert.equal(patches,calls+1);assert.ok(events.get('old0').attendees.some(a=>a.email==='new-support@example.org'));
 account='wrong@example.org';assert.throws(()=>context.vcApplyNextBatch(),/Use the school account/);
});
