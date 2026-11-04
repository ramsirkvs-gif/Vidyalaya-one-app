import {el} from './cbse-ui.js';
export function mcqNavigation(open,active=''){
 const nav=el('nav',undefined,'mcq-nav-cards');nav.setAttribute('aria-label','MCQ workspace actions');const bank=el('button',undefined,'mcq-bank-tile');bank.type='button';bank.setAttribute('aria-label','Question bank');bank.append(el('strong','Question bank'),el('span','Stored questions · Ready-made QPs'));bank.onclick=()=>open('bank');if(active==='bank')bank.setAttribute('aria-current','page');nav.append(bank);
 const row=el('div',undefined,'mcq-action-cells');for(const [title,mode]of [['1 · Contribute','contribute'],['2 · Prepare QP','paper'],['3 · Evaluate','evaluate']]){const cell=el('button',title,'mcq-action-cell mcq-action-'+mode);cell.type='button';cell.onclick=()=>open(mode);if(active===mode)cell.setAttribute('aria-current','page');row.append(cell);}nav.append(row);return nav;
}
