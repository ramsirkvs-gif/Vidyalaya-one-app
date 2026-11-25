import {PREBOARD1_PAPERS} from './cbse-preboard1-datesheet.js';

const hqSubjects={
 X:{184:'English','002':'Hindi',241:'Maths','041':'Maths','086':'Science','087':'Social Science',417:'AI'},
 XII:{301:'English',302:'Hindi','041':'Maths','042':'Physics','043':'Chemistry','044':'Biology',
  '083':'Computer Science','065':'IP','055':'Accountancy','054':'Business Studies','030':'Economics',
  '027':'History','029':'Geography','028':'Political Science','843':'AI'}
};
const scheduledCodes=new Map(PREBOARD1_PAPERS.map(paper=>[paper.classId+'|'+paper.name,paper.codes[0]]));

export function buildPB1HQMarksWorkbook(ExcelJS,{scopes,rows},timestamp){
 const workbook=new ExcelJS.Workbook();
 workbook.creator='Vidyalaya One';
 const info=workbook.addWorksheet('About this export');
 info.columns=[{width:24},{width:95}];
 info.addRows([
  ['Exported (IST)',timestamp],
  ['Source','Vidyalaya app PB-1 written marks for Classes X and XII'],
  ['Coverage','App subject rosters for the named HQ subjects, including pending entries and absences.'],
  ['LOC','Reconcile the student and subject rows against the official LOC before reporting.'],
  ['Marks','Samagam final papers use the imported official marks. Frozen papers use locally approved marks.'],
  ['Consolidated rule','Use each student’s five main subjects. Exclude AI from the consolidated result.'],
  ['Maths','Class X Basic and Standard share the HQ Maths label and retain their original paper and subject code.']
 ]);
 const headers=['Section','Roll number','Student name','HQ subject','App subject','PB-1 paper','Subject code','Exam date',
  'Written mark','Recorded maximum','Expected maximum','Mark status','Paper approval'];
 const widths=[11,15,32,22,25,25,14,14,15,19,19,30,22];
 const sheets={};
 for(const classId of ['X','XII']){
  const sheet=workbook.addWorksheet('Class '+classId,{views:[{state:'frozen',ySplit:1}]});
  sheets[classId]=sheet;
  sheet.columns=widths.map(width=>({width}));
  const header=sheet.addRow(headers);
  header.font={bold:true,color:{argb:'FFFFFFFF'}};
  header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176554'}};
 }
 for(const row of rows){
  const paper=scopes[row.scope],code=scheduledCodes.get(paper.classId+'|'+paper.paperName);
  const subject=hqSubjects[paper.classId]?.[code];
  if(!subject)continue;
  const mark=row.current;
  const status=!mark?'Pending':mark.maximum!==paper.maximum?(mark.absent?'Absent · check maximum':'Check paper maximum'):
   mark.absent?'Absent':'Recorded';
  const date=paper.date?paper.date.split('-').reverse().join('/'):'';
  sheets[paper.classId].addRow([paper.classId+paper.section,String(row.roll??''),row.name,subject,paper.subject,paper.paperName,
   code,date,mark?.score??null,mark?.maximum??null,paper.maximum,status,paper.samagamFinal?'Samagam final':paper.approvedAt?'Frozen':'Awaiting freeze']);
 }
 for(const sheet of Object.values(sheets)){
  sheet.autoFilter={from:'A1',to:{row:sheet.rowCount,column:headers.length}};
 }
 return workbook;
}
