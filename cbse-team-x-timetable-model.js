import {guestFacultyName} from './cbse-faculty-guest.js';
import {TEAM_X_WEEKLY_TIMETABLE} from './cbse-team-x-timetable-data.js';
const nameKey=value=>String(value||'').toUpperCase().replace(/\b(MRS|MR|MS|DR|SHRI|SMT|MISS)\b\.?/g,'').replace(/[^A-Z0-9]/g,'');
export function teamXTimetableTeachers(faculty,data=TEAM_X_WEEKLY_TIMETABLE){
 return Object.entries(faculty?.classes?.X?.teachers||{}).filter(([,teacher])=>teacher.status==='active').map(([id,teacher])=>{
  const key=nameKey(teacher.name),matches=data.teachers.filter(source=>source.nameAliases.some(alias=>nameKey(alias)===key)),exact=matches.find(source=>source.staffId==='X:'+id),timetable=exact||(matches.length===1?matches[0]:null);
  return {id:'X:'+id,name:guestFacultyName(teacher.name),designation:teacher.designation||'',timetable};
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
export const isClassXLesson=value=>/(?:^|[^0-9A-Z])10\s*[-–]?\s*[A-Z](?![A-Z])/.test(String(value||'').toUpperCase());
