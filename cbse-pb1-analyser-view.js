import {el,options} from './cbse-ui.js';
import {pb1Metrics,pb1Risk,pb1CategoryCounts} from './cbse-pb1-analyser-model.js';
const pct=v=>v==null?'—':v.toFixed(1)+'%';
const delta=(before,after)=>before==null||after==null?'—':(after-before>0?'+':'')+(after-before).toFixed(1)+' pp';
const result=mark=>!mark?'Not entered':mark.absent?'AB (MM '+mark.maximum+')':mark.score+'/'+mark.maximum+' ('+pct(mark.percentage)+')';
const choices=(items,label)=>[['',label],...items.map(value=>[value,value])];
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
function cohortRow(label,rows){
 const m=pb1Metrics(rows),change=m.currentPass==null?null:m.currentPass-m.beforePass;
 return [label,m.paired+' / '+m.total,pct(m.beforePass),pct(m.currentPass),delta(m.beforePass,m.currentPass),
  pct(m.beforeAverage),pct(m.currentAverage),delta(m.beforeAverage,m.currentAverage),
  change==null?'Awaiting comparable results':change>0?'Pass rate increased':change<0?'Pass rate decreased':'Pass rate steady'];
}
function renderCategoryComparison(parent,previous,current){
 parent.append(el('h3','Mission 100 result categories'));
 const critical=summary=>summary.criticalCovered?summary.critical:'—';
 const rows=[
  ['Critical fail',critical(previous),critical(current),'critical'],
  ['Other fail',previous.red,current.red,'red'],
  ['Total fail',previous.failed,current.failed,'red'],
  ['Borderline',previous.yellow,current.yellow,'yellow'],
  ['Secure pass',previous.green,current.green,'green'],
  ['Total pass',previous.passed,current.passed,'green'],
  ['Pass percentage',pct(previous.passPercentage),pct(current.passPercentage),'green'],
  ['Absent (AB)',previous.absent,current.absent,'grey'],
  ['Not recorded',previous.missing,current.missing,'grey'],
  ['Appeared',previous.appeared,current.appeared,''],
  ['Average percentage',pct(previous.average),pct(current.average),''],
 ];
 table(parent,['Category','Latest monthly test','Preboard 1'],rows.map(([label,a,b,band])=>[
  el('span',label,band?'band '+band:undefined),a,b,
 ]));
 const limited=[['monthly',previous],['PB-1',current]].filter(([,summary])=>summary.appeared>summary.criticalCovered);
 const note=limited.length?' Critical-fail rules cover '+limited.map(([label,summary])=>summary.criticalCovered+' of '+summary.appeared+' appeared '+label+' results').join(' and ')+'. Total fail includes all recorded failures.':'';
 parent.append(el('p','Counts are by student and subject. Pass percentage is based on appeared papers. AB and missing marks are counted separately.'+note));
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
export function renderPB1Analyser(host,data,{run,button,save,back,teacher,publicView,entryOnly,openEntry,refresh}){
 const card=el('section',undefined,'task-card pb1-analyser'),toolbar=el('div',undefined,'task-actions'),content=el('div');
 const filters=el('div',undefined,'pb1-filters'),report=el('div'),modes=[];
 if(save&&!entryOnly)modes.push(['entry','Update PB-1 marks']);
 if(!entryOnly)modes.push(['comparison','Compare each student'],['classes','Class and standard comparison'],
  ['subjects','Subject improvement'],['teachers','Teacher cohort comparison'],['graphs','Marks graphs'],['risk','Students needing support']);
 let selected=entryOnly?'entry':'comparison';
 const reportTabs=modes.map(([key,label])=>button(label,()=>{
  if(content.querySelector('[data-portal-dirty=true]')&&!confirm('Discard unsaved marks?'))return;
  selected=key;drawMode();
 }));
 card.append(el('h2',entryOnly?'Update PB-1 marks':'Pre-Samagam Wisdom Analyser'),
  el('p',teacher?'Your assigned Preboard 1 papers':publicView?'Classes X and XII · Student labels are anonymized':'Classes X and XII · Preboard 1'),toolbar,content);
 toolbar.append(...reportTabs);
 if(openEntry)toolbar.append(button('Update PB-1 marks',openEntry));
 if(refresh)toolbar.append(button('Refresh results',async()=>{
  const hadMarks=data.rows.some(row=>row.current);
  data=await refresh();
  options(classSelect,choices(values(data.scopes,'classId'),'All standards'),classSelect.value);
  if(!hadMarks&&data.rows.some(row=>row.current))riskPeriod.value='current';
  restrict();drawMode();
 }));
 host.replaceChildren(button(entryOnly?'Back to Wisdom Analyser':'Back to task list',back),card);
 if(!data.scopes.length){
  if(entryOnly)toolbar.replaceChildren();
  else if(refresh)toolbar.replaceChildren(button('Refresh results',async()=>renderPB1Analyser(host,await refresh(),{run,button,save,back,teacher,publicView,entryOnly,openEntry,refresh})));
  content.append(el('p','No Preboard 1 papers are available for this view.'));return;
 }
 const classSelect=control(filters,'Standard'),sectionSelect=control(filters,'Class / section'),subjectSelect=control(filters,'Subject'),teacherSelect=control(filters,'Teacher');
 const search=control(filters,'Master search','input');search.type='search';search.placeholder=publicView?'Student label, class, subject or teacher':'Student, roll, class, subject or teacher';
 const values=(scopes,key)=>[...new Set(scopes.map(info=>info[key]).filter(Boolean))].sort();
 options(classSelect,choices(values(data.scopes,'classId'),'All standards'),'');
 const riskFilter=control(filters,'Support list');
 options(riskFilter,[['','All support cases'],['one','One subject failed'],['multi','Two or more subjects failed'],['border','Borderline pass'],['missing','Absent or missing marks']],'');
 const riskPeriod=control(filters,'Categorize from');
 options(riskPeriod,[['before','Latest monthly marks'],['current','Preboard 1']],data.rows.some(row=>row.current)?'current':'before');
 const graphBy=control(filters,'Graph by');
 options(graphBy,[['subject','Subject'],['student','Student and subject']],'subject');
 function restrict(){
  const scopes=data.scopes.filter(info=>!classSelect.value||info.classId===classSelect.value);
  options(sectionSelect,choices(values(scopes,'section'),'All sections'),sectionSelect.value);
  options(subjectSelect,choices(values(scopes,'subject'),'All subjects'),subjectSelect.value);
  options(teacherSelect,choices(values(scopes,'teacher'),'All teachers'),teacherSelect.value);
 }
 restrict();
 classSelect.onchange=()=>{restrict();drawReport();};
 sectionSelect.onchange=subjectSelect.onchange=teacherSelect.onchange=riskFilter.onchange=riskPeriod.onchange=graphBy.onchange=drawReport;search.oninput=drawReport;
 function scopeMatches(info){
  return (!classSelect.value||info.classId===classSelect.value)&&(!sectionSelect.value||info.section===sectionSelect.value)&&(!subjectSelect.value||info.subject===subjectSelect.value)&&(!teacherSelect.value||info.teacher===teacherSelect.value);
 }
 function drawReport(){
  report.replaceChildren();
  const query=search.value.trim().toLowerCase();
  const matches=row=>{
   const info=data.scopes[row.scope];
   return scopeMatches(info)&&[row.name,row.roll,info.classId,info.section,info.subject,info.teacher].join(' ').toLowerCase().includes(query);
  };
  const rows=data.rows.filter(matches),m=pb1Metrics(rows);
  if(rows.length&&!m.recorded){
   report.append(el('p','PB-1 marks have not been uploaded for this selection. Please upload the marks, then return here to analyse the results.','task-monitoring-notice'));
   if(!['graphs','risk'].includes(selected))return;
  }
  const previous=pb1CategoryCounts(rows,'before'),current=pb1CategoryCounts(rows,'current');
  const stats=el('div',undefined,'pb1-stats');report.append(stats);
  for(const [label,value,style] of [['PB-1 paper pass rate',pct(current.passPercentage),'pass'],
   ['Paired pass-rate change',delta(m.beforePass,m.currentPass),m.currentPass==null?'':m.currentPass>=m.beforePass?'pass':'decline'],
   ['PB-1 entries',m.recorded+' / '+m.total,''],['Comparable results',m.paired,''],['PB-1 absent',m.absent,'']]){
   const item=el('div',undefined,style?'pb1-stat-'+style:undefined);item.append(el('span',label),el('strong',String(value)));stats.append(item);
  }
  if(selected==='comparison'){
   if(m.recorded)renderCategoryComparison(report,previous,current);
   const monthlyMM=maximumLabel(rows.map(row=>row.before?.maximum));
   const pb1MM=maximumLabel(rows.map(row=>row.current?.maximum??data.scopes[row.scope].maximum));
   table(report,['Student',...(publicView?[]:['Roll']),'Class','Subject','Previous exam','Monthly marks ('+monthlyMM+')','PB-1 marks ('+pb1MM+')','Change','PB-1 result'],rows.map(row=>{
    const info=data.scopes[row.scope];
    return [row.name,...(publicView?[]:[row.roll]),info.classId+' '+info.section,info.subject,row.before?.exam||'—',result(row.before),result(row.current),delta(row.before?.percentage,row.current?.percentage),
     !row.current?'Not entered':row.current.absent?'Absent':({critical:'Critical fail',red:'Other fail',yellow:'Borderline',green:'Secure pass'})[row.current.band]||'Not assessed'];
   }));
  }else if(selected==='risk'){
   const scopeIds=new Set(rows.map(row=>row.key));
   const risk=pb1Risk(data.rows.filter(row=>scopeIds.has(row.key)),riskPeriod.value).filter(row=>{
    const {failed,borderline,unavailable}=row;
    return riskFilter.value==='one'?failed.length===1:riskFilter.value==='multi'?failed.length>=2:riskFilter.value==='border'?borderline.length:riskFilter.value==='missing'?unavailable.length:failed.length||borderline.length||unavailable.length;
   });
   report.append(el('p','Borderline and other support categories follow Mission 100’s grading rules. Counts cover subjects visible in this view.'));
   const names=ids=>ids.map(id=>data.scopes[id].subject).join(', ')||'—';
   table(report,['Student','Class','Failed subjects','Borderline subjects','Absent or missing'],risk.map(row=>{
    const info=data.scopes[row.scope];return [row.name,info.classId+' '+info.section,names(row.failed),names(row.borderline),names(row.unavailable)];
   }));
  }else if(selected==='graphs'){
   report.append(el('p','Bars show average percentages. Where both tests have appeared results for the same students, the bars use that matched group. Otherwise each bar shows its available marks.'));
   const by=groups(rows,row=>{
    const info=data.scopes[row.scope],paper=info.classId+' '+info.section+' · '+info.subject;
    return graphBy.value==='student'?row.name+' · '+paper:paper;
   });
   renderMarksGraph(report,by);
  }else{
   const info=row=>data.scopes[row.scope];
   if(selected==='classes'){
    report.append(el('h3','Students passing all comparable enrolled papers'),el('p','This view uses students with appeared results in every visible enrolled paper in both periods.'));
    const matchingStudents=new Set(rows.map(row=>row.key));
    const complete=[...groups(data.rows.filter(row=>matchingStudents.has(row.key)),row=>row.key).values()]
     .filter(group=>group.every(row=>row.before?.percentage!=null&&row.current?.percentage!=null))
     .map(group=>({scope:group[0].scope,before:{failed:group.some(row=>row.before.failed)},current:{failed:group.some(row=>row.current.failed)}}));
    const pass=(group,key)=>group.length?group.filter(row=>!row[key].failed).length/group.length*100:null;
    const results=[];
    for(const key of [row=>info(row).classId,row=>info(row).classId+' '+info(row).section]){
     for(const [label,group] of groups(complete,key))results.push([label,group.length,pct(pass(group,'before')),pct(pass(group,'current')),delta(pass(group,'before'),pass(group,'current'))]);
    }
    table(report,['Standard / section','Students fully comparable','Previous pass rate','PB-1 pass rate','Change'],results);
   }
   report.append(el('h3',selected==='classes'?'Paper results by class and section':selected==='teachers'?'Results by assigned teacher and subject':'Results by subject'));
   const key=selected==='classes'?row=>info(row).classId+' '+info(row).section+' · '+info(row).subject:
    selected==='teachers'?row=>(info(row).teacher||'Unassigned')+' · '+info(row).classId+' · '+info(row).subject:
    row=>info(row).classId+' · '+info(row).subject;
   table(report,['Group','Paired / enrolled','Previous pass','PB-1 pass','Pass change','Previous average','PB-1 average','Average change','Remark'],
    [...groups(rows,key)].map(([label,group])=>cohortRow(label,group)));
   if(selected==='teachers')report.append(el('p','Teacher comparisons describe changes in assigned student results. They are a cohort measure.'));
  }
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
    el('p','Each percentage uses the marks earned divided by that exam’s maximum. Enter PB-1 marks or AB. A blank keeps the saved result.'));
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
   editor.onsubmit=event=>{event.preventDefault();run(async()=>{
    const changed=inputs.filter(({input,original})=>input.value.trim()&&input.value.trim()!==original).map(({row,input})=>{
     const value=input.value.trim().toUpperCase();
     if(value!=='AB'&&(!/^\d+(?:\.\d+)?$/.test(value)||Number(value)>scope.maximum))throw Error('Enter AB or marks from 0 to '+scope.maximum+' for '+row.name+'.');
     return {key:row.key,mark:value==='AB'?value:Number(value)};
    });
    if(!changed.length)throw Error('No mark changes to save.');
    const secret=pin?.value;if(pin)pin.value='';
    const next=await save(scope,data.revision,changed,secret);
    editor.dataset.portalDirty='false';data=next;drawMarks();
   });};
  }
 }
 function drawMode(){
  reportTabs.forEach((item,i)=>item.setAttribute('aria-pressed',String(modes[i][0]===selected)));
  content.replaceChildren();
  if(selected==='entry'){drawEntry();return;}
  riskFilter.parentElement.hidden=selected!=='risk';
  riskPeriod.parentElement.hidden=selected!=='risk';graphBy.parentElement.hidden=selected!=='graphs';
  content.append(el('p','Uses the latest Mission 100 monthly marks before Preboard 1. Comparisons use matching appeared results.'),filters,report);
  drawReport();
 }
 drawMode();
}
