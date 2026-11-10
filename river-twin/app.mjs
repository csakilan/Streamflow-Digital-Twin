import * as THREE from 'three';
import {OrbitControls,VRButton,Scheduler} from './vendor/dependencies.js';
import {createSelection} from './state.mjs';
import {createConnection} from './connection.mjs';
import {createImagery} from './world.mjs';
import {createPanel,createCredits} from './panel.mjs';
import {studyRange} from './view-quality.mjs';
import {createBankOverlay} from './banks.mjs';
import {createGraph} from './chart/graph.mjs';
import {graphVariables} from './chart/graph-data.mjs';
import {dateAt,indexAt} from './chart/data.mjs';
import {readings} from './readings.mjs';
import {placeViewerCredits} from './viewer-credits.mjs';
import {selectionQuery,readSelectionQuery} from './view-state.mjs';

const $=selector=>document.querySelector(selector);
const params=new URLSearchParams(location.search),site=params.get('station')==='14105700'?'14105700':'01646500';
const [dataset,stageData,bankData]=await Promise.all([site,site+'-stage',site+'-banks'].map(name=>fetch('./data/'+name+'.json').then(r=>{if(!r.ok)throw Error('Station data missing');return r.json();})));
$('#station').value=site;$('#station-name').textContent=site==='01646500'?'Potomac / Little Falls':'Columbia / The Dalles';
$('#station-meta').textContent='USGS '+site+' · '+dataset.station.drainage+' drainage area';
$('#bank-date').textContent=bankData.referenceDate;
for(const [key,definition] of Object.entries(graphVariables)){const option=document.createElement('option');option.value=key;option.textContent=definition.title+' ('+definition.unit+')';$('#z-variable').append(option);}

const selection=createSelection(dataset),canvas=$('#world');
const {variable:requestedVariable,...requestedSelection}=readSelectionQuery(dataset,location.search);selection.change(requestedSelection);
$('#issue-date').min=dataset.start;$('#issue-date').max=dateAt(dataset,dataset.n-8);
for(const [i,name] of dataset.models.entries()){const o=document.createElement('option');o.value=i;o.textContent=name;$('#model-select').append(o);}

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
const scene=new THREE.Scene();scene.background=new THREE.Color('#19313d');scene.fog=new THREE.Fog(scene.background,3000,4000);
scene.add(new THREE.HemisphereLight(0xd6f4ff,0x617078,2.2));
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(100,800,200);scene.add(sun);
const rig=new THREE.Group();scene.add(rig);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,6000);rig.add(camera);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;
controls.maxPolarAngle=Math.PI*.48;
const geoRoot=new THREE.Group();scene.add(geoRoot);
const grid=new THREE.GridHelper(3500,35,0x54858f,0x294b58);grid.position.y=-30;geoRoot.add(grid);
// Bank marks are independent GIS references projected onto existing imagery.
const bankOverlay=createBankOverlay(bankData,geoRoot);
const graph=createGraph(dataset,index=>{selection.change({issueIndex:index});refreshData();});
scene.add(graph.group);graph.group.visible=false;
graph.group.position.set(-1.7,.2,.65);
const credits=createCredits();scene.add(credits.mesh);credits.mesh.visible=false;
const panel=createPanel(dataset,selection,act,stageData);scene.add(panel.group);
let view='aerial',lastDesktopView='aerial',drag=null,frames=0,provider='ion',assetId='2275207',controllers=[];
let savedAccessAllowed=true;
const connection=createConnection((type,credential,callbacks)=>createImagery(type,credential,callbacks,geoRoot,dataset.station,assetId,bankOverlay),state=>{
  document.body.dataset.status=state.status;
  $('#status').textContent={idle:'Landscape not connected',loading:'Connecting imagery…',ready:state.provider==='sample'?'Engine test is running':'3D imagery is streaming',error:'Imagery needs attention'}[state.status];
  $('#status-detail').textContent=state.provider==='sample'?'Synthetic test geometry verifies the renderer. This is not river imagery.':state.message;
  $('#connect').disabled=state.active||state.status==='loading';$('#disconnect').disabled=!state.active;
  grid.visible=state.status!=='ready';
});

