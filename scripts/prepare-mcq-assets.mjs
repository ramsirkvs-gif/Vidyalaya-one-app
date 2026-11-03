import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
export async function prepareMCQAssets(){
 const dest=path.join(root,'vendor/mcq');await fs.mkdir(dest,{recursive:true});
 await fs.mkdir(path.join(dest,'lang'),{recursive:true});
 const files=[['qrcode-generator/dist/qrcode.js','qrcode.js'],['jsqr/dist/jsQR.js','jsQR.js'],['jsqr/LICENSE','LICENSE-jsQR'],['tesseract.js/dist/tesseract.min.js','tesseract.min.js'],['tesseract.js/dist/worker.min.js','worker.min.js'],['tesseract.js/dist/tesseract.min.js.LICENSE.txt','LICENSE-tesseract-bundle'],['tesseract.js/dist/worker.min.js.LICENSE.txt','LICENSE-tesseract-worker'],['tesseract.js/LICENSE.md','LICENSE-tesseract'],['tesseract.js-core/LICENSE','LICENSE-tesseract-core'],['tesseract.js-core/tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm.js'],['tesseract.js-core/tesseract-core-lstm.wasm','tesseract-core-lstm.wasm'],['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz','lang/eng.traineddata.gz'],['@tesseract.js-data/hin/4.0.0_best_int/hin.traineddata.gz','lang/hin.traineddata.gz']];
 for(const [source,target]of files)await fs.copyFile(path.join(root,'node_modules',source),path.join(dest,target));
 await fs.writeFile(path.join(dest,'NOTICE.txt'),'Generated from locked npm dependencies. qrcode-generator 2.0.4 (MIT); jsQR 1.4.0 (Apache-2.0); Tesseract.js 6.0.1 and tesseract.js-core (Apache-2.0); English/Hindi trained data @tesseract.js-data 1.0.0 (Apache-2.0). See source headers and included licenses. No school records are included.\n');
}
