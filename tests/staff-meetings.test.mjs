import test from 'node:test';
import assert from 'node:assert/strict';
import {taskFixture} from './task-manager-fixture.mjs';

test('attendance, Hindi and English save independently and the Principal controls publication',async()=>{
 const f=taskFixture(),meetingId='f'.repeat(32);
 f.data.cbse.mission.staff.smt={name:'Synthetic SMT',designation:'TGT',wing:'secondary',status:'active'};
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const call=(action,input,token='')=>f.service(action,input,token,'synthetic-meeting-ip',{viewerToken});
 const principal=(meetingOperation,extra={})=>call('staff-meetings-principal',{meetingId,meetingOperation,...extra},'principal');
 const pin=(staffId,code,meetingOperation,extra={})=>call('pin-submit',{operation:'staff-meetings',meetingId,staffId,pin:code,meetingOperation,...extra});
 const hi='X:one',en='X:two',smt='support:smt';
 for(const [staffId,pin]of [[hi,'123'],[en,'456'],[smt,'789']])await call('set-pin',{staffId,pin},'principal');
 await assert.rejects(f.service('staff-meetings-read',{}),/viewing password/);
 await assert.rejects(principal('create',{meetingDate:'2026-11-31',meetingTime:'10:30',meetingAgenda:'Review'}),/valid meeting date/);
 const {revision:created}=await principal('create',{meetingDate:'2026-11-19',meetingTime:'10:30',meetingAgenda:'Review and follow-up'});
 const placeholder='e'.repeat(32);
 f.data.cbse.staffMeetings[placeholder]={id:placeholder,createdAt:2,revision:1,roster:[]};
 const {meetings}=await call('staff-meetings-read',{});
 assert.deepEqual(meetings.map(meeting=>meeting.id),[meetingId]);
 const [listed]=meetings;
 assert.equal(listed.agenda,'Review and follow-up');
 assert.equal(listed.scheduledAt,Date.parse('2026-11-19T10:30:00+05:30'));
 assert.equal(listed.published,false);
 const holdDate=Date.parse('2026-11-19T13:00:00+05:30');
 f.data.cbse.rollCall={objections:{
  one:{staffId:hi,status:'open',createdAt:holdDate},
  same:{staffId:hi,status:'open',createdAt:holdDate},
  cleared:{staffId:en,status:'cleared',createdAt:holdDate},
  yesterday:{staffId:smt,status:'open',createdAt:holdDate-86400000}
 }};
 assert.deepEqual((await principal('read',{meetingId:undefined})).meetings[0].heldAttendees,[hi]);
 assert.equal((await call('staff-meetings-read',{})).meetings[0].heldAttendees,undefined);

 const {revision:assigned}=await principal('assign',{writers:[{id:hi,language:'hi'},{id:en,language:'en'}],expectedRevision:created});
 const {revision:configured}=await principal('attendance-assign',{attendanceWing:'secondary',attendanceTakers:[{role:'SMT-1',id:smt}],expectedAttendees:[hi,en],expectedRevision:assigned});
 await assert.rejects(pin(en,'456','read',{task:'minutes',language:'hi'}),/authorised/);
 const {meeting}=await pin(smt,'789','read',{task:'attendance'});
 assert.deepEqual(meeting.roster.map(person=>person.id),[hi,en]);
 const attendance=Object.fromEntries(meeting.roster.map(person=>[person.id,person.id===en?'absent':'present']));
 const hindi={agenda:'बैठक का विषय',minutes:'समीक्षा पर चर्चा हुई।',language:'hi'};
 const english={agenda:'Review',minutes:'Discussed the review.',language:'en'};
 // Each device starts from its own task revision. Cross-task writes do not make it stale.
 const [a,h,e]=await Promise.all([
  pin(smt,'789','attendance-save',{expectedRevision:meeting.revision,attendance}),
  pin(hi,'123','minutes-draft',{...hindi,expectedRevision:0}),
  pin(en,'456','minutes-draft',{...english,expectedRevision:0})
 ]);
 assert.equal(a.revision,meeting.revision+1);assert.equal(h.revision,1);assert.equal(e.revision,1);
 await assert.rejects(pin(hi,'123','minutes-draft',{...hindi,expectedRevision:0}),/changed/);
 await Promise.all([pin(hi,'123','minutes-submit',{...hindi,expectedRevision:h.revision}),pin(en,'456','minutes-submit',{...english,expectedRevision:e.revision})]);
 await assert.rejects(pin(hi,'123','minutes-return',{language:'hi',expectedRevision:2}),/Only the Principal/);
 await assert.rejects(principal('minutes-return',{language:'hi',expectedRevision:1}),/changed/);
 const returned=await principal('minutes-return',{language:'hi',expectedRevision:2});
 const returnedEntry=(await call('staff-meetings-read',{})).meetings[0];
 assert.deepEqual(returnedEntry.submittedLanguages,['en']);
 assert.deepEqual(returnedEntry.returnedLanguages,['hi']);
 const reopened=(await pin(hi,'123','read',{task:'minutes',language:'hi'})).meeting;
 assert.deepEqual(reopened.draft,hindi);
 const corrected={...hindi,minutes:'समीक्षा के बाद निर्णय लिया गया।'};
 const savedDraft=await pin(hi,'123','minutes-draft',{...corrected,expectedRevision:returned.revision});
 assert.deepEqual((await call('staff-meetings-read',{})).meetings[0].returnedLanguages,['hi']);
 await pin(hi,'123','minutes-submit',{...corrected,expectedRevision:savedDraft.revision});
 assert.deepEqual((await call('staff-meetings-read',{})).meetings[0].returnedLanguages,[]);
 await assert.rejects(call('staff-meetings-read',{meetingId}),/not been published/);
 const pdf=Buffer.from('%PDF-1.4\n%%EOF').toString('base64');
 const signed={pdf,expectedSignedRevision:0};
 await assert.rejects(pin(hi,'123','signed-upload',signed),/Publish the meeting/);
 assert.equal((await call('staff-meetings-read',{})).meetings[0].completed,false);
 const {revision:published}=await principal('publish',{expectedRevision:configured});
 assert.equal((await call('staff-meetings-read',{})).meetings[0].completed,true);
 const {report}=await call('staff-meetings-read',{meetingId});
 assert.deepEqual(report.versions.map(v=>v.language),['hi','en']);
 assert.equal(report.versions[0].minutes,corrected.minutes);
 assert.deepEqual(report.absent.map(person=>person.name),['Synthetic Teacher two']);
 assert.equal(report.attendanceTakenBy,'Synthetic SMT');
 assert.equal(report.writers.length,2);
 await assert.rejects(pin(smt,'789','signed-upload',signed),/assigned minutes writer/);
 await assert.rejects(pin(hi,'123','signed-upload',{...signed,pdf:'YWJj'}),/valid PDF/);
 assert.equal((await pin(hi,'123','signed-upload',signed)).signedMinutesRevision,1);
 await assert.rejects(pin(en,'456','signed-upload',signed),/changed/);
 assert.equal((await principal('signed-upload',{...signed,expectedSignedRevision:1})).signedMinutesRevision,2);
 assert.equal((await call('staff-meetings-read',{})).meetings[0].signedMinutesRevision,2);
 assert.equal((await call('staff-meetings-read',{meetingId,task:'signed-minutes'})).pdf,pdf);
 await assert.rejects(f.service('staff-meetings-read',{meetingId,task:'signed-minutes'}),/viewing password/);
 await principal('minutes-edit',{...english,minutes:'Principal correction',expectedRevision:2});
 const preview=await principal('read',{task:'report'});
 assert.equal(preview.report.versions[1].minutes,'Principal correction');
 assert.equal((await call('staff-meetings-read',{meetingId})).report.versions[1].minutes,english.minutes);
 await principal('unpublish',{expectedRevision:published});
 await assert.rejects(call('staff-meetings-read',{meetingId,task:'signed-minutes'}),/not been published/);
 assert.equal((await call('staff-meetings-read',{})).meetings[0].completed,false);
 await assert.rejects(call('staff-meetings-read',{meetingId}),/not been published/);
});

