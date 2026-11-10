import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSelection} from './state.mjs';
import {readings} from './readings.mjs';
import {bankToLocal,clipPaths} from './bank-data.mjs';
const load=site=>JSON.parse(readFileSync(new URL(`./data/${site}.json`,import.meta.url)));
test('both station readings pair issue/target and keep measured stage distinct; lead never moves accuracy window',()=>{
 for(const site of ['01646500','14105700']){
  const d=load(site),s=createSelection(d),stage=JSON.parse(readFileSync(new URL(`./data/${site}-stage.json`,import.meta.url)));
  const first=readings(d,s.get(),stage);
  assert.equal(first.comparison.issueDate,'2025-05-09');assert.equal(first.comparison.targetDate,'2025-05-10');
  assert.equal(first.comparison.predictedCfs,d.pred[0][0][s.get().issueIndex]);
  assert.equal(first.stage.meanFt,stage.days['2025-05-10'].meanFt);assert.equal(first.stage.samples,96);
  s.change({lead:7});const other=readings(d,s.get(),stage);
  assert.deepEqual(other.accuracy,first.accuracy);assert.equal(other.stage,null);assert.equal(other.forecast.length,7);
  assert.equal(other.comparison.targetDate,'2025-05-16');assert.equal(other.forecast[6].observedCfs,other.comparison.observedCfs);
 }
});
test('bank coordinates share the imagery geographic origin and clipped banks stay open',()=>{
 const origin=[-77.12763889,38.94977778];
 const local=bankToLocal([0,0],origin);local.forEach(v=>assert.ok(Math.abs(v)<1e-7));
 const east=bankToLocal([1000,0],origin);assert.ok(east[0]>995&&east[0]<1005);assert.ok(Math.abs(east[2])<1);
 const paths=clipPaths([[[-3,0],[0,0],[3,0]]],[-1,-1,1,1]);
 assert.deepEqual(paths,[[[-1,0],[0,0],[1,0]]]);assert.notDeepEqual(paths[0][0],paths[0].at(-1));
});

test('station changes preserve manual access and explicit engine/XR testing flags',async()=>{
 const {stationQuery}=await import('./navigation.mjs');
 const next=new URLSearchParams(stationQuery('?manualAuth=1&engineTest=1&emulateXR=1','14105700','2025-05-09'));
 for(const key of ['manualAuth','engineTest','emulateXR'])assert.equal(next.get(key),'1');
 assert.equal(next.get('station'),'14105700');assert.equal(next.get('day'),'2025-05-09');
});
test('graph labels face the world camera when the containing graph is turned',async()=>{
 const T=await import('./vendor/three.module.min.js');
 const {faceSceneLabels}=await import('./billboard.mjs');
 const scene=new T.Scene(),group=new T.Group(),camera=new T.PerspectiveCamera(),mesh=new T.Mesh();scene.add(group,camera);group.add(mesh);
 group.rotation.y=Math.PI/2;camera.rotation.set(.1,.2,.05);scene.updateMatrixWorld(true);
 faceSceneLabels([mesh],camera);scene.updateMatrixWorld(true);
 assert.ok(Math.abs(mesh.getWorldQuaternion(new T.Quaternion()).dot(camera.getWorldQuaternion(new T.Quaternion())))>.999999);
});
test('XR credits remain in front of the viewer after a head turn and translation',async()=>{
 const T=await import('./vendor/three.module.min.js');const {placeViewerCredits}=await import('./viewer-credits.mjs');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),credits=new T.Mesh();scene.add(camera,credits);
 camera.position.set(2,1.7,-.5);camera.rotation.set(-.3,Math.PI/2,0);scene.updateMatrixWorld(true);
 placeViewerCredits(credits,camera);scene.updateMatrixWorld(true);
 const local=camera.worldToLocal(credits.getWorldPosition(new T.Vector3()));
 assert.ok(local.distanceTo(new T.Vector3(0,-.65,-1.85))<1e-6);
 assert.ok(Math.abs(credits.getWorldQuaternion(new T.Quaternion()).dot(camera.getWorldQuaternion(new T.Quaternion())))>.999999);
});
