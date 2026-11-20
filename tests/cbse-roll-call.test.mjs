import {AFTERNOON_QUESTIONS} from '../cbse-afternoon-checklist.js';
const afternoonAnswers=Object.fromEntries(AFTERNOON_QUESTIONS.map(q=>[q.id,q.type==='text'?Array(50).fill('synthetic').join(' '):'yes']));
import test from 'node:test';import assert from 'node:assert/strict';
import {applyRollCall,ROLL_CHECKS,LEAVE_CHECKS,rollToday} from '../cbse-roll-call-model.js';
const now=Date.parse('2026-11-09T04:00:00Z'),staff={a:{name:'Teacher A',status:'active',kind:'faculty'},b:{name:'Teacher B',status:'active',designation:'PRT'},ic:{name:'IC',status:'active',kind:'faculty'}},actor={id:'a',name:'Teacher A'},ic={id:'ic',name:'IC'},principal={id:'principal',name:'Principal'},morning={rollOperation:'report',wing:'secondary',period:'morning',reported:'yes',noReason:'Emergency duty handover requires Principal review.',answers:Object.fromEntries(ROLL_CHECKS.map(([k])=>[k,'no']))},afternoon={rollOperation:'report',wing:'secondary',period:'afternoon',answers:afternoonAnswers},key=rollToday(now)+'_afternoon_a';
test('morning/leave conditional validation, wing integrity and 50-word limit',()=>{let s=applyRollCall({},morning,actor,staff,now);assert.equal(Object.keys(s.reports).length,1);assert.equal(s.reports[rollToday(now)+'_morning_a'].answers.biometric,'no');assert.throws(()=>applyRollCall({}, {...morning,wing:'primary'},actor,staff,now),/wing/);const leave={...morning,reported:'no',leaveType:'long',from:'2026-11-08',to:'2026-11-10',answers:Object.fromEntries(LEAVE_CHECKS.map(([k])=>[k,'yes'])),remark:'Follow up remotely'};s=applyRollCall(s,leave,actor,staff,now);assert.equal(s.reports[rollToday(now)+'_morning_a'].leaveType,'long');assert.throws(()=>applyRollCall({},{...leave,remark:'word '.repeat(51)},actor,staff,now),/50 words/);assert.throws(()=>applyRollCall({},{...leave,to:'2026-11-08'},actor,staff,now),/include today/);});
test('afternoon is recorded after morning without approval; objections require NOC',()=>{assert.throws(()=>applyRollCall({},afternoon,actor,staff,now),/morning/);let s=applyRollCall({},morning,actor,staff,now);s=applyRollCall(s,afternoon,actor,staff,now);assert.equal(s.reports[key].status,'recorded');assert.throws(()=>applyRollCall(s,{rollOperation:'approve',reportId:key},actor,staff,now),/Principal/);s=applyRollCall(s,{rollOperation:'approve',reportId:key},principal,staff,now);assert.equal(s.reports[key].status,'approved');s=applyRollCall(s,{rollOperation:'object',wing:'secondary',targets:['a'],department:'Exams',remark:'QP pending'},ic,staff,now,'obj');assert.equal(s.reports[key].status,'blocked');assert.throws(()=>applyRollCall(s,afternoon,actor,staff,now),/pending|approved/);assert.throws(()=>applyRollCall(s,{rollOperation:'clear',objectionId:'obj_a'},actor,staff,now),/Only/);s=applyRollCall(s,{rollOperation:'clear',objectionId:'obj_a'},ic,staff,now);assert.throws(()=>applyRollCall(s,afternoon,actor,staff,now),/approved/);s=applyRollCall(s,{rollOperation:'approve',reportId:key},principal,staff,now);assert.equal(s.reports[key].status,'approved');assert.throws(()=>applyRollCall(s,{rollOperation:'object',wing:'primary',targets:['a'],department:'Exams',remark:'Pending'},ic,staff,now,'bad'),/concerned wing/);});
test('server fixes report date and timestamp and rejects backdated or future requests',()=>{for(const date of ['2026-11-08','2026-11-10'])assert.throws(()=>applyRollCall({}, {...morning,date},actor,staff,now),/only for today/);const s=applyRollCall({}, {...morning,date:rollToday(now),submittedAt:1,updatedAt:1},actor,staff,now);const r=Object.values(s.reports)[0];assert.equal(r.date,'2026-11-09');assert.equal(r.submittedAt,now);assert.equal(r.updatedAt,now);});
test('afternoon first-half return comes from the saved morning record',()=>{
 const leave={...afternoon,reported:'yes',leaveType:'half',halfDay:'first'};
 assert.throws(()=>applyRollCall({},leave,actor,staff,now),/morning/);
 const morningAbsence={staffId:'a',date:rollToday(now),period:'morning',reported:'no',leaveType:'half',halfDay:'first',status:'recorded'};
 const s=applyRollCall({reports:{morning:morningAbsence}},afternoon,actor,staff,now);
 assert.equal(s.reports[key].halfDay,'first');assert.equal(s.reports[key].status,'recorded');
 assert.throws(()=>applyRollCall({}, {...leave,period:'morning'},actor,staff,now),/afternoon roll call only/);
 const second=applyRollCall({}, {...morning,leaveType:'half',halfDay:'second'},actor,staff,now);
 assert.equal(Object.values(second.reports)[0].halfDay,'second');
});
test('No answers retain a reason for later optional review without blocking morning reporting',()=>{const input={...morning,noReason:''};assert.throws(()=>applyRollCall({},input,actor,staff,now),/reason \/ emergency/);const s=applyRollCall({}, {...input,noReason:'Emergency prevented completing biometric attendance.'},actor,staff,now);const id=Object.keys(s.reports)[0];assert.equal(s.reports[id].status,'recorded');assert.ok(s.reports[id].noAnswers.includes('Biometric attendance completed?'));assert.throws(()=>applyRollCall(s,{rollOperation:'approve',reportId:id},actor,staff,now),/Principal/);const reviewed=applyRollCall(s,{rollOperation:'approve',reportId:id},principal,staff,now);assert.equal(reviewed.reports[id].status,'approved');assert.equal(reviewed.reports[id].requiresReview,false);const yes={...morning,noReason:'',answers:Object.fromEntries(ROLL_CHECKS.map(([k,,na])=>[k,na?'na':'yes']))};assert.equal(Object.values(applyRollCall({},yes,actor,staff,now).reports)[0].status,'recorded');});
test('recorded long leave blocks both RC periods inclusively and permits reporting again after expiry',()=>{const leave={...morning,reported:'no',leaveType:'long',from:'2026-11-09',to:'2026-11-11',answers:Object.fromEntries(LEAVE_CHECKS.map(([k])=>[k,'yes'])),noReason:'Pre-approved long leave for a family emergency.'};const s=applyRollCall({},leave,actor,staff,now);s.reports['2026-11-09_morning_a'].status='approved';for(const date of ['2026-11-09','2026-11-10','2026-11-11'])for(const period of ['morning','afternoon'])assert.throws(()=>applyRollCall(s,{...morning,period},actor,staff,Date.parse(date+'T04:00:00Z')),/on recorded long leave/);const back=applyRollCall(s,morning,actor,staff,Date.parse('2026-11-12T04:00:00Z'));assert.ok(back.reports['2026-11-12_morning_a']);});

