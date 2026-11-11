// Principal-approved exclusions apply to Mission participation only, not school Roll Call.
const excludedNames=new Set([
 'IPI RIBA','AJAY KUMAR CHAUBEY','JITENDRA PAUL','SANTOSH KUMAR YADAV',
 'VANSHITA SHARMA','JENLAN MONYAK','M.T. MUNYA','RANJAN CHETRY','RAJEN KUMAR',
 'SURAJ DAHAL','MITI RATAN','SAMIRAN BORAGOHAIN','TADO KARNIK','TAGE YASUNG','ZEEME GIASING'
].map(nameKey));
function nameKey(name){return String(name||'').toUpperCase().replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?\s*/g,'').replace(/[^A-Z]/g,'');}
export function missionMemberAllowed(person){return !excludedNames.has(nameKey(person?.name));}
