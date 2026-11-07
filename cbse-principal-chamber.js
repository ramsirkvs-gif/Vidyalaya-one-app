const chamber=document.getElementById('principal-chamber'),applications=document.querySelector('section[aria-labelledby="apps-title"]'),hero=document.querySelector('.hero');
function renderChamber(){
 const open=location.hash==='#principal-chamber';chamber.hidden=!open;applications.hidden=open;hero.hidden=open;
 document.title=open?'Online Principal Chamber | Vidyalaya One':'Vidyalaya One | Integrated School Management Portal';
 if(open){window.scrollTo({top:0,behavior:'instant'});document.getElementById('chamber-title').focus({preventScroll:true});}
}
window.addEventListener('hashchange',renderChamber);renderChamber();
