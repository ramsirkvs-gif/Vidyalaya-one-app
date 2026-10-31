import {el} from './cbse-ui.js';
import {xiiStreamGroups} from './cbse-stream-model.js';
export function renderStreamTiles(parent,people,{selected='',onSelect,title='Class XII streams',allLabel='All XII students'}={}){
 const groups=xiiStreamGroups(people);if(!groups.length)return;
 const box=el('section',undefined,'stream-choices');box.setAttribute('aria-label',title);const header=el('div',undefined,'actions');header.append(el('h3',title));const all=el('button',allLabel);all.type='button';all.setAttribute('aria-pressed',String(!selected));all.onclick=()=>onSelect('');header.append(all);box.append(header);const grid=el('div',undefined,'stream-tiles');
 for(const g of groups){const b=el('button',undefined,'stream-tile');b.type='button';b.setAttribute('aria-label',g.name+' stream');b.setAttribute('aria-pressed',String(selected===g.name));b.append(el('strong',g.name),el('small',`Sections ${g.sections.join(' / ')} · ${g.count} students`));b.onclick=()=>onSelect(g.name);grid.append(b);}box.append(grid);parent.append(box);return box;
}
