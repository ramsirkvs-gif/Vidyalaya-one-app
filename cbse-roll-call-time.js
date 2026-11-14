export function rollDateText(value){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));return m?`${m[3]}/${m[2]}/${m[1]}`:'—';}
export function rollTimestamp(value){if(!Number.isFinite(Number(value))||!value)return '—';const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date(Number(value))),get=k=>p.find(x=>x.type===k)?.value;return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')} IST`;}
export function startRollClock(node,serverTime){const start=performance.now();let timer;const tick=()=>{if(!node.isConnected){clearInterval(timer);return;}node.textContent='Live date & time: '+rollTimestamp(Number(serverTime)+performance.now()-start);};tick();timer=setInterval(tick,1000);return ()=>clearInterval(timer);}
export function rollDateRange(from,to,min='',max=''){
 const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(!valid(from)||!valid(to)||from>to||min&&from<min||max&&to>max)throw Error('Choose valid From and To dates within the available dates.');
 const dates=[];for(let date=Date.parse(from);date<=Date.parse(to);date+=86400000){dates.push(new Date(date).toISOString().slice(0,10));if(dates.length>366)throw Error('Select at most 366 dates.');}return dates;
}
