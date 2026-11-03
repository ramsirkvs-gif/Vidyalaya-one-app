// Saved enrolments only: never infer subject choices from a class/stream or marks.
export function subjectStudentGroups(draft,classId='XII'){
 const sections=Object.entries(draft?.classes?.[classId]?.sections||{}),catalog=new Map(),normal=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
 // Allow an uncoded subject to join the same named subject when its code is unambiguous.
 const codes=new Map();for(const[,section]of sections)for(const subject of Object.values(section.subjects||{})){const name=normal(subject.name),code=normal(subject.code);if(code){if(!codes.has(name))codes.set(name,new Set());codes.get(name).add(code);}}
 for(const[sectionId,section]of sections)for(const[subjectId,subject]of Object.entries(section.subjects||{})){const name=normal(subject.name);if(!name)continue;const known=codes.get(name),code=normal(subject.code)||(known?.size===1?[...known][0]:''),key=code?'code:'+code:'name:'+name;if(!catalog.has(key))catalog.set(key,{key,name:subject.name.trim(),code,studentKeys:new Set()});const group=catalog.get(key);for(const[id,student]of Object.entries(section.students||{}))if(student.subjects?.[subjectId])group.studentKeys.add(classId+':'+sectionId+':'+id);}
 return [...catalog.values()].map(g=>({...g,studentKeys:[...g.studentKeys]})).sort((a,b)=>a.name.localeCompare(b.name));
}
