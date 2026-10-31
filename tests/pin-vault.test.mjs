import test from 'node:test';import assert from 'node:assert/strict';
import {pinDisplayKey,encryptDisplayPIN,decryptDisplayPIN} from '../_server/pin-vault.js';
test('display PIN encryption is random, staff-bound, authenticated and key-specific',()=>{
 const key=pinDisplayKey({private_key:'synthetic-key',project_id:'synthetic-project'}),record=encryptDisplayPIN('029','X:one',key),again=encryptDisplayPIN('029','X:one',key);
 assert.notDeepEqual(record,again);assert.equal(decryptDisplayPIN(record,'X:one',key),'029');assert.equal(decryptDisplayPIN(record,'X:two',key),'');assert.equal(decryptDisplayPIN(record,'X:one',Buffer.alloc(32)), '');assert.equal(decryptDisplayPIN({},'X:one',key),'');
 const tampered=structuredClone(record);tampered.displayPIN.ciphertext='AAAA';assert.equal(decryptDisplayPIN(tampered,'X:one',key),'');
});
