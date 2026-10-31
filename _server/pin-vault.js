import {hkdfSync,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
// Separate purpose-specific key; the service-account credential never leaves the server.
export function pinDisplayKey(credential){return Buffer.from(hkdfSync('sha256',credential.private_key,credential.project_id,'mission-principal-pin-display-v1',32));}
export function encryptDisplayPIN(pin,id,key){
 if(!key)return {};
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(id));
 const ciphertext=Buffer.concat([cipher.update(String(pin),'utf8'),cipher.final()]);
 return {displayPIN:{version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}};
}
export function decryptDisplayPIN(record,id,key){
 const p=record?.displayPIN;if(!key||p?.version!==1)return '';
 try{const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(p.iv,'base64'));decipher.setAAD(Buffer.from(id));decipher.setAuthTag(Buffer.from(p.tag,'base64'));const pin=Buffer.concat([decipher.update(Buffer.from(p.ciphertext,'base64')),decipher.final()]).toString('utf8');return /^(?:\d{3}|\d{6,12})$/.test(pin)?pin:'';}catch{return '';}
}
