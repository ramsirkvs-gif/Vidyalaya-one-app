const schoolName='PM SHRI KENDRIYA VIDYALAYA NO.1 ITANAGAR';
const subjects={
 X:{'ENGLISH LANGUAGE AND LITERATURE':'184','HINDI COURSE A':'002','MATHEMATICS STANDARD':'041',
  'MATHEMATICS BASIC':'241',SCIENCE:'086','SOCIAL SCIENCE':'087','ARTIFICIAL INTELLIGENCE':'417'},
 XII:{'ENGLISH CORE':'301','HINDI CORE':'302',BIOLOGY:'044',CHEMISTRY:'043','COMPUTER SCIENCE':'083',
  MATHEMATICS:'041',PHYSICS:'042','INFORMATICS PRACTICES':'065',ACCOUNTANCY:'055','BUSINESS STUDIES':'054',
  ECONOMICS:'030',GEOGRAPHY:'029',HISTORY:'027','POLITICAL SCIENCE':'028','ARTIFICIAL INTELLIGENCE NEW':'843'}
};
const normalize=value=>String(value??'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
export const samagamSections=['10A','10B','10C','10D','12A','12B','12C','12D','12E'];

async function loadSections(ExcelJS,files){
 const single=files.length===1;
 if(!single&&files.length!==samagamSections.length)
  throw Error('Choose the combined Samagam marks workbook, or select all nine original statements.');
 const groups=await Promise.all(Array.from(files,async file=>{
  if(!/\.xlsx$/i.test(file.name)||file.size>300000)throw Error('Choose an Excel marks workbook (.xlsx).');
  const book=new ExcelJS.Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  if(book.worksheets.length!==(single?samagamSections.length:1))
   throw Error('Choose the combined Samagam marks workbook, or select all nine original statements. The HQ exports are for reporting.');
  return book.worksheets.map(sheet=>({sheet,report:readSection(sheet)}));
 }));
 const sections=groups.flat();
 if(new Set(sections.map(({report})=>report.section)).size!==samagamSections.length)
  throw Error('Include one statement for each of X A–D and XII A–E.');
 return sections;
}

export async function readSamagamPB1Files(ExcelJS,files){
 return (await loadSections(ExcelJS,files)).map(({report})=>report);
}

export async function createSamagamPB1Workbook(ExcelJS,files){
 const source=await loadSections(ExcelJS,files);
 const book=new ExcelJS.Workbook();
 for(const section of samagamSections){
  const {sheet}=source.find(({report})=>report.section===section);
  const target=book.addWorksheet(section,{views:[{state:'frozen',xSplit:4,ySplit:8}]});
  target.getColumn(3).width=32;
  sheet.eachRow((row,index)=>{
   row.eachCell((cell,column)=>{
    target.getCell(index,column).value=cell.isMerged?cell.text:cell.value;
   });
  });
 }
 return book;
}

function readSection(sheet){
  const at=(r,c)=>sheet.getCell(r,c).value;
  const section=String(at(4,2)||'').trim(),classId=section.startsWith('10')?'X':'XII';
  const stream=classId==='X'?'':(/[AB]$/.test(section)?' SC':section.endsWith('C')?' COM':' HUM');
  if(normalize(at(2,2))!==normalize(schoolName)||normalize(at(3,2))!=='I PREBOARD EXAM '+classId+stream||
     at(5,2)!=='2026-27'||!samagamSections.includes(section)||normalize(at(8,3))!=='NAME OF THE STUDENT')
   throw Error('Choose the final Samagam marks import workbook or the original student-wise statements.');
  const groups=[];
  sheet.getRow(8).eachCell((cell,index)=>{
   if(index<5)return;
   const header=/^(.*?)\s*\((\d+)\)$/.exec(String(cell.value||''));
   if(!header||normalize(header[1])==='TOTAL')return;
   const code=subjects[classId][normalize(header[1])];
   if(!code)throw Error('Unrecognised Samagam subject in '+section+': '+header[1]);
   groups.push({index,code,maximum:Number(header[2])});
  });
  const rows=[];
  for(let index=9;index<=sheet.rowCount;index++){
   if(typeof at(index,1)!=='number')continue;
   const name=at(index,3),roll=at(index,2),marks=[];
   for(const {index:column,code,maximum} of groups){
    const raw=at(index,column),value=typeof raw==='string'?raw.trim().toUpperCase():raw;
    if(value===null||['','—','–','-'].includes(value))continue;
    if(typeof value!=='number'&&!['AB','ABS','ABSENT'].includes(value))throw Error('Check the mark for '+name+' in '+section+'.');
    marks.push([code,maximum,typeof value==='number'?value:'AB']);
   }
   rows.push({name,roll,marks});
  }
  return {section,rows,generated:String(at(6,2)||'')};
}
