import {createHash} from 'node:crypto';
import {decryptDisplayPIN} from './pin-vault.js';
// A saved display value is only an optimization after it agrees with the
// authoritative hash. Cache by hash + value so PIN changes invalidate trust.
export function createTrustedPINReader({displayKey,verifyPIN}){const verified=new Map();return async(record,id)=>{const pin=decryptDisplayPIN(record,id,displayKey);if(!pin)return '';const key=createHash('sha256').update(String(record?.salt)+'\0'+String(record?.hash)+'\0'+pin).digest('hex');if(!verified.has(key)){if(verified.size>=2000)verified.delete(verified.keys().next().value);verified.set(key,Promise.resolve(verifyPIN(pin,record)).catch(error=>{verified.delete(key);throw error;}));}return await verified.get(key)?pin:'';};}
