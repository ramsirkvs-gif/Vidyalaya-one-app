// PDF content stays in this browser. Only reviewed text/cropped questions enter a contribution.
export function pdfPageSelection(value,total){
 const source=String(value).trim();if(!source)throw Error('Enter page numbers, for example 1-3, 5.');const pages=[];
 for(const part of source.split(',')){const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw Error('Use page numbers such as 1-3, 5.');const start=Number(m[1]),end=Number(m[2]||m[1]);if(start<1||end<start||end>total)throw Error('Choose pages between 1 and '+total+'.');if(end-start>=20)throw Error('Read up to 20 pages at a time.');for(let i=start;i<=end;i++)if(!pages.includes(i))pages.push(i);if(pages.length>20)throw Error('Read up to 20 pages at a time.');}
 return pages;
}
export function pdfTextLines(items){
 let out='',previous=null;for(const item of items){if(typeof item.str!=='string')continue;const x=item.transform?.[4]||0,y=item.transform?.[5]||0;
 if(previous&&out&&!out.endsWith('\n'))out+=Math.abs(y-previous.y)>Math.max(2,(item.height||10)*.4)||x<previous.x-5?'\n':' ';
 out+=item.str;if(item.hasEOL)out+='\n';previous={x,y};}return out.replace(/[ \t]+\n/g,'\n').trim();
}
export async function openMCQDocument(file){
 if(!file||file.size>30*1024*1024)throw Error('Choose a PDF smaller than 30 MB or an image smaller than 15 MB.');
 if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
  const base=new URL('./vendor/mcq/pdf/',import.meta.url).href;let task;
  try{const pdfjs=await import(base+'pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=base+'pdf.worker.mjs';task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/'});
   task.onPassword=()=>task.destroy();const pdf=await task.promise;
   if(pdf.numPages>500){await task.destroy();throw Error('This PDF has more than 500 pages. Save the needed chapter as a smaller PDF.');}
   return {pages:pdf.numPages,isPDF:true,async canvas(number){const page=await pdf.getPage(number),size=page.getViewport({scale:1}),scale=Math.min(3,2200/Math.max(size.width,size.height)),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return canvas;},async text(number){return pdfTextLines((await (await pdf.getPage(number)).getTextContent()).items);},close:()=>task.destroy()};
  }catch(error){await task?.destroy();throw Error('Could not open this PDF. Use an unlocked, readable PDF or upload screenshots of its pages. '+(error?.message||''));}
 }
 const {imageCanvas}=await import('./cbse-mcq-image.js');const canvas=await imageCanvas(file,2200);return {pages:1,isPDF:false,canvas:async()=>canvas,text:async()=>'',close:async()=>{}};
}
