import {clone,entries,emptyDraft,validateDraft,uniqueKey,importCSVFiles,buildPublic,moveStudent} from './cbse-model.js';
import {el,cell,head,options,stats,date} from './cbse-ui.js';
const $=id=>document.getElementById(id);
let draft=null,tab='students',busy=false,editorRevision=0,editorSave=null,reviewAction=null;
let auth,db,api,authApi,unsubscribeDraft,unsubscribePublic,user=null,generation=0,publication=null;
const PRINCIPAL_ACCOUNT='ramsirkvs@gmail.com';
function message(text,type='') {$('message').textContent=text;$('message').className=`notice ${type}`;}
function errorText(error) {
  const code=String(error.code||'').toLowerCase();
  if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return 'Password is incorrect.';
  if(code.includes('too-many-requests'))return 'Too many sign-in attempts. Please try again later.';
  if(code.includes('operation-not-allowed')||code.includes('configuration-not-found'))return 'Principal access has not been activated yet. Complete the one-time Firebase setup to enable password entry.';
  if(code.includes('permission'))return 'Access denied. Check the Principal UID and the CBSE database rules in Firebase Console.';
  if(code.includes('network'))return 'Cannot reach Firebase. Check your connection and try again.';
  return error.message||'The operation could not be completed.';
}
function lockUI() {
  draft=null;publication=null;$('workspace').hidden=true;$('login-panel').hidden=false;$('signout').hidden=!user;
  $('data-body').replaceChildren();$('stats').replaceChildren();$('editor').close();$('editor-fields').replaceChildren();$('review').close();$('review-content').replaceChildren();editorSave=null;reviewAction=null;
  unsubscribeDraft?.();unsubscribePublic?.();unsubscribeDraft=null;unsubscribePublic=null;
}
function classId(){return $('class-filter').value;}
function sections(){return draft?.classes[classId()].sections||{};}
function sectionId(){return $('section-filter').value;}
function section(){return sections()[sectionId()];}
function button(label,handler,danger=false){const b=el('button',label,danger?'danger':'');b.type='button';b.addEventListener('click',handler);return b;}
function actions(row,onEdit,onDelete){const td=cell(row,'');td.append(button('Edit',onEdit),button('Delete',onDelete,true));}
function publicationStatus(){
 const pub=publication;
 $('publish-status').textContent=pub?`Last published: ${date(pub.publishedAt)} (IST). ${pub.draftRevision===draft?.revision?'Public search matches the saved draft.':'There are saved changes that have not been published.'}`:'No public data has been published.';
}
function render(){
 if(!draft)return;
 const records=sections(),selected=sectionId();
 options($('section-filter'),entries(records).sort((a,b)=>a[1].name.localeCompare(b[1].name,undefined,{numeric:true})).map(([id,s])=>[id,`Section ${s.name}`]),selected);
 let total=0,count=0;for(const [,c]of entries(draft.classes))for(const [,s]of entries(c.sections)){total+=entries(s.students).length;count++;}
 stats($('stats'),[[total,'Total students'],[count,'Sections'],[draft.revision,'Saved revision']]);
 const names={students:'Students',sections:'Sections',subjects:'Subjects',streams:'Streams'};
 $('area-title').textContent=names[tab];$('add-record').textContent=`Add ${tab.slice(0,-1)}`;
 $('section-filter').disabled=tab==='sections'||tab==='streams';$('student-search').disabled=tab!=='students';
 $('add-record').disabled=busy||(['students','subjects'].includes(tab)&&!section());
 for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));
 $('data-panel').setAttribute('aria-labelledby',`tab-${tab}`);
 const notes={students:'Add or edit student records and subject choices. Roll numbers must be unique within each section.',sections:'Add, rename or remove sections. Assign a stream to each section.',subjects:'Subjects belong to the selected section. Removing a subject also removes its student selections.',streams:'Streams can be renamed. Stream assignments are managed in Sections.'};
 $('area-note').textContent=notes[tab];
 const body=$('data-body');body.replaceChildren();
 if(tab==='students'){
  head($('data-head'),['Roll no.','Student name','Subjects','Actions']);
  const q=$('student-search').value.trim().toLowerCase();
  const list=entries(section()?.students).filter(([,s])=>`${s.name} ${s.roll}`.toLowerCase().includes(q)).sort((a,b)=>a[1].roll.localeCompare(b[1].roll,undefined,{numeric:true}));
  for(const[id,s]of list){const row=el('tr');cell(row,s.roll);cell(row,s.name);cell(row,entries(s.subjects).map(([sid])=>section()?.subjects?.[sid]?.name).filter(Boolean).join(' · ')||'None selected').className='subject-list';actions(row,()=>editStudent(id),()=>deleteStudent(id));body.append(row);}
 }else if(tab==='sections'){
  head($('data-head'),['Section','Stream','Students','Subjects','Actions']);
  for(const[id,s]of entries(records)){const row=el('tr');cell(row,s.name);cell(row,draft.streams?.[s.stream]?.name||'—');cell(row,entries(s.students).length);cell(row,entries(s.subjects).length);actions(row,()=>editSection(id),()=>deleteSection(id));body.append(row);}
 }else if(tab==='subjects'){
  head($('data-head'),['Subject','Code','Students taking subject','Actions']);
  for(const[id,s]of entries(section()?.subjects)){const row=el('tr');cell(row,s.name);cell(row,s.code||'—');cell(row,entries(section()?.students).filter(([,s])=>s.subjects?.[id]).length);actions(row,()=>editSubject(id),()=>deleteSubject(id));body.append(row);}
 }else{
  head($('data-head'),['Stream','Assigned sections','Actions']);
  for(const[id,s]of entries(draft.streams)){const row=el('tr');cell(row,s.name);cell(row,entries(draft.classes).flatMap(([cl,c])=>entries(c.sections).filter(([,sec])=>sec.stream===id).map(([,sec])=>`${cl} ${sec.name}`)).join(', ')||'None');actions(row,()=>editStream(id),()=>deleteStream(id));body.append(row);}
 }
 $('data-empty').hidden=body.childElementCount>0;
 publicationStatus();
}
async function save(next,expected=draft?.revision){
 if(busy)throw Error('Please wait for the current operation.');
 if(!user||!draft)throw Error('Sign in again before saving.');
 validateDraft(next);const saveGeneration=generation;busy=true;message('Saving to the private database…');$('save-editor').disabled=true;$('add-record').disabled=true;
 try{
  const result=await api.runTransaction(api.ref(db,'cbse/draft'),current=>{
   const revision=current?.revision||0;if(revision!==expected)return;
   return {...next,revision:revision+1,updatedAt:Date.now()};
  },{applyLocally:false});
  if(!result.committed)throw Error('Another session changed this data. Close this form, review the latest records and try again. Nothing was overwritten.');
  if(saveGeneration!==generation)return false;
  draft=result.snapshot.val();message('Changes saved privately. Use Publish when the public page should update.','success');render();return true;
 }finally{busy=false;$('save-editor').disabled=false;if(draft)render();}
}
function field(name,label,value='',{type='text',max=120,required=true}={}){const wrap=el('label',label),input=el('input');input.name=name;input.type=type;input.value=value;input.required=required;input.maxLength=max;wrap.append(input);$('editor-fields').append(wrap);return input;}
function selectField(name,label,items,value){const wrap=el('label',label),input=el('select');input.name=name;options(input,items,value);wrap.append(input);$('editor-fields').append(wrap);return input;}
function openEditor(title,setup,onSave){if(busy)return;editorRevision=draft.revision;$('editor-title').textContent=title;$('editor-fields').replaceChildren();$('editor-error').hidden=true;setup();editorSave=onSave;$('editor').showModal();}
$('cancel-editor').onclick=()=>{if(!busy)$('editor').close();};
$('editor').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('editor-form').onsubmit=async e=>{e.preventDefault();try{if(!draft || draft.revision!==editorRevision)throw Error('Another session changed this data. Close this form, review the latest records and try again. Nothing was overwritten.');await editorSave(new FormData(e.target));$('editor').close();$('editor-fields').replaceChildren();editorSave=null;}catch(error){$('editor-error').textContent=errorText(error);$('editor-error').hidden=false;}};
function editSection(id){const cl=classId(),s=sections()[id];openEditor(id?'Edit section':'Add section',()=>{
 field('name','Section name',s?.name||'',{max:30});selectField('stream','Stream',[['','No stream'],...entries(draft.streams).map(([id,s])=>[id,s.name])],s?.stream||'');
 },async form=>{const next=clone(draft),all=next.classes[cl].sections||={};const sid=id||uniqueKey(form.get('name'),all);all[sid]={...(all[sid]||{subjects:{},students:{}}),name:form.get('name').trim(),stream:form.get('stream')};await save(next,editorRevision);});}
