import {snowState,historicalWeather} from './policy.mjs?v=2';

export function createSnowfall({THREE,scene,camera,renderer,site,latitude,longitude,getDate,getView,getGroundY,onChange}){
 const maxCount=1200,positions=new Float32Array(maxCount*3),speed=new Float32Array(maxCount),phase=new Float32Array(maxCount);
 let seed=Number(site)||7;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<maxCount;i++){positions[i*3]=random()-.5;positions[i*3+1]=random()-.5;positions[i*3+2]=random()-.5;speed[i]=.6+random()*.65;phase[i]=random()*Math.PI*2;}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,31);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.35,'rgba(255,255,255,.92)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const texture=new THREE.CanvasTexture(canvas),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const material=new THREE.PointsMaterial({color:'#f3faff',map:texture,transparent:true,opacity:.85,depthWrite:false,depthTest:true,sizeAttenuation:true,toneMapped:false,alphaTest:.02});
 const points=new THREE.Points(geometry,material);points.name='AkilanSnowfall';points.frustumCulled=false;points.visible=false;points.renderOrder=4;scene.add(points);
 const widget=document.createElement('details');widget.id='ak-snow-widget';widget.innerHTML=`<summary id="ak-snow-summary">Snow: Selected date</summary><div class="ak-snow-body"><label>Snowfall mode<select id="ak-snow-mode"><option value="historical">Selected date · historical data</option><option value="off">Off</option><option value="preview">Preview snow · manual demo</option><option value="live">Live weather · today</option></select></label><label id="ak-snow-density-label">Preview intensity<input id="ak-snow-density" type="range" min="10" max="100" value="60"></label><p id="ak-snow-status" role="status"></p><small id="ak-snow-weather-time"></small><button id="ak-snow-refresh" type="button" hidden>Refresh weather</button><small>Historical mode follows the selected river date, including during forecast playback. Daily snowfall is an estimate near the gauge, not a gauge measurement or proof of snow all day. Animation density is illustrative. SWE measures existing snowpack and does not trigger falling snow.</small><small>Weather: <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">Open-Meteo / ERA5</a> · CC BY 4.0<br>Snowfall animation: Akilan Chithra Sathish · UTD RIDE</small></div>`;document.body.appendChild(widget);
 const el=id=>document.getElementById(id);let mode='historical',intensity=.6,weather=null,weatherTime='',weatherZone='',loading=false,error='',requestId=0,controller=null,timer=null,elapsed=0,destroyed=false;
 let archive=null,historyLoading=false,historyError='',historyController=null,selectedDate=getDate?.()??'';
 const origin=new THREE.Vector3(),direction=new THREE.Vector3();
 function state(){return snowState(mode,mode==='historical'?historicalWeather(archive,selectedDate):weather,intensity);}
 function show(){
  if(destroyed)return;const s=state();points.visible=s.active;geometry.setDrawRange(0,s.active?Math.round((renderer.xr.isPresenting?700:maxCount)*s.intensity):0);
  el('ak-snow-mode').value=mode;el('ak-snow-density-label').hidden=mode!=='preview';el('ak-snow-refresh').hidden=mode!=='live';
  el('ak-snow-summary').textContent=mode==='historical'?`Snow: ${historyLoading?'Loading data':s.available?(s.active?'Falling · ':'None · ')+selectedDate:'No data · '+selectedDate}`:mode==='preview'?'Snow: Preview':mode==='live'?(loading?'Snow: Checking weather':s.active?'Snow: Live snowfall':'Snow: Live weather'):'Snow: Off';
  el('ak-snow-status').textContent=mode==='historical'?(historyLoading?'Loading saved historical snowfall…':historyError||s.label):loading?'Checking current weather at this gauge…':error||s.label;
  el('ak-snow-status').classList.toggle('ak-preview-warning',mode==='preview');
  el('ak-snow-weather-time').textContent=mode==='historical'&&archive?`Source: ERA5 via Open-Meteo · daily total, ${archive.source.timezone}. Coverage: ${archive.start} – ${archive.end}.`:mode==='live'&&weatherTime?`Current weather-model time: ${weatherTime} ${weatherZone} · independent of the historical date`:'';
  queueMicrotask(()=>{if(!destroyed)onChange?.();});
 }
 async function loadHistory(){
  if(archive||historyLoading||destroyed)return;historyLoading=true;historyError='';historyController=new AbortController();const activeController=historyController,timeout=setTimeout(()=>activeController.abort(),15000);show();
  try{
   const r=await fetch(new URL(`./history/${site}.json?v=2`,import.meta.url),{signal:activeController.signal});
   if(!r.ok)throw Error('Historical snowfall unavailable');const j=await r.json();
   if(j.site!==site||j.schemaVersion!==1||!Number.isInteger(j.n)||j.snowfallCm?.length!==j.n||!j.source?.timezone)throw Error('Historical snowfall data invalid');
   if(!destroyed)archive=j;
  }catch(e){if(!destroyed){archive=null;historyError='Historical snowfall unavailable · snow hidden. Reload to retry.';}}
  finally{clearTimeout(timeout);historyLoading=false;show();}
 }
 function setDate(value){if(value===selectedDate)return;selectedDate=value;show();}
 async function refreshWeather(){
  if(mode!=='live'||destroyed)return;controller?.abort();controller=new AbortController();const activeController=controller,id=++requestId;loading=true;error='';show();const timeout=setTimeout(()=>activeController.abort(),15000);
  try{const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),current:'weather_code,temperature_2m',timezone:'auto'});const r=await fetch(url,{signal:activeController.signal});if(!r.ok)throw Error(`Weather service returned ${r.status}`);const j=await r.json();if(!Number.isFinite(j.current?.weather_code))throw Error('Weather code missing');if(id!==requestId||mode!=='live'||destroyed)return;weather=j.current;weatherTime=j.current.time??'';weatherZone=j.timezone??'';}
  catch(e){if(id!==requestId||mode!=='live'||destroyed)return;weather=null;weatherTime='';error='Live weather unavailable · snow hidden. Preview remains available.';}
  finally{clearTimeout(timeout);if(id===requestId&&!destroyed){loading=false;show();}}
 }
 function setMode(value){if(!['historical','off','preview','live'].includes(value))throw Error('Snowfall mode unavailable');controller?.abort();requestId++;loading=false;error='';mode=value;clearInterval(timer);timer=null;weather=null;weatherTime='';show();if(mode==='historical')loadHistory();if(mode==='live'){refreshWeather();timer=setInterval(refreshWeather,300000);}}
 function setIntensity(value){intensity=Math.max(.1,Math.min(1,Number(value)||.6));el('ak-snow-density').value=String(Math.round(intensity*100));show();}
 el('ak-snow-mode').onchange=e=>setMode(e.target.value);el('ak-snow-density').oninput=e=>setIntensity(+e.target.value/100);el('ak-snow-refresh').onclick=refreshWeather;
 function update(delta){const s=state();if(!s.active||destroyed||(document.hidden&&!renderer.xr.isPresenting))return;const dt=Math.min(.1,Math.max(0,delta));elapsed+=dt;geometry.setDrawRange(0,Math.round((renderer.xr.isPresenting?700:maxCount)*s.intensity));
  const view=getView(),ground=view==='ground',width=ground?110:2.2,height=ground?85:1.8,depth=ground?140:2.4,fall=ground?8:.27;
  const activeCamera=renderer.xr.isPresenting?renderer.xr.getCamera():camera;activeCamera.getWorldPosition(origin);activeCamera.getWorldDirection(direction);points.position.copy(origin).addScaledVector(direction,depth*.32);points.scale.set(width,height,depth);material.size=ground?1.0:.014;
  const count=geometry.drawRange.count;for(let i=0;i<count;i++){const k=i*3;positions[k]+=dt*(Math.sin(elapsed*.8+phase[i])*.006+.009);positions[k+1]-=dt*fall/height*speed[i];positions[k+2]+=dt*Math.cos(elapsed*.5+phase[i])*.004;
   let reset=positions[k+1]<-.5;if(ground&&getGroundY){const floor=getGroundY(points.position.x+positions[k]*width,points.position.z+positions[k+2]*depth);if(Number.isFinite(floor)&&points.position.y+positions[k+1]*height<floor+.2)reset=true;}
   if(reset){positions[k+1]=.5;positions[k]=random()-.5;positions[k+2]=random()-.5;}if(positions[k]>.5)positions[k]-=1;if(positions[k]<-.5)positions[k]+=1;
  }geometry.attributes.position.needsUpdate=true;
 }
 function destroy(){destroyed=true;requestId++;clearInterval(timer);controller?.abort();historyController?.abort();scene.remove(points);geometry.dispose();material.dispose();texture.dispose();widget.remove();}
 addEventListener('pagehide',destroy,{once:true});const api={setMode,setDate,setIntensity,refreshWeather,update,destroy,points,snapshot:()=>({...state(),mode,date:selectedDate,snowfallCm:mode==='historical'?historicalWeather(archive,selectedDate)?.snowfall_cm??null:null,weatherCode:mode==='historical'?historicalWeather(archive,selectedDate)?.weather_code??null:weather?.weather_code??null,weatherTime,site,historyLoading,historySource:archive?.source??null,count:geometry.drawRange.count,preview:mode==='preview'})};window.__akSnow=api;const requested=new URLSearchParams(location.search).get('akSnow');setMode(['off','preview','live'].includes(requested)?requested:'historical');return api;
}
