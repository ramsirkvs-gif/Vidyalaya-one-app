export function activeRollLongLeave(reports,ids,date){const wanted=new Set(ids);return Object.entries(reports||{}).filter(([,r])=>wanted.has(r.staffId)&&r.leaveType==='long'&&r.status==='approved'&&r.from&&r.to&&r.from<=date&&date<=r.to).map(([id,r])=>({id,...r})).sort((a,b)=>Number(b.updatedAt||b.submittedAt||0)-Number(a.updatedAt||a.submittedAt||0))[0]||null;}

export function activeAdvanceLeave(leaves,ids,date){const wanted=new Set(ids);return Object.entries(leaves||{}).filter(([,r])=>wanted.has(r.staffId)&&r.status==='recorded'&&r.dates?.includes(date)&&!r.cancelledDates?.includes(date)).map(([id,r])=>({id,...r})).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0]||null;}

export function afternoonMorningRecord(reports,ids,date){
 return Object.values(reports||{}).filter(r=>r.period==='morning'&&r.date===date&&ids.includes(r.staffId))
  .sort((a,b)=>Number(b.updatedAt||b.submittedAt||0)-Number(a.updatedAt||a.submittedAt||0))[0];
}

export const afternoonFirstHalfReturn=r=>r?.reported==='no'&&r.leaveType==='half'&&r.halfDay==='first'&&r.status!=='not-approved';
export const afternoonMorningExemption=r=>r?.reported==='no'&&r.status==='approved'&&['today','long'].includes(r.leaveType)
 ||r?.workflowVersion>=4&&r.leaveType==='half'&&r.halfDay==='second'&&r.status!=='not-approved';

export function afternoonLeaveExemption(rollCall,ids,date){
 const reports=rollCall?.reports;
 return !!(activeAdvanceLeave(rollCall?.advanceLeaves,ids,date)
  ||activeRollLongLeave(reports,ids,date)
  ||afternoonMorningExemption(afternoonMorningRecord(reports,ids,date)));
}
