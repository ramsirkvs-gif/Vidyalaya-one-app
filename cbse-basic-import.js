import {meetingLink} from './cbse-contact-model.js';
import {clone,entries} from './cbse-model.js';
import {studentIndex} from './cbse-mission-model.js';
const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toUpperCase();
export function parseCSVRows(text){
 const rows=[];let row=[],value='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){value+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else value+=c;}else if(c==='"'){if(value||closed)throw Error('Invalid CSV quoting.');quoted=true;}else if(c===','||c==='\n'||c==='\r'){row.push(value.trim());value='';closed=false;if(c!==','){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}else {if(closed&&!/\s/.test(c))throw Error('Invalid CSV quoting.');if(!closed)value+=c;}}
 if(quoted)throw Error('Unclosed CSV field.');row.push(value.trim());if(row.some(Boolean))rows.push(row);return rows;
}
export function importBasicStudents(text,mission,draft){
 const rows=parseCSVRows(text.replace(/^\uFEFF/,'')),header=rows.shift()||[];
 if(header.includes('MeetingLink'))return importStudentMeetings(rows,header,mission,draft);
 if(header.includes('Email'))return importStudentEmails(rows,header,mission,draft);
 const required=['Class','Section','StudentName','Gender'];
 if(!required.every(h=>header.includes(h))||new Set(header).size!==header.length)throw Error('Use the cleaned basic-data CSV with Class, Section, StudentName and Gender columns.');
 if(!rows.length)throw Error('No student rows found.');
 const next=clone(mission);next.students||={};const people=entries(studentIndex(draft)),seen=new Set(),issues=[],counts={};let matched=0,changed=0;
 rows.forEach((values,i)=>{if(values.length!==header.length)throw Error(`Row ${i+2} has the wrong number of columns.`);const r=Object.fromEntries(header.map((h,j)=>[h,values[j]]));
 const section=norm(r.Section),cl=norm(r.Class)==='10'?'X':norm(r.Class),name=norm(r.StudentName),roll=norm(r.RollNo);
 const group=people.filter(([,p])=>p.classId===cl&&norm(p.section)===section),byName=group.filter(([,p])=>norm(p.name)===name);
 // Require the name to agree even when the spreadsheet supplies a roll number.
 let candidates=byName;if(candidates.length>1&&roll)candidates=candidates.filter(([,p])=>norm(p.roll)===roll);
 if(candidates.length!==1){issues.push(`Row ${i+2}: ${cl}-${section} · ${r.StudentName}: ${candidates.length?'ambiguous name':'no matching roster name'}.`);return;}
 const [key]=candidates[0];if(seen.has(key))throw Error(`Duplicate student at row ${i+2}.`);seen.add(key);
 const gender={MALE:'boy',FEMALE:'girl',BOY:'boy',GIRL:'girl'}[norm(r.Gender)];if(r.Gender&&!gender)throw Error(`Row ${i+2}: unrecognised gender.`);
 const old=next.students[key]||{gender:'unknown',guardian:'',phones:'',location:''},p={...old};
 if(gender)p.gender=gender;
 const guardian=[r.FatherName&&`Father: ${r.FatherName}`,r.MotherName&&`Mother: ${r.MotherName}`].filter(Boolean).join('; ');
 const phones=[r.Mobile&&`Student: ${r.Mobile}`,r.FatherMobile&&`Father: ${r.FatherMobile}`,r.MotherMobile&&`Mother: ${r.MotherMobile}`].filter(Boolean).join('; ');
 const location=[r.CurrentAddress&&`Current: ${r.CurrentAddress}`,r.PermanentAddress&&r.PermanentAddress!==r.CurrentAddress&&`Permanent: ${r.PermanentAddress}`].filter(Boolean).join('\n');
 for(const[k,v,max]of [['guardian',guardian,120],['phones',phones,200],['location',location,500]]){if(v.length>max)throw Error(`Row ${i+2}: ${k} is too long; shorten it before import.`);if(v)p[k]=v;}
 if(JSON.stringify(p)!==JSON.stringify(old))changed++;next.students[key]=p;matched++;counts[`${cl}-${section}`]=(counts[`${cl}-${section}`]||0)+1;
 });return {next,matched,changed,issues,counts,total:rows.length};
}

