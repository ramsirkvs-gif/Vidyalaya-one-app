export const MONITORING_TITLE='Task 2 — Pre-Samagam Evaluation Monitoring';
export const MONITORING_SHEETS=[
 {name:'Evaluation Plan',rows:109,columns:8},
 {name:'Workload Summary',rows:42,columns:6},
];

export const MONITORING_LIMITS={rows:160,columns:12};

export function validateMonitoringSheets(sheets){
 if(!Array.isArray(sheets)||sheets.length!==MONITORING_SHEETS.length)throw Error('Choose the Pre-Samagam workbook with both worksheets.');
 return MONITORING_SHEETS.map(({rows,columns},index)=>{
  const sheet=sheets[index],width=Array.isArray(sheet)?sheet[0]?.length:0;
  if(!Array.isArray(sheet)||sheet.length<rows||sheet.length>MONITORING_LIMITS.rows||width<columns||width>MONITORING_LIMITS.columns)throw Error('The monitoring worksheet has an unexpected number of rows.');
  return sheet.map(row=>{
   if(!Array.isArray(row)||row.length!==width||row.some(cell=>typeof cell!=='string'||cell.length>500))throw Error('Use text or formulas up to 500 characters per cell.');
   return row;
  });
 });
}

export function monitoringFormula(formula,sheets,sheetIndex,seen=new Set()){
 const match=/^=(COUNTA|COUNTIF|SUM)\((?:'([^']+)'!)?(\$?[A-L]\$?\d+):(\$?[A-L]\$?\d+)(?:,\s*(.+))?\)$/i.exec(formula);
 if(!match)return '';
 const [,operation,sheetName,start,end,criterion]=match;
 const source=sheetName?MONITORING_SHEETS.findIndex(({name})=>name===sheetName):sheetIndex;
 const coordinate=ref=>[Number(ref.replace(/\D/g,''))-1,ref.replace(/\$/g,'').toUpperCase().charCodeAt(0)-65];
 const [firstRow,firstColumn]=coordinate(start),[lastRow,lastColumn]=coordinate(end);
 if(!sheets[source]||firstRow<0||lastRow>=sheets[source].length||lastColumn>=sheets[source][0].length||firstRow>lastRow||firstColumn>lastColumn)return '';
 const values=sheets[source].slice(firstRow,lastRow+1).flatMap(row=>row.slice(firstColumn,lastColumn+1));
 switch(operation.toUpperCase()){
  case 'COUNTA':return values.filter(value=>value!=='').length;
  case 'COUNTIF':{
   if(!criterion)return '';
   let target=criterion;
   if(/^"[^"]*"$/.test(target))target=target.slice(1,-1);
   else if(/^\$?[A-L]\$?\d+$/i.test(target)){
    const [row,column]=coordinate(target);
    target=sheets[sheetIndex][row]?.[column]??'';
   }
   target=target.toLowerCase();
   const wildcard=target.startsWith('*')&&target.endsWith('*');
   return values.filter(value=>wildcard?value.toLowerCase().includes(target.slice(1,-1)):value.toLowerCase()===target).length;
  }
  case 'SUM':{
   if(seen.size>=2)return '';
   let total=0;
   for(let r=firstRow;r<=lastRow;r++)for(let c=firstColumn;c<=lastColumn;c++){
    const key=source+':'+r+':'+c,value=sheets[source][r][c];
    if(seen.has(key))continue;
    total+=Number(value.startsWith('=')?monitoringFormula(value,sheets,source,new Set([...seen,key])):value)||0;
   }
   return total;
  }
 }
}
