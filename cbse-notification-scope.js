export const NOTIFICATION_SOURCES={
 mission:['remedialPlans','records','conversations','reportRequests','tasks','mcqBatches','mcqEvaluations','newsPosts','attendance','contactAudit','contributionClaims'],
 chamber:['rollReports','advanceLeaves','objections','podcasts','movementRequests']
};
const chamberKinds=new Set(['Today’s Roll Call approvals','Roll Call activity','Advance leave reviews','Advance leave activity','Open staff objections','Staff NOC activity','Podcast viewing reports','Podcast updates','Movement approvals','Movement activity']);
export function notificationsForScope(summary,scope='mission'){
 if(typeof scope!=='string'||!Object.hasOwn(NOTIFICATION_SOURCES,scope))throw Error('Choose Mission 100 or Principal Chamber notifications.');
 const belongs=item=>{const chamber=chamberKinds.has(item.kind)||String(item.href||'').startsWith('index.html#principal-chamber');return scope==='chamber'?chamber:!chamber;};
 const groups=Object.fromEntries(['pending','recent','news','archivedSeen'].map(k=>[k,(summary[k]||[]).filter(belongs)])),count=items=>new Set(items.filter(i=>!i.seen).map(i=>i.key||i.kind+'|'+i.id)).size;
 return {...summary,...groups,scope,pendingWorkCount:groups.pending.length,pendingCount:count(groups.pending),recentCount:count(groups.recent),unseenCount:count(Object.values(groups).flat())};
}
