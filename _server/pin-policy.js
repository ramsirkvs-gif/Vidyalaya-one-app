import {randomInt} from 'node:crypto';
import {createTrustedPINReader} from './pin-record-check.js';
import {pinRegistryVersion} from './staff-pin-allocation.js';
import {rollStaffIdentityIds} from '../cbse-roll-call-roster.js';
import {officeRegularDirectory} from '../cbse-office-regular.js';
import {OFFICE_MEMBERS} from '../cbse-office-model.js';
const entries=value=>Object.entries(value||{});
const registry=root=>[...entries(root.staffAccess).map(([id,record])=>({key:'staff:'+id,id,record})),...entries(root.officeAccess).map(([id,record])=>({key:'office:'+id,id:'office:'+id,record}))].filter(r=>r.record?.hash);
function samePerson(staff,key){const office=officeRegularDirectory(staff),own=new Set([key]);if(key.startsWith('staff:')){const id=key.slice(6);for(const linked of rollStaffIdentityIds(staff,id))own.add('staff:'+linked);if(staff[id]?.pinOwnerId)own.add('staff:'+staff[id].pinOwnerId);}for(let pass=0;pass<2;pass++)for(const member of OFFICE_MEMBERS){const ids=office['office:'+member.id]?.identityIds||[];if(own.has('office:'+member.id)||ids.some(id=>own.has('staff:'+id))){own.add('office:'+member.id);ids.filter(id=>staff[id]).forEach(id=>own.add('staff:'+id));}}return own;}
export function createPINPolicy({db,read,getStaff,displayKey,verifyPIN,AccessError}){
 const trustedPIN=createTrustedPINReader({displayKey,verifyPIN});
 async function matches(pin,row){const visible=await trustedPIN(row.record,row.id);return visible?visible===String(pin):verifyPIN(pin,row.record);}
 async function conflicts(pin,key,staff,root,exclude=new Set(),allowedExtra=[]){const own=samePerson(staff,key);allowedExtra.forEach(k=>own.add(k));const found=[];for(const row of registry(root))if(!own.has(row.key)&&!exclude.has(row.key)&&await matches(pin,row))found.push(row.key);return found;}
 async function assertSelected(pin,key){const [staff,staffAccess,officeAccess]=await Promise.all([getStaff(),read('cbse/staffAccess'),read('cbse/officeAccess')]);if((await conflicts(pin,key,staff,{staffAccess,officeAccess})).length)throw new AccessError('This PIN conflicts with another employee’s PIN. Ask the Principal to resolve it in Settings. No submission was saved.',409);}
 async function commit({updates:requestedUpdates,prepare,mutate,staff:override}){for(let retry=0;retry<4;retry++){const root=await read('cbse');if(!root)throw new AccessError('PIN records could not be loaded. Retry.',409);const updates=prepare?await prepare(root):requestedUpdates;const staff=override||await getStaff(),excluded=new Set(updates.map(u=>u.key));for(const u of updates){const own=samePerson(staff,u.key);(u.allowedExtra||[]).forEach(k=>own.add(k));for(const other of updates)if(other!==u&&String(other.pin)===String(u.pin)&&!own.has(other.key))throw new AccessError('A PIN cannot be assigned to two different employees. Choose different PINs.',400);if((await conflicts(u.pin,u.key,staff,root,excluded,u.allowedExtra)).length)throw new AccessError('That PIN is already assigned to another employee in the portal. Choose a different PIN.',400);}
 const version=pinRegistryVersion(root.staffAccess,root.officeAccess),facultyRevision=root.facultyDraft?.revision,missionRevision=root.mission?.revision;let failure='';const saved=await db.ref('cbse').transaction(current=>{if(!current||pinRegistryVersion(current.staffAccess,current.officeAccess)!==version||current.facultyDraft?.revision!==facultyRevision||current.mission?.revision!==missionRevision)return;try{const next=mutate?mutate(current):structuredClone(current);if(!next)return;for(const u of updates){const office=u.key.startsWith('office:'),group=office?'officeAccess':'staffAccess',id=u.key.slice(office?7:6);next[group]||={};next[group][id]={...u.record,...(u.preserveEnabled&&current[group]?.[id]?{enabled:!!current[group][id].enabled}:{})};}return next;}catch(error){failure=error.message;return;}});if(saved.committed&&saved.snapshot?.val())return saved;if(failure)throw new AccessError(failure,409);}throw new AccessError('PIN or staff records changed. Retry without changing existing PINs.',409);}
 async function generateOfficePIN(id,makeRecord){
  const key='office:'+id;
  return commit({prepare:async root=>{
   if(root.officeAccess?.[id]?.hash)throw new AccessError('This office member already has a PIN. Refresh the PIN list.',409);
   const used=new Set(),legacy=[];
   for(const row of registry(root)){
    const pin=await trustedPIN(row.record,row.id);
    if(pin)used.add(pin);else legacy.push(row.record);
   }
   const pool=Array.from({length:900},(_,i)=>String(i+100)).filter(pin=>!used.has(pin));
   while(pool.length){
    const [pin]=pool.splice(randomInt(pool.length),1);
    let collision=false;
    for(const record of legacy)if(await verifyPIN(pin,record)){collision=true;break;}
    if(!collision)return [{key,pin,record:await makeRecord(pin)}];
   }
   throw new AccessError('No unused three-digit PIN remains across staff and Office accounts.',409);
  }});
 }
 async function audit(staff){const [staffAccess,officeAccess]=await Promise.all([read('cbse/staffAccess'),read('cbse/officeAccess')]),groups=new Map(),legacy=[];for(const row of registry({staffAccess,officeAccess})){const pin=await trustedPIN(row.record,row.id);if(!pin){if(row.record.salt)legacy.push(row);continue;}if(!groups.has(pin))groups.set(pin,[]);groups.get(pin).push(row.key);}const unverified=[];let checks=0;for(const row of legacy){let matched=false;for(const [pin,keys]of groups){if(checks++>=150)break;if(await verifyPIN(pin,row.record)){keys.push(row.key);matched=true;break;}}if(!matched)unverified.push(row.key);}const duplicates=[];for(const keys of groups.values())if(keys.some(k=>!samePerson(staff,keys[0]).has(k)))duplicates.push({accounts:keys.map(key=>({key,name:key.startsWith('staff:')?staff[key.slice(6)]?.name||'Unlisted staff account':OFFICE_MEMBERS.find(m=>m.id===key.slice(7))?.name||'Office account'}))});return {duplicates,unverified,unavailable:legacy.map(row=>row.key)};}
 return {commit,generateOfficePIN,assertSelected,audit};
}
