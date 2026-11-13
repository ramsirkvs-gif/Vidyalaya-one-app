export const NOTIFICATION_COLLECTIONS={
 'Contribution credit claims':'contributionClaims','Remedial approvals':'remedialPlans','Classes planned but not done':'remedialPlans','Returned records needing Principal review':'remedialPlans','Remedial class records':'remedialPlans','Returned remedial classes':'remedialPlans','Class plans':'remedialPlans','Class plan updates':'remedialPlans','Class cancellations':'remedialPlans',
 'Today’s Roll Call approvals':'rollReports','Roll Call activity':'rollReports','Advance leave reviews':'advanceLeaves','Advance leave activity':'advanceLeaves','Staff NOC activity':'objections','Podcast viewing reports':'podcasts','Podcast updates':'podcasts','Open staff objections':'objections','Teacher reports to follow up':'reportRequests','My pending tasks':'tasks','Member task updates':'tasks','MCQ contributions':'mcqBatches','MCQ evaluations':'mcqEvaluations','Progress updates':'records','Team News comments':'newsPosts','Team News':'newsPosts','Latest team news':'newsPosts','Student attendance activity':'attendance','Contact detail updates':'contactAudit','Movement approvals':'movementRequests','Movement activity':'movementRequests'
};
const alive=r=>!!r&&!r.deleted&&!r.deletedAt&&r.status!=='deleted';
export function notificationSourceExists(item,data){
 const collection=NOTIFICATION_COLLECTIONS[item.kind],parts=String(item.id||'').split('|');
 if(item.kind==='Conversations with unread feedback')return alive(data.conversations?.[item.id])||Object.entries(data.records||{}).some(([id,r])=>alive(r)&&r.visibility==='general'&&(r.conversationId===item.id||item.id==='legacy_'+id));
 if(!collection)return false;
 if(collection==='podcasts'){if(!alive(data.podcasts?.posts?.[parts[0]]))return false;return item.kind!=='Podcast viewing reports'||alive(data.podcasts?.acks?.[parts[0]]?.[parts[1]]?.[parts.slice(2).join('|')]);}
 const id=['remedialPlans','newsPosts'].includes(collection)?parts[0]:item.id,source=data[collection]?.[id];if(!alive(source))return false;
 if(collection==='records')return source.visibility==='general';
 if(item.kind==='Team News comments')return alive(source.comments?.[parts.slice(1).join('|')]);
 return true;
}
export function chamberNotificationTarget(item){
 const collection=NOTIFICATION_COLLECTIONS[item.kind],id=String(item.id||'');
 if(collection==='podcasts')return {area:'podcasts',tab:'podcasts',id:id.split('|')[0]};
 if(collection==='rollReports')return {area:'roll',tab:'records',id};
 if(collection==='advanceLeaves')return {area:'roll',tab:'advance-leave',id};
 if(collection==='objections')return {area:'roll',tab:'noc',id};
 if(collection==='movementRequests')return {area:'movement',tab:'',id};
 return null;
}
