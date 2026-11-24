import {el,options} from './cbse-ui.js';
import {pb1ClassAnalysis} from './cbse-pb1-class-analysis.js';
import {pb1Metrics,pb1CategoryCounts,pb1SmartSummary,pb1SmartStudents,PAPER_COMMENT_LIMIT} from './cbse-pb1-analyser-model.js';
const pct=v=>v==null?'—':v.toFixed(1)+'%';
const delta=(before,after)=>before==null||after==null?'—':(after-before>0?'+':'')+(after-before).toFixed(1)+' pp';
function trend(before,after){
 const change=before==null||after==null?null:Number((after-before).toFixed(1));
 if(change==null)return null;
 return {style:change>0?'pass':change<0?'decline':'result',
  label:change>0?'↑ Increased':change<0?'↓ Decreased':'→ No change'};
}
function trendLabel(direction){
 return el('span',direction.label,'pb1-trend pb1-trend-'+direction.style);
}
const result=mark=>!mark?'Not entered':mark.absent?'AB (MM '+mark.maximum+')':mark.score+'/'+mark.maximum+' ('+pct(mark.percentage)+')';
const choices=(items,label)=>[['',label],...items.map(value=>[value,value])];
const originalRemedialInstructions=[
 '1. Carefully study the attached assessment report.',
 '2. Review the attached list of students who did not meet the pass standard and the details provided for each student.',
 '3. Give targeted remedial support the highest priority. Document the actions taken and each student’s progress, focusing on measurable improvement and quality results under Mission Perfect 100.',
].join('\n');
export const defaultRemedialInstructions=originalRemedialInstructions+
 '\n4. Conduct retests on time and update the results in Samagam within the timelines prescribed by KVS. Ensure no retest remains overdue in Samagam.';
const gradingNote='Papers out of 70 pass at 23 marks. Other papers pass at 33%. Critical fail is 25% or below. Borderline pass runs from the pass mark through 40%.';
const failBreakdown=(total,critical)=>total+' ('+critical+' critical + '+(total-critical)+' other fail)';
const compareRoll=(a,b)=>String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true})||a.name.localeCompare(b.name);

function maximumLabel(values){
 const maxima=[...new Set(values.filter(value=>Number.isFinite(value)&&value>0))].sort((a,b)=>a-b);
 return !maxima.length?'MM unavailable':maxima.length===1?'MM '+maxima[0]:'MM varies: '+maxima.join(' / ');
}

function table(parent,headers,rows){
 if(!rows.length){parent.append(el('p','No records match these filters.'));return;}
 const scroll=el('div',undefined,'task-scroll pb1-table-wrap'),table=el('table',undefined,'pb1-table');
 scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Analysis table');
 const head=table.createTHead().insertRow(),body=table.createTBody();
 table.setAttribute('role','table');head.setAttribute('role','row');body.setAttribute('role','rowgroup');
 for(const title of headers){const th=el('th',title);th.scope='col';th.setAttribute('role','columnheader');head.append(th);}
 for(const values of rows){
  const row=body.insertRow();row.setAttribute('role','row');
  values.forEach((value,index)=>{
   const cell=row.insertCell();cell.setAttribute('role','cell');cell.dataset.columnLabel=headers[index];
   cell.append(value instanceof Node?value:document.createTextNode(String(value??'')));
  });
 }
 scroll.append(table);parent.append(scroll);
}
function mathsOption(scope){
 if(scope.classId!=='X')return '';
 const name=(scope.paperName||scope.subject).trim();
 if(/^(?:mathematics|maths)\s+basic$/i.test(name))return 'Basic';
 if(/^(?:mathematics|maths)\s+standard$/i.test(name))return 'Standard';
 return '';
}
const subjectGroup=scope=>mathsOption(scope)?'Mathematics':scope.subject;
const mathsSection=(a,b)=>!!mathsOption(a)&&!!mathsOption(b)&&a.section===b.section;

function paperSlip(scope,data,exam,canPrint){
 const papers=data.scopes.filter(other=>other===scope||mathsSection(scope,other));
 const rows=data.rows.filter(row=>papers.includes(data.scopes[row.scope])).sort(compareRoll);
 if(papers.length===1)return marksSlip(scope,rows,exam,data,canPrint);
 const teachers=[...new Map(papers.flatMap(scopeTeachers).map(person=>[person.key,person])).values()];
 const notes=[...new Set(papers.map(paper=>paper.discussionComment).filter(Boolean))];
 const approval=papers.every(paper=>paper.approvedAt)?Math.max(...papers.map(paper=>paper.approvedAt)):0;
 marksSlip({...scope,subject:'Mathematics',approvedAt:approval,teachers,
  teacher:teachers.map(person=>person.name).join(' / '),discussionComment:notes.join('\n\n')},rows,exam,data,canPrint);
}

