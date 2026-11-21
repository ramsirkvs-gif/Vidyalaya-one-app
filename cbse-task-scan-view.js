import {el} from './cbse-ui.js';
import {scanPhoto,scannedPagesPDF} from './cbse-task-scan-pdf.js';

const limit=2_500_000;

export function signedSlipScan(parent,run){
 const area=el('fieldset',undefined,'task-slip-scan'),photos=[],status=el('p');
 status.setAttribute('role','status');
 area.append(el('legend','Signed marks slip'),el('p','Check that the marks and signatures are readable.'));
 const camera=el('input');camera.type='file';camera.accept='image/*';
 camera.setAttribute('capture','environment');camera.hidden=true;
 const pages=el('div'),preview=el('div');
 const photoButton=(label,index)=>{
  const action=el('button',label);
  action.type='button';action.onclick=()=>{pageIndex=index;camera.click();};
  return action;
 };
 let pageIndex=0;
 const pageOne=photoButton('Take photo',0),pageTwo=photoButton('Add page 2',1);
 pages.append(pageOne,pageTwo);area.append(camera,pages,preview,status);parent.append(area);
 const draw=()=>{
  pageOne.textContent=photos[0]?'Retake page 1':'Take photo';
  pageTwo.hidden=!photos[0];
  pageTwo.textContent=photos[1]?'Retake page 2':'Add page 2 (optional)';
  preview.replaceChildren(...photos.map((photo,index)=>{
   const image=el('img');image.src=photo.url;image.alt='Scanned page '+(index+1);
   return image;
  }));
 };
 camera.onchange=()=>{
  const file=camera.files[0];camera.value='';
  if(!file)return;
  const index=pageIndex;
  run(async()=>{
   status.textContent='';
   try{
    const photo=await scanPhoto(file);
    if(!area.isConnected){URL.revokeObjectURL(photo.url);return;}
    if(photos[index])URL.revokeObjectURL(photos[index].url);
    photos[index]=photo;draw();
   }catch{status.textContent='The photo could not be opened. Please retake it.';}
  });
 };
 draw();
 return {
  clear(){for(const photo of photos)URL.revokeObjectURL(photo.url);photos.length=0;},
  async payload(){
   if(!photos.length)throw Error('Take a photo of the signed slip first.');
   const file=scannedPagesPDF(photos);
   if(file.size>limit)throw Error('The scan is over 2.5 MB. Please retake the photos.');
   return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=()=>reject(Error('The scan could not be prepared.'));
    reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(file);
   });
  },
 };
}
