import {presentationData,presentationFields} from './cbse-task-presentation.js';
import {taskClasses,taskCompatibleValues} from './cbse-task-manager-model.js';
import {RESULT_SESSIONS,resultComparisonRows} from './cbse-task-result-comparison.js';

// Principal-only download; values are literal Excel cells, never formulas.
export function buildTaskWorkbook(ExcelJS,task){
 const workbook=new ExcelJS.Workbook(),config=task.published||task.draft;
 workbook.creator='Vidyalaya One';
 for(const grade of ['IX','X','XI','XII']){
  const classes=taskClasses(config).filter(c=>c.split(' ')[0]===grade),sheet=workbook.addWorksheet(grade);
  sheet.columns=[{width:78},{width:62}];
  sheet.addRow(['Class '+grade+' — Survey Report']);sheet.mergeCells('A1:B1');
  sheet.getRow(1).font={bold:true,size:16};sheet.getRow(1).height=28;
  sheet.addRow([config.title]);sheet.mergeCells('A2:B2');sheet.getRow(2).height=46;
  sheet.addRow(['Question','Answer / %']);
  if(!classes.length)sheet.addRow(['Class '+grade,'No sections selected for this class.']);
  for(const q of classes.length?presentationFields(config):[]){
   const point=presentationData(task,{},'',[q.id],{classes}).sections[0].points[0];
   const values=classes.map(c=>q.header?config.headers?.[c]?.[q.id]:task.reports?.[c]?taskCompatibleValues(task.reports[c],config)[q.id]:undefined);
   const missing=classes.filter((c,i)=>values[i]==null||values[i]==='');
   let answer=point.written?classes.map((c,i)=>c+': '+(values[i]||'Not provided')).join('\n'):point.total===null?'Not provided':point.base>0?(100*point.total/point.base).toFixed(q.id==='passed'?2:1)+'% ('+point.total+' out of '+point.base+(q.id==='passed'?' appeared students)':' students)'):String(point.total);
   if(!point.written&&missing.length&&point.total!==null)answer+=' · Missing: '+missing.join(', ');
   sheet.addRow(['Q'+q.number+'. '+q.label,answer]);
  }
  if(classes.length)sheet.addRow(['Overall remarks',classes.map(c=>c+': '+(task.reports?.[c]?.values?.remarks||'Not provided')).join('\n')]);
  sheet.addRow(['Three-year comparative results — Overall','Result %']);
  for(const result of resultComparisonRows([grade]))RESULT_SESSIONS.forEach((year,i)=>sheet.addRow([year,result.values[i]]));
  sheet.eachRow(row=>{
   row.alignment={vertical:'top',wrapText:true};
   if(row.number>3){const lines=value=>String(value??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/65)),0);row.height=Math.min(409,Math.max(30,16*Math.max(lines(row.getCell(1).value),lines(row.getCell(2).value))+8));}
  });
  sheet.getRow(3).height=24;sheet.getRow(3).font={bold:true,color:{argb:'FFFFFFFF'}};
  sheet.getRow(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176554'}};
  sheet.views=[{state:'frozen',ySplit:3}];
  sheet.pageSetup={orientation:'portrait',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:3'};
 }
 return workbook;
}