function marksSlip(scope,rows,exam,data,canPrint){
 const dialog=el('dialog',undefined,'task-start-dialog pb1-marks-slip'),article=el('article');
 const heading=el('header'),title=el('h2',exam.short+' Marks Slip');
 title.id='paper-slip-title';dialog.setAttribute('aria-labelledby',title.id);
 heading.append(el('p','PM SHRI Kendriya Vidyalaya No. 1 Itanagar'),title,
  el('p','Class '+scope.classId+' '+scope.section+' · '+scope.subject+' · Maximum marks '+scope.maximum),
  el('p',canPrint?'Final marks discussion with the Principal':'View-only preview'),
  el('p',scope.approvedAt?'Approved and frozen · '+new Date(scope.approvedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):
   'Discussion copy · approval pending'));
 if(scope.teacher)heading.append(el('p','Assigned teacher(s) · '+scope.teacher));
 article.append(heading);
 const maths=rows.some(row=>mathsOption(data.scopes[row.scope]));
 const showRoll=rows.some(row=>row.roll!=null&&row.roll!=='');
 const columns=[...(showRoll?['Roll']:[]),'Student',exam.short+' marks',...(maths?['Remark']:[])];
 const marks=rows.map(({roll,name,current,scope:index})=>[...(showRoll?[roll]:[]),name,current?.absent?'AB':current?.score??'Pending',
  ...(maths?[mathsOption(data.scopes[index])]:[])]);

 table(article,columns,marks);
 const stats=pb1SmartSummary(rows),summary=el('section',undefined,'pb1-slip-summary'),figures=el('dl');
 const rate=(value,total)=>total?100*value/total:null;
 const before=rate(stats.previousPassed,stats.paired),after=rate(stats.pairedPassed,stats.paired);
 for(const [label,value] of [
  ['Enrolled',stats.students],['Appeared',stats.assessed+' / '+stats.students],
  ['Pass rate · appeared',pct(rate(stats.passed,stats.assessed))],['Pass rate · enrolled',pct(rate(stats.enrolledPassed,stats.students))],
  ['Passed',stats.passed],['Total fail',failBreakdown(stats.failed,stats.critical)],['Borderline pass',stats.borderline],
  ['Scored 90%+',stats.score90],['Scored 75%+',stats.score75],['Scored 50%+',stats.score50],
  ['Absent · retest awaited',stats.absent],['Marks pending',stats.pending],['Incomplete coverage',stats.incomplete],
  [exam.baseline+' → '+exam.short+' pass rate',pct(before)+' → '+pct(after)],['Change · '+stats.paired+(stats.paired===1?' paired student':' paired students'),delta(before,after)],
 ]){
  const figure=el('div');figure.append(el('dt',label),el('dd',String(value)));figures.append(figure);
 }
 summary.append(el('h3',exam.short+' results · at a glance'),figures);
 const performance=el('section',undefined,'pb1-slip-performance');
 performance.append(el('h3',exam.short+' teacher performance · at a glance'));
 const performanceRows=[];
 for(const teacher of scopeTeachers(scope).filter(person=>!data.teacherIds||data.teacherIds.includes(person.key))){
  const assigned=new Set(data.scopes.flatMap((paper,index)=>paper.classId===scope.classId&&
   subjectGroup(paper)===subjectGroup(scope)&&scopeTeachers(paper).some(person=>person.key===teacher.key)?[index]:[]));
  const papers=data.rows.filter(row=>assigned.has(row.scope));
  const bySection=groups(papers,row=>data.scopes[row.scope].section);
  for(const [section,group] of [...bySection].sort(([a],[b])=>a.localeCompare(b))){
   performanceRows.push(teacherPerformanceRow(teacher.name,section,group));
  }
  if(bySection.size)performanceRows.push(teacherPerformanceRow(teacher.name,'All assigned sections',papers));
 }
 if(performanceRows.length)table(performance,['Subject teacher','Section','Appeared / enrolled','Passed','Pass rate',exam.baseline+' → '+exam.short+' (paired)'],performanceRows);
 else performance.append(el('p','No subject teacher assignment is recorded for this paper.'));
 const feedback=el('section',undefined,'pb1-slip-feedback');
 const instructions=el('p',scope.discussionComment||'',scope.discussionComment?'pb1-discussion-comment':'pb1-slip-comment-lines');
 feedback.append(el('h3','Principal’s instructions for remedial action'),instructions);
 article.append(summary,performance,feedback);
 const signatures=el('div',undefined,'pb1-slip-signatures');
 const checker=el('div','Cross-checker');
 checker.append(el('small','Totalling and unchecked questions'));
 signatures.append(el('div','Subject teacher'),checker,el('div','Class teacher'),el('div','Principal'));
 const note=el('p',undefined,'pb1-slip-verification');
 note.append(el('strong','Exam IC / Samagam Matching IC'),document.createTextNode(' — During Samagam entry, carefully verify each student’s marks against the teacher’s list on this slip.'));
 const matchingSignature=el('div',undefined,'pb1-slip-matching-signature');
 matchingSignature.append(note,el('div',scope.classId==='X'?'Samagam Matching IC · Class X Exam Core Team':'Samagam Matching IC'));
 article.append(signatures,matchingSignature);
 const actions=el('div',undefined,'task-actions pb1-slip-actions');
 const close=el('button','Close');
 close.type='button';close.onclick=()=>dialog.close();
 actions.append(close);dialog.append(actions,article);
 if(!canPrint){
  const request=el('button','Request a printed copy');
  request.type='button';request.onclick=()=>window.alert('Please contact the Principal for a printed copy or PDF.');
  actions.prepend(request);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();return;
 }
 const print=el('button','Print / Save as PDF');
 print.type='button';print.onclick=()=>window.print();actions.prepend(print);
 const printSlip=article.cloneNode(true);printSlip.classList.add('pb1-print-slip');
 printSlip.querySelector('[id]')?.removeAttribute('id');
 const field=el('textarea'),hint=el('small','These instructions apply to this printed copy.');
 field.setAttribute('aria-label','Principal’s instructions for remedial action');
 const savedInstructions=scope.discussionComment?.trim()||'';
 const additionalInstructions=savedInstructions.startsWith(originalRemedialInstructions)?
  savedInstructions.slice(originalRemedialInstructions.length).trim():savedInstructions;
 field.maxLength=PAPER_COMMENT_LIMIT+defaultRemedialInstructions.length+2;
 field.rows=7;
 field.value=savedInstructions.startsWith(defaultRemedialInstructions)?savedInstructions:
  [defaultRemedialInstructions,additionalInstructions].filter(Boolean).join('\n\n');
 instructions.replaceWith(field,hint);
 const printed=printSlip.querySelector('.pb1-slip-feedback p');
 field.oninput=()=>{
  printed.textContent=field.value.trim();
  printed.className=printed.textContent?'pb1-discussion-comment':'pb1-slip-comment-lines';
 };
 field.oninput();
 if(marks.length>30&&marks.length<=72){
  const split=el('div',undefined,'pb1-print-marks-columns'),mid=Math.ceil(marks.length/2);
  table(split,columns,marks.slice(0,mid));
  table(split,columns,marks.slice(mid));
  printSlip.querySelector(':scope > .pb1-table-wrap').replaceWith(split);
 }
 dialog.addEventListener('close',()=>{dialog.remove();printSlip.remove();},{once:true});
 document.body.append(dialog,printSlip);dialog.showModal();
}

function teacherPerformanceRow(name,section,rows){
 const result=pb1CategoryCounts(rows,'current'),paired=pb1Metrics(rows);
 return [name,section,result.appeared+' / '+result.enrolled,result.passed,pct(result.passPercentage),
  paired.paired?pct(paired.beforePass)+' → '+pct(paired.currentPass)+' ('+paired.paired+')':'—'];
}

function control(parent,label,tag='select'){
 const wrap=el('label',label),input=el(tag);input.setAttribute('aria-label',label);wrap.append(input);parent.append(wrap);return input;
}
function groups(rows,key){
 const grouped=new Map();for(const row of rows){const id=key(row);if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(row);}return grouped;
}
const scopeTeachers=scope=>scope.teacherAssignmentPending?
 [{key:'pending:'+scope.teacher,name:scope.teacher+' (PIN assignment pending)'}]:
 scope.teachers||(scope.teacher?[{key:scope.teacher,name:scope.teacher}]:[]);
function teacherOptions(scopes){
 const teachers=new Map(scopes.flatMap(scopeTeachers).map(({key,name})=>[key,name]));
 return [['','All teachers'],...[...teachers].sort((a,b)=>a[1].localeCompare(b[1]))];
}
export const PB1_ANALYSER={title:'Pre-Samagam Wisdom Analyser · Classes X & XII PB-1',short:'PB-1',current:'Preboard 1',previous:'Latest monthly test',baseline:'Monthly',classes:'Classes X and XII',mission:true};
export const HALF_YEARLY_ANALYSER={title:'Pre-Samagam Wisdom Analyser · Class XI A–E Half-Yearly',short:'Half-Yearly',current:'Half-Yearly',previous:'Periodic Test 1 (PT-1)',baseline:'PT-1',classes:'Class XI A–E',classId:'XI'};

