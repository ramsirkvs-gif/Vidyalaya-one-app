import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
export async function prepareMCQAssets(){
 const dest=path.join(root,'vendor/mcq');await fs.mkdir(dest,{recursive:true});
 // Remove obsolete generated OCR assets left by earlier local builds.
 for(const name of ['lang','tesseract.min.js','worker.min.js','LICENSE-tesseract-bundle','LICENSE-tesseract-worker','LICENSE-tesseract','LICENSE-tesseract-core','tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm'])await fs.rm(path.join(dest,name),{recursive:true,force:true});
 const files=[['qrcode-generator/dist/qrcode.js','qrcode.js'],['jsqr/dist/jsQR.js','jsQR.js'],['jsqr/LICENSE','LICENSE-jsQR']];
 for(const [source,target]of files)await fs.copyFile(path.join(root,'node_modules',source),path.join(dest,target));
 await fs.writeFile(path.join(dest,'NOTICE.txt'),'Generated from locked npm dependencies. qrcode-generator 2.0.4 (MIT); jsQR 1.4.0 (Apache-2.0). See source headers and included licenses. No school records are included.\n');
}
