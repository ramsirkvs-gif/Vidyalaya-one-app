import {el} from './cbse-ui.js';
import {scanPhoto,scannedPagesPDF} from './cbse-task-scan-pdf.js';

const limit=2_500_000,maxPages=8;

export function signedSlipScan(parent,run){
 const area=el('fieldset',undefined,'task-slip-scan'),photos=[],list=el('ol'),status=el('p');
 let pdfFile;
 status.setAttribute('role','status');
 const input=(label,accept,{camera=false,multiple=false}={})=>{
  const wrap=el('label',label),field=el('input');
  field.type='file';field.accept=accept;field.multiple=multiple;
  if(camera)field.setAttribute('capture','environment');
  wrap.append(field);area.append(wrap);return field;
 };
 area.append(el('legend','Signed marks slip'),el('p','Photograph every page and check that the marks and signatures are readable.'));
 const camera=input('Take a photo','image/*',{camera:true});
 const gallery=input('Choose page photos','image/*',{multiple:true});
 const pdf=input('Or choose a PDF','application/pdf,.pdf');
 area.append(list,status);parent.append(area);
 const draw=()=>{
  list.replaceChildren();
  photos.forEach((page,index)=>{
   const item=el('li'),image=el('img');
   image.src=page.url;image.alt='Scanned page '+(index+1);
   const action=(label,change)=>{
    const button=el('button',label);button.type='button';button.onclick=()=>{change();draw();};item.append(button);
   };
   item.append(image,el('strong','Page '+(index+1)));
   if(index)action('Move up',()=>{[photos[index-1],photos[index]]=[page,photos[index-1]];});
   action('Remove',()=>{URL.revokeObjectURL(page.url);photos.splice(index,1);});
   list.append(item);
  });
 };
 const clearPhotos=()=>{for(const photo of photos)URL.revokeObjectURL(photo.url);photos.length=0;draw();};
 const add=event=>{
  const field=event.target,files=[...field.files];field.value='';
  if(!files.length)return;
  run(async()=>{
   status.textContent='';
   if(photos.length+files.length>maxPages){status.textContent='Scan up to '+maxPages+' pages per slip.';return;}
   try{
    for(const file of files){
     const page=await scanPhoto(file);
     photos.push(page);pdfFile=undefined;pdf.value='';draw();
    }
   }catch{status.textContent='A photo could not be opened. Retake it or choose a JPG from your phone.';}
  });
 };
 camera.onchange=gallery.onchange=add;
 pdf.onchange=()=>{pdfFile=pdf.files[0];if(pdfFile)clearPhotos();status.textContent='';};
 return {
  clear:clearPhotos,
  async payload(){
   const file=pdfFile||(photos.length?scannedPagesPDF(photos):null);
   if(!file)throw Error('Take a photo of the signed slip or choose a PDF.');
   if(file.size>limit)throw Error('The PDF is over 2.5 MB. Choose a smaller PDF containing every signed page.');
   if(await file.slice(0,5).text()!=='%PDF-')throw Error('Choose a valid PDF.');
   const encoded=await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=()=>reject(Error('The PDF could not be read.'));
    reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(file);
   });
   return encoded;
  },
 };
}
