import {loadMCQScript} from './cbse-mcq-scan.js';
// Photos are recognised in this browser; no image/text is sent to an OCR service.
export async function extractMCQPhotoText(canvas,language='eng',onProgress=()=>{}){
 if(!['eng','hin','eng+hin'].includes(language))throw Error('Choose English, Hindi or English + Hindi.');
 await loadMCQScript('tesseract.min.js');const base=new URL('./vendor/mcq/',import.meta.url).href;
 let fail;const failed=new Promise((_,reject)=>{fail=reject;});const setup=globalThis.Tesseract.createWorker(language,1,{workerPath:base+'worker.min.js',corePath:base+'tesseract-core-lstm.wasm.js',langPath:base+'lang/',workerBlobURL:false,cacheMethod:'none',logger:onProgress,errorHandler:error=>fail(Error(typeof error==='string'?error:error?.message||'The photo text tools could not load.'))});const worker=await Promise.race([setup,failed]);
 try{await worker.setParameters({preserve_interword_spaces:'1'});const result=await worker.recognize(canvas);const text=result.data.text.trim();if(!text)throw Error('No readable text found. Crop more closely or take a clearer photo.');return text;}finally{await worker.terminate();}
}
export function appendMCQPhotoText(existing,recognised){
 const current=String(existing||'').trim(),text=String(recognised||'').replace(/\r\n?/g,'\n').trim();if(!text)throw Error('No readable text found.');
 let number=[...current.matchAll(/^\s*\d{1,3}[.)]\s+/gm)].length;
 const numbered=/^\s*(?:Q(?:uestion)?\.?\s*)?\d{1,3}[.)]\s+/gmi;let found=false;
 const arranged=text.replace(numbered,()=>{found=true;return (++number)+'. ';});
 const result=[current,found?arranged:(number+1)+'. '+text].filter(Boolean).join('\n\n');
 if(result.length>120000)throw Error('The notepad limit is 120000 characters. Start a separate contribution for more questions.');return result;
}
