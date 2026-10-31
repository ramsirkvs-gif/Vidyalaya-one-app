import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('Firebase PIN server loads and signs tokens without require(ESM) support',()=>{
 const script=`
  import assert from 'node:assert/strict';
  import {generateKeyPairSync} from 'node:crypto';
  import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
  import {getAuth} from 'firebase-admin/auth';
  import {getDatabase} from 'firebase-admin/database';
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const app=initializeApp({credential:cert({projectId:'synthetic-test',clientEmail:'test@synthetic-test.iam.gserviceaccount.com',privateKey:privateKey.export({type:'pkcs8',format:'pem'})}),databaseURL:'https://synthetic-test.firebaseio.com'},'runtime-regression');
  assert.ok(getDatabase(app));
  const token=await getAuth(app).createCustomToken('synthetic-staff',{missionStaff:true});
  assert.equal(token.split('.').length,3);
  await deleteApp(app);
 `;
 const result=spawnSync(process.execPath,['--no-experimental-require-module','--input-type=module','-e',script],{cwd:process.cwd(),encoding:'utf8',timeout:20000});
 assert.equal(result.status,0,result.stderr||result.error?.message);
});
