export const MONITORING_TITLE='Task 2 — Pre-Samagam Evaluation Monitoring';
export const MONITORING_SHEETS=[
 {name:'Evaluation Plan',rows:109,columns:8},
 {name:'Workload Summary',rows:42,columns:6},
];

export function validateMonitoringSheets(sheets){
 if(!Array.isArray(sheets)||sheets.length!==MONITORING_SHEETS.length)throw Error('Choose the Pre-Samagam workbook with both worksheets.');
 return MONITORING_SHEETS.map(({rows,columns},index)=>{
  const sheet=sheets[index];
  if(!Array.isArray(sheet)||sheet.length!==rows)throw Error('The monitoring worksheet has an unexpected number of rows.');
  return sheet.map(row=>{
   if(!Array.isArray(row)||row.length!==columns||row.some(cell=>typeof cell!=='string'||cell.length>500))throw Error('Use text or formulas up to 500 characters per cell.');
   return row;
  });
 });
}

export function monitoringFormula(formula,sheets,sheetIndex){
 const match=/^=(COUNTA|COUNTIF|SUM)\((?:'([^']+)'!)?(\$?[A-H]\$?\d+):(\$?[A-H]\$?\d+)(?:,\s*(.+))?\)$/i.exec(formula);
 if(!match)return '';
 const [,operation,sheetName,start,end,criterion]=match;
 const source=sheetName?MONITORING_SHEETS.findIndex(({name})=>name===sheetName):sheetIndex;
 const coordinate=ref=>[Number(ref.replace(/\D/g,''))-1,ref.replace(/\$/g,'').toUpperCase().charCodeAt(0)-65];
 const [firstRow,firstColumn]=coordinate(start),[lastRow,lastColumn]=coordinate(end);
 if(!sheets[source]||firstRow<0||lastRow>=sheets[source].length||lastColumn>=MONITORING_SHEETS[source].columns)return '';
 const values=sheets[source].slice(firstRow,lastRow+1).flatMap(row=>row.slice(firstColumn,lastColumn+1));
 switch(operation.toUpperCase()){
  case 'COUNTA':return values.filter(value=>value!=='').length;
  case 'COUNTIF':{
   if(!criterion)return '';
   let target=criterion;
   if(/^"[^"]*"$/.test(target))target=target.slice(1,-1);
   else if(/^\$?[A-H]\$?\d+$/i.test(target)){
    const [row,column]=coordinate(target);
    target=sheets[sheetIndex][row]?.[column]??'';
   }
   target=target.toLowerCase();
   const wildcard=target.startsWith('*')&&target.endsWith('*');
   return values.filter(value=>wildcard?value.toLowerCase().includes(target.slice(1,-1)):value.toLowerCase()===target).length;
  }
  case 'SUM':return values.reduce((total,value)=>total+(Number(/^=COUNT(?:IF|A)\(/i.test(value)?monitoringFormula(value,sheets,source):value)||0),0);
 }
}
