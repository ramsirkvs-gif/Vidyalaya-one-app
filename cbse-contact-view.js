import {whatsappLink} from './cbse-staff-contact.js';
import {el} from './cbse-ui.js';import {contactNumbers,dialNumber,mapLink} from './cbse-contact-model.js';
export function renderContactActions(parent,contact={},ctx={}){
 const actions=el('div',undefined,'actions');for(const n of contactNumbers(contact)){const phone=dialNumber(n.phone);if(!phone)continue;const a=el('a',`☎ Call ${n.label} · ${n.phone}`,'button');a.href='tel:'+phone;a.setAttribute('aria-label',`Call ${n.label}`);const pair=el('div',undefined,'contact-number-actions');pair.append(a);const whatsapp=whatsappLink(phone,'WhatsApp '+n.label,'Message '+n.label+' on WhatsApp');if(whatsapp)pair.append(whatsapp);actions.append(pair);}
 if(!actions.children.length)parent.append(el('p','No valid call numbers recorded yet.','muted'));else parent.append(actions);
 if(contact.mapLocation){try{const a=el('a','⌖ Open home location in Google Maps','button');a.href=mapLink(contact.mapLocation);a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}catch{parent.append(el('p','The saved map link needs correction.','muted'));}}
 if(ctx.onEdit){const b=el('button','Add / update phone numbers & home location');b.type='button';b.onclick=ctx.onEdit;parent.append(b);}
 if(ctx.onLog){const b=el('button','Log call / home visit');b.type='button';b.onclick=ctx.onLog;parent.append(b);}
 parent.append(el('p','Call opens your phone dialler; WhatsApp opens a chat. Add the outcome in Remarks.','muted'));
}
