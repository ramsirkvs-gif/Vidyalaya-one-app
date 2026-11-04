import {el} from './cbse-ui.js';
export function mcqNavigation(open,active=''){
 const nav=el('nav',undefined,'mcq-simple-links');nav.setAttribute('aria-label','MCQ workspace actions');
 const links=[['← Back to bank','bank'],['Ready-made QPs','library'],...(active==='bank'?[]:[['Evaluation','evaluate']])];
 if(!['bank','paper'].includes(active))links.push(['Create QP PDF','paper']);
 for(const [title,mode]of links){if(mode===active)continue;const link=el('button',title);link.type='button';link.onclick=()=>open(mode);nav.append(link);}
 return nav;
}
