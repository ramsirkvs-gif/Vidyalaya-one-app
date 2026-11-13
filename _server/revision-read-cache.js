// Read-only process cache. Authentication, PIN verification and writes never use this cache.
export function createRevisionReadCache({read,now=Date.now,maxAgeMs=30000,maxBytes=16*1024*1024,maxEntries=48}){
 const cached=new Map(),pending=new Map();let bytes=0;
 const remove=key=>{const old=cached.get(key);if(old){bytes-=old.bytes;cached.delete(key);}};
 return async function revisionRead(path,revisionPath,{fresh=false,project=value=>value,key=path}={}){
  if(fresh){remove(key);return project(await read(path));}
  const revision=await read(revisionPath);
  // Legacy/unversioned sources are always read directly, preserving existing behaviour.
  if(!Number.isSafeInteger(revision)||revision<1){remove(key);return project(await read(path));}
  const old=cached.get(key);if(old&&old.revision===revision&&now()-old.at<maxAgeMs){cached.delete(key);cached.set(key,old);return structuredClone(old.value);}
  const ticket=JSON.stringify([key,revision]);let promise=pending.get(ticket);
  if(!promise){promise=(async()=>{const value=project(await read(path)),after=await read(revisionPath);if(after===revision){const size=Buffer.byteLength(JSON.stringify(value)??'null');remove(key);if(size<=maxBytes){while(cached.size&&(bytes+size>maxBytes||cached.size>=maxEntries))remove(cached.keys().next().value);cached.set(key,{revision,at:now(),bytes:size,value:structuredClone(value)});bytes+=size;}}return value;})();pending.set(ticket,promise);}
  try{return structuredClone(await promise);}finally{if(pending.get(ticket)===promise)pending.delete(ticket);}
 };
}
