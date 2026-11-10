// A guest works through the existing faculty identity, assignments and PIN.
// This display mapping never creates an account or copies/resets credentials.
const nameKey=value=>String(value||'').replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?\s*/gi,'').toUpperCase().replace(/[^A-Z]/g,'');
export const isAvinashGuestProfile=person=>['AVINASHSINGH','AVINASHBIBEK'].includes(nameKey(person?.name));
export const guestFacultyName=name=>isAvinashGuestProfile({name})?'AVINASH/Bibek':name;
export const withGuestFaculty=person=>isAvinashGuestProfile(person)?{...person,name:'AVINASH/Bibek',guestTeacherName:'Bibek Kumar',guestFor:'Avinash Singh'}:person;
