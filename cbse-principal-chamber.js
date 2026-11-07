const chamber=document.getElementById('principal-chamber'),applications=document.querySelector('section[aria-labelledby="apps-title"]'),hero=document.querySelector('.hero');
function renderChamber(){
 const open=location.hash==='#principal-chamber';chamber.hidden=!open;applications.hidden=open;hero.hidden=open;
 document.title=open?'ONLINE -Principal Chamber | Vidyalaya One':'Vidyalaya One | Integrated School Management Portal';
 if(open){window.scrollTo({top:0,behavior:'instant'});document.getElementById('chamber-title').focus({preventScroll:true});}
}
window.addEventListener('hashchange',renderChamber);renderChamber();

let rollController,rollLoading;
async function openRollWorkspace(){const host=document.getElementById('roll-call-workspace');host.hidden=false;if(!rollController){rollLoading||=import('./cbse-roll-call-view.js').then(({renderRollCall})=>{rollController=renderRollCall(host);return rollController;}).catch(error=>{rollLoading=null;host.textContent='Could not open Roll Call. Please try again.';throw error;});await rollLoading;}return rollController;}
document.getElementById('open-roll-call').addEventListener('click',async event=>{event.preventDefault();await openRollWorkspace();document.getElementById('roll-call-workspace').scrollIntoView({block:'start',behavior:'smooth'});});
document.getElementById('chamber-principal-login').addEventListener('click',async()=>{const controller=await openRollWorkspace();await controller.openPrincipal();document.getElementById('roll-call-workspace').scrollIntoView({block:'start',behavior:'smooth'});});
