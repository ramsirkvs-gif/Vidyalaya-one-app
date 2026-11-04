import {el} from './cbse-ui.js';
export function mcqNavigation(open,active=''){
 const nav=el('nav',undefined,'mcq-simple-links');nav.setAttribute('aria-label','MCQ workspace actions');
 const back=el('button','← Back');back.type='button';back.onclick=()=>open('home');nav.append(back);
 if(active==='paper'){const library=el('button','Ready-made QPs');library.type='button';library.onclick=()=>open('library');nav.append(library);}
 return nav;
}
