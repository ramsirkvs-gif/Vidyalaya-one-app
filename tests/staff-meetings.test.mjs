import test from 'node:test';
import assert from 'node:assert/strict';
import {taskFixture} from './task-manager-fixture.mjs';

test('the Principal assigns writers and SMT attendance independently and edits submitted minutes',async()=>{
 const f=taskFixture(),meetingId='f'.repeat(32);
 f.data.cbse.mission.staff.primary={name:'Synthetic Primary teacher',designation:'PRT',wing:'primary',status:'active'};
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const call=(action,input,token='')=>f.service(action,input,token,'synthetic-meeting-ip',{viewerToken});
 const principal=(meetingOperation,extra={})=>call('staff-meetings-principal',{meetingId,meetingOperation,...extra},'principal');
 const pin=(staffId,code,meetingOperation,extra={})=>call('pin-submit',{operation:'staff-meetings',meetingId,staffId,pin:code,meetingOperation,...extra});
 const writer='X:one',smt='X:two';
 for(const [staffId,pin]of [[writer,'123'],[smt,'456']])await call('set-pin',{staffId,pin},'principal');
 await assert.rejects(f.service('staff-meetings-read',{}),/viewing password/);
 await assert.rejects(call('staff-meetings-principal',{meetingOperation:'create',meetingId},'outsider'),/Principal/);
 const {revision:created}=await principal('create');
 const list=await call('staff-meetings-read',{});
 assert.ok(list.meetings[0].createdAt>0);
 assert.deepEqual(list.meetings[0].writers,[]);
 await assert.rejects(principal('assign',{writerIds:[writer,writer],expectedRevision:created}),/different active/);
 const {revision:assigned}=await principal('assign',{writerIds:[writer],expectedRevision:created});
 const {revision:configured}=await principal('attendance-assign',{attendanceWing:'secondary',attendanceTakers:[{role:'SMT-1',id:smt}],expectedRevision:assigned});
 await assert.rejects(pin(smt,'456','read',{task:'minutes'}),/authorised/);
 await assert.rejects(pin(writer,'123','read',{task:'attendance'}),/authorised/);
 await assert.rejects(pin(writer,'999','read',{task:'minutes'}),/PIN/);
 const {meeting}=await pin(smt,'456','read',{task:'attendance'});
 assert.equal(meeting.revision,configured);
 assert.ok(meeting.roster.some(person=>person.id==='principal'));
 assert.ok(!meeting.roster.some(person=>person.name==='Synthetic Primary teacher'));
 const attendance=Object.fromEntries(meeting.roster.map(person=>[person.id,person.id===smt?'absent':'present']));
 const {revision:attended}=await pin(smt,'456','attendance-save',{expectedRevision:configured,attendance});
 const text={agenda:'बैठक का विषय',minutes:'समीक्षा पर चर्चा हुई।',language:'hi'};
 const {revision:drafted}=await pin(writer,'123','minutes-draft',{...text,expectedRevision:attended});
 await assert.rejects(call('staff-meetings-read',{meetingId}),/not been saved/);
 assert.equal((await pin(writer,'123','read',{task:'minutes'})).meeting.draft.minutes,text.minutes);
 const {revision:submitted}=await pin(writer,'123','minutes-submit',{...text,expectedRevision:drafted});
 const {report}=await call('staff-meetings-read',{meetingId});
 assert.equal(report.language,'hi');assert.equal(report.minutes,text.minutes);
 assert.deepEqual(report.absent.map(person=>person.name),['Synthetic Teacher two']);
 assert.ok(report.present.some(person=>person.name==='Synthetic Teacher one'));
 assert.deepEqual(report.unmarked,[]);
 await assert.rejects(pin(writer,'123','minutes-draft',{...text,expectedRevision:submitted}),/only by the Principal/);
 await assert.rejects(pin(writer,'123','minutes-edit',{...text,expectedRevision:submitted}),/only by the Principal/);
 const {meeting:edit}=await principal('read',{task:'minutes'});
 assert.equal(edit.minutes,text.minutes);
 await principal('minutes-edit',{...text,minutes:'Principal correction',language:'en',expectedRevision:submitted});
 assert.equal((await call('staff-meetings-read',{meetingId})).report.minutes,'Principal correction');
});

test('legacy published minutes remain readable and editable by the Principal',async()=>{
 const f=taskFixture(),id='a'.repeat(32);
 f.data.cbse.staffMeetings={[id]:{id,createdAt:1,savedAt:2,revision:1,writerId:'X:one',writerName:'Synthetic Teacher one',agenda:'Legacy agenda',minutes:'Legacy minutes',attendance:{principal:'present'},roster:[{id:'principal',name:'Principal'}]}};
 const {viewerToken}=await f.service('remember-view',{},'principal');
 const report=await f.service('staff-meetings-read',{meetingId:id},'','synthetic-legacy-ip',{viewerToken});
 assert.equal(report.report.language,'en');assert.equal(report.report.writerName,'Synthetic Teacher one');
 const saved=await f.service('staff-meetings-principal',{meetingId:id,meetingOperation:'minutes-edit',expectedRevision:1,language:'en',agenda:'Updated',minutes:'Corrected minutes'},'principal');
 assert.equal(saved.revision,2);
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
 assert.deepEqual(roster.map(p=>p.id),['principal','zirdo','mohan','bharat','girraj','hm','anil','poor','bengia']);
 const historical={attendanceWing:'primary',roster:[...roster].reverse().map(({wing,...person})=>person)};
 assert.deepEqual(meetingAttendanceRoster(historical,staff).map(p=>p.id),['principal','girraj','hm','anil','poor','bengia']);
 assert.equal(roster.find(p=>p.id==='anil').wing,'primary');
});
