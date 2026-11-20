import {el,options} from './cbse-ui.js';
import {pb1ClassAnalysis} from './cbse-pb1-class-analysis.js';
import {pb1Metrics,pb1CategoryCounts,pb1SmartSummary,pb1SmartStudents} from './cbse-pb1-analyser-model.js';
const pct=v=>v==null?'—':v.toFixed(1)+'%';
const delta=(before,after)=>before==null||after==null?'—':(after-before>0?'+':'')+(after-before).toFixed(1)+' pp';
const result=mark=>!mark?'Not entered':mark.absent?'AB (MM '+mark.maximum+')':mark.score+'/'+mark.maximum+' ('+pct(mark.percentage)+')';
const choices=(items,label)=>[['',label],...items.map(value=>[value,value])];
const gradingNote='Critical fail: 25% or below. Other fail: above 25% and below 33%. Borderline pass: 33% through 40%.';
function maximumLabel(values){
 const maxima=[...new Set(values.filter(value=>Number.isFinite(value)&&value>0))].sort((a,b)=>a-b);
 return !maxima.length?'MM unavailable':maxima.length===1?'MM '+maxima[0]:'MM varies: '+maxima.join(' / ');
}

function table(parent,headers,rows){
 if(!rows.length){parent.append(el('p','No records match these filters.'));return;}
 const scroll=el('div',undefined,'task-scroll pb1-table-wrap'),table=el('table',undefined,'pb1-table');
 scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Analysis table');
 const head=table.createTHead().insertRow(),body=table.createTBody();
 for(const title of headers){const th=el('th',title);th.scope='col';head.append(th);}
 for(const values of rows){const row=body.insertRow();for(const value of values)row.insertCell().append(value instanceof Node?value:document.createTextNode(String(value??'')));}
 scroll.append(table);parent.append(scroll);
}
function control(parent,label,tag='select'){
 const wrap=el('label',label),input=el(tag);input.setAttribute('aria-label',label);wrap.append(input);parent.append(wrap);return input;
}
function groups(rows,key){
 const grouped=new Map();for(const row of rows){const id=key(row);if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(row);}return grouped;
}
const scopeTeachers=scope=>scope.teachers||(scope.teacher?[{key:scope.teacher,name:scope.teacher}]:[]);
export const PB1_ANALYSER={title:'Pre-Samagam Wisdom Analyser · PB-1 X and XII',short:'PB-1',current:'Preboard 1',previous:'Latest monthly test',baseline:'Monthly',classes:'Classes X and XII',mission:true};
export const HALF_YEARLY_ANALYSER={title:'Pre-Samagam Wisdom Analyser · XI Half-Yearly',short:'Half-Yearly',current:'Half-Yearly',previous:'Previous test',baseline:'Previous',classes:'Class XI'};

