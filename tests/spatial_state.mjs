import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorkspace} from '../assets/spatial-data/state.mjs';
import {getComparison,getInputSummary} from '../assets/3dchart/data.mjs';
for(const site of ['01646500','14105700']){
 const d=JSON.parse(readFileSync(new URL(`../chart3d/${site}.json`,import.meta.url))),w=createWorkspace(d);const original=w.get().selection;
 assert.deepEqual(w.get().slots.map(p=>p.type),['overview','flow','forecast']);
 w.open('flow');assert.equal(w.get().active,1);w.open('models');assert.equal(w.get().slots[1].type,'models');assert.deepEqual(w.get().selection,original);
 w.close(0);w.open('drivers');assert.equal(w.get().slots[0].type,'drivers');w.minimize(0);w.expand(0);assert.deepEqual(w.get().selection,original);
 assert.throws(()=>w.select({issueIndex:d.n-1,lead:7}),RangeError);assert.deepEqual(w.get().selection,original);
 w.select({modelIndex:2,lead:5});const c=getComparison(d,w.get().selection);assert.equal(c.predictedCfs,d.pred[2][4][original.issueIndex]);assert.equal(c.observedCfs,d.flow[original.issueIndex+5]);
 w.reset();assert.deepEqual(w.get().slots.map(p=>p.type),['overview','flow','forecast']);assert.equal(w.get().selection.modelIndex,2,'Reset layout must not reset data selection');
 if(site==='01646500')assert.equal(getInputSummary(d,original.issueIndex).snowAvailable,false);
 console.log(`PASS ${site}: panel placement/replace/close/reset, layout-vs-data separation, date bounds, exact issue/target pairing`);
}
