import test from 'node:test';import assert from 'node:assert/strict';
import {teacherMCQParticipation} from '../cbse-mcq-participation.js';
test('teacher contribution uses evaluator identities, deduplicates corrected results and counts zero scores',()=>{
 const result=(studentKey,paperId,evaluatedBy,updatedAt,extra={})=>({studentKey,paperId,subjectId:'english',evaluatedBy,updatedAt,score:0,maximum:20,...extra});
 const mission={marks:{old:result('X:a:one','QPE001','X:one',1),corrected:result('X:a:one','QPE001','X:one',5,{score:10}),alias:result('XII:b:two','QPE002','XII:one',4),again:result('X:a:one','QPE002','X:one',3),other:result('X:a:three','QPE001','X:other',6),missing:result('X:a:four','QPE001','',6),absent:result('X:a:five','QPE001','X:one',6,{absent:true})}};
 const summary=teacherMCQParticipation(mission,['X:one','XII:one']);assert.equal(summary.evaluations,3);assert.equal(summary.studentCount,2);assert.equal(summary.paperCount,3);assert.equal(summary.lastReportedAt,5);assert.equal(summary.papers[0].students[0].score,10);assert.equal(summary.papers.flatMap(p=>p.students).filter(s=>s.score===0).length,2);assert.equal(teacherMCQParticipation(mission,['X:other']).evaluations,1);assert.equal(teacherMCQParticipation(mission,[]).evaluations,0);
});
