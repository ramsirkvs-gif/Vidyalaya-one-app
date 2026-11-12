import test from 'node:test';import assert from 'node:assert/strict';
import {notificationsForScope} from '../cbse-notification-scope.js';
import {principalNotifications} from '../cbse-principal-notifications.js';
import {decoratePrincipalNotifications,applyNotificationSeen} from '../_server/principal-notification-state.js';
const now=Date.parse('2026-11-12T04:00:00Z');
test('each page filters current and archived notifications, and counts only its unseen entities',()=>{
 const chamber={key:'chamber',kind:'Today’s Roll Call approvals',href:'index.html#principal-chamber',seen:false},mission={key:'mission',kind:'Team News',href:'cbse-mission.html#tab=news',seen:false},past={...mission,key:'past',seen:true},summary={pending:[chamber],recent:[chamber,mission],news:[mission],archivedSeen:[past]};
 const c=notificationsForScope(summary,'chamber'),m=notificationsForScope(summary,'mission');assert.equal(c.unseenCount,1);assert.equal(c.pendingCount,1);assert.equal(c.archivedSeen.length,0);assert.equal(c.news.length,0);assert.equal(m.unseenCount,1);assert.equal(m.pendingCount,0);assert.deepEqual(m.archivedSeen,[past]);
});
test('podcast and NOC events belong to Chamber; a changed source resurfaces after Seen',()=>{
 const data={staffNames:{teacher:'Teacher'},podcasts:{posts:{p:{published:{title:'Guidance'},updatedAt:now}},acks:{p:{1:{teacher:{name:'Teacher',acknowledgedAt:now}}}}},objections:{o:{staffId:'teacher',name:'Teacher',remark:'Submit the exam bundle.',status:'open',createdName:'Examination IC',createdAt:now}}};
 const read=(seen={})=>notificationsForScope(decoratePrincipalNotifications(principalNotifications(data,now),data,seen,now),'chamber'),first=read(),item=first.pending[0];assert.ok(first.recent.some(i=>i.kind==='Podcast viewing reports'));assert.equal(item.detail,'Submit the exam bundle.');const seen={[item.key]:applyNotificationSeen(null,item,now)};assert.equal(read(seen).pendingCount,0);data.objections.o.status='cleared';data.objections.o.clearedBy='principal';data.objections.o.clearedAt=now+1;const updated=read(seen);assert.ok(updated.recent.some(i=>i.kind==='Staff NOC activity'&&!i.seen));assert.ok(!notificationsForScope(updated,'mission').recent.length);
});