function act(action){
  const old=selection.get();
  if(action==='previous')selection.change({issueIndex:Math.max(0,old.issueIndex-1)});
  if(action==='next')selection.change({issueIndex:Math.min(dataset.n-8,old.issueIndex+1)});
  if(action==='lead')selection.change({lead:old.lead%7+1});
  if(action==='model')selection.change({modelIndex:(old.modelIndex+1)%dataset.models.length});
  if(action==='data')location.href=$('#data-space-link').href;
  if(action==='banks')toggleBanks();
  if(action==='view')setView(renderer.xr.isPresenting?(view==='graph'?'tabletop':'graph'):['aerial','close','tabletop','graph'][(['aerial','close','tabletop','graph'].indexOf(view)+1)%4]);
  if(action==='z'){const keys=Object.keys(graphVariables);setVariable(keys[(keys.indexOf(graph.getVariable())+1)%keys.length]);}
  refreshData();
}

function refreshData(){
 panel.draw();graph.update(selection.get());
 $('#data-space-link').href='./data-space/?'+selectionQuery(location.search,site,dataset,{...selection.get(),variable:graph.getVariable()});
 $('#issue-date').value=selection.date();$('#model-select').value=selection.get().modelIndex;$('#lead-select').value=selection.get().lead;
 const c=selection.comparison();$('#data-summary').textContent=`Target ${c.targetDate} · observed ${Number.isFinite(c.observedCfs)?c.observedCfs.toLocaleString():'unavailable'} cfs · forecast ${Number.isFinite(c.predictedCfs)?c.predictedCfs.toLocaleString():'unavailable'} cfs`;
}
function setVariable(value){graph.setVariable(value);$('#data-space-link').href='./data-space/?'+selectionQuery(location.search,site,dataset,{...selection.get(),variable:value});$('#z-variable').value=value;graph.update(selection.get());$('#z-note').textContent=graphVariables[value].title+' on issue dates · association, not causation';}
function toggleBanks(){bankOverlay.visible=!bankOverlay.visible;$('#banks-toggle').setAttribute('aria-pressed',bankOverlay.visible);}
$('#banks-toggle').addEventListener('click',toggleBanks);
$('#z-variable').addEventListener('change',()=>setVariable($('#z-variable').value));
$('#issue-date').addEventListener('change',()=>{try{selection.change({issueIndex:indexAt(dataset,$('#issue-date').value)});}catch{}refreshData();});
$('#model-select').addEventListener('change',()=>{selection.change({modelIndex:Number($('#model-select').value)});refreshData();});
$('#lead-select').addEventListener('change',()=>{selection.change({lead:Number($('#lead-select').value)});refreshData();});
$('#station').addEventListener('change',()=>{location.href='./?'+selectionQuery(location.search,$('#station').value,dataset,{...selection.get(),variable:graph.getVariable()});});
function resetPanel(){
  scene.attach(panel.group);
  if(renderer.xr.isPresenting){panel.group.scale.setScalar(1);panel.group.position.set(1,1.55,-1.8);panel.group.rotation.set(0,-.18,0);}
  else{
    const distance=Math.max(.5,camera.position.distanceTo(controls.target)*.62);
    const pixelSize=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/innerHeight;
    const width=Math.max(200,Math.min(460,innerWidth*.34,(innerHeight-290)*960/1080));
    const centerX=innerWidth-26-width/2;
    panel.group.position.set((centerX-innerWidth/2)*pixelSize,innerHeight*.01*pixelSize,-distance).applyQuaternion(camera.quaternion).add(camera.position);
    panel.group.quaternion.copy(camera.quaternion);panel.group.scale.setScalar(width*pixelSize/1.18);
  }
  drag=null;
}

