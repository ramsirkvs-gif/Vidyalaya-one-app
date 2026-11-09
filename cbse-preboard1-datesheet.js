import {schoolBoardDateSheet} from './cbse-board-datesheet-model.js';
// Checked against all three pages of the supplied school examination-cell sheet.
export const PREBOARD1_SOURCE={issued:'2026-10-27',title:'Preboard 1 · November 2026',school:'PM SHRI Kendriya Vidyalaya No. 1, Itanagar'};
const paper=(classId,code,name,day,sections,marks,page,end='12:30')=>({id:'preboard1|'+classId+'|'+code,classId,codes:[code],name,date:'2026-11-'+day,sections:sections.split(''),marks,page,reporting:'08:30',reading:'09:15–09:30',start:'09:30',end,duration:end==='11:30'?'2 hours':'3 hours'});
export const PREBOARD1_PAPERS=[
 paper('X','184','English','12','ABCD',80,1),
 paper('X','417','Artificial Intelligence','13','ABCD',50,1,'11:30'),
 paper('X','241','Mathematics Basic','16','ABCD',80,1),
 paper('X','041','Mathematics Standard','16','ABCD',80,1),
 paper('X','086','Science','18','ABCD',80,2),
 paper('X','087','Social Science','20','ABCD',80,2),
 paper('X','002','Hindi','21','ABCD',80,3),
 paper('XII','301','English Core','12','ABCDE',80,1),
 paper('XII','083','Computer Science','13','A',70,1),
 paper('XII','065','Informatics Practices','13','BCD',70,1),
 paper('XII','302','Hindi Core','13','ABCDE',80,1),
 paper('XII','055','Accountancy','16','C',80,1),
 paper('XII','029','Geography','16','DE',70,1),
 paper('XII','042','Physics','16','AB',70,1),
 paper('XII','043','Chemistry','18','AB',70,2),
 paper('XII','030','Economics','18','CD',80,2),
 paper('XII','028','Political Science','18','DE',80,2),
 paper('XII','044','Biology','19','AB',70,2),
 paper('XII','054','Business Studies','19','C',80,2),
 paper('XII','041','Mathematics','20','AC',80,2),
 paper('XII','027','History','20','DE',80,2),
 paper('XII','843','Artificial Intelligence','21','ABCDE',50,3,'11:30')
];
export function schoolPreboard1DateSheet(draft,classId){
 const mapped=schoolBoardDateSheet(draft,classId);return {unmatched:mapped.unmatched,rows:PREBOARD1_PAPERS.filter(p=>p.classId===classId).map(p=>{const base=mapped.rows.find(r=>r.codes.some(c=>p.codes.includes(c))),refs=(base?.subjectRefs||[]).filter(ref=>p.sections.includes(String(draft.classes[classId].sections[ref.sectionId].name).trim().toUpperCase())),allowed=new Set(refs.map(r=>r.sectionId));return {...p,codeConfirmed:!!base,subjectRefs:refs,studentKeys:(base?.studentKeys||[]).filter(key=>allowed.has(key.split(':')[1]))};}).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name))};
}
