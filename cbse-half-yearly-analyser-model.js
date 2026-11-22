import {parseCSVRows} from './cbse-basic-import.js';
import {rollNameKey,secondaryStaffEntry} from './cbse-roll-call-roster.js';
import {pb1ResultBand,paperDiscussionComment} from './cbse-pb1-analyser-model.js';

export const HALF_YEARLY_COLUMNS=['Section','RollNo','StudentName','Subject','PreviousMarks','PreviousMM','HalfYearlyMM','Teacher'];
export const CLASS_IX_EXAM={classId:'IX',name:'Pre-Annual Exam',column:'PreAnnualMM',baseline:'PT-2',previous:'Periodic Test 2 (PT-2)'};
export const CLASS_IX_SEATING=Object.entries({
 A:[[1,20],[21,40],[41,43]],B:[[1,20],[21,40],[41,48]],C:[[9301,9320],[9321,9340]],D:[[1,20],[21,38]],
}).flatMap(([section,ranges])=>ranges.map(([start,end],index)=>({key:section+[1,21,41][index],section,start,end})));
export const CLASS_IX_SEATING_FIELDS=[['area','Exam area / room','text'],['invigilator','Invigilator name','text'],
 ['from','From time','time'],['to','To time','time']];
export const CLASS_IX_PAPERS=[
 ['07/12/2026','Monday','Science','IX A/C · Vandana Umang | IX B/D · Jyoti Verma'],
 ['08/12/2026','Tuesday','Hindi','IX A · Suraj Dahal | IX B · Devendra Kumar Meena | IX C/D · Dipti Singh'],
 ['09/12/2026','Wednesday','Mathematics','IX A/C · Priyanka Mehta | IX B/D · Ranjan Chetry | IX D · Bikash Jyoti Das'],
 ['10/12/2026','Thursday','English','IX A · Abhishek Singh | IX B · M. T. Munya | IX C · Gocham Yagom | IX D · Sweta Kestwal'],
 ['11/12/2026','Friday','Social Science','IX A/D · Ajay Pratap Singh C. | IX B/C · Nitish Raj Sharma'],
];
const classIXSubjects=new Set(CLASS_IX_PAPERS.map(([, ,subject])=>subject.toUpperCase()));
export const CLASS_IX_EXAM_IC='Mrs. Jyoti Verma';
export const HALF_YEARLY_CSV_LIMIT=256*1024;
const norm=value=>value.normalize('NFC').trim().replace(/\s+/g,' ').toUpperCase();

function result(value,maximum,exam){
 const absent=value==='AB',percentage=absent?null:value*100/maximum,band=pb1ResultBand(percentage,maximum);
 return {score:absent?null:value,maximum,percentage,absent,band,failed:band==='critical'||band==='red',borderline:band==='yellow',exam};
}

