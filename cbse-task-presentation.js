import {TASK_HEADERS,taskClasses,taskQuestions,taskCompatibleValues,taskQuestionIsWritten} from './cbse-task-manager-model.js';
import {el} from './cbse-ui.js';
export const PRESENTATION_TITLE='Status, Causes of Low Performance of Students of PM SHRI KV No. 1 Itanagar (Survey Report from Vidyalaya)';
const number=value=>Number.isSafeInteger(value)&&value>=0;
const sum=values=>values.reduce((a,b)=>a+b,0);
const palette=['#13786b','#d4e5df','#e8b14e','#567fb0','#a56b94','#699a53'];
function distribution(entries){const groups=new Map(),grades=new Set(entries.map(([c])=>c.split(' ')[0]));for(const [c,v]of entries){const label=grades.size>1?c.split(' ')[0]:c;groups.set(label,(groups.get(label)||0)+v);}return [...groups].map(([label,value])=>({label,value}));}
export function presentationData(task,staff={},additional=''){
 const config=task.published||task.draft,classes=taskClasses(config).filter(c=>/^(IX|X|XI|XII) /.test(c)),questions=taskQuestions(config),reports=task.reports||{};
 const fields=[...Object.entries(TASK_HEADERS).map(([id,label])=>({id,label,kind:'students',header:true})),...questions];
 if(fields.length>24)throw Error('This four-page presentation supports up to 24 questionnaire points. Prepare a shorter presentation questionnaire before generating it.');
 const sections=[['I · Class IX',classes.filter(c=>c.startsWith('IX '))],['II · Classes IX–XII consolidated',classes]].map(([title,scope])=>{
  const submitted=scope.filter(c=>reports[c]),compatible=Object.fromEntries(submitted.map(c=>[c,taskCompatibleValues(reports[c],config)]));
  const points=fields.map((q,index)=>{
   if(q.kind==='text')return {...q,number:index+1,written:true};
   const entries=scope.map(c=>[c,q.header?config.headers?.[c]?.[q.id]:compatible[c]?.[q.id]]).filter(([,v])=>number(v)),total=sum(entries.map(([,v])=>v));
   const denominators=entries.map(([c])=>config.headers?.[c]?.total),hasBase=q.id!=='total'&&q.kind==='students'&&entries.length>0&&denominators.every(number)&&entries.every(([,v],i)=>v<=denominators[i]);
   const base=hasBase?sum(denominators):null,segments=hasBase?[{label:'Reported',value:total},{label:'Remaining enrolment',value:base-total}]:distribution(entries);
   return {...q,number:index+1,total:entries.length?total:null,base,segments,coverage:entries.length,missing:scope.filter(c=>!entries.some(([x])=>x===c)),basis:hasBase?'Share of enrolment in covered classes':q.kind==='meetings'?'Meetings by class / grade':'Counts by class / grade'};
  });
  return {title,classes:scope,submitted,pending:scope.filter(c=>!reports[c]),enrolment:sum(scope.map(c=>config.headers?.[c]?.total).filter(number)),enrolmentClasses:scope.filter(c=>number(config.headers?.[c]?.total)).length,points};
 });
 const participants=new Map(),comments=[];
 for(const c of classes){const r=reports[c];if(!r)continue;const name=staff[r.submittedBy]?.name||'Name unavailable',key=r.submittedBy||c;if(!participants.has(key))participants.set(key,{name,classes:[]});participants.get(key).classes.push(c);
  for(const q of taskQuestions(r))if(taskQuestionIsWritten(q)&&String(r.values?.[q.id]||'').trim())comments.push({classId:c,name,label:q.label,text:r.values[q.id]});
  if(r.values?.remarks?.trim())comments.push({classId:c,name,label:'Overall situation — CT / Prime mentor / Survey IC',text:r.values.remarks});
 }
 if(task.comment?.trim())comments.push({classId:'Principal',name:'Principal',label:'Principal review',text:task.comment});
 return {title:PRESENTATION_TITLE,taskTitle:config.title,version:task.published?'Published questionnaire':'Saved private draft questionnaire',sections,participants:[...participants.values()].map(p=>p.name+' ('+p.classes.join(', ')+')'),additional:additional.split('\n').map(s=>s.trim()).filter(Boolean),comments};
}
function pie(point){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('role','img');svg.setAttribute('aria-label',point.segments.map(s=>s.label+': '+s.value).join('; ')||'No reported data');const total=sum(point.segments.map(s=>s.value));let angle=-Math.PI/2;
 if(!total){const circle=document.createElementNS(svg.namespaceURI,'circle');for(const [k,v]of Object.entries({cx:50,cy:50,r:46,fill:'#edf1ef'}))circle.setAttribute(k,v);svg.append(circle);return svg;}
 point.segments.forEach((s,i)=>{if(!s.value)return;const fraction=s.value/total,end=angle+fraction*Math.PI*2,path=document.createElementNS(svg.namespaceURI,fraction===1?'circle':'path');if(fraction===1){path.setAttribute('cx','50');path.setAttribute('cy','50');path.setAttribute('r','46');}else path.setAttribute('d',`M50 50 L${50+46*Math.cos(angle)} ${50+46*Math.sin(angle)} A46 46 0 ${fraction>.5?1:0} 1 ${50+46*Math.cos(end)} ${50+46*Math.sin(end)} Z`);path.setAttribute('fill',palette[i%palette.length]);svg.append(path);angle=end;});return svg;
}
function pointCard(point,scope){const card=el('article',undefined,'presentation-point');card.append(el('h4','Q'+point.number+'. '+point.label));if(point.written){card.append(el('p','Written observations — see Appendix A.','presentation-written-note'));return card;}
 const body=el('div',undefined,'presentation-point-body'),detail=el('div');body.append(pie(point),detail);detail.append(el('strong',point.total===null?'No data':String(point.total),'presentation-count'));
 if(point.base!==null)detail.append(el('span',point.base?((point.total/point.base)*100).toFixed(1)+'% of '+point.base:'Zero enrolment supplied'));
 detail.append(el('small',point.coverage+'/'+scope.length+' classes · '+point.basis));card.append(body);
 const legend=el('div',undefined,'presentation-legend');point.segments.forEach((s,i)=>{const item=el('span',s.label+': '+s.value),dot=el('i');dot.style.backgroundColor=palette[i%palette.length];item.prepend(dot);legend.append(item);});card.append(legend);if(point.total===0)card.append(el('small','Reported count is confirmed zero.'));if(point.missing.length){const missing=el('small','Data missing: '+point.missing.length+' classes','presentation-missing');missing.title=point.missing.join(', ');card.append(missing);}return card;}