test('No-answer reason is capped at 100 words',()=>{assert.throws(()=>applyRollCall({}, {...morning,noReason:'Emergency '.repeat(101)},actor,staff,now),/100 words/);assert.equal(Object.values(applyRollCall({}, {...morning,noReason:'Emergency '.repeat(100)},actor,staff,now).reports)[0].noReason.trim().split(/\s+/).length,100);});
test('only Principal may decline a pending afternoon report and teacher may resubmit after discussion',()=>{let s=applyRollCall({},morning,actor,staff,now);s=applyRollCall(s,afternoon,actor,staff,now);assert.throws(()=>applyRollCall(s,{rollOperation:'reject',reportId:key},actor,staff,now),/Principal/);s=applyRollCall(s,{rollOperation:'reject',reportId:key},principal,staff,now+100);assert.equal(s.reports[key].status,'not-approved');assert.equal(s.reports[key].rejectedAt,now+100);assert.equal(s.reports[key].approvedAt,undefined);s=applyRollCall(s,afternoon,actor,staff,now+200);assert.equal(s.reports[key].status,'recorded');s=applyRollCall(s,{rollOperation:'approve',reportId:key},principal,staff,now+300);assert.equal(s.reports[key].status,'approved');});
test('all-Yes morning reports are recorded without Principal approval; simple objections need only targets and remark',()=>{const input={...morning,answers:Object.fromEntries(ROLL_CHECKS.map(([k])=>[k,'yes'])),noReason:''};const s=applyRollCall({},input,actor,staff,now),id=Object.keys(s.reports)[0];assert.equal(s.reports[id].status,'recorded');assert.equal(s.reports[id].hasNoAnswers,false);assert.equal(applyRollCall(s,{rollOperation:'approve',reportId:id},principal,staff,now+100).reports[id].status,'approved');const raised=applyRollCall(s,{rollOperation:'object',wing:'secondary',targets:['a'],remark:'Please submit the exam bundle.'},ic,staff,now,'simple');assert.equal(raised.objections.simple_a.department,'IC Objection');assert.throws(()=>applyRollCall(s,{rollOperation:'object',wing:'secondary',targets:['a'],remark:'Test self objection'},actor,staff,now,'self'),/not yourself/);});


