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

export async function downloadTeacherAdvisoryPDF({date,instructions,cases}){
 const PDF=await pdfLibrary(),doc=new PDF({unit:'mm',format:'a4'});
 const title='Preventive Advisory Letter',margin=16,width=doc.internal.pageSize.getWidth()-2*margin;
 const bottom=doc.internal.pageSize.getHeight()-18;
 const logos=await Promise.all(['portal-original-kvs-logo.png','portal-original-pm-shri-logo.png'].map(async file=>{
  const response=await fetch(new URL('./'+file,import.meta.url));
  if(!response.ok)throw Error('The school letterhead could not load. Try downloading again.');
  return new Uint8Array(await response.arrayBuffer());
 }));
 doc.setProperties({title});
 const center=margin+width/2;
 for(const [i,image] of logos.entries()){
  const {width:w,height:h}=doc.getImageProperties(image),scale=24/Math.max(w,h);
  doc.addImage(image,'PNG',(i?margin+width-12:margin+12)-w*scale/2,23-h*scale/2,w*scale,h*scale);
 }
 // Draw the Hindi line with the browser's shaping engine, as on the Staff Meetings letterhead.
 const canvas=document.createElement('canvas');
 canvas.width=1100;canvas.height=70;
 const ctx=canvas.getContext('2d');
 ctx.font='bold 44px "Noto Sans Devanagari", Mangal, sans-serif';
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#182f37';
 ctx.fillText('पीएमश्री केन्द्रीय विद्यालय क्रमांक–1, ईटानगर',550,36,1060);
 doc.addImage(canvas.toDataURL('image/png'),'PNG',center-61,12,122,7.76);
 doc.setFont('helvetica','bold').setFontSize(11).setTextColor('#182f37');
 doc.text('PM SHRI Kendriya Vidyalaya No. 1 Itanagar',center,24,{align:'center'});
 doc.setFontSize(17);
 doc.text(title,center,33,{align:'center'});
 doc.setDrawColor('#a9bdb2').line(margin,39,margin+width,39);
 let y=48;
 function ensure(height){
  if(y+height<=bottom)return;
  doc.addPage();
  y=19;
 }
 function write(text,{bold=false,size=10,gap=2}={}){
  doc.setFont('helvetica',bold?'bold':'normal').setFontSize(size).setTextColor('#182f37');
  const lineHeight=size*.43;
  for(const paragraph of String(text).split(/\r?\n/)){
   if(!paragraph.trim())continue;
   if(/[^\u0000-\u024f\u2000-\u206f]/.test(paragraph)){
    // Keep multilingual student notes readable without relying on PDF fonts for shaping.
    ctx.font=(bold?'bold ':'')+Math.round(size*4)+'px "Noto Sans Devanagari", Mangal, sans-serif';
    const rows=[];
    let line='';
    for(const word of paragraph.trim().split(/\s+/)){
     if(line&&ctx.measureText(line+' '+word).width>1060){rows.push(line);line='';}
     line+=(line?' ':'')+word;
    }
    if(line)rows.push(line);
    for(const row of rows){
     ensure(lineHeight);
     ctx.clearRect(0,0,canvas.width,canvas.height);ctx.textAlign='left';
     ctx.fillText(row,0,36,1060);
     doc.addImage(canvas.toDataURL('image/png'),'PNG',margin,y-3,width,lineHeight+1);
     y+=lineHeight;
    }
   }else{
    for(const line of doc.splitTextToSize(paragraph,width)){
     ensure(lineHeight);
     doc.text(line,margin,y);
     y+=lineHeight;
    }
   }
   y+=gap;
  }
 }
 write('Date '+date);
 write('To the Subject Teacher',{bold:true});
 write('PB-1 student-wise support and follow-up',{bold:true,size:11});
 write(instructions);
 const sharedLines=new Set(instructions.split(/\r?\n/).map(line=>line.trim()).filter(Boolean));
 for(const [i,{student,subjects}] of cases.entries()){
  ensure(22);
  y+=3;
  write((i+1)+'. '+[student.name,student.section,student.roll?'Roll '+student.roll:''].filter(Boolean).join(' | '),{bold:true,size:12});
  write('Mission Perfect 100 | '+(student.remedialCount??0)+' verified remedial classes attended | '+(student.mcq?.length??0)+' evaluated MCQ papers');
  for(const {item,assessmentLines,advisory} of subjects){
   ensure(13);
   write(item.subject+' | PB-1 written marks '+item.score+'/'+item.maximum,{bold:true});
   write('In this subject | '+(item.remedialCount??0)+' verified remedial classes attended | '+(item.mcqCount??0)+' evaluated MCQ papers');
   if(assessmentLines.length)write('Assessment history | '+assessmentLines.join(' | '));
   const specific=[advisory?.instructions,advisory?.additional].filter(Boolean).flatMap(text=>text.split(/\r?\n/))
    .map(line=>line.trim()).filter(line=>line&&!sharedLines.has(line));
   if(specific.length){
    ensure(10);
    write('Student-specific instructions',{bold:true});
    write([...new Set(specific)].join('\n'));
   }
  }
 }
 ensure(14);
 y+=5;
 write('Principal',{bold:true});
 ensure(28);
 y+=5;
 write('Student-wise teacher response',{bold:true,size:13});
 const response=(label,value)=>{
  ensure(11);
  write(label,{bold:true,gap:1});
  if(value)write(value);
  else{
   doc.setDrawColor('#87999b').line(margin,y+3,margin+width,y+3);
   y+=8;
  }
 };
 for(const [i,{student,subjects}] of cases.entries()){
  ensure(20);
  y+=3;
  write((i+1)+'. '+[student.name,student.section,student.roll?'Roll '+student.roll:''].filter(Boolean).join(' | '),{bold:true,size:11});
  response('1. Brief issues about the student (CT / Co-CT)',student.issues?.find(entry=>entry.issues)?.issues);
  for(const {item} of subjects){
   ensure(16);
   write(item.subject,{bold:true});
   const actions=item.actions||[];
   response('2. Efforts made so far',actions.find(entry=>entry.taken)?.taken);
   response('3. Mission Perfect 100 action plan',actions.find(entry=>entry.plan)?.plan);
   const progress=actions.find(entry=>entry.progress)?.progress,review=actions.find(entry=>entry.review)?.review;
   if(progress)write('Progress | '+progress);
   if(review)write('Review date | '+rollDateText(review));
  }
 }
 ensure(20);
 y+=9;
 write('Subject teacher signature ______________________________    Date ______________',{bold:true});
 const pages=doc.getNumberOfPages();
 doc.setFont('helvetica','normal').setFontSize(8);
 for(let page=1;page<=pages;page++){
  doc.setPage(page);
  doc.text('Page '+page+' of '+pages,center,bottom+8,{align:'center'});
 }
 doc.save('Preventive-Advisory-Letter.pdf');
}
