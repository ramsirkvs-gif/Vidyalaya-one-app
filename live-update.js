// Firebase updates saved data live. This watcher applies new website deployments
// without signing out or discarding an active form or pending save.
let version=new URL(import.meta.url).searchParams.get('v');
let updatePending=false,reloading=false,checking=false;
function editing(){
 return document.documentElement.dataset.portalBusy==='true'||document.querySelector('dialog[open], form[data-portal-dirty="true"]')||Array.from(document.querySelectorAll('input[type="password"]')).some(input=>input.value);
}
function applyUpdate(){
 if(!updatePending||reloading)return;
 if(editing()){
  let notice=document.getElementById('portal-update-notice');
  if(!notice){notice=document.createElement('div');notice.id='portal-update-notice';notice.className='notice';notice.setAttribute('role','status');notice.textContent='An app update is ready. Finish or close your current form; it will apply automatically.';(document.querySelector('main')||document.body).prepend(notice);}
  return;
 }
 reloading=true;window.location.reload();
}
async function check(){
 if(checking||reloading||document.visibilityState==='hidden')return;
 checking=true;
 try{
  const response=await fetch(new URL('./app-version.json',import.meta.url),{cache:'no-store'});if(!response.ok)return;
  const latest=(await response.json()).version;if(typeof latest!=='string'||!latest)return;
  if(!version){version=latest;return;}
  if(latest!==version){updatePending=true;applyUpdate();}
 }catch{/* A failed deployment check never interrupts the working portal. */}
 finally{checking=false;}
}
check();setInterval(check,30000);
document.addEventListener('visibilitychange',check);
document.addEventListener('close',()=>setTimeout(applyUpdate,0),true);
document.addEventListener('input',event=>{const form=event.target?.closest?.('form[data-portal-track-dirty]');if(form)form.dataset.portalDirty='true';if(updatePending)applyUpdate();});
