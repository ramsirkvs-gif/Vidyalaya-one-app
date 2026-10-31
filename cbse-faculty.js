import {clone,entries,uniqueKey,emptyDraft} from './cbse-model.js';
import {emptyFaculty,validateFaculty,clearTeacherRoles,removeFaculty,mergeFacultyRoster} from './cbse-faculty-model.js';
import {el,cell,options,stats} from './cbse-ui.js';
import {resetFacultySetup,showFacultySetup} from './cbse-faculty-setup.js';
const $=id=>document.getElementById(id);
let data=null,studentClasses=null,currentClass='X',user=null,busy=false,generation=0,principalVerified=false;
let api,authApi,auth,db,stopFaculty,stopStudents,editorSave,editorRevision=0,reviewSave;
const area=()=>data?.classes[currentClass];
const classSections=cl=>studentClasses?.[cl]?.sections||{};
const conflict='Another session changed faculty data. Close this form, review the latest data and try again. Nothing was overwritten.';
function message(text,type=''){$('faculty-message').textContent=text;$('faculty-message').className=`notice ${type}`;}
function errorText(error){const code=String(error.code||'').toLowerCase();if(code.includes('permission'))return 'Faculty access needs activation. Publish the updated database rules in Firebase Console, then reload this page.';if(code.includes('network'))return 'Connection failed. Your changes have not been confirmed. Please try again.';return error.message||'The operation could not be completed.';}
function lock(){data=null;studentClasses=null;stopFaculty?.();stopStudents?.();stopFaculty=null;stopStudents=null;$('faculty-workspace').hidden=true;$('faculty-locked').hidden=!!user;resetFacultySetup();$('faculty-signout').hidden=!user;$('faculty-body').replaceChildren();$('faculty-roles').replaceChildren();$('faculty-stats').replaceChildren();$('faculty-search').value='';$('faculty-editor').close();$('faculty-editor-fields').replaceChildren();$('faculty-review').close();$('faculty-review-content').replaceChildren();editorSave=null;reviewSave=null;}
function accessError(error){
 lock();
 if(principalVerified&&String(error.code||'').toLowerCase().includes('permission')){
  showFacultySetup();message('You are signed in. Complete the three setup steps below to enable Faculty.');
 }else message(errorText(error),'error');
}
function setBusy(value){busy=value;document.documentElement.dataset.portalBusy=String(value);for(const button of document.querySelectorAll('#faculty-workspace button,#faculty-workspace select,#faculty-save,#faculty-confirm,#faculty-signout'))button.disabled=value;}
function availableOptions(cl){return [['','-- Select --'],...entries(data.classes[cl].teachers).filter(([,t])=>t.status!=='inactive').sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([id,t])=>[id,`${t.name} (${t.designation})${t.status==='vacant'?' — VACANT':''}`])];}
function action(label,fn,danger=false){const b=el('button',label,danger?'danger':'');b.type='button';b.onclick=fn;return b;}
function render(){
 if(!data||!studentClasses)return;
 $('faculty-workspace').hidden=false;$('faculty-locked').hidden=true;resetFacultySetup();
 for(const b of document.querySelectorAll('[data-class]'))b.setAttribute('aria-selected',String(b.dataset.class===currentClass));
 $('faculty-area').setAttribute('aria-labelledby',currentClass==='X'?'faculty-tab-x':'faculty-tab-xii');
 $('faculty-heading').textContent=`Class ${currentClass} Faculty`;$('roles-heading').textContent=`Class ${currentClass} · Section responsibilities`;
 const teachers=entries(area().teachers),q=$('faculty-search').value.trim().toLowerCase();
 stats($('faculty-stats'),[[teachers.filter(([,t])=>t.status==='active').length,'Active faculty'],[teachers.filter(([,t])=>t.status==='vacant').length,'Vacant positions'],[entries(classSections(currentClass)).length,'Sections']]);
 const body=$('faculty-body');body.replaceChildren();
 for(const[id,t]of teachers.filter(([,t])=>`${t.name} ${t.designation} ${t.subjects}`.toLowerCase().includes(q)).sort((a,b)=>a[1].name.localeCompare(b[1].name))){
  const row=el('tr');cell(row,t.name);cell(row,t.designation);cell(row,t.subjects||'—');cell(row,t.teachingSections||'—');cell(row,t.status.toUpperCase());const buttons=cell(row,'');buttons.append(action('Edit',()=>editTeacher(id)),action('Remove',()=>deleteTeacher(id),true));body.append(row);
 }
 $('faculty-empty').hidden=body.childElementCount>0;
 const rolesBody=$('faculty-roles');rolesBody.replaceChildren();
 for(const[sid,section]of entries(classSections(currentClass)).sort((a,b)=>a[1].name.localeCompare(b[1].name,undefined,{numeric:true}))){
  const row=el('tr'),saved=area().roles?.[sid]||{classTeacher:'',coClassTeacher:''};cell(row,`Class ${currentClass} · ${section.name}`);
  for(const[field,label]of [['classTeacher','Class teacher'],['coClassTeacher','Co-class teacher']]){
   const select=el('select');select.setAttribute('aria-label',`${label} for Class ${currentClass} Section ${section.name}`);options(select,availableOptions(currentClass),saved[field]||'');
   select.onchange=async()=>{if(busy)return;const next=clone(data),expected=data.revision;next.classes[currentClass].roles||={};next.classes[currentClass].roles[sid]||={classTeacher:'',coClassTeacher:''};next.classes[currentClass].roles[sid][field]=select.value;try{await save(next,expected);}catch(e){render();message(errorText(e),'error');}};
   cell(row,'').append(select);
  }
  const other=cell(row,'');for(const[,role]of entries(saved.other))other.append(el('p',`${role.label}: ${area().teachers?.[role.teacherId]?.name||'Unassigned'}`,'muted'));
  other.append(action('Other roles',()=>editOtherRoles(sid)));rolesBody.append(row);
 }
 $('faculty-no-sections').hidden=rolesBody.childElementCount>0;
 if(busy)setBusy(true);
}
async function save(next,expected=data?.revision){
 if(busy)throw Error('Please wait for the current operation.');if(!data||!user)throw Error('Sign in again before saving.');
 // Removed student sections must not leave hidden assignments that block reuse.
 for(const cl of ['X','XII'])for(const sid of Object.keys(next.classes[cl].roles||{}))if(!classSections(cl)[sid])delete next.classes[cl].roles[sid];
 validateFaculty(next);const token=generation;setBusy(true);message('Saving private faculty data…');
 try{
  const result=await api.runTransaction(api.ref(db,'cbse/facultyDraft'),current=>{const revision=current?.revision||0;if(revision!==expected)return;return {...next,revision:revision+1,updatedAt:Date.now()};},{applyLocally:false});
  if(!result.committed)throw Error(conflict);if(token!==generation)return false;data=validateFaculty(result.snapshot.val());render();message('Faculty changes saved privately.','success');return true;
 }finally{setBusy(false);}
}
function field(name,label,value='',max=120,required=true){const wrap=el('label',label),input=el('input');input.name=name;input.value=value;input.maxLength=max;input.required=required;wrap.append(input);$('faculty-editor-fields').append(wrap);return input;}
function selectField(name,label,items,value){const wrap=el('label',label),select=el('select');select.name=name;options(select,items,value);wrap.append(select);$('faculty-editor-fields').append(wrap);return select;}
function openEditor(title,setup,onSave){if(busy)return;editorRevision=data.revision;editorSave=onSave;$('faculty-editor-title').textContent=title;$('faculty-editor-fields').replaceChildren();$('faculty-editor-error').hidden=true;setup();$('faculty-editor').showModal();}
function editTeacher(id){const cl=currentClass,t=area().teachers?.[id];openEditor(id?'Edit faculty':'Add faculty',()=>{
 field('name','Faculty name',t?.name||'');field('designation','Designation',t?.designation||'',100);field('subjects','Subjects / expertise',t?.subjects||'',300,false);field('teachingSections','Teaching sections (e.g. A, C)',t?.teachingSections||'',150,false);selectField('status','Status',[['active','Active'],['vacant','Vacant position'],['inactive','Inactive']],t?.status||'active');$('faculty-editor-fields').append(el('p','Marking faculty inactive clears their class teacher, co-class teacher and other role assignments in this standard.','muted'));
 },async form=>{const next=clone(data),a=next.classes[cl];a.teachers||={};const tid=id||uniqueKey(form.get('name'),a.teachers);a.teachers[tid]={name:form.get('name').trim(),designation:form.get('designation').trim(),subjects:form.get('subjects').trim(),teachingSections:form.get('teachingSections').trim(),status:form.get('status')};if(form.get('status')==='inactive')clearTeacherRoles(a,tid);return save(next,editorRevision);});}
