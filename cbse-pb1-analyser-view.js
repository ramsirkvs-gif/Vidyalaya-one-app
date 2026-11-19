import {el,options} from './cbse-ui.js';
import {pb1Metrics,pb1Risk,pb1CategoryCounts,pb1SmartSummary,pb1SmartStudents} from './cbse-pb1-analyser-model.js';
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
const cohortHeaders=['Group','Paired / enrolled','Previous pass','PB-1 pass','Pass change','Previous average','PB-1 average','Average change','Remark'];
const scopeTeachers=scope=>scope.teachers||(scope.teacher?[{key:scope.teacher,name:scope.teacher}]:[]);
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
function renderCategoryComparison(parent,previous,current,showList){
 parent.append(el('h3','Mission 100 result categories'),el('p',gradingNote));
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
  const title=label+' · '+(period==='before'?'Monthly':'PB-1');
  cell.append(el('strong',String(value)),studentListButton('View students',title,()=>showList(title,period,filter)));
  return cell;
 };
 table(parent,['Category','Latest monthly test','Preboard 1'],rows.map(([label,a,b,band,filter])=>[
  el('span',label,band?'band '+band:undefined),countCell(a,'before',label,filter),countCell(b,'current',label,filter),
 ]));
 parent.append(el('p','Counts are by student and subject. Total fail includes critical fails. The enrolled pass percentage includes AB and pending entries in the denominator. Pending entries remain provisional.'));
}
function renderSmartAnalysis(parent,rows,showList){
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
  ['Students failed',outOf(stats.failed),'decline',student=>student.failed],
  ['Critical fail',outOf(stats.critical),'decline',student=>student.critical],
  ['Borderline pass',outOf(stats.borderline),'border',student=>student.borderline],
  ['Scored 90%+',outOf(stats.score90),'pass',student=>student.percentage>=90],
  ['Scored 75%+',outOf(stats.score75),'pass',student=>student.percentage>=75],
  ['Scored 50%+',outOf(stats.score50),'result',student=>student.percentage>=50],
  ['Monthly → PB-1 pass rate',pct(previous)+' → '+pct(current),'result'],
  ['Change vs monthly',delta(previous,current),current==null?'result':current>=previous?'pass':'decline'],
  ['Absent · Retest awaited',stats.absent+' / '+stats.students,'border',student=>student.absent],
  ['Marks entry pending',stats.pending+' / '+stats.students,'border',student=>student.pending],
  ['Incomplete coverage',stats.incomplete+' / '+stats.students,'border',student=>student.incomplete],
 ];
 for(const [label,value,style,filter] of items){
  const tile=el('div',undefined,'pb1-stat-'+style);tile.append(el('span',label),el('strong',value));
  if(filter&&parseInt(value,10)>0)tile.append(studentListButton('View students',label,()=>showList(label,filter)));
  strip.append(tile);
 }
 parent.append(el('h3','Smart analysis · at a glance'),strip,
  el('p','Counts are by student. The appeared result uses the PB-1 papers each student appeared for. The enrolled result counts a student as passed only after every selected enrolled paper has an appeared pass. AB counts as a non-pass there. Blank marks are pending, so the enrolled result is provisional until entry is complete. Retest awaited and pending can overlap across subjects.'),
  el('p','Score bands overlap and use each student’s average paper percentage. The monthly comparison uses matching appeared papers for '+stats.paired+' students.'));
}
function renderMarksGraph(parent,grouped){
 const graph=el('div',undefined,'pb1-marks-graph');
 for(const [label,rows] of grouped){
  const article=el('section');article.append(el('h4',label));
  const paired=rows.filter(row=>row.before?.percentage!=null&&row.current?.percentage!=null);
  for(const [key,title] of [['before','Latest monthly marks'],['current','Preboard 1']]){
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
export function renderPB1Analyser(host,data,{run,button,save,approve,back,teacher,publicView,entryOnly,openEntry,refresh}){
 const card=el('section',undefined,'task-card pb1-analyser'),toolbar=el('div',undefined,'task-actions'),content=el('div');
 const filters=el('div',undefined,'pb1-filters'),report=el('div');
 let entering=entryOnly,entryAction;
 card.append(el('h2',entryOnly?'Update PB-1 marks':'Pre-Samagam Wisdom Analyser'),
  el('p',teacher?'Your assigned Preboard 1 papers':publicView?'Classes X and XII · Public student labels are coded':'Classes X and XII · Preboard 1'),content);
 host.replaceChildren(button(entryOnly?'Back to Wisdom Analyser':'Back to task list',back),card);
 const classSelect=control(filters,'Standard'),subjectSelect=control(filters,'Subject'),teacherSelect=control(filters,'Teacher'),sectionSelect=control(filters,'Class / section');
 const values=(scopes,key)=>[...new Set(scopes.map(info=>info[key]).filter(Boolean))].sort();
 options(classSelect,choices(values(data.scopes,'classId'),'All standards'),'');
 const runAnalysis=button('Get smart analysis',async()=>{
  if(content.querySelector('[data-portal-dirty=true]')&&!confirm('Discard unsaved marks?'))return;
  if(refresh){
   data=await refresh();
   options(classSelect,choices(values(data.scopes,'classId'),'All standards'),classSelect.value);
   restrict();
  }
  if(entering){entering=false;drawMode();}
  drawReport();report.scrollIntoView({block:'start'});
 });
 runAnalysis.classList.add('pb1-primary-action');
 toolbar.append(runAnalysis);
 if(openEntry)toolbar.append(button('Update PB-1 marks',openEntry));
 else if(save&&!entryOnly){
  entryAction=button('Update PB-1 marks',()=>{entering=true;drawMode();});
  toolbar.append(entryAction);
 }
 function restrict(){
  const scopes=data.scopes.filter(info=>!classSelect.value||info.classId===classSelect.value);
  options(subjectSelect,choices(values(scopes,'subject'),'All subjects'),subjectSelect.value);
  const subjects=scopes.filter(info=>!subjectSelect.value||info.subject===subjectSelect.value);
  const teachers=new Map(subjects.flatMap(info=>scopeTeachers(info)).map(({key,name})=>[key,name]));
  options(teacherSelect,[['','All teachers'],...[...teachers].sort((a,b)=>a[1].localeCompare(b[1]))],teacherSelect.value);
  const assigned=subjects.filter(info=>!teacherSelect.value||scopeTeachers(info).some(person=>person.key===teacherSelect.value));
  options(sectionSelect,choices(values(assigned,'section'),'All sections'),sectionSelect.value);
 }
 restrict();
 classSelect.onchange=subjectSelect.onchange=teacherSelect.onchange=()=>{restrict();report.replaceChildren();};
 sectionSelect.onchange=()=>report.replaceChildren();
 function scopeMatches(info){
  return (!classSelect.value||info.classId===classSelect.value)&&(!sectionSelect.value||info.section===sectionSelect.value)&&(!subjectSelect.value||info.subject===subjectSelect.value)&&(!teacherSelect.value||scopeTeachers(info).some(person=>person.key===teacherSelect.value));
 }
 const info=row=>data.scopes[row.scope];
 const sectionLabel=row=>info(row).classId+' '+info(row).section;
 function showCohorts(parent,title,grouped){
  parent.append(el('h3',title));
  table(parent,cohortHeaders,[...grouped].map(([label,group])=>cohortRow(label,group)));
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
  const monthlyMM=maximumLabel(rows.map(row=>row.before?.maximum));
  const pb1MM=maximumLabel(rows.map(row=>row.current?.maximum??info(row).maximum));
  table(parent,['Student',...(publicView?[]:['Roll']),'Class','Subject','Previous exam','Monthly marks ('+monthlyMM+')','PB-1 marks ('+pb1MM+')','Change','PB-1 result','PB-1 approval'],rows.map(row=>[
   row.name,...(publicView?[]:[row.roll]),sectionLabel(row),info(row).subject,row.before?.exam||'—',result(row.before),result(row.current),delta(row.before?.percentage,row.current?.percentage),
   !row.current?'Not entered':row.current.absent?'Absent':({critical:'Critical fail',red:'Other fail',yellow:'Borderline pass',pass:'Pass',green:'Secure pass'})[row.current.band]||'Not assessed',
   info(row).approvedAt?'Approved · frozen':row.current?'Awaiting approval':'—',
  ]));
 }
 function showSupport(parent,rows){
  const names=ids=>ids.map(id=>data.scopes[id].subject).join(', ')||'—';
  const risk=pb1Risk(rows).filter(({failed,borderline,unavailable})=>failed.length||borderline.length||unavailable.length);
  table(parent,['Student','Class','Failed subjects','Borderline subjects','Absent or missing'],risk.map(row=>[row.name,sectionLabel(row),names(row.failed),names(row.borderline),names(row.unavailable)]));
 }
 function showStudentList(title,period,papers){
  const dialog=el('dialog',undefined,'task-start-dialog pb1-student-dialog'),heading=el('h2',title),results=el('div');
  heading.id='pb1-student-list-title';dialog.setAttribute('aria-labelledby',heading.id);
  const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();
  dialog.append(heading,close);
  const search=control(dialog,'Search student list','input');search.type='search';
  const students=[...groups(papers,row=>row.key).values()];
  dialog.append(el('p',students.length+' students'),results);
  function drawList(){
   const query=search.value.trim().toLowerCase();
   const matches=students.filter(group=>[group[0].name,group[0].roll,sectionLabel(group[0])].join(' ').toLowerCase().includes(query));
   results.replaceChildren();
   table(results,['Student',...(publicView?[]:['Roll']),'Class',period==='before'?'Monthly marks':'PB-1 marks'],matches.map(group=>{
    const student=group[0],marks=el('span',group.map(row=>info(row).subject+' · '+result(row[period])).join('\n'),'pb1-list-marks');
    return [student.name,...(publicView?[]:[student.roll]),sectionLabel(student),marks];
   }));
  }
  search.oninput=drawList;drawList();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
 }
 function drawReport(){
  report.replaceChildren();
  const rows=data.rows.filter(row=>scopeMatches(info(row)));
  if(!rows.length){report.append(el('p','No records match these filters.'));return;}
  if(!rows.some(row=>row.current)){
   report.append(el('p','PB-1 marks have not been uploaded for this selection. Please upload the marks, then return here to analyse the results.','task-monitoring-notice'));
   return;
  }
  const sections=[...new Set(rows.map(sectionLabel))].sort();
  const selectedTeacher=teacherSelect.value?teacherSelect.selectedOptions[0]?.textContent:'';
  report.append(el('p',[selectedTeacher,subjectSelect.value||'All subjects',sections.join(', ')].filter(Boolean).join(' · '),'pb1-scope-summary'));
  renderSmartAnalysis(report,rows,(title,filter)=>showStudentList(title,'current',pb1SmartStudents(rows).filter(filter).flatMap(student=>student.papers)));
  renderCategoryComparison(report,pb1CategoryCounts(rows,'before'),pb1CategoryCounts(rows,'current'),
   (title,period,filter)=>showStudentList(title,period,rows.filter(row=>filter(row[period]))));
  report.append(el('h3','Monthly and PB-1 marks by section'));
  renderMarksGraph(report,groups(rows,sectionLabel));
  showCohorts(report,'Standard and section comparison',[
   ...groups(rows,row=>'Class '+info(row).classId+' · all selected sections'),...groups(rows,sectionLabel),
  ]);
  showCohorts(report,'Subject comparison',groups(rows,row=>info(row).classId+' · '+info(row).subject));
  showCohorts(report,'Teacher comparison · all selected sections',teacherGroups(rows));
  report.append(el('h3','Student-by-student comparison'));
  const comparison=el('div'),search=control(report,'Search student results','input');search.type='search';
  search.oninput=()=>{
   const query=search.value.trim().toLowerCase();
   comparison.replaceChildren();
   showStudentComparison(comparison,rows.filter(row=>[row.name,row.roll,sectionLabel(row),info(row).subject].join(' ').toLowerCase().includes(query)));
  };
  search.oninput();report.append(comparison,el('h3','Students needing support in PB-1'));
  showSupport(report,rows);
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
   for(const [label,value] of [['Latest monthly test',monthlyMM],['Preboard 1',pb1MM]]){
    const item=el('div');item.append(el('span',label),el('strong',value));maxima.append(item);
   }
   host.replaceChildren(el('h3','Class '+scope.classId+' '+scope.section+' · '+scope.subject),maxima,
    el('p','Each percentage uses the marks earned divided by that exam’s maximum.'));
   if(scope.approvedAt){
    host.append(el('p','Approved and frozen · '+new Date(scope.approvedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),'task-monitoring-notice'));
    table(host,['Roll','Student','Monthly marks ('+monthlyMM+')','Approved PB-1 marks ('+pb1MM+')'],
     rows.map(row=>[row.roll,row.name,result(row.before),result(row.current)]));
    return;
   }
   const missing=rows.filter(row=>!row.current).length;
   host.append(el('p','Enter PB-1 marks. If a student was absent, type ABS. A blank keeps any saved result.'));
   if(approve){
    const ready=rows.length>0&&!missing;
    const action=button('Approve and freeze PB-1 marks',async()=>{
     if(host.querySelector('[data-portal-dirty=true]'))throw Error('Save your mark changes before approval.');
     if(confirm('Approve and freeze this paper? Mission 100 will use these marks as the latest result.')){
      data=await approve(scope,data.revision);drawMarks();
     }
    });
    action.disabled=!ready;
    host.append(el('p',ready?'All enrolled students have marks or AB recorded.':missing+' enrolled students still need a mark or AB.'),action);
   }
   const editor=el('form');editor.dataset.portalTrackDirty='true';
   const inputs=rows.map(row=>{
    const input=el('input');input.setAttribute('aria-label','PB-1 marks for '+row.name);input.autocomplete='off';input.maxLength=12;
    const previousMaximumDiffers=row.current&&row.current.maximum!==scope.maximum;
    input.value=row.current&&!previousMaximumDiffers?(row.current.absent?'AB':String(row.current.score)):'';
    const entry=el('div');entry.append(input);
    if(previousMaximumDiffers)entry.append(el('small','Saved: '+result(row.current)));
    return {row,input,entry,original:input.value};
   });
   table(editor,['Roll','Student','Monthly marks ('+monthlyMM+')','PB-1 marks ('+pb1MM+')'],inputs.map(({row,entry})=>[row.roll,row.name,result(row.before),entry]));
   const pin=teacher?control(editor,'Personal PIN to save','input'):null;
   if(pin){pin.type='password';pin.required=true;pin.autocomplete='off';pin.inputMode='numeric';}
   editor.append(el('button','Save PB-1 marks'));host.append(editor);
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
   else content.append(el('p','No Preboard 1 papers are available for this view.'));
   return;
  }
  content.append(filters,toolbar,report);
 }
 drawMode();
}
