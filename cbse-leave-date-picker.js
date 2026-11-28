import {el} from './cbse-ui.js';
import {rollDateText} from './cbse-roll-call-time.js';
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
export function createLeaveDatePicker(parent,{initialDates=[],today,min,max,onChange=()=>{}}){
 const selected=new Set(initialDates),calendar=el('section',undefined,'advance-leave-calendar'),
  chosen=el('div',undefined,'advance-leave-selected'),status=el('p');
 let month=([...selected].sort()[0]||today).slice(0,7);
 status.setAttribute('role','status');
 const change=()=>{onChange();status.textContent='';draw();};
 parent.append(el('p','Tap each date you want to include. Tap again to remove it.'),calendar,chosen,status);
 function draw(){calendar.replaceChildren();const nav=el('div',undefined,'advance-leave-month-nav'),move=offset=>{const date=new Date(month+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);month=date.toISOString().slice(0,7);draw();},prev=button('‹ Previous month',()=>move(-1)),next=button('Next month ›',()=>move(1));prev.disabled=month<=min.slice(0,7);next.disabled=month>=max.slice(0,7);prev.dataset.unavailable=String(prev.disabled);next.dataset.unavailable=String(next.disabled);nav.append(prev,el('strong',new Intl.DateTimeFormat('en-IN',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(month+'-01T12:00:00Z'))),next);calendar.append(nav);const grid=el('div',undefined,'advance-leave-date-grid');for(const day of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])grid.append(el('span',day));const first=new Date(month+'-01T12:00:00Z'),offset=(first.getUTCDay()+6)%7,last=new Date(first);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);for(let i=0;i<offset;i++)grid.append(el('span'));for(let day=1;day<=last.getUTCDate();day++){const date=month+'-'+String(day).padStart(2,'0'),b=button(String(day),()=>{if(selected.has(date))selected.delete(date);else selected.add(date);change();});b.dataset.leaveDate=date;b.setAttribute('aria-label',rollDateText(date));b.setAttribute('aria-pressed',String(selected.has(date)));b.disabled=date<min||date>max;b.dataset.unavailable=String(b.disabled);grid.append(b);}calendar.append(grid);chosen.replaceChildren(el('strong',selected.size+' dates selected'));for(const date of [...selected].sort())chosen.append(button(rollDateText(date)+' ×',()=>{selected.delete(date);change();}));}
 draw();
 return {
  setDates(values){
   selected.clear();
   for(const date of values)selected.add(date);
   if(selected.size)month=[...selected].sort()[0].slice(0,7);
   change();
  },
  getDates(){
   const dates=[...selected].sort();
   if(dates.length&&dates.length<=366)return dates;
   status.textContent=dates.length?'Select at most 366 dates.':'Select your Leave / OD outside dates first.';
   calendar.scrollIntoView({block:'center'});
   return null;
  }
 };
}