function editOtherRoles(sid){const cl=currentClass,section=classSections(cl)[sid],saved=area().roles?.[sid];openEditor(`Other roles · Class ${cl} ${section.name}`,()=>{
 const list=el('div');list.id='extra-role-list';$('faculty-editor-fields').append(list);
 const add=(label='',teacherId='')=>{const row=el('fieldset');const wrap=el('label','Role name'),name=el('input');name.name='role-label';name.required=true;name.maxLength=60;name.value=label;wrap.append(name);const selectWrap=el('label','Faculty member'),select=el('select');select.name='role-teacher';select.required=true;options(select,availableOptions(cl),teacherId);selectWrap.append(select);row.append(wrap,selectWrap,action('Remove role',()=>row.remove(),true));list.append(row);};
 for(const[,r]of entries(saved?.other))add(r.label,r.teacherId);
 $('faculty-editor-fields').append(action('Add responsibility',()=>{if(list.children.length>=10)return;add();}));
 },async form=>{const next=clone(data),a=next.classes[cl];a.roles||={};a.roles[sid]||={classTeacher:'',coClassTeacher:''};const labels=form.getAll('role-label'),teachers=form.getAll('role-teacher'),other={};labels.forEach((label,i)=>other[`role_${i+1}`]={label:label.trim(),teacherId:teachers[i]});a.roles[sid].other=other;return save(next,editorRevision);});}
