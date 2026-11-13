import test from 'node:test';import assert from 'node:assert/strict';
import {createRevisionReadCache} from '../_server/revision-read-cache.js';
import {createReadCoalescer} from '../cbse-read-coalescer.js';
test('unchanged versioned reads download the large source once, return isolated copies and detect updates',async()=>{
 let version=1,clock=0,reads=0;const value={body:'x'.repeat(100000),count:1},read=async path=>path==='revision'?version:(reads++,structuredClone(value));const cached=createRevisionReadCache({read,now:()=>clock});const first=await cached('data','revision');first.count=999;for(let i=0;i<10;i++)assert.equal((await cached('data','revision')).count,1);assert.equal(reads,1);value.count=2;version++;assert.equal((await cached('data','revision')).count,2);assert.equal(reads,2);clock=30001;await cached('data','revision');assert.equal(reads,3);await cached('data','revision',{fresh:true});assert.equal(reads,4);
});
test('concurrent reads coalesce; unversioned data, deleted revisions and failed reads stay fresh',async()=>{
 let version=1,reads=0,fail=false;const cached=createRevisionReadCache({read:async p=>{if(p==='revision')return version;reads++;await Promise.resolve();if(fail)throw Error('offline');return {n:reads};}});await Promise.all(Array.from({length:5},()=>cached('data','revision')));assert.equal(reads,1);version=null;await cached('data','revision');await cached('data','revision');assert.equal(reads,3);version=2;fail=true;await assert.rejects(cached('data','revision'),/offline/);fail=false;await cached('data','revision');assert.equal(reads,5);
});
test('cache never stores a payload across a concurrent version change and obeys its size bound',async()=>{
 let version=1,reads=0;const cached=createRevisionReadCache({read:async p=>{if(p==='revision')return version;reads++;if(reads===1)version=2;return {value:reads};}});await cached('data','revision');assert.equal((await cached('data','revision')).value,2);assert.equal(reads,2);let largeReads=0;const tiny=createRevisionReadCache({read:async p=>p==='revision'?1:(largeReads++,{long:'x'.repeat(100)}),maxBytes:10});assert.deepEqual(await tiny('data','revision'),{long:'x'.repeat(100)});assert.deepEqual(await tiny('data','revision'),{long:'x'.repeat(100)});assert.equal(largeReads,2);
});
test('browser coalescer merges simultaneous requests only and separates session keys',async()=>{
 const once=createReadCoalescer();let count=0;const load=async()=>++count;const results=await Promise.all([once('session1',load),once('session1',load),once('session2',load)]);assert.deepEqual(results,[1,1,2]);assert.equal(await once('session1',load),3);await assert.rejects(once('fail',async()=>{throw Error('retry')}),/retry/);assert.equal(await once('fail',load),4);
});
