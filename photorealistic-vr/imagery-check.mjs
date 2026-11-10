// Optional authenticated visual check. A credential enters through stdin only;
// it is never a command argument, environment variable, output or saved config.
import {spawn} from 'node:child_process';import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {setTimeout as pause} from 'node:timers/promises';import assert from 'node:assert/strict';
const output=new URL(process.env.RIDE_IMAGERY_OUTPUT??'../docs/diagnostics/2026-11-10-view-detail/imagery/',import.meta.url);mkdirSync(output,{recursive:true});
const useLocalConfig=process.argv.includes('--local-config'),quick=process.argv.includes('--quick');
const redact=value=>String(value).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED]').replace(/AIza[A-Za-z0-9_-]{35}/g,'[REDACTED]').replace(/([?&](?:key|access_token|session|token)=)[^\s&"'<>]+/gi,'$1[REDACTED]');
const report={scope:'Authenticated local Potomac viewer; temporary Chrome with HTTP cache disabled; no real headset. Credentials and raw network URLs are never recorded.',date:'2026-11-10',views:{},network:{ionEndpoints:0,googleRoots:0,failedStatuses:{}}};
let credential='',ws,child,profile,id=0;const pending=new Map();
function call(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error('Browser evaluation failed during the visual check.');return r.result?.value;}
async function until(expression,label){for(let i=0;i<100;i++){if(await js(expression))return;await pause(150);}throw Error(label);}
async function settleView(){
 const deadline=Date.now()+60000;let quietSince=0;
 while(Date.now()<deadline){
  const s=await js('__riverTrial.snapshot()');if(s.connection.status==='error')throw Error(s.connection.message);
  const busy=(s.tiles?.queued??0)+(s.tiles?.downloading??0)+(s.tiles?.parsing??0);
  if(s.tiles?.loadedModels>0&&busy===0){if(!quietSince)quietSince=Date.now();if(Date.now()-quietSince>1800)return {condition:s.tiles.refused>0?'memory-limited':'no-pending-requests',snapshot:s};}else quietSince=0;
  await pause(600);
 }
 return {condition:'still-loading',snapshot:await js('__riverTrial.snapshot()')};
}
try{
 if(!useLocalConfig){
  console.log('Waiting for an imagery token on stdin. Disable terminal echo before entering it.');
  credential=await new Promise(resolve=>{let input='';process.stdin.setEncoding('utf8');function read(chunk){input+=chunk;if(input.includes('\n')){process.stdin.removeListener('data',read);process.stdin.pause();resolve(input.split(/\r?\n/)[0].trim());}}process.stdin.on('data',read);});
  if(credential.length<10||/\s/.test(credential))throw Error('No valid token supplied.');
 }
 profile=mkdtempSync(join(tmpdir(),'ride-authenticated-view-'));const port=9364;
 child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 let tab;for(let i=0;i<70;i++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x=>x.type==='page');if(tab)break;}catch{}await pause(150);}assert.ok(tab,'temporary browser starts');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{
  const m=JSON.parse(e.data);
  if(m.method==='Network.requestWillBeSent'){
   const u=new URL(m.params.request.url);
   if(u.hostname==='api.cesium.com'&&/\/assets\/2275207\/endpoint$/.test(u.pathname))report.network.ionEndpoints++;
   if(u.hostname==='tile.googleapis.com'&&u.pathname==='/v1/3dtiles/root.json')report.network.googleRoots++;
  }
  if(m.method==='Network.responseReceived'&&m.params.response.status>=400){const response=m.params.response,u=new URL(response.url),role=u.hostname==='api.cesium.com'?'access':u.hostname==='tile.googleapis.com'?'tiles':'local',code=role+':'+response.status;report.network.failedStatuses[code]=(report.network.failedStatuses[code]??0)+1;}
  const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('Browser command failed.')):p.resolve(m.result);}
 };
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:2,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:8783/photorealistic-vr/'+(useLocalConfig?'':'?manualAuth=1')});await until('!!window.__riverTrial','Local viewer did not start.');
 if(!useLocalConfig)await js(`document.querySelector('#credential').value=${JSON.stringify(credential)};document.querySelector('#connect-form').requestSubmit();`);credential='';
 await until("['ready','error'].includes(__riverTrial.snapshot().connection.status)",'Imagery connection timed out.');
 assert.equal(await js("document.querySelector('#credential').value"),'','credential input clears');
 if(await js("__riverTrial.snapshot().connection.status==='error'"))throw Error(await js('__riverTrial.snapshot().connection.message'));
 await js("if(!document.querySelector('#setup').hidden)document.querySelector('#setup-toggle').click()");
 await until('__riverTrial.snapshot().tiles?.visible>0','No visible imagery loaded.');
 for(const mode of (quick?['aerial']:['aerial','close','tabletop'])){
  await js(`document.querySelector('[data-view="${mode}"]').click()`);
  const state=quick?{condition:'connection-ready-only',snapshot:await js('__riverTrial.snapshot()')}:await settleView();report.views[mode]=state;
  assert.ok(state.snapshot.tiles.visible>0,'visible imagery exists');assert.equal(state.snapshot.connection.starts,1,'views preserve one connection');assert.deepEqual(state.snapshot.tiles.resolution,state.snapshot.renderSize,'tile detail follows physical pixels');assert.match(state.snapshot.credits,/Google Maps/);
  assert.equal(await js("document.querySelector('#google-logo').hidden"),false,'official logo visible');
  if(!quick){const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(mode+'.png',output),Buffer.from(shot.data,'base64'));}
  writeFileSync(new URL('imagery-evidence.json',output),redact(JSON.stringify(report,null,2)));
  console.log(JSON.stringify({view:mode,condition:state.condition,visibleTiles:state.snapshot.tiles.visible,cacheMB:state.snapshot.tiles.estimatedMB,refused:state.snapshot.tiles.refused,far:state.snapshot.range.far}));
 }
 assert.equal(report.network.ionEndpoints,1,'only one access-service initialization');assert.equal(report.network.googleRoots,1,'only one Google root request');
 await js("document.querySelector('#disconnect').click()");assert.equal(await js('__riverTrial.snapshot().connection.active'),false);
 report.result='PASS';report.accessSource=useLocalConfig?'local configuration':'stdin';report.quick=quick;console.log(quick?'PASS automatic local access and visible authenticated imagery.':'PASS authenticated imagery, credits, physical-pixel selection and connection reuse across all three views.');
}catch(error){report.result='FAIL';report.error=redact(error.message);console.error(report.error);process.exitCode=1;}
finally{credential='';writeFileSync(new URL('imagery-evidence.json',output),redact(JSON.stringify(report,null,2)));ws?.close();if(child){child.kill('SIGTERM');await pause(1200);}if(profile)rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
