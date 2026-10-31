import test from 'node:test';import assert from 'node:assert/strict';
import {parsePINCSV,validatePINRows,pinTemplateCSV} from '../cbse-pin-import.js';
const staff={'X:one':{name:'Synthetic Teacher',classId:'X',status:'active'},'X:two':{name:'Second Teacher',classId:'X',status:'active'}};
const header='StaffID,StaffName,Class,PIN,Enabled\n';
test('CSV preserves three digits including zeroes and reads explicit disabled state',()=>{const r=parsePINCSV(header+'X:one,Synthetic Teacher,X,029,Yes\nX:two,Second Teacher,X,837,No',staff);assert.equal(r[0].pin,'029');assert.equal(r[1].enabled,false);assert.equal(r.length,2);});
test('rejects unknown IDs, mismatched names, duplicate IDs, bad PINs and bad state',()=>{for(const row of ['X:no,Synthetic Teacher,X,123,Yes','X:one,Other Name,X,123,Yes','X:one,Synthetic Teacher,X,12,Yes','X:one,Synthetic Teacher,X,123,Maybe'])assert.throws(()=>parsePINCSV(header+row,staff));assert.throws(()=>parsePINCSV(header+'X:one,Synthetic Teacher,X,123,Yes\nX:one,Synthetic Teacher,X,456,Yes',staff),/duplicate/);assert.throws(()=>validatePINRows([{staffId:'__proto__',name:'x',pin:'123',enabled:true}],staff),/unknown/);});
test('template contains active staff identities without existing PINs',()=>{const text=pinTemplateCSV(staff);assert.match(text,/StaffID/);assert.match(text,/Synthetic Teacher/);assert.throws(()=>parsePINCSV(text,staff),/three digits/);});
