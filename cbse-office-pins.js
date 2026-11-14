import {el} from './cbse-ui.js';
export async function renderOfficePINSettings(host,{api,run}){
 const result=await api({action:'office-pin-settings',operation:'read'});
 host.append(el('h3','Office members — separate PIN list'),el('p','These PINs open only Office work, finance and admin reporting. Existing teacher PINs and permissions are unchanged. Create a PIN only for the selected office member.'));
 for(const member of result.members){
  const card=el('section',undefined,'office-card'),form=el('form'),label=el('label','Office PIN'),pin=el('input'),status=el('p');
  pin.type='password';pin.inputMode='numeric';pin.autocomplete='new-password';pin.pattern='[0-9]{3}|[0-9]{6,12}';pin.required=true;pin.setAttribute('aria-label','Office PIN for '+member.name);label.append(pin);
  const save=el('button',member.pinSet?'Set / replace office PIN':'Create office PIN');status.setAttribute('role','status');status.textContent=member.enabled?'Access enabled':member.pinSet?'Access disabled':'PIN not created';form.append(label,save);form.dataset.portalTrackDirty='true';
  const reveal=el('details'),value=el('p'),disable=el('button','Disable office access');reveal.append(el('summary','Show current office PIN (Principal only)'),value);disable.type='button';
  const update=rows=>{const current=rows.find(row=>row.id===member.id);Object.assign(member,current);value.textContent=current.pin;reveal.hidden=!current.pin;reveal.open=false;disable.hidden=!current.pinSet;save.textContent=current.pinSet?'Set / replace office PIN':'Create office PIN';};update(result.members);
  form.onsubmit=event=>{event.preventDefault();run(async()=>{const saved=await api({action:'office-pin-settings',operation:'set-pin',memberId:member.id,pin:pin.value});pin.value='';form.dataset.portalDirty='false';update(saved.members);status.textContent='Office PIN saved. Previous office sessions for this member are invalidated.';});};
  disable.onclick=()=>run(async()=>{const saved=await api({action:'office-pin-settings',operation:'disable',memberId:member.id});update(saved.members);status.textContent='Office access disabled.';});
  card.append(el('h4',member.name+' · '+member.designation),status,form,reveal,disable);host.append(card);
 }
}
