import test from 'node:test';import assert from 'node:assert/strict';
import {hasMultipleMCQOptionSets} from '../cbse-mcq-content-check.js';
import {parseMCQCSV} from '../cbse-mcq-csv.js';
const question='Silver chloride turns grey because:\nA) Oxidation\nB) Heat\nC) Silver and chlorine\nD) Oxygen';
test('detects section instructions appended after an already complete question',()=>{const bad=question+'\n\nAssertion–Reasoning Questions\nChoose the correct option:\nA) Both true\nB) Not explanation\nC) A true\nD) B true';assert.equal(hasMultipleMCQOptionSets(question),false);assert.equal(hasMultipleMCQOptionSets(bad),true);const csv='Subject,Topic,Question,CorrectAnswer\nScience,Chemistry,"'+bad+'",C';assert.throws(()=>parseMCQCSV(csv,{subjectId:'science',subjectName:'Science'}),/row 2: more than one A–D option set/);assert.equal(parseMCQCSV(csv.replace(bad,question),{subjectId:'science',subjectName:'Science'})[0].stem,question);});
