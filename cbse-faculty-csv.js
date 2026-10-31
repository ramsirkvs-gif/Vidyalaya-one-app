import {clone,entries,uniqueKey} from './cbse-model.js';
import {validateFaculty,clearTeacherRoles} from './cbse-faculty-model.js';
export const FACULTY_CSV_HEADERS=['FacultyID','Class','Name','Designation','Subjects','TeachingSections','Status','ClassTeacherOf','CoClassTeacherOf'];
const assert=(ok,message)=>{if(!ok)throw Error(message);};
function readRows(text){
 const rows=[];let row=[],field='',quoted=false,closed=false;text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else field+=c;}
  else if(c==='"'){assert(!field&&!closed,'Invalid CSV quoting.');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(field.trim());field='';closed=false;if(c!==','){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}
  else{assert(!closed||/\s/.test(c),'Unexpected text after quoted CSV field.');if(!closed)field+=c;}
 }
 assert(!quoted,'CSV contains an unclosed quoted field.');row.push(field.trim());if(row.some(Boolean))rows.push(row);return rows;
}
const restored=value=>/^'[=+\-@]/.test(value)?value.slice(1):value;
function encode(value){let text=String(value??'');if(/^[=+\-@]/.test(text))text="'"+text;return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;}
export function exportFacultyCSV(value,studentClasses){
 validateFaculty(value);const rows=[FACULTY_CSV_HEADERS];
 for(const cl of ['X','XII'])for(const[id,t]of entries(value.classes[cl].teachers)){
  const assigned=field=>entries(value.classes[cl].roles).filter(([,r])=>r[field]===id).map(([sid])=>studentClasses[cl]?.sections?.[sid]?.name).filter(Boolean).join(';');
  rows.push([id,cl,t.name,t.designation,t.subjects,t.teachingSections,t.status,assigned('classTeacher'),assigned('coClassTeacher')]);
 }
 return '\uFEFF'+rows.map(row=>row.map(encode).join(',')).join('\r\n')+'\r\n';
}
export function importFacultyCSV(value,text,studentClasses){
 const rows=readRows(text);assert(rows.length>1,'The CSV contains no faculty records.');
 const header=rows.shift();assert(header.join(',')===FACULTY_CSV_HEADERS.join(','),`Use these CSV columns in this order: ${FACULTY_CSV_HEADERS.join(', ')}`);
 const result=clone(value),summary={X:{added:0,updated:0},XII:{added:0,updated:0}},incoming=[],seen=new Set();
 for(const[index,values]of rows.entries()){
  const line=index+2;assert(values.length===header.length,`CSV row ${line} has the wrong number of columns.`);
  const [sourceId,classValue,name,designation,subjects,teachingSections,statusValue,lead,co]=values.map(restored);
  const cl=classValue.replace(/^class\s+/i,'').toUpperCase();assert(['X','XII'].includes(cl),`CSV row ${line}: Class must be X or XII.`);
  assert(!sourceId||/^[a-zA-Z0-9_-]{1,100}$/.test(sourceId)&&!['constructor','prototype','__proto__'].includes(sourceId),`CSV row ${line}: invalid FacultyID.`);
  const area=result.classes[cl];area.teachers||={};area.roles||={};
  const existing=sourceId&&area.teachers[sourceId]?sourceId:entries(area.teachers).find(([,t])=>t.name.toLowerCase()===name.toLowerCase()&&t.designation.toLowerCase()===designation.toLowerCase())?.[0];
  const id=existing||sourceId||uniqueKey(name,area.teachers),identity=`${cl}:${id}`;
  assert(!seen.has(identity),`CSV row ${line}: duplicate faculty record.`);seen.add(identity);
  area.teachers[id]={name,designation,subjects,teachingSections,status:(statusValue||'active').toLowerCase()};
  existing?summary[cl].updated++:summary[cl].added++;
  incoming.push({cl,id,lead,co,line});
 }
 // Clear only the imported teachers' primary roles before applying the CSV's
 // requested assignments. Unlisted faculty and all custom roles are retained.
 for(const{cl,id}of incoming){
  const area=result.classes[cl];for(const[,r]of entries(area.roles)){if(r.classTeacher===id)r.classTeacher='';if(r.coClassTeacher===id)r.coClassTeacher='';}
  if(area.teachers[id].status==='inactive')clearTeacherRoles(area,id);
 }
 for(const{cl,id,lead,co,line}of incoming){
  const area=result.classes[cl];
  for(const[field,cell]of [['classTeacher',lead],['coClassTeacher',co]])for(const name of cell.split(';').map(s=>s.trim()).filter(Boolean)){
   const sid=entries(studentClasses[cl]?.sections).find(([,s])=>s.name.toLowerCase()===name.toLowerCase())?.[0];assert(sid,`CSV row ${line}: section ${name} does not exist in Class ${cl}.`);
   area.roles[sid]||={classTeacher:'',coClassTeacher:''};
   assert(!area.roles[sid][field]||!incoming.some(r=>r.cl===cl&&r.id===area.roles[sid][field]),`CSV row ${line}: more than one faculty member is assigned the same section role.`);
   area.roles[sid][field]=id;
  }
 }
 validateFaculty(result);return {data:result,summary};
}
