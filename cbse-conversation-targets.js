import {vcStaff} from './cbse-vc-model.js';
import {teacherIdentityIds} from './cbse-view-data.js';
export const conversationShortcuts=[['concerned','Concerned teachers'],['class_team','Class team'],['team_x','Team X'],['team_xii','Team XII'],['all','All']];
export function uniqueConversationRecipients(ids,faculty,mission){const staff=vcStaff(faculty,mission);return [...new Set(ids.filter(id=>staff[id]?.status==='active').map(id=>teacherIdentityIds(id,faculty,mission)[0]||id))];}
export function conversationTeam(classId,faculty,mission){const staff=vcStaff(faculty,mission),ids=Object.keys(staff).filter(id=>!classId||id.startsWith(classId+':'));for(const a of [...Object.values(mission.allocations||{}),...Object.values(mission.supportAssignments||{})])if(!classId||a.classId===classId)ids.push(a.staffId);return uniqueConversationRecipients(ids,faculty,mission);}
export function conversationSections(c,draft){const sections=new Map();if(c.classId&&c.sectionId)sections.set(c.classId+':'+c.sectionId,{classId:c.classId,sectionId:c.sectionId});for(const key of c.studentKeys||[]){const [classId,sectionId]=key.split(':');if(draft.classes?.[classId]?.sections?.[sectionId])sections.set(classId+':'+sectionId,{classId,sectionId});}return [...sections.values()];}
export function conversationShortcutRecipients(group,c,draft,faculty,mission){
 if(group==='all')return conversationTeam('',faculty,mission);if(group==='team_x'||group==='team_xii')return conversationTeam(group==='team_x'?'X':'XII',faculty,mission);
 if(!['concerned','class_team'].includes(group))throw Error('Choose a valid recipient shortcut.');const ids=[];
 for(const s of conversationSections(c,draft)){const roles=faculty.classes?.[s.classId]?.roles?.[s.sectionId]||{};for(const key of ['classTeacher','coClassTeacher'])if(roles[key])ids.push(s.classId+':'+roles[key]);
  const students=(c.studentKeys||[]).map(k=>{const [cl,sid,id]=k.split(':');return cl===s.classId&&sid===s.sectionId?draft.classes?.[cl]?.sections?.[sid]?.students?.[id]:null;}).filter(Boolean);
  for(const a of [...Object.values(mission.allocations||{}),...Object.values(mission.supportAssignments||{})])if(a.classId===s.classId&&a.sectionId===s.sectionId&&(group==='class_team'||(!c.subjectId||a.subjectId===c.subjectId)&&(!students.length||students.some(p=>p.subjects?.[a.subjectId]))))ids.push(a.staffId);
 }if(c.teacherId)ids.push(c.teacherId);return uniqueConversationRecipients(ids,faculty,mission);
}
export function conversationInView(t,view,who,draft,faculty,mission){
 const ids=who==='principal'?['principal']:who?teacherIdentityIds(who,faculty,mission):[];
 const participates=ids.some(id=>t.createdBy===id||t.participantIds?.includes(id)||t.context.teacherId===id);
 if(view==='all')return true;if(view==='mine')return participates;
 const sections=conversationSections(t.context,draft),participants=[...(t.participantIds||[]),t.context.teacherId].filter(Boolean);
 if(view==='team_x'||view==='team_xii'){const cl=view==='team_x'?'X':'XII',team=conversationTeam(cl,faculty,mission);return t.context.kind==='all'||(t.context.classId?t.context.classId===cl:sections.length?sections.some(s=>s.classId===cl):participants.some(id=>team.includes(teacherIdentityIds(id,faculty,mission)[0]||id)));}
 if(view==='class_teams'){if(!who||who==='principal')return false;return sections.some(s=>conversationShortcutRecipients('class_team',{...s,studentKeys:[]},draft,faculty,mission).some(id=>ids.includes(id)));}return false;
}
