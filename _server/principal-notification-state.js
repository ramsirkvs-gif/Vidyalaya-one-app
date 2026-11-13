import {NOTIFICATION_COLLECTIONS,notificationSourceExists} from '../cbse-notification-source.js';
import {createHash} from 'node:crypto';
import {remedialClassStatus} from '../cbse-remedial-status.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>hash(JSON.stringify(canonical(value)));
export const notificationAccountKey=uid=>hash(String(uid));
const collections=NOTIFICATION_COLLECTIONS;
export function decoratePrincipalNotifications(summary,data,seen={},now=Date.now(),includeSeen=false){
 const records=data.records||{},root=id=>{const visited=new Set();let key=id;while(records[key]?.replyToRecord&&records[records[key].replyToRecord]&&!visited.has(key)){visited.add(key);key=records[key].replyToRecord;}return key;},groups=new Map();
 for(const[id,r]of Object.entries(records))if(r.visibility==='general'){const key=r.conversationId||'legacy_'+root(id);if(!groups.has(key))groups.set(key,{});groups.get(key)[id]=r;}
 const conversation=id=>{const meta=data.conversations?.[id]||{},messages=Object.fromEntries(Object.entries(groups.get(id)||{}).map(([key,r])=>{const {conversationId,sequence,...record}=r;return [key,record];}));return {meta:{status:meta.status||'open',effort:meta.effort||null,followUp:!!meta.followUp,...(!id.startsWith('legacy_')?{context:meta.context||null}:{})},records:messages};};
 const stamp=item=>{
  const parts=String(item.id).split('|'),collection=collections[item.kind],id=collection==='remedialPlans'||collection==='newsPosts'?parts[0]:item.id;let entity=[collection||item.kind,id],source=data[collection]?.[id],contributor=item.title;
  if(item.kind==='Conversations with unread feedback'){entity=['conversation',item.id];source=conversation(item.id);const last=Object.values(source.records).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];contributor=last?.authorName||data.staffNames?.[last?.authorId]||'Conversation participants';}
  else if(collection==='records'){const r=source||{},thread=r.conversationId||'legacy_'+root(id);entity=['conversation',thread];source=conversation(thread);contributor=r.authorName||data.staffNames?.[r.authorId]||'Member';}
  else if(collection==='remedialPlans'){const p=source||{},day=/^\d{4}-\d{2}-\d{2}$/.test(parts[1]||'')?parts[1]:null,s=p.sessions?.[day]||{};if(day){entity=['remedialClass',id,day];source={teacherId:p.teacherId,teacherName:p.teacherName,classId:p.classId,sections:p.sections||[p.section],subject:p.subjectName,date:day,start:p.start,end:p.end,purpose:p.purpose,students:p.studentKeys,status:s.status||p.status||'planned',overdue:!s.submittedAt&&remedialClassStatus(p,day,now)==='Planned but not done',session:s};contributor=parts[2]==='approved'||parts[2]==='returned'?'Principal':item.kind==='Remedial approvals'||item.kind==='Remedial class records'?s.submittedByName||p.teacherName:item.kind==='Returned remedial classes'?'Principal':item.kind==='Classes planned but not done'?p.teacherName:item.kind==='Returned records needing Principal review'?'Principal':s.verifiedByName||'Principal';}else{const {sessions,revision,...plan}=p;source=plan;contributor=p.updatedByName||p.createdByName||p.teacherName||'Member';}}
  else if(collection==='newsPosts'){const p=source||{},comment=item.kind==='Team News comments'?p.comments?.[parts.slice(1).join('|')]:null;contributor=comment?.authorName||p.authorName||'Team News';}
  else if(collection==='rollReports'){const r=source||{};contributor=r.updatedByName||(r.status==='approved'||r.status==='not-approved'?'Principal':r.name)||item.title;}
  else if(collection==='advanceLeaves'){const r=source||{};contributor=r.reviewedBy==='principal'?'Principal':r.name||item.title;}
  else if(collection==='podcasts'){const [postId,version,...member]=parts,post=data.podcasts?.posts?.[postId]||{};if(item.kind==='Podcast viewing reports'){const staffId=member.join('|'),ack=data.podcasts?.acks?.[postId]?.[version]?.[staffId];entity=['podcastViewing',postId,version,staffId];source=ack;contributor=ack?.name||data.staffNames?.[staffId]||item.title;}else{entity=['podcastUpdate',postId];source=post;contributor='Principal';}}
  else if(collection==='objections'&&source?.status==='cleared')contributor=source.clearedByName||data.staffNames?.[source.clearedBy]||(source.clearedBy==='principal'?'Principal':source.createdName)||item.title;
  else if(collection==='objections')contributor=source?.createdByName||source?.createdName||data.staffNames?.[source?.createdBy]||source?.name||data.staffNames?.[source?.staffId]||item.title;
  else if(collection==='movementRequests')contributor=source?.lastActionActor==='principal'?'Principal':data.staffNames?.[source?.lastActionActor]||source?.name||item.title;
  else if(collection==='tasks')contributor=source?.updatedByName||source?.staffName||data.staffNames?.[source?.staffId]||(source?.staffId==='principal'?'Principal':item.title);
  else if(collection==='reportRequests'){entity=['reportRequest',id];source={request:source,replies:Object.fromEntries(Object.entries(records).filter(([,r])=>r.requestId===id&&r.visibility==='general'))};contributor=source.request?.createdByName||'Principal';}
  else if(collection==='contributionClaims')contributor=source?.contributorName||data.staffNames?.[source?.staffId]||item.title;
  else if(collection==='mcqBatches')contributor=source?.updatedByName||data.staffNames?.[source?.updatedBy]||source?.uploadedByName||data.staffNames?.[source?.uploadedBy]||source?.contributorName||item.title;
  else if(collection==='mcqEvaluations')contributor=source?.evaluatorName||data.staffNames?.[source?.evaluatorId]||item.title;
  const key=digest(entity),version=digest(source??{id:item.id,title:item.title,detail:item.detail,at:item.at,href:item.href}),isSeen=Object.hasOwn(seen[key]?.versions||{},version);
  return {...item,contributor:String(contributor||'Member'),key,version,seen:isSeen};
 };
 const pending=summary.pending.map(stamp),recent=summary.recent.map(stamp),news=summary.news.map(stamp),all=[...pending,...recent,...news],active=new Set(all.map(i=>i.key));
 const archivedSeen=includeSeen?Object.entries(seen).filter(([key,s])=>!active.has(key)&&s.snapshot&&notificationSourceExists(s.snapshot,data)&&Object.hasOwn(s.versions||{},s.snapshot.version)).map(([key,s])=>({...s.snapshot,key,seen:true})):[];
 const count=items=>new Set(items.filter(i=>!i.seen).map(i=>i.key)).size;
 return {...summary,pending,recent,news,archivedSeen,pendingWorkCount:summary.pendingCount,pendingCount:count(pending),recentCount:count(recent),unseenCount:count(all)};
}
export function applyNotificationSeen(current,item,now){
 const next=structuredClone(current||{});next.versions||={};if(Object.hasOwn(next.versions,item.version))return next;next.versions[item.version]=now;const latest=!next.snapshot||now>(next.seenAt||0);next.seenAt=Math.max(now,next.seenAt||0);if(latest)next.snapshot=Object.fromEntries(['key','version','kind','id','title','detail','contributor','at','href'].map(k=>[k,item[k]]));return next;
}
