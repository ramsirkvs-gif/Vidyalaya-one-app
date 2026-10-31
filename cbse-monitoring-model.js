export const MONITOR_AREAS={
 teachers:{title:'Faculty team monitoring',description:'Teacher profiles, classroom observations, targeted students and improvement efforts.',icon:'◎'},
 remedial:{title:'Remedial classes',description:'Plan and review sessions, attendance, learning gaps and follow-up.',icon:'↗',kind:'remedial'},
 worksheets:{title:'Worksheets & practice',description:'Work issued, submitted, checked and followed up.',icon:'▤',kind:'worksheet'},
 ct:{title:'CT / Co-CT monitoring',description:'Section watch, parent contact and coordinated student support.',icon:'▦',kind:'class_teacher'},
 counselling:{title:'Counsellor monitoring',description:'Assigned students, support tasks and restricted follow-up notes.',icon:'◇',kind:'counselling'},
 prt:{title:'Primary support partners',description:'PRT engagement, targeted students and completed support.',icon:'♧',kind:'prt'},
 weekly:{title:'Weekly review & other efforts',description:'Meeting-ready updates, evidence and next actions.',icon:'✓',kind:'weekly'}
};
export const DETAIL_FIELDS={
 remedial:[['status','Session status','select',['planned','conducted','cancelled']],['start','Start time','time'],['end','End time','time'],['planned','Students planned','number'],['attended','Students attended','number'],['learningGap','Learning gap / focus','text'],['practice','Practice / work given','textarea'],['nextReview','Next review','date']],
 worksheet:[['status','Work status','select',['assigned','collected','checked','follow_up']],['planned','Students assigned work','number'],['submitted','Students submitted','number'],['checked','Students checked / reviewed','number'],['due','Submission due date','date'],['learningGap','Skill / practice focus','text'],['practice','Worksheet / practice description','textarea'],['nextReview','Next review','date']],
 observation:[['lessonPlanning','Lesson planning','select',['needs_support','developing','effective']],['participation','Student participation','select',['needs_support','developing','effective']],['understanding','Checking understanding','select',['needs_support','developing','effective']],['practice','Agreed improvement action','textarea'],['nextReview','Next observation / review','date']],
 class_teacher:[['attendanceWatch','Attendance follow-up','select',['pending','in_progress','reviewed']],['parentContact','Parent contact follow-up','select',['pending','in_progress','reviewed']],['practice','Support / coordination action','textarea'],['nextReview','Next class review','date']],
 counselling:[['status','Follow-up status','select',['planned','in_progress','reviewed']],['practice','Support action / follow-up','textarea'],['nextReview','Next follow-up','date']],
 prt:[['status','Support status','select',['planned','in_progress','reviewed']],['planned','Students planned','number'],['attended','Students supported','number'],['practice','Support activity','textarea'],['nextReview','Next follow-up','date']],
 weekly:[['status','Review status','select',['pending','reviewed']],['practice','Next-week priorities','textarea'],['nextReview','Next review','date']],
 effort:[['practice','Additional effort / evidence summary','textarea'],['nextReview','Next review','date']]
};
const assert=(ok,message)=>{if(!ok)throw Error(message);};
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function validateMonitoringDetails(record){
 const d=record.details;if(!d)return;
 assert(typeof d==='object'&&!Array.isArray(d),'Invalid monitoring detail format.');
 const fields=DETAIL_FIELDS[record.kind]||[];
 for(const[key,label,type,choices]of fields){const value=d[key];if(value===undefined||value===null||value==='')continue;
  if(type==='number')assert(Number.isInteger(value)&&value>=0&&value<=1000,`${label} must be a whole number between 0 and 1000.`);
  else if(type==='select')assert(choices.includes(value),`Choose a valid ${label.toLowerCase()}.`);
  else if(type==='date')assert(typeof value==='string'&&validDate(value),`Enter a valid ${label.toLowerCase()}.`);
  else if(type==='time')assert(typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value),`Enter a valid ${label.toLowerCase()}.`);
  else assert(typeof value==='string'&&value.length<=(type==='textarea'?1500:300),`${label} is too long.`);
 }
 if(d.start&&d.end)assert(d.start<d.end,'Session end time must be after start time.');
 for(const[small,big,label]of [['attended','planned','Students attended/supported'],['submitted','planned','Work submitted'],['checked','submitted','Work checked']])if(Number.isInteger(d[small])&&Number.isInteger(d[big]))assert(d[small]<=d[big],`${label} cannot exceed the preceding planned/submitted count.`);
 if(d.nextReview)assert(d.nextReview>=record.date,'Next review cannot be before the record date.');
 if(record.kind==='remedial'&&['planned','conducted'].includes(d.status))assert(record.staffId&&record.sectionKey,'A remedial session needs its teacher and class/section.');
 if(record.kind==='remedial'&&d.status==='conducted')assert(Number.isInteger(d.attended),'Record the student attendance count for a conducted remedial session.');
}
export function visibleMonitoringDetails(record){const out={};for(const[key,,type,choices]of DETAIL_FIELDS[record.kind]||[]){const v=record.details?.[key];if(v===undefined||v===null||v==='')continue;const valid=type==='number'?Number.isInteger(v)&&v>=0&&v<=1000:typeof v==='string'&&v.length<=(type==='textarea'?1500:300)&&(type!=='select'||choices.includes(v));if(valid)out[key]=v;}return out;}
export function monitoringDetailLines(record){const d=visibleMonitoringDetails(record);return (DETAIL_FIELDS[record.kind]||[]).filter(([key])=>Object.hasOwn(d,key)).map(([key,label])=>`${label}: ${String(d[key]).replaceAll('_',' ')}`);}
