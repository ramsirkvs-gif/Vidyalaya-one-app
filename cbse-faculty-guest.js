// A guest works through the existing faculty identity, assignments and PIN.
// This display mapping never creates an account or copies/resets credentials.
const nameKey=value=>String(value||'').replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?\s*/gi,'').toUpperCase().replace(/[^A-Z]/g,'');
export const isAvinashGuestProfile=person=>['AVINASHSINGH','AVINASHBIBEK'].includes(nameKey(person?.name));
export const isBamangMehaProfile=person=>['BAMANGMEHA','BAMAMGMEHA','DAMIANGMEHA'].includes(nameKey(person?.name));
export const isGangaDeviProfile=person=>['LGANGADEVI','LAISHRAMGANGADEVI'].includes(nameKey(person?.name));
export const guestFacultyName=name=>isAvinashGuestProfile({name})?'AVINASH/Bibek':isBamangMehaProfile({name})?'BAMANG MEHA':isGangaDeviProfile({name})?'LAISHRAM GANGA DEVI':name;
export const withGuestFaculty=person=>isAvinashGuestProfile(person)?{...person,name:'AVINASH/Bibek',guestTeacherName:'Bibek Kumar',guestFor:'Avinash Singh'}:isBamangMehaProfile(person)?{...person,name:'BAMANG MEHA'}:isGangaDeviProfile(person)?{...person,name:'LAISHRAM GANGA DEVI'}:person;

// Known spelling duplicate only: keep stored IDs and history, prefer the correctly named profile.
export function bamangMehaIdentityIds(id,faculty,mission={}){
 const rows=[...Object.entries(faculty?.classes||{}).flatMap(([cl,c])=>Object.entries(c.teachers||{}).map(([key,p])=>[cl+':'+key,p])),...Object.entries(mission.staff||{}).map(([key,p])=>['support:'+key,p])];
 if(!rows.some(([key,p])=>key===id&&isBamangMehaProfile(p)))return null;
 return rows.filter(([,p])=>p.status==='active'&&isBamangMehaProfile(p)).sort((a,b)=>(nameKey(a[1].name)==='BAMANGMEHA'?0:1)-(nameKey(b[1].name)==='BAMANGMEHA'?0:1)||a[0].localeCompare(b[0])).map(([key])=>key);
}

// Principal confirmed these two names identify one member. Preserve both stored IDs.
export function gangaDeviIdentityIds(id,faculty,mission={}){
 const rows=[...Object.entries(faculty?.classes||{}).flatMap(([cl,c])=>Object.entries(c.teachers||{}).map(([key,p])=>[cl+':'+key,p])),...Object.entries(mission.staff||{}).map(([key,p])=>['support:'+key,p])];
 if(!rows.some(([key,p])=>key===id&&isGangaDeviProfile(p)))return null;
 return rows.filter(([,p])=>p.status==='active'&&isGangaDeviProfile(p)).sort((a,b)=>(a[0].startsWith('support:')?1:0)-(b[0].startsWith('support:')?1:0)||(nameKey(a[1].name)==='LAISHRAMGANGADEVI'?0:1)-(nameKey(b[1].name)==='LAISHRAMGANGADEVI'?0:1)||a[0].localeCompare(b[0])).map(([key])=>key);
}
