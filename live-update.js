// Firebase updates saved data live. Deployments wait while a workspace is open.
let version=new URL(import.meta.url).searchParams.get('v');
let updatePending=false,reloading=false,checking=false;
function editing(){return document.documentElement.dataset.portalBusy==='true'||document.querySelector('dialog[open], form[data-portal-dirty="true"]')||document.activeElement?.matches?.('input,textarea,select,[contenteditable=true]')||Array.from(document.querySelectorAll('input[type="password"]')).some(input=>input.value);}
function workspaceOpen(){return document.querySelector('[data-mcq-workspace],[data-news-workspace],.faculty-unified-form')||location.pathname.endsWith('/cbse-mission.html')&&!!location.hash;}
function applyUpdate(requested=false){
 if(!updatePending||reloading)return;
 const unsafe=!!editing();
 if(unsafe||!requested&&workspaceOpen()){
  let notice=document.getElementById('portal-update-notice');
  if(!notice){notice=document.createElement('div');notice.id='portal-update-notice';notice.className='notice';notice.setAttribute('role','status');const text=document.createElement('span'),update=document.createElement('button');text.dataset.updateMessage='true';update.type='button';update.textContent='Update when ready';update.onclick=()=>applyUpdate(true);notice.append(text,update);(document.querySelector('main')||document.body).prepend(notice);}
  notice.querySelector('[data-update-message]').textContent=unsafe?'An app update is ready. Save or finish your current work first. ':'An app update is ready. You can keep working and update when ready. ';
  notice.querySelector('button').disabled=unsafe;
  return;
 }
 reloading=true;window.location.reload();
}
async function check(){
 if(checking||reloading||document.visibilityState==='hidden')return;
 checking=true;
 try{const response=await fetch(new URL('./app-version.json',import.meta.url),{cache:'no-store'});if(!response.ok)return;const latest=(await response.json()).version;if(typeof latest!=='string'||!latest)return;if(!version){version=latest;return;}if(latest!==version){updatePending=true;applyUpdate();}}
 catch{/* A failed deployment check never interrupts the working portal. */}
 finally{checking=false;}
}
check();setInterval(check,30000);
document.addEventListener('visibilitychange',check);
document.addEventListener('close',()=>setTimeout(()=>applyUpdate(),0),true);
document.addEventListener('input',event=>{const form=event.target?.closest?.('form[data-portal-track-dirty]');if(form)form.dataset.portalDirty='true';if(updatePending)applyUpdate();});
window.addEventListener('hashchange',()=>applyUpdate());
document.addEventListener('focusout',()=>{if(updatePending)setTimeout(()=>applyUpdate(),0);});
