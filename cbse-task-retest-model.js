import {parseCSVRows} from './cbse-basic-import.js';

export const RETEST_TITLE='PB-1 / HE Absentees Retest on Medical Ground';
export const RETEST_HEADERS=['Name','Class with section','Roll number','Subject','Exam date'];
export const RETEST_FIELDS=[
 ['subjectTeacher','Subject teacher','text'],['classTeacher','Class teacher','text'],
 ['medicalStatus','Medical application status',['Pending','Received','Verified']],
 ['retestDate','Retest date planned','date'],
 ['qpReady','QP ready',['Pending','Ready']],['testDone','Test done',['Pending','Done']],
 ['principalDiscussion','Marks discussed with Principal',['Pending','Discussed']],
];

const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function parseRetestCSV(csv){
 if(typeof csv!=='string'||csv.length>64000)throw Error('Choose a CSV up to 64 KB.');
 const rows=parseCSVRows(csv.replace(/^\uFEFF/,'')),header=rows.shift();
 if(header?.join(',')!==RETEST_HEADERS.join(',')||!rows.length||rows.length>250)
  throw Error('Use the Task 4 CSV template with 1 to 250 rows.');
 const records={};
 for(const [index,values] of rows.entries()){
  const [name,classLabel,roll,subject,examDate]=values;
  if(values.length!==5||!name||name.length>120||!/^(X|XI|XII) [A-E]$/.test(classLabel)||
   !/^\d{1,10}$/.test(roll)||!subject||subject.length>80||!validDate(examDate))
   throw Error('Check the name, class, roll, subject and exam date on CSV row '+(index+2)+'.');
  const id=[classLabel,roll,subject,examDate].map(value=>value.toUpperCase().replace(/[^A-Z0-9-]+/g,'_')).join('-');
  if(Object.hasOwn(records,id))throw Error('Duplicate student and exam on CSV row '+(index+2)+'.');
  records[id]={name,classLabel,roll,subject,examDate};
 }
 return records;
}

export function retestUpdates(rows,changes){
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length)
  throw Error('Enter at least one retest update.');
 const next={...rows};
 for(const [id,fields] of Object.entries(changes)){
  if(!Object.hasOwn(rows,id)||!fields||typeof fields!=='object')throw Error('Reopen the tracker and choose a listed student.');
  const update={};
  for(const [key,label,type] of RETEST_FIELDS){
   if(!Object.hasOwn(fields,key))continue;
   if(typeof fields[key]!=='string')throw Error('Check '+label+'.');
   const value=fields[key].trim();
   if(value&&(Array.isArray(type)?!type.includes(value):type==='date'?!validDate(value):value.length>120))
    throw Error('Check '+label+'.');
   update[key]=value;
  }
  next[id]={...rows[id],...update};
 }
 return next;
}