export function closeTaskPresentation(){document.querySelector('.task-presentation')?.remove();const app=document.querySelector('.task-app');if(app)app.inert=false;}
export function openTaskPresentation(task,staff){
 closeTaskPresentation();const snapshot=structuredClone(task),people=structuredClone(staff),root=el('section',undefined,'task-presentation');root.setAttribute('aria-label','Survey presentation preview');const toolbar=el('div',undefined,'presentation-toolbar'),close=el('button','Close report'),print=el('button','Print / Save PDF'),label=el('label','Additional participating members — role and name, one per line'),input=el('textarea'),update=el('button','Update participant list'),pages=el('div',undefined,'presentation-pages');input.placeholder='Counsellor — name\nSpecial Educator — name\nYoga Teacher — name';input.maxLength=2000;label.append(input);toolbar.append(close,print,el('span','Four main pages; teacher comments follow as Appendix A. Add only members who participated.'),label,update);root.append(toolbar,pages);
 function render(){const data=presentationData(snapshot,people,input.value);pages.replaceChildren();let pageNumber=0;const generated=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
 for(const section of data.sections){const split=Math.ceil(section.points.length/2);for(let half=0;half<2;half++){const page=el('section',undefined,'presentation-page presentation-main-page'),header=el('header');header.append(el('h1',data.title),el('h2',section.title+' · '+(half?'Continued':'Overview')),el('p',data.version+' · '+generated+' IST'));page.append(header);
 page.append(el('p',section.submitted.length+'/'+section.classes.length+' class reports received · Supplied enrolment: '+section.enrolment+' ('+section.enrolmentClasses+'/'+section.classes.length+' classes) · Pending: '+(section.pending.join(', ')||'None'),'presentation-coverage'));
 const points=section.points.slice(half*split,(half+1)*split),grid=el('div',undefined,'presentation-chart-grid');grid.style.setProperty('--chart-rows',Math.ceil(points.length/4));points.forEach(p=>grid.append(pointCard(p,section.classes)));page.append(grid);
 const footer=el('footer');footer.append(el('p','Aggregate staff survey; categories overlap and cannot be added as unique students. Charts exclude missing answers and earlier answers to changed questions. Student percentages use only classes with a supplied answer and enrolment; meetings use class / grade shares. Reported circumstances are associations, not established causes. Written observations follow in Appendix A.'));
 if(pageNumber===3){footer.append(el('p','Participating teachers / prime mentors: '+(data.participants.join('; ')||'No submissions yet.'),'presentation-participants'),el('p','Co-opted members (Counsellor / Special Educator / Yoga Teacher and others): '+(data.additional.join('; ')||'Participation names not recorded.'),'presentation-participants'));}
 footer.append(el('span','Main report · '+(++pageNumber)+' / 4'));page.append(footer);pages.append(page);}}
 const appendix=el('section',undefined,'presentation-appendix');appendix.append(el('h2','Appendix A · Teacher comments and written observations'),el('p','Attachments to: '+data.title),el('p','Source task: '+data.taskTitle));if(!data.comments.length)appendix.append(el('p','No written comments submitted.'));for(const comment of data.comments){const item=el('article',undefined,'presentation-comment');item.append(el('h3',comment.classId+' · '+comment.name),el('h4',comment.label),el('p',comment.text));appendix.append(item);}pages.append(appendix);
 }
 render();close.onclick=()=>{closeTaskPresentation();document.querySelector('.task-section-shortcuts button')?.focus();};print.onclick=()=>window.print();update.onclick=render;document.body.append(root);const app=document.querySelector('.task-app');if(app)app.inert=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close.click();}if(event.key==='Tab'){const controls=[...root.querySelectorAll('button,textarea')],first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});close.focus();return root;
}
