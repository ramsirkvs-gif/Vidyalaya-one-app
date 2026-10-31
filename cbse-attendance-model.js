import {clone,entries} from './cbse-model.js';
const codes=new Set(['P','A','H','S','L','ML','O/D','NF']),presentCodes=new Set(['P','ML','O/D']);
const norm=v=>String(v||'').normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}]/gu,'');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const fraction=v=>v&&Number.isInteger(v.present)&&Number.isInteger(v.working)&&v.present>=0&&v.working>=v.present&&v.working<=400;
export function validateAttendanceRegister(r){
 assert(r&&['X','XII'].includes(r.classId)&&typeof r.section==='string'&&r.section.length<=30&&typeof r.name==='string'&&r.name.trim()&&r.name.length<=120,'Invalid attendance identity.');
 assert(validDate(r.asOf)&&r.period===r.asOf.slice(0,7)&&/^\d{4}-\d{2}$/.test(r.session),'Invalid attendance reporting date/session.');
 const year=Number(r.session.slice(0,4)),m=Number(r.period.slice(5));assert(Number(r.session.slice(5))===(year+1)%100&&Number(r.period.slice(0,4))===(m>=4?year:year+1),'Attendance month falls outside its session.');
 assert(fraction(r.current)&&fraction(r.previous)&&fraction(r.total)&&r.total.working>0,'Invalid attendance totals.');
 assert(r.arrear==null||fraction(r.arrear),'Invalid attendance arrear.');
 const arrear=r.arrear||{present:0,working:0};assert(r.current.present+r.previous.present+arrear.present===r.total.present&&r.current.working+r.previous.working+arrear.working===r.total.working,'Attendance totals do not add up.');
 const dayCount=new Date(Date.UTC(Number(r.period.slice(0,4)),m,0)).getUTCDate();assert(Array.isArray(r.days)&&r.days.length===dayCount&&r.days.every(c=>codes.has(c)),'Attendance daily cells are incomplete.');
 assert(r.days.filter(c=>presentCodes.has(c)).length===r.current.present&&r.days.filter(c=>c!=='H'&&c!=='S').length===r.current.working,'Daily attendance does not match the monthly total.');
 assert(Number.isFinite(r.reportedPercentage)&&Math.abs(r.reportedPercentage-r.total.present/r.total.working*100)<.011,'Attendance percentage does not match the totals.');
 assert(typeof r.sourceFile==='string'&&r.sourceFile.length<=200,'Invalid attendance source.');return r;
}
export function parseAttendanceText(text,sourceFile='Attendance register.pdf'){
 const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'],header=text.match(/Attendance Register\s*[—–-]\s*([A-Za-z]+)\s+(\d{4})/i),cl=text.match(/Class\s+(10|12|XII|X)\s*-\s*([A-Z])\b/i),session=text.match(/Session\s+(\d{4}-\d{2})/),generated=text.match(/Generated\s+(\d{2})-(\d{2})-(\d{4})/i);
 assert(new Set([...text.matchAll(/Class\s+(10|12|XII|X)\s*-\s*([A-Z])\b/ig)].map(m=>m[1].toUpperCase()+'-'+m[2].toUpperCase())).size<=1,'Each PDF must contain one section register. Upload section files separately.');assert(new Set([...text.matchAll(/Attendance Register\s*[—–-]\s*([A-Za-z]+)\s+(\d{4})/ig)].map(m=>m[1].toLowerCase()+'-'+m[2])).size<=1,'Each PDF must contain one reporting month. Upload monthly files separately.');
 assert(header&&cl&&session&&generated,'This PDF must contain an attendance register month, section, session and generated date.');const month=monthNames.findIndex(n=>n.toLowerCase()===header[1].toLowerCase())+1;assert(month,'Unrecognised attendance month.');
 const period=header[2]+'-'+String(month).padStart(2,'0'),last=new Date(Date.UTC(Number(header[2]),month,0)),lastDate=last.toISOString().slice(0,10),generatedDate=`${generated[3]}-${generated[2]}-${generated[1]}`;assert(validDate(generatedDate)&&generatedDate>=period+'-01','Invalid register generation date.');const asOf=generatedDate>lastDate?lastDate:generatedDate,dayCount=last.getUTCDate(),rows=[];
 const tail=/\s+(\d+)\s*\/\s*(\d+)\s+(\d+)\s*\/\s*(\d+)\s+(—|-|\d+\/\d+)\s+(\d+)\s*\/\s*(\d+)\s+([\d.]+)\s*%\s*$/;
 for(const line of text.split(/\r?\n/)){if(!/^\s*\d+\s+\d+\s+/.test(line))continue;const hit=line.match(tail);assert(hit,'An attendance row has unreadable totals.');const tokens=line.slice(0,hit.index).trim().split(/\s+/),[,,...body]=tokens,days=body.slice(-dayCount),name=body.slice(0,-dayCount).join(' '),[,a,b,c,d,arrear,e,f,pct]=hit;const r={classId:/^(10|X)$/i.test(cl[1])?'X':'XII',section:cl[2].toUpperCase(),name,sourceRoll:tokens[1],period,asOf,session:session[1],current:{present:Number(a),working:Number(b)},previous:{present:Number(c),working:Number(d)},arrear:/^\d/.test(arrear)?{present:Number(arrear.split('/')[0]),working:Number(arrear.split('/')[1])}:null,total:{present:Number(e),working:Number(f)},reportedPercentage:Number(pct),days,sourceFile};validateAttendanceRegister(r);rows.push(r);}
 assert(rows.length,'No attendance student rows found.');return rows;
}
export function latestAttendanceRegister(studentKey,mission){return Object.values(mission.attendanceRegisters||{}).filter(r=>r.studentKey===studentKey).sort((a,b)=>b.asOf.localeCompare(a.asOf)||(b.updatedAt||0)-(a.updatedAt||0))[0]||null;}
const evidence=r=>JSON.stringify([r.asOf,r.session,r.current.present,r.current.working,r.previous.present,r.previous.working,r.arrear?.present||0,r.arrear?.working||0,r.total.present,r.total.working,r.days,r.reportedPercentage]);
export function importAttendanceRegisters(pkg,mission,draft){
 assert(pkg?.format==='mission-attendance-register-v1'&&Array.isArray(pkg.records)&&pkg.records.length>0&&pkg.records.length<=5000,'Choose an attendance-register package or PDF files.');
 const next=clone(mission),lookup=new Map(),people=[],scopeRows=new Map(),seen=new Set(),duplicates=[],extras=[],issues=[],coverage={},matched=new Set();next.attendanceRegisters||={};let added=0,updated=0,skipped=0;
 for(const[cl,c]of entries(draft.classes))for(const[sid,s]of entries(c.sections))for(const[pid,p]of entries(s.students)){const item={key:`${cl}:${sid}:${pid}`,name:p.name,classId:cl,section:s.name,sectionId:sid};people.push(item);const k=cl+'|'+norm(s.name)+'|'+norm(p.name);lookup.set(k,[...(lookup.get(k)||[]),item]);}
 for(const raw of pkg.records){const r=validateAttendanceRegister(raw),identity=r.classId+'|'+norm(r.section)+'|'+norm(r.name)+'|'+r.period,signature=evidence(r);
  if(seen.has(identity)){assert(scopeRows.get(identity)===signature,'Conflicting duplicate attendance rows. Import only the correct register version.');duplicates.push(identity);continue;}seen.add(identity);scopeRows.set(identity,signature);
  const candidates=lookup.get(r.classId+'|'+norm(r.section)+'|'+norm(r.name))||[];if(candidates.length!==1){(candidates.length?issues:extras).push({classId:r.classId,section:r.section,name:r.name,reason:candidates.length?'Ambiguous roster name':'Extra name; possible TC, not confirmed'});continue;}
  const p=candidates[0],id='register_'+p.key+'_'+r.period,old=next.attendanceRegisters[id];matched.add(p.key);coverage[r.classId+'-'+p.section]=(coverage[r.classId+'-'+p.section]||0)+1;
  const record={...Object.fromEntries(['classId','section','name','sourceRoll','period','asOf','session','current','previous','arrear','total','reportedPercentage','days','sourceFile'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])),studentKey:p.key,source:'attendance_register_pdf'};if(old&&old.asOf>r.asOf){skipped++;continue;}if(old&&evidence(old)===evidence(record)){skipped++;continue;}if(old)updated++;else added++;next.attendanceRegisters[id]={...record,updatedAt:Date.now()};
 }
 const asOf=Object.values(next.attendanceRegisters).map(r=>r.asOf).sort().at(-1)||pkg.records.map(r=>r.asOf).sort().at(-1),missingLatest=people.filter(p=>{const latest=latestAttendanceRegister(p.key,next);return !latest||latest.asOf<asOf;});return {next,added,updated,skipped,duplicates:duplicates.length,matched:matched.size,extras,issues,coverage,asOf,covered:people.length-missingLatest.length,missingLatest,missing:people.filter(p=>!matched.has(p.key))};
}
