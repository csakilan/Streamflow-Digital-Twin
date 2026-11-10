import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PANEL_TYPES as originalTypes} from '../../assets/spatial-data/state.mjs';
test('standalone Data Space restores every original panel type and uses its own data/runtime',async()=>{
 const {PANEL_TYPES}=await import('./state.mjs');assert.deepEqual(PANEL_TYPES,originalTypes);
 const page=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 for(const type of originalTypes)assert.match(page,new RegExp(`data-panel="${type}"`));
 const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');assert.doesNotMatch(app,/\.\.\/\.\.\/(?:assets|stations|chart3d|corr)/);
 for(const site of ['01646500','14105700'])assert.ok(JSON.parse(readFileSync(new URL(`../data/${site}-correlation.json`,import.meta.url))).matrix.length>0);
});
test('landscape and Data Space preserve the forecast selection and environment variable',async()=>{
 const {selectionQuery,readSelectionQuery}=await import('../view-state.mjs');
 const d=JSON.parse(readFileSync(new URL('../data/14105700.json',import.meta.url)));
 const chosen={issueIndex:8600,modelIndex:2,lead:5,variable:'soil8'};
 const query=selectionQuery('?manualAuth=1','14105700',d,chosen);
 assert.deepEqual(readSelectionQuery(d,query),chosen);assert.equal(new URLSearchParams(query).get('manualAuth'),'1');
});
