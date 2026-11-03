import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfPageSelection,pdfTextLines} from '../cbse-mcq-pdf.js';
import {appendMCQPhotoText} from '../cbse-mcq-ocr.js';
test('PDF page ranges are bounded, distinct and preserve requested order',()=>{assert.deepEqual(pdfPageSelection('3, 1-2, 2',5),[3,1,2]);for(const input of ['', '0','2-1','1-30','1,a'])assert.throws(()=>pdfPageSelection(input,40));assert.throws(()=>pdfPageSelection('6',5));});
test('PDF text retains line boundaries and symbols',()=>{const item=(str,x,y,hasEOL=false)=>({str,transform:[1,0,0,1,x,y],height:12,hasEOL});assert.equal(pdfTextLines([item('Q.1',10,100),item('x² + √9?',40,100,true),item('(A) 1',10,80,true),item('(B) 2',10,60,true)]),'Q.1 x² + √9?\n(A) 1\n(B) 2');});
test('import renumbers Hindi questions and maps a trailing key without leaking it into options',()=>{const first='1. Existing?\nA) One B) Two C) Three D) Four';const imported='प्रश्न 21: अगला प्रश्न\n(क) एक (ख) दो (ग) तीन (घ) चार\nप्रश्न 22: दूसरा प्रश्न\n(क) एक (ख) दो (ग) तीन (घ) चार\nAnswer key: 21-B, 22-D';const result=appendMCQPhotoText(first,imported);assert.match(result,/2\. अगला/);assert.match(result,/3\. दूसरा/);assert.match(result,/Answer: B/);assert.match(result,/Answer: D/);assert.ok(!result.includes('21-B'));});