function setView(next){
  if(renderer.xr.isPresenting){view=next;geoRoot.visible=next!=='graph';graph.group.visible=next==='graph';graph.group.position.set(-1.65,.8,-2.5);graph.group.scale.setScalar(.8);return;}
  graph.group.position.set(-1.7,.2,.65);graph.group.scale.setScalar(1);graph.group.rotation.set(0,0,0);
  geoRoot.visible=next!=='graph';graph.group.visible=next==='graph';scene.background.set(next==='graph'?'#dce8eb':'#19313d');
  $('#graph-options').hidden=next!=='graph';controls.maxPolarAngle=next==='graph'?Math.PI:Math.PI*.48;
  view=next;lastDesktopView=next;rig.position.set(0,0,0);rig.rotation.set(0,0,0);geoRoot.rotation.set(0,0,0);
  if(next==='graph'){
    camera.position.set(3.7,2.8,4.8);controls.target.set(-.1,1,.1);camera.near=.02;controls.minDistance=1;controls.maxDistance=18;
  }else if(next==='tabletop'){
    geoRoot.scale.setScalar(.001);geoRoot.position.set(0,.8,-.5);
    camera.position.set(1.7,2.4,2.6);controls.target.set(0,.85,-.5);camera.near=.02;controls.minDistance=.6;controls.maxDistance=10;
  }else{
    geoRoot.scale.setScalar(1);geoRoot.position.set(0,0,0);
    camera.position.set(...(next==='close'?[170,150,260]:[850,680,1100]));controls.target.set(0,40,0);camera.near=.5;controls.minDistance=35;controls.maxDistance=12000;
  }
  camera.updateProjectionMatrix();controls.enabled=true;controls.update();resetPanel();
  for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===next));
}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>setView(button.dataset.view));
$('#reset-panel').addEventListener('click',resetPanel);
function preserveManualAccess(){
 savedAccessAllowed=false;
 const url=new URL(location.href);url.searchParams.set('manualAuth','1');history.replaceState(null,'',url);
 $('#data-space-link').href='./data-space/?'+selectionQuery(location.search,site,dataset,{...selection.get(),variable:graph.getVariable()});
}
$('#setup-toggle').addEventListener('click',()=>{const closed=$('#setup').hidden=!$('#setup').hidden;$('#setup-toggle').setAttribute('aria-expanded',String(!closed));});
$('#provider').addEventListener('change',()=>{preserveManualAccess();provider=$('#provider').value;for(const selector of ['#asset','#asset-label','#asset-hint'])$(selector).hidden=provider!=='ion';});
$('#credential').addEventListener('input',()=>{preserveManualAccess();});
$('#connect-form').addEventListener('submit',event=>{
  event.preventDefault();preserveManualAccess();if(connection.snapshot().active)return;
  assetId=$('#asset').value.trim();
  if(provider==='ion'&&!/^\d+$/.test(assetId)){ $('#status-detail').textContent='Use the numeric asset ID shown in your ion account.';return;}
  try{connection.connect(provider,$('#credential').value.trim());$('#credential').value='';}
  catch{ $('#status-detail').textContent='Enter your access token in the password field.';}
});
$('#disconnect').addEventListener('click',()=>{preserveManualAccess();connection.disconnect();});

const pointerRay=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(),offset=new THREE.Vector3(),point=new THREE.Vector3();
function mouseRay(event){pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);pointerRay.setFromCamera(pointer,camera);return pointerRay;}
canvas.addEventListener('pointerdown',event=>{
  if(renderer.xr.isPresenting||event.button!==0)return;
  const hit=panel.pick(mouseRay(event));if(!hit){if(view==='graph'){const dot=mouseRay(event).intersectObjects(graph.getTargets())[0];if(dot)graph.select(dot.object);}return;}
  event.stopImmediatePropagation();controls.enabled=false;
  if(hit.action==='drag'){
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0,0,1).applyQuaternion(panel.group.quaternion),hit.hit.point);
    offset.copy(hit.hit.point).sub(panel.group.position);drag={pointerId:event.pointerId};canvas.setPointerCapture(event.pointerId);
  }else panel.activate(hit.action);
},true);
canvas.addEventListener('pointermove',event=>{
  if(!drag||drag.pointerId!==event.pointerId)return;
  if(mouseRay(event).ray.intersectPlane(plane,point))panel.group.position.copy(point).sub(offset);
});
function endMouse(event){if(drag?.pointerId===event.pointerId){drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}if(!renderer.xr.isPresenting)controls.enabled=true;}
canvas.addEventListener('pointerup',endMouse);canvas.addEventListener('pointercancel',endMouse);

