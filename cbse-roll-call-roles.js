import {resolvedFaculty} from './cbse-faculty-model.js';
import {rollStaffIdentityIds} from './cbse-roll-call-roster.js';
// Share Mission's section-role resolution; never guess CT status from designation.
export function rollRoleDirectory(staff,faculty,classes){
 const resolved=resolvedFaculty(faculty,classes),roles=[];
 for(const [cl,area]of Object.entries(resolved?.classes||{}))for(const [sectionId,r]of Object.entries(area.roles||{}))for(const [key,label]of [['classTeacher','CT'],['coClassTeacher','Co-CT']]){if(classes?.[cl]?.sections&&!Object.hasOwn(classes[cl].sections,sectionId))continue;const teacherId=r[key];if(!teacherId||!area.teachers?.[teacherId]||area.teachers[teacherId].status!=='active')continue;roles.push({staffId:cl+':'+teacherId,classId:cl,sectionId,sectionName:classes?.[cl]?.sections?.[sectionId]?.name||sectionId,role:label});}
 return Object.fromEntries(Object.entries(staff).map(([id,p])=>{const ids=rollStaffIdentityIds(staff,id),classRoles=roles.filter(r=>ids.includes(r.staffId)).map(({staffId,...role})=>role);return [id,{...p,classTeacher:classRoles.some(r=>r.role==='CT'),coClassTeacher:classRoles.some(r=>r.role==='Co-CT'),classRoles}];}));
}
