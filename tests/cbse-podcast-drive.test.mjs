import test from 'node:test';import assert from 'node:assert/strict';
import {podcastVideoSource,podcastVideoUrl,applyPodcast,teacherPodcasts,podcastCatalogue,acknowledgePodcast} from '../cbse-podcast-model.js';
const id='synthetic_drive_video_12345',staff={a:{name:'Teacher',status:'active',wing:'secondary'}};
test('Drive sharing links normalize safely and retain resource keys',()=>{
 for(const url of [`https://drive.google.com/file/d/${id}/view?usp=drive_link`,`https://drive.google.com/file/d/${id}/preview`,`https://drive.google.com/open?id=${id}`])assert.deepEqual(podcastVideoSource(url),{videoProvider:'drive',driveFileId:id});
 const source=podcastVideoSource(`https://drive.google.com/file/d/${id}/view?resourcekey=0-test_key`);assert.match(podcastVideoUrl(source),/resourcekey=0-test_key/);assert.deepEqual(podcastVideoSource('https://youtu.be/abcdefghijk'),{youtubeId:'abcdefghijk'});
 for(const url of ['https://drive.google.com.evil.test/file/d/'+id+'/view','javascript:alert(1)','https://drive.google.com/drive/folders/'+id,'https://user:pass@drive.google.com/file/d/'+id+'/view'])assert.throws(()=>podcastVideoSource(url));
});
test('Drive videos preserve publishing, assignment, private IDs and versioned reporting',()=>{
 const input={operation:'podcast-publish',expectedRevision:0,title:'Drive guidance',videoUrl:`https://drive.google.com/file/d/${id}/view`,recipientIds:['a']};let store=applyPodcast(null,input,staff,1,'one').next;
 assert.equal(teacherPodcasts(store,['a'])[0].driveFileId,id);assert.deepEqual(teacherPodcasts(store,['b']),[]);assert.ok(!JSON.stringify(podcastCatalogue(store,staff)).includes(id));assert.ok(!JSON.stringify(podcastCatalogue(store,staff)).includes('driveFileId'));
 store=acknowledgePodcast(store,{id:'one',version:1,acknowledged:true},{id:'a',name:'Teacher'},['a'],2);assert.ok(teacherPodcasts(store,['a'])[0].ack);assert.equal(teacherPodcasts(store,['a'])[0].driveFileId,id);
 store=applyPodcast(store,{...input,id:'one',expectedRevision:1},staff,3,'unused').next;assert.equal(teacherPodcasts(store,['a'])[0].ack,null);assert.ok(store.acks.one[1].a);
});
