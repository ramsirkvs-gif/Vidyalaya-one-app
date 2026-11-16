import {el} from './cbse-ui.js';
import {rollTimestamp} from './cbse-roll-call-time.js';
export function renderRollReview(parent,{id,record,api,run,refresh}){
 const section=el('section',undefined,'roll-principal-review');section.append(el('h4','Principal review / comments (optional)'));
 for(const comment of Object.values(record.principalComments||{}))section.append(el('p',comment.text),el('small',rollTimestamp(comment.at)));
 const form=el('form');form.dataset.portalTrackDirty='true';const label=el('label','Principal comment'),comment=el('textarea');comment.name='roll-principal-comment';comment.maxLength=2000;comment.required=true;label.append(comment);const save=el('button','Save review comment');save.type='submit';form.append(label,save);form.oninput=()=>{form.dataset.portalDirty='true';};
 form.onsubmit=e=>{e.preventDefault();run(async()=>{await api({action:'roll-call-principal',rollOperation:'report-comment',reportId:id,expectedUpdatedAt:record.updatedAt||record.submittedAt,expectedSubmittedAt:record.submittedAt,comment:comment.value});form.dataset.portalDirty='false';await refresh();});};section.append(form);parent.append(section);
}
