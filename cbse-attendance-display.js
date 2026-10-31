export function attendanceLines(key,mission,progress){
 const source=mission.academicAttendance?.[key],lines=[];
 if(Number.isFinite(source?.percentage))lines.push(`Workbook attendance: ${source.percentage.toFixed(1)}% · cumulative ${source.session}${source.throughPeriod?' · through '+source.throughPeriod:''}`);
 if(progress.recordedDays)lines.push(`Daily register: ${progress.attendance.toFixed(1)}% · ${progress.recordedDays} recorded school dates`);
 if(!lines.length)lines.push('Attendance: not imported yet.');return lines;
}
