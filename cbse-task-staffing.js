// Institution-wide teaching-post position supplied by the Principal.
export const TEACHING_POST_POSITION=Object.freeze({sanctioned:67,vacant:21});
export const TEACHING_VACANCY_PERCENT=100*TEACHING_POST_POSITION.vacant/TEACHING_POST_POSITION.sanctioned;

export function teachingVacancyPoint(){return {id:'teachingVacancy',label:'Teaching vacancy',kind:'posts',institutional:true,total:TEACHING_POST_POSITION.vacant,base:TEACHING_POST_POSITION.sanctioned,coverage:null,missing:[],basis:'Vacancy as a share of sanctioned teaching posts',segments:[{label:'Vacant',value:TEACHING_POST_POSITION.vacant},{label:'Filled',value:TEACHING_POST_POSITION.sanctioned-TEACHING_POST_POSITION.vacant}]};}
