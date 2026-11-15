import {parseCSVRows} from './cbse-basic-import.js';
import {TASK_CLASSES,taskHeader} from './cbse-task-manager-model.js';
export const TASK_CSV_COLUMNS=['Class','AssignedTeacher','TotalStudents','CatVStudents','STStudents'];
export function taskFiguresTemplate(){return TASK_CSV_COLUMNS.join(',')+'\r\n'+TASK_CLASSES.map(c=>c+',,,,').join('\r\n')+'\r\n';}
export function importTaskFiguresCSV(text,staff){
 const rows=parseCSVRows(text.replace(/^\uFEFF/,'')),columns=rows.shift()||[];
 if(columns.join(',')!==TASK_CSV_COLUMNS.join(','))throw Error('Use the class figures CSV template columns without changing their names.');
 if(!rows.length)throw Error('No classes found in CSV.');const headers={},assignments={};
 const number=value=>{if(!value)return null;if(!/^\d+$/.test(value))throw Error('Counts must be whole numbers; leave unknown counts blank.');return Number(value);};
 for(const [index,values]of rows.entries()){
  if(values.length!==columns.length)throw Error('CSV row '+(index+2)+' has the wrong number of columns.');const [classId,teacher,total,catV,st]=values;
  if(!TASK_CLASSES.includes(classId)||Object.hasOwn(headers,classId))throw Error('Use each valid class once, including XI E (not X E).');
  headers[classId]=taskHeader({total:number(total),catV:number(catV),st:number(st)});
  if(teacher){const matches=Object.entries(staff).filter(([,p])=>p.status==='active'&&p.name.trim().toLocaleLowerCase()===teacher.toLocaleLowerCase());if(matches.length!==1)throw Error(classId+': teacher name is missing or ambiguous. Choose this teacher directly in the form.');assignments[classId]=matches[0][0];}
 }return {headers,assignments};
}
export async function importTaskStrengthWorkbook(buffer,ExcelJS,JSZip){
 // Read cell data only. ExcelJS cannot reconcile some chart-only drawings.
 // Strip decorative chart/drawing ZIP parts from an in-memory copy, never the source file.
 if(JSZip){const archive=await JSZip.loadAsync(buffer);for(const name of Object.keys(archive.files))if(/^xl\/(drawings|charts)\//.test(name))archive.remove(name);buffer=await archive.generateAsync({type:'uint8array'});}
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer,{ignoreNodes:['drawing','picture']});const headers={},ignored=[];
 const cell=value=>{if(value==null)return '';if(typeof value==='object'){if(Object.hasOwn(value,'result'))return cell(value.result);if(value.richText)return value.richText.map(item=>item.text).join('');throw Error('A spreadsheet formula has no saved result. Save calculated values and retry.');}return String(value).trim();};
 const norm=value=>cell(value).replace(/\s+/g,' ').toUpperCase();
 for(const sheet of workbook.worksheets){
  if(sheet.rowCount>500||sheet.columnCount>30)throw Error('Unsupported or oversized class-strength worksheet.');
  const first=sheet.getRow(1),names=Array.from({length:sheet.columnCount},(_,i)=>norm(first.getCell(i+1).value)),required=['CLASS','TOTAL STUDENTS','CAT-V STUDENTS','TOTAL ST STUDENTS'];
  if(!required.every(name=>names.includes(name)))continue;if(required.some(name=>names.filter(v=>v===name).length!==1))throw Error('Duplicate class-strength columns.');
  const columns=required.map(name=>names.indexOf(name)+1);
  sheet.eachRow((row,index)=>{if(index===1)return;const key=norm(row.getCell(columns[0]).value);if(!key||key.startsWith('TOTAL')||key==='GRAND TOTAL')return;
   if(/^(VI|VII|VIII) [A-E]$/.test(key)){ignored.push(key);return;}
   if(!TASK_CLASSES.includes(key))throw Error('Unknown task class in workbook: '+key+'. Use XI E, not X E.');if(Object.hasOwn(headers,key))throw Error('Duplicate class in workbook: '+key);
   const values=columns.slice(1).map(column=>{const value=cell(row.getCell(column).value);if(value==='')return null;if(!/^\d+$/.test(value))throw Error(key+': counts must be whole numbers or blank.');return Number(value);});
   headers[key]=taskHeader({total:values[0],catV:values[1],st:values[2]});
  });
 }
 const missing=TASK_CLASSES.filter(c=>!Object.hasOwn(headers,c));if(missing.length)throw Error('Workbook is missing task classes: '+missing.join(', '));return {headers,assignments:{},ignored};
}
