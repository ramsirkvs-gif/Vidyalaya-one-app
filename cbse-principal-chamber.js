const chamber=document.getElementById('principal-chamber'),applications=document.querySelector('section[aria-labelledby="apps-title"]'),hero=document.querySelector('.hero');
function renderChamber(){
 const open=location.hash==='#principal-chamber';chamber.hidden=!open;applications.hidden=open;hero.hidden=open;
 document.title=open?'ONLINE -Principal Chamber | Vidyalaya One':'Vidyalaya One | Integrated School Management Portal';
 if(open){loadPublishedCatalogue();window.scrollTo({top:0,behavior:'instant'});document.getElementById('chamber-title').focus({preventScroll:true});}
}
window.addEventListener('hashchange',renderChamber);renderChamber();

let rollController,rollLoading;
async function openRollWorkspace(){const host=document.getElementById('roll-call-workspace');host.hidden=false;if(!rollController){rollLoading||=import('./cbse-roll-call-view.js').then(({renderRollCall})=>{rollController=renderRollCall(host,{deferOpen:true});return rollController;}).catch(error=>{rollLoading=null;host.textContent='Could not open Roll Call. Please try again.';throw error;});await rollLoading;}return rollController;}
document.getElementById('open-roll-call').addEventListener('click',async event=>{event.preventDefault();const controller=await openRollWorkspace();await controller.openReporting();document.getElementById('roll-call-workspace').scrollIntoView({block:'start',behavior:'smooth'});});
document.getElementById('chamber-principal-login').addEventListener('click',async()=>{const controller=await openRollWorkspace();await controller.openPrincipal();document.getElementById('roll-call-workspace').scrollIntoView({block:'start',behavior:'smooth'});});

function applyPublishedCatalogue(value){const tile=document.getElementById('open-roll-call');tile.hidden=!value.enabled;tile.querySelector('strong').textContent=value.title;tile.querySelector('b').textContent='Open '+value.title+' →';}
async function loadPublishedCatalogue(){try{const response=await fetch('/api/staff-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'chamber-read'})});if(response.ok){const value=await response.json();if(value.reporting)applyPublishedCatalogue(value.reporting);}}catch{}}
window.addEventListener('chamber-reporting-published',event=>applyPublishedCatalogue(event.detail));
document.getElementById('open-principal-podcasts').addEventListener('click',async event=>{event.preventDefault();const controller=await openRollWorkspace();await controller.openPodcasts();document.getElementById('roll-call-workspace').scrollIntoView({block:'start',behavior:'smooth'});});

const sessionStatus=document.getElementById('chamber-session-status'),signoutButton=document.getElementById('chamber-principal-signout');
window.addEventListener('chamber-principal-session',event=>{signoutButton.hidden=!event.detail.signedIn;document.getElementById('chamber-principal-login').textContent=event.detail.signedIn?'Principal Dashboard':'Principal Sign-in / Dashboard';sessionStatus.textContent=event.detail.message||'';});
signoutButton.addEventListener('click',async()=>{const controller=await openRollWorkspace();await controller.signout();});

let sessionWatching=false;
async function watchPrincipalSession(){if(sessionWatching)return;sessionWatching=true;try{const [{auth},{onAuthStateChanged}]=await Promise.all([import('./firebase-client.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);await auth.authStateReady();onAuthStateChanged(auth,async user=>{if(!user){window.dispatchEvent(new CustomEvent('chamber-principal-session',{detail:{signedIn:false}}));return;}try{const token=await user.getIdToken(),response=await fetch('/api/staff-access',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'chamber-read'})});if(auth.currentUser?.uid!==user.uid)return;window.dispatchEvent(new CustomEvent('chamber-principal-session',{detail:{signedIn:response.ok}}));}catch{}});}catch{sessionWatching=false;}}
window.addEventListener('hashchange',()=>{if(location.hash==='#principal-chamber')watchPrincipalSession();});
if(location.hash==='#principal-chamber')watchPrincipalSession();

document.getElementById('open-pending-roll-calls').addEventListener('click',async event=>{event.preventDefault();const controller=await openRollWorkspace();await controller.openPending();document.getElementById('roll-call-workspace').scrollIntoView({block:'start',behavior:'smooth'});});
