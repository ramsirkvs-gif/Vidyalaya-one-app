const chamber=document.getElementById('principal-chamber'),applications=document.querySelector('section[aria-labelledby="apps-title"]'),hero=document.querySelector('.hero');
function renderChamber(){
 const open=location.hash==='#principal-chamber';chamber.hidden=!open;applications.hidden=open;hero.hidden=open;
 document.title=open?'ONLINE -Principal Chamber | Vidyalaya One':'Vidyalaya One | Integrated School Management Portal';
 if(open){window.scrollTo({top:0,behavior:'instant'});document.getElementById('chamber-title').focus({preventScroll:true});}
}
window.addEventListener('hashchange',renderChamber);renderChamber();

let rollOpened=false;
document.getElementById('open-roll-call').addEventListener('click',async event=>{event.preventDefault();const host=document.getElementById('roll-call-workspace');host.hidden=false;if(!rollOpened){rollOpened=true;try{const {renderRollCall}=await import('./cbse-roll-call-view.js');renderRollCall(host);}catch(e){rollOpened=false;host.textContent='Could not open Roll Call. Please try again.';}}host.scrollIntoView({block:'start',behavior:'smooth'});});
