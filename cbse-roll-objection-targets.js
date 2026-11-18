import {secondaryObjectionAssignments} from './cbse-secondary-objection-data.js';
import {rollNameKey,rollRoster,rollStaffIdentityIds} from './cbse-roll-call-roster.js';

export const secondaryStandards=['VI','VII','VIII','IX','X','XI','XII'];
const standard=value=>secondaryStandards[Number(value)-6]||String(value||'').toUpperCase();
const sectionKey=(grade,section)=>grade+' '+section;

export function objectionRoster(staff,wing,actorId){
 const own=actorId?rollStaffIdentityIds(staff,actorId):[];
 const roster=rollRoster(staff,wing).filter(p=>p.id).map(p=>{
  const profiles=p.ids.map(id=>staff[id]);
  const roles=profiles.flatMap(profile=>(profile.classRoles||[]).map(r=>[standard(r.classId),String(r.sectionName||r.sectionId||'').toUpperCase(),r.role]));
  const names=new Set([p.name,...profiles.map(profile=>profile.name)].map(rollNameKey));
  const matches=wing==='secondary'?secondaryObjectionAssignments.filter(([aliases])=>aliases.some(alias=>names.has(rollNameKey(alias)))):[];
  return {...p,roles,subjects:matches.length===1?matches[0][2]:[],fallbackRoles:matches.length===1?matches[0][1]:[],isCT:profiles.some(profile=>profile.classTeacher||profile.coClassTeacher)};
 });
 const currentRoles=new Set(roster.flatMap(p=>p.roles.map(role=>role.join('|'))));
 return roster.filter(p=>!p.ids.some(id=>own.includes(id))).map(({fallbackRoles,...p})=>({
  ...p,roles:[...new Map([...p.roles,...fallbackRoles.filter(role=>!currentRoles.has(role.join('|')))].map(role=>[role.join('|'),role])).values()]
 }));
}

export function objectionTargets(roster,{mode,sections=[],grade='',subject=''}){
 return roster.filter(p=>{
  if(mode==='all')return true;
  if(mode==='ct')return p.isCT||p.roles.length>0;
  if(mode==='lower'||mode==='upper')return p.roles.some(([level])=>(mode==='lower'?secondaryStandards.slice(0,3):secondaryStandards.slice(3)).includes(level));
  if(mode==='sections')return p.roles.some(([level,section])=>sections.includes(sectionKey(level,section)));
  if(mode==='subject')return p.subjects.some(([level,,name])=>level===grade&&name===subject);
  return false;
 }).map(p=>p.id);
}
