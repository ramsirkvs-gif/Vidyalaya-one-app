export const clone = value => JSON.parse(JSON.stringify(value));
export const entries = value => Object.entries(value || {});
export const key = label => String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'item';
export function uniqueKey(label, records) { let id = key(label), n = 2; while (records?.[id]) id = `${key(label)}_${n++}`; return id; }
export function emptyDraft() {
  const data = { schemaVersion: 1, revision: 0, streams: { science: {name:'Science'}, commerce: {name:'Commerce'}, humanities: {name:'Humanities'} }, classes: {} };
  for (const [id, sections] of [['X','ABCD'],['XII','ABCDE']]) {
    data.classes[id] = {label:`Class ${id}`, sections:{}};
    for (const name of sections) data.classes[id].sections[name.toLowerCase()] = {name, stream:id==='X'?'':('AB'.includes(name)?'science':name==='C'?'commerce':'humanities'),subjects:{},students:{}};
  }
  return data;
}
function assert(condition, message) { if (!condition) throw Error(message); }
function text(value, limit=120) { return typeof value === 'string' && value.trim().length > 0 && value.length <= limit; }
function record(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function safeKeys(value) { return record(value) && Object.keys(value).every(id => /^[a-zA-Z0-9_-]{1,100}$/.test(id) && !['__proto__','constructor','prototype'].includes(id)); }
export function validateDraft(data) {
  assert(record(data) && data.schemaVersion===1, 'Unsupported data format. Use a CBSE backup or the supplied private import file.');
  assert(Number.isInteger(data.revision) && data.revision >= 0, 'Invalid data revision.');
  assert(!data.streams || safeKeys(data.streams), 'Invalid streams.');
  const streams=data.streams || {};
  const streamNames=new Set();
  for (const [,stream] of entries(streams)) { assert(text(stream.name,60), 'Enter a stream name (up to 60 characters).'); assert(!streamNames.has(stream.name.trim().toLowerCase()), 'Stream names must be unique.'); streamNames.add(stream.name.trim().toLowerCase()); }
  assert(record(data.classes) && Object.keys(data.classes).length===2 && data.classes.X && data.classes.XII,'Both Classes X and XII are required.');
  for (const [,group] of entries(data.classes)) {
    assert(text(group.label,60), 'Invalid class label.');
    assert(!group.sections || safeKeys(group.sections),'Invalid section data.');
    const names=new Set();
    for (const [,section] of entries(group.sections)) {
      assert(text(section.name,30),'Enter a section name (up to 30 characters).');
      assert(!names.has(section.name.trim().toLowerCase()), 'Section names must be unique within a class.'); names.add(section.name.trim().toLowerCase());
      assert(typeof section.stream==='string' && (!section.stream || streams[section.stream]),'Choose an existing stream.');
      assert(!section.subjects || safeKeys(section.subjects),'Invalid subjects.');
      assert(!section.students || safeKeys(section.students),'Invalid students.');
      const subjectNames=new Set(), rolls=new Set();
      for (const [,subject] of entries(section.subjects)) {
        assert(text(subject.name,80),'Enter a subject name (up to 80 characters).');
        assert(typeof subject.code==='string' && subject.code.length<=20,'Subject code must be at most 20 characters.');
        assert(!subjectNames.has(subject.name.trim().toLowerCase()),'Subject names must be unique within a section.'); subjectNames.add(subject.name.trim().toLowerCase());
      }
      for (const [,student] of entries(section.students)) {
        assert(text(student.name), 'Enter a student name (up to 120 characters).');
        assert(text(student.roll,30),'Enter a roll number (up to 30 characters).');
        assert(!rolls.has(student.roll.trim().toLowerCase()),'A student with this roll number already exists in this section.'); rolls.add(student.roll.trim().toLowerCase());
        assert(!student.subjects || safeKeys(student.subjects),'Invalid student subjects.');
        for (const [id,chosen] of entries(student.subjects)) assert(chosen===true && section.subjects?.[id], 'Student has an unknown subject.');
      }
    }
  }
  return data;
}
export function parseCSV(text) {
  const rows=[]; let row=[],field='',quoted=false,afterQuote=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"' && text[i+1]==='"') {field+='"';i++;} else if(c==='"') {quoted=false;afterQuote=true;} else field+=c; }
    else if(c==='"') {assert(!field && !afterQuote,'Invalid CSV quoting.');quoted=true;}
    else if(c===',' || c==='\n' || c==='\r') {
      row.push(field.trim());field='';afterQuote=false;
      if(c!==',') {if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    } else {assert(!afterQuote || /\s/.test(c),'Unexpected text after a quoted CSV field.'); if(!afterQuote)field+=c;}
  }
  assert(!quoted,'CSV contains an unclosed quoted field.');
  row.push(field.trim());if(row.some(Boolean))rows.push(row);
  assert(rows.length>1,'CSV has no student rows.');
  const header=rows.shift();
  assert(header.slice(0,3).join(',')==='SNo,RollNo,StudentName','Expected CSV columns: SNo, RollNo, StudentName, followed by subjects.');
  assert(header.slice(3).every(Boolean) && new Set(header.map(s=>s.toLowerCase())).size===header.length,'CSV has blank or duplicate column names.');
  const rolls=new Set();
  for(const [i,values] of rows.entries()) {assert(values.length===header.length,`CSV row ${i+2} has the wrong number of columns.`);assert(values[1]&&values[2],`CSV row ${i+2} needs a roll number and student name.`);assert(!rolls.has(values[1].toLowerCase()),`Duplicate roll number at CSV row ${i+2}.`);rolls.add(values[1].toLowerCase());}
  return {header,rows};
}
export function importCSVFiles(draft, files) {
  const result=clone(draft), summary=[];
  for(const file of files) {
    const match=/^Class_(X|XII)_Sec_([a-z0-9_-]+)_Students\.csv$/i.exec(file.name);
    assert(match,`Rename ${file.name} to Class_X_Sec_A_Students.csv (or the relevant class and section).`);
    const classId=match[1].toUpperCase(), name=match[2].toUpperCase(), sections=result.classes[classId].sections ||= {};
    const found=entries(sections).find(([,section])=>section.name.toUpperCase()===name);
    const sectionId=found?.[0] || uniqueKey(name,sections);
    const section=sections[sectionId] ||= {name,stream:classId==='XII'&&'AB'.includes(name)?'science':classId==='XII'&&name==='C'?'commerce':classId==='XII'&&['D','E'].includes(name)?'humanities':'',subjects:{},students:{}};
    // A deleted default stream is not silently recreated by an import.
    if(!result.streams?.[section.stream]) section.stream='';
    section.subjects ||= {};section.students ||= {};
    const {header,rows}=parseCSV(file.text), subjectIds=[];
    for(const label of header.slice(3)) {
      const existing=entries(section.subjects).find(([,subject])=>subject.name.toLowerCase()===label.toLowerCase());
      const id=existing?.[0] || uniqueKey(label,section.subjects);
      section.subjects[id] ||= {name:label,code:''};subjectIds.push(id);
    }
    let added=0,updated=0;
    for(const values of rows) {
      const found=entries(section.students).find(([,student])=>student.roll.toLowerCase()===values[1].toLowerCase());
      const id=found?.[0] || uniqueKey(`roll_${values[1]}`,section.students);
      const subjects={};subjectIds.forEach((sid,i)=>{if(!['','-'].includes(values[i+3]))subjects[sid]=true;});
      section.students[id]={roll:values[1],name:values[2],subjects};found?updated++:added++;
    }
    summary.push({classId,section:name,added,updated});
  }
  validateDraft(result);return {draft:result,summary};
}
export function buildPublic(draft, includeStudents=true) {
  validateDraft(draft);
  const output={schemaVersion:1,draftRevision:draft.revision,includesStudents:includeStudents,sections:{}};
  for(const [classId,group] of entries(draft.classes)) for(const [id,section] of entries(group.sections)) {
    const item={classId,section:section.name,stream:draft.streams?.[section.stream]?.name || '',count:entries(section.students).length};
    if(includeStudents) item.students=Object.fromEntries(entries(section.students).map(([sid,s])=>[sid,{name:s.name,roll:s.roll}]));
    output.sections[`${classId}_${id}`]=item;
  }
  return output;
}
export function moveStudent(data,classId,sourceId,targetId,studentId,student) {
  const sections=data.classes[classId].sections;
  const target=sections[targetId]; assert(target,'Choose a section.');target.students ||= {};
  const duplicate=entries(target.students).find(([id,s])=>s.roll.toLowerCase()===student.roll.trim().toLowerCase() && !(sourceId===targetId && id===studentId));
  assert(!duplicate,'A student with this roll number already exists in the destination section.');
  const id=sourceId===targetId&&studentId?studentId:uniqueKey(`roll_${student.roll}`,target.students);
  if(studentId) delete sections[sourceId].students[studentId];
  target.students[id]=student;
}
