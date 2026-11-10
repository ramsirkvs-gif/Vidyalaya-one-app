import test from 'node:test';
import assert from 'node:assert/strict';
import {mcqEvaluationTransaction,mcqTransaction,createRESTTransaction} from '../_server/mcq-transaction.js';
const credentials={getAccessToken:async()=>({access_token:'synthetic-token'})};
test('disconnect falls back to conditional HTTPS with fresh data on conflict',async()=>{
 const calls=[],responses=[new Response('{"revision":1}',{headers:{etag:'"v1"'}}),new Response('{}',{status:412}),new Response('{"revision":2}',{headers:{etag:'"v2"'}}),new Response('{}')];
 const restTransaction=createRESTTransaction({databaseURL:'https://synthetic.invalid',credential:credentials,fetchImpl:async(url,options)=>{calls.push({url,...options});return responses.shift();}});
 const result=await mcqEvaluationTransaction({ref:()=>({transaction:async()=>{throw Error('disconnect');}})},value=>({...value,revision:value.revision+1}),{restTransaction});
 assert.equal(result.snapshot.val().revision,3);assert.equal(calls[1].headers['if-match'],'"v1"');assert.equal(calls[3].headers['if-match'],'"v2"');assert.equal(JSON.parse(calls[3].body).revision,3);assert.equal(calls[0].headers.Authorization,'Bearer synthetic-token');
});
test('validation abort, non-disconnect errors and unavailable database never overwrite',async()=>{
 let writes=0;const rest=createRESTTransaction({databaseURL:'https://synthetic.invalid',credential:credentials,fetchImpl:async(_,options)=>{if(options.method==='PUT')writes++;return new Response('{}',{headers:{etag:'"version"'}});}});
 assert.equal((await rest('cbse',()=>undefined)).committed,false);assert.equal(writes,0);
 await assert.rejects(mcqEvaluationTransaction({ref:()=>({transaction:async()=>{throw Error('permission_denied');}})},()=>{}, {restTransaction:()=>{throw Error('wrong fallback');}}),/permission_denied/);
 const failed=createRESTTransaction({databaseURL:'https://synthetic.invalid',credential:credentials,fetchImpl:async()=>new Response('{}',{status:503})});await assert.rejects(failed('cbse',()=>({})),error=>error.code==='MCQ_DATABASE_UNAVAILABLE');
});

test('CSV bank recovery keeps its narrower path and retries conflicts without losing other uploads',async()=>{
 const calls=[],responses=[new Response('{"questions":{"other":{}}}',{headers:{etag:'"v1"'}}),new Response('{}',{status:412}),new Response('{"questions":{"other":{},"concurrent":{}}}',{headers:{etag:'"v2"'}}),new Response('{}')];
 const restTransaction=createRESTTransaction({databaseURL:'https://synthetic.invalid',credential:credentials,fetchImpl:async(url,options)=>{calls.push({url,...options});return responses.shift();}});
 const result=await mcqTransaction({ref:path=>{assert.equal(path,'cbse/mcq');return {transaction:async()=>{throw Object.assign(Error('Disconnected'),{code:'disconnect'});}};}},'cbse/mcq',bank=>({...bank,questions:{...bank.questions,uploaded:{}}}),{restTransaction});
 assert.deepEqual(Object.keys(result.snapshot.val().questions),['other','concurrent','uploaded']);assert.ok(calls.every(c=>c.url==='https://synthetic.invalid/cbse/mcq.json'));assert.equal(calls[3].headers['if-match'],'"v2"');
});