function importStudentEmails(rows,header,mission,draft){
 if(header.join(',')!=='Class,Section,StudentName,Email')throw Error('Email-only import requires exactly Class, Section, StudentName, Email columns.');
 if(!rows.length)throw Error('No email rows found.');
 const next=clone(mission),people=entries(studentIndex(draft)),seen=new Set(),issues=[],counts={};let matched=0,changed=0;
 for(const [i,values]of rows.entries()){
  if(values.length!==4)throw Error(`Row ${i+2} has the wrong number of columns.`);
  const [classValue,section,name,email]=values,cl=({'10':'X','12':'XII'})[norm(classValue)]||norm(classValue);
  const candidates=people.filter(([,p])=>p.classId===cl&&norm(p.section)===norm(section)&&norm(p.name)===norm(name));
  if(candidates.length!==1){issues.push(`Row ${i+2}: no unique roster match.`);continue;}
  if(!validStudentEmail(email)){issues.push(`Row ${i+2}: blank or invalid email; unchanged.`);continue;}
  const [key]=candidates[0];if(seen.has(key))throw Error(`Duplicate student at row ${i+2}.`);seen.add(key);
  next.students||={};const old=next.students[key]||{gender:'unknown',guardian:'',phones:'',location:''};
  if(old.email!==email){next.students[key]={...old,email};changed++;}
  matched++;counts[`${cl}-${norm(section)}`]=(counts[`${cl}-${norm(section)}`]||0)+1;
 }
 return {next,matched,changed,issues,counts,total:rows.length,emailOnly:true};
}
export function validStudentEmail(value){return typeof value==='string'&&value.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value)&&!value.startsWith('.')&&!value.split('@')[0].endsWith('.')&&!value.split('@')[0].includes('..');}

function importStudentMeetings(rows,header,mission,draft){
 if(header.join(',')!=='Class,Section,StudentName,MeetingLink')throw Error('Meeting import requires exactly Class, Section, StudentName, MeetingLink columns.');
 if(!rows.length)throw Error('No meeting rows found.');
 const next=clone(mission),people=entries(studentIndex(draft)),seen=new Set(),issues=[],counts={};let matched=0,changed=0;
 for(const [i,values]of rows.entries()){
  if(values.length!==4)throw Error(`Row ${i+2} has the wrong number of columns.`);
  const [classValue,section,name,url]=values,cl=({'10':'X','12':'XII'})[norm(classValue)]||norm(classValue);
  const candidates=people.filter(([,p])=>p.classId===cl&&norm(p.section)===norm(section)&&norm(p.name)===norm(name));
  if(candidates.length!==1){issues.push(`Row ${i+2}: no unique roster match.`);continue;}
  if(!url){issues.push(`Row ${i+2}: no meeting link; unchanged.`);continue;}
  const link=meetingLink(url),[key]=candidates[0];if(seen.has(key))throw Error(`Duplicate student at row ${i+2}.`);seen.add(key);
  if(entries(next.students).some(([other,p])=>other!==key&&p.meetingLink&&meetingLink(p.meetingLink)===link))throw Error(`Row ${i+2}: this meeting link belongs to another student.`);
  next.students||={};const old=next.students[key]||{gender:'unknown',guardian:'',phones:'',location:''};
  if(old.meetingLink!==link){next.students[key]={...old,meetingLink:link};changed++;}
  matched++;counts[`${cl}-${norm(section)}`]=(counts[`${cl}-${norm(section)}`]||0)+1;
 }
 return {next,matched,changed,issues,counts,total:rows.length,meetingOnly:true};
}