test('new daily workflow requires a duty undertaking before any save',()=>{
 assert.throws(()=>applyRollCall({}, {rollOperation:'report',workflowVersion:2,undertaking:false},{id:'someone'}, {},Date.now()),/undertaking/);
});

test('both wings record both periods directly, with optional protected comments and no approval gate',()=>{
 for(const id of ['a','b']){
  const who={id,name:staff[id].name},wing=id==='a'?'secondary':'primary',input={...morning,wing};
  let s=applyRollCall({},input,who,staff,now);const mid=rollToday(now)+'_morning_'+id;
  assert.equal(s.reports[mid].status,'recorded');assert.equal(s.reports[mid].approvalRequired,false);assert.equal(s.reports[mid].requiresReview,false);assert.equal(s.reports[mid].hasNoAnswers,true);
  s=applyRollCall(s,{...afternoon,wing},who,staff,now+1);const aid=rollToday(now)+'_afternoon_'+id;
  assert.equal(s.reports[aid].status,'recorded');
  const comment={rollOperation:'report-comment',reportId:mid,expectedUpdatedAt:s.reports[mid].updatedAt,expectedSubmittedAt:s.reports[mid].submittedAt,comment:'Please complete the register today.'};
  assert.throws(()=>applyRollCall(s,comment,who,staff,now+2),/Principal access/);
  const reviewed=applyRollCall(s,comment,principal,staff,now+2);assert.equal(reviewed.reports[mid].status,'recorded');assert.equal(Object.values(reviewed.reports[mid].principalComments)[0].text,comment.comment);assert.equal(reviewed.reports[mid].reviewedAt,now+2);
  assert.throws(()=>applyRollCall(reviewed,comment,principal,staff,now+3),/changed/);
  s=applyRollCall(reviewed,input,who,staff,now+4);assert.equal(Object.values(s.reports[mid].principalComments).length,1);assert.equal(s.reports[mid].status,'recorded');
  s=applyRollCall(s,{rollOperation:'object',wing,targets:[id],remark:'Pending exam bundle'},principal,staff,now+5,'later');assert.equal(s.reports[aid].status,'blocked');assert.equal(s.reports[mid].status,'recorded');
  s=applyRollCall(s,{...afternoon,wing},who,staff,now+6);assert.equal(s.reports[aid].status,'blocked');
  s=applyRollCall(s,{rollOperation:'clear',objectionId:'later_'+id},principal,staff,now+7);assert.equal(s.reports[aid].status,'recorded');assert.equal(s.reports[aid].requiresReview,false);
 }
});
test('IC objections block an already submitted linked identity until all NOCs are cleared',()=>{
 const directory={...staff,alias:{...staff.a}},m={...morning,answers:Object.fromEntries(ROLL_CHECKS.map(([k])=>[k,'yes']))};let s=applyRollCall({},m,actor,directory,now);s=applyRollCall(s,afternoon,actor,directory,now+1);
 for(const id of ['first','second'])s=applyRollCall(s,{rollOperation:'object',wing:'secondary',targets:['alias'],remark:'Pending task'},ic,directory,now+2,id);
 assert.equal(s.reports[key].status,'blocked');s=applyRollCall(s,{rollOperation:'clear',objectionId:'first_alias'},ic,directory,now+3);assert.equal(s.reports[key].status,'blocked');s=applyRollCall(s,{rollOperation:'clear',objectionId:'second_alias'},ic,directory,now+4);assert.equal(s.reports[key].status,'recorded');
});

