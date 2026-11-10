import test from 'node:test';import assert from 'node:assert/strict';
import {hasMultipleMCQOptionSets} from '../cbse-mcq-content-check.js';
import {parseMCQCSV} from '../cbse-mcq-csv.js';
const question='Silver chloride turns grey because:\nA) Oxidation\nB) Heat\nC) Silver and chlorine\nD) Oxygen';
test('detects section instructions appended after an already complete question',()=>{const bad=question+'\n\nAssertion–Reasoning Questions\nChoose the correct option:\nA) Both true\nB) Not explanation\nC) A true\nD) B true';assert.equal(hasMultipleMCQOptionSets(question),false);assert.equal(hasMultipleMCQOptionSets(bad),true);const csv='Subject,Topic,Question,CorrectAnswer\nScience,Chemistry,"'+bad+'",C';assert.throws(()=>parseMCQCSV(csv,{subjectId:'science',subjectName:'Science'}),/row 2: more than one A–D option set/);assert.equal(parseMCQCSV(csv.replace(bad,question),{subjectId:'science',subjectName:'Science'})[0].stem,question);});

import {singleMCQPasteCheck} from '../cbse-mcq-content-check.js';
test('single-question paste identifies bulk question sets while preserving a long single passage',()=>{for(const text of ['First? A) One B) Two C) Three D) Four\nSecond? A) One B) Two C) Three D) Four','प्रश्न १: पहला\nप्रश्न २: दूसरा','Q.1 First\nQ.2 Second'])assert.equal(singleMCQPasteCheck(text).bulk,true);const long='A long shared passage. '.repeat(220)+'\nA) One\nB) Two\nC) Three\nD) Four';assert.deepEqual(singleMCQPasteCheck(long),{bulk:false,large:true});assert.deepEqual(singleMCQPasteCheck('One question? A) 1 B) 2 C) 3 D) 4'),{bulk:false,large:false});});
