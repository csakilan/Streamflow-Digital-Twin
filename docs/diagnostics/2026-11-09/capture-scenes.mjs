import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
const profile=mkdtempSync(join(tmpdir(),'ride-diagnosis-')),port=9351;
const browser=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
 '--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
 `--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws,seq=0,errors=[],httpFailures=[],requestFailures=[];const pending=new Map(),evidence={};
function call(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function screenshot(file){await pause(350);const r=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(file,import.meta.url),Buffer.from(r.data,'base64'));console.log('Captured '+file);}
async function layers(mode){await js(`(()=>{const d=window.DIAG;for(const o of d.water)o.visible=(${JSON.stringify(mode)}==='all'||${JSON.stringify(mode)}==='water');for(const o of d.buildings)o.visible=(${JSON.stringify(mode)}==='all'||${JSON.stringify(mode)}==='buildings');document.getElementById('diagnostic-caption').textContent=d.title+' · '+(${JSON.stringify(mode)}==='all'?'Current water + buildings':${JSON.stringify(mode)}==='photo'?'Comparison: water and buildings hidden; original image unchanged':${JSON.stringify(mode)}==='buildings'?'Comparison: buildings on, generated water hidden':'Comparison: generated water on, buildings hidden');})()`);}
async function camera(x,z,height){await js(`(()=>{const c=HT3.camera,o=HT3.orbit;const y=HT3.gWater.geo.attributes.position.array[1]||0;o.enableDamping=false;o.target.set(${x},y,${z});c.position.set(${x},y+${height},${z}+10);o.update();})()`);}
try{
 let tab;for(let i=0;i<80;i++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(150);}if(!tab)throw Error('Temporary browser unavailable');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)httpFailures.push({url:m.params.response.url,status:m.params.response.status});if(m.method==='Network.loadingFailed')requestFailures.push({error:m.params.errorText,blocked:m.params.blockedReason??null});const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 const source=JSON.parse(readFileSync(new URL('source-metadata.json',import.meta.url),'utf8'));
 for(const [site,name,focus] of [['14105700','columbia',[212.749719,-226.368948]],['01646500','potomac',[106.799751,247.963609]]]){
  errors=[];httpFailures=[];requestFailures=[];
  const url=`http://127.0.0.1:8783/stations/USGS-${site}-3d.html?day=2025-05-10&akSnow=off`;
  await call('Page.navigate',{url});const started=Date.now(),loading=[];let loaded=false;
  for(let k=0;k<180;k++){
   await pause(750);const s=await js(`({ready:!!window.HT3,site:window.HT3D?.site,status:document.getElementById('status')?.textContent,buildings:window.HT3?.BLD.n,waterReady:window.HT3?.floods.ground,wetCells:window.HT3?.gWater.wetCount})`);
   if(k%12===0){loading.push({seconds:(Date.now()-started)/1000,...s});console.log(name+' '+JSON.stringify(loading.at(-1)));}
   if(s.site===site&&s.buildings>0&&s.waterReady){loaded=true;break;}
  }
  if(!loaded)throw Error(name+' incomplete: '+JSON.stringify({loading,httpFailures,errors}));
  await pause(1000);await js("HT3.S2.playing=false;HT3.FC.on=false;HT3.act('drone');");await screenshot(`${name}-01-original-drone.png`);
  const state=await js(`(()=>{const root=HT3.gWater.mesh.parent,buildings=root.children.filter(o=>o.isMesh&&o.material?.vertexColors===true),water=root.children.filter(o=>o.isMesh&&!!o.material?.normalMap);water.push(...Object.values(HT3.gWater.lines).filter(o=>o.visible));window.DIAG={root,buildings,water,title:HT3D.short+' · 2025-05-10'};return {renderedBuildings:HT3.BLD.n,buildingMeshes:buildings.length,waterMeshes:water.length,camera:HT3.camera.position.toArray(),target:HT3.orbit.target.toArray(),terrainReference:HT3.REFE,terrainRange:HT3.elevRange,flowCfs:HT3D.flow[HT3.S2.day],date:new Date(Date.parse(HT3D.start+'T00:00:00Z')+HT3.S2.day*864e5).toISOString().slice(0,10),relativeWaterLevelM:HT3.curDH,wetCells:HT3.gWater.wetCount,waterGrid:HT3.gWater.N,rootMeshes:root.children.filter(o=>o.isMesh).map(o=>({vertices:o.geometry.attributes.position?.count,hasImage:!!o.material.map,imageSize:o.material.map?[o.material.map.image.width,o.material.map.image.height]:null,hasNormals:!!o.material.normalMap,vertexColors:!!o.material.vertexColors}))};})()`);
  if(state.buildingMeshes!==1)throw Error('Could not isolate building layer');
  await js(`(()=>{const style=document.createElement('style');style.id='diagnostic-hide-ui';style.textContent='body > *:not(canvas):not(#attr):not(#diagnostic-caption){display:none!important} #diagnostic-caption{position:fixed;top:12px;left:12px;z-index:20000;background:#071725eb;color:white;padding:10px 14px;border-radius:7px;font:14px Arial;max-width:80vw;pointer-events:none}';document.head.appendChild(style);const caption=document.createElement('div');caption.id='diagnostic-caption';document.body.appendChild(caption);})()`);
  await layers('all');await screenshot(`${name}-02-clean-drone.png`);await layers('photo');await screenshot(`${name}-03-drone-imagery-only.png`);
  await camera(...focus,460);await layers('all');await screenshot(`${name}-04-overhead-current.png`);await layers('photo');await screenshot(`${name}-05-overhead-imagery-only.png`);await layers('buildings');await screenshot(`${name}-06-overhead-buildings-only.png`);
  await layers('all');await js("HT3.act('bank')");await screenshot(`${name}-07-riverbank-current.png`);await layers('photo');await screenshot(`${name}-08-riverbank-imagery-only.png`);
  evidence[site]={...source[site],url,loading,state,httpFailures:[...httpFailures],requestFailures:[...requestFailures],exceptions:[...errors],capture:{viewport:[1600,1000],renderer:'Chrome headless / SwiftShader; image diagnosis only; no movement-performance claims',date:'2025-05-10',layerComparison:'Diagnostic visibility toggles only; same camera between paired captures; imagery geometry unchanged',focusWorldXZ:focus}};
  writeFileSync(new URL('browser-evidence.json',import.meta.url),JSON.stringify(evidence,null,2));console.log('Finished '+name+' '+JSON.stringify({state,httpFailures,requestFailures,errors}));
 }
}catch(e){console.error(e);process.exitCode=1;}
finally{ws?.close();const stopped=browser.exitCode!==null?Promise.resolve():new Promise(resolve=>browser.once('exit',resolve));browser.kill('SIGTERM');await Promise.race([stopped,pause(4000)]);rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
