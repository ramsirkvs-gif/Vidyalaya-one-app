import test from 'node:test';import assert from 'node:assert/strict';import {subjectStudentGroups,classXMathGroups} from '../cbse-subject-students.js';
test('XII subject groups span sections, use actual enrolments and deduplicate same-code subject aliases',()=>{
 const d={classes:{X:{sections:{}},XII:{sections:{}}}};
 d.classes.X.sections.a={subjects:{english:{name:'English',code:'301'}},students:{junior:{subjects:{english:true}}}};
 d.classes.XII.sections.a={subjects:{eng:{name:'English',code:'301'},alias:{name:'English Core',code:'301'},chem:{name:'Chemistry',code:'043'}},students:{one:{subjects:{eng:true,alias:true}},two:{subjects:{chem:true}},none:{subjects:{}}}};
 d.classes.XII.sections.e={subjects:{different:{name:'English',code:''}},students:{senior:{subjects:{different:true}},notEnrolled:{subjects:{different:false}}}};
 const original=structuredClone(d),groups=subjectStudentGroups(d);assert.equal(groups.length,2);assert.deepEqual(groups.find(g=>g.code==='301').studentKeys,['XII:a:one','XII:e:senior']);assert.deepEqual(groups.find(g=>g.code==='043').studentKeys,['XII:a:two']);assert.deepEqual(d,original);assert.deepEqual(subjectStudentGroups({}),[]);
});

test('X Maths Basic/Standard respects saved codes and explicit names without guessing unspecified Maths',()=>{const d={classes:{X:{sections:{}}}};d.classes.X.sections.a={subjects:{basic:{name:'Mathematics',code:'241'},standard:{name:'Mathematics',code:41},unknown:{name:'Maths',code:''}},students:{b:{subjects:{basic:true}},s:{subjects:{standard:true}},u:{subjects:{unknown:true}}}};d.classes.X.sections.d={subjects:{basic:{name:'MATHS BASIC',code:''},standard:{name:'Mathematics Standard',code:''}},students:{b:{subjects:{basic:true}},s:{subjects:{standard:true}}}};const groups=classXMathGroups(d);assert.deepEqual(groups.map(g=>g.name),['Maths Basic','Maths Standard']);assert.deepEqual(groups[0].studentKeys,['X:a:b','X:d:b']);assert.deepEqual(groups[1].studentKeys,['X:a:s','X:d:s']);});

test('section Maths summary reflects saved edits, missing choices and both-marked students without guessing',async()=>{
 const {classXMathSectionSummary}=await import('../cbse-subject-students.js');
 const draft={classes:{X:{sections:{}}}};
 draft.classes.X.sections.a={name:'A',subjects:{b:{name:'Maths Basic',code:'241'},s:{name:'Maths Standard',code:'041'},m:{name:'Maths',code:''}},students:{one:{subjects:{b:true}},two:{subjects:{s:true}},both:{subjects:{b:true,s:true}},unset:{subjects:{m:true}}}};
 draft.classes.X.sections.b={name:'B',subjects:{s:{name:'Maths Standard',code:41}},students:{one:{subjects:{s:true}}}};
 let rows=classXMathSectionSummary(draft);
 assert.deepEqual(rows[0],{sectionId:'a',section:'A',total:4,basic:2,standard:2,both:1,unassigned:1});assert.equal(rows[1].standard,1);
 draft.classes.X.sections.a.students.one.subjects={b:false,s:true};rows=classXMathSectionSummary(draft);
 assert.equal(rows[0].basic,1);assert.equal(rows[0].standard,3);assert.deepEqual(classXMathGroups(draft)[0].studentKeys,['X:a:both']);
 delete draft.classes.X.sections.a.students.both;rows=classXMathSectionSummary(draft);
 assert.equal(rows[0].total,3);assert.equal(rows[0].both,0);assert.equal(rows[0].basic,0);assert.equal(rows[0].standard,2);assert.deepEqual(classXMathSectionSummary({}),[]);
});
