// Count active people once overall; the same faculty member may serve both standards.
const normal=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export function missionTeamCounts(faculty,mission){
 const total=new Set(),byClass={X:new Set(),XII:new Set()},coopted=new Set();
 const identity=person=>normal(person.name)+'|'+normal(person.designation||person.kind);
 for(const cl of ['X','XII'])for(const person of Object.values(faculty?.classes?.[cl]?.teachers||{})){
  if(person.status!=='active')continue;const key=identity(person);total.add(key);byClass[cl].add(key);
 }
 for(const person of Object.values(mission?.staff||{})){
  if(person.status!=='active')continue;const key=identity(person);total.add(key);coopted.add(key);
 }
 return {total:total.size,X:byClass.X.size,XII:byClass.XII.size,coopted:coopted.size};
}
