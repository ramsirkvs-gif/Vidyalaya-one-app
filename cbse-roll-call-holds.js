import {el} from './cbse-ui.js';
export const principalRollHolds=(objections,ids)=>Object.values(objections||{}).filter(o=>o.kind==='principal-hold'&&o.status==='open'&&ids.includes(o.staffId));
export function showPrincipalHoldPopup(items){
 return new Promise(resolve=>{const dialog=el('dialog',undefined,'roll-pin-dialog roll-principal-hold-alert');dialog.setAttribute('aria-label','Meet the Principal before leaving');dialog.append(el('h3','Meet the Principal before leaving'),el('p','Your Roll Call is saved. Meet the Principal and obtain NOC before leaving the Vidyalaya.'));
 for(const item of items)dialog.append(el('p',item.remark,'roll-warning'));
 const close=el('button','Understood — I will meet the Principal');close.type='button';close.onclick=()=>dialog.close();dialog.append(close);dialog.onclose=()=>{dialog.remove();resolve();};document.body.append(dialog);dialog.showModal();});
}
