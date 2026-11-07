import {REMEDIAL_COMPLETE_HOLIDAYS,REMEDIAL_CALENDAR_END} from './cbse-remedial-calendar-data.js';
// Holiday_Calendar_2026-27.csv supplied by the Principal; all supplied dates are in 2026.
export const REMEDIAL_HOLIDAYS=Object.freeze([
 {
  "date": "2026-01-01",
  "day": "Thursday",
  "name": "New Year's Day",
  "type": "GH"
 },
 {
  "date": "2026-01-14",
  "day": "Wednesday",
  "name": "Makar Sankranti",
  "type": "GH"
 },
 {
  "date": "2026-01-26",
  "day": "Monday",
  "name": "Republic Day",
  "type": "GH"
 },
 {
  "date": "2026-02-20",
  "day": "Friday",
  "name": "Statehood Day",
  "type": "GH"
 },
 {
  "date": "2026-03-04",
  "day": "Wednesday",
  "name": "Holi",
  "type": "GH"
 },
 {
  "date": "2026-03-21",
  "day": "Saturday",
  "name": "Id-ul-Fitr",
  "type": "GH"
 },
 {
  "date": "2026-04-03",
  "day": "Friday",
  "name": "Good Friday",
  "type": "GH"
 },
 {
  "date": "2026-04-15",
  "day": "Wednesday",
  "name": "Bohag Bihu",
  "type": "GH"
 },
 {
  "date": "2026-05-01",
  "day": "Friday",
  "name": "Buddha Purnima",
  "type": "GH"
 },
 {
  "date": "2026-05-27",
  "day": "Wednesday",
  "name": "Id-Ul-Zuha (Bakrid)",
  "type": "RH"
 },
 {
  "date": "2026-08-15",
  "day": "Saturday",
  "name": "Independence Day",
  "type": "GH"
 },
 {
  "date": "2026-08-28",
  "day": "Friday",
  "name": "Raksha Bandhan",
  "type": "RH"
 },
 {
  "date": "2026-09-04",
  "day": "Friday",
  "name": "Janmashtami (Vaishnava)",
  "type": "RH"
 },
 {
  "date": "2026-09-14",
  "day": "Monday",
  "name": "Ganesh Chaturthi",
  "type": "RH"
 },
 {
  "date": "2026-10-02",
  "day": "Friday",
  "name": "Mahatma Gandhi Jayanti",
  "type": "GH"
 },
 {
  "date": "2026-10-19",
  "day": "Monday",
  "name": "Dussehra (Mahashtami)",
  "type": "GH"
 },
 {
  "date": "2026-10-20",
  "day": "Tuesday",
  "name": "Dussehra",
  "type": "GH"
 },
 {
  "date": "2026-10-29",
  "day": "Thursday",
  "name": "Karak Chaturthi (Karwa Chauth)",
  "type": "RH"
 },
 {
  "date": "2026-11-08",
  "day": "Sunday",
  "name": "Diwali (Deepavali)",
  "type": "GH"
 },
 {
  "date": "2026-11-24",
  "day": "Tuesday",
  "name": "Guru Nanak Jayanti",
  "type": "GH"
 },
 {
  "date": "2026-12-01",
  "day": "Tuesday",
  "name": "Indigenous Faith Day",
  "type": "GH"
 },
 {
  "date": "2026-12-25",
  "day": "Friday",
  "name": "Christmas Day",
  "type": "GH"
 }
]);

// Retain the original 2026 calendar and merge the newly supplied November–January rows.
// January 2027 GH/RH dates are not inferred; overlap labels are merged by date.
export function remedialHolidayCalendar(){
 const days=new Map(),add=(date,name,type)=>{let day=days.get(date);if(!day){day={date,day:new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'long'}),names:[],types:[]};days.set(date,day);}if(!day.names.includes(name))day.names.push(name);if(!day.types.includes(type))day.types.push(type);};
 for(const h of REMEDIAL_HOLIDAYS)add(h.date,h.name,h.type);
 for(const year of new Set(REMEDIAL_HOLIDAYS.map(h=>Number(h.date.slice(0,4)))))for(let month=0;month<12;month++){
  for(let day=1;day<=31;day++){const d=new Date(Date.UTC(year,month,day));if(d.getUTCMonth()!==month)break;const date=d.toISOString().slice(0,10);if(d.getUTCDay()===0)add(date,'Sunday','SUNDAY');if(d.getUTCDay()===6&&day>=8&&day<=14)add(date,'Second Saturday','SECOND_SATURDAY');}
 }
 for(const h of REMEDIAL_COMPLETE_HOLIDAYS)add(h.date,h.name,h.type);
 const label={BREAK:'Winter break',SUNDAY:'Sunday',SECOND_SATURDAY:'Second Saturday'};
 return [...days.values()].filter(day=>day.date<=REMEDIAL_CALENDAR_END).sort((a,b)=>a.date.localeCompare(b.date)).map(day=>({...day,name:day.names.join(' · '),type:day.types.map(t=>label[t]||t).join(' + ')}));
}
export const REMEDIAL_CALENDAR=Object.freeze(remedialHolidayCalendar());
