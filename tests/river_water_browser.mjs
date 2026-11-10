import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';import assert from 'node:assert/strict';
const output=new URL('../docs/diagnostics/2026-11-10-water-fix/',import.meta.url);mkdirSync(output,{recursive:true});
const profile=mkdtempSync(join(tmpdir(),'ride-mapped-water-')),port=9355;
const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws,seq=0,errors=[],failed=[];const pending=new Map(),report=existsSync(new URL('browser-evidence.json',output))?JSON.parse(readFileSync(new URL('browser-evidence.json',output))):{};
function call(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function shot(file){await pause(250);const s=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(file,output),Buffer.from(s.data,'base64'));console.log('Captured '+file);}
async function mode(name){await js(`document.querySelector('[data-water="${name}"]').click()`);await pause(300);assert.equal(await js('__riverWater.snapshot().mode'),name);}
try{
 let tab;for(let i=0;i<80;i++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(150);}assert.ok(tab,'temporary Chrome available');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)failed.push({url:m.params.response.url,status:m.params.response.status});const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 for(const [site,name,focus] of [['01646500','potomac',[106.799751,247.963609]],['14105700','columbia',[212.749719,-226.368948]]].filter(s=>!process.argv[2]||s[0]===process.argv[2])){
  errors=[];failed=[];await call('Page.navigate',{url:`http://127.0.0.1:8783/stations/USGS-${site}-3d.html?day=2025-05-10&akSnow=off&water=mapped&waterVersion=1`});
  let state;for(let i=0;i<240;i++){
   await pause(700);state=await js(`({site:window.HT3D?.site,ready:window.__riverWater?.snapshot(),buildings:window.HT3?.BLD.n,status:document.getElementById('status')?.textContent})`);
   if(i%15===0)console.log(name+' '+JSON.stringify(state));
   if(state.ready?.ready&&state.buildings>0)break;
  }
  assert.ok(state.ready?.ready,'mapped river initializes: '+JSON.stringify({state,errors,failed}));assert.ok(state.buildings>0,'full detailed scene loads');
  assert.equal(state.ready.ground.invalidVertices,0);assert.ok(state.ready.ground.triangles>100);assert.equal(state.ready.measured.samples,96);
  assert.equal(await js('HT3.gWater.mesh.visible'),false);assert.equal(await js('HT3.tWater.mesh.visible'),false);
  await js("HT3.S2.playing=false;HT3.FC.on=false;HT3.act('drone');document.getElementById('river-water-control').open=false");
  await shot(`${name}-01-full-app.png`);
  await js(`(()=>{const style=document.createElement('style');style.textContent='body > *:not(canvas):not(#attr):not(#water-caption){display:none!important}#water-caption{position:fixed;top:12px;left:12px;z-index:1000;background:#071725ed;color:white;padding:10px 14px;border-radius:7px;font:14px Arial;pointer-events:none}';document.head.appendChild(style);const c=document.createElement('div');c.id='water-caption';document.body.appendChild(c);})()`);
  const caption=async t=>js(`document.getElementById('water-caption').textContent=${JSON.stringify(name+' · '+t)}`);
  await mode('original');await caption('Original flow/terrain estimate');await shot(`${name}-02-drone-original.png`);
  await mode('mapped');await caption('Mapped reference river · terrain-draped display, not flood extent');await shot(`${name}-03-drone-mapped.png`);
  await js(`(()=>{HT3.orbit.enableDamping=false;const y=HT3.gWater.geo.attributes.position.array[1]||0;HT3.orbit.target.set(${focus[0]},y,${focus[1]});HT3.camera.position.set(${focus[0]},y+460,${focus[1]}+10);HT3.orbit.update();})()`);
  await mode('original');await caption('Original flow/terrain estimate');await shot(`${name}-04-overhead-original.png`);
  await mode('mapped');await caption('Mapped reference river · islands retained');await shot(`${name}-05-overhead-mapped.png`);
  await mode('imagery');assert.equal(await js('__riverWater.layers.ground.mesh.visible'),false);assert.equal(await js('HT3.gWater.mesh.visible'),false);
  await caption('Aerial imagery only · same camera');await shot(`${name}-06-overhead-imagery.png`);
  await mode('mapped');await js("document.getElementById('rw-shore').click()");assert.equal(await js('__riverWater.layers.ground.line.visible'),true);await caption('Mapped banks and islands · same camera');await shot(`${name}-07-overhead-banks.png`);
  const before=await js('Array.from(__riverWater.layers.ground.mesh.geometry.attributes.position.array.slice(0,90))');
  await js("HT3.setDay(Math.round((Date.parse('2024-01-13T00:00:00Z')-Date.parse(HT3D.start+'T00:00:00Z'))/864e5));HT3.act('lead');HT3.act('model')");await pause(200);
  assert.deepEqual(await js('Array.from(__riverWater.layers.ground.mesh.geometry.attributes.position.array.slice(0,90))'),before,'date changes do not invent historical shoreline');
  assert.equal(await js('__riverWater.snapshot().date'),'2024-01-13');assert.equal(await js('HT3.gWater.lines.fc.visible'),false);
  await js("HT3.act('fc')");await pause(350);assert.equal(await js('HT3.gWater.mesh.visible'),false);assert.equal(await js('HT3.gWater.lines.obs.visible'),false);await js("HT3.act('fc')");
  await js("document.getElementById('bTable').click()");await pause(200);assert.equal(await js('HT3.S2.mode'),'table');assert.equal(await js('__riverWater.layers.table.mesh.visible'),true);assert.equal(await js('HT3.tWater.mesh.visible'),false);await caption('Mapped reference river · tabletop');await shot(`${name}-08-table-mapped.png`);
  const geoBefore=await js('__riverWater.layers.table.mesh.geometry.uuid');await js("HT3.act('relief')");assert.notEqual(await js('__riverWater.layers.table.mesh.geometry.uuid'),geoBefore,'relief rebuilds mapped heights');
  await js("HT3.act('drone')");
  assert.deepEqual(errors,[],'no browser exceptions');report[site]={snapshot:await js('__riverWater.snapshot()'),errors,failed,checks:'Full app; 96 measured readings; mapped/original/imagery; banks; real date/model/lead/forecast actions; table/relief rebuild; unchanged mapped footprint across dates',capture:'1600x1000 Chrome software WebGL; desktop appearance only, no headset/performance claim'};
  writeFileSync(new URL('browser-evidence.json',output),JSON.stringify(report,null,2));console.log('PASS '+name);
 }
}catch(e){console.error(e);console.error({errors,failed});process.exitCode=1;}
finally{ws?.close();const stopped=child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await Promise.race([stopped,pause(4000)]);rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
