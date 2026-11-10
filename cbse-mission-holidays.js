import {REMEDIAL_CALENDAR} from './cbse-remedial-holidays.js';
import {WINTER_DAYS} from './cbse-winter-timetable.js';
export const MISSION_HOLIDAY_TITLE='Holidays & Winter Break · November 2026–January 2027';
export function missionHolidayList(){const extra=new Map(WINTER_DAYS.map(d=>[d.date,d.day]));return REMEDIAL_CALENDAR.filter(d=>d.date>='2026-11-01'&&d.date<='2027-01-31').map(d=>{const winter=d.types.includes('BREAK'),extraDay=winter?extra.get(d.date):undefined;return {...d,winter,extraDay:extraDay||null,label:(winter?[extraDay?'Winter break with extra classes':'Winter break',...d.names.filter(name=>name!=='Winter Break')]:d.names).join(' · ')};});}
