import test from 'node:test';import assert from 'node:assert/strict';
import {validateEffort,effortDate,effortRows,effortCSV} from '../cbse-effort-model.js';
const thread={id:'thread_one',label:'Team X',createdAt:Date.parse('2026-10-31T20:00:00Z'),updatedAt:Date.parse('2026-11-02T10:00:00Z'),createdBy:'principal',rootRecordId:'one',participantIds:['X:one','X:one'],messages:[{id:'one',date:'2026-11-01',notes:'Opening',authorName:'Principal'},{id:'two',notes:'Latest response'}],opening:'Opening',progress:{closed:false,awaiting:['X:one']}};
test('effort rows use India activity dates and explicit summaries without inventing actions or outcomes',()=>{
 assert.equal(effortDate(thread.createdAt),'2026-11-01');const before=structuredClone(thread);let rows=effortRows([thread],{'X:one':{name:'Synthetic Teacher'}},'2026-11');assert.equal(rows.length,1);assert.equal(rows[0].date,'2026-11-01');assert.equal(rows[0].actionTaken,'');assert.equal(rows[0].outcome,'');assert.deepEqual(rows[0].recipientIds,['X:one']);assert.equal(rows[0].status,'Open');assert.deepEqual(thread,before);assert.equal(effortRows([thread],{},'2026-10').length,0);
 const saved={...thread,effort:{date:'2026-10-30',topic:'Reviewed practice',actionTaken:'Checked work',outcome:'Needs another review',updatedBy:'principal',updatedAt:100},progress:{...thread.progress,closed:true}};rows=effortRows([saved],{},'2026-10');assert.equal(rows[0].status,'Closed');assert.equal(rows[0].actionTaken,'Checked work');assert.equal(effortRows([saved],{},'2026-11').length,0);
});
test('effort validation rejects invalid dates, oversized fields and missing topics',()=>{
 const e={date:'2026-11-02',topic:'Practice',actionTaken:'',outcome:''};assert.deepEqual(validateEffort(e),e);for(const value of [{...e,date:'2026-02-30'},{...e,topic:''},{...e,topic:'x'.repeat(161)},{...e,outcome:'x'.repeat(2001)}])assert.throws(()=>validateEffort(value));
});
test('private CSV includes traceable identities and links, quotes multiline text, and neutralizes spreadsheet formula fields',()=>{
 const row=effortRows([{...thread,effort:{date:'2026-11-02',topic:'=HYPERLINK("bad")',actionTaken:'Line 1\nLine 2',outcome:'@All'}}],{'X:one':{name:'Synthetic, Teacher'}})[0],csv=effortCSV([row],id=>'https://example.test/#'+id);assert.ok(csv.includes("\"'=HYPERLINK(\"\"bad\"\")\""));assert.ok(csv.includes('"Line 1\nLine 2"'));assert.ok(csv.includes("\"'@All\""));assert.ok(csv.includes('Synthetic, Teacher'));assert.ok(csv.includes('https://example.test/#thread_one'));assert.ok(csv.includes('X:one'));assert.ok(!csv.includes('conversationAudit'));
});