export function importHalfYearly(source,staff,identify,exam){
 const classId=exam?.classId||'XI',examName=exam?.name||'Half-Yearly';
 const columns=HALF_YEARLY_COLUMNS.map(column=>column==='HalfYearlyMM'&&exam?exam.column:column);
 if(typeof source!=='string'||new TextEncoder().encode(source).length>HALF_YEARLY_CSV_LIMIT)throw Error('Choose a CSV up to 256 KB.');
 const rows=parseCSVRows(source.replace(/^\uFEFF/,'')),header=rows.shift();
 if(header?.join(',')!==columns.join(','))throw Error('Use the Class '+classId+' CSV template headers in the given order.');
 if(!rows.length||rows.length>2500)throw Error('Include 1 to 2,500 student-subject rows.');
 const papers={},roster={},excluded=[],seen=new Set(),teachers=Object.entries(staff).filter(([,person])=>person.status==='active');
 const maximum=value=>/^\d+(?:\.\d+)?$/.test(value)&&Number(value)>0&&Number(value)<=1000;
 for(const [index,values] of rows.entries()){
  const fail=message=>{throw Error('CSV row '+(index+2)+' · '+message);};
  if(values.length!==header.length)fail('Expected eight cells.');
  const [sectionValue,rollValue,name,subjectValue,scoreValue,previousMM,currentMM,teacher]=values;
  const section=norm(sectionValue),roll=norm(rollValue),subject=norm(subjectValue);
  if(!(exam?/^[A-D]$/:/^[A-Z]$/).test(section)||!roll||roll.length>30||!name||name.length>120||!subject||subject.length>100)
   fail('Enter a section letter, roll number, student name and subject.');
  if(exam&&!classIXSubjects.has(subject))fail('Use a subject on the Class IX Pre-Annual date sheet.');
  const studentId=identify('student',section,roll);
  if(roster[studentId]&&roster[studentId].name!==name)fail('This roll number has conflicting student names in the section.');
  roster[studentId]={key:studentId,classId,section,roll,name};
  const paperId=identify('paper',section,subject),rowKey=paperId+'|'+studentId;
  if(seen.has(rowKey))fail('This student already has a row for this subject.');
  seen.add(rowKey);
  if(/^[-–—]$/.test(scoreValue)){excluded.push({paperId,studentId});continue;}
  if(!maximum(currentMM)||(exam&&Number(currentMM)!==80)||((scoreValue||previousMM)&&!maximum(previousMM)))
   fail('Enter '+(exam?'80':'a valid '+examName+' maximum')+' and include the previous maximum for any previous result.');
  const absent=/^ABS?$/i.test(scoreValue);
  if(scoreValue&&!absent&&(!/^\d+(?:\.\d+)?$/.test(scoreValue)||Number(scoreValue)>Number(previousMM)))
   fail('Previous marks must be within the previous maximum, AB, or blank.');
  const teacherName=rollNameKey(teacher),rosterEntry=exam&&secondaryStaffEntry({name:teacher});
  const matched=teacher?teachers.filter(([id,person])=>id===teacher||norm(person.name)===norm(teacher)||
   teacherName&&rollNameKey(person.name)===teacherName||rosterEntry&&secondaryStaffEntry(person)?.serial===rosterEntry.serial):[];
  const identities=new Set(matched.map(([id])=>identify('teacher',id)));
  if(teacher&&identities.size!==1)fail('Enter one unambiguous active teacher’s name or staff ID, or leave Teacher blank.');
  const [teacherId,person]=matched[0]||[];
  const paper=papers[paperId]??={classId,sectionId:section,section,subjectId:paperId,subject,maximum:Number(currentMM),
   teacher:person?.name||'',teacherId:teacherId||'',students:{}};
  if(paper.maximum!==Number(currentMM)||paper.teacherId!==(teacherId||''))fail('Use the same '+examName+' maximum and Teacher for every row of this paper.');
  paper.students[studentId]={enrolled:true,...(scoreValue?{before:result(absent?'AB':Number(scoreValue),Number(previousMM),exam?.previous||'Periodic Test 1 (PT-1)')}:{})};
 }
 return {papers,roster,excluded};
}

function savedResult(mark){
 return mark?{...mark,...result(mark.absent?'AB':mark.score,mark.maximum,mark.exam)}:null;
}

export function halfYearlyReport(state,allowedIds,checkers=()=>[]){
 const scopes=[],rows=[],roster=new Map(allowedIds?[]:Object.entries(state?.roster||{}));
 for(const {students,teacherId,...paper} of Object.values(state?.papers||{})){
  if(allowedIds&&![teacherId,...checkers(paper)].some(id=>allowedIds.has(id)))continue;
  const scope=scopes.length;
  scopes.push({...paper,additional:/^(AI|ARTIFICIAL INTELLIGENCE)(?:\s*\([^)]*\))?$|\bADDITIONAL\b/i.test(paper.subject),teachers:teacherId?[{key:teacherId,name:paper.teacher}]:[]});
  for(const [key,marks] of Object.entries(students||{})){
   const student=state.roster[key];
   roster.set(key,student);
   rows.push({...student,scope,before:savedResult(marks.before),current:savedResult(marks.current),
    ...(paper.classId==='IX'?{weeklyActions:marks.weeklyActions||{}}:{})});
  }
 }
 return {revision:state?.revision||0,scopes,rows,roster:[...roster.values()],...(!allowedIds?{transfers:Object.values(state?.transfers||{})}:{})};
}

