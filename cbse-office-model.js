// Office identities are intentionally separate from Mission faculty and PIN identities.
export const OFFICE_MEMBERS=[
 {id:'arjun-bori',name:'Mr. Arjun Bori',designation:'ASO',title:'Office finance and administration tasks'},
 {id:'pramod-paswan',name:'Mr. Pramod Paswan',designation:'SSA',title:'Pre-National audit Vidyalaya Level internal audit Paras'},
 {id:'sumit-puri',name:'Mr. Sumit Puri',designation:'JSA',title:'Office administration tasks'}
];
export const officeMember=id=>OFFICE_MEMBERS.find(member=>member.id===id);
const check=(ok,message)=>{if(!ok)throw Error(message);};
const text=(value,max=5000)=>{check(typeof value==='string'&&value.length<=max,'A field is missing or too long.');return value.trim();};
export const OFFICE_FIELDS={task:'Task / audit para',fund:'Fund',voucherNo:'Voucher number / range',voucherDate:'Voucher date (as recorded)',amount:'Voucher amount (as recorded)',details:'Details',objections:'Audit observations / objections',sourceResponsible:'Original responsible names / committee',resolution:'Resolution / remarks',chequeDate:'Cheque issue date (as recorded)',chequeNo:'Cheque number',bank:'Bank',chequeAmount:'Cheque amount (as recorded)',voucherCount:'Vouchers covered',voucherRange:'Cheque voucher range',voucherFile:'Voucher file number',summarySheet:'Summary sheet number',registerPage:'Cheque register page',reviewNote:'Import / reconciliation notes',officeNotes:'Office-level audit notes',statusRemark:'Pending remark / update',sourceKey:'Source reference'};
export function emptyOfficeWorkspace(id){return {revision:0,title:officeMember(id)?.title||'',notes:'',rows:{}};}
export function officeRow(input,directory,retainedIds=[]){
 check(input&&typeof input==='object'&&!Array.isArray(input),'Enter a valid office record.');const row={};for(const key of Object.keys(OFFICE_FIELDS))row[key]=text(input[key]??'',key==='statusRemark'?2000:key==='officeNotes'?15000:key==='objections'||key==='details'||key==='resolution'?12000:5000);
 check(row.details||row.objections||row.voucherNo||row.chequeNo||row.task,'Enter task details, a voucher, or a cheque.');
 check(['pending','in-progress','resolved','not-applicable'].includes(input.status),'Choose a valid status.');row.status=input.status;
 check(Array.isArray(input.assignedIds)&&input.assignedIds.length<=100&&new Set(input.assignedIds).size===input.assignedIds.length&&input.assignedIds.every(id=>typeof id==='string'&&(Object.hasOwn(directory,id)||retainedIds.includes(id))),'Choose responsible members from the directory.');row.assignedIds=[...input.assignedIds];return row;
}
export function applyOfficeWorkspace(current,input,actor,directory,now){
 const prior=current||emptyOfficeWorkspace(input.memberId);check(actor.principal||actor.id===input.memberId,'Use the concerned office member’s PIN.');
 check(input.expectedRevision===prior.revision,'These office records changed. Refresh before saving; your entries are retained.');const next=structuredClone(prior),operation=input.operation;next.rows||={};
 if(operation==='save-row'){
  check(typeof input.rowId==='string'&&/^office_[a-zA-Z0-9_-]{1,90}$/.test(input.rowId),'Choose a valid record.');
  const old=prior.rows?.[input.rowId];check(actor.principal||input.memberId!=='pramod-paswan'||!old,'Only the Principal can edit existing audit details. Update Pending / Done instead.');check((input.rowRevision??0)===(old?.revision||0),'This record changed. Refresh before saving.');const row=officeRow(input.row,directory,old?.assignedIds||[]);
  next.rows[input.rowId]={...row,id:input.rowId,revision:(old?.revision||0)+1,createdAt:old?.createdAt||now,createdBy:old?.createdBy||actor.id,updatedAt:now,updatedBy:actor.id};
 }else if(operation==='import'){
  check(Array.isArray(input.rows)&&input.rows.length>0&&input.rows.length<=1000,'Import between 1 and 1000 records.');
  const keys=new Set(Object.values(next.rows).map(row=>row.sourceKey).filter(Boolean));for(const [index,source] of input.rows.entries()){
   const row=officeRow(source,directory);check(row.sourceKey,'Imported records need a source reference.');if(keys.has(row.sourceKey))continue;
   const id=input.importIds?.[index];check(typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!Object.hasOwn(next.rows,id),'Invalid import record ID.');keys.add(row.sourceKey);next.rows[id]={...row,id,revision:1,createdAt:now,createdBy:actor.id,updatedAt:now,updatedBy:actor.id};
  }
  if(input.notes!==undefined){const notes=text(input.notes,15000);if(!prior.notes)next.notes=notes;}
 }else if(operation==='set-voucher-status'){
  check(typeof input.rowId==='string'&&Object.hasOwn(prior.rows||{},input.rowId),'Choose an existing voucher.');check(['pending','resolved'].includes(input.status),'Choose Pending or Done.');
  const old=prior.rows[input.rowId];check(input.rowRevision===(old.revision||0),'This voucher changed. Refresh before updating its status.');const remark=text(input.remark??old.statusRemark??'',2000);check(input.status!=='pending'||remark,'Add a remark when marking a voucher Pending.');next.rows[input.rowId]={...old,status:input.status,statusRemark:remark,revision:(old.revision||0)+1,statusUpdatedAt:now,statusUpdatedBy:actor.id,updatedAt:now,updatedBy:actor.id};
 }else if(operation==='submit-report'){
  const reportText=text(input.reportText,5000);check(reportText,'Enter OK or your report remarks.');
  if(prior.report){next.reportHistory||={};next.reportHistory['report_'+prior.report.revision]=structuredClone(prior.report);}
  next.report={text:reportText,status:'submitted',revision:(prior.report?.revision||0)+1,submittedAt:now,submittedBy:actor.id};
 }else if(operation==='review-report'){
  check(actor.principal,'Only the Principal can review office reports.');check(prior.report?.status==='submitted','Choose a submitted office report.');next.report={...prior.report,status:'reviewed',reviewedAt:now,reviewedBy:actor.id};
 }else if(operation==='save-settings'){
  next.title=text(input.title,200);check(next.title,'Enter a task title.');next.notes=text(input.notes,15000);
 }else if(operation==='publish'){
  check(actor.principal,'Only the Principal can publish office work to staff.');
  next.published={summary:{title:prior.title,memberId:input.memberId,count:Object.keys(prior.rows||{}).length,publishedAt:now,revision:prior.revision+1},title:prior.title,notes:prior.notes||'',rows:Object.fromEntries(Object.entries(prior.rows||{}).map(([id,row])=>[id,{...row,assignedNames:row.assignedIds.map(key=>directory[key]?.name||key)}]))};
 }else if(operation==='unpublish'){
  check(actor.principal,'Only the Principal can withdraw published office work.');delete next.published;
 }else throw Error('Choose a valid office operation.');
 check(Object.keys(next.rows).length<=5000,'This register has reached 5000 rows.');next.revision=prior.revision+1;next.updatedAt=now;next.updatedBy=actor.id;return next;
}
export function searchOfficeRows(rows,{query='',status='',assignee='',assigneeIds=[],fund='',bank='',from='',to='',directory={}}={}){
 const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return Object.values(rows||{}).filter(row=>{
  const haystack=[...Object.keys(OFFICE_FIELDS).map(key=>row[key]),...(row.assignedNames||[]),...(row.assignedIds||[]).map(id=>directory[id]?.name||Object.values(directory).find(person=>person.identityIds?.includes(id))?.name||'')].join(' ').toLowerCase();const date=/^\d{4}-\d{2}-\d{2}$/.test(row.voucherDate)?row.voucherDate:row.chequeDate;
  return words.every(word=>haystack.includes(word))&&(!status||(status==='pending'?row.status!=='resolved':row.status===status))&&(!assignee||(assigneeIds.length?assigneeIds:[assignee]).some(id=>row.assignedIds?.includes(id)))&&(!fund||row.fund===fund)&&(!bank||row.bank===bank)&&(!from||/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>=from)&&(!to||/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=to);
 });
}
const normalise=value=>String(value).normalize('NFKC').toLowerCase().replace(/\b(mr|mrs|ms|dr|shri|smt|pr t|pgt|tgt|prt|ex)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\bjitender\b/g,'jitendra').replace(/\bsmrati\b/g,'smriti').replace(/\bajaya\b/g,'ajay');
export function matchOfficeResponsibility(source,directory){
 const ids=new Set(),unmatched=[];for(const raw of String(source||'').split(/\n|\s*&\s*/).map(v=>v.replace(/^\s*\d+[.\-)]?\s*/, '').replace(/[\"“”]/g,'').replace(/^with\s+/i,'').replace(/\s+(?:in discussion.*|for file)\s*$/i,'').trim()).filter(Boolean)){
  if(/^(?:na|nas|n\/a|-)$/i.test(raw))continue;
  const role=raw.toUpperCase().replace(/[^A-Z]/g,'');const office=OFFICE_MEMBERS.find(member=>member.designation===role);if(office&&directory['office:'+office.id]){ids.add('office:'+office.id);continue;}
  const tokens=normalise(raw).split(' ').filter(Boolean);if(!tokens.length||tokens.length===1&&tokens[0].length<4){unmatched.push(raw);continue;}
  const exact=Object.entries(directory).filter(([,p])=>[p.name,...(p.aliases||[])].some(name=>normalise(name)===normalise(raw)));const candidates=exact.length?exact:Object.entries(directory).filter(([,p])=>[p.name,...(p.aliases||[])].some(alias=>tokens.every(token=>normalise(alias+' '+(p.designation||'')).split(' ').some(name=>name===token||token.length===1&&name.startsWith(token)))));
  // Linked class profiles share the same human identity. Preserve the first exact identity;
  // differing names are ambiguous and require an explicit dropdown choice.
  if(candidates.length&&new Set(candidates.map(([,p])=>normalise(p.name))).size===1)ids.add(candidates[0][0]);else unmatched.push(raw);
 }
 return {assignedIds:[...ids],unmatched};
}
