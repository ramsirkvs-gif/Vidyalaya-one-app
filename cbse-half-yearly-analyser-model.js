import {parseCSVRows} from './cbse-basic-import.js';
import {pb1ResultBand,paperDiscussionComment} from './cbse-pb1-analyser-model.js';

export const HALF_YEARLY_COLUMNS=['Section','RollNo','StudentName','Subject','PreviousMarks','PreviousMM','HalfYearlyMM','Teacher'];
export const HALF_YEARLY_CSV_LIMIT=256*1024;
const norm=value=>value.normalize('NFC').trim().replace(/\s+/g,' ').toUpperCase();

function result(value,maximum,exam){
 const absent=value==='AB',percentage=absent?null:value*100/maximum,band=pb1ResultBand(percentage);
 return {score:absent?null:value,maximum,percentage,absent,band,failed:band==='critical'||band==='red',borderline:band==='yellow',exam};
}

export function importHalfYearly(source,staff,identify){
 if(typeof source!=='string'||new TextEncoder().encode(source).length>HALF_YEARLY_CSV_LIMIT)throw Error('Choose a CSV up to 256 KB.');
 const rows=parseCSVRows(source.replace(/^\uFEFF/,'')),header=rows.shift();
 if(header?.join(',')!==HALF_YEARLY_COLUMNS.join(','))throw Error('Use the Class XI CSV template headers in the given order.');
 if(!rows.length||rows.length>2500)throw Error('Include 1 to 2,500 student-subject rows.');
 const papers={},roster={},teachers=Object.entries(staff).filter(([,person])=>person.status==='active');
 const maximum=value=>/^\d+(?:\.\d+)?$/.test(value)&&Number(value)>0&&Number(value)<=1000;
 for(const [index,values] of rows.entries()){
  const fail=message=>{throw Error('CSV row '+(index+2)+' · '+message);};
  if(values.length!==header.length)fail('Expected eight cells.');
  const [sectionValue,rollValue,name,subjectValue,scoreValue,previousMM,currentMM,teacher]=values;
  const section=norm(sectionValue),roll=norm(rollValue),subject=norm(subjectValue);
  if(!/^[A-Z]$/.test(section)||!roll||roll.length>30||!name||name.length>120||!subject||subject.length>100)
   fail('Enter a section letter, roll number, student name and subject.');
  if(!maximum(currentMM)||((scoreValue||previousMM)&&!maximum(previousMM)))
   fail('Enter a valid Half-Yearly maximum and include the previous maximum for any previous result.');
  const absent=/^ABS?$/i.test(scoreValue);
  if(scoreValue&&!absent&&(!/^\d+(?:\.\d+)?$/.test(scoreValue)||Number(scoreValue)>Number(previousMM)))
   fail('Previous marks must be within the previous maximum, AB, or blank.');
  const matched=teacher?teachers.filter(([id,person])=>id===teacher||norm(person.name)===norm(teacher)):[];
  const identities=new Set(matched.map(([id])=>identify('teacher',id)));
  if(teacher&&identities.size!==1)fail('Enter one active teacher’s exact portal name or staff ID, or leave Teacher blank.');
  const [teacherId,person]=matched[0]||[];
  const studentId=identify('student',section,roll),paperId=identify('paper',section,subject);
  if(roster[studentId]&&roster[studentId].name!==name)fail('This roll number has conflicting student names in the section.');
  roster[studentId]={key:studentId,classId:'XI',section,roll,name};
  const paper=papers[paperId]??={classId:'XI',sectionId:section,section,subjectId:paperId,subject,maximum:Number(currentMM),
   teacher:person?.name||'',teacherId:teacherId||'',students:{}};
  if(paper.maximum!==Number(currentMM)||paper.teacherId!==(teacherId||''))fail('Use the same Half-Yearly maximum and Teacher for every row of this paper.');
  if(Object.hasOwn(paper.students,studentId))fail('This student already has a row for this subject.');
  paper.students[studentId]={enrolled:true,...(scoreValue?{before:result(absent?'AB':Number(scoreValue),Number(previousMM),'Previous test')}:{})};
 }
 return {papers,roster};
}

export function halfYearlyReport(state,allowedIds){
 const scopes=[],rows=[],roster=new Map();
 for(const {students,teacherId,...paper} of Object.values(state?.papers||{})){
  if(allowedIds&&!allowedIds.has(teacherId))continue;
  const scope=scopes.length;
  scopes.push({...paper,teachers:teacherId?[{key:teacherId,name:paper.teacher}]:[]});
  for(const [key,marks] of Object.entries(students)){
   const student=state.roster[key];
   roster.set(key,student);
   rows.push({...student,scope,before:marks.before||null,current:marks.current||null});
  }
 }
 return {revision:state?.revision||0,scopes,rows,roster:[...roster.values()]};
}

export function updateHalfYearly(state,input,allowedIds,now){
 if(input.expectedRevision!==(state?.revision||0))throw Error('Class XI results changed. Reopen the analyser before saving.');
 const paper=Object.values(state?.papers||{}).find(p=>p.classId===input.classId&&p.sectionId===input.sectionId&&p.subjectId===input.subjectId);
 if(!paper||allowedIds&&!allowedIds.has(paper.teacherId))throw Error('This Class XI paper is outside your assigned teaching scope.');
 if(input.operation==='pb1-unfreeze'){
  if(allowedIds)throw Error('Principal access is required to unfreeze marks.');
  if(!paper.approvedAt)throw Error('This Half-Yearly paper is already open for marks entry.');
  delete paper.approvedAt;
  paper.unfrozenAt=now;
  return {...state,revision:state.revision+1};
 }
 if(paper.approvedAt)throw Error('This Half-Yearly paper is approved and frozen.');
 if(input.operation==='pb1-approve'){
  if(allowedIds||!Object.values(paper.students).every(row=>row.current))throw Error('Enter marks or AB for every enrolled student before approval.');
  paper.discussionComment=paperDiscussionComment(input.discussionComment);
  paper.approvedAt=now;
 }else{
  if(!Array.isArray(input.entries)||!input.entries.length||input.entries.length>200)throw Error('Enter at least one mark or AB.');
  const seen=new Set();
  for(const {key,mark} of input.entries){
   if(!Object.hasOwn(paper.students,key)||seen.has(key))throw Error('A marks entry has an invalid or duplicate student.');
   if(mark!=='AB'&&(!Number.isFinite(mark)||mark<0||mark>paper.maximum))throw Error('A mark is outside the Half-Yearly paper maximum.');
   seen.add(key);
   paper.students[key].current=result(mark,paper.maximum,'Half-Yearly');
  }
 }
 return {...state,revision:state.revision+1};
}
