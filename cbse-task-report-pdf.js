import {RETEST_TITLE,RETEST_HEADERS,RETEST_FIELDS} from './cbse-task-retest-model.js';
import {rollDateText} from './cbse-roll-call-time.js';

let library;
function pdfLibrary(){
 const load=path=>new Promise((resolve,reject)=>{
  const url=new URL(path,import.meta.url);
  url.search=new URL(import.meta.url).search;
  const script=document.createElement('script');
  script.src=url.href;script.onload=resolve;
  script.onerror=()=>{script.remove();reject(Error('The PDF download could not load. Try again.'));};
  document.head.append(script);
 });
 library||=(async()=>{
  if(!globalThis.jspdf?.jsPDF)await load('./vendor/retest-pdf/jspdf.umd.min.js');
  const {jsPDF}=globalThis.jspdf;
  if(!jsPDF.API.autoTable)await load('./vendor/retest-pdf/jspdf.plugin.autotable.min.js');
  if(!jsPDF.API.autoTable)throw Error('The PDF table exporter could not load.');
  return jsPDF;
 })().catch(error=>{library=null;throw error;});
 return library;
}

export async function downloadRetestPDF(rows,summary,instructions){
 const PDF=await pdfLibrary(),doc=new PDF({orientation:'landscape',unit:'mm',format:'a4'});
 const margin=10,width=doc.internal.pageSize.getWidth()-2*margin;
 doc.setProperties({title:'Task 4 — '+RETEST_TITLE});
 doc.setFont('helvetica','bold').setFontSize(15).setTextColor('#175849');
 doc.text('Task 4 — '+RETEST_TITLE,margin,14);
 doc.setFont('helvetica','normal').setFontSize(9).setTextColor('#173738');
 doc.text(summary,margin,20);
 const lines=instructions.flatMap(text=>doc.splitTextToSize(text,width-8));
 const alertHeight=10+lines.length*4;
 doc.setFillColor('#fff1ef').roundedRect(margin,24,width,alertHeight,2,2,'F');
 doc.setTextColor('#7c2628').setFont('helvetica','bold');
 doc.text('High alert',margin+4,29);
 doc.setFont('helvetica','normal');
 doc.text(lines,margin+4,34,{lineHeightFactor:1.26});
 const body=rows.map(({name,classLabel,roll,subject,examDate,...record})=>[
  name,classLabel,roll,subject,rollDateText(examDate),
  ...RETEST_FIELDS.map(([key,,type])=>{
   const value=record[key],text=type==='date'&&value?rollDateText(value):value||'—';
   return record[key+'Comment']?text+'\n'+record[key+'Comment']:text;
  }),
 ]);
 const weights=[12,6,6,9,8,10,10,9,8,6,6,10];
 doc.autoTable({
  startY:24+alertHeight+4,margin:{top:10,right:margin,bottom:12,left:margin},tableWidth:width,
  head:[[...RETEST_HEADERS,...RETEST_FIELDS.map(([,label])=>label)]],body,
  styles:{fontSize:8,cellPadding:1.8,valign:'top',overflow:'linebreak',textColor:'#173738'},
  headStyles:{fillColor:'#175849',textColor:'#ffffff'},
  alternateRowStyles:{fillColor:'#f1f7f4'},
  columnStyles:Object.fromEntries(weights.map((weight,index)=>[index,{cellWidth:width*weight/100}])),
  rowPageBreak:'avoid',
 });
 const pageCount=doc.getNumberOfPages();
 doc.setTextColor('#536a70').setFontSize(8);
 for(let page=1;page<=pageCount;page++){
  doc.setPage(page);
  doc.text(page+' / '+pageCount,width+margin,doc.internal.pageSize.getHeight()-6,{align:'right'});
 }
 doc.save('Task-4-Retest-Tracker.pdf');
}

export async function downloadPB1FreezePDF({groups,columns,updated,filter}){
 const PDF=await pdfLibrary(),doc=new PDF({orientation:'landscape',unit:'mm',format:'a4'});
 const title='PB-1 Marks and Freeze Report',margin=12;
 doc.setProperties({title});
 for(const [index,group] of groups.entries()){
  if(index)doc.addPage();
  doc.setFont('helvetica','bold').setFontSize(16).setTextColor('#175849');
  doc.text(title,margin,16);
  doc.setFontSize(12);
  doc.text('Class '+group.classId,margin,24);
  doc.setFont('helvetica','normal').setFontSize(9).setTextColor('#173738');
  doc.text(updated+'  |  '+filter,margin,30);
  doc.text(group.summary,margin,35);
  if(!group.rows.length){doc.text('No papers match this selection.',margin,44);continue;}
  doc.autoTable({
   startY:40,margin:{top:12,right:margin,bottom:12,left:margin},head:[columns],body:group.rows,
   styles:{fontSize:9,cellPadding:2,valign:'top',overflow:'linebreak',textColor:'#173738'},
   headStyles:{fillColor:'#175849',textColor:'#ffffff'},
   alternateRowStyles:{fillColor:'#f1f7f4'},rowPageBreak:'avoid',
  });
 }
 const pageCount=doc.getNumberOfPages();
 doc.setFontSize(8).setTextColor('#536a70');
 for(let page=1;page<=pageCount;page++){
  doc.setPage(page);
  doc.text(page+' / '+pageCount,doc.internal.pageSize.getWidth()-margin,doc.internal.pageSize.getHeight()-6,{align:'right'});
 }
 doc.save('PB-1-Marks-and-Freeze-Report.pdf');
}