test('legacy published minutes stay available and the Principal can stop publication',async()=>{
 const f=taskFixture(),id='a'.repeat(32);
 f.data.cbse.staffMeetings={[id]:{id,createdAt:1,savedAt:2,revision:1,writerId:'X:one',writerName:'Synthetic Teacher one',agenda:'Legacy agenda',minutes:'Legacy minutes',attendance:{principal:'present'},roster:[{id:'principal',name:'Principal'}]}};
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const read=()=>f.service('staff-meetings-read',{meetingId:id},'','synthetic-legacy-ip',{viewerToken});
 assert.equal((await read()).report.versions[0].writerName,'Synthetic Teacher one');
 await f.service('staff-meetings-principal',{meetingId:id,meetingOperation:'unpublish',expectedRevision:1},'principal');
 await assert.rejects(read(),/not been published/);
});

test('meeting rosters follow seniority and identify Primary staff in existing attendance snapshots',async()=>{
 const {meetingRoster,meetingAttendanceRoster}=await import('../cbse-staff-meetings-model.js');
 const staff=Object.fromEntries([
  ['bengia','Ms. Bengia Yapi','PRT',''],
  ['anil','Mr. Anil Kumar','PRT','secondary'],
  ['girraj','Mr. Girraj Prasad Meena','PRT','primary'],
  ['poor','Mr. Pooran Mal Meena','PRT','primary'],
  ['hm','Mr. Rohtash','Headmaster','primary'],
  ['bharat','Mr. Bharat Lal Meena','TGT-Hindi','secondary'],
  ['mohan','Dr. Mohan Singh Rajput','PGT-Hindi','secondary'],
  ['zirdo','Mrs. E.T. Zirdo','PGT-English','secondary'],
  ['vacancy','VP Vacant','Vice Principal','secondary'],
 ].map(([id,name,designation,wing])=>[id,{name,designation,wing,status:'active'}]));
 const roster=meetingRoster(staff);
 assert.deepEqual(roster.map(p=>p.id),['principal','zirdo','mohan','bharat','hm','poor','girraj','anil','bengia']);
 const historical={attendanceWing:'primary',roster:[...roster].reverse().map(({wing,...person})=>person)};
 assert.deepEqual(meetingAttendanceRoster(historical,staff).map(p=>p.id),['principal','hm','poor','girraj','anil','bengia']);
 assert.equal(roster.find(p=>p.id==='anil').wing,'primary');
});

