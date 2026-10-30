import {entries} from './cbse-model.js';
import {el,cell,head,options,stats,date} from './cbse-ui.js';
const $=id=>document.getElementById(id);
let publication=null;
function render(){
 const sections=entries(publication?.sections).map(([,s])=>s).filter(s=>['X','XII'].includes(s.classId)&&typeof s.section==='string');
 const cl=$('public-class').value,selection=$('public-section').value;
 const sectionNames=[...new Set(sections.filter(s=>!cl||s.classId===cl).map(s=>s.section))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 options($('public-section'),[['','All sections'],...sectionNames.map(name=>[name,`Section ${name}`])],selection);
 const sec=$('public-section').value,q=$('public-search').value.trim().toLowerCase();
 const selected=sections.filter(s=>(!cl||s.classId===cl)&&(!sec||s.section===sec));
 const total=sections.reduce((n,s)=>n+(Number(s.count)||0),0);
 stats($('public-stats'),[[total,'Published students'],[sections.length,'Published sections'],[new Set(sections.map(s=>s.stream).filter(Boolean)).size,'Streams']]);
 const body=$('public-body');body.replaceChildren();
 let rows=[];
 if(publication?.includesStudents){
  head($('public-head'),['Student name','Roll no.','Class','Section','Stream']);
  for(const s of selected)for(const[,student]of entries(s.students)){
   if(typeof student.name!=='string'||typeof student.roll!=='string')continue;
   const values=[student.name,student.roll,s.classId,s.section,s.stream||'—'];
   if(values.join(' ').toLowerCase().includes(q))rows.push(values);
  }
  rows.sort((a,b)=>a[2].localeCompare(b[2])||a[3].localeCompare(b[3])||a[1].localeCompare(b[1],undefined,{numeric:true}));
 }else{
  head($('public-head'),['Class','Section','Stream','Student count']);
  rows=selected.map(s=>[s.classId,s.section,s.stream||'—',Number(s.count)||0]).filter(values=>values.join(' ').toLowerCase().includes(q));
 }
 for(const values of rows){const row=el('tr');for(const value of values)cell(row,value);body.append(row);}
 $('public-empty').hidden=rows.length>0;
 $('public-empty').textContent=publication?'No matching records. Try another class, section or search.':'The school has not published student data yet.';
 $('result-count').textContent=`${rows.length} ${publication?.includesStudents?'students':'sections'} found`;
 $('published-at').textContent=publication?.publishedAt?`Published ${date(publication.publishedAt)} (IST). Live updates are enabled.`:'';
}
for(const id of ['public-class','public-section'])$(id).onchange=render;
$('public-search').oninput=render;
render();
try{
 const [{db},{ref,onValue}]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js')]);
 onValue(ref(db,'cbse/public'),snapshot=>{publication=snapshot.val();$('public-message').textContent=publication?'Showing the school’s published records.':'No student data has been published yet.';render();},()=>{publication=null;render();$('public-message').textContent='Published data is currently unavailable. Please try again later or contact the school.';$('public-message').className='notice error';});
}catch{
 $('public-message').textContent='Cannot connect to published data. Check your Internet connection and try again.';$('public-message').className='notice error';
}
