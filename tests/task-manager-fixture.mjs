import {createStaffService} from '../_server/staff-service.js';
import {emptyDraft} from '../cbse-model.js';
import {emptyFaculty} from '../cbse-faculty-model.js';
import {emptyMission} from '../cbse-mission-model.js';
export function taskFixture({restTransaction,uploadSignedSlip}={}){
 const faculty=emptyFaculty();for(const id of ['one','two'])faculty.classes.X.teachers[id]={name:'Synthetic Teacher '+id,status:'active',designation:'TGT',subjects:'English',teachingSections:'A'};
 const data={cbse:{adminUid:'principal-uid',draft:emptyDraft(),facultyDraft:faculty,mission:emptyMission()}};
 const clone=v=>v==null?null:JSON.parse(JSON.stringify(v));
 const at=path=>path.split('/').reduce((v,k)=>v?.[k],data);
 const put=(path,v)=>{const keys=path.split('/');let p=data;for(const k of keys.slice(0,-1))p=p[k]||={};if(v===null)delete p[keys.at(-1)];else p[keys.at(-1)]=clone(v);};
 const db={ref:path=>({get:async()=>({val:()=>clone(at(path))}),set:async v=>put(path,v),remove:async()=>put(path,null),transaction:async fn=>{const next=fn(clone(at(path)));if(next===undefined)return {committed:false};put(path,next);return {committed:true,snapshot:{val:()=>clone(next)}};}})};
 const auth={revokeRefreshTokens:async()=>{},verifyIdToken:async token=>{if(token==='principal')return {uid:'principal-uid'};if(token==='outsider')return {uid:'outsider'};throw Error('Invalid auth token');}};
 const service=createStaffService({db,auth,uploadSignedSlip,restTransaction:restTransaction&&((path,update)=>restTransaction(db,path,update)),displayKey:Buffer.alloc(32,7),viewSecret:{salt:'synthetic',hash:'unused'}});
 const admin=input=>service('task-principal',input,'principal');
 const teacher=(input={},id='X:one',pin='123')=>service('pin-submit',{operation:'task-manager',taskOperation:'read',...input,staffId:id,pin},'','synthetic-ip');
 return {data,db,service,admin,teacher};
}
