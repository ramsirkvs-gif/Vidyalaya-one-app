import {el} from './cbse-ui.js';
import {mcqPaperUsage,studentMCQParticipation,teacherMCQParticipation} from './cbse-mcq-participation.js';
const labels={critical:'CRITICAL FAIL',red:'FAIL',yellow:'BORDERLINE',green:'SECURE PASS',grey:'Not assessed'};
export function renderMCQProfileBadge(parent,mission,key){
 const tests=studentMCQParticipation(mission,key),details=el('details',undefined,'mcq-profile-participation'),summary=el('summary','MCQ tests attended · '+tests.length);details.append(summary);if(!tests.length)details.append(el('p','No saved MCQ evaluations yet.','muted'));else{const list=el('ul');for(const test of tests)list.append(el('li',test.paperId+' · '+test.score+' / '+test.maximum));details.append(list);}parent.append(details);
}
export function renderMCQPaperUsage(parent,{mission,draft,paperId,staff={}}){
 parent.replaceChildren();parent.className='mcq-paper-usage';const groups=mcqPaperUsage(mission,draft,paperId),total=groups.reduce((n,g)=>n+g.students.length,0),critical=groups.reduce((n,g)=>n+g.criticalCount,0);parent.append(el('h4','QP usage · students attended'),el('p',total+' '+(total===1?'student':'students')+' attended · Current critical cases: '+critical,'mcq-usage-total'),el('small','Based on saved evaluations. Academic badges show current status; each paper counts once per student.','muted'));
 if(!groups.length){parent.append(el('p','No saved evaluations for this paper yet.','muted'));return;}
 for(const group of groups){const block=el('details',undefined,'mcq-usage-group');block.open=true;block.append(el('summary','Used by Class '+group.classId+'-'+group.section+' · '+group.students.length+' attended · Current critical cases: '+group.criticalCount));const names=[...new Set(group.students.map(s=>s.evaluatedByName||staff[s.evaluatedBy]?.name||(s.evaluatedBy==='principal'?'Principal':'Not recorded')))];block.append(el('p','Evaluated by '+names.join(' · '),'muted'));const list=el('div',undefined,'mcq-attendee-list');for(const student of group.students){const row=el('div',undefined,'mcq-attendee'),link=el('a',student.name+' · Roll '+student.roll);link.href='#student='+encodeURIComponent(student.key);link.className='mcq-attendee-link';row.append(link,el('span',labels[student.academic]||'Not assessed','band '+student.academic),el('span','MCQ attended: '+student.testsAttended,'mcq-attended-badge'),el('span',student.score+' / '+student.maximum,'mcq-attendee-score'));list.append(row);}block.append(list);parent.append(block);}
}

export function renderTeacherMCQParticipation(parent,{mission,draft,teacherIds,onStudent}){
 const contribution=teacherMCQParticipation(mission,teacherIds),stamp=value=>value?new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' IST':'Date not recorded';
 parent.id='teacher-mcq-contribution';parent.append(el('h3','MCQ tests evaluated & reported'),el('p',contribution.paperCount+' question papers · '+contribution.evaluations+' student evaluations · '+contribution.studentCount+' distinct students','mcq-teacher-contribution-total'));
 if(!contribution.evaluations){parent.append(el('p','No saved MCQ evaluations are credited to this teacher yet.','muted'));return;}
 parent.append(el('p','Latest report: '+stamp(contribution.lastReportedAt),'muted'));
 for(const paper of contribution.papers){
  const details=el('details',undefined,'mcq-teacher-paper'),sections=draft.classes?.[paper.classId]?.sections||{},names=[...new Set(paper.students.map(s=>sections[s.key.split(':')[1]]?.name||s.key.split(':')[1]))],subject=Object.values(sections).map(s=>s.subjects?.[paper.subjectId]?.name).find(Boolean)||paper.subjectId;
  details.append(el('summary',paper.paperId+' · Class '+paper.classId+' · '+subject+' · '+paper.students.length+' students'),el('p','Sections: '+names.join(', ')+' · Last reported: '+stamp(paper.reportedAt),'muted'));
  const list=el('ul');for(const result of paper.students){const [,sid,id]=result.key.split(':'),student=sections[sid]?.students?.[id],row=el('li'),link=el('button',student?student.name+' · '+paper.classId+'-'+(sections[sid]?.name||sid)+' · Roll '+student.roll:'Former student');link.type='button';link.disabled=!student;link.onclick=()=>onStudent(result.key);row.append(link,el('span',' '+result.score+' / '+result.maximum+' · '+stamp(result.reportedAt)));list.append(row);}details.append(list);parent.append(details);
 }
}
