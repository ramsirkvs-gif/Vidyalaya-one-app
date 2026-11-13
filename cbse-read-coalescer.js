// Merge only simultaneous reads. Completed results are never kept in the browser.
export function createReadCoalescer(){
 const pending=new Map();
 return (key,load)=>{if(pending.has(key))return pending.get(key);const request=Promise.resolve().then(load).finally(()=>{if(pending.get(key)===request)pending.delete(key);});pending.set(key,request);return request;};
}
