const mapping={A:'Science',B:'Science',C:'Commerce',D:'Humanities',E:'Humanities'};
export const XII_STREAMS=['Science','Commerce','Humanities'];
export function sectionStream(classId,section,saved=''){
 if(classId!=='XII')return saved||'';
 return mapping[String(section||'').trim().toUpperCase()]||(/^humanit/i.test(saved)?'Humanities':saved||'');
}
export function xiiStreamGroups(people){
 return XII_STREAMS.map(name=>{const students=Object.values(people||{}).filter(p=>p.classId==='XII'&&sectionStream(p.classId,p.section,p.stream)===name);return {name,count:students.length,sections:[...new Set(students.map(p=>p.section))].sort()};}).filter(g=>g.count);
}
