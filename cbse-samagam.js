import {entries} from './cbse-model.js';
const clean=v=>String(v??'').trim().replace(/\s+/g,' '),normal=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const alias={ENGLISHLANGUAGEANDLITERATURE:'ENGLISH',ENGLISHCORE:'ENGLISH',HINDICOURSEA:'HINDI',HINDICORE:'HINDI',MATHEMATICSSTANDARD:'MATHSSTANDARD',MATHEMATICSBASIC:'MATHSBASIC',MATHEMATICS:'MATHS',ARTIFICIALINTELLIGENCE:'AI',ARTIFICIALINTELLIGENCENEW:'AI',COMPUTERSCIENCE:'CS',INFORMATICSPRACTICES:'IP',BUSINESSSTUDIES:'BSTD',POLITICALSCIENCE:'POLSCI'};
const subjectKey=value=>alias[normal(value)]||normal(value);
export function inspectSamagam(grid){
 const metadata={};for(const row of grid.slice(0,12))if(row[0])metadata[normal(row[0])]=clean(row[1]);
 const cl=metadata.CLASSSECTION?.match(/^(10|12|XII|X)\s*[- ]?\s*([A-Z0-9]+)$/i);if(!cl)throw Error('Cannot find Class & Section in this Samagam statement.');
 const session=metadata.SESSION;if(!/^\d{4}-\d{2}$/.test(session||''))throw Error('Cannot find the academic session.');
 const header=grid.findIndex(r=>normal(r[0])==='SLNO'||normal(r[0])==='SNO');if(header<0||!grid[header+1])throw Error('Cannot find the examination and subject headers.');
 const blocks=[];for(let c=4;c<grid[header].length;c++){
  const name=clean(grid[header][c]);if(!name||/^Total\b/i.test(name)||/^(%|Rank)$/i.test(name))continue;
  const columns=[];for(let j=c;j<grid[header+1].length;j++){const text=clean(grid[header+1][j]);if(/^Total\b/i.test(text)||!text)break;const m=text.match(/^(.+)\s+\((\d+(?:\.\d+)?)\)$/);if(!m)throw Error('Cannot read paper maximum: '+text);columns.push({column:j,name:clean(m[1]),maximum:Number(m[2])});}
  if(!columns.length)continue;
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];let month=monthNames.findIndex(m=>new RegExp('\\b'+m.slice(0,3)+'(?:[a-z]*)\\b','i').test(name))+1;
  const period=month?`${Number(session.slice(0,4))+(month<4?1:0)}-${String(month).padStart(2,'0')}`:'';
  const examType=/(?:pre[ -]?board|PB).*?(?:2|ii)\b/i.test(name)?'PB-2':/(?:pre[ -]?board|\bPB[ -]?[12I])/i.test(name)?'PB-1':/monthly/i.test(name)?'monthly':/mock/i.test(name)?'mock':'test';blocks.push({name,columns,period,examType,index:blocks.length});
 }
 if(!blocks.length)throw Error('No examinations found in the statement.');
 return {classId:['12','XII'].includes(cl[1].toUpperCase())?'XII':'X',section:cl[2].toUpperCase(),session,header,blocks};
}
export function parseSamagamGrid(grid,draft,{periods={},rules={}}={}){
 const meta=inspectSamagam(grid),section=entries(draft.classes?.[meta.classId]?.sections).find(([,s])=>normal(s.name)===normal(meta.section))?.[1];if(!section)throw Error('Import this section’s basic student roster first.');
 const people=new Map();for(const[,p]of entries(section.students)){const k=normal(p.name);if(people.has(k))people.set(k,null);else people.set(k,p);}
 const records=[],attendance=[],duplicates=new Set();
 for(const row of grid.slice(meta.header+2)){
  if(!/^\d+$/.test(clean(row[0]))||!clean(row[2]))continue;
  const name=clean(row[2]),person=people.get(normal(name));if(!person)throw Error('No unique roster name match: '+name);if(duplicates.has(normal(name)))throw Error('Duplicate student row: '+name);duplicates.add(normal(name));
  for(const block of meta.blocks){const period=periods[block.index]||block.period;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('Choose the month for '+block.name);
   for(const col of block.columns){const match=entries(section.subjects).filter(([,s])=>subjectKey(s.name)===subjectKey(col.name));if(match.length!==1)throw Error('Unknown or ambiguous subject: '+col.name);const[id,catalog]=match[0];const raw=clean(row[col.column]);
    if(!person.subjects?.[id]){if(raw&&!['—','-','NA','N/A','NF','NE'].includes(raw.toUpperCase()))throw Error(`${name}: ${catalog.name} has a result but is not selected in the roster.`);continue;}
    const stripped=raw.replace(/\*$/,'').trim(),missing=['','—','-'].includes(stripped),absent=missing||['AB','ABS','ABSENT','NE','NF','NA','N/A'].includes(stripped.toUpperCase());let score=null;if(!absent){if(!/^\d+(?:\.\d+)?$/.test(stripped))throw Error('Unrecognised mark: '+raw);score=Number(stripped);if(score>col.maximum)throw Error('Mark exceeds maximum for '+catalog.name);}
    const r=rules[col.maximum]||{criticalBelow:Math.min(10,col.maximum*.25),passFrom:col.maximum===40?13:Math.round(col.maximum*.33),secureFrom:Math.ceil(col.maximum*.45)};
    records.push({classId:meta.classId,section:meta.section,name,roll:clean(row[1]),period,subject:catalog.name,maximum:col.maximum,score,absent,sourceValue:raw,inferredAbsent:missing,...r,examType:block.examType,examKey:normal(block.name).slice(0,70),examName:block.name});
   }
  }
  const pct=Number(clean(row[3]).replace(/%/g,''));if(clean(row[3])&&Number.isFinite(pct))attendance.push({classId:meta.classId,section:meta.section,name,percentage:pct,session:meta.session});
 }
 if(!records.length)throw Error('No student marks found.');return {format:'mission-academic-history-v1',session:meta.session,records,attendance};
}
let excelLoading;
export async function readSamagamExcel(file){
 if(file.size>10_000_000)throw Error('Choose a Samagam Excel file smaller than 10 MB.');
 if(!globalThis.ExcelJS){excelLoading||=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/exceljs/exceljs.min.js';script.onload=resolve;script.onerror=()=>{excelLoading=null;reject(Error('Excel reader could not load. Refresh and try again.'));};document.head.append(script);});await excelLoading;}
 const workbook=new globalThis.ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());const sheet=workbook.worksheets[0];if(!sheet||sheet.rowCount>3000||sheet.columnCount>500)throw Error('Unsupported or oversized statement.');
 const grid=[];for(let i=1;i<=sheet.rowCount;i++){const row=[];for(let j=1;j<=sheet.columnCount;j++){const cell=sheet.getCell(i,j);const v=cell.isMerged&&cell.master.address!==cell.address?'':cell.value;row.push(v&&typeof v==='object'?(Object.hasOwn(v,'result')?v.result:v.richText?v.richText.map(t=>t.text).join(''):v.text||''):v??'');}grid.push(row);}return {grid,meta:inspectSamagam(grid)};
}