const vrButton=VRButton.createButton(renderer,{optionalFeatures:['local-floor','bounded-floor']});$('#vr-slot').appendChild(vrButton);
const xrRay=new THREE.Raycaster(),rotation=new THREE.Matrix4();
function controllerRay(controller){rotation.identity().extractRotation(controller.matrixWorld);xrRay.ray.origin.setFromMatrixPosition(controller.matrixWorld);xrRay.ray.direction.set(0,0,-1).applyMatrix4(rotation);return xrRay;}
for(let i=0;i<2;i++){
  const controller=renderer.xr.getController(i);rig.add(controller);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0x83e4cc,depthTest:false}));line.scale.z=3;line.renderOrder=120;controller.add(line);
  const hand=new THREE.Mesh(new THREE.BoxGeometry(.035,.05,.09),new THREE.MeshBasicMaterial({color:0x82b3b6}));controller.add(hand);
  controller.addEventListener('selectstart',()=>{const hit=panel.pick(controllerRay(controller));if(!hit){if(view==='graph'){const dot=xrRay.intersectObjects(graph.getTargets())[0];if(dot)graph.select(dot.object);}return;}if(hit.action==='drag'&&!drag){controller.attach(panel.group);drag={controller};}else panel.activate(hit.action);});
  // Grip anywhere on the panel also grabs it. Releasing preserves its world position.
  controller.addEventListener('squeezestart',()=>{if(!drag&&panel.pick(controllerRay(controller))){controller.attach(panel.group);drag={controller};}});
  const release=()=>{if(drag?.controller===controller){scene.attach(panel.group);drag=null;}};
  controller.addEventListener('selectend',release);controller.addEventListener('squeezeend',release);controller.addEventListener('disconnected',release);
  controller.addEventListener('connected',event=>{controller.userData.source=event.data;});
  controllers.push(controller);
}
renderer.xr.addEventListener('sessionstart',()=>{
  document.body.dataset.xr='true';controls.enabled=false;drag=null;
  rig.position.set(0,0,0);rig.rotation.set(0,0,0);camera.position.set(0,0,0);camera.rotation.set(0,0,0);camera.near=.03;camera.far=10;camera.updateProjectionMatrix();
  geoRoot.scale.setScalar(.001);geoRoot.position.set(0,.8,-1.6);setView('tabletop');resetPanel();
  credits.mesh.visible=true;credits.mesh.position.set(0,.4,-1.9);credits.mesh.rotation.set(-.2,0,0);
  Scheduler.setXRSession(renderer.xr.getSession());
});
renderer.xr.addEventListener('sessionend',()=>{
  document.body.dataset.xr='false';scene.attach(panel.group);drag=null;credits.mesh.visible=false;Scheduler.setXRSession(null);setView(lastDesktopView);
});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let lastTime=0,focusDistance=0;const cameraWorld=new THREE.Vector3(),clipFocus=new THREE.Vector3();
renderer.setAnimationLoop((time)=>{
  frames++;const dt=Math.min(.05,(time-lastTime)/1000||0);lastTime=time;
  if(!renderer.xr.isPresenting)controls.update();
  else{
    // Rotate the miniature with the right stick, without moving the user's head.
    const source=controllers.map(c=>c.userData.source).find(s=>s?.handedness==='right');
    const axis=source?.gamepad?.axes?.[2]??0;if(Math.abs(axis)>.18)(view==='graph'?graph.group:geoRoot).rotation.y-=axis*dt*.6;
  }
  scene.updateMatrixWorld(true);camera.updateMatrixWorld();
  // Three normally does this inside render(), after our streaming update. Refresh
  // the stereo union frustum now so tile visibility uses this frame's head pose.
  if(renderer.xr.isPresenting)renderer.xr.updateCamera(camera);
  const activeCamera=renderer.xr.isPresenting?renderer.xr.getCamera():camera;
  activeCamera.getWorldPosition(cameraWorld);
  if(renderer.xr.isPresenting)geoRoot.getWorldPosition(clipFocus);else clipFocus.copy(controls.target);
  focusDistance=cameraWorld.distanceTo(clipFocus);const range=studyRange(focusDistance,geoRoot.scale.x);
  if(camera.far!==range.far){camera.far=range.far;camera.updateProjectionMatrix();if(renderer.xr.isPresenting)renderer.xr.updateCamera(camera);}
  scene.fog.near=range.fogNear;scene.fog.far=range.far;
  bankOverlay.update();graph.faceLabels(activeCamera);
  if(renderer.xr.isPresenting)placeViewerCredits(credits.mesh,activeCamera);
  const resource=connection.resource;if(resource&&view!=='graph')resource.update(activeCamera,renderer);
  const text=resource?.credits()??'Landscape not connected · Hydrology: USGS / supplied HydroTwin forecasts';
  if($('#attribution').textContent!==text){
    $('#attribution').textContent=text;$('#google-logo').hidden=!text.startsWith('Basemap: Google Maps');credits.update(text+' · USGS mapped bank reference '+bankData.referenceDate+'; not a live waterline');
  }
  if(frames%30===0){
    const stats=resource?.snapshot();$('#stream-stats').textContent=stats?`${stats.budgetMode==='xr'?'VR':'Desktop'} · ${stats.visible} visible tiles · ~${stats.estimatedMB}/${stats.budgetMB} MB cache${stats.refused>0?' · Detail limited by memory':''}`:'';
  }
  renderer.render(scene,camera);
});
if(requestedVariable)setVariable(requestedVariable);refreshData();setView('aerial');
document.body.dataset.status='idle';$('#status').textContent='Landscape not connected';$('#status-detail').textContent='Connect imagery to see the real river. The floating panel already uses your packaged station data.';

