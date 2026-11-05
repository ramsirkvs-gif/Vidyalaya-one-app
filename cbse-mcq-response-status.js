export function mcqResponseLabel(answer,flag=''){if(answer==='?')return flag.startsWith('Dual answers')?'Dual answers':'Needs review';return answer||'Not attempted';}
