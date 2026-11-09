import {CBSE_2027_PAPERS} from './cbse-board-datesheet-data.js';
export const VEMS_PORTAL='https://vems-new-portal-with-firebase.vercel.app/';
const normal=v=>String(v||'').toLowerCase().replace(/maths\b/g,'mathematics').replace(/[^a-z0-9]/g,'');
const roll=v=>String(v||'').trim().toUpperCase().replace(/^0+(?=\d)/,'');
export function vemsExamKind(title){const value=String(title||'').toLowerCase().replace(/[^a-z0-9]/g,'');return /preboard1(?:\D|$)/.test(value)?'preboard1':/preboard2(?:\D|$)/.test(value)?'preboard2':value.includes('cbse')?'cbse':'';}
export function matchVemsAttendance(feed,paper,draft){
 const none={available:false,records:{},matched:0,unmatched:0};if(!feed||feed.schemaVersion!==1||!Array.isArray(feed.rows))return {...none,note:'Publish the Classwise Report in VEMS to show attendance here.'};
 const year=Number(paper.date.slice(0,4))-(Number(paper.date.slice(5,7))<4?1:0),session=year+'-'+String(year+1).slice(-2);
 if(feed.mockPractice||feed.session!==session||feed.date!==paper.date||vemsExamKind(feed.examTitle)!==paper.exam)return {...none,note:'The published VEMS report is for a different exam/date/session, or is mock practice.'};
 const aliases=new Set(CBSE_2027_PAPERS.filter(p=>p.classId===paper.classId&&paper.codes.includes(p.code)).flatMap(p=>[p.name,...p.aliases]).concat(paper.name).map(normal));
 const identity=(cl,section,number)=>cl+'|'+String(section||'').trim().toUpperCase()+'|'+roll(number),groups=new Map();for(const row of feed.rows){if(row.classId!==paper.classId||!aliases.has(normal(row.subject))||!roll(row.roll))continue;const key=identity(row.classId,row.section,row.roll);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const local=new Map();for(const key of paper.studentKeys){const[cl,sid,id]=key.split(':'),section=draft.classes?.[cl]?.sections?.[sid],student=section?.students?.[id],identityKey=identity(cl,section?.name,student?.roll);if(!local.has(identityKey))local.set(identityKey,[]);local.get(identityKey).push(key);}
 const records={};let matched=0,unmatched=0;for(const [id,keys]of local){const rows=groups.get(id)||[];if(keys.length!==1||rows.length!==1){unmatched+=keys.length;continue;}const row=rows[0];if(!['present','absent','not-taken'].includes(row.status)){unmatched++;continue;}if(row.status==='not-taken'){matched++;continue;}const updatedAt=Date.parse(row.submittedAt);if(!Number.isFinite(updatedAt)){unmatched++;continue;}matched++;records[keys[0]]={status:row.status==='present'?'reported':'not-reported',updatedAt,updatedBy:'vems',updatedByName:row.submittedBy||'VEMS invigilator',source:'vems',roomId:row.roomId||''};}
 return {available:true,records,matched,unmatched,note:'Attendance from VEMS · Invigilators submit there using their room PIN.'+(unmatched?' '+unmatched+' students need class/section/roll matching; left as Attendance not taken.':'')};
}
