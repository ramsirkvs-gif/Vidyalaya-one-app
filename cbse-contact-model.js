export function meetingLink(value){
 if(typeof value!=='string')throw Error('Enter a Google Meet link.');
 const text=value.trim();if(!text)return '';
 if(!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(text))throw Error('Use a Google Meet link such as https://meet.google.com/abc-defg-hij.');
 return text.replace(/\/$/,'');
}
export function contactNumbers(contact={}){
 if(contact.numbers&&Object.keys(contact.numbers).length)return Object.entries(contact.numbers).map(([id,n])=>({id,...n}));
 return String(contact.phones||'').split(';').map((text,i)=>{const m=text.trim().match(/^([^:]+):\s*(.+)$/);return {id:'legacy_'+i,label:m?m[1].trim():'Other',phone:m?m[2].trim():text.trim()};}).filter(n=>n.phone);
}
export function dialNumber(value){if(!/^[+\d\s().-]+$/.test(String(value||'')))return '';const clean=String(value||'').replace(/[^\d+]/g,'');return /^\+?\d{7,15}$/.test(clean)?clean:'';}
export function mapLink(value){
 const text=String(value||'').trim();if(!text)return '';if(text.length>1000)throw Error('Keep the map link within 1000 characters.');
 const coords=text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
 if(coords){if(Math.abs(Number(coords[1]))>90||Math.abs(Number(coords[2]))>180)throw Error('Enter valid latitude, longitude.');return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(coords[1]+','+coords[2]);}
 let u;try{u=new URL(text);}catch{throw Error('Paste a Google Maps link or latitude, longitude.');}
 const host=u.hostname.toLowerCase();if(u.protocol!=='https:'||u.username||u.password||!(['maps.app.goo.gl','maps.google.com','www.google.com','google.com','goo.gl'].includes(host))||(['www.google.com','google.com','goo.gl'].includes(host)&&!u.pathname.startsWith('/maps')))throw Error('Use an HTTPS Google Maps link or latitude, longitude.');return u.href;
}
export function validateContact(contact){
 if(contact.meetingLink!==undefined)meetingLink(contact.meetingLink);
 if(contact.mapLocation!==undefined&&typeof contact.mapLocation!=='string')throw Error('Invalid home location.');mapLink(contact.mapLocation||'');
 if(contact.numbers!==undefined&&(!contact.numbers||typeof contact.numbers!=='object'||Array.isArray(contact.numbers)))throw Error('Invalid contact-number list.');const entries=Object.entries(contact.numbers||{});if(entries.length>12)throw Error('Keep at most 12 contact numbers.');
 for(const[id,n]of entries)if((!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||['__proto__','prototype','constructor'].includes(id))||!n||typeof n.label!=='string'||!n.label.trim()||n.label.length>50||typeof n.phone!=='string'||!dialNumber(n.phone))throw Error('Each contact needs a label and a valid 7–15 digit phone number.');
 if(contact.revision!==undefined&&(!Number.isInteger(contact.revision)||contact.revision<0))throw Error('Invalid contact revision.');
}
export function serializePhones(numbers){return Object.values(numbers||{}).map(n=>`${n.label}: ${n.phone}`).join('; ');}
export function staffStudentRoles(id,student,faculty,mission){
 const teacher=id.split(':').slice(1).join(':'),roles=faculty?.classes?.[student.classId]?.roles?.[student.sectionId]||{};
 return {classTeacher:id.startsWith(student.classId+':')&&(roles.classTeacher===teacher||roles.coClassTeacher===teacher),subjects:[...Object.values(mission.allocations||{}),...Object.values(mission.supportAssignments||{})].filter(a=>a.classId===student.classId&&a.sectionId===student.sectionId&&a.staffId===id&&student.subjects?.[a.subjectId]).map(a=>({id:a.subjectId,name:student.subjectCatalog?.[a.subjectId]?.name||a.subjectId}))};
}
