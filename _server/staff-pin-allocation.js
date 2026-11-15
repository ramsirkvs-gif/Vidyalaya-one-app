import {createTrustedPINReader} from './pin-record-check.js';
import {randomInt,randomUUID,createHash} from 'node:crypto';
import {encryptDisplayPIN} from './pin-vault.js';
const entries=value=>Object.entries(value||{});
const signature=(staff,office)=>createHash('sha256').update(JSON.stringify([staff,office].map(group=>entries(group).sort(([a],[b])=>a.localeCompare(b)).map(([id,r])=>[id,r?.salt||'',r?.hash||'',r?.enabled,r?.version||'',r?.displayPIN?[r.displayPIN.version,r.displayPIN.iv,r.displayPIN.tag,r.displayPIN.ciphertext]:null])))).digest('hex');
export function createMissingStaffPINGenerator({db,read,displayKey,hashPIN,verifyPIN,now,identityIds,AccessError}){
 const trustedPIN=createTrustedPINReader({displayKey,verifyPIN});
 return async staff=>{
  for(let retry=0;retry<4;retry++){
   const [stored,offices]=await Promise.all([read('cbse/staffAccess'),read('cbse/officeAccess')]),access=stored||{},office=offices||{},missing=entries(staff).filter(([id,p])=>p.status==='active'&&!access[id]?.hash&&access[id]?.enabled!==false),active=Object.fromEntries(entries(staff).filter(([,p])=>p.status==='active'));
   if(!missing.length)return {created:[],staff:active};
   const used=new Set(),unknown=[],prepared=new Map();for(const [id,record]of [...entries(access),...entries(office).map(([id,r])=>['office:'+id,r])]){const pin=await trustedPIN(record,id);if(/^[1-9][0-9]{2}$/.test(pin))used.add(pin);else if(!pin&&record?.hash&&record?.salt)unknown.push(record);}
   const pool=Array.from({length:900},(_,i)=>String(i+100)).filter(pin=>!used.has(pin));
   for(const [id,p]of missing){
    const sourceId=identityIds(staff,id).find(key=>key!==id&&(access[key]?.hash||prepared.get(key)?.record.hash));
    if(sourceId){const source=access[sourceId]||prepared.get(sourceId).record,pin=await trustedPIN(source,sourceId),record={...source,updatedAt:now()};delete record.displayPIN;if(pin)Object.assign(record,encryptDisplayPIN(pin,id,displayKey));prepared.set(id,{name:p.name,pin,record});continue;}
    let pin='';while(pool.length){const index=randomInt(pool.length),candidate=pool.splice(index,1)[0];let collision=false;for(const legacy of unknown)if(await verifyPIN(candidate,legacy)){collision=true;break;}if(!collision){pin=candidate;break;}}
    if(!pin)throw new AccessError('No unused three-digit PIN remains across staff and office accounts. Existing PINs were not changed.',409);
    prepared.set(id,{name:p.name,pin,record:{...await hashPIN(pin),...encryptDisplayPIN(pin,id,displayKey),temporary:true,enabled:true,version:randomUUID(),updatedAt:now()}});
   }
   const before=signature(access,office);const result=await db.ref('cbse').transaction(current=>{if(!current||signature(current.staffAccess,current.officeAccess)!==before)return;const next={...current,staffAccess:{...(current.staffAccess||{})}};for(const [id,p]of prepared)if(!next.staffAccess[id]?.hash&&next.staffAccess[id]?.enabled!==false)next.staffAccess[id]=p.record;return next;});
   if(result.committed&&result.snapshot?.val())return {created:[...prepared].map(([staffId,p])=>({staffId,name:p.name,pin:p.pin})),staff:active};
  }
  throw new AccessError('Staff or office PIN records changed while generating unique PINs. Existing PINs were retained; retry setup.',409);
 };
}
export {signature as pinRegistryVersion};
