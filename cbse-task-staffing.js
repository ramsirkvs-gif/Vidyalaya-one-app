// Institution-wide teaching-post position supplied by the Principal.
export const TEACHING_POST_POSITION=Object.freeze({sanctioned:67,vacant:21});
export const TEACHING_VACANCY_PERCENT=100*TEACHING_POST_POSITION.vacant/TEACHING_POST_POSITION.sanctioned;
export const STAFFING_STRIP_TEXT='Teaching posts sanctioned: '+TEACHING_POST_POSITION.sanctioned+'  |  Vacant: '+TEACHING_POST_POSITION.vacant+'  |  Vacancy: '+TEACHING_VACANCY_PERCENT.toFixed(2)+'%';
