import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';
const profile=mkdtempSync(join(tmpdir(),'ride-snow-')),port=9343;
const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws,seq=0;const pending=new Map(),errors=[];function call(method,params={}){const id=++seq;return new Promise((res,rej)=>{pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}
async function ready(site,mode='historical'){for(let i=0;i<180;i++){if(await js(`!!window.__akSnow && __akSnow.snapshot().site==='${site}' && __akSnow.snapshot().mode==='${mode}'`))return;await pause(250);}throw Error('Snowfall component did not initialize: '+errors.join(';'));}
const output=new URL('../screenshots/',import.meta.url);mkdirSync(output,{recursive:true});
try{
 let tab;for(let i=0;i<100;i++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x=>x.type==='page');if(tab)break;}catch{}await pause(150);}assert.ok(tab);ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.rej(Error(m.error.message)):p.res(m.result);}};
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

 for(const [site,snowDate,snowCm,clearDate] of [['14105700','2024-01-13',9.24,'2024-01-15'],['01646500','2025-01-06',15.54,'2024-07-13']]){
  errors.length=0;
  await call('Page.navigate',{url:`http://127.0.0.1:8783/stations/USGS-${site}-3d.html?day=${snowDate}&snowVersion=2`});
  await ready(site);
  for(let i=0;i<200;i++){if(await js('!__akSnow.snapshot().historyLoading && __akSnow.snapshot().available'))break;await pause(150);}
  const snow=await js('__akSnow.snapshot()');
  assert.equal(snow.mode,'historical');assert.equal(snow.date,snowDate);assert.equal(snow.snowfallCm,snowCm);assert.equal(snow.active,true);assert.ok(snow.count>0);
  assert.equal(await js('__akSnow.points.visible'),true);
  assert.ok((await js('document.getElementById("ak-snow-status").textContent')).includes(String(snowCm)));
  // Exercise the real date input used by the user, rather than calling the snow API.
  await js(`document.getElementById('ht-date').value='${clearDate}';document.getElementById('ht-date').dispatchEvent(new Event('change'))`);
  const clear=await js('__akSnow.snapshot()');assert.equal(clear.date,clearDate);assert.equal(clear.snowfallCm,0);assert.equal(clear.active,false);assert.equal(clear.count,0);assert.equal(await js('__akSnow.points.visible'),false);
  // Return to a snowy day, then verify a real in-scene next-day action synchronizes weather.
  await js(`document.getElementById('ht-date').value='${snowDate}';document.getElementById('ht-date').dispatchEvent(new Event('change'))`);
  assert.equal(await js('__akSnow.snapshot().active'),true);
  for(let i=0;i<200;i++){if(await js('!!window.HT3'))break;await pause(150);}
  assert.equal(await js('!!window.HT3'),true,'River scene initializes');
  const nextDay=site==='14105700'?'2024-01-14':'2025-01-07';
  await js("HT3.act('next')");assert.equal(await js('__akSnow.snapshot().date'),nextDay);
  // Forecast lead/model controls must not turn historical weather into future weather.
  const beforeLead=await js('__akSnow.snapshot()');await js("HT3.act('lead')");
  assert.equal(await js('__akSnow.snapshot().date'),beforeLead.date);assert.equal(await js('__akSnow.snapshot().snowfallCm'),beforeLead.snowfallCm);
  await js(`HT3.setDay(Math.round((Date.parse('${snowDate}T00:00:00Z')-Date.parse(HT3D.start+'T00:00:00Z'))/86400000));HT3.act('bank');document.getElementById('ak-snow-widget').open=true;`);
  await pause(350);const a=await js('Array.from(__akSnow.points.geometry.attributes.position.array.slice(0,18))');await pause(350);const b=await js('Array.from(__akSnow.points.geometry.attributes.position.array.slice(0,18))');assert.notDeepEqual(a,b,'Snow particles actually animate');
  const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(`snow-data-${site}.png`,output),Buffer.from(shot.data,'base64'));
  // Explicit preview remains a manual override, and returning to data removes it on a clear day.
  await js("__akSnow.setMode('preview')");await js(`document.getElementById('ht-date').value='${clearDate}';document.getElementById('ht-date').dispatchEvent(new Event('change'))`);
  assert.equal(await js('__akSnow.snapshot().active'),true);assert.equal(await js('__akSnow.snapshot().preview'),true);
  await js("__akSnow.setMode('historical')");assert.equal(await js('__akSnow.snapshot().active'),false);assert.equal(await js('__akSnow.snapshot().preview'),false);
  await js("__akSnow.setDate('1990-01-01')");assert.equal(await js('__akSnow.snapshot().available'),false);assert.equal(await js('__akSnow.points.visible'),false);
  await js("__akSnow.setMode('off')");assert.equal(await js('__akSnow.snapshot().count'),0);
  assert.deepEqual(errors,[]);
  console.log('PASS '+site+': default uses date data; snow/clear/missing dates; date-input and in-scene navigation; lead independence; animated particles; explicit preview; screenshot');
 }
}catch(e){console.error(e);console.error(errors);process.exitCode=1;}
finally{ws?.close();const stopped=child.exitCode!==null?Promise.resolve():new Promise(res=>child.once('exit',res));child.kill('SIGTERM');await Promise.race([stopped,pause(5000)]);rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