const cohortHeaders=exam=>['Group','Paired / enrolled','Previous pass',exam.short+' pass','Pass change','Previous average',exam.short+' average','Average change','Remark'];
function cohortRow(label,rows){
 const m=pb1Metrics(rows),direction=trend(m.beforePass,m.currentPass);
 return [label,m.paired+' / '+m.total,pct(m.beforePass),pct(m.currentPass),delta(m.beforePass,m.currentPass),
  pct(m.beforeAverage),pct(m.currentAverage),delta(m.beforeAverage,m.currentAverage),
  direction?trendLabel(direction):'Awaiting comparable results'];
}
function studentListButton(label,title,open){
 const action=el('button',label,'pb1-list-button');action.type='button';
 action.setAttribute('aria-label',label+' · '+title);action.onclick=open;
 return action;
}
function renderCategoryComparison(parent,previous,current,showList,exam){
 parent.append(el('p',gradingNote));
 const rows=[
  ['Critical fail',previous.critical,current.critical,'critical',mark=>mark?.band==='critical'],
  ['Other fail',previous.red,current.red,'red',mark=>mark?.band==='red'],
  ['Total fail',failBreakdown(previous.failed,previous.critical),failBreakdown(current.failed,current.critical),'red',mark=>mark?.failed],
  ['Borderline',previous.yellow,current.yellow,'yellow',mark=>mark?.borderline],
  ['Pass above borderline (over 40%, below 75%)',previous.pass,current.pass,'green',mark=>mark?.band==='pass'],
  ['Secure pass',previous.green,current.green,'green',mark=>mark?.band==='green'],
  ['Total pass',previous.passed,current.passed,'green',mark=>mark?.percentage!=null&&!mark.failed],
  ['Pass percentage · appeared',pct(previous.passPercentage),pct(current.passPercentage),'green'],
  ['Pass percentage · enrolled',pct(previous.enrolledPassPercentage),pct(current.enrolledPassPercentage),'green'],
  ['Absent (AB)',previous.absent,current.absent,'grey',mark=>mark?.absent],
  ['Not recorded',previous.missing,current.missing,'grey',mark=>!mark],
  ['Appeared',previous.appeared,current.appeared,'',mark=>mark?.percentage!=null],
  ['Total enrolled',previous.enrolled,current.enrolled,''],
  ['Average percentage',pct(previous.average),pct(current.average),''],
 ];
 const countCell=(value,period,label,filter)=>{
  if(!filter||!parseInt(value,10))return value;
  const cell=el('div',undefined,'pb1-count-with-link');
  const source=period==='before'?exam.baseline:exam.short;
  const title=label+' · '+source;
  cell.append(el('strong',String(value)),studentListButton('View '+source+' students',title,()=>showList(title,period,filter)));
  return cell;
 };
 table(parent,['Category',exam.current,exam.previous],rows.map(([label,a,b,band,filter])=>[
  el('span',label,band?'band '+band:undefined),countCell(b,'current',label,filter),countCell(a,'before',label,filter),
 ]));
 parent.append(el('p','Counts are by student and subject. Total fail includes critical fails. The enrolled pass percentage includes AB and pending entries in the denominator. Pending entries remain provisional.'));
}
function renderSmartAnalysis(parent,rows,showList,exam){
 const stats=pb1SmartSummary(rows);
 const rate=(count,total)=>total?100*count/total:null;
 const previous=rate(stats.previousPassed,stats.paired),current=rate(stats.pairedPassed,stats.paired);
 const direction=trend(previous,current),passRateLabel=exam.baseline+' → '+exam.short+' pass rate';
 const outOf=count=>count+' / '+stats.assessed;
 const strip=el('div',undefined,'pb1-stats pb1-smart-strip');
 const items=[
  ['Total enrolled',String(stats.students),'result',()=>true],
  ['Appeared',stats.assessed+' / '+stats.students,'result',student=>student.current.length],
  ['Pass percentage · appeared',pct(rate(stats.passed,stats.assessed)),'pass'],
  ['Pass percentage · enrolled',pct(rate(stats.enrolledPassed,stats.students)),'result'],
  ['Students passed',outOf(stats.passed),'pass',student=>student.current.length&&!student.failed],
  ['Total fail',failBreakdown(stats.failed,stats.critical),'decline',student=>student.failed,row=>row.current?.failed],
  ['Borderline pass',outOf(stats.borderline),'border',student=>student.borderline,row=>row.current?.borderline],
  ['Scored 90%+',outOf(stats.score90),'pass',student=>student.percentage>=90],
  ['Scored 75%+',outOf(stats.score75),'pass',student=>student.percentage>=75],
  ['Scored 50%+',outOf(stats.score50),'result',student=>student.percentage>=50],
  [passRateLabel,pct(previous)+' → '+pct(current),direction?.style||'result'],
  ['Change vs '+exam.baseline.toLowerCase(),delta(previous,current),direction?.style||'result'],
  ['Absent · Retest awaited',stats.absent+' / '+stats.students,'border',student=>student.absent],
  ['Marks entry pending',stats.pending+' / '+stats.students,'border',student=>student.pending],
  ['Incomplete coverage',stats.incomplete+' / '+stats.students,'border',student=>student.incomplete],
 ];
 for(const [label,value,style,filter,paperFilter] of items){
  const tile=el('div',undefined,'pb1-stat-'+style);tile.append(el('span',label),el('strong',value));
  if(label===passRateLabel&&direction)tile.append(trendLabel(direction));
  if(filter&&parseInt(value,10)>0)tile.append(studentListButton('View students',label+' · '+exam.short,()=>showList(label+' · '+exam.short,filter,paperFilter)));
  strip.append(tile);
 }
 parent.append(el('h3',exam.short+' results · at a glance'),strip,
  el('p','Counts are by student. The appeared result uses the '+exam.short+' papers each student appeared for. The enrolled result counts a student as passed only after every selected enrolled paper has an appeared pass. AB counts as a non-pass there. Blank marks are pending, so the enrolled result is provisional until entry is complete. Retest awaited and pending can overlap across subjects.'),
  el('p','Score bands overlap and use each student’s average paper percentage. The previous-test comparison uses matching appeared papers for '+stats.paired+' students.'));
}
function renderMarksGraph(parent,grouped,exam){
 const graph=el('div',undefined,'pb1-marks-graph');
 for(const [label,rows] of grouped){
  const article=el('section');article.append(el('h4',label));
  const paired=rows.filter(row=>row.before?.percentage!=null&&row.current?.percentage!=null);
  for(const [key,title] of [['before',exam.previous],['current',exam.current]]){
   const scores=(paired.length?paired:rows).flatMap(row=>row[key]?.percentage==null?[]:[row[key].percentage]);
   const mean=scores.length?scores.reduce((sum,value)=>sum+value,0)/scores.length:null;
   const line=el('div',undefined,'pb1-graph-line');
   line.append(el('span',title),el('strong',mean==null?'No appeared marks':pct(mean)+' · '+scores.length+(scores.length===1?' result':' results')));
   if(mean!=null){
    const bar=el('progress');bar.max=100;bar.value=mean;bar.setAttribute('aria-hidden','true');
    line.append(bar);
   }
   article.append(line);
  }
  graph.append(article);
 }
 if(graph.childElementCount)parent.append(graph);else parent.append(el('p','No records match these filters.'));
}

