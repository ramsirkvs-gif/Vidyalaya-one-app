// Reconcile older unlinked responses without rewriting saved conversation records.
export function teacherConversation(records,identityIds){
 const identities=new Set(identityIds),entries=Object.entries(records||{}).filter(([,r])=>!r.studentKey&&identities.has(r.staffId)&&r.kind==='faculty_comment'&&r.visibility==='general'),byId=new Map(entries),pending=[],normalised=new Map(entries.map(([id,r])=>[id,{...r}])),replied=new Set();
 const time=r=>Number(r.updatedAt)||Date.parse(r.date)||0;
 for(const[id,r]of [...entries].sort((a,b)=>time(a[1])-time(b[1]))){
  if(r.authorId==='principal'){if(!replied.has(id))pending.push(id);continue;}
  if(!identities.has(r.authorId))continue;
  let parent=r.replyToRecord;
  if(!parent&&time(r)>0)parent=[...pending].reverse().find(key=>time(byId.get(key))>0&&time(byId.get(key))<=time(r));
  const original=byId.get(parent);if(!original||original.authorId!=='principal')continue;
  normalised.get(id).replyToRecord=parent;replied.add(parent);const i=pending.indexOf(parent);if(i!==-1)pending.splice(i,1);
 }
 // An explicit saved link is authoritative even if an old import lacks timestamps.
 for(const[,r]of entries)if(identities.has(r.authorId)&&byId.get(r.replyToRecord)?.authorId==='principal')replied.add(r.replyToRecord);
 return {records:[...normalised],replied,pending:entries.filter(([id,r])=>r.authorId==='principal'&&!replied.has(id)).sort((a,b)=>time(a[1])-time(b[1])).map(([id])=>id)};
}
