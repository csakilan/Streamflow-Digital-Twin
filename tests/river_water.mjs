import {test} from 'node:test';
import assert from 'node:assert/strict';
const geometry=await import('../assets/river-water/geometry.mjs').catch(()=>({}));
// A bilinear sampler would incorrectly float the overlay above/below sloped terrain triangles.
test('water follows actual terrain triangles, including the upper triangle and edges',()=>{
 assert.equal(typeof geometry.sampleGridHeight,'function','mapped-water terrain sampler is missing');
 const p=new Float32Array([0,0,0, 10,10,0, 0,20,10, 10,100,10]);
 const b=[0,0,10,10],s=(x,z)=>geometry.sampleGridHeight(p,2,b,x,z);
 assert.equal(s(2,3),8);assert.equal(s(8,7),57);assert.equal(s(10,10),100);assert.equal(s(0,0),0);
 assert.equal(s(-1,2),null);p[1]=NaN;assert.equal(s(1,1),null);
});
test('mapped polygon containment keeps islands dry and disjoint channels separate',()=>{
 assert.equal(typeof geometry.containsWater,'function','mapped-water polygon containment is missing');
 const rings=[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[7,3],[7,7],[3,7],[3,3]]];
 assert.equal(geometry.containsWater([rings],[1,1]),true);assert.equal(geometry.containsWater([rings],[5,5]),false);assert.equal(geometry.containsWater([rings],[12,5]),false);
});
test('missing mapped assets cannot silently show the legacy estimate',()=>{
 assert.equal(typeof geometry.waterVisibility,'function','explicit water-mode state is missing');
 assert.deepEqual(geometry.waterVisibility('mapped',false),{mapped:false,legacy:false});
 assert.deepEqual(geometry.waterVisibility('mapped',true),{mapped:true,legacy:false});
 assert.deepEqual(geometry.waterVisibility('original',true),{mapped:false,legacy:true});
 assert.deepEqual(geometry.waterVisibility('imagery',true),{mapped:false,legacy:false});
});
const stage=await import('../assets/river-water/stage.mjs').catch(()=>({}));
test('measured stage excludes missing, duplicate and other-day readings and keeps source units',()=>{
 assert.equal(typeof stage.summarizeStage,'function','measured stage parser is missing');
 const series={sourceInfo:{siteCode:[{value:'01646500'}]},variable:{variableCode:[{value:'00065'}],unit:{unitCode:'ft'},noDataValue:-999999},values:[{value:[
 {value:'4.0',dateTime:'2025-05-10T00:00:00-04:00',qualifiers:['A']},{value:'6.0',dateTime:'2025-05-10T00:15:00-04:00',qualifiers:['P']},
 {value:'6.0',dateTime:'2025-05-10T00:15:00-04:00',qualifiers:['P']},{value:'99',dateTime:'2025-05-11T00:00:00-04:00'},
 {value:'-999999',dateTime:'2025-05-10T00:30:00-04:00'},{value:'',dateTime:'2025-05-10T00:45:00-04:00'}]}]};
 const d={value:{timeSeries:[series]}};const s=stage.summarizeStage(d,'01646500','2025-05-10');
 assert.equal(s.meanFt,5);assert.equal(s.minFt,4);assert.equal(s.maxFt,6);assert.equal(s.samples,2);assert.equal(s.provisional,true);
 assert.equal(stage.summarizeStage(d,'14105700','2025-05-10'),null);assert.equal(stage.summarizeStage(d,'01646500','2025-05-12'),null);
 series.variable.unit.unitCode='m';assert.equal(stage.summarizeStage(d,'01646500','2025-05-10'),null);
});
import {readFileSync} from 'node:fs';
test('bundled river triangles are finite, up-facing and do not collapse after coordinate rounding',()=>{
 for(const site of ['01646500','14105700']){
  const d=JSON.parse(readFileSync(new URL(`../assets/river-water/data/${site}.json`,import.meta.url)));
  for(const name of ['inner','table','innerQuest']){
   const {vertices:v,indices:ix}=d[name];assert.ok(v.every(Number.isFinite));
   for(let i=0;i<ix.length;i+=3){const ids=ix.slice(i,i+3);assert.ok(ids.every(k=>Number.isInteger(k)&&k>=0&&k<v.length/2));
    const [a,b,c]=ids.map(k=>k*2),cross=(v[b]-v[a])*(v[c+1]-v[a+1])-(v[b+1]-v[a+1])*(v[c]-v[a]);
    assert.ok(cross< -1e-8,`${site} ${name}: collapsed/reversed triangle ${i/3}`);
   }
  }
 }
});
test('displayed river date uses discrete issued forecasts, independent of live/animation flow',()=>{
 assert.equal(typeof geometry.selectRiverReading,'function','date-bound reading selector missing');
 const args={day:4,issue:2,progress:1.4,forecast:true,flowAt:i=>[10,20,30,40,50][i],forecastAt:l=>[30,101,102][l]};
 assert.deepEqual(geometry.selectRiverReading(args),{index:3,lead:1,forecast:true,flow:101});
 assert.deepEqual(geometry.selectRiverReading({...args,progress:.2}),{index:2,lead:0,forecast:false,flow:30});
 assert.deepEqual(geometry.selectRiverReading({...args,forecast:false}),{index:4,lead:null,forecast:false,flow:50});
});
test('mapped surfaces require complete decoded elevation, including before relief changes',()=>{
 assert.equal(typeof geometry.terrainReady,'function','terrain readiness check missing');
 assert.equal(geometry.terrainReady({loaded:false,failedTiles:0,invalidPixels:0}),false);
 assert.equal(geometry.terrainReady({loaded:true,failedTiles:1,invalidPixels:0}),false);
 assert.equal(geometry.terrainReady({loaded:true,failedTiles:0,invalidPixels:1}),false);
 assert.equal(geometry.terrainReady({loaded:true,failedTiles:0,invalidPixels:0}),true);
});
test('bank lines are physical source boundaries, not the closing edges of the crop',()=>{
 for(const site of ['01646500','14105700']){
  const d=JSON.parse(readFileSync(new URL(`../assets/river-water/data/${site}.json`,import.meta.url)));
  for(const name of ['inner','table','innerQuest']){
   const mesh=d[name];assert.ok(mesh,'missing matching headset grid');assert.ok(Array.isArray(mesh.banks),'source bank lines missing');
   const [x0,z0,x1,z1]=mesh.bounds;
   for(const line of mesh.banks)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],on=(j,v)=>Math.abs(a[j]-v)<.002&&Math.abs(b[j]-v)<.002;
    assert.ok(!(on(0,x0)||on(0,x1)||on(1,z0)||on(1,z1)),'synthetic crop boundary rendered as riverbank');
   }
  }
 }
});

test('captions distinguish the fixed mapped reference from estimated legacy waterlines',()=>{
 assert.equal(typeof geometry.waterCaption,'function');
 assert.match(geometry.waterCaption('mapped',true,4),/stays fixed/);
 assert.doesNotMatch(geometry.waterCaption('mapped',true,4),/dots/);
 assert.doesNotMatch(geometry.waterCaption('imagery',true,4),/dots/);
 assert.match(geometry.waterCaption('original',true,4),/estimated/);
});
