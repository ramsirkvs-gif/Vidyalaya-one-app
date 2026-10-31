import test from 'node:test';import assert from 'node:assert/strict';
import {readStaffResponse} from '../cbse-service-response.js';
import handler from '../api/staff-access.js';
test('gateway text and HTML errors show an actionable message without exposing response data',async()=>{
 for(const text of ['A server error has occurred','<html>private diagnostic</html>'])await assert.rejects(readStaffResponse(new Response(text,{status:500})),e=>e.message.includes('No PIN update was confirmed')&&e.message.includes('Vercel Function logs')&&!e.message.includes('private diagnostic')&&!e.message.includes('Unexpected token'));
 await assert.rejects(readStaffResponse(new Response('Not found',{status:404})),/missing from this deployment/);
 await assert.rejects(readStaffResponse(new Response('null',{status:200})),/invalid server response/);
});
test('structured API activation errors stay intact and successful responses are returned',async()=>{
 await assert.rejects(readStaffResponse(new Response(JSON.stringify({error:'Add the protected server credential.'}),{status:503})),/protected server credential/);
 assert.deepEqual(await readStaffResponse(new Response(JSON.stringify({ok:true,updated:27}))),{ok:true,updated:27});
});
test('API without server activation returns JSON 503 without loading Firebase Admin',async()=>{
 const old=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 const res={setHeader(){},status(value){this.code=value;return this;},json(value){this.body=value;}};
 try{await handler({method:'POST',body:{action:'import-pins',rows:[]},headers:{authorization:'Bearer synthetic-token'}},res);assert.equal(res.code,503);assert.match(res.body.error,/FIREBASE_SERVICE_ACCOUNT_JSON/);}finally{if(old!==undefined)process.env.FIREBASE_SERVICE_ACCOUNT_JSON=old;}
});

test('malformed service-account configuration returns a safe actionable JSON error',async()=>{
 const old=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 try{for(const raw of ['null','{}','not-json',JSON.stringify({project_id:'vidyalaya-one-app'})]){
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON=raw;const res={setHeader(){},status(value){this.code=value;return this;},json(value){this.body=value;}};
  await handler({method:'POST',body:{action:'list'},headers:{authorization:'Bearer synthetic-token'}},res);assert.equal(res.code,503);assert.match(res.body.error,/credential|service-account/);
 }}finally{if(old===undefined)delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;else process.env.FIREBASE_SERVICE_ACCOUNT_JSON=old;}
});
