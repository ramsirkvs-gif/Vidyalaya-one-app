import test from 'node:test';
import assert from 'node:assert/strict';
import {matches} from '../cbse-search.js';
test('names appear immediately for short prefixes and full words',()=>{for(const query of ['J','Jo','Joy','JOY','joy ku'])assert.ok(matches('Joy Kumar Kumawat Class XII Section C',query),query);for(const query of ['P','Pr','Prasanjit'])assert.ok(matches('Prasanjit Example Class X Section A',query));assert.ok(matches('JOY\u00a0Kumar','joy kum'));assert.ok(matches('रमेश कुमार','रमेश'));assert.ok(matches('Roll 12308','2308'));assert.ok(!matches('Joy Kumar','Prasanjit'));});
test('class/section and Roman class queries retain exact boundaries',()=>{assert.ok(matches('Joy Class XII Section C','XII C'));assert.ok(!matches('Joy Class XII Section C','X C'));assert.ok(matches('Joy Class XII Section C','XIIC'));assert.ok(matches('Joy Class X Section A','Class X Section A'));assert.ok(!matches('Akash Class X Section B','Class X Section A'));assert.ok(matches('Any student',''));});
