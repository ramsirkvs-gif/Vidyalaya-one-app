import {el} from './cbse-ui.js';
import {scanPhoto,scannedPagesPDF} from './cbse-task-scan-pdf.js';

const limit=2_500_000;

export function signedSlipScan(parent,run){
 const area=el('fieldset',undefined,'task-slip-scan'),status=el('p');
 let photo;
 status.setAttribute('role','status');
 area.append(el('legend','Signed marks slip'),el('p','Check that the marks and signatures are readable.'));
 const camera=el('input');camera.type='file';camera.accept='image/*';
 camera.setAttribute('capture','environment');camera.hidden=true;
 const capture=el('button','Take photo'),preview=el('img');
 capture.type='button';capture.onclick=()=>camera.click();
 preview.alt='Scanned marks slip';preview.hidden=true;
 area.append(camera,capture,preview,status);parent.append(area);
 camera.onchange=()=>{
  const file=camera.files[0];camera.value='';
  if(!file)return;
  run(async()=>{
   status.textContent='';
   try{
    const next=await scanPhoto(file);
    if(!area.isConnected){URL.revokeObjectURL(next.url);return;}
    if(photo)URL.revokeObjectURL(photo.url);
    photo=next;preview.src=photo.url;preview.hidden=false;
    capture.textContent='Retake photo';
   }catch{status.textContent='The photo could not be opened. Please retake it.';}
  });
 };
 return {
  clear(){if(photo)URL.revokeObjectURL(photo.url);photo=undefined;},
  async payload(){
   if(!photo)throw Error('Take a photo of the signed slip first.');
   const file=scannedPagesPDF([photo]);
   if(file.size>limit)throw Error('The scan is over 2.5 MB. Please retake the photo.');
   return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=()=>reject(Error('The scan could not be prepared.'));
    reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(file);
   });
  },
 };
}
