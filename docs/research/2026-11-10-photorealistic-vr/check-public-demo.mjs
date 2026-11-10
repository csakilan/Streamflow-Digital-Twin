import {spawn} from 'node:child_process';import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {setTimeout as pause} from 'node:timers/promises';
const profile=mkdtempSync(join(tmpdir(),'ride-public-3d-')),port=9360,child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws,id=0;const pending=new Map(),responses=[],result={source:'Public NASA-AMMOS renderer demonstration, used through its hosted UI. No credential was extracted or reused.',date:'2026-11-10'};
function call(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true});return r.result?.value;}
try{
 let tab;for(let k=0;k<60;k++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(150);}if(!tab)throw Error('Temporary browser unavailable');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Network.responseReceived'){const p=m.params.response;const u=new URL(p.url);if(/googleapis.com|cesium.com|cesium.com/.test(u.hostname))responses.push({host:u.hostname,path:u.pathname,status:p.status});}const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 for(const [site,lat,lon] of [['potomac',38.94977778,-77.12763889],['columbia',45.60827778,-121.1899167]]){
  const start=responses.length;
  if(site==='potomac'){await call('Page.navigate',{url:'https://nasa-ammos.github.io/3DTilesRendererJS/three/googleMapsAerial.html'});await pause(8000);}await js(`location.hash='${lat},${lon}'`);
  await pause(18000);
  const r=responses.slice(start);const failed=r.filter(x=>x.status>=400);
  const state=await js(`({title:document.title,canvas:!!document.querySelector('canvas'),text:document.body.innerText.slice(0,1800),hash:location.hash})`);
  const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(`${site}-public-demo.png`,import.meta.url),Buffer.from(shot.data,'base64'));
  result[site]={...state,providerResponseCount:r.length,providerHosts:[...new Set(r.map(x=>x.host))].sort(),failed};writeFileSync(new URL('public-demo-result.json',import.meta.url),JSON.stringify(result,null,2));console.log(site,JSON.stringify({canvas:state?.canvas,text:state?.text,requests:r.length,failed}));
  if(failed.length){result[site].conclusion='Public demonstration access failed; geographic coverage is unverified.';break;}
 }
}catch(e){console.error(e.message);result.error=e.message;}
finally{writeFileSync(new URL('public-demo-result.json',import.meta.url),JSON.stringify(result,null,2));ws?.close();child.kill('SIGTERM');await pause(1500);rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
