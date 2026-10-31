import {extractFacultyRoster} from './cbse-faculty-model.js';
export async function readFacultyPDF(file){
 if(file.size>15_000_000)throw Error('Choose a PDF smaller than 15 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Choose a valid PDF file.');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
 const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true});
 try{
  const pdf=await task.promise;if(pdf.numPages>50)throw Error('Choose a faculty roster of at most 50 pages.');
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
   pages.push({items:content.items.filter(i=>'str'in i).map(i=>({text:i.str,x:i.transform[4]*842/viewport.width,y:(viewport.height-i.transform[5])*595/viewport.height}))});
   page.cleanup();
  }
  return {roster:extractFacultyRoster(pages),digest};
 }finally{await task.destroy();}
}
