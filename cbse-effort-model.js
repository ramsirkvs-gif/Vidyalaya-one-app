// Pure projections: no conversation text is changed when viewing or exporting.
export const effortDate=value=>{if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;if(!Number.isFinite(Number(value))||!Number(value))return '';return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Number(value)));};
export function validateEffort(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Enter an effort record.');
 const result=Object.fromEntries(['date','topic','actionTaken','outcome'].map(k=>[k,String(value[k]??'').trim()]));
 const parsed=new Date(result.date+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(result.date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==result.date)throw Error('Choose a valid effort date.');
 if(!result.topic||result.topic.length>160||result.actionTaken.length>2000||result.outcome.length>2000)throw Error('Enter a topic up to 160 characters; action and outcome may each contain up to 2000 characters.');return result;
}
export function effortRows(threads,staff,month=''){
 return threads.map(t=>{const e=t.effort||{},root=t.messages.find(r=>r.id===t.rootRecordId)||t.messages[0],date=e.date||effortDate(root?.date)||effortDate(t.createdAt),recipients=[...new Set(t.participantIds||[])];return {id:t.id,date,topic:e.topic||(!root?.deletedAt?(t.opening||'').split('\n')[0].slice(0,160):'Comment deleted by Principal.')||t.label,area:t.label,actionTaken:e.actionTaken||'',outcome:e.outcome||'',status:t.progress.closed?'Closed':'Open',recipientIds:recipients,recipientNames:recipients.map(id=>staff[id]?.name||'Former teacher'),authorId:t.createdBy,author:t.createdBy==='principal'?'Principal':root?.authorName||staff[t.createdBy]?.name||'Former teacher',replyCount:t.messages.length-1,awaiting:t.progress.awaiting.length,updatedAt:t.updatedAt,recordedBy:e.updatedBy||'',recordedAt:e.updatedAt||0};}).filter(r=>!month||r.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
const csvCell=value=>{let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
export function effortCSV(rows,urlFor=id=>id){
 const headers=['Date','Topic / effort','Class / team / context','Action taken','Outcome','Status','Started by','Author ID','Recipient names','Recipient IDs','Replies','Awaiting replies','Conversation ID','Conversation link','Summary recorded by','Summary recorded at'];
 return [headers,...rows.map(r=>[r.date,r.topic,r.area,r.actionTaken||'Not recorded',r.outcome||'Not recorded',r.status,r.author,r.authorId,r.recipientNames.join('; '),r.recipientIds.join('; '),r.replyCount,r.awaiting,r.id,urlFor(r.id),r.recordedBy,r.recordedAt?new Date(r.recordedAt).toISOString():''])].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
