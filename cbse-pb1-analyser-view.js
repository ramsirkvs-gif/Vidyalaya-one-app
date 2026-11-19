import {el,options} from './cbse-ui.js';
const pct=v=>v==null?'—':v.toFixed(1)+'%';
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
export function renderPB1Analyser(host,data,{run,button,save,approve,back,teacher,publicView,entryOnly,openEntry,openNames,refresh}){
 const card=el('section',undefined,'task-card pb1-analyser'),toolbar=el('div',undefined,'task-actions'),content=el('div');
 const filters=el('div',undefined,'pb1-filters'),report=el('div');
 let entering=entryOnly,entryAction;
 const description=el('p',teacher?'Your assigned Preboard 1 papers':publicView?'Classes X and XII · Public student labels are coded':'Classes X and XII · Preboard 1');
 card.append(el('h2',entryOnly?'Update PB-1 marks':'Pre-Samagam Wisdom Analyser'),description,content);
 host.replaceChildren(button(entryOnly?'Back to Wisdom Analyser':'Back to task list',back),card);
 const classSelect=control(filters,'Standard'),subjectSelect=control(filters,'Subject'),teacherSelect=control(filters,'Teacher'),sectionSelect=control(filters,'Class / section');
 const values=(scopes,key)=>[...new Set(scopes.map(info=>info[key]).filter(Boolean))].sort();
 options(classSelect,choices(values(data.scopes,'classId'),'All standards'),'');
 const runAnalysis=button('Get smart analysis',async()=>{
  if(content.querySelector('[data-portal-dirty=true]')&&!confirm('Discard unsaved marks?'))return;
  if(refresh){
   data=await refresh(!publicView);
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
 classSelect.onchange=subjectSelect.onchange=teacherSelect.onchange=()=>{restrict();hasReport=false;report.replaceChildren();};
 sectionSelect.onchange=()=>{hasReport=false;report.replaceChildren();};
 function scopeMatches(info){
  return (!classSelect.value||info.classId===classSelect.value)&&(!sectionSelect.value||info.section===sectionSelect.value)&&(!subjectSelect.value||info.subject===subjectSelect.value)&&(!teacherSelect.value||scopeTeachers(info).some(person=>person.key===teacherSelect.value));
 }
 const info=row=>data.scopes[row.scope];
 const sectionLabel=row=>info(row).classId+' '+info(row).section;
 function marksList(parent,rows){
  const list=el('ul',undefined,'pb1-compact-marks');
  for(const group of groups(rows,row=>row.key).values()){
   const student=group[0],item=el('li');
   item.append(el('strong',student.name),el('small',sectionLabel(student)));
   for(const row of group){
    const paper=el('div',undefined,'pb1-compact-paper');
    paper.append(el('span',info(row).subject),el('strong',result(row.current)));item.append(paper);
   }
   list.append(item);
  }
  parent.append(list);
 }
 function showEnteredMarks(rows){
  const dialog=el('dialog',undefined,'task-start-dialog pb1-student-dialog'),heading=el('h2','Entered PB-1 marks'),results=el('div');
  heading.id='pb1-entered-marks-title';dialog.setAttribute('aria-labelledby',heading.id);
  const close=el('button','Close');close.type='button';close.onclick=()=>dialog.close();
  dialog.append(heading,close);
  const search=control(dialog,'Search students','input');search.type='search';
  const update=()=>{
   const query=search.value.trim().toLowerCase(),matching=rows.filter(row=>[row.name,sectionLabel(row),info(row).subject].join(' ').toLowerCase().includes(query));
   results.replaceChildren();
   if(matching.length)marksList(results,matching);
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
   description.textContent='Classes X and XII · Staff viewing';
   restrict();
   if(hasReport)drawReport();
  });
  toolbar.append(names);
 }
 function drawReport(){
  hasReport=true;report.replaceChildren();
  const rows=data.rows.filter(row=>scopeMatches(info(row))),entered=rows.filter(row=>row.current);
  if(!rows.length){report.append(el('p','No students match this selection.'));return;}
  if(!entered.length){
   report.append(el('p','PB-1 marks have not been uploaded for this selection. Please enter the marks to see remedial targets.','task-monitoring-notice'));
   return;
  }
  const sections=[...new Set(rows.map(sectionLabel))].sort();
  const selectedTeacher=teacherSelect.value?teacherSelect.selectedOptions[0]?.textContent:'';
  report.append(el('p',[selectedTeacher,subjectSelect.value||'All subjects',sections.join(', ')].filter(Boolean).join(' · '),'pb1-scope-summary'));
  report.append(el('p',entered.length+' / '+rows.length+' paper results recorded'),button('View entered PB-1 marks',()=>showEnteredMarks(entered)));
  report.append(el('h3','Remedial target students'),el('p',gradingNote));
  const targets=el('div',undefined,'pb1-remedial-targets');
  for(const [band,label] of [['critical','Critical fail'],['red','Fail'],['yellow','Borderline pass']]){
   const matching=entered.filter(row=>row.current.band===band),section=el('section',undefined,'pb1-target-'+band);
   section.append(el('h4',label+' · '+new Set(matching.map(row=>row.key)).size));
   if(matching.length)marksList(section,matching);else section.append(el('p','No students in this category.'));
   targets.append(section);
  }
  report.append(targets);
  const mission=el('a','Open Mission Perfect 100 for the full academic study');
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
