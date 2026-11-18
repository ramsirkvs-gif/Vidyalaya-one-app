import {ROLL_CHECKS,LEAVE_CHECKS,MORNING_PRESENT_CHECKS,MORNING_FIRST_HALF_CHECKS} from './cbse-roll-call-defaults.js';
import {AFTERNOON_QUESTIONS} from './cbse-afternoon-checklist.js';
import {primaryStaffEntry} from './cbse-primary-roster.js';
import {compareRollStaff,rollDisplayName,rollStaffIdentityIds,secondaryStaffEntry} from './cbse-roll-call-roster.js';
import {el} from './cbse-ui.js';

function reportQuestions(report){
 if(Array.isArray(report.questionSnapshot))return report.questionSnapshot;
 const answers=report.answers||{};
 if(report.period==='afternoon'&&Object.hasOwn(answers,'afternoon_check_1'))return AFTERNOON_QUESTIONS;
 const choices=report.morningMode==='first'||Object.hasOwn(answers,'instant_group')?MORNING_FIRST_HALF_CHECKS:
  report.morningMode==='present'||Object.hasOwn(answers,'morning_biometric')?MORNING_PRESENT_CHECKS:
  report.reported==='no'||report.halfDay==='first'?LEAVE_CHECKS:ROLL_CHECKS;
 return choices.map(([id,label])=>({id,label}));
}
export function rollCallCommitments(reports,staff,{period,from='',to=''}){
 const latest=new Map();
 for(const report of Object.values(reports||{})){
  if(report.period!==period||!report.staffId||!report.date||from&&report.date<from||to&&report.date>to)continue;
  const id=[...rollStaffIdentityIds(staff,report.staffId)].sort()[0],key=JSON.stringify([id,report.date]);
  const previous=latest.get(key)?.report;
  if(!previous||Number(previous.updatedAt||previous.submittedAt||0)<=Number(report.updatedAt||report.submittedAt||0))latest.set(key,{id,report});
 }
 const people=new Map(),questions=new Map();
 for(const {id,report} of [...latest.values()].sort((a,b)=>b.report.date.localeCompare(a.report.date))){
  const profile=staff[report.staffId]||staff[id],name=rollDisplayName(profile?.name||report.name||'Unknown staff');
  const designation=profile?.designation||report.designation||primaryStaffEntry({name})?.designation||secondaryStaffEntry({name})?.designation||'';
  if(!people.has(id))people.set(id,{name,designation,days:0,yes:new Map()});
  const person=people.get(id);person.days++;
  for(const [index,question]of reportQuestions(report).entries()){
   if(question.type==='text'||!Object.hasOwn(report.answers||{},question.id))continue;
   if(!questions.has(question.id))questions.set(question.id,{id:question.id,number:index+1,label:question.label});
   if(report.answers[question.id]==='yes')person.yes.set(question.id,(person.yes.get(question.id)||0)+1);
  }
 }
 return {people:[...people.values()].sort(compareRollStaff),questions:[...questions.values()]};
}

export function renderRollCallCommitments(parent,data){
 const filters=el('div',undefined,'roll-directory-actions');
 const date=(text)=>{
  const label=el('label',text),input=el('input');
  input.type='date';input.setAttribute('aria-label',text);label.append(input);filters.append(label);return input;
 };
 const from=date('From date'),to=date('To date'),results=el('div');
 parent.append(el('h3','Roll Call commitments'),el('p','Each Yes counts as one commitment. Totals use the latest saved Roll Call for each teacher, date and period. Written answers are excluded. Leave both dates blank to include all saved dates.'),filters,results);
 const draw=()=>{
  results.replaceChildren();
  if(from.value&&to.value&&from.value>to.value){results.append(el('p','Choose a To date on or after the From date.'));return;}
  for(const [period,label]of [['morning','Morning Roll Call'],['afternoon','Afternoon Roll Call']]){
   results.append(el('h4',label));
   const {people,questions}=rollCallCommitments(data.rollCall.reports,data.reportStaff||data.staff,{period,from:from.value,to:to.value});
   if(!people.length){results.append(el('p','No saved reports for this period and date range.'));continue;}
   const scroll=el('div',undefined,'roll-commitment-scroll'),table=el('table',undefined,'roll-commitment-table'),head=el('thead'),row=el('tr'),body=el('tbody');
   for(const title of ['Teacher','Designation','Reports',...questions.map(q=>'Q'+q.number+' · '+q.label)]){const th=el('th',title);th.scope='col';row.append(th);}
   head.append(row);
   for(const person of people){
    const tr=el('tr'),name=el('th',person.name);name.scope='row';tr.append(name);
    for(const value of [person.designation||'—',person.days,...questions.map(q=>person.yes.get(q.id)||0)])tr.append(el('td',String(value)));
    body.append(tr);
   }
   table.append(head,body);scroll.append(table);results.append(scroll);
  }
 };
 from.onchange=to.onchange=draw;draw();
}
