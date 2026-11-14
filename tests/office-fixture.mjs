import {scryptSync} from 'node:crypto';
import {createStaffService} from '../_server/staff-service.js';
import {emptyFaculty} from '../cbse-faculty-model.js';
export function officeFixture(){
 const faculty=emptyFaculty();faculty.classes.X.teachers.one={name:'Jitendra Paul',designation:'PGT',subjects:'English',status:'active'};faculty.classes.X.teachers.two={name:'Synthetic Teacher',designation:'TGT',subjects:'Maths',status:'active'};
 faculty.classes.XII.teachers.linked={...faculty.classes.X.teachers.one};
 const data={cbse:{adminUid:'principal-uid',facultyDraft:faculty,mission:{revision:1,staff:{}},draft:{PRIVATE_STUDENT_RECORDS:'must not be read'},staffAccess:{existing:{hash:'original-teacher-hash',enabled:true}}}},reads=[];let clock=Date.parse('2026-11-14T10:00:00Z');
 const copy=value=>value===undefined?null:structuredClone(value),get=path=>path.split('/').reduce((value,key)=>value?.[key],data),put=(path,value)=>{const keys=path.split('/'),last=keys.pop();let parent=data;for(const key of keys)parent=parent[key]??={};if(value===null)delete parent[last];else parent[last]=copy(value);};
 const db={ref:path=>({get:async()=>{reads.push(path);return {val:()=>copy(get(path))};},set:async value=>put(path,value),update:async value=>put(path,{...get(path),...value}),remove:async()=>put(path,null),transaction:async fn=>{const value=fn(copy(get(path)));if(value===undefined)return {committed:false,snapshot:{val:()=>copy(get(path))}};put(path,value);return {committed:true,snapshot:{val:()=>copy(value)}};}})};
 const auth={verifyIdToken:async token=>{if(token==='principal')return {uid:'principal-uid'};if(token==='teacher')return {uid:'teacher-uid',missionStaff:true,staffId:'X:one'};throw Error('Invalid token');}};
 const service=createStaffService({db,auth,displayKey:Buffer.alloc(32,7),now:()=>clock,viewSecret:{salt:'office-test',hash:scryptSync('synthetic-view','office-test',64).toString('hex')}});
 return {service,data,reads,db,setTime:value=>clock=value};
}
