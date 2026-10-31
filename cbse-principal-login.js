import {el} from './cbse-ui.js';
export function renderPrincipalLogin(parent,onSubmit){
 const form=el('form',undefined,'inline-principal-login');form.dataset.portalTrackDirty='true';const label=el('label','Principal password'),password=el('input');password.type='password';password.name='inline-principal-password';password.autocomplete='current-password';password.required=true;label.append(password);const save=el('button','Sign in here','primary'),error=el('p',undefined,'notice error');error.hidden=true;error.setAttribute('role','alert');form.append(label,error,save);
 form.onsubmit=async event=>{event.preventDefault();save.disabled=true;error.hidden=true;try{await onSubmit(password.value);form.dataset.portalDirty='false';}catch(e){error.textContent=e.message;error.hidden=false;}finally{password.value='';save.disabled=false;}};parent.append(form);
}
