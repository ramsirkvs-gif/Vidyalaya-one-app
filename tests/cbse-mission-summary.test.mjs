import test from 'node:test';
import assert from 'node:assert/strict';
import {missionTeamCounts} from '../cbse-mission-summary.js';
test('team total deduplicates shared faculty, retains standard counts and excludes inactive/vacant members',()=>{
 const f={classes:{X:{teachers:{one:{name:'Shared Teacher',designation:'TGT',status:'active'},vacant:{name:'Vacant',designation:'TGT',status:'vacant'}}},XII:{teachers:{alias:{name:' shared  teacher ',designation:'tgt',status:'active'},other:{name:'Senior Teacher',designation:'PGT',status:'active'}}}}},m={staff:{helper:{name:'Support Member',designation:'PRT',status:'active'},old:{name:'Former Member',status:'inactive'}}};
 assert.deepEqual(missionTeamCounts(f,m),{total:3,X:1,XII:2,coopted:1});assert.deepEqual(missionTeamCounts({},{}),{total:0,X:0,XII:0,coopted:0});
 m.staff.shared={name:'Shared Teacher',designation:'TGT',status:'active'};assert.deepEqual(missionTeamCounts(f,m),{total:3,X:1,XII:2,coopted:2});
});
