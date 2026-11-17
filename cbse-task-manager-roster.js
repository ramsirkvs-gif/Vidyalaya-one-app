import {taskQuestions} from './cbse-task-manager-model.js';
export const TASK1_TITLE='Vidyalaya Level Confidential Survey by Prime Mentor Teachers Regarding Low Academic Performance and Social-Psychological Aspects of Naharlagun (Itanagar, Arunachal Pradesh)';
// Public mentor/support list explicitly supplied by the Principal in prompt file.docx.
// Support is informational; it does not grant report submission permissions.
export const TASK1_ROSTER=[
 ['IX A','Mr. Abhishek Singh','', ['ABHISHEK SINGH']],
 ['IX B','Mrs. Jyoti Verma','', ['JYOTI VERMA']],
 ['IX C','Ms. Dipti','Mr. Nitish Raj Sharma',['DIPTI','DIPTI SINGH']],
 ['IX D','Mrs. Sweta Kestwal','',['SWETA KESTWAL']],
 ['X A','Mr. Gaurav','',['GAURAV','GAURAV SINGH']],
 ['X B','Mr. BL Meena','Ms. Monika',['BL MEENA','BHARAT LAL MEENA','BHARATLAL MEENA']],
 ['X C','Mrs. Priyanaka M.','Ms. Vanadana',['PRIYANAKA M','PRIYANKA MEHTA']],
 ['X D','Ms. Monika','',['MONIKA','MONIKA YADAV']],
 ['XI A','Ms. Ganga Devi L.','Mrs. Pragnya P.',['GANGA DEVI L','L GANGA DEVI','LAISHRAM GANGA DEVI']],
 ['XI B','Ms. Ganga Devi L.','Mrs. Pragnya P.',['GANGA DEVI L','L GANGA DEVI','LAISHRAM GANGA DEVI']],
 ['XI C','Ms. Techi Y.','Mr. Sunil Kumar',['TECHI Y','TECHI YAZAR']],
 ['XI D','Mr. Lenjing Gete','Mr. Parth B.',['LENJING GETE']],
 ['XI E','Mr. Lenjing Gete','Mr. Parth B.',['LENJING GETE']],
 ['XII A','Mr. Sushil Kumar','',['SUSHIL KUMAR']],
 ['XII B','Mrs. Pragnya P.','',['PRAGNYA P','PRAGNYA PRIYAMBADA']],
 ['XII C','Ms. Techi Y.','Mrs. ET Zirdo',['TECHI Y','TECHI YAZAR']],
 ['XII D','Mr. Ramesh Y.','Mr. Abhishek Singh',['RAMESH Y','RAMESH YADAV']],
 ['XII E','Dr. Mohan Singh','Ms. Techi Y.',['MOHAN SINGH','MOHAN SINGH RAJPUT']]
].map(([classId,mentor,support,names])=>({classId,mentor,support,names}));
const nameKey=name=>String(name||'').toUpperCase().replace(/^(?:MR|MRS|MS|DR|SHRI|SMT)[.\s]+/,'').replace(/[^A-Z]/g,'');
export function taskRosterStore(value,staff,identityIds=(_staff,id)=>[id]){
 const store=structuredClone(value||{}),task=store.tasks?.task1;if(!task)return store;
 // Apply the Principal's wording correction to this known survey, including
 // already-published titles. Other task names and edited custom titles remain intact.
 const titleKey=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^ixxii/,'');
 const legacy=/^highurgencysurveyfor(?:the)?hqmeetingregionalinputsrelevanttoourvidyalayaconfidential(?:student)?dataforhigherlevelsubmission$/;
 for(const cfg of [task.draft,task.published])if(cfg&&legacy.test(titleKey(cfg.title)))cfg.title=TASK1_TITLE;
 // Keep exam entry under Principal control. Preserve existing Passed values
 // and archive legacy answers before retiring Failed below.
 if(!task.principalExamOnly){task.principalExamOnly=true;task.revision=(task.revision||0)+1;if(task.published)task.publishedRevision=(task.publishedRevision||0)+1;
  if(task.examPassReference){task.previousExamPassReference=task.examPassReference;delete task.examPassReference;}
  for(const report of Object.values(task.reports||{})){if(!report.values)continue;const revision=report.revision||0;report.principalEditHistory||={};report.principalEditHistory['exam_policy_'+revision]={values:structuredClone(report.values),questions:report.questions||[],updatedAt:report.updatedAt,reason:'Exam entry moved to Principal control; original answers retained'};report.values={...report.values};report.revision=revision+1;}
 }
 if(!task.passedOnly){task.passedOnly=true;task.revision=(task.revision||0)+1;if(task.published)task.publishedRevision=(task.publishedRevision||0)+1;
  for(const cfg of [task.draft,task.published])if(cfg)cfg.questions=taskQuestions(cfg).filter(q=>q.id!=='failed');
  for(const report of Object.values(task.reports||{})){if(!report.values)continue;const revision=report.revision||0;report.principalEditHistory||={};report.principalEditHistory['failed_removed_'+revision]={values:structuredClone(report.values),questions:taskQuestions(report),...(report.retiredAnswers?.failed?{retiredFailed:structuredClone(report.retiredAnswers.failed)}:{}),updatedAt:report.updatedAt,reason:'Failed entry removed; Passed retained'};report.values={...report.values};delete report.values.failed;report.questions=taskQuestions(report).filter(q=>q.id!=='failed');if(report.retiredAnswers)delete report.retiredAnswers.failed;report.revision=revision+1;}
 }
 if(task.rosterAssignmentsApplied)return store;task.rosterAssignmentsApplied=true;
 // Existing explicit Principal assignments win. Fill only missing entries using
 // exact documented names/aliases and unambiguous existing linked identities.
 for(const config of [task.draft,task.published])if(config){config.assignments||={};for(const row of TASK1_ROSTER){if(config.assignments[row.classId])continue;const keys=row.names.map(nameKey),matches=Object.keys(staff).filter(id=>staff[id].status==='active'&&keys.includes(nameKey(staff[id].name))).sort();if(!matches.length)continue;const linked=identityIds(staff,matches[0]);if(matches.some(id=>!linked.includes(id)))continue;const prefix=/^(IX|X) /.test(row.classId)?'X:':'XII:';config.assignments[row.classId]=matches.find(id=>id.startsWith(prefix))||matches[0];}}
 return store;
}
