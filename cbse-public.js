// Keep previously shared student-search links working on the unified dashboard.
const target=new URL('cbse-mission.html',location.href);
const params=new URLSearchParams(location.hash.slice(1));
for(const[key,value]of new URLSearchParams(location.search))if(['q','class','section','student'].includes(key))params.set(key,value);
if(!params.has('student'))params.set('q',params.get('q')||'');
target.hash=params.toString();
location.replace(target.href);
