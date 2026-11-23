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

export async function downloadPB1HQVerificationPDF(verification,scope){
 const groups=scope?verification.groups.flatMap(group=>{
  const sections=group.sections.filter(paper=>paper.section===scope.classId+scope.section&&paper.paper===scope.paperName);
  return sections.length?[{...group,sections}]:[];
 }):verification.groups;
 if(!groups.length)throw Error('This paper is outside the HQ verification snapshot.');
 const PDF=await pdfLibrary(),doc=new PDF({orientation:'landscape',unit:'mm',format:'a4'});
 const margin=12,title='HQ/RO Analysis Verification',width=doc.internal.pageSize.getWidth()-2*margin;
 doc.setProperties({title});
 function heading(){
  doc.setFont('helvetica','bold').setFontSize(15).setTextColor('#175849');
  doc.text(title,margin,13);
  doc.setFont('helvetica','normal').setFontSize(9).setTextColor('#173738');
  doc.text('PB-1 written marks | PM SHRI Kendriya Vidyalaya No. 1 Itanagar | '+verification.updated,margin,19);
 }
 const columns=['Section / paper','App roster','Appeared','Absent','Passed','Failed','Pass %',
  '33-44.9%','45-59.9%','60-74.9%','75-89.9%','90-100%','Pending','Subject teacher signature'];
 const format=counts=>counts.map((value,index)=>index===5?(value===null?'--':(value*100).toFixed(1)+'%'):value);
 const pageBottom=doc.internal.pageSize.getHeight()-14;
 const signatureRowHeight=9;
 let y=27;
 heading();
 for(const group of groups){
  const blockHeight=26+group.sections.length*signatureRowHeight;
  if(y+blockHeight>pageBottom){
   doc.addPage();
   heading();
   y=27;
  }
  doc.setFont('helvetica','bold').setFontSize(10).setTextColor('#175849');
  doc.text(['Class '+group.classId,group.stream,group.subject].filter(Boolean).join(' / '),margin,y);
  const body=group.sections.map(paper=>[paper.section+' / '+paper.paper+'\n'+(paper.frozen?'Frozen':'Awaiting freeze'),...format(paper.counts),'']);
  body.push(['HQ '+(group.stream||'Class '+group.classId)+' subject total',...format(group.total),'']);
  doc.autoTable({startY:y+3,margin:{left:margin,right:margin,bottom:14},head:[columns],body,
   rowPageBreak:'avoid',
   styles:{fontSize:8,cellPadding:1.2,textColor:'#173738'},
   headStyles:{fillColor:'#175849',textColor:'#ffffff'},
   alternateRowStyles:{fillColor:'#f1f7f4'},
   columnStyles:{0:{cellWidth:52},[columns.length-1]:{cellWidth:39}},
   didParseCell(data){
    if(data.section!=='body')return;
    if(data.row.index===body.length-1)data.cell.styles.fontStyle='bold';
    else data.cell.styles.minCellHeight=signatureRowHeight;
   },
   didDrawCell({section,row,column,cell}){
    if(section!=='body'||row.index===body.length-1||column.index!==columns.length-1)return;
    const y=cell.y+cell.height-3;
    doc.setDrawColor('#728982').setLineWidth(.2);
    doc.line(cell.x+3,y,cell.x+cell.width-3,y);
   },
  });
  y=doc.lastAutoTable.finalY+8;
 }
 if(y+5>pageBottom){
  doc.addPage();
  heading();
  y=27;
 }
 const classes=[...new Set(groups.map(group=>group.classId))].join(' and ');
 doc.setFont('helvetica','normal').setFontSize(8).setTextColor('#536a70');
 doc.text('Consolidated result | Class '+classes+' | Pending LOC reconciliation and final marks',margin,y);
 const pages=doc.getNumberOfPages();
 for(let page=1;page<=pages;page++){
  doc.setPage(page);
  doc.setFontSize(8).setTextColor('#536a70');
  doc.text(page+' / '+pages,margin+width,doc.internal.pageSize.getHeight()-7,{align:'right'});
 }
 const suffix=scope?'-'+[scope.classId+scope.section,scope.paperName].join('-').replace(/[^a-z0-9-]+/gi,'-'):'-X-XII';
 doc.save('HQ-RO-Analysis-Verification'+suffix+'.pdf');
}
