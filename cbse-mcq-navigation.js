import {el} from './cbse-ui.js';
export function mcqNavigation(open,active=''){
 const nav=el('nav',undefined,'mcq-simple-links');nav.setAttribute('aria-label','MCQ workspace actions');
 const links=[['Questions','bank'],['Ready-made QPs','library'],['Evaluation','evaluate']];
 if(!['bank','paper'].includes(active))links.push(['Create QP PDF','paper']);
 for(const [title,mode]of links){if(mode===active||mode==='bank'&&active==='paper')continue;const link=el('button',title);link.type='button';link.onclick=()=>open(mode);nav.append(link);}
 return nav;
}
