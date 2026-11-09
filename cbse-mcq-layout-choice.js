import {el} from './cbse-ui.js';
import {MCQ_PRINT_LAYOUTS,mcqPrintLayout} from './cbse-mcq-page-settings.js';
export function renderMCQLayoutChoice(parent,{value,onChange}){
 const host=el('section',undefined,'mcq-print-layout-choice'),actions=el('div',undefined,'mcq-print-layout-actions'),summary=el('small');host.setAttribute('aria-label','MCQ print layout');actions.setAttribute('role','group');actions.setAttribute('aria-label','Print layout');const buttons=[];for(const [preset,label]of [['compact','Compact two-column print'],['single','Single-column print']]){const button=el('button',label);button.type='button';button.dataset.printLayout=preset;button.onclick=()=>{onChange(mcqPrintLayout(value(),preset));sync();};actions.append(button);buttons.push(button);}host.append(el('strong','Print layout'),actions,summary);parent.append(host);
 function sync(){const settings=value();for(const button of buttons){const preset=MCQ_PRINT_LAYOUTS[button.dataset.printLayout];button.setAttribute('aria-pressed',String(Object.entries(preset).every(([key,v])=>settings[key]===v)));}summary.textContent=settings.columns+' '+(settings.columns===1?'column':'columns')+' · '+settings.margin+' mm margins · '+settings.fontSize+' pt text · '+settings.gap+' mm question spacing';}
 sync();return {sync,host};
}
