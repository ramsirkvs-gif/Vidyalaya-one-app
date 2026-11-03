import test from 'node:test';
import assert from 'node:assert/strict';
import {isMCQMathSubject,MCQ_MATH_FONT_CSS} from '../cbse-mcq-math.js';
import {parseMCQContribution} from '../cbse-mcq-model.js';
import fs from 'node:fs/promises';
test('maths subject guidance covers both classes and Hindi subject names',()=>{for(const name of ['Mathematics Basic','Mathematics Standard','Applied Mathematics','Maths','गणित'])assert.equal(isMCQMathSubject(name),true);assert.equal(isMCQMathSubject('English'),false);});
test('Unicode maths symbols and plain fractions survive arranging unchanged',()=>{const stem='3/5 < x < 4/5; √2 ∛8 ∑ ∫ ∞ ≠ ≤ ≥ ∈ ∪ ⊂ π x² x₃ → ∠ ± ÷ ×';const raw=Array.from({length:10},(_,i)=>`${i+1}. ${stem}\n(A) 7/5 (B) 7/10 (C) 3/10 (D) 4/10`).join('\n\n');const questions=parseMCQContribution(raw,'BBBBBBBBBB',10);assert.equal(questions[0].stem,stem);assert.deepEqual(questions[0].options,['7/5','7/10','3/10','4/10']);});
test('the full locally served maths font and license are included',async()=>{const font=await fs.readFile(new URL('../vendor/math-fonts/NotoSansMath-Regular.ttf',import.meta.url));assert.equal(font.readUInt32BE(0),0x10000);assert.ok(font.length>100000);assert.match(await fs.readFile(new URL('../vendor/math-fonts/OFL.txt',import.meta.url),'utf8'),/SIL OPEN FONT LICENSE/);assert.match(MCQ_MATH_FONT_CSS,/NotoSansMath-Regular.ttf/);});
