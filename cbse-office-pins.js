import {renderPINAudit} from './cbse-pin-audit-view.js';
import {el} from './cbse-ui.js';
export async function renderOfficePINSettings(host,{api,run}){
 const result=await api({action:'office-pin-settings',operation:'read'});
 host.append(el('h3','Office members — separate PIN list'),el('p','These PINs open only Office work, finance and admin reporting. Existing teacher PINs and permissions are unchanged. Create a PIN only for the selected office member.'));
 const auditHost=el('div');host.append(auditHost);renderPINAudit(auditHost,result.pinAudit);
 for(const member of result.members){
  const card=el('section',undefined,'office-card'),form=el('form'),label=el('label','Office PIN'),pin=el('input'),status=el('p');
  pin.type='password';pin.inputMode='numeric';pin.autocomplete='new-password';pin.pattern='[0-9]{3}|[0-9]{6,12}';pin.required=true;pin.setAttribute('aria-label','Office PIN for '+member.name);label.append(pin);
  const save=el('button',member.pinSet?'Set / replace office PIN':'Create office PIN');status.setAttribute('role','status');status.textContent=member.enabled?'Access enabled':member.pinSet?'Access disabled':'PIN not created';form.append(label,save);form.dataset.portalTrackDirty='true';
  const generate=el('button','Generate unique 3-digit PIN');generate.type='button';
  const reveal=el('details'),value=el('p'),disable=el('button','Disable office access');reveal.append(el('summary','Show current office PIN (Principal only)'),value);disable.type='button';
  const update=rows=>{const current=rows.find(row=>row.id===member.id);Object.assign(member,current);value.textContent=current.pin;reveal.hidden=!current.pin;reveal.open=false;disable.hidden=!current.pinSet;generate.hidden=current.pinSet;save.textContent=current.pinSet?'Set / replace office PIN':'Create office PIN';};update(result.members);
  const savePIN=operation=>run(async()=>{if(operation==='generate-pin')status.textContent='Checking for an unused three-digit PIN…';let saved;try{saved=await api({action:'office-pin-settings',operation,memberId:member.id,...(operation==='set-pin'?{pin:pin.value}:{})});}catch(error){status.textContent=error.message;throw error;}pin.value='';form.dataset.portalDirty='false';update(saved.members);if(saved.pinAudit){auditHost.replaceChildren();renderPINAudit(auditHost,saved.pinAudit);}status.textContent=operation==='generate-pin'?'Unique Office PIN generated. Open the Principal-only PIN display to view it.':'Office PIN saved. Previous office sessions for this member are invalidated.';});
  form.onsubmit=event=>{event.preventDefault();savePIN('set-pin');};
  generate.onclick=()=>savePIN('generate-pin');
  disable.onclick=()=>run(async()=>{const saved=await api({action:'office-pin-settings',operation:'disable',memberId:member.id});update(saved.members);auditHost.replaceChildren();renderPINAudit(auditHost,saved.pinAudit);status.textContent='Office access disabled.';});
  card.append(el('h4',member.name+' · '+member.designation),status,form,generate,reveal,disable);host.append(card);
 }
}
