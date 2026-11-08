import test from 'node:test';import assert from 'node:assert/strict';
import {applyPodcast,acknowledgePodcast,teacherPodcasts,podcastAcknowledgementStatus,podcastCatalogue} from '../cbse-podcast-model.js';
const staff={a:{name:'Teacher A',status:'active',wing:'secondary'}},actor={id:'a',name:'Teacher A'},publish={operation:'podcast-publish',expectedRevision:0,title:'Guidance',videoUrl:'https://drive.google.com/file/d/synthetic_drive_video_12345/view',recipientIds:['a']};
test('delete clears only that video reports and pending list; same-link replacement starts fresh',()=>{
 let store=applyPodcast(null,publish,staff,1,'old').next;store=acknowledgePodcast(store,{id:'old',version:1,acknowledged:true},actor,['a'],2);
 store=applyPodcast(store,{...publish,id:'old',expectedRevision:1},staff,3,'unused').next;store=acknowledgePodcast(store,{id:'old',version:2,acknowledged:true},actor,['a'],4);
 store=applyPodcast(store,publish,staff,5,'other').next;store=acknowledgePodcast(store,{id:'other',version:1,acknowledged:true},actor,['a'],6);const other=structuredClone(store.acks.other);
 store=applyPodcast(store,{operation:'podcast-pending-publish',id:'old',expectedRevision:2},staff,7,'unused').next;const before=structuredClone(store);
 store=applyPodcast(store,{operation:'podcast-delete',id:'old',expectedRevision:3},staff,8,'unused').next;
 assert.equal(store.acks.old,undefined);assert.equal(store.posts.old.pendingList,null);assert.deepEqual(store.acks.other,other);assert.ok(before.acks.old[1].a);assert.ok(before.acks.old[2].a);assert.deepEqual(podcastAcknowledgementStatus(store,'old',staff),[]);assert.equal(podcastCatalogue(store,staff).some(v=>v.id==='old'),false);assert.throws(()=>acknowledgePodcast(store,{id:'old',version:2,acknowledged:true},actor,['a'],9),/no longer published/);
 store=applyPodcast(store,publish,staff,10,'replacement').next;const video=teacherPodcasts(store,['a']).find(v=>v.id==='replacement');assert.equal(video.ack,null);assert.equal(podcastAcknowledgementStatus(store,'replacement',staff)[0].ack,null);assert.equal(video.driveFileId,'synthetic_drive_video_12345');
 store=acknowledgePodcast(store,{id:'replacement',version:1,acknowledged:true},actor,['a'],11);assert.equal(store.acks.replacement[1].a.acknowledgedAt,11);
});
test('stale published data on a deleted video cannot expose playback or accept reports',()=>{const store={posts:{old:{deletedAt:1,published:{...publish,version:1,youtubeId:'abcdefghijk'}}}};assert.deepEqual(teacherPodcasts(store,['a']),[]);assert.deepEqual(podcastAcknowledgementStatus(store,'old',staff),[]);assert.throws(()=>acknowledgePodcast(store,{id:'old',version:1,acknowledged:true},actor,['a'],2),/no longer published/);});
