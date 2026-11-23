const xml=value=>String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
function paragraph(text,{size=22,bold=false,center=false,after=140,keepNext=false}={}){
 return `<w:p><w:pPr>${keepNext?'<w:keepNext/>':''}<w:spacing w:after="${after}"/>${center?'<w:jc w:val="center"/>':''}</w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

const mainType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
const footerType='application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml';
const wordNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const relationshipNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageNS='http://schemas.openxmlformats.org/package/2006/relationships';
const linesOf=text=>text.split(/\r?\n/).filter(line=>line.trim());

export async function buildAdvisoryDocx(JSZip,{teacher,date,instructions,cases}){
 const packageFile=new JSZip();
 packageFile.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="${mainType}"/><Override PartName="/word/footer1.xml" ContentType="${footerType}"/></Types>`);
 packageFile.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${packageNS}"><Relationship Id="rId1" Type="${relationshipNS}/officeDocument" Target="word/document.xml"/></Relationships>`);
 packageFile.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${packageNS}"><Relationship Id="rId1" Type="${relationshipNS}/footer" Target="footer1.xml"/></Relationships>`);
 packageFile.file('word/footer1.xml',`<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="${wordNS}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">Page </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t xml:space="preserve"> of </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`);
 const lines=[
  paragraph('PM SHRI Kendriya Vidyalaya No. 1, Itanagar',{bold:true,center:true,size:26}),
  paragraph('Preventive Advisory Letter',{bold:true,center:true,size:32,after:240}),
  paragraph('Date '+date),
  paragraph('To '+teacher.name+(teacher.designation?' · '+teacher.designation:''),{bold:true}),
  paragraph('PB-1 student-wise support and follow-up',{bold:true}),
  ...linesOf(instructions).map(line=>paragraph(line))
 ];
 cases.forEach(({student,subjects},index)=>{
  lines.push(paragraph((index+1)+'. '+student.name+' · '+student.section+(student.roll?' · Roll '+student.roll:''),{bold:true,size:25,keepNext:true}));
  lines.push(paragraph('Mission Perfect 100 across all subjects · '+(student.remedialCount??0)+' verified remedial classes attended · '+(student.mcq?.length??0)+' evaluated MCQ papers'));
  if(student.issues?.[0]?.issues)lines.push(paragraph('Brief issues noted by CT / Co-CT · '+student.issues[0].issues));
  for(const {item,assessmentLines,advisory} of subjects){
   lines.push(paragraph(item.subject+' · PB-1 written marks '+item.score+'/'+item.maximum,{bold:true,keepNext:true}));
   lines.push(paragraph('In this subject · '+(item.remedialCount??0)+' verified remedial classes attended · '+(item.mcqCount??0)+' evaluated MCQ papers'));
   if(assessmentLines.length)lines.push(paragraph('Assessment history · '+assessmentLines.join(' | ')));
   if(item.actions?.length){
    const latest=item.actions[0];
    for(const [label,value] of [['Brief issues about the student',latest.issues],['Efforts made so far',latest.taken],['Mission Perfect 100 action plan',latest.plan],['Progress',latest.progress],
     ['Review date',latest.review?.split('-').reverse().join('/')]])if(value)lines.push(paragraph(label+' · '+value));
   }
   if(advisory?.instructions&&advisory.instructions!==instructions)lines.push(...linesOf(advisory.instructions).map(line=>paragraph(line)));
   if(advisory?.additional)lines.push(...linesOf(advisory.additional).map(line=>paragraph(line)));
  }
 });
 lines.push(paragraph('Principal',{bold:true,after:0}));
 packageFile.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${wordNS}" xmlns:r="${relationshipNS}"><w:body>`+
  lines.join('')+'<w:sectPr><w:footerReference w:type="default" r:id="rId1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1134" w:bottom="1134" w:left="1134" w:footer="570"/></w:sectPr></w:body></w:document>');
 return packageFile.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
