import {createHash,randomUUID} from 'node:crypto';
import {mcqTransaction} from './mcq-transaction.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
// Reserve each attempt once, including when a committed write loses its acknowledgement.
export function createPINAttemptLimiter({db,restTransaction,now=Date.now}){
 const transaction=(path,update)=>mcqTransaction(db,path,update,{restTransaction});
 return {
  async reserve(staffId,ip){
   const attemptId=randomUUID(),at=now(),paths=[];
   for(const[scope,limit]of [[`ip|${ip}`,25],[`${ip}|${staffId}`,8],[`staff|${staffId}`,30]]){
    const path='cbse/staffAttempts/'+hash(scope);let denied=false;
    const saved=await transaction(path,current=>{denied=false;const value=current&&at-current.started<15*60_000?current:{started:at,count:0};if(value.attempts?.[attemptId])return value;if(value.count>=limit){denied=true;return;}return {...value,count:value.count+1,attempts:{...value.attempts,[attemptId]:true}};});
    if(denied)return {allowed:false};if(!saved.committed)throw Error('PIN attempt reservation was not confirmed.');paths.push(path);
   }
   return {allowed:true,attemptId,paths,key:'cbse/staffAttempts/'+hash(`${ip}|${staffId}`)};
  },
  async clear(ticket,{all=true}={}){
   for(const path of all?ticket.paths:[ticket.key])await transaction(path,current=>{if(current===null||current.attempts?.[ticket.attemptId])return null;return;});
  }
 };
}
