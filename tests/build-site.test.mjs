import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('static build is repeatable, includes working app assets, and excludes private/development files',async()=>{
 const build=id=>import(new URL(`../scripts/build-site.mjs?check=${id}`,import.meta.url));
 await build('first');const first=JSON.parse(await fs.readFile(path.join(root,'public/app-version.json'),'utf8'));await build('second');const second=JSON.parse(await fs.readFile(path.join(root,'public/app-version.json'),'utf8'));assert.equal(first.version,second.version);assert.match(first.version,/^[a-f0-9]{64}$/);
 const names=await fs.readdir(path.join(root,'public'));
 for(const page of ['index.html','cbse-admin.html','cbse-faculty.html','cbse-settings.html','cbse-students.html','cbse-mission.html','cbse-staff.html']){
  const text=await fs.readFile(path.join(root,'public',page),'utf8');if(page==='cbse-students.html')assert.ok(text.includes(`src="cbse-public.js?v=${first.version}"`));else assert.ok(text.includes(`live-update.js?v=${first.version}`));
  for(const match of text.matchAll(/(?:src|href)="([^"#]+)"/g)){
   const value=match[1].split('?')[0];if(value.includes('://')||value.startsWith('mailto:'))continue;
   await fs.access(path.join(root,'public',value));
  }
 }
 for(const excluded of ['AGENTS.md','CBSE_SETUP.md','README.md','firebase.json','.firebaserc','tests','cbse-private','faculty.pdf','firebase-applications.json','api','_server','package.json','package-lock.json','MISSION_SETUP.md'])assert.ok(!names.includes(excluded),excluded);
 assert.ok(names.includes('database.rules.json'));await fs.access(path.join(root,'public/vendor/pdfjs/pdf.worker.min.mjs'));
 const missionPage=await fs.readFile(path.join(root,'public/cbse-mission.html'),'utf8');
 for(const asset of ['cbse-mission.js','cbse-mission.css','cbse-mission-theme.css'])assert.ok(missionPage.includes(`${asset}?v=${first.version}`));
 assert.equal((missionPage.match(/id="mission-mcq-shortcut"/g)||[]).length,1);
 assert.ok(!missionPage.includes('id="mission-mcq-entry"'));
 const targetsScript=await fs.readFile(path.join(root,'public/cbse-mcq-student-targets-view.js'),'utf8');assert.ok(targetsScript.includes('Print all except absent students'));assert.ok(targetsScript.includes('./cbse-mcq-print-selection.js?v='+first.version));
 const missionScript=await fs.readFile(path.join(root,'public/cbse-mission.js'),'utf8');assert.ok(!missionScript.includes("button('MCQs महाअभियान'"));assert.ok(missionScript.includes('./cbse-mcq-view.js?v='+first.version));
 for(const file of ['cbse-mcq-import.js','cbse-mcq-pdf.js','cbse-mcq-math.js','vendor/math-fonts/NotoSansMath-Regular.ttf','vendor/math-fonts/OFL.txt','vendor/mcq/pdf/pdf.mjs','vendor/mcq/pdf/pdf.worker.mjs','vendor/mcq/pdf/standard_fonts/LiberationSans-Regular.ttf','vendor/mcq/pdf/wasm/openjpeg.wasm'])await fs.access(path.join(root,'public',file));
 const vercel=JSON.parse(await fs.readFile(path.join(root,'vercel.json'),'utf8'));assert.equal(vercel.buildCommand,'node scripts/build-site.mjs');assert.equal(vercel.outputDirectory,'public');
});
