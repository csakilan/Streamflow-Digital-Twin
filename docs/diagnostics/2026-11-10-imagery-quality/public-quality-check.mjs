// Observe the hosted public reference renderer; no credentials or tiles leave it.
// Diagnostic snapshots contain only rendering settings, counts and memory usage.
import {spawn} from 'node:child_process';import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {setTimeout as pause} from 'node:timers/promises';
const output=new URL('.',import.meta.url),profile=mkdtempSync(join(tmpdir(),'ride-quality-')),port=9363;
const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let ws,id=0;const pending=new Map(),report={date:'2026-11-10',scope:'Controlled quality settings inside the public NASA-AMMOS reference demo at Potomac. No credential was extracted or used by the local app.',samples:[]};
function call(method,params={}){const n=++id;return new Promise((resolve,reject)=>{pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function js(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result?.value;}
async function shot(name){const s=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(name+'.png',output),Buffer.from(s.data,'base64'));}
try{
 let tab;for(let k=0;k<60;k++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(150);}if(!tab)throw Error('Temporary browser unavailable');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'https://nasa-ammos.github.io/3DTilesRendererJS/three/googleMapsAerial.html'});await pause(8000);
 const instrumented=await js(`(async()=>{
   const q=window.__qualityReference={profile:'current',pose:'aerial',snapshot:null,poseRevision:0};
   const urls=[...new Set(performance.getEntriesByType('resource').map(x=>x.name).filter(x=>new URL(x).hostname==='nasa-ammos.github.io'&&new URL(x).pathname.endsWith('.js')))];
   const seen=new Set();let streaming=0,navigation=0;
   for(const url of urls){
     const exports=await import(url);
     for(const C of Object.values(exports)){
       const proto=typeof C==='function'?C.prototype:null;if(!proto||seen.has(proto))continue;seen.add(proto);
       if(typeof proto.setCamera==='function'&&typeof proto.getAttributions==='function'&&typeof proto.update==='function'){
         const update=proto.update;proto.update=function(...args){
           const detail=q.profile==='detail',room=q.profile==='room'||detail;
           this.errorTarget=detail?4:16;this.lruCache.minSize=150;this.lruCache.maxSize=room?1600:600;
           this.lruCache.minBytesSize=(room?256:80)*1024*1024;this.lruCache.maxBytesSize=(room?512:160)*1024*1024;
           const result=update.apply(this,args);const types=new Set(),textures=[];let triangles=0,visibleErrors=[];
           for(const tile of this.visibleTiles){visibleErrors.push(tile.traversal.error);tile.engineData?.scene?.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count??o.geometry.attributes.position?.count??0)/3;for(const material of Array.isArray(o.material)?o.material:[o.material]){types.add(material.type);if(material.map)textures.push({width:material.map.image?.width,height:material.map.image?.height,anisotropy:material.map.anisotropy});}});}
           q.snapshot={errorTarget:this.errorTarget,cacheMB:Math.round(this.lruCache.cachedBytes/1048576),cacheLimitMB:this.lruCache.maxBytesSize/1048576,cacheFull:this.lruCache.isFull(),refused:this.stats.refused??null,queued:this.stats.queued,downloading:this.stats.downloading,parsing:this.stats.parsing,failed:this.stats.failed,visible:this.visibleTiles.size,loaded:this.stats.loaded,triangles:Math.round(triangles),materialTypes:[...types],textureCount:textures.length,maxTextureWidth:Math.max(0,...textures.map(t=>t.width??0)),anisotropy:[...new Set(textures.map(t=>t.anisotropy))],maxVisibleError:Math.max(0,...visibleErrors),registeredResolution:this.cameras[0]?this.getResolution(this.cameras[0],{copy(v){return {x:v.x,y:v.y};}}):null};
           return result;
         };streaming++;
       }
       if(typeof proto.getPolarAngle==='function'&&typeof proto.update==='function'){
         const update=proto.update;proto.update=function(...args){
           this.autoRotate=false;
           if(this.__qualityPose!==q.poseRevision){this.__qualityPose=q.poseRevision;this.minDistance=100;this.target.set(0,40,0);this.object.position.set(...(q.pose==='close'?[240,180,240]:[500,500,500]));}
           return update.apply(this,args);
         };navigation++;
       }
     }
   }
   location.hash='38.94977778,-77.12763889';return {streaming,navigation};
 })()`);report.instrumented=instrumented;console.log('Reference instrumentation',instrumented);if(!instrumented.streaming||!instrumented.navigation)throw Error('Reference module types unavailable');
 for(const [name,profile,pose,wait] of [['01-current-aerial','current','aerial',15000],['02-current-close','current','close',12000],['03-more-cache','room','close',12000],['04-finer-detail','detail','close',16000]]){
   await js(`__qualityReference.profile='${profile}';__qualityReference.pose='${pose}';__qualityReference.poseRevision++`);await pause(wait);
   const value=await js(`({name:'${name}',profile:__qualityReference.profile,pose:__qualityReference.pose,...__qualityReference.snapshot,credits:document.getElementById('credits')?.innerText})`);
   report.samples.push(value);await shot(name);writeFileSync(new URL('public-quality-evidence.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(value));
 }
 report.result='MEASUREMENTS_CAPTURED';
}catch(error){report.result='INCOMPLETE';report.error=error.message;console.error(error.message);}
finally{writeFileSync(new URL('public-quality-evidence.json',output),JSON.stringify(report,null,2));ws?.close();child.kill('SIGTERM');await pause(1200);rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});}
