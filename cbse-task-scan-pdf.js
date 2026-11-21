// Each scanned JPEG is placed on one PDF page without re-encoding it.
export function scannedPagesPDF(pages){
 const parts=[],offsets=[0],encoder=new TextEncoder();
 let size=0;
 const append=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);size+=bytes.length;};
 const object=(id,...contents)=>{offsets[id]=size;append(id+' 0 obj\n');contents.forEach(append);append('\nendobj\n');};
 append('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
 pages.forEach(({jpeg,width,height},index)=>{
  const id=3+index*3,w=width>height?842:595,h=width>height?595:842;
  const scale=Math.min((w-24)/width,(h-24)/height),iw=width*scale,ih=height*scale;
  const stream='q '+iw.toFixed(2)+' 0 0 '+ih.toFixed(2)+' '+((w-iw)/2).toFixed(2)+' '+((h-ih)/2).toFixed(2)+' cm /Scan Do Q\n';
  object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+w+' '+h+'] /Resources << /XObject << /Scan '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
  object(id+1,'<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n',jpeg,'\nendstream');
  object(id+2,'<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
 });
 const xref=size;
 append('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
 for(const offset of offsets.slice(1))append(String(offset).padStart(10,'0')+' 00000 n \n');
 append('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(parts,{type:'application/pdf'});
}

export async function scanPhoto(file){
 if(file.size>30_000_000)throw Error('Choose a photo under 30 MB.');
 const image=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1800/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d',{alpha:false});
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const photo=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));
  if(!photo)throw Error('The photo could not be prepared. Retake it and try again.');
  return {jpeg:new Uint8Array(await photo.arrayBuffer()),width:canvas.width,height:canvas.height,url:URL.createObjectURL(photo)};
 }finally{image.close();}
}
