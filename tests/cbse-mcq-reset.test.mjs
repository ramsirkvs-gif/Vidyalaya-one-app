import test from 'node:test';import assert from 'node:assert/strict';
import {previewClearMCQBanks,clearMCQBanks} from '../cbse-mcq-reset.js';
import {importMCQCSV,publicMCQBank,createMCQPaper,changeMCQQuestion} from '../cbse-mcq-model.js';
import {emptyDraft} from '../cbse-model.js';
const actor={id:'principal',name:'Principal'},draft=emptyDraft();for(const cl of ['X','XII'])draft.classes[cl].sections.a.subjects={hindi:{name:'Hindi'},science:{name:'Science'}};
const upload=(bank,classId,subjectId,requestId,epoch=0)=>importMCQCSV(bank,{classId,subjectId,requestId,verified:true,csvText:'Subject,Topic,Question,CorrectAnswer\n,Mixed,Question '+requestId+',A'},actor,draft,1).next;
const seed=()=>upload(upload(upload({},'X','hindi','first_upload'),'X','science','second_upload'),'XII','hindi','senior_upload');
const request=bank=>({confirmation:'CLEAR ALL',restartIds:true,expectedRevision:bank.revision,requestId:'reset_all_banks'});
test('all subjects clear together with a private archive and new IDs only when no QPs/scores exist',()=>{
 const bank=seed(),preview=previewClearMCQBanks(bank);assert.equal(preview.total,3);assert.equal(preview.subjects.length,3);assert.equal(preview.canRestartIds,true);
 const cleared=clearMCQBanks(bank,request(bank),actor,2);assert.equal(cleared.changedCount,3);assert.equal(cleared.idsRestarted,true);assert.equal(publicMCQBank(cleared.next).total,0);assert.equal(publicMCQBank(cleared.next,{classId:'XII'}).total,0);assert.equal(Object.keys(cleared.next.bankClearArchive.reset_all_banks.questions).length,3);assert.ok(!JSON.stringify(publicMCQBank(cleared.next)).includes('bankClearArchive'));
 assert.deepEqual(clearMCQBanks(cleared.next,request(bank),actor,3).next,cleared.next);
 const fresh=upload(cleared.next,'X','hindi','fresh_hindi_upload');assert.ok(fresh.questions.QH001);assert.equal(fresh.questionBankEpoch,1);assert.equal(publicMCQBank(fresh,{selectionIds:['QH001'],selectionEpoch:0}).selectedQuestions.length,0);assert.equal(publicMCQBank(fresh,{selectionIds:['QH001'],selectionEpoch:1}).selectedQuestions.length,1);
 assert.throws(()=>createMCQPaper(fresh,{classId:'X',subjectId:'hindi',questionIds:['QH001'],requestId:'stale_paper_request'},actor,4,draft),/bank was reset/);assert.throws(()=>changeMCQQuestion(fresh,{operation:'mcq-question-delete',questionId:'QH001',expectedRevision:0,requestId:'stale_delete_request'},actor,4),/bank was reset/);
 assert.equal(createMCQPaper(fresh,{classId:'X',subjectId:'hindi',questionBankEpoch:1,questionIds:['QH001'],requestId:'fresh_paper_request'},actor,4,draft).next.papers.QPH001.count,1);assert.equal(clearMCQBanks(fresh,request(bank),actor,5).next.questions.QH001.id,'QH001');
});
test('saved QPs and scores block ID restart but clearing questions preserves all existing records',()=>{
 const bank=seed();bank.papers={QPH001:{id:'QPH001',questions:[structuredClone(bank.questions.QH001)]}};bank.evaluations={result:{score:1}};const before=structuredClone(bank),preview=previewClearMCQBanks(bank);assert.equal(preview.canRestartIds,false);assert.throws(()=>clearMCQBanks(bank,request(bank),actor,2),/cannot restart/);
 const cleared=clearMCQBanks(bank,{...request(bank),restartIds:false},actor,2);assert.equal(publicMCQBank(cleared.next).total,0);assert.deepEqual(cleared.next.papers,bank.papers);assert.deepEqual(cleared.next.evaluations,bank.evaluations);assert.deepEqual(cleared.next.questionCodeCounters,bank.questionCodeCounters);assert.deepEqual(bank,before);assert.equal(previewClearMCQBanks(seed(),{marks:{one:{source:'mcq-mahaabhiyan'}}}).canRestartIds,false);
});
test('cleanup requires Principal, exact confirmation and fresh preview',()=>{
 const bank=seed();assert.throws(()=>clearMCQBanks(bank,request(bank),{id:'teacher'},2),/Only the Principal/);assert.throws(()=>clearMCQBanks(bank,{...request(bank),confirmation:'clear'},actor,2),/Type CLEAR ALL/);assert.throws(()=>clearMCQBanks(bank,{...request(bank),expectedRevision:0},actor,2),/bank changed/);
});
