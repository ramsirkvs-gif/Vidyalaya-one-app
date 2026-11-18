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
 const {revision:created}=await principal('create');
 const {revision:assigned}=await principal('assign',{writers:[{id:hi,language:'hi'},{id:en,language:'en'}],expectedRevision:created});
 const {revision:configured}=await principal('attendance-assign',{attendanceWing:'secondary',attendanceTakers:[{role:'SMT-1',id:smt}],expectedRevision:assigned});
 await assert.rejects(pin(en,'456','read',{task:'minutes',language:'hi'}),/authorised/);
 const {meeting}=await pin(smt,'789','read',{task:'attendance'});
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
 await assert.rejects(call('staff-meetings-read',{meetingId}),/not been published/);
 const {revision:published}=await principal('publish',{expectedRevision:configured});
 const {report}=await call('staff-meetings-read',{meetingId});
 assert.deepEqual(report.versions.map(v=>v.language),['hi','en']);
 assert.deepEqual(report.absent.map(person=>person.name),['Synthetic Teacher two']);
 assert.equal(report.attendanceTakenBy,'Synthetic SMT');
 assert.equal(report.writers.length,2);
 await principal('minutes-edit',{...english,minutes:'Principal correction',expectedRevision:2});
 const preview=await principal('read',{task:'report'});
 assert.equal(preview.report.versions[1].minutes,'Principal correction');
 assert.equal((await call('staff-meetings-read',{meetingId})).report.versions[1].minutes,english.minutes);
 await principal('unpublish',{expectedRevision:published});
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
