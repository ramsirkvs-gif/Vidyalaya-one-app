import {el} from './cbse-ui.js';
export function mcqNavigation(open,active=''){
 const nav=el('nav',undefined,'mcq-workflow');nav.setAttribute('aria-label','MCQ workspace actions');
 for(const [title,mode]of [['1 · Question bank','bank'],['2 · Create QP PDF','paper'],['3 · Evaluation','evaluate']]){
  const cell=el('button',title,'mcq-workflow-step mcq-step-'+mode);cell.type='button';cell.onclick=()=>open(mode);
  if(active===mode||mode==='bank'&&['contribute','import'].includes(active))cell.setAttribute('aria-current','page');nav.append(cell);
 }
 const library=el('button','Ready-made QPs · subject-wise','mcq-ready-library-link');library.type='button';library.onclick=()=>open('library');if(active==='library')library.setAttribute('aria-current','page');nav.append(library);
 return nav;
}