// Explicitly local, synthetic geometry for testing the renderer without service access.
const engineTest=new URLSearchParams(location.search).get('engineTest')==='1'&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
if(engineTest){$('#engine-tag').hidden=false;$('#setup').hidden=true;$('#setup-toggle').setAttribute('aria-expanded','false');connection.connect('sample','');}
// Safe observation-only diagnostics; no credential, provider object or raw request URL.
window.__riverTrial={snapshot:()=>({frames,view,selection:selection.get(),comparison:selection.comparison(),connection:connection.snapshot(),tiles:connection.resource?.snapshot()??null,site,banks:bankOverlay.snapshot(),graph:{visible:graph.group.visible,variable:graph.getVariable(),points:graph.getTargets().length},readings:readings(dataset,selection.get(),stageData),xr:renderer.xr.isPresenting,range:{far:camera.far,fogNear:scene.fog.near,focusDistance,scale:geoRoot.scale.x},renderSize:[canvas.width,canvas.height],panel:{tab:panel.tab,minimized:panel.minimized,position:panel.group.getWorldPosition(new THREE.Vector3()).toArray(),dragging:!!drag},creditsVisible:credits.mesh.visible,creditsPosition:credits.mesh.getWorldPosition(new THREE.Vector3()).toArray(),creditsFacing:credits.mesh.getWorldQuaternion(new THREE.Quaternion()).toArray(),graphRotation:graph.group.rotation.toArray().slice(0,3),credits:$('#attribution').textContent}),targets:()=>panel.targets(camera)};

// The local server reads the user's gitignored .env. Static deployments retain
// manual entry; engine tests and explicit manual mode never request saved access.
if(!engineTest&&!new URLSearchParams(location.search).has('manualAuth')&&['localhost','127.0.0.1'].includes(location.hostname)){
  let config;
  try{
    const response=await fetch('/_local/imagery-config',{cache:'no-store',mode:'same-origin',credentials:'omit',headers:{'X-HydroTwin-Local':'1'}});
    if(response.ok){
      config=await response.json();
      if(savedAccessAllowed&&config.available&&config.provider==='ion'&&typeof config.credential==='string'&&/^\d+$/.test(config.assetId)&&!connection.snapshot().active&&connection.snapshot().starts===0){
        provider='ion';assetId=config.assetId;$('#asset').value=assetId;
        if(connection.connect('ion',config.credential)){$('#setup').hidden=true;$('#setup-toggle').setAttribute('aria-expanded','false');}
      }
    }
  }catch{/* A plain static server has no local-config endpoint; keep manual entry. */}
  finally{if(config)config.credential='';}
}
