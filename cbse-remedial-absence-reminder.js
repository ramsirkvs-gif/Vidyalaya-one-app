import {mcqTargetStudents} from './cbse-mcq-target-groups.js';
const priority={critical:0,red:1,yellow:2},labels={critical:'Critical fail',red:'Fail',yellow:'Borderline'};
export function remedialPriorityAbsentees(draft,mission,plan,presentKeys=[]){
 const present=new Set(presentKeys),targeted=new Set(plan.studentKeys||[]),people=new Map();
 for(const scope of plan.scopes||[[plan.classId,plan.sectionId,plan.subjectId].join('|')]){
  const [classId,sectionId,subjectId]=scope.split('|');
  for(const student of mcqTargetStudents(draft,mission,classId,subjectId,[sectionId])){
   if(!targeted.has(student.key)||present.has(student.key)||!Object.hasOwn(priority,student.band))continue;
   const previous=people.get(student.key);if(previous&&priority[previous.band]<=priority[student.band])continue;
   people.set(student.key,{key:student.key,name:student.person.name,roll:student.person.roll,classId,section:student.section,band:student.band,category:labels[student.band]});
  }
 }
 return [...people.values()].sort((a,b)=>priority[a.band]-priority[b.band]||a.name.localeCompare(b.name));
}
export function remedialAbsenceReminderText(students){
 if(!students.length)return '';
 return 'Important absent students:\n\n'+students.map(s=>s.name+' · '+s.classId+'-'+s.section+' · Roll '+s.roll+' · '+s.category).join('\n')+'\n\nThese students especially need remedial support. Please call the student or parent and discuss the absence. Contact details are available in each student’s profile in this app.';
}
