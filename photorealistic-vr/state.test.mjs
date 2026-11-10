import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const geo=await import('./geodesy.mjs').catch(()=>({})),state=await import('./state.mjs').catch(()=>({})),stream=await import('./connection.mjs').catch(()=>({}));
test('the geographic origin, east, north and height have consistent local meter coordinates',()=>{
 assert.equal(typeof geo.localFrame,'function','local geographic frame missing');
 const f=geo.localFrame(38.94977778,-77.12763889,0);
 const origin=f.toLocal(38.94977778,-77.12763889,0);assert.ok(origin.every(v=>Math.abs(v)<1e-6));
 const up=f.toLocal(38.94977778,-77.12763889,100);assert.ok(Math.abs(up[1]-100)<1e-6);
 assert.ok(f.toLocal(38.94977778,-77.12663889,0)[0]>80);assert.ok(f.toLocal(38.95077778,-77.12763889,0)[2]< -100);
});
test('forecast controls retain the issue date and pair predictions with the correct target',()=>{
 assert.equal(typeof state.createSelection,'function','station selection missing');
 const d=JSON.parse(readFileSync(new URL('../chart3d/01646500.json',import.meta.url))),s=state.createSelection(d);
 const before=s.get();s.change({lead:7});const c=s.comparison();assert.equal(s.get().issueIndex,before.issueIndex);assert.equal(c.targetIndex,before.issueIndex+7);assert.equal(c.predictedCfs,d.pred[before.modelIndex][6][before.issueIndex]);
 assert.throws(()=>s.change({issueIndex:d.n}),RangeError);assert.equal(s.get().issueIndex,before.issueIndex);
});
test('a connection is reused until explicit disconnect, and snapshots never include credentials',()=>{
 assert.equal(typeof stream.createConnection,'function','single-session connector missing');
 let starts=0,disposals=0;const c=stream.createConnection(()=>{starts++;return {dispose(){disposals++;}};});
 c.connect('ion','secret-token-for-test');c.connect('ion','secret-token-for-test');assert.equal(starts,1);assert.equal(c.snapshot().starts,1);assert.ok(!JSON.stringify(c.snapshot()).includes('secret'));
 c.disconnect();assert.equal(disposals,1);c.connect('google','other-key-for-test');assert.equal(starts,2);
});
test('provider failures expose actionable status without leaking URLs or tokens',()=>{
 assert.equal(typeof stream.safeError,'function','safe imagery error missing');
 const message=stream.safeError(new Error('HTTP 403 https://service.test?access_token=secret-token-for-test'));
 assert.match(message,/access|permission/i);assert.ok(!message.includes('secret'));assert.ok(!message.includes('https'));
});
test('disconnect cancels pending provider initialization and prevents a late Google root request',async()=>{
 const {createImagery}=await import('./world.mjs'),{Group}=await import('three');
 const originalFetch=globalThis.fetch,originalRAF=globalThis.requestAnimationFrame,originalCancel=globalThis.cancelAnimationFrame;
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 try{
  for(const provider of ['ion','google']){
   const calls=[];let resolveRequest;const root=new Group();
   // Intentionally ignore abort in this mock: the late promise must also be guarded.
   globalThis.fetch=(url,options)=>{calls.push({url:String(url),options});return new Promise(resolve=>{resolveRequest=resolve;});};
   const resource=createImagery(provider,'not-a-real-test-key',{ready(){assert.fail('disposed resource became ready');},error(){assert.fail('disposed resource notified an error');}},root,{latitude:38.94977778,longitude:-77.12763889},'2275207');
   resource.tiles.update();await new Promise(resolve=>setTimeout(resolve,0));
   assert.equal(calls.length,1);resource.dispose();assert.equal(calls[0].options.signal.aborted,true);assert.equal(root.children.length,0);
   resolveRequest(new Response(JSON.stringify(provider==='ion'?{externalType:'3DTILES',options:{url:'https://tile.googleapis.com/v1/3dtiles/root.json?key=not-a-real-returned-key'}}:{asset:{version:'1.1'},geometricError:0,root:{boundingVolume:{sphere:[0,0,0,10]},geometricError:0}})));
   await new Promise(resolve=>setTimeout(resolve,20));assert.equal(calls.length,1,'disposed initialization cannot start another provider request');
  }
 }finally{globalThis.fetch=originalFetch;globalThis.requestAnimationFrame=originalRAF;globalThis.cancelAnimationFrame=originalCancel;}
});
test('desktop has room to refine, and XR entry/exit changes the budget on the same tileset',async()=>{
 const {createImagery}=await import('./world.mjs'),{Group,PerspectiveCamera,ArrayCamera,Vector4,Vector2}=await import('three');
 const resource=createImagery('google','not-a-real-test-key',{ready(){},error(){}},new Group(),{latitude:38.94977778,longitude:-77.12763889},'2275207');
 try{
  const tiles=resource.tiles;tiles.update=()=>{}; // No provider requests: exercise the actual frame/budget adapter.
  const desktop=new PerspectiveCamera(),eye=new PerspectiveCamera();eye.viewport=new Vector4(0,0,900,1000);
  const xr=new ArrayCamera([eye]),renderer={getSize:target=>target.set(1500,1000),getDrawingBufferSize:target=>target.set(2250,1500)};
  resource.update(desktop,renderer);
  assert.deepEqual(tiles.getResolution(desktop,new Vector2()).toArray(),[2250,1500],'desktop detail follows actual rendered pixels');
  assert.equal(tiles.lruCache.maxBytesSize,512*1024*1024,'desktop budget must allow the higher-detail scene');
  assert.equal(tiles.lruCache.maxSize,1600);assert.equal(resource.snapshot().budgetMode,'desktop');
  const auth=tiles.getPluginByName('GOOGLE_CLOUD_AUTH_PLUGIN');let evictions=0;
  const desktopContent={internal:{depth:2}};tiles.lruCache.add(desktopContent,()=>evictions++);
  tiles.lruCache.setMemoryUsage(desktopContent,300*1024*1024);tiles.lruCache.setLoaded(desktopContent,true);
  resource.update(xr,renderer);
  assert.deepEqual(tiles.getResolution(xr,new Vector2()).toArray(),[900,1000],'XR retains its per-eye viewport resolution');
  assert.equal(tiles.lruCache.maxBytesSize,160*1024*1024,'XR keeps its conservative budget');
  assert.equal(tiles.lruCache.maxSize,600);assert.equal(resource.snapshot().budgetMode,'xr');assert.equal(tiles.cameras.length,1);
  assert.equal(evictions,1,'used desktop content above the XR budget must actually be released');
  assert.ok(tiles.lruCache.cachedBytes<=160*1024*1024);assert.equal(tiles.getPluginByName('GOOGLE_CLOUD_AUTH_PLUGIN'),auth,'provider session survives cache cleanup');
  resource.update(desktop,renderer);
  assert.equal(resource.tiles,tiles,'no reconnect or replacement when leaving XR');assert.equal(tiles.lruCache.maxBytesSize,512*1024*1024);
  const smallContent={internal:{depth:1}};tiles.lruCache.add(smallContent,()=>evictions++);tiles.lruCache.setMemoryUsage(smallContent,100*1024*1024);tiles.lruCache.setLoaded(smallContent,true);
  resource.update(xr,renderer);assert.equal(evictions,1,'content already within the XR budget can stay cached');tiles.lruCache.remove(smallContent);
  resource.update(desktop,renderer);
  tiles.stats.refused=12;assert.equal(resource.snapshot().refused,12,'stalled refinement is observable');
 }finally{resource.dispose();}
});
test('study clipping follows zoom and miniature scale while retaining the full focus area',async()=>{
 const {studyRange}=await import('./view-quality.mjs').catch(()=>({}));assert.equal(typeof studyRange,'function');
 const full=studyRange(1600,1),mini=studyRange(1.6,.001);
 assert.ok(full.far>=1600+4000&&full.far<=1600+4250);
 assert.equal(mini.far,full.far*.001);assert.equal(mini.fogNear,full.fogNear*.001);
 assert.ok(full.fogNear>1600&&full.fogNear<full.far,'fade is outside the central river area');
 assert.ok(studyRange(12000,1).far>=16000,'zooming out retains the study area');
 assert.throws(()=>studyRange(1,0),RangeError);assert.throws(()=>studyRange(NaN,1),RangeError);
});
test('tile memory optimization frees texture memory without moving geometry or changing triangle indices',async()=>{
 const {createImagery}=await import('./world.mjs'),T=await import('three');
 const resource=createImagery('google','not-a-real-test-key',{ready(){},error(){}},new T.Group(),{latitude:38.94977778,longitude:-77.12763889},'2275207');
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([120,5,30,125,5,30,120,8,35],3));geometry.setIndex(new T.BufferAttribute(new Uint32Array([0,1,2]),1));
 const texture=new T.DataTexture(new Uint8Array(512*512*4),512,512);texture.generateMipmaps=true;
 const material=new T.MeshBasicMaterial({map:texture}),mesh=new T.Mesh(geometry,material),scene=new T.Group();scene.add(mesh);scene.updateMatrixWorld(true);
 try{
  const before=resource.tiles.calculateBytesUsed({},scene),positions=Array.from(geometry.attributes.position.array),indices=Array.from(geometry.index.array),matrix=mesh.matrixWorld.toArray();
  const optimizer=resource.tiles.getPluginByName('TILES_COMPRESSION_PLUGIN');assert.ok(optimizer,'the loaded tile must receive the memory optimizer');optimizer.processTileModel(scene,{});
  const after=resource.tiles.calculateBytesUsed({},scene);assert.ok(after<before,'texture-cache footprint decreases');
  assert.deepEqual(Array.from(geometry.attributes.position.array),positions);assert.deepEqual(Array.from(geometry.index.array),indices);assert.deepEqual(mesh.matrixWorld.toArray(),matrix);
 }finally{geometry.dispose();material.dispose();texture.dispose();resource.dispose();}
});
