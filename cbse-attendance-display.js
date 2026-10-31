import {latestAttendanceRegister} from './cbse-attendance-model.js';
export const attendanceDate=v=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(v+'T00:00:00Z'));
export function attendanceLines(key,mission,progress){
 const register=latestAttendanceRegister(key,mission),source=mission.academicAttendance?.[key],lines=[];
 if(register)lines.push(`Attendance till ${attendanceDate(register.asOf)}: ${register.total.present}/${register.total.working} · ${(register.total.present/register.total.working*100).toFixed(2)}%`);
 else if(Number.isFinite(source?.percentage))lines.push(`Attendance from Samagam Excel: ${source.percentage.toFixed(1)}% · Session ${source.session}`);
 const latestCutoff=Object.values(mission.attendanceRegisters||{}).map(r=>r.asOf).sort().at(-1);if(latestCutoff&&(!register||register.asOf<latestCutoff))lines.push(`Register till ${attendanceDate(latestCutoff)}: not supplied for this student.`);
 if(progress.recordedDays)lines.push(`Daily register: ${(progress.dailyAttendance??progress.attendance).toFixed(1)}% · ${progress.recordedDays} recorded school dates`);
 if(!lines.length)lines.push('Attendance: not imported yet.');return lines;
}
