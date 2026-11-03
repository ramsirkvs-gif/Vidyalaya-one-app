import {parseMCQAnswers} from './cbse-mcq-model.js';
import {loadMCQScript} from './cbse-mcq-scan.js';
export function mcqOCRLanguage(subjectName){return /hindi|हिन्दी|हिंदी/i.test(subjectName)?'hin':/english|अंग्रेज/i.test(subjectName)?'eng':'eng+hin';}
export function prepareMCQOCRCanvas(source){
 const scale=Math.min(3,Math.max(1,1600/source.width)),border=24,canvas=document.createElement('canvas');canvas.width=Math.ceil(source.width*scale)+border*2;canvas.height=Math.ceil(source.height*scale)+border*2;const c=canvas.getContext('2d',{willReadFrequently:true});c.fillStyle='white';c.fillRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(source,border,border,canvas.width-border*2,canvas.height-border*2);const pixels=c.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;for(let i=0;i<data.length;i+=4){const gray=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);data[i]=data[i+1]=data[i+2]=gray;}c.putImageData(pixels,0,0);return canvas;
}
// Reuse one local worker between scans. Only public language models are cached, never question images/text.
let reader=null,queue=Promise.resolve();
async function disposeReader(entry){if(reader===entry)reader=null;clearTimeout(entry.timer);entry.disposed=true;try{if(entry.worker)await entry.worker.terminate();}catch{}}
async function readPhoto(canvas,language,onProgress){
 if(!['eng','hin','eng+hin'].includes(language))throw Error('Choose English, Hindi or English + Hindi.');
 await loadMCQScript('tesseract.min.js');const base=new URL('./vendor/mcq/',import.meta.url).href;
 if(reader&&reader.language!==language)await disposeReader(reader);
 if(!reader){const entry={language,onProgress};entry.failed=new Promise((_,reject)=>entry.reject=reject);entry.setup=globalThis.Tesseract.createWorker(language,1,{workerPath:base+'worker.min.js',corePath:base+'tesseract-core-lstm.wasm.js',langPath:base+'lang/',workerBlobURL:false,cacheMethod:'write',cachePath:'mission-mcq-v6-data1',logger:progress=>entry.onProgress(progress),errorHandler:error=>entry.reject(Error(typeof error==='string'?error:error?.message||'The photo text tools could not load.'))}).then(worker=>{entry.worker=worker;if(entry.disposed)worker.terminate();return worker;});reader=entry;}
 const entry=reader;clearTimeout(entry.timer);entry.onProgress=onProgress;
 try{const worker=await Promise.race([entry.setup,entry.failed]);await worker.setParameters({preserve_interword_spaces:'1'});const result=await Promise.race([worker.recognize(prepareMCQOCRCanvas(canvas)),entry.failed]);const text=result.data.text.trim();if(!text)throw Error('No readable text found. Crop more closely or take a clearer photo.');entry.timer=setTimeout(()=>disposeReader(entry),60000);return text;}catch(error){await disposeReader(entry);throw error;}
}
export function extractMCQPhotoText(canvas,language='eng',onProgress=()=>{}){const task=queue.then(()=>readPhoto(canvas,language,onProgress));queue=task.catch(()=>{});return task;}
const questionStarts=text=>[...text.matchAll(/^[ \t]*(?:(?:प्रश्न|Question|Ques|Q)\s*[.:-]?\s*)?(\d{1,3})\s*(?:[.):：\-–—]|(?=\s))\s*/gmi)];
export function appendMCQPhotoText(existing,recognised){
 const current=String(existing||'').trim();let text=String(recognised||'').replace(/\r\n?/g,'\n').replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406)).trim();if(!text)throw Error('No readable text found.');
 const keyStart=text.match(/^(?:answer\s*key|answers|उत्तरमाला)\s*[:：-]?\s*/im);let key=null;if(keyStart){key=text.slice(keyStart.index+keyStart[0].length);text=text.slice(0,keyStart.index).trim();}
 let number=questionStarts(current).length;const starts=questionStarts(text),numbers=starts.map(m=>Number(m[1]));const answers=key===null?null:parseMCQAnswers(key,numbers.length?numbers:[1]);
 const arranged=starts.length?starts.map((m,i)=>{let block=text.slice(m.index+m[0].length,starts[i+1]?.index??text.length).trim();if(answers)block+='\nAnswer: '+answers[i];return (++number)+'. '+block;}).join('\n\n'):(number+1)+'. '+text+(answers?'\nAnswer: '+answers[0]:'');
 const result=[current,arranged].filter(Boolean).join('\n\n');if(result.length>120000)throw Error('The notepad limit is 120000 characters. Start a separate contribution for more questions.');return result;
}
