import {parseMCQAnswers} from './cbse-mcq-model.js';
import {loadMCQScript} from './cbse-mcq-scan.js';
// Photos are recognised in this browser; no image/text is sent to an OCR service.
export async function extractMCQPhotoText(canvas,language='eng',onProgress=()=>{}){
 if(!['eng','hin','eng+hin'].includes(language))throw Error('Choose English, Hindi or English + Hindi.');
 await loadMCQScript('tesseract.min.js');const base=new URL('./vendor/mcq/',import.meta.url).href;
 let fail;const failed=new Promise((_,reject)=>{fail=reject;});const setup=globalThis.Tesseract.createWorker(language,1,{workerPath:base+'worker.min.js',corePath:base+'tesseract-core-lstm.wasm.js',langPath:base+'lang/',workerBlobURL:false,cacheMethod:'none',logger:onProgress,errorHandler:error=>fail(Error(typeof error==='string'?error:error?.message||'The photo text tools could not load.'))});const worker=await Promise.race([setup,failed]);
 try{await worker.setParameters({preserve_interword_spaces:'1'});const result=await worker.recognize(canvas);const text=result.data.text.trim();if(!text)throw Error('No readable text found. Crop more closely or take a clearer photo.');return text;}finally{await worker.terminate();}
}
const questionStarts=text=>[...text.matchAll(/^[ \t]*(?:(?:प्रश्न|Question|Ques|Q)\s*[.:-]?\s*)?(\d{1,3})\s*(?:[.):：\-–—]|(?=\s))\s*/gmi)];
export function appendMCQPhotoText(existing,recognised){
 const current=String(existing||'').trim();let text=String(recognised||'').replace(/\r\n?/g,'\n').replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406)).trim();if(!text)throw Error('No readable text found.');
 const keyStart=text.match(/^(?:answer\s*key|answers|उत्तरमाला)\s*[:：-]?\s*/im);let key=null;if(keyStart){key=text.slice(keyStart.index+keyStart[0].length);text=text.slice(0,keyStart.index).trim();}
 let number=questionStarts(current).length;const starts=questionStarts(text),numbers=starts.map(m=>Number(m[1]));const answers=key===null?null:parseMCQAnswers(key,numbers.length?numbers:[1]);
 const arranged=starts.length?starts.map((m,i)=>{let block=text.slice(m.index+m[0].length,starts[i+1]?.index??text.length).trim();if(answers)block+='\nAnswer: '+answers[i];return (++number)+'. '+block;}).join('\n\n'):(number+1)+'. '+text+(answers?'\nAnswer: '+answers[0]:'');
 const result=[current,arranged].filter(Boolean).join('\n\n');if(result.length>120000)throw Error('The notepad limit is 120000 characters. Start a separate contribution for more questions.');return result;
}