export function updateHalfYearly(state,input,allowedIds,now,checkers=()=>[],exam){
 const classId=exam?.classId||'XI',examName=exam?.name||'Half-Yearly';
 if(input.expectedRevision!==(state?.revision||0))throw Error('Class '+classId+' results changed. Reopen the analyser before saving.');
 if(input.operation==='half-yearly-transfer'){
  if(allowedIds)throw Error('Principal access is required to transfer a subject.');
  const {studentKey,fromSubjectId,toSubjectId}=input;
  const student=Object.hasOwn(state?.roster||{},studentKey)?state.roster[studentKey]:null;
  const papers=state?.papers||{};
  const from=Object.hasOwn(papers,fromSubjectId)?papers[fromSubjectId]:null;
  const to=Object.hasOwn(papers,toSubjectId)?papers[toSubjectId]:null;
  if(!student||!from||!to||from===to||[from,to].some(paper=>paper.section!==student.section||paper.classId!==student.classId))
   throw Error('Choose two different subjects in the student’s section.');
  if(!Object.hasOwn(from.students||{},studentKey)||Object.hasOwn(to.students||{},studentKey))
   throw Error('The student’s enrollment changed. Reopen the analyser and check the subjects.');
  if(from.approvedAt||to.approvedAt)throw Error('Unfreeze the frozen paper before changing its enrollment.');
  const archived=from.students[studentKey],revision=state.revision+1;
  const transfers={...state.transfers,['transfer_'+revision]:{studentKey,from:from.subject,to:to.subject,at:now,
   ...(archived.before?{before:archived.before}:{}),...(archived.current?{current:archived.current}:{})}};
  delete from.students[studentKey];
  (to.students??={})[studentKey]={enrolled:true};
  return {...state,transfers,revision};
 }
 const paper=Object.values(state?.papers||{}).find(p=>p.classId===input.classId&&p.sectionId===input.sectionId&&p.subjectId===input.subjectId);
 if(!paper||allowedIds&&![paper.teacherId,...checkers(paper)].some(id=>allowedIds.has(id)))throw Error('This Class '+classId+' paper is outside your assigned teaching scope.');
 if(exam&&input.operation==='class-ix-remedial-save'){
  const row=Object.hasOwn(paper.students,input.studentKey)?paper.students[input.studentKey]:null;
  if(!row||!['critical','red','yellow'].includes(savedResult(row.current||row.before)?.band))throw Error('This student is outside the remedial list.');
  const comment=typeof input.comment==='string'?input.comment.trim():'';
  if(!comment||comment.length>1000)throw Error('Enter a weekly action comment of up to 1,000 characters.');
  const day=new Date(now+19800000);
  day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);
  (row.weeklyActions??={})[day.toISOString().slice(0,10)]={comment,at:now};
  return {...state,revision:state.revision+1};
 }
 if(input.operation==='pb1-unfreeze'){
  if(allowedIds)throw Error('Principal access is required to unfreeze marks.');
  if(!paper.approvedAt)throw Error('This '+examName+' paper is already open for marks entry.');
  delete paper.approvedAt;
  paper.unfrozenAt=now;
  return {...state,revision:state.revision+1};
 }
 if(paper.approvedAt)throw Error('This '+examName+' paper is approved and frozen.');
 if(input.operation==='pb1-approve'){
  if(allowedIds||!Object.values(paper.students).every(row=>row.current))throw Error('Enter marks or AB for every enrolled student before approval.');
  paper.discussionComment=paperDiscussionComment(input.discussionComment);
  paper.approvedAt=now;
 }else{
  if(!Array.isArray(input.entries)||!input.entries.length||input.entries.length>200)throw Error('Enter at least one mark or AB.');
  const seen=new Set();
  for(const {key,mark} of input.entries){
   if(!Object.hasOwn(paper.students,key)||seen.has(key))throw Error('A marks entry has an invalid or duplicate student.');
   if(mark!=='AB'&&(!Number.isFinite(mark)||mark<0||mark>paper.maximum))throw Error('A mark is outside the '+examName+' paper maximum.');
   seen.add(key);
   paper.students[key].current=result(mark,paper.maximum,examName);
  }
 }
 return {...state,revision:state.revision+1};
}
