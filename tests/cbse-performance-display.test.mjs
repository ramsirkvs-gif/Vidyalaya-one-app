import test from 'node:test';import assert from 'node:assert/strict';import {markPercentage,outOf} from '../cbse-performance-display.js';
test('performance percentages retain zero, represent AB separately and use each paper maximum',()=>{assert.equal(markPercentage({score:0,maximum:40,absent:false}),'0.0%');assert.equal(markPercentage({score:13,maximum:40,absent:false}),'32.5%');assert.equal(markPercentage({score:26,maximum:80,absent:false}),'32.5%');assert.equal(markPercentage({score:null,maximum:40,absent:true}),'AB');assert.equal(markPercentage(undefined),'—');assert.equal(outOf(53,141),'53 out of 141 students');});

test('student care lines name every critical subject and separate other failures',async()=>{
 const {subjectCareLines}=await import('../cbse-performance-display.js'),s=(name,band,score)=>({name,band,latest:{score,maximum:40,absent:false}}),lines=subjectCareLines({subjects:[s('Maths','critical',7),s('Science','critical',9),s('English','red',11),s('Hindi','green',25)]});
 assert.match(lines[0],/Critical subjects \(2\): Maths: 17.5% · Science: 22.5%/);assert.match(lines[1],/Other failing subjects \(1\): English: 27.5%/);
 assert.match(subjectCareLines({subjects:[s('Hindi','green',25),s('English','green',20)]})[0],/Lowest recorded subject: English: 50.0%/);
});
