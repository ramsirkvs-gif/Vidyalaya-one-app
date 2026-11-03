import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMCQContribution,parseMCQAnswers} from '../cbse-mcq-model.js';
const hindi=Array.from({length:10},(_,i)=>`प्रश्न ${i+1}: सही वाक्य चुनिए\n(क) पहला विकल्प\n(ख) दूसरा विकल्प\n(ग) तीसरा विकल्प\n(घ) चौथा विकल्प`).join('\n\n');
test('Hindi pasted questions and numbered Hindi answers retain the correct mapping',()=>{const q=parseMCQContribution(hindi,'उत्तर: '+Array.from({length:10},(_,i)=>`${i+1}-(${['क','ख','ग','घ'][i%4]})`).join(', '),10);assert.equal(q.length,10);assert.deepEqual(q[0].options,['पहला विकल्प','दूसरा विकल्प','तीसरा विकल्प','चौथा विकल्प']);assert.equal(q[1].answer,'B');assert.equal(q[9].sourceNumber,10);});
test('Devanagari numbers and compact pasted keys work',()=>{const q=parseMCQContribution(hindi.replace(/\d/g,n=>'०१२३४५६७८९'[n]),'ABCDABCDAB',10);assert.equal(q[9].answer,'B');});
test('answer keys reject missing, duplicate or unexpected data',()=>{for(const key of ['1-A 1-B','1-A 2-B extra','A'])assert.throws(()=>parseMCQAnswers(key,[1,2]));assert.deepEqual(parseMCQAnswers('2-(ख), 1-(क)',[1,2]),['A','B']);});

test('processing preserves mathematical superscripts',()=>{const q=parseMCQContribution(hindi.replace('सही वाक्य चुनिए','x² + y³ = ?'),'ABCDABCDAB',10);assert.equal(q[0].stem,'x² + y³ = ?');});
