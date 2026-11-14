import {officeRegularDirectory} from './cbse-office-regular.js';
const normalise=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/\b(mr|mrs|ms|dr|shri|smt|miss)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const compiled=new WeakMap(),results=new WeakMap(),empty={};
function matcher(directory){
 if(compiled.has(directory))return compiled.get(directory);
 const people=Object.entries(officeRegularDirectory(directory)).map(([id,p])=>({id,...p})),firstOwners=new Map();
 for(const person of people){const first=normalise(person.name).split(' ')[0];if(!firstOwners.has(first))firstOwners.set(first,new Set());firstOwners.get(first).add(person.id);}
 const patterns=[];for(const person of people){const aliases=new Set([person.name,...person.aliases].map(normalise)),first=normalise(person.name).split(' ')[0];if(first.length>=4&&firstOwners.get(first).size===1)aliases.add(first);
  for(const alias of aliases)if(alias)patterns.push({person,alias,regex:new RegExp('(?:^| )('+alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?= |$)','g')});
 }
 const find=value=>{const text=normalise(value),hits=[];for(const {person,regex}of patterns){regex.lastIndex=0;for(const match of text.matchAll(regex)){const start=match.index+(match[0].startsWith(' ')?1:0);hits.push({person,start,end:start+match[1].length});}}
  // A full/qualified name wins over a shorter contained name (e.g. Sushil Kumar vs Sushil).
  return [...new Map(hits.filter(hit=>!hits.some(other=>other.person.id!==hit.person.id&&other.start<=hit.start&&other.end>=hit.end&&other.end-other.start>hit.end-hit.start)).sort((a,b)=>a.start-b.start).map(hit=>[hit.person.id,hit.person])).values()];
 };
 const output={people,find};compiled.set(directory,output);return output;
}
export function officeVoucherPeople(row,directory=empty){
 let cache=results.get(row);if(!cache){cache=new WeakMap();results.set(row,cache);}if(cache.has(directory))return cache.get(directory);
 const {people,find}=matcher(directory),concerned=find(row.details),selected=(row.assignedIds||[]).flatMap(id=>people.filter(person=>person.id===id||person.identityIds.includes(id))),responsible=[...new Map([...selected,...find(row.sourceResponsible)].map(person=>[person.id,person])).values()];
 const output={concerned,responsible,all:[...new Map([...concerned,...responsible].map(person=>[person.id,person])).values()]};cache.set(directory,output);return output;
}