test('Principal holds cover selected/all staff, retain attendance, and require Principal release independently of IC NOC',()=>{
 const directory={...staff,alias:{...staff.a}};let s=applyRollCall({},morning,actor,directory,now);s=applyRollCall(s,afternoon,actor,directory,now+1);
 const hold={rollOperation:'principal-hold',targetMode:'selected',wing:'',targets:['alias'],remark:'Meet Principal before leaving'};
 assert.throws(()=>applyRollCall(s,hold,ic,directory,now+2,'hold'),/Only the Principal/);
 s=applyRollCall(s,hold,principal,directory,now+2,'hold');assert.equal(s.reports[key].status,'blocked');assert.equal(s.reports['2026-11-09_morning_a'].status,'recorded');assert.equal(s.objections.hold_alias.kind,'principal-hold');
 assert.throws(()=>applyRollCall(s,{rollOperation:'clear',objectionId:'hold_alias'},ic,directory,now+3),/Only/);
 // A Principal hold records an afternoon submission but withholds departure clearance.
 s=applyRollCall(s,afternoon,actor,directory,now+4);assert.equal(s.reports[key].status,'blocked');
 s=applyRollCall(s,{rollOperation:'object',wing:'secondary',targets:['a'],remark:'IC task pending'},ic,directory,now+5,'ic');
 s=applyRollCall(s,{rollOperation:'clear',objectionId:'hold_alias'},principal,directory,now+6);assert.equal(s.reports[key].status,'blocked');
 s=applyRollCall(s,{rollOperation:'clear',objectionId:'ic_a'},ic,directory,now+7);assert.equal(s.reports[key].status,'recorded');
 const all=applyRollCall(s,{rollOperation:'principal-hold',targetMode:'all',wing:'',remark:'Meet Principal for NOC'},principal,directory,now+8,'all');assert.equal(Object.values(all.objections).filter(o=>o.kind==='principal-hold'&&o.status==='open').length,3);assert.ok(all.objections.all_b);assert.ok(all.objections.all_a);assert.equal(all.objections.all_alias,undefined);
 const primary=applyRollCall(s,{rollOperation:'principal-hold',targetMode:'all',wing:'primary',remark:'Meet Principal'},principal,directory,now+9,'primary');assert.ok(primary.objections.primary_b);assert.equal(primary.objections.primary_a,undefined);
 assert.throws(()=>applyRollCall(s,{...hold,remark:'x'.repeat(121)},principal,directory,now+10,'bad'),/120/);
});

test('Principal can release all open Principal holds across dates without a morning record',()=>{
 const place=(state,target,stamp,id)=>applyRollCall(state,{rollOperation:'principal-hold',targetMode:'selected',targets:[target],remark:id},principal,staff,stamp,id);
 let state=place({},'a',now-86400000,'earlier');
 state=place(state,'b',now,'today');
 state=applyRollCall(state,{rollOperation:'object',wing:'secondary',targets:['a'],remark:'IC duty'},ic,staff,now,'ic');
 const clear={rollOperation:'clear-principal-holds',date:rollToday(now),holdIds:['earlier_a','today_b']};
 assert.throws(()=>applyRollCall(state,clear,ic,staff,now),/Only the Principal/);
 assert.throws(()=>applyRollCall(state,{...clear,holdIds:['today_b']},principal,staff,now),/list changed/);
 const saved=applyRollCall(state,clear,principal,staff,now);
 assert.equal(saved.objections.earlier_a.status,'cleared');
 assert.equal(saved.objections.today_b.status,'cleared');
 assert.equal(saved.objections.earlier_a.clearedBy,'principal');
 assert.equal(saved.objections.ic_a.status,'open');
 assert.deepEqual(saved.reports,{});
});
