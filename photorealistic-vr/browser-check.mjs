import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';import assert from 'node:assert/strict';
const output=new URL('../docs/diagnostics/2026-11-10-photorealistic-vr/',import.meta.url);mkdirSync(output,{recursive:true});
const profile=mkdtempSync(join(tmpdir(),'ride-vr-trial-')),port=9362;
const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws,id=0;const pending=new Map(),exceptions=[],report={date:'2026-11-10',scope:'Synthetic local tiles and desktop WebXR emulation. No real imagery credentials or headset used.'};
function call(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;}
async function until(expression,message){for(let k=0;k<100;k++){if(await js(expression))return;await pause(100);}throw Error(message);}
async function shot(file){await pause(250);const s=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(file,output),Buffer.from(s.data,'base64'));}
async function clickXY([x,y]){await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await pause(100);}
async function clickPanel(action){const target=await js(`__riverTrial.targets().find(x=>x.id==='${action}').screen`);await clickXY(target);}
try{
 let tab;for(let k=0;k<60;k++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(150);}assert.ok(tab,'temporary browser available');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{
   const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.text);
   if(m.method==='Fetch.requestPaused')call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:403,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from('{"error":{"code":403,"message":"Test denied"}}').toString('base64')}).catch(()=>{});
   const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
 };
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1500,height:1000,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:8783/photorealistic-vr/'});
 await until('!!window.__riverTrial','viewer starts');assert.equal(await js('__riverTrial.snapshot().connection.starts'),0);
 await shot('01-token-entry.png');report.default=await js('__riverTrial.snapshot()');
 // Intercept, rather than send, the fake credential to exercise the real error UI.
 await call('Fetch.enable',{patterns:[{urlPattern:'https://tile.googleapis.com/*'}]});
 await js("document.querySelector('#provider').value='google';document.querySelector('#provider').dispatchEvent(new Event('change'));document.querySelector('#credential').value='not-a-real-credential';document.querySelector('#connect-form').requestSubmit()");
 await until("__riverTrial.snapshot().connection.status==='error'",'denied imagery request reaches safe error UI');
 assert.equal(await js("document.querySelector('#credential').value"),'');assert.equal(await js("JSON.stringify(__riverTrial.snapshot()).includes('not-a-real-credential')"),false);
 assert.match(await js("document.querySelector('#status-detail').textContent"),/denied|access/i);report.authFailure=await js('__riverTrial.snapshot().connection');
 await js("document.querySelector('#disconnect').click()");assert.equal(await js('__riverTrial.snapshot().connection.active'),false);
 await call('Fetch.disable');
 await call('Page.navigate',{url:'http://127.0.0.1:8783/photorealistic-vr/?engineTest=1'});
 await until("window.__riverTrial?.snapshot().connection.status==='ready'",'local tiles load');
 assert.equal(await js('__riverTrial.snapshot().tiles.loadedModels'),1);
 const before=await js('__riverTrial.snapshot()');await clickPanel('lead');assert.equal(await js('__riverTrial.snapshot().selection.lead'),2);
 await clickPanel('next');assert.equal(await js('__riverTrial.snapshot().selection.issueIndex'),before.selection.issueIndex+1);
 await clickPanel('model');assert.equal(await js('__riverTrial.snapshot().selection.modelIndex'),1);
 const paired=await js('__riverTrial.snapshot().comparison');assert.equal(paired.targetIndex,paired.issueIndex+paired.lead);
 const stable=await js('__riverTrial.snapshot().selection');await clickPanel('body');assert.deepEqual(await js('__riverTrial.snapshot().selection'),stable,'body click does not change dates');
 await clickPanel('minimize');assert.equal(await js('__riverTrial.snapshot().panel.minimized'),true);await clickPanel('minimize');
 const position=await js('__riverTrial.snapshot().panel.position'),header=await js("__riverTrial.targets().find(x=>x.id==='header').screen");
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:header[0],y:header[1],button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:header[0]-110,y:header[1]+70,button:'left',buttons:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:header[0]-110,y:header[1]+70,button:'left',clickCount:1});
 assert.notDeepEqual(await js('__riverTrial.snapshot().panel.position'),position,'mouse drags actual world panel');
 await js("document.querySelector('#reset-panel').click()");
 for(const mode of ['close','tabletop','aerial']){await js(`document.querySelector('[data-view="${mode}"]').click()`);await pause(250);assert.equal(await js('__riverTrial.snapshot().view'),mode);}
 assert.equal(await js('__riverTrial.snapshot().connection.starts'),1,'all actions reuse one tileset');await shot('02-engine-test-panel.png');report.desktop=await js('__riverTrial.snapshot()');
 await call('Page.navigate',{url:'http://127.0.0.1:8783/photorealistic-vr/?engineTest=1&emulateXR=1'});
 await until("window.__riverTrial?.snapshot().connection.status==='ready'&&document.querySelector('#VRButton')?.textContent.includes('ENTER')",'XR emulator and button ready');
 await js("document.querySelector('#VRButton').click()");await until('__riverTrial.snapshot().xr','immersive XR starts');await pause(600);
 const xr=await js('__riverTrial.snapshot()');assert.equal(xr.tiles.stereo,true);assert.equal(xr.tiles.cameraCount,1);assert.equal(xr.creditsVisible,true);
 // Aim a real emulated controller ray at the world-space lead control.
 await js(`(async()=>{const T=await import('three'),target=__riverTrial.targets().find(x=>x.id==='lead').world;const controller=__xrEmulator.controllers.right;controller.position.set(.25,1.4,-.3);const direction=new T.Vector3(...target).sub(new T.Vector3(.25,1.4,-.3)).normalize();const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,-1),direction);controller.quaternion.set(q.x,q.y,q.z,q.w);})()`);
 await pause(200);const leadBefore=await js('__riverTrial.snapshot().selection.lead');await js("__xrEmulator.controllers.right.updateButtonValue('trigger',1)");await pause(150);await js("__xrEmulator.controllers.right.updateButtonValue('trigger',0)");await pause(200);
 assert.equal(await js('__riverTrial.snapshot().selection.lead'),leadBefore+1,'controller ray selects panel action');
 await js(`(async()=>{const T=await import('three'),target=__riverTrial.targets().find(x=>x.id==='header').world;const c=__xrEmulator.controllers.right;const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,-1),new T.Vector3(...target).sub(new T.Vector3(c.position.x,c.position.y,c.position.z)).normalize());c.quaternion.set(q.x,q.y,q.z,q.w);})()`);
 await pause(200);await js("__xrEmulator.controllers.right.updateButtonValue('squeeze',1)");await pause(200);assert.equal(await js('__riverTrial.snapshot().panel.dragging'),true);
 const grab=await js('__riverTrial.snapshot().panel.position');await js('__xrEmulator.controllers.right.position.x+=.2');await pause(200);assert.notDeepEqual(await js('__riverTrial.snapshot().panel.position'),grab);
 await js("__xrEmulator.controllers.right.updateButtonValue('squeeze',0)");await pause(200);assert.equal(await js('__riverTrial.snapshot().panel.dragging'),false);
 report.xr=await js('__riverTrial.snapshot()');await shot('03-emulated-xr.png');
 await js('__xrEmulator.activeSession.end()');await until('!__riverTrial.snapshot().xr','XR exits');assert.equal(await js('__riverTrial.snapshot().tiles.stereo'),false);assert.equal(await js('__riverTrial.snapshot().connection.starts'),1);
 assert.deepEqual(exceptions,[],'no uncaught browser errors');report.result='PASS';report.checks=['No-key startup makes zero provider connections','Intercepted 403 is actionable; credential input clears and snapshots are clean','Actual 3D Tiles GLTF loads in ECEF/local frame','Mouse buttons, minimize and drag','View/data changes retain one tileset','WebXR stereo camera, controller ray action and grip dragging','XR exit restores desktop camera'];
 console.log('PASS local tiles, data pairing, mouse interaction, denied access and emulated XR controller interaction.');
}catch(error){report.result='FAIL';report.error=error.message;console.error(error.stack);await shot('failure.png').catch(()=>{});process.exitCode=1;}
finally{report.exceptions=exceptions;writeFileSync(new URL('browser-evidence.json',output),JSON.stringify(report,null,2));ws?.close();child.kill('SIGTERM');await pause(1200);rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