function editSubject(id){const cl=classId(),sid=sectionId(),s=section()?.subjects?.[id];openEditor(id?'Edit subject':'Add subject',()=>{
 field('name','Subject name',s?.name||'',{max:80});field('code','Subject code (optional)',s?.code||'',{max:20,required:false});
 },async form=>{const next=clone(draft),all=next.classes[cl].sections[sid].subjects||={};const key=id||uniqueKey(form.get('name'),all);all[key]={name:form.get('name').trim(),code:form.get('code').trim()};await save(next,editorRevision);});}
function editStream(id){const s=draft.streams?.[id];openEditor(id?'Edit stream':'Add stream',()=>field('name','Stream name',s?.name||'',{max:60}),async form=>{const next=clone(draft);next.streams||={};next.streams[id||uniqueKey(form.get('name'),next.streams)]={name:form.get('name').trim()};await save(next,editorRevision);});}
function editStudent(id){
 const cl=classId(),source=sectionId(),student=section()?.students?.[id];
 openEditor(id?'Edit student':'Add student',()=>{
  field('name','Student name',student?.name||'');field('roll','Roll number',student?.roll||'',{max:30});
  const target=selectField('section','Section',entries(sections()).map(([id,s])=>[id,s.name]),source);
  const box=el('fieldset'),legend=el('legend','Subject choices');box.append(legend);$('editor-fields').append(box);
  const originalNames=new Set(entries(student?.subjects).map(([sid])=>sections()[source].subjects?.[sid]?.name.toLowerCase()));
  const draw=()=>{while(box.children.length>1)box.lastChild.remove();for(const[sid,s]of entries(sections()[target.value].subjects)){const label=el('label'),input=el('input');input.type='checkbox';input.name='subjects';input.value=sid;input.checked=target.value===source?!!student?.subjects?.[sid]:originalNames.has(s.name.toLowerCase());label.append(input,document.createTextNode(s.name));box.append(label);}if(box.children.length===1)box.append(el('p','Add subjects to this section first, or save the student without subjects.','muted'));};target.onchange=draw;draw();
 },async form=>{const next=clone(draft);moveStudent(next,cl,source,form.get('section'),id,{name:form.get('name').trim(),roll:form.get('roll').trim(),subjects:Object.fromEntries(form.getAll('subjects').map(id=>[id,true]))});await save(next,editorRevision);});
}
function review(title,content,action,label='Confirm'){
 if(busy)return;$('review-title').textContent=title;$('review-content').replaceChildren(...(Array.isArray(content)?content:[el('p',content)]));reviewAction=action;
 $('confirm-review').hidden=!action;$('confirm-review').textContent=label;$('review').showModal();
}
$('cancel-review').onclick=()=>{if(!busy){$('review').close();reviewAction=null;}};
$('review').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('confirm-review').onclick=async()=>{const b=$('confirm-review');b.disabled=true;try{await reviewAction();$('review').close();$('review-content').replaceChildren();reviewAction=null;}catch(e){message(errorText(e),'error');}finally{b.disabled=false;}};
function deleteStudent(id){const next=clone(draft),expected=draft.revision,cl=classId(),sid=sectionId();delete next.classes[cl].sections[sid].students[id];review('Delete student?',`Delete ${section().students[id].name} from ${cl} ${section().name}? The public page changes only after publishing.`,()=>save(next,expected),'Delete student');}
function deleteSection(id){const next=clone(draft),expected=draft.revision,s=sections()[id];delete next.classes[classId()].sections[id];review('Delete section?',`Delete section ${s.name}, its ${entries(s.students).length} students and all of its subjects? Download a backup first if you may need these records.`,()=>save(next,expected),'Delete section and records');}
function deleteSubject(id){const next=clone(draft),expected=draft.revision,s=next.classes[classId()].sections[sectionId()];delete s.subjects[id];for(const[,student]of entries(s.students))if(student.subjects)delete student.subjects[id];review('Delete subject?',`Remove ${section().subjects[id].name} from this section and from every student's subject choices?`,()=>save(next,expected),'Delete subject');}
function deleteStream(id){const next=clone(draft),expected=draft.revision;delete next.streams[id];for(const[,cl]of entries(next.classes))for(const[,sec]of entries(cl.sections))if(sec.stream===id)sec.stream='';review('Delete stream?',`Delete ${draft.streams[id].name}? Assigned sections will have no stream until you choose another. Students will be kept.`,()=>save(next,expected),'Delete stream');}
$('add-record').onclick=()=>({students:editStudent,sections:editSection,subjects:editSubject,streams:editStream}[tab])();
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{tab=b.dataset.tab;render();};
$('class-filter').onchange=()=>{$('section-filter').value='';render();};$('section-filter').onchange=render;$('student-search').oninput=render;
$('import-csv').onclick=()=>$('csv-files').click();$('import-backup').onclick=()=>$('backup-file').click();
$('csv-files').onchange=async e=>{
 const files=Array.from(e.target.files);e.target.value='';if(!files.length||!draft)return;
 try{if(files.some(f=>f.size>5_000_000))throw Error('Each CSV must be smaller than 5 MB.');const expected=draft.revision;const result=importCSVFiles(draft,await Promise.all(files.map(async f=>({name:f.name,text:await f.text()}))));
 const nodes=[el('p','Matching roll numbers in each section are updated. Other students are retained. A dash means the subject is not selected.')];for(const s of result.summary)nodes.push(el('p',`Class ${s.classId} · Section ${s.section}: ${s.added} new, ${s.updated} updated.`));review('Review CSV import',nodes,()=>save(result.draft,expected),'Import into private draft');
 }catch(error){message(errorText(error),'error');}
};
$('backup-file').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file||!draft)return;
 try{if(file.size>10_000_000)throw Error('JSON import must be smaller than 10 MB.');const next=validateDraft(JSON.parse(await file.text())),expected=draft.revision;let count=0;for(const[,cl]of entries(next.classes))for(const[,s]of entries(cl.sections))count+=entries(s.students).length;
 review('Import private student data',`This file contains ${count} students. It will replace the current private draft, including sections, subjects and streams. Public data will not change until Publish is clicked.`,()=>save(next,expected),'Replace private draft');
 }catch(error){message(errorText(error),'error');}
};
$('export-backup').onclick=()=>{if(!draft)return;const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=`cbse-private-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function publicReview(){const output=buildPublic(draft,true),nodes=[el('p','Only student name, roll number, class, section and stream will be public. Subject selections will stay private.')];let count=0;for(const[,s]of entries(output.sections)){count+=s.count;nodes.push(el('p',`Class ${s.classId} · Section ${s.section} · ${s.stream||'No stream'} · ${s.count} students`));}nodes.unshift(el('p',`${count} students across ${entries(output.sections).length} sections. Saved revision ${draft.revision}.`));return {output,nodes};}
$('preview-publish').onclick=()=>{const{nodes}=publicReview();review('Review public data',nodes);};
$('publish').onclick=()=>{const {output,nodes}=publicReview();review('Publish student data?',nodes,async()=>{if(busy)return;busy=true;try{await api.set(api.ref(db,'cbse/public'),{...output,publishedAt:api.serverTimestamp()});message('Published. Connected public search pages will update automatically.','success');}finally{busy=false;}},'Publish approved fields');};
$('unpublish').onclick=()=>review('Unpublish all student data?','Public search will stop displaying the published records. Your private draft will remain available to the Principal.',async()=>{await api.remove(api.ref(db,'cbse/public'));message('Public data removed. Private draft retained.','success');},'Unpublish all');
$('login-form').onsubmit=async e=>{e.preventDefault();if(!auth)return;$('login-button').disabled=true;try{await authApi.signInWithEmailAndPassword(auth,PRINCIPAL_ACCOUNT,$('login-password').value);$('login-password').value='';}catch(error){message(errorText(error),'error');}finally{$('login-button').disabled=false;}};
$('signout').onclick=async()=>{if(busy){message('Wait for the current save to finish before signing out.');return;}await authApi.signOut(auth);};
async function connect(){
 try{
  const [client,authentication,database]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js')]);
  ({auth,db}=client);authApi=authentication;api=database;
  await authApi.setPersistence(auth,authApi.browserSessionPersistence);$('login-button').disabled=false;
  authApi.onAuthStateChanged(auth,async current=>{
   const token=++generation;user=current;lockUI();
   if(!current){message('Sign in with the Principal account. Your student data is not public.');return;}
   message('Checking Principal access…');
   try{
    const role=await api.get(api.ref(db,'cbse/adminUid'));if(token!==generation)return;
    if(role.val()!==current.uid)throw Error('This account is not registered as the Principal. Ask the school administrator to configure its Firebase UID.');
    $('login-panel').hidden=true;$('account').textContent='Principal workspace';
    unsubscribeDraft=api.onValue(api.ref(db,'cbse/draft'),snapshot=>{if(token!==generation)return;const value=snapshot.val();try{draft=value?validateDraft(value):emptyDraft();$('workspace').hidden=false;message(value?'Private data loaded. Edits appear publicly only after Publish.':'No student data imported yet. Import the private JSON or the nine CSV files to begin.');render();}catch(error){lockUI();message(errorText(error),'error');}},error=>{if(token===generation){lockUI();message(errorText(error),'error');}});
    unsubscribePublic=api.onValue(api.ref(db,'cbse/public'),snapshot=>{if(token===generation){publication=snapshot.val();publicationStatus();}});
   }catch(error){if(token===generation)message(errorText(error),'error');}
  });
 }catch(error){message('Secure sign-in could not load. Check your Internet connection and allow Firebase services, then reload. No private records were loaded.','error');}
}
connect();