function review(title,nodes,onSave,label){if(busy)return;$('faculty-review-title').textContent=title;$('faculty-review-content').replaceChildren(...nodes);reviewSave=onSave;$('faculty-confirm').textContent=label;$('faculty-review').showModal();}
function deleteTeacher(id){const cl=currentClass,expected=data.revision,next=removeFaculty(data,cl,id);review('Remove faculty?',[el('p',`Remove ${area().teachers[id].name} from Class ${cl}? Their teacher and other role assignments in this standard will be cleared. The other standard is unchanged.`)],()=>save(next,expected),'Remove faculty');}
$('faculty-form').onsubmit=async e=>{e.preventDefault();try{if(!data||data.revision!==editorRevision)throw Error(conflict);const saved=await editorSave(new FormData(e.target));if(saved===false)return;$('faculty-editor').close();$('faculty-editor-fields').replaceChildren();editorSave=null;}catch(e){$('faculty-editor-error').textContent=errorText(e);$('faculty-editor-error').hidden=false;}};
$('faculty-cancel').onclick=()=>{if(!busy)$('faculty-editor').close();};$('faculty-review-cancel').onclick=()=>{if(!busy)$('faculty-review').close();};
for(const id of ['faculty-editor','faculty-review'])$(id).addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('faculty-confirm').onclick=async()=>{try{if(await reviewSave()===false)return;$('faculty-review').close();$('faculty-review-content').replaceChildren();reviewSave=null;}catch(e){message(errorText(e),'error');}};
$('faculty-add').onclick=()=>editTeacher();$('faculty-search').oninput=render;
for(const b of document.querySelectorAll('[data-class]'))b.onclick=()=>{if(busy)return;currentClass=b.dataset.class;$('faculty-search').value='';render();};
$('faculty-import').onclick=()=>$('faculty-file').click();
$('faculty-file').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file||!data||!user||busy)return;
 const token=generation,expected=data.revision;
 try{
  setBusy(true);message('Reading the faculty PDF privately in your browser…');const {readFacultyPDF}=await import('./cbse-faculty-pdf.js');const parsed=await readFacultyPDF(file);if(token!==generation||!data)return;if(data.revision!==expected)throw Error(conflict);
  const merged=mergeFacultyRoster(data,parsed.roster,studentClasses,parsed.digest);setBusy(false);
  const nodes=[el('p','Only faculty teaching Class X or XII are captured. Existing faculty edits and saved assignments are retained.')];
  for(const cl of ['X','XII'])nodes.push(el('p',`Class ${cl}: ${merged.summary[cl].added} new faculty; ${merged.summary[cl].kept} existing records retained.`));
  nodes.push(el('p',merged.screenshotApplied?'Class teacher/co-class teacher defaults from your screenshot are included for empty section assignments. Class X-A is unset because its row was cropped.':'This is a different roster. Set teacher roles after import; screenshot defaults were not applied.'));
  review('Review faculty import',nodes,()=>save(merged.data,expected),'Import faculty privately');message('Review the faculty import before saving.');
 }catch(e){if(token===generation)message(errorText(e),'error');}finally{setBusy(false);}
};
$('faculty-export').onclick=()=>{if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=`cbse-faculty-private-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('faculty-signout').onclick=async()=>{if(!busy)await authApi.signOut(auth);};
try{
 const [client,authentication,database]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js')]);({auth,db}=client);authApi=authentication;api=database;
 authApi.onAuthStateChanged(auth,async current=>{
  const token=++generation;user=current;principalVerified=false;lock();if(!current){message('Sign in to the portal before opening Faculty feeding.');return;}
  try{
   const principal=await api.get(api.ref(db,'cbse/adminUid'));if(token!==generation)return;if(principal.val()!==current.uid)throw Error('This account is not registered as the Principal.');principalVerified=true;$('faculty-locked').hidden=true;
   stopStudents=api.onValue(api.ref(db,'cbse/draft'),snapshot=>{if(token!==generation)return;studentClasses=snapshot.val()?.classes||emptyDraft().classes;render();},error=>{if(token===generation)accessError(error);});
   stopFaculty=api.onValue(api.ref(db,'cbse/facultyDraft'),snapshot=>{if(token!==generation)return;try{data=snapshot.val()?validateFaculty(snapshot.val()):emptyFaculty();render();message(snapshot.val()?'Private faculty data loaded. Changes are saved across your devices.':'Import your faculty PDF once to capture Class X/XII faculty, or add faculty manually.');}catch(e){lock();message(errorText(e),'error');}},error=>{if(token===generation)accessError(error);});
  }catch(e){if(token===generation)accessError(e);}
 });
}catch{lock();message('Secure faculty feeding could not load. Check your connection and reload.','error');}
