import test from 'node:test';import assert from 'node:assert/strict';import {contactNumbers,dialNumber,mapLink,validateContact} from '../cbse-contact-model.js';
test('labelled legacy numbers become safe dialler links',()=>{assert.equal(contactNumbers({phones:'Father: 1234567890; Mother: +91 9876543210'}).length,2);assert.equal(dialNumber('+91 98765 43210'),'+919876543210');assert.equal(dialNumber('javascript:alert(1)'), '');});
test('Google map URLs and coordinates validate; arbitrary/script links do not',()=>{assert.match(mapLink('27.1, 93.7'),/google.com\/maps/);assert.match(mapLink('https://maps.app.goo.gl/example'),/maps.app/);for(const bad of ['javascript:alert(1)','https://example.com','https://google.com.evil/maps','99,200'])assert.throws(()=>mapLink(bad));assert.throws(()=>validateContact({numbers:{one:{label:'Father',phone:'123'}}}),/valid/);});
test('saved meetings accept only direct Google Meet codes',async()=>{
 const {meetingLink}=await import('../cbse-contact-model.js');assert.equal(meetingLink(' https://meet.google.com/abc-defg-hij/ '),'https://meet.google.com/abc-defg-hij');assert.equal(meetingLink(''),'');
 for(const bad of ['javascript:alert(1)','https://meet.google.com.evil/abc-defg-hij','https://meet.google.com/abc-defg-hij?x=1','https://user@meet.google.com/abc-defg-hij',4])assert.throws(()=>meetingLink(bad));
 assert.throws(()=>validateContact({meetingLink:'https://example.org'}));
});