test('new meetings reuse the latest saved attendance and language assignments',async()=>{
 const f=taskFixture();
 for(const [id,name] of [['zirdo','MRS. E.T. ZIRDO'],['paramveer','MR. PARAMVEER MEENA'],['ramesh','MR. RAMESH YADAV']]){
  f.data.cbse.mission.staff[id]={name,designation:'PGT',wing:'secondary',status:'active'};
 }
 const first='1'.repeat(32),second='2'.repeat(32),third='3'.repeat(32);
 const principal=(meetingOperation,meetingId,extra={})=>f.service('staff-meetings-principal',{meetingOperation,meetingId,...extra},'principal');
 const create=id=>principal('create',id,{meetingDate:'2026-11-19',meetingTime:'10:30',meetingAgenda:'Review'});
 const list=async id=>(await principal('read')).meetings.find(meeting=>meeting.id===id);
 const {revision}=await create(first);
 assert.deepEqual((await list(first)).attendanceTakers.map(person=>person.name),['MRS. E.T. ZIRDO','MR. PARAMVEER MEENA','MR. RAMESH YADAV']);
 const writers=[{id:'X:one',language:'hi'},{id:'X:two',language:'en'}];
 const setup={expectedRevision:revision,attendanceWing:'secondary',expectedAttendees:['X:one'],attendanceTakers:[{id:'X:two',role:'SMT-1'}]};
 await assert.rejects(principal('setup-save',first,{...setup,writers:[{id:'unknown',language:'hi'}]}),/active staff/);
 assert.equal((await list(first)).attendanceWing,'both');
 await principal('setup-save',first,{...setup,writers});
 await create(second);
 const next=await list(second);
 assert.deepEqual(next.attendanceTakers.map(({id,role})=>({id,role})),setup.attendanceTakers);
 assert.deepEqual(next.writers.map(({id,language})=>({id,language})),writers);
 assert.deepEqual(next.expectedAttendees,[]);
 await principal('setup-save',second,{...setup,expectedRevision:next.revision,writers:[]});
 await create(third);
 assert.deepEqual((await list(third)).writers,[]);
 assert.equal((await list(first)).writers.length,2);
});
