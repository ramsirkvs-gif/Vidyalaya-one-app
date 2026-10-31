import {el} from './cbse-ui.js';import {contactNumbers,dialNumber,mapLink} from './cbse-contact-model.js';
export function renderContactActions(parent,contact={},ctx={}){
 const actions=el('div',undefined,'actions');for(const n of contactNumbers(contact)){const phone=dialNumber(n.phone);if(!phone)continue;const a=el('a',`☎ Call ${n.label} · ${n.phone}`,'button');a.href='tel:'+phone;a.setAttribute('aria-label',`Call ${n.label}`);actions.append(a);}
 if(!actions.children.length)parent.append(el('p','No valid call numbers recorded yet.','muted'));else parent.append(actions);
 if(contact.mapLocation){try{const a=el('a','⌖ Open home location in Google Maps','button');a.href=mapLink(contact.mapLocation);a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}catch{parent.append(el('p','The saved map link needs correction.','muted'));}}
 if(ctx.onEdit){const b=el('button','Add / update phone numbers & home location');b.type='button';b.onclick=ctx.onEdit;parent.append(b);}
 if(ctx.onLog){const b=el('button','Log call / home visit');b.type='button';b.onclick=ctx.onLog;parent.append(b);}
 parent.append(el('p','Call opens your phone dialler. Add the outcome in Remarks.','muted'));
}
