// Saved enrolments only: never infer subject choices from a class/stream or marks.
export function subjectStudentGroups(draft,classId='XII'){
 const sections=Object.entries(draft?.classes?.[classId]?.sections||{}),catalog=new Map(),normal=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
 // Allow an uncoded subject to join the same named subject when its code is unambiguous.
 const codes=new Map();for(const[,section]of sections)for(const subject of Object.values(section.subjects||{})){const name=normal(subject.name),code=normal(subject.code);if(code){if(!codes.has(name))codes.set(name,new Set());codes.get(name).add(code);}}
 for(const[sectionId,section]of sections)for(const[subjectId,subject]of Object.entries(section.subjects||{})){const name=normal(subject.name);if(!name)continue;const known=codes.get(name),code=normal(subject.code)||(known?.size===1?[...known][0]:''),key=code?'code:'+code:'name:'+name;if(!catalog.has(key))catalog.set(key,{key,name:subject.name.trim(),code,studentKeys:new Set()});const group=catalog.get(key);for(const[id,student]of Object.entries(section.students||{}))if(student.subjects?.[subjectId])group.studentKeys.add(classId+':'+sectionId+':'+id);}
 return [...catalog.values()].map(g=>({...g,studentKeys:[...g.studentKeys]})).sort((a,b)=>a.name.localeCompare(b.name));
}

export function classXMathGroups(draft){
 const groups=[{key:'code:241',name:'Maths Basic',code:'241',studentKeys:new Set()},{key:'code:041',name:'Maths Standard',code:'041',studentKeys:new Set()}];
 for(const[sid,section]of Object.entries(draft?.classes?.X?.sections||{}))for(const[id,subject]of Object.entries(section.subjects||{})){
  const code=String(subject.code||'').trim().padStart(3,'0'),name=String(subject.name||'').toLowerCase();
  const group=code==='241'?groups[0]:code==='041'?groups[1]:!String(subject.code||'').trim()&&/math/.test(name)?(/basic/.test(name)?groups[0]:/standard/.test(name)?groups[1]:null):null;
  if(group)for(const[studentId,student]of Object.entries(section.students||{}))if(student.subjects?.[id])group.studentKeys.add('X:'+sid+':'+studentId);
 }
 return groups.map(g=>({...g,studentKeys:[...g.studentKeys]}));
}

export function classXMathSectionSummary(draft){
 const groups=classXMathGroups(draft),basic=new Set(groups[0].studentKeys),standard=new Set(groups[1].studentKeys);
 return Object.entries(draft?.classes?.X?.sections||{}).map(([sectionId,section])=>{const keys=Object.keys(section.students||{}).map(id=>'X:'+sectionId+':'+id);return {sectionId,section:section.name||sectionId,total:keys.length,basic:keys.filter(key=>basic.has(key)).length,standard:keys.filter(key=>standard.has(key)).length,both:keys.filter(key=>basic.has(key)&&standard.has(key)).length,unassigned:keys.filter(key=>!basic.has(key)&&!standard.has(key)).length};}).sort((a,b)=>a.section.localeCompare(b.section,undefined,{numeric:true}));
}
