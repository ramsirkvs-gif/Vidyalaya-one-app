export function pb1ClassAnalysis(data,{classId,section='',includeAdditional=false}){
 const inScope=item=>item.classId===classId&&(!section||item.section===section);
 const students=new Map((data.roster||data.classRoster||[]).filter(inScope).map(student=>[student.key,{...student,papers:[]}]));
 for(const row of data.rows){
  const paper=data.scopes[row.scope];
  if(!inScope(paper)||(!includeAdditional&&paper.additional))continue;
  if(!students.has(row.key))students.set(row.key,{key:row.key,name:row.name,roll:row.roll,section:paper.section,papers:[]});
  students.get(row.key).papers.push({subject:paper.subject,mark:row.current});
 }
 const summary={enrolled:students.size,appearedAll:0,absentOne:0,absentMultiple:0,pending:0,unmapped:0,passedAll:0,failed:0};
 const failures=[];
 for(const student of students.values()){
  const {papers}=student;
  const appeared=papers.filter(({mark})=>Number.isFinite(mark?.percentage));
  const absent=papers.filter(({mark})=>mark?.absent).length;
  const pending=papers.length-appeared.length-absent;
  const failed=appeared.filter(({mark})=>mark.failed).sort((a,b)=>a.subject.localeCompare(b.subject));
  const completeAppearance=papers.length>0&&appeared.length===papers.length;
  if(!papers.length)summary.unmapped++;
  if(completeAppearance)summary.appearedAll++;
  if(absent===1)summary.absentOne++;
  if(absent>1)summary.absentMultiple++;
  if(pending)summary.pending++;
  if(completeAppearance&&!failed.length){
   summary.passedAll++;
  }
  if(failed.length){
   summary.failed++;
   failures.push({...student,failed});
  }
 }
 failures.sort((a,b)=>a.section.localeCompare(b.section)||String(a.roll??'').localeCompare(String(b.roll??''),undefined,{numeric:true})||a.name.localeCompare(b.name));
 return {...summary,failures};
}
