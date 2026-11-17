import {presentationData,presentationFields} from './cbse-task-presentation.js';
import {taskClasses,taskCompatibleValues} from './cbse-task-manager-model.js';
import {RESULT_SESSIONS,resultComparisonRows} from './cbse-task-result-comparison.js';

// Principal-only download; values are literal Excel cells, never formulas.
export function buildTaskWorkbook(ExcelJS,task){
 const workbook=new ExcelJS.Workbook(),config=task.published||task.draft;
 workbook.creator='Vidyalaya One';
 for(const grade of ['IX','X','XI','XII']){
  const classes=taskClasses(config).filter(c=>c.split(' ')[0]===grade),sheet=workbook.addWorksheet(grade);
  sheet.addRow([config.title]);sheet.addRow(['Class '+grade,task.published?'Published questionnaire':'Saved private draft questionnaire']);
  sheet.addRow(['Percentages match the presentation: Passed / appeared; other student counts / covered enrolment. Meetings and written answers have no percentage.']);
  sheet.addRow(['Question','Question / description',...classes,'Total answer','Denominator','Percentage','Basis / missing data']);
  const header=sheet.rowCount;
  if(!classes.length)sheet.addRow(['','No sections selected for this class.']);
  for(const q of classes.length?presentationFields(config):[]){
   const point=presentationData(task,{},'',[q.id],{classes}).sections[0].points[0];
   const values=classes.map(c=>q.header?config.headers?.[c]?.[q.id]:task.reports?.[c]?taskCompatibleValues(task.reports[c],config)[q.id]:undefined);
   const missing=classes.filter((c,i)=>values[i]==null||values[i]==='');
   const percentage=point.base>0?point.total/point.base:null;
   const row=sheet.addRow(['Q'+q.number,q.label,...values.map(v=>v==null||v===''?'Not provided':v),point.written?'Written answers by section':point.total??'Not provided',point.base??'Not applicable',percentage??'Not applicable',[point.basis,point.note,missing.length?'Missing: '+missing.join(', '):''].filter(Boolean).join(' · ')]);
   if(percentage!==null)row.getCell(classes.length+5).numFmt=q.id==='passed'?'0.00%':'0.0%';
  }
  if(classes.length){sheet.addRow([]);sheet.addRow(['','Overall remarks',...classes.map(c=>task.reports?.[c]?.values?.remarks||'Not provided')]);}
  sheet.addRow([]);sheet.addRow(['Three-year comparative results — Overall',...RESULT_SESSIONS]);
  for(const result of resultComparisonRows([grade]))sheet.addRow([result.grade,...result.values]);
  sheet.views=[{state:'frozen',ySplit:header,xSplit:2}];
  sheet.autoFilter={from:{row:header,column:1},to:{row:header,column:classes.length+6}};
  sheet.columns.forEach((column,i)=>column.width=i===1?65:i===classes.length+5?65:i===0?12:24);
  sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});
  sheet.getRow(header).font={bold:true,color:{argb:'FFFFFFFF'}};
  sheet.getRow(header).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176554'}};
  sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:'+header};
 }
 return workbook;
}
