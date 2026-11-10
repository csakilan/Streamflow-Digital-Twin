import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';
const profile=mkdtempSync(join(tmpdir(),'ride-snow-')),port=9343;
const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws,seq=0;const pending=new Map(),errors=[];function call(method,params={}){const id=++seq;return new Promise((res,rej)=>{pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function ready(site,mode='off'){for(let i=0;i<180;i++){if(await js(`!!window.__akSnow && __akSnow.snapshot().site==='${site}' && __akSnow.snapshot().mode==='${mode}'`))return;await pause(250);}throw Error('Snowfall component did not initialize: '+errors.join(';'));}
const output=new URL('../docs/diagnostics/2026-11-10-data-space-restoration/',import.meta.url);mkdirSync(output,{recursive:true});
try{
 let tab;for(let i=0;i<100;i++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x=>x.type==='page');if(tab)break;}catch{}await pause(150);}assert.ok(tab);ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.rej(Error(m.error.message)):p.res(m.result);}};
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 for(const site of ['01646500','14105700']){
  await call('Page.navigate',{url:`http://127.0.0.1:8783/river-twin/data-space/?station=${site}&engineTest=1`});
  let loaded=false;for(let k=0;k<120;k++){if(await js(`window.SPATIAL?.ready===true && SPATIAL.site==='${site}'`)){loaded=true;break;}await pause(150);}
  assert.ok(loaded,'Spatial workspace loads '+errors.join(';'));
  assert.equal(await js('SPATIAL.panels.filter(Boolean).length'),3);
  const initial=await js('SPATIAL.comparison.targetDate');
  const chartClick=await js(`(()=>{const p=SPATIAL.panels[1],v=p.root.position.clone();v.set(-.25,.05,0);p.root.localToWorld(v);v.project(SPATIAL.camera);const r=document.getElementById('space').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};})()`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:chartClick.x,y:chartClick.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:chartClick.x,y:chartClick.y,button:'left',clickCount:1});
  assert.equal(await js('SPATIAL.comparison.targetDate'),initial,'Clicking a chart focuses it without changing the shared date');
  const menu=await js(`(()=>{const m=SPATIAL.toolbarButtons[3].mesh;m.updateWorldMatrix(true,false);const v=m.getWorldPosition(SPATIAL.camera.position.clone()).project(SPATIAL.camera),r=document.getElementById('space').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};})()`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:menu.x,y:menu.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:menu.x,y:menu.y,button:'left',clickCount:1});assert.equal(await js('SPATIAL.state.get().slots[1].type'),'drivers');
  await js('document.getElementById("variable").value="snow";document.getElementById("variable").dispatchEvent(new Event("change"))');
  await js('document.getElementById("expand").click()');assert.equal(await js('SPATIAL.state.get().slots[1].expanded'),true);assert.equal(await js('SPATIAL.comparison.targetDate'),initial);
  await js('document.getElementById("minimize").click()');assert.equal(await js('SPATIAL.state.get().slots[1].minimized'),true);await js('document.getElementById("minimize").click()');
  await js('document.getElementById("close").click()');assert.equal(await js('SPATIAL.panels.filter(Boolean).length'),2);
  await js('document.querySelector("[data-panel=models]").click()');assert.equal(await js('SPATIAL.panels.filter(Boolean).length'),3);
  await js('document.getElementById("reset").click();document.getElementById("variable").value="rain7";document.getElementById("variable").dispatchEvent(new Event("change"));');
  const drag=await js(`(()=>{const p=SPATIAL.panels[0],v=p.root.position.clone();v.set(-.35,.60,0);p.root.localToWorld(v);v.project(SPATIAL.camera);const r=document.getElementById('space').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,original:p.root.position.toArray()};})()`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:drag.x,y:drag.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:drag.x+70,y:drag.y+35,button:'left',buttons:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:drag.x+70,y:drag.y+35,button:'left',clickCount:1});
  assert.notDeepEqual(await js('SPATIAL.panels[0].root.position.toArray()'),drag.original,'Dragging title moves a panel');await js('document.getElementById("reset").click()');
  await pause(600);const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(`space-${site}.png`,output),Buffer.from(shot.data,'base64'));
  await js('document.querySelector("[data-panel=graph]").click()');assert.equal(await js('SPATIAL.panels[1].type'),'graph');assert.ok(await js('SPATIAL.panels[1].graph.getTargets().length>0'));
  const graphDrag=await js(`(()=>{const p=SPATIAL.panels[1],v=p.root.position.clone();v.set(0,.10,0);p.root.localToWorld(v);v.project(SPATIAL.camera);const r=document.getElementById('space').getBoundingClientRect(),q=p.graph.group.quaternion.clone();p.graph.group.getWorldQuaternion(q);return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,orientation:q.toArray(),camera:SPATIAL.camera.position.toArray(),panel:p.root.position.toArray()};})()`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:graphDrag.x,y:graphDrag.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:graphDrag.x+140,y:graphDrag.y+90,button:'left',buttons:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:graphDrag.x+140,y:graphDrag.y+90,button:'left',clickCount:1});await pause(300);
  assert.notDeepEqual(await js('(()=>{const p=SPATIAL.panels[1],q=p.graph.group.quaternion.clone();p.graph.group.getWorldQuaternion(q);return q.toArray();})()'),graphDrag.orientation,'Dragging the graph rotates the graph');
  assert.deepEqual(await js('SPATIAL.camera.position.toArray()'),graphDrag.camera,'Graph drag leaves the workspace camera still');assert.deepEqual(await js('SPATIAL.panels[1].root.position.toArray()'),graphDrag.panel);assert.equal(await js('SPATIAL.comparison.targetDate'),initial,'Graph drag preserves the selected date');
  await js('document.getElementById("reset-graph").click()');
  assert.deepEqual(await js('(()=>{const p=SPATIAL.panels[1],q=p.graph.group.quaternion.clone();p.graph.group.getWorldQuaternion(q);return q.toArray();})()'),graphDrag.orientation,'Reset graph restores its initial view');
  for(const axis of ['horizontal','vertical']){
   await call('Input.dispatchMouseEvent',{type:'mousePressed',x:graphDrag.x,y:graphDrag.y,button:'left',clickCount:1});let halfway;
   for(let step=1;step<=12;step++){await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:graphDrag.x+(axis==='horizontal'?step*50:0),y:graphDrag.y+(axis==='vertical'?step*30:0),button:'left',buttons:1});if(step===8)halfway=await js('SPATIAL.panels[1].graphPivot.quaternion.toArray()');}
   await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:graphDrag.x+(axis==='horizontal'?600:0),y:graphDrag.y+(axis==='vertical'?360:0),button:'left',clickCount:1});
   const finish=await js('SPATIAL.panels[1].graphPivot.quaternion.toArray()');assert.ok(Math.abs(finish.reduce((sum,v,i)=>sum+v*halfway[i],0))<.85,axis+' rotation continues beyond a half-turn without clamping');
   assert.equal(await js('SPATIAL.comparison.targetDate'),initial);await js('document.getElementById("reset-graph").click()');
  }
  await pause(400);const graphShot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(`space-graph-${site}.png`,output),Buffer.from(graphShot.data,'base64'));
  await js('document.getElementById("next").click()');assert.notEqual(await js('SPATIAL.comparison.targetDate'),initial);
  await js('document.querySelector("[data-panel=correlation]").click()');assert.equal(await js('SPATIAL.panels[1].type'),'correlation');
  await pause(400);const shot2=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(`space-relations-${site}.png`,output),Buffer.from(shot2.data,'base64'));
  const selectedDate=await js('SPATIAL.comparison.targetDate');
  for(const [index,type] of [[7,'seasonal'],[8,'accuracy']]){
   if(type==='accuracy'){
    const area=await js(`(()=>{const p=SPATIAL.panels[2],v=p.root.position.clone();v.set(0,.10,0);p.root.localToWorld(v);v.project(SPATIAL.camera);return {x:(v.x+1)*720,y:(1-v.y)*450};})()`);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x:area.x,y:area.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:area.x,y:area.y,button:'left',clickCount:1});
   }
   const launch=await js(`(()=>{const m=SPATIAL.toolbarButtons[${index}].mesh;m.updateWorldMatrix(true,false);const v=m.getWorldPosition(SPATIAL.camera.position.clone()).project(SPATIAL.camera);return {x:(v.x+1)*720,y:(1-v.y)*450};})()`);
   await call('Input.dispatchMouseEvent',{type:'mousePressed',x:launch.x,y:launch.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:launch.x,y:launch.y,button:'left',clickCount:1});
   assert.equal(await js('SPATIAL.panels[SPATIAL.state.get().active].type'),type,'Spatial launch action opens '+type);assert.equal(await js('SPATIAL.comparison.targetDate'),selectedDate);
  }
  assert.ok(await js('SPATIAL.panels[1].meta.summary.count>0'));assert.equal(await js('SPATIAL.panels[1].meta.summary.observedCfs'),await js('SPATIAL.comparison.observedCfs'));
  assert.equal(await js('SPATIAL.panels[2].meta.summary.rows.length'),7);assert.equal(await js('SPATIAL.panels[2].meta.summary.to'),await js('SPATIAL.state.get().selection.issueIndex'),'Accuracy window ends on issue date');
  const accuracyBefore=await js('SPATIAL.panels[2].meta.summary'),tableBefore=await js('SPATIAL.panels[2].canvas.toDataURL()');
  await js('document.getElementById("lead").value="7";document.getElementById("lead").dispatchEvent(new Event("change"))');
  assert.deepEqual(await js('SPATIAL.panels[2].meta.summary'),accuracyBefore,'Changing lead preserves every accuracy statistic and the window');assert.equal(await js('SPATIAL.panels[2].canvas.toDataURL()'),tableBefore,'Changing lead leaves the displayed accuracy table unchanged');
  await js('document.getElementById("lead").value="4";document.getElementById("lead").dispatchEvent(new Event("change"))');
  await js('document.getElementById("next").click()');assert.equal(await js('SPATIAL.panels[2].meta.summary.to'),accuracyBefore.to+1,'Changing issue date moves the accuracy window');
  await js('document.getElementById("previous").click()');assert.deepEqual(await js('SPATIAL.panels[2].meta.summary'),accuracyBefore);
  await js('document.getElementById("model").value="2";document.getElementById("model").dispatchEvent(new Event("change"))');assert.equal(await js('SPATIAL.panels[2].meta.summary.modelIndex'),2);assert.equal(await js('SPATIAL.comparison.targetDate'),selectedDate);
  await js('document.getElementById("model").value="0";document.getElementById("model").dispatchEvent(new Event("change"))');
  await pause(400);const tables=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(`space-seasonal-accuracy-${site}.png`,output),Buffer.from(tables.data,'base64'));
  await js('SPATIAL.change({modelIndex:2,lead:3,variable:"soil8"})');
  const shared=await js('SPATIAL.state.get().selection');
  await js('document.getElementById("river-link").click()');
  let riverReady=false;for(let i=0;i<100;i++){if(await js(`window.__riverTrial?.snapshot().site==='${site}'`)){riverReady=true;break;}await pause(100);}assert.ok(riverReady,'Return link opens the standalone landscape');
  const river=await js('__riverTrial.snapshot()');assert.equal(river.selection.issueIndex,shared.issueIndex);assert.equal(river.selection.lead,shared.lead);assert.equal(river.selection.modelIndex,shared.modelIndex);assert.equal(river.graph.variable,shared.variable);
  assert.equal(await js("new URLSearchParams(location.search).get('engineTest')"),'1');
  const other=site==='01646500'?'14105700':'01646500';
  await js(`document.getElementById('station').value='${other}';document.getElementById('station').dispatchEvent(new Event('change'))`);
  for(let i=0;i<100;i++){if(await js(`window.__riverTrial?.snapshot().site==='${other}'`))break;await pause(100);}
  const changedStation=await js('__riverTrial.snapshot()');assert.equal(changedStation.site,other);assert.equal(changedStation.selection.modelIndex,shared.modelIndex);assert.equal(changedStation.selection.lead,shared.lead);assert.equal(changedStation.graph.variable,shared.variable);
  await js(`document.getElementById('station').value='${site}';document.getElementById('station').dispatchEvent(new Event('change'))`);
  for(let i=0;i<100;i++){if(await js(`window.__riverTrial?.snapshot().site==='${site}'`))break;await pause(100);}
  await js("document.getElementById('disconnect').click()");assert.equal(await js("new URL(document.getElementById('data-space-link').href).searchParams.get('manualAuth')"),'1','Explicit disconnect survives navigation');
  await js('document.getElementById("data-space-link").click()');
  let back=false;for(let i=0;i<100;i++){if(await js('window.SPATIAL?.ready===true')){back=true;break;}await pause(100);}assert.ok(back,'Data Space is reachable from the landscape');assert.deepEqual(await js('SPATIAL.state.get().selection'),shared,'Round trip preserves every shared selection field');
  assert.deepEqual(errors,[]);console.log('PASS '+site+': seasonal/lead tables launch in separate areas, target/model synchronization, chart clicks preserve dates, independent graph rotation/reset, panel controls, screenshots');
 }
 await call('Page.navigate',{url:'http://127.0.0.1:8783/river-twin/data-space/?station=14105700&engineTest=1&emulateXR=1'});
 let xrReady=false;for(let i=0;i<100;i++){if(await js("window.SPATIAL?.ready&&document.getElementById('enter-vr')?.textContent.includes('ENTER')")){xrReady=true;break;}await pause(100);}assert.ok(xrReady,'Data Space XR emulator is ready');
 await js("document.getElementById('enter-vr').click()");let immersive=false;for(let i=0;i<100;i++){if(await js('SPATIAL.renderer.xr.isPresenting')){immersive=true;break;}await pause(100);}assert.ok(immersive,'Data Space enters immersive mode');assert.equal(await js('SPATIAL.riverButton.visible'),true,'World-space return control is available in VR');
 await js('void SPATIAL.riverButton.userData.action()');let returned=false;for(let i=0;i<100;i++){if(await js("window.__riverTrial?.snapshot().site==='14105700'")){returned=true;break;}await pause(100);}assert.ok(returned,'World-space return exits XR and opens the river landscape');
 assert.deepEqual(errors,[]);console.log('PASS Data Space emulated XR and world-space return navigation');
}catch(e){console.error(e);console.error(errors);process.exitCode=1;}
finally{ws?.close();const stopped=child.exitCode!==null?Promise.resolve():new Promise(res=>child.once('exit',res));child.kill('SIGTERM');await Promise.race([stopped,pause(5000)]);rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
