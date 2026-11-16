import test from 'node:test';import assert from 'node:assert/strict';import {rollStaffStatus} from '../cbse-roll-call-status.js';
test('wing register includes unreported staff, orders serials, and excludes other days and wings',()=>{const data={serverDate:'2026-11-09',staff:{c:{name:'MR. RAMESH YADAV',wing:'secondary'},b:{name:'MR. PARAMVEER MEENA',wing:'secondary'},a:{name:'MRS. E.T. ZIRDO',wing:'secondary'},p:{name:'Primary',wing:'primary'}},rollCall:{reports:{old:{staffId:'c',wing:'secondary',date:'2026-11-08',period:'morning'},one:{staffId:'a',wing:'secondary',date:'2026-11-09',period:'morning'},half:{staffId:'b',wing:'secondary',date:'2026-11-09',period:'afternoon',leaveType:'half',halfDay:'first',status:'approved'}}}};const rows=rollStaffStatus(data,'secondary');assert.deepEqual(rows.slice(0,3).map(r=>[r.serial,r.name]),[[1,'MRS. E.T. ZIRDO'],[2,'MR. PARAMVEER MEENA'],[3,'MR. RAMESH YADAV']]);assert.equal(rows[0].morning.id,'one');assert.equal(rows[1].morningExcused,true);assert.equal(rows[2].morning,undefined);assert.equal(rows[2].afternoon,undefined);assert.equal(rollStaffStatus(data,'primary').length,1);});

test('only approved long leave and recorded uncancelled advance dates exempt the reporting day',()=>{
 const data={serverDate:'2026-11-15',staff:{a:{name:'Synthetic',wing:'primary'}},rollCall:{reports:{long:{staffId:'a',wing:'primary',date:'2026-11-14',period:'morning',leaveType:'long',from:'2026-11-14',to:'2026-11-16',status:'pending'}},advanceLeaves:{leave:{staffId:'a',dates:['2026-11-15','2026-11-16'],status:'pending'}}}};
 const row=()=>rollStaffStatus(data,'primary',{includeLongLeave:true})[0];
 assert.equal(row().longLeave,null);assert.equal(row().advanceLeave,null);
 data.rollCall.reports.long.status='not-approved';assert.equal(row().longLeave,null);
 data.rollCall.reports.long.status='approved';assert.ok(row().longLeave);
 data.serverDate='2026-11-17';assert.equal(row().longLeave,null);
 data.serverDate='2026-11-15';data.rollCall.advanceLeaves.leave.status='recorded';assert.ok(row().advanceLeave);
 data.rollCall.advanceLeaves.leave.cancelledDates=['2026-11-15'];assert.equal(row().advanceLeave,null);
 data.rollCall.advanceLeaves.leave.status='not-approved';assert.equal(row().advanceLeave,null);
});