const cohortHeaders=exam=>['Group','Paired / enrolled','Previous pass',exam.short+' pass','Pass change','Previous average',exam.short+' average','Average change','Remark'];
function cohortRow(label,rows){
 const m=pb1Metrics(rows),change=m.currentPass==null?null:m.currentPass-m.beforePass;
 return [label,m.paired+' / '+m.total,pct(m.beforePass),pct(m.currentPass),delta(m.beforePass,m.currentPass),
  pct(m.beforeAverage),pct(m.currentAverage),delta(m.beforeAverage,m.currentAverage),
  change==null?'Awaiting comparable results':change>0?'Pass rate increased':change<0?'Pass rate decreased':'Pass rate steady'];
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
  ['Total fail',previous.failed,current.failed,'red',mark=>mark?.failed],
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
  if(!filter||!value)return value;
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
 const outOf=count=>count+' / '+stats.assessed;
 const strip=el('div',undefined,'pb1-stats pb1-smart-strip');
 const items=[
  ['Total enrolled',String(stats.students),'result',()=>true],
  ['Appeared',stats.assessed+' / '+stats.students,'result',student=>student.current.length],
  ['Pass percentage · appeared',pct(rate(stats.passed,stats.assessed)),'pass'],
  ['Pass percentage · enrolled',pct(rate(stats.enrolledPassed,stats.students)),'result'],
  ['Students passed',outOf(stats.passed),'pass',student=>student.current.length&&!student.failed],
  ['Students failed',outOf(stats.failed),'decline',student=>student.failed,row=>row.current?.failed],
  ['Critical fail',outOf(stats.critical),'decline',student=>student.critical,row=>row.current?.band==='critical'],
  ['Borderline pass',outOf(stats.borderline),'border',student=>student.borderline,row=>row.current?.borderline],
  ['Scored 90%+',outOf(stats.score90),'pass',student=>student.percentage>=90],
  ['Scored 75%+',outOf(stats.score75),'pass',student=>student.percentage>=75],
  ['Scored 50%+',outOf(stats.score50),'result',student=>student.percentage>=50],
  [exam.baseline+' → '+exam.short+' pass rate',pct(previous)+' → '+pct(current),'result'],
  ['Change vs '+exam.baseline.toLowerCase(),delta(previous,current),current==null?'result':current>=previous?'pass':'decline'],
  ['Absent · Retest awaited',stats.absent+' / '+stats.students,'border',student=>student.absent],
  ['Marks entry pending',stats.pending+' / '+stats.students,'border',student=>student.pending],
  ['Incomplete coverage',stats.incomplete+' / '+stats.students,'border',student=>student.incomplete],
 ];
 for(const [label,value,style,filter,paperFilter] of items){
  const tile=el('div',undefined,'pb1-stat-'+style);tile.append(el('span',label),el('strong',value));
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

export function renderPB1Analyser(host,data,{run,button,save,approve,back,teacher,publicView,entryOnly,openEntry,openNames,refresh,exam=PB1_ANALYSER,setup}){
 const card=el('section',undefined,'task-card pb1-analyser'),toolbar=el('div',undefined,'task-actions'),content=el('div');
 const filters=el('div',undefined,'pb1-filters'),report=el('div');
 let entering=entryOnly,entryAction,classMode=false;
 const description=el('p',teacher?'Your assigned '+exam.current+' papers':publicView?exam.classes+' · Public student labels are coded':exam.classes+' · '+exam.current);
 card.append(el('h2',entryOnly?'Update '+exam.short+' marks':exam.title),description);
 if(setup)card.append(setup(()=>data.revision));
 card.append(content);
 host.replaceChildren(button(entryOnly?'Back to Wisdom Analyser':'Back to task list',back),card);
 const classSelect=control(filters,'Standard'),subjectSelect=control(filters,'Subject'),teacherSelect=control(filters,'Teacher'),sectionSelect=control(filters,'Class / section');
 const classOptions=()=>[...data.scopes,...(data.roster||[])];
 const values=(scopes,key)=>[...new Set(scopes.map(info=>info[key]).filter(Boolean))].sort();
 options(classSelect,choices(values(classOptions(),'classId'),'All standards'),'');
 const runAnalysis=button('Get smart analysis',async()=>{
  if(content.querySelector('[data-portal-dirty=true]')&&!confirm('Discard unsaved marks?'))return;
  if(refresh){
   data=await refresh(!publicView);
   options(classSelect,choices(values(classOptions(),'classId'),'All standards'),classSelect.value);
   restrict();
  }
  if(entering){entering=false;drawMode();}
  classMode=false;filters.hidden=false;
  drawReport();report.scrollIntoView({block:'start'});
 });
 runAnalysis.classList.add('pb1-primary-action');
 toolbar.append(runAnalysis);
 if(exam.mission&&!entryOnly)toolbar.append(button('Class Teacher Analysis',async()=>{
  if(content.querySelector('[data-portal-dirty=true]')&&!confirm('Discard unsaved marks?'))return;
  if(refresh)data=await refresh(!publicView);
  if(entering){entering=false;drawMode();}
  classMode=true;filters.hidden=true;hasReport=true;
  drawClassAnalysis();report.scrollIntoView({block:'start'});
 }));
 if(openEntry)toolbar.append(button('Update '+exam.short+' marks',openEntry));
 else if(save&&!entryOnly){
  entryAction=button('Update '+exam.short+' marks',()=>{entering=true;drawMode();});
  toolbar.append(entryAction);
 }
 function restrict(){
  const scopes=data.scopes.filter(info=>!classSelect.value||info.classId===classSelect.value);
  options(subjectSelect,choices(values(scopes,'subject'),'All subjects'),subjectSelect.value);
  const subjects=scopes.filter(info=>!subjectSelect.value||info.subject===subjectSelect.value);
  const teachers=new Map(subjects.flatMap(info=>scopeTeachers(info)).map(({key,name})=>[key,name]));
  options(teacherSelect,[['','All teachers'],...[...teachers].sort((a,b)=>a[1].localeCompare(b[1]))],teacherSelect.value);
  const assigned=subjects.filter(info=>!teacherSelect.value||scopeTeachers(info).some(person=>person.key===teacherSelect.value));
  const rosterSections=!subjectSelect.value&&!teacherSelect.value?(data.roster||[]).filter(row=>!classSelect.value||row.classId===classSelect.value):[];
  options(sectionSelect,choices(values([...assigned,...rosterSections],'section'),'All sections'),sectionSelect.value);
 }
 restrict();
 classSelect.onchange=subjectSelect.onchange=teacherSelect.onchange=()=>{restrict();hasReport=false;report.replaceChildren();};
 sectionSelect.onchange=()=>{hasReport=false;report.replaceChildren();};
 function scopeMatches(info){
  return (!classSelect.value||info.classId===classSelect.value)&&(!sectionSelect.value||info.section===sectionSelect.value)&&(!subjectSelect.value||info.subject===subjectSelect.value)&&(!teacherSelect.value||scopeTeachers(info).some(person=>person.key===teacherSelect.value));
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
   return [person.name+' · '+info(row).classId+' · '+info(row).subject,group.map(item=>item.row)];
  });
 }
 function showStudentComparison(parent,rows){
  parent.append(el('h3','Student-by-student comparison'));
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
  parent.append(list,empty);search.oninput();
 }
 let selectedClass='',selectedSection='';
 function drawClassAnalysis(){
  report.replaceChildren(el('h3','PB-1 Class Teacher Analysis'));
  const classFilters=el('div',undefined,'pb1-filters'),results=el('div');
  report.append(classFilters,results);
  const standard=control(classFilters,'Class teacher analysis standard'),section=control(classFilters,'Class teacher analysis section');
  const sections=data.classSections||data.scopes;
  options(standard,values(sections,'classId').map(value=>[value,value]),selectedClass||classSelect.value);
  function selectSections(){
   options(section,choices(values(sections.filter(row=>row.classId===standard.value),'section'),'All sections'),
    selectedClass===standard.value?selectedSection:sectionSelect.value);
  }
  function show(){
   selectedClass=standard.value;selectedSection=section.value;results.replaceChildren();
   if(!selectedClass){results.append(el('p','No PB-1 classes are available.'));return;}
   const classes=sections.filter(row=>row.classId===selectedClass&&(!selectedSection||row.section===selectedSection));
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
     ['Absent in more than one subject',absentMultiple],['Marks pending',pending],['No matching PB-1 papers',unmapped],
     ['Passed all subjects',passedAll],['Failed in at least one subject',failed],
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
  standard.onchange=()=>{selectedClass=standard.value;selectedSection='';selectSections();show();};
  section.onchange=show;
  selectSections();show();
 }
 function drawReport(){
  hasReport=true;report.replaceChildren();
  const rows=data.rows.filter(row=>scopeMatches(info(row))),entered=rows.filter(row=>row.current);
  const visibleStudents=new Set(rows.map(row=>row.key));
  const roster=data.roster?.filter(student=>
   (!classSelect.value||student.classId===classSelect.value)&&(!sectionSelect.value||student.section===sectionSelect.value)&&
   (!subjectSelect.value&&!teacherSelect.value||visibleStudents.has(student.key)));
  if(roster?.length){
   const list=el('details',undefined,'pb1-comparison-details');
   list.append(el('summary','Student roster · '+roster.length));
   const sorted=[...roster].sort((a,b)=>a.classId.localeCompare(b.classId)||a.section.localeCompare(b.section)||String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true})||a.name.localeCompare(b.name));
   table(list,['Class','Roll','Student'],sorted.map(student=>[student.classId+' '+student.section,student.roll,student.name]));
   report.append(list);
  }
  if(!rows.length){report.append(el('p','No paper results match this selection.'));return;}
  if(!entered.length){
   report.append(el('p',exam.short+' marks have not been uploaded for this selection. Please enter the marks to see the analysis.','task-monitoring-notice'));
   showStudentComparison(report,rows);
   return;
  }
  const sections=[...new Set(rows.map(sectionLabel))].sort();
  const selectedTeacher=teacherSelect.value?teacherSelect.selectedOptions[0]?.textContent:'';
  report.append(el('p',[selectedTeacher,subjectSelect.value||'All subjects',sections.join(', ')].filter(Boolean).join(' · '),'pb1-scope-summary'));
  if(exam.mission){
   const selectedPapers=[...new Set(rows.map(row=>row.scope))];
   const frozen=selectedPapers.filter(scope=>data.scopes[scope].approvedAt).length;
   const status=frozen===selectedPapers.length?'All selected papers are frozen. Mission 100 uses their PB-1 results.':
    frozen?frozen+' of '+selectedPapers.length+' papers are frozen and in use on Mission 100. The remaining papers are awaiting approval.':
    'PB-1 categories reflect entered marks. Mission 100 uses them after the Principal approves and freezes each paper.';
   report.append(el('p',status,'task-monitoring-notice'));
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
  showCohorts(trends,'Subject comparison',groups(rows,row=>info(row).classId+' · '+info(row).subject));
  showCohorts(trends,'Teacher comparison · all selected sections',teacherGroups(rows));
  report.append(el('p',entered.length+' / '+rows.length+' paper results recorded'),button('View entered '+exam.short+' marks',()=>showMarks(entered)));
  report.append(el('h3','Remedial target students'),el('p',gradingNote));
  const targets=el('div',undefined,'pb1-remedial-targets');
  for(const [band,label] of [['critical','Critical fail'],['red','Fail'],['yellow','Borderline pass']]){
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
  const cls=control(choicesBar,'Standard'),paper=control(choicesBar,'Class / section and subject');
  options(cls,values(data.scopes,'classId').map(value=>[value,value]));
  function drawChoices(){
   options(paper,data.scopes.flatMap((scope,index)=>scope.classId===cls.value?[[String(index),scope.section+' · '+scope.subject]]:[]));
   drawMarks();
  }
  const canSwitch=()=>!host.querySelector('[data-portal-dirty=true]')||confirm('Discard unsaved marks?');
  let previousClass=cls.value,previousPaper='';
  cls.onchange=()=>{if(canSwitch()){previousClass=cls.value;drawChoices();}else cls.value=previousClass;};
  paper.onchange=()=>{if(canSwitch())drawMarks();else paper.value=previousPaper;};
  drawChoices();
  function drawMarks(){
   previousPaper=paper.value;
   const index=Number(paper.value),scope=data.scopes[index],rows=data.rows.filter(row=>row.scope===index);
   const monthlyMM=maximumLabel(rows.map(row=>row.before?.maximum)),pb1MM=maximumLabel([scope.maximum]);
   const maxima=el('div',undefined,'pb1-stats');
   for(const [label,value] of [[exam.previous,monthlyMM],[exam.current,pb1MM]]){
    const item=el('div');item.append(el('span',label),el('strong',value));maxima.append(item);
   }
   host.replaceChildren(el('h3','Class '+scope.classId+' '+scope.section+' · '+scope.subject),maxima,
    el('p','Each percentage uses the marks earned divided by that exam’s maximum.'));
   if(scope.approvedAt){
    host.append(el('p','Approved and frozen · '+new Date(scope.approvedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),'task-monitoring-notice'));
    table(host,['Roll','Student',exam.baseline+' marks ('+monthlyMM+')','Approved '+exam.short+' marks ('+pb1MM+')'],
     rows.map(row=>[row.roll,row.name,result(row.before),result(row.current)]));
    return;
   }
   const missing=rows.filter(row=>!row.current).length;
   host.append(el('p','Enter '+exam.short+' marks. If a student was absent, type ABS. A blank keeps any saved result.'));
   if(approve){
    const ready=rows.length>0&&!missing;
    const action=button('Approve and freeze '+exam.short+' marks',async()=>{
     if(host.querySelector('[data-portal-dirty=true]'))throw Error('Save your mark changes before approval.');
     if(confirm('Approve and freeze this paper?'+(exam.mission?' Mission 100 will use these marks as the latest result.':''))){
      data=await approve(scope,data.revision);drawMarks();
     }
    });
    action.disabled=!ready;
    host.append(el('p',ready?'All enrolled students have marks or AB recorded.':missing+' enrolled students still need a mark or AB.'),action);
   }
   const editor=el('form');editor.dataset.portalTrackDirty='true';
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
   if(pin){pin.type='password';pin.required=true;pin.autocomplete='off';pin.inputMode='numeric';}
   editor.append(el('button','Save '+exam.short+' marks'));host.append(editor);
   const saveMarks=()=>run(async()=>{
    const changed=inputs.filter(({input,original})=>input.value.trim()&&input.value.trim()!==original).map(({row,input})=>{
     const value=input.value.trim().toUpperCase();
     const absent=value==='ABS'||value==='AB';
     if(!absent&&(!/^\d+(?:\.\d+)?$/.test(value)||Number(value)>scope.maximum))throw Error('Enter ABS or marks from 0 to '+scope.maximum+' for '+row.name+'.');
     return {key:row.key,mark:absent?'AB':Number(value)};
    });
    if(!changed.length)throw Error('No mark changes to save.');
    const secret=pin?.value;if(pin)pin.value='';
    const next=await save(scope,data.revision,changed,secret);
    editor.dataset.portalDirty='false';data=next;drawMarks();
   });
   editor.onsubmit=event=>{
    event.preventDefault();
    const blanks=inputs.filter(({row,input})=>!row.current&&!input.value.trim());
    if(!blanks.length){saveMarks();return;}
    const dialog=el('dialog',undefined,'task-start-dialog pb1-student-dialog');
    const title=el('h2',blanks.length===1?'1 student needs a result':blanks.length+' students need results');
    title.id='pb1-missing-marks-title';dialog.setAttribute('aria-labelledby',title.id);
    const students=el('ul');
    for(const {row} of blanks)students.append(el('li',row.name));
    const fill=el('button','Continue filling marks');fill.type='button';fill.onclick=()=>dialog.close();
    dialog.append(title,el('p','Please fill in the marks. If a student was absent, type ABS.'),students,fill);
    let savingPartial=false;
    if(inputs.some(({input,original})=>input.value.trim()&&input.value.trim()!==original)){
     const partial=el('button','Save entered marks only');partial.type='button';
     partial.onclick=()=>{savingPartial=true;dialog.close();saveMarks();};
     dialog.append(partial);
    }
    dialog.addEventListener('close',()=>{dialog.remove();if(!savingPartial)blanks[0].input.focus();},{once:true});
    document.body.append(dialog);dialog.showModal();fill.focus();
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
 }
 drawMode();
}