export function renderPB1Analyser(host,data,{run,button,save,approve,unfreeze,back,teacher,publicView,entryOnly,openEntry,openNames,refresh,exam=PB1_ANALYSER,setup,requestedPaper,backLabel,openPrincipalReview,hqVerification,downloadHQVerification}){
 const card=el('section',undefined,'task-card pb1-analyser'),toolbar=el('div',undefined,'task-actions'),content=el('div');
 const filters=el('div',undefined,'pb1-filters'),report=el('div');
 let entering=entryOnly,entryAction,classMode=false;
 const subjectOnly=exam.classId==='IX';

 const description=el('p',teacher?'Your assigned '+exam.current+' papers':publicView?exam.classes+' · Public student labels are coded':exam.classes+' · '+exam.current);
 card.append(el('h2',entryOnly?(approve?'Review and freeze ':'Update ')+exam.short+' marks':exam.title),description);
 if(setup)card.append(setup(()=>data.revision));
 card.append(content);
 host.replaceChildren(button(backLabel||(entryOnly?'Back to Wisdom Analyser':'Back to task list'),back),card);
 const classSelect=exam.classId?null:control(filters,'Standard'),subjectSelect=control(filters,'Subject'),teacherSelect=control(filters,'Teacher'),sectionSelect=control(filters,'Class / section');
 const filterClass=()=>exam.classId||classSelect.value;
 const classOptions=()=>[...data.scopes,...(data.roster||[])];
 const values=(scopes,key)=>[...new Set(scopes.map(info=>info[key]).filter(Boolean))].sort();
 if(classSelect)options(classSelect,choices(values(classOptions(),'classId'),'All standards'),'');
 const runAnalysis=button('Get smart analysis',async()=>{
  if(content.querySelector('[data-portal-dirty=true]')&&!confirm('Discard unsaved marks?'))return;
  if(refresh){
   data=await refresh(!publicView);
   if(classSelect)options(classSelect,choices(values(classOptions(),'classId'),'All standards'),classSelect.value);
   restrict();
  }
  if(entering){entering=false;drawMode();}
  classMode=false;filters.hidden=false;
  drawReport();report.scrollIntoView({block:'start'});
 });
 runAnalysis.classList.add('pb1-primary-action');
 toolbar.append(runAnalysis);
 if(!entryOnly)toolbar.append(button('Class Teacher Analysis',async()=>{
  if(content.querySelector('[data-portal-dirty=true]')&&!confirm('Discard unsaved marks?'))return;
  if(refresh)data=await refresh(!publicView);
  if(entering){entering=false;drawMode();}
  classMode=true;filters.hidden=true;hasReport=true;
  drawClassAnalysis();report.scrollIntoView({block:'start'});
 }));
 if(openPrincipalReview)toolbar.append(button('Principal review / freeze / print',()=>{
  const papers=data.scopes.filter(scopeMatches);
  return openPrincipalReview(papers.length===1?papers[0]:undefined);
 }));
 if(openEntry)toolbar.append(button('Update '+exam.short+' marks',()=>openEntry()));
 else if(save&&!entryOnly){
  entryAction=button('Update '+exam.short+' marks',()=>{entering=true;drawMode();});
  toolbar.append(entryAction);
 }
 function restrict(){
  const scopes=data.scopes.filter(info=>!filterClass()||info.classId===filterClass());
  options(subjectSelect,choices([...new Set(scopes.map(subjectGroup))].sort(),'All subjects'),subjectSelect.value);
  const subjects=scopes.filter(info=>!subjectSelect.value||subjectGroup(info)===subjectSelect.value);
  options(teacherSelect,teacherOptions(subjects),teacherSelect.value);
  const assigned=subjects.filter(info=>!teacherSelect.value||scopeTeachers(info).some(person=>person.key===teacherSelect.value));
  const rosterSections=!subjectSelect.value&&!teacherSelect.value?(data.roster||[]).filter(row=>!filterClass()||row.classId===filterClass()):[];
  options(sectionSelect,choices(values([...assigned,...rosterSections],'section'),'All sections'),sectionSelect.value);
 }
 restrict();
 const changeFilters=()=>{restrict();drawReport();};
 subjectSelect.onchange=teacherSelect.onchange=changeFilters;
 if(classSelect)classSelect.onchange=changeFilters;
 sectionSelect.onchange=()=>{drawReport();};
 function scopeMatches(info){
  const assigned=paper=>scopeTeachers(paper).some(person=>person.key===teacherSelect.value);
  const matchesTeacher=!teacherSelect.value||assigned(info)||
   subjectSelect.value==='Mathematics'&&data.scopes.some(paper=>mathsSection(info,paper)&&assigned(paper));
  return (!filterClass()||info.classId===filterClass())&&(!sectionSelect.value||info.section===sectionSelect.value)&&
   (!subjectSelect.value||subjectGroup(info)===subjectSelect.value)&&matchesTeacher;
 }
 const info=row=>data.scopes[row.scope];
 const sectionLabel=row=>info(row).classId+' '+info(row).section;
 function marksList(parent,rows,period='current'){
  const list=el('ul',undefined,'pb1-compact-marks');
  for(const group of groups(rows,row=>row.key).values()){
   const student=group[0],item=el('li');
   item.append(el('strong',student.name),el('small',sectionLabel(student)));
   for(const row of group){
    const paper=el('div',undefined,'pb1-compact-paper');
    paper.append(el('span',info(row).subject),el('strong',result(row[period])));item.append(paper);
   }
   list.append(item);
  }
  parent.append(list);
 }
 function showMarks(rows,{title='Entered '+exam.short+' marks',period='current'}={}){
  const dialog=el('dialog',undefined,'task-start-dialog pb1-student-dialog'),heading=el('h2',title),results=el('div');
  heading.id='pb1-entered-marks-title';dialog.setAttribute('aria-labelledby',heading.id);
  const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();
  dialog.append(heading,close);
  const search=control(dialog,'Search students','input');search.type='search';
  const update=()=>{
   const query=search.value.trim().toLowerCase(),matching=rows.filter(row=>[row.name,sectionLabel(row),info(row).subject].join(' ').toLowerCase().includes(query));
   results.replaceChildren();
   if(matching.length)marksList(results,matching,period);
   else results.append(el('p','No entered marks match this search.'));
  };
  search.oninput=update;update();dialog.append(results);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
 }
 let hasReport=false;
 if(openNames){
  const names=button('Show student names',async()=>{
   const named=await openNames();
   if(!named)return;
   data=named;publicView=false;names.hidden=true;
   description.textContent=exam.classes+' · Staff viewing';
   restrict();
   if(hasReport){
    if(classMode)drawClassAnalysis();
    else drawReport();
   }
  });
  toolbar.append(names);
 }
 function showCohorts(parent,title,grouped){
  parent.append(el('h3',title));
  table(parent,cohortHeaders(exam),[...grouped].map(([label,group])=>cohortRow(label,group)));
 }
 function teacherGroups(rows){
  const byTeacher=groups(rows.flatMap(row=>{
   const teachers=scopeTeachers(info(row)).filter(person=>!teacherSelect.value||person.key===teacherSelect.value);
   return (teachers.length?teachers:[{key:'',name:'Unassigned'}]).map(person=>({row,person}));
  }),({person,row})=>JSON.stringify([person.key,info(row).classId,info(row).subject]));
  return [...byTeacher.values()].map(group=>{
   const {person,row}=group[0];
   return [person.name+' · '+info(row).classId+' · '+subjectGroup(info(row)),group.map(item=>item.row)];
  });
 }
 function showBaselineResults(parent,title,grouped){
  parent.append(el('h3',title));
  table(parent,['Group',exam.baseline+' appeared / enrolled',exam.baseline+' pass rate',exam.baseline+' average',exam.short+' marks'],[...grouped].map(([label,rows])=>{
   const before=rows.filter(row=>row.before?.percentage!=null);
   const recorded=rows.filter(row=>row.current).length,pending=rows.length-recorded;
   return [label,before.length+' / '+rows.length,
    pct(before.length?before.filter(row=>!row.before.failed).length*100/before.length:null),
    pct(before.length?before.reduce((sum,row)=>sum+row.before.percentage,0)/before.length:null),
    pending?pending+' pending'+(recorded?' · '+recorded+' recorded':''):'All recorded'];
  }));
 }
 function showSubjectResults(parent,title,grouped){
  const examColumns=label=>['appeared','passed','failed','pass %'].map(column=>label+' '+column);
  const counts=(rows,period,examLabel,groupLabel)=>{
   const appeared=rows.filter(row=>row[period]?.percentage!=null);
   const passed=appeared.filter(row=>!row[period].failed),failed=appeared.filter(row=>row[period].failed);
   const resultCount=(label,students)=>{
    if(!students.length)return 0;
    const title=examLabel+' '+label+' · '+groupLabel;
    const count=String(students.length);
    const action=studentListButton(count,title,()=>showMarks(students,{title,period}));
    action.replaceChildren(el('strong',count),el('span','Click to see list'));
    action.classList.add('pb1-subject-count-button');
    return action;
   };
   return [appeared.length,resultCount('Passed',passed),resultCount('Failed',failed),
    pct(appeared.length?passed.length*100/appeared.length:null)];
  };
  parent.append(el('h3',title));
  table(parent,['Subject / group','Enrolled',...examColumns(exam.baseline),...examColumns(exam.short),exam.short+' marks pending'],
   [...grouped].map(([label,rows])=>[label,rows.length,...counts(rows,'before',exam.baseline,label),
    ...counts(rows,'current',exam.short,label),rows.filter(row=>!row.current).length]));
 }
 function showClassIXResults(parent,rows){
  showSubjectResults(parent,'Subject-wise results by class section',groups(rows,row=>sectionLabel(row)+' · '+subjectGroup(info(row))));
  const teachers=el('details',undefined,'pb1-comparison-details');
  teachers.append(el('summary','Teacher-wise results by subject'));
  showSubjectResults(teachers,'Teacher-wise results by subject',teacherGroups(rows));
  parent.append(teachers);
 }
 function showStudentComparison(parent,rows){
  if(subjectOnly){
   const details=el('details',undefined,'pb1-comparison-details');
   details.append(el('summary','View student-by-student results'));
   parent.append(details);
   parent=details;
  }else parent.append(el('h3','Student-by-student comparison'));
  const search=control(parent,'Search student results','input'),list=el('ul',undefined,'pb1-compact-marks');
  search.type='search';
  search.oninput=()=>{
   const query=search.value.trim().toLowerCase();
   const matching=rows.filter(row=>[row.name,row.roll,sectionLabel(row),info(row).subject].join(' ').toLowerCase().includes(query));
   list.replaceChildren();
   for(const papers of groups(matching,row=>row.key).values()){
    const student=papers[0],item=el('li');
    item.append(el('strong',student.name),el('small',sectionLabel(student)));
    for(const row of papers){
     const paper=el('div',undefined,'pb1-student-compare-paper'),marks=el('div',undefined,'pb1-student-compare-results');
     const previous=el('div'),current=el('div');
     previous.append(el('small',exam.previous),el('strong',result(row.before)));
     current.append(el('small',exam.short),el('strong',result(row.current)));
     marks.append(previous,current);
     paper.append(el('strong',info(row).subject),marks);
     if(row.before?.percentage!=null&&row.current?.percentage!=null){
      paper.append(el('small','Change '+delta(row.before.percentage,row.current.percentage)));
     }
     item.append(paper);
    }
    list.append(item);
   }
   list.hidden=!matching.length;
   empty.hidden=Boolean(matching.length);
  };
  const empty=el('p','No student results match this search.');
  parent.append(list,empty);
  if(subjectOnly)parent.addEventListener('toggle',()=>{if(parent.open)search.oninput();});
  else search.oninput();
 }
 let selectedClass='',selectedSection='';
 function drawClassAnalysis(){
  report.replaceChildren(el('h3',exam.short+' Class Teacher Analysis'));
  const classFilters=el('div',undefined,'pb1-filters'),results=el('div');
  report.append(classFilters,results);
  const standard=exam.classId?null:control(classFilters,'Class teacher analysis standard'),section=control(classFilters,'Class teacher analysis section');
  const sections=data.classSections||[...new Map([...data.scopes,...(data.roster||data.classRoster||[])].map(({classId,section})=>
   [JSON.stringify([classId,section]),{classId,section}])).values()];
  if(standard)options(standard,values(sections,'classId').map(value=>[value,value]),selectedClass||filterClass());
  const analysisClass=()=>exam.classId||standard.value;
  function selectSections(){
   options(section,choices(values(sections.filter(row=>row.classId===analysisClass()),'section'),'All sections'),
    selectedClass===analysisClass()?selectedSection:sectionSelect.value);
  }
  function show(){
   selectedClass=analysisClass();selectedSection=section.value;results.replaceChildren();
   if(!sections.some(row=>row.classId===selectedClass)){results.append(el('p','No '+exam.short+' classes are available.'));return;}
   const classes=sections.filter(row=>row.classId===selectedClass&&(!selectedSection||row.section===selectedSection));
   if(subjectOnly){
    const rows=data.rows.filter(row=>info(row).classId===selectedClass&&(!selectedSection||info(row).section===selectedSection));
    showClassIXResults(results,rows);
    showStudentComparison(results,rows);
    return;
   }
   results.append(el('p',classes.map(row=>selectedClass+' '+row.section+(row.teacher?' · '+row.teacher:'')).join(' | '),'pb1-scope-summary'),
    el('p','Attendance uses explicit AB entries. Pending marks are shown separately. A student who is absent and has a failing mark in another subject can appear in both counts.'));
   for(const [includeAdditional,title] of [[false,'Core subjects only'],[true,'All subjects · including AI and additional subjects']]){
    const box=el('section',undefined,'pb1-class-summary');
    const dataSet=pb1ClassAnalysis(data,{classId:selectedClass,section:selectedSection,includeAdditional});
    const {enrolled,appearedAll,absentOne,absentMultiple,pending,unmapped,passedAll,failed,failures}=dataSet;
    const rate=total=>total?pct(passedAll*100/total):'—';
    const stats=el('div',undefined,'pb1-stats');
    for(const [label,value] of [
     ['Enrolled',enrolled],['Appeared in all subjects',appearedAll],['Absent in one subject',absentOne],
     ['Absent in more than one subject',absentMultiple],['Marks pending',pending],['No matching '+exam.short+' papers',unmapped],
     ['Passed all subjects',passedAll],['Total fail',failBreakdown(failed,failures.filter(student=>student.failed.some(paper=>paper.mark.band==='critical')).length)],
     ['Pass percentage · appeared in all',rate(appearedAll)],['Pass percentage · enrolled',rate(enrolled)],
    ]){
     const tile=el('div');tile.append(el('span',label),el('strong',String(value)));stats.append(tile);
    }
    box.append(el('h4',title),stats,el('h5','Student-wise failed subjects'));
    if(failures.length){
     const count=Math.max(...failures.map(student=>student.failed.length));
     const headers=['Student','Section','Roll',...Array.from({length:count},(_,i)=>'Subject '+(i+1))];
     table(box,headers,failures.map(student=>[student.name,student.section,student.roll,
      ...Array.from({length:count},(_,i)=>{
       const paper=student.failed[i];
       return paper?paper.subject+' · '+result(paper.mark):'';
      })]));
    }else box.append(el('p','No failing marks recorded for this selection.'));
    results.append(box);
   }
  }
  if(standard)standard.onchange=()=>{selectedClass=analysisClass();selectedSection='';selectSections();show();};
  section.onchange=show;
  selectSections();show();
 }
 function openTeacherCopy(entered){
  const papers=[...new Set(entered.map(row=>row.scope))].filter((index,position,items)=>
   !items.slice(0,position).some(other=>mathsSection(data.scopes[index],data.scopes[other])));
  return choosePaper(papers,approve?'Subject teacher copy / PDF':'Marks slip preview','Preview marks slip',
   index=>paperSlip(data.scopes[index],data,exam,!!approve),subjectGroup);
 }
 function choosePaper(papers,titleText,actionText,next,labelSubject=paper=>paper.subject){
  if(papers.length===1)return next(papers[0]);
  const dialog=el('dialog',undefined,'task-start-dialog'),title=el('h2',titleText);
  title.id='paper-copy-title';dialog.setAttribute('aria-labelledby',title.id);dialog.append(title);
  const picker=control(dialog,'Select class, section and subject');
  options(picker,papers.map(index=>{
   const paper=data.scopes[index];
   return [String(index),'Class '+paper.classId+' '+paper.section+' · '+labelSubject(paper)];
  }));
  const show=button(actionText,()=>{
   dialog.close();return next(Number(picker.value));
  });
  dialog.append(show,button('Cancel',()=>dialog.close()));
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();
 }
 function freezePaper(scope,redraw){
  const dialog=el('dialog',undefined,'task-start-dialog pb1-student-dialog'),form=el('form');
  const heading=el('h2','Freeze marks after Principal discussion');
  heading.id='paper-freeze-title';dialog.setAttribute('aria-labelledby',heading.id);
  const confirmFreeze=el('button','Confirm and freeze marks'),cancel=el('button','Cancel');
  cancel.type='button';cancel.onclick=()=>dialog.close();
  const error=el('p',undefined,'task-error');error.setAttribute('role','alert');
  const actions=el('div',undefined,'task-actions');
  actions.append(confirmFreeze,cancel);form.append(actions,error);
  dialog.append(heading,el('p','Class '+scope.classId+' '+scope.section+' · '+scope.subject),el('p','Freezing locks the marks for this paper.'+(exam.mission?' Mission 100 will use the approved PB-1 result.':'')),form);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  form.onsubmit=event=>{event.preventDefault();run(async()=>{
   error.textContent='';
   try{data=await approve(scope,data.revision,scope.discussionComment||'');}
   catch(failure){error.textContent=failure.message;return;}
   dialog.close();redraw();
  });};
  document.body.append(dialog);dialog.showModal();
 }
 async function reopenPaper(scope,redraw){
  const instructions='Unfreeze Class '+scope.classId+' '+scope.section+' · '+scope.subject+'? The assigned teacher can edit the saved marks again.';
  const missionNotice=exam.mission?' Mission 100 will use the monthly result until this paper is frozen again.':'';
  if(!confirm(instructions+missionNotice))return;
  data=await unfreeze(scope,data.revision);redraw();
 }
 function drawReport(){
  hasReport=true;report.replaceChildren();
  const rows=data.rows.filter(row=>scopeMatches(info(row))),entered=rows.filter(row=>row.current);
  const visibleStudents=new Set(rows.map(row=>row.key));
  const roster=data.roster?.filter(student=>
   (!filterClass()||student.classId===filterClass())&&(!sectionSelect.value||student.section===sectionSelect.value)&&
   (!subjectSelect.value&&!teacherSelect.value||visibleStudents.has(student.key)));
  if(roster?.length){
   const list=el('details',undefined,'pb1-comparison-details');
   list.append(el('summary','Student roster · '+roster.length));
   const sorted=[...roster].sort((a,b)=>a.classId.localeCompare(b.classId)||a.section.localeCompare(b.section)||compareRoll(a,b));
   table(list,['Class','Roll','Student'],sorted.map(student=>[student.classId+' '+student.section,student.roll,student.name]));
   report.append(list);
  }
  if(!rows.length){report.append(el('p','No paper results match this selection.'));return;}
  if(subjectOnly)showClassIXResults(report,rows);
  else{
   showBaselineResults(report,exam.baseline+' class-wise analysis',groups(rows,sectionLabel));
   showBaselineResults(report,exam.baseline+' teacher-wise analysis',teacherGroups(rows));
  }
  if(!entered.length){
   report.append(el('p',exam.short+' marks pending.','task-monitoring-notice'));
   showStudentComparison(report,rows);
   return;
  }
  const sections=[...new Set(rows.map(sectionLabel))].sort();
  const selectedTeacher=teacherSelect.value?teacherSelect.selectedOptions[0]?.textContent:'';
  report.append(el('p',[selectedTeacher,subjectSelect.value||'All subjects',sections.join(', ')].filter(Boolean).join(' · '),'pb1-scope-summary'));
  if(subjectSelect.value==='Mathematics'&&rows.some(row=>mathsOption(info(row))))report.append(el('p','Class X Mathematics includes Basic and Standard students in each selected section.'));
  const papersByScope=[...groups(rows,row=>row.scope)];
  const frozenPapers=papersByScope.filter(([index])=>data.scopes[index].approvedAt).map(([index])=>index);
  if(exam.mission){
   const selectedPapers=papersByScope;
   const frozen=frozenPapers.length;
   const status=frozen===selectedPapers.length?'All selected papers are frozen. Mission 100 uses their PB-1 results.':
    frozen?frozen+' of '+selectedPapers.length+' papers are frozen and in use on Mission 100. The remaining papers are awaiting approval.':
    'PB-1 categories reflect entered marks. Mission 100 uses them after the Principal approves and freezes each paper.';
   report.append(el('p',status,'task-monitoring-notice'));
  }
  const paperActions=el('div',undefined,'task-actions');
  if(approve||openPrincipalReview){
   const freezeStatus=papersByScope.map(([index,papers])=>{
    const scope=data.scopes[index],missing=papers.filter(row=>!row.current).length;
    const status=scope.approvedAt?'Frozen':missing?missing+' pending '+(missing===1?'mark':'marks'):
     papers.some(row=>row.current.maximum!==scope.maximum)?'Paper maximum needs correction':'Ready to freeze';
    return {index,scope,status};
   });
   const ready=freezeStatus.filter(paper=>paper.status==='Ready to freeze').map(paper=>paper.index);
   if(approve)report.append(el('p','Freeze one class section and subject at a time.'));
   if(freezeStatus.length>1){
    const details=el('details',undefined,'pb1-comparison-details');
    details.append(el('summary','Freeze status by class section and subject'));
    table(details,['Class / section','Subject','Freeze status'],freezeStatus.map(({scope,status})=>[scope.classId+' '+scope.section,scope.subject,status]));
    report.append(details);
   }else report.append(el('p','Freeze status · '+freezeStatus[0].status));

   if(approve){
    const freeze=button('Freeze marks after Principal discussion',()=>choosePaper(ready,'Choose a paper to freeze','Continue to freeze',index=>freezePaper(data.scopes[index],drawReport)));
    freeze.disabled=!ready.length;
    paperActions.append(freeze);
    if(!ready.length&&frozenPapers.length<papersByScope.length)report.append(el('p','Complete marks or AB for every student and correct any paper maximum mismatch before freezing.'));
   }
  }
  if(unfreeze&&frozenPapers.length)paperActions.append(button('Unfreeze for emergency correction',()=>
   choosePaper(frozenPapers,'Choose a paper to unfreeze','Continue to unfreeze',index=>reopenPaper(data.scopes[index],drawReport))));
  paperActions.append(button(approve?'Subject teacher copy / PDF':'Preview marks slip',()=>openTeacherCopy(entered)));
  if(paperActions.childElementCount)report.append(paperActions);
  if(subjectOnly){
   showStudentComparison(report,rows);
   return;
  }
  renderSmartAnalysis(report,rows,(title,filter,paperFilter=()=>true)=>
   showMarks(pb1SmartStudents(rows).filter(filter).flatMap(student=>student.papers.filter(paperFilter)),{title}),exam);
  const trends=el('details',undefined,'pb1-comparison-details');
  trends.append(el('summary','Section, subject and teacher comparisons'));
  trends.append(el('h3',exam.baseline+' and '+exam.short+' marks by section'));
  renderMarksGraph(trends,groups(rows,sectionLabel),exam);
  showCohorts(trends,'Standard and section comparison',[
   ...groups(rows,row=>'Class '+info(row).classId+' · all selected sections'),...groups(rows,sectionLabel),
  ]);
  showCohorts(trends,'Subject comparison',groups(rows,row=>info(row).classId+' · '+subjectGroup(info(row))));
  showCohorts(trends,'Teacher comparison · all selected sections',teacherGroups(rows));
  report.append(el('p',entered.length+' / '+rows.length+' paper results recorded'),button('View entered '+exam.short+' marks',()=>showMarks(entered)));
  const {failed,critical}=pb1SmartSummary(rows);
  report.append(el('h3','Remedial target students'),el('p','Total fail · '+failBreakdown(failed,critical)),el('p',gradingNote));
  const targets=el('div',undefined,'pb1-remedial-targets');
  for(const [band,label] of [['critical','Critical fail'],['red','Other fail'],['yellow','Borderline pass']]){
   const matching=entered.filter(row=>row.current.band===band),section=el('section',undefined,'pb1-target-'+band);
   section.append(el('h4',label+' · '+new Set(matching.map(row=>row.key)).size));
   if(matching.length)marksList(section,matching);else section.append(el('p','No students in this category.'));
   targets.append(section);
  }
  report.append(targets);
  const comparison=el('details',undefined,'pb1-comparison-details');
  comparison.append(el('summary',exam.short+' vs '+exam.previous.toLowerCase()+' · category comparison'));
  renderCategoryComparison(comparison,pb1CategoryCounts(rows,'before'),pb1CategoryCounts(rows,'current'),
   (title,period,filter)=>showMarks(rows.filter(row=>filter(row[period])),{title,period}),exam);
  report.append(comparison,trends);
  showStudentComparison(report,rows);
  if(!exam.mission)return;
  const mission=el('a','Open Mission Perfect 100 for ongoing tracking');
  mission.href='cbse-mission.html';const link=el('p');link.append(mission);report.append(link);
 }
 function drawEntry(){
  const panel=el('section'),choicesBar=el('div',undefined,'pb1-filters'),host=el('div');
  content.append(panel);panel.append(choicesBar,host);
  const assignedTeacher=approve?control(choicesBar,'Teacher'):null;
  if(assignedTeacher)options(assignedTeacher,teacherOptions(data.scopes));
  const cls=exam.classId?null:control(choicesBar,'Standard'),paper=control(choicesBar,'Class / section and subject');
  const teacherPapers=scope=>!assignedTeacher?.value||scopeTeachers(scope).some(person=>person.key===assignedTeacher.value);
  const entryClass=()=>exam.classId||cls.value;
  function updateStandards(selected){
   if(!cls)return;
   const standards=values(data.scopes.filter(teacherPapers),'classId');
   options(cls,approve?choices(standards,'All standards'):standards.map(value=>[value,value]),selected);
  }
  updateStandards(requestedPaper?.classId);
  function drawChoices(preferredIndex=-1){
   options(paper,data.scopes.flatMap((scope,index)=>teacherPapers(scope)&&(!entryClass()||scope.classId===entryClass())?
    [[String(index),(entryClass()?'':scope.classId+' ')+scope.section+' · '+scope.subject]]:[]),String(preferredIndex));
   drawMarks();
  }
  const canSwitch=()=>!host.querySelector('[data-portal-dirty=true]')||confirm('Discard unsaved marks?');
  let previousClass=entryClass(),previousTeacher=assignedTeacher?.value,previousPaper='';
  if(assignedTeacher)assignedTeacher.onchange=()=>{
   if(!canSwitch()){assignedTeacher.value=previousTeacher;return;}
   previousTeacher=assignedTeacher.value;updateStandards('');previousClass=entryClass();drawChoices(Number(previousPaper));
  };
  if(cls)cls.onchange=()=>{if(canSwitch()){previousClass=entryClass();drawChoices(Number(previousPaper));}else cls.value=previousClass;};
  paper.onchange=()=>{if(canSwitch())drawMarks();else paper.value=previousPaper;};
  const exactIndex=requestedPaper?data.scopes.findIndex(scope=>['classId','section','subject'].every(key=>scope[key]===requestedPaper[key])):-1;
  const requestedIndex=exactIndex<0&&requestedPaper?data.scopes.findIndex(scope=>mathsSection(scope,requestedPaper)):exactIndex;
  if(requestedPaper&&requestedIndex<0)panel.prepend(el('p','The requested paper is outside your assigned scope. Choose one of your assigned papers.','task-monitoring-notice'));
  drawChoices(requestedIndex);
  function drawMarks(announceSaved=false){
   previousPaper=paper.value;
   const index=Number(paper.value),scope=data.scopes[index],rows=data.rows.filter(row=>row.scope===index).sort(compareRoll);
   const monthlyMM=maximumLabel(rows.map(row=>row.before?.maximum)),pb1MM=maximumLabel([scope.maximum]);
   const maxima=el('div',undefined,'pb1-stats');
   for(const [label,value] of [[exam.previous,monthlyMM],[exam.current,pb1MM]]){
    const item=el('div');item.append(el('span',label),el('strong',value));maxima.append(item);
   }
   host.replaceChildren(el('h3','Class '+scope.classId+' '+scope.section+' · '+scope.subject),maxima,
    el('p','Each percentage uses the marks earned divided by that exam’s maximum.'));
   if(scope.approvedAt&&teacher){
    const notice=el('p',undefined,'task-monitoring-notice');
    notice.append(el('strong','Marks are already frozen. Request the Principal to unfreeze this paper for corrections.'));
    host.prepend(notice);
   }
   const preview=button(approve?'Preview marks slip / PDF':'Preview marks slip',()=>{
    if(host.querySelector('[data-portal-dirty=true]'))throw Error('Save your mark changes before previewing the slip.');
    paperSlip(scope,data,exam,!!approve);
   });
   preview.disabled=!data.rows.some(row=>row.current&&(row.scope===index||mathsSection(scope,data.scopes[row.scope])));
   host.append(preview);
   if(hqVerification?.groups.some(group=>group.sections.some(paper=>
    paper.section===scope.classId+scope.section&&paper.paper===scope.paperName))){
    host.append(button('HQ/RO Analysis Verification PDF',()=>downloadHQVerification(hqVerification,scope)));
   }
   if(scope.approvedAt){
    host.append(el('p','Approved and frozen · '+new Date(scope.approvedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),'task-monitoring-notice'));
    if(unfreeze)host.append(button('Unfreeze for emergency correction',()=>reopenPaper(scope,drawMarks)));
    if(scope.discussionComment)host.append(el('h4','Principal’s comment to teacher'),el('p',scope.discussionComment,'pb1-discussion-comment'));
    table(host,['Roll','Student',exam.baseline+' marks ('+monthlyMM+')','Approved '+exam.short+' marks ('+pb1MM+')'],
     rows.map(row=>[row.roll,row.name,result(row.before),result(row.current)]));
    return;
   }
   const missing=rows.filter(row=>!row.current).length;
   host.append(el('p','Enter '+exam.short+' marks. For an absent student, type AB or ABS in any letter case. Leave a mark blank to keep it pending or retain the saved result.'));
   if(approve){
    const differentMaximum=rows.some(row=>row.current&&row.current.maximum!==scope.maximum);
    const ready=rows.length>0&&!missing&&!differentMaximum;
    const action=button('Freeze marks after Principal discussion',()=>{
     if(host.querySelector('[data-portal-dirty=true]'))throw Error('Save your mark changes before approval.');
     freezePaper(scope,drawMarks);
    });
    action.disabled=!ready;
    host.append(el('p',ready?'All enrolled students have marks or AB recorded.':differentMaximum?'Correct marks saved with a different paper maximum before freezing.':missing+' enrolled students still need a mark or AB.'),action);
   }
   const editor=el('form');
   const inputs=rows.map(row=>{
    const input=el('input');input.setAttribute('aria-label',exam.short+' marks for '+row.name);input.autocomplete='off';input.maxLength=12;
    const previousMaximumDiffers=row.current&&row.current.maximum!==scope.maximum;
    input.value=row.current&&!previousMaximumDiffers?(row.current.absent?'AB':String(row.current.score)):'';
    const entry=el('div');entry.append(input);
    if(previousMaximumDiffers)entry.append(el('small','Saved: '+result(row.current)));
    return {row,input,entry,original:input.value};
   });
   table(editor,['Roll','Student',exam.baseline+' marks ('+monthlyMM+')',exam.short+' marks ('+pb1MM+')'],inputs.map(({row,entry})=>[row.roll,row.name,result(row.before),entry]));
   const pin=teacher?control(editor,'Personal PIN to save','input'):null;
   if(pin){pin.type='password';pin.autocomplete='off';pin.inputMode='numeric';}
   const saveActions=el('div',undefined,'task-actions');
   const saveStatus=el('span',undefined,'task-save-confirmation');
   saveStatus.setAttribute('role','status');
   saveActions.append(el('button','Save '+exam.short+' marks'),saveStatus);
   editor.append(saveActions);host.append(editor);
   if(announceSaved)requestAnimationFrame(()=>{
    if(!saveStatus.isConnected)return;
    saveStatus.textContent='Marks saved successfully.';
    saveActions.scrollIntoView({block:'nearest'});
   });
   const changedInputs=()=>inputs.filter(({input,original})=>input.value.trim()&&input.value.trim()!==original);
   editor.oninput=()=>{
    const changed=changedInputs().length>0;
    editor.dataset.portalDirty=String(changed);
    if(changed)saveStatus.textContent='';
   };
   const saveMarks=()=>run(async()=>{
    const changed=changedInputs().map(({row,input})=>{
     const value=input.value.trim().toUpperCase();
     const absent=value==='ABS'||value==='AB';
     if(!absent&&(!/^\d+(?:\.\d+)?$/.test(value)||Number(value)>scope.maximum))throw Error('Enter AB, ABS or marks from 0 to '+scope.maximum+' for '+row.name+'.');
     const previous=row.current?{score:row.current.score,absent:!!row.current.absent,maximum:row.current.maximum}:null;
     return {key:row.key,mark:absent?'AB':Number(value),...(exam.mission?{previous}:{})};
    });
    if(!changed.length)return;
    if(pin&&!pin.value){
     saveStatus.textContent='Enter your personal PIN to save changed marks.';
     throw Error(saveStatus.textContent);
    }
    saveStatus.textContent='Saving marks…';
    try{
     const next=await save(scope,data.revision,changed,pin?.value);
     editor.dataset.portalDirty='false';data=next;drawMarks(true);
    }catch(error){
     if(pin)pin.value='';
     saveStatus.textContent=error.message;
     throw error;
    }
   });
   editor.onsubmit=event=>{
    event.preventDefault();
    const blanks=inputs.filter(({row,input})=>!row.current&&!input.value.trim()),changed=changedInputs().length>0;
    if(!blanks.length){saveMarks();return;}
    const dialog=el('dialog',undefined,'task-start-dialog pb1-student-dialog');
    const title=el('h2',blanks.length===1?'1 mark is still blank':blanks.length+' marks are still blank');
    title.id='pb1-missing-marks-title';dialog.setAttribute('aria-labelledby',title.id);
    const students=el('ul');
    for(const {row} of blanks)students.append(el('li',row.name));
    const fill=el('button','Continue filling marks');fill.type='button';fill.onclick=()=>dialog.close('fill');
    const proceed=el('button','OK');proceed.type='button';
    proceed.onclick=()=>dialog.close('confirm');
    dialog.append(title,el('p',changed?'Select OK to save entered marks and leave blanks pending.':'Select OK to leave these marks pending.'),students,proceed,fill);
    dialog.addEventListener('close',()=>{
     const action=dialog.returnValue;dialog.remove();
     if(action!=='confirm'){blanks[0].input.focus();return;}
     if(changed)saveMarks();
     else saveStatus.textContent='Blank marks are still pending.';
    },{once:true});
    document.body.append(dialog);dialog.showModal();proceed.focus();
   };
  }
 }
 function drawMode(){
  content.replaceChildren();
  if(entryAction)entryAction.hidden=entering;
  if(entering){
   if(!entryOnly)content.append(toolbar);
   if(data.scopes.length)drawEntry();
   else content.append(el('p','No '+exam.current+' papers are available for this view.'));
   return;
  }
  content.append(filters,toolbar,report);
  if(data.rows.length&&!classMode)drawReport();
 }
 drawMode();
}
