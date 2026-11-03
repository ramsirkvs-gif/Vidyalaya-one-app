import test from 'node:test';import assert from 'node:assert/strict';import {subjectStudentGroups} from '../cbse-subject-students.js';
test('XII subject groups span sections, use actual enrolments and deduplicate same-code subject aliases',()=>{
 const d={classes:{X:{sections:{}},XII:{sections:{}}}};
 d.classes.X.sections.a={subjects:{english:{name:'English',code:'301'}},students:{junior:{subjects:{english:true}}}};
 d.classes.XII.sections.a={subjects:{eng:{name:'English',code:'301'},alias:{name:'English Core',code:'301'},chem:{name:'Chemistry',code:'043'}},students:{one:{subjects:{eng:true,alias:true}},two:{subjects:{chem:true}},none:{subjects:{}}}};
 d.classes.XII.sections.e={subjects:{different:{name:'English',code:''}},students:{senior:{subjects:{different:true}},notEnrolled:{subjects:{different:false}}}};
 const original=structuredClone(d),groups=subjectStudentGroups(d);assert.equal(groups.length,2);assert.deepEqual(groups.find(g=>g.code==='301').studentKeys,['XII:a:one','XII:e:senior']);assert.deepEqual(groups.find(g=>g.code==='043').studentKeys,['XII:a:two']);assert.deepEqual(d,original);assert.deepEqual(subjectStudentGroups({}),[]);
});
