import * as THREE from 'three';
import {OrbitControls,VRButton} from '../vendor/dependencies.js';
import {createGraph} from '../chart/graph.mjs';
import {dateAt,indexAt,getComparison} from '../chart/data.mjs';
import {createWorkspace,PANEL_TYPES} from './state.mjs';
import {drawPanel,TITLES} from './panels.mjs';
import {selectionQuery,readSelectionQuery} from '../view-state.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),site=params.get('station')==='14105700'?'14105700':'01646500';
const load=async path=>{const r=await fetch(path);if(!r.ok)throw Error(`Could not load ${path}`);return r.json();};
let dataset,correlation;try{[dataset,correlation]=await Promise.all([load(`../data/${site}.json`),load(`../data/${site}-correlation.json`).catch(()=>null)]);}catch(e){$('loading').textContent=e.message;throw e;}
const state=createWorkspace(dataset);state.select(readSelectionQuery(dataset,location.search));
const scene=new THREE.Scene();scene.background=new THREE.Color('#111e2c');scene.fog=new THREE.Fog('#111e2c',12,30);
const renderer=new THREE.WebGLRenderer({canvas:$('space'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');
const camera=new THREE.PerspectiveCamera(43,1,.01,60),rig=new THREE.Group();rig.add(camera);scene.add(rig);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=1.7;orbit.maxDistance=9;orbit.maxPolarAngle=Math.PI*.49;orbit.enablePan=true;
scene.add(new THREE.HemisphereLight('#daefff','#1d2633',2));const sun=new THREE.DirectionalLight('#d1e8ef',1.8);sun.position.set(-3,6,4);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(36,36),new THREE.MeshStandardMaterial({color:'#1b2b39',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;scene.add(floor);
const platform=new THREE.Mesh(new THREE.CylinderGeometry(4.3,4.3,.04,80),new THREE.MeshStandardMaterial({color:'#203747',roughness:1}));platform.position.set(0,-.005,-.8);scene.add(platform);
const grid=new THREE.GridHelper(12,24,'#385160','#273c4a');grid.position.y=.018;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
function resetCamera(){rig.position.set(0,0,0);rig.rotation.set(0,0,0);camera.position.set(0,1.85,4.1);orbit.target.set(0,1.15,-.7);orbit.update();}
resetCamera();
const zones=[[-1.88,1.55,-.85,.17],[0,1.55,-1.0,0],[1.88,1.55,-.85,-.17]],panels=[null,null,null],targets=[],toolbar=new THREE.Group();scene.add(toolbar);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),controllers=[];let gesture=null;
function canvasPlane(canvas,w,h){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,toneMapped:false,depthWrite:false}));}
function button(text,x,y,z,width,action){const c=document.createElement('canvas');c.width=Math.round(width/.105*112);c.height=112;const m=canvasPlane(c,width,.105);m.position.set(x,y,z);m.userData.action=action;toolbar.add(m);targets.push(m);return {mesh:m,canvas:c,set(value,active=false){const g=c.getContext('2d');const cw=c.width;g.clearRect(0,0,cw,112);g.fillStyle=active?'#4c7187':'#233c50';g.beginPath();g.roundRect(0,0,cw,112,20);g.fill();g.fillStyle='#eff6fa';g.font='600 43px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(value,cw/2,56,cw-30);m.material.map.needsUpdate=true;}};}
const typeButtons=PANEL_TYPES.map((type,i)=>{const top=i<5,count=top?5:PANEL_TYPES.length-5,column=top?i:i-5;return button(TITLES[type],(column-(count-1)/2)*(top?.82:.96),top?.61:.43,.14,top?.78:.92,()=>openPanel(type));});
const sharedButtons=[
 button('◀ DAY',-1.73,.25,.55,.42,()=>change({issueIndex:state.get().selection.issueIndex-1})),
 button('DAY ▶',-1.25,.25,.55,.42,()=>change({issueIndex:state.get().selection.issueIndex+1})),
 button('MODEL',-.57,.25,.55,.84,()=>change({modelIndex:(state.get().selection.modelIndex+1)%dataset.models.length})),
 button('LEAD',.18,.25,.55,.55,()=>change({lead:state.get().selection.lead%7+1})),
 button('INPUT',.95,.25,.55,.90,()=>{const el=$('variable');el.selectedIndex=(el.selectedIndex+1)%el.options.length;change({variable:el.value});}),
 button('RESET',1.77,.25,.55,.56,()=>resetLayout()),
];
const returnButton=button('RIVER VIEW ↗',-1.9,2.35,-1.05,.95,async()=>{const destination=$('river-link').href;const session=renderer.xr.getSession();if(session)await session.end();location.href=destination;});returnButton.set('RIVER VIEW ↗');returnButton.mesh.visible=false;
const caption=button('',0,2.37,-1.05,2.55,()=>{});caption.mesh.material.transparent=true;caption.mesh.visible=false;sharedButtons.forEach(b=>b.mesh.visible=false);
// Replace the caption button backplate with a quiet readable station/date label.
function setCaption(c){caption.set(`${site==='01646500'?'POTOMAC · LITTLE FALLS':'COLUMBIA · THE DALLES'}  |  ${c.targetDate}`);}
const slotButtons=['LEFT','CENTER','RIGHT'].map((name,i)=>button(name,(i-1)*.53,.79,-.03,.46,()=>{state.focus(i);render();}));
const graphResetButton=button('Reset graph',1.23,.79,-.03,.72,()=>resetGraph());graphResetButton.set('Reset graph');graphResetButton.mesh.visible=false;
function removePanel(i){const p=panels[i];if(!p)return;p.graph?.dispose();p.root.removeFromParent();p.root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});panels[i]=null;}
function makePanel(i,type){const root=new THREE.Group(),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=800;const board=canvasPlane(canvas,1.68,1.3125);root.add(board);board.userData.slot=i;
 const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.705,1.3375)),new THREE.LineBasicMaterial({color:'#5a8297',transparent:true,opacity:.7}));outline.position.z=-.002;root.add(outline);
 root.position.set(...zones[i].slice(0,3));root.rotation.y=zones[i][3];scene.add(root);
 let graph=null,graphPivot=null;if(type==='graph'){graph=createGraph(dataset,()=>{});graphPivot=new THREE.Group();graphPivot.position.set(-.003,.0015,.123);graphPivot.rotation.y=-.35;graph.group.position.set(-.602,-.3315,.35475);graph.group.rotation.set(0,0,0);graph.group.scale.set(.43,.39,.43);graphPivot.add(graph.group);root.add(graphPivot);}
 const panel={root,canvas,board,outline,type,graph,graphPivot,initialGraphRotation:graphPivot?.quaternion.clone(),meta:null};panels[i]=panel;return panel;
}
function resetGraph(){const p=panels[state.get().active];if(p?.graphPivot)p.graphPivot.quaternion.copy(p.initialGraphRotation);}
function rotateGraph(p,dx,dy){const viewToParent=p.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.getWorldQuaternion(new THREE.Quaternion()));const delta=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),dx*.012).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),dy*.012));delta.premultiply(viewToParent).multiply(viewToParent.clone().invert());p.graphPivot.quaternion.premultiply(delta).normalize();}
function openPanel(type){state.open(type);render();}
function change(patch){try{state.select(patch);$('message').textContent='';render();}catch(e){$('message').textContent=e.message;render();}}
function render(){const all=state.get(),s=all.selection,c=getComparison(dataset,s);$('issue').min=dataset.start;$('issue').max=dateAt(dataset,dataset.n-8);$('issue').value=c.issueDate;$('target').textContent=c.targetDate;$('model').value=s.modelIndex;$('lead').value=s.lead;$('variable').value=s.variable;$('timeline').max=dataset.n-8;$('timeline').value=s.issueIndex;
 all.slots.forEach((data,i)=>{if(!data){removePanel(i);return;}let p=panels[i];if(!p||p.type!==data.type){removePanel(i);p=makePanel(i,data.type);}
  p.root.scale.setScalar(data.expanded?1.42:1);p.meta=drawPanel(p.canvas,{dataset,selection:s,type:data.type,active:all.active===i,minimized:data.minimized,expanded:data.expanded,correlation});p.board.material.map.needsUpdate=true;p.outline.material.color.set(all.active===i?'#8cc9df':'#4e6f83');p.outline.visible=!data.minimized;
  if(data.minimized){p.board.geometry.dispose();p.board.geometry=new THREE.PlaneGeometry(1.68,.141);p.board.position.y=.586;p.board.geometry.attributes.uv.setXY(0,0,1);p.board.geometry.attributes.uv.setXY(1,1,1);p.board.geometry.attributes.uv.setXY(2,0,1-86/800);p.board.geometry.attributes.uv.setXY(3,1,1-86/800);p.board.geometry.attributes.uv.needsUpdate=true;}else{p.board.geometry.dispose();p.board.geometry=new THREE.PlaneGeometry(1.68,1.3125);p.board.position.y=0;}
  if(p.graph){p.graph.group.visible=!data.minimized;if(p.graph.getVariable()!==s.variable)p.graph.setVariable(s.variable);p.graph.update(s);p.graph.group.traverse(o=>{if(o.material?.map){o.material.depthTest=true;o.material.depthWrite=false;}});}
 });
 typeButtons.forEach((b,i)=>{const type=PANEL_TYPES[i];b.set(({overview:'Overview',flow:'River',forecast:'Forecast',drivers:'Drivers',models:'Models',correlation:'Relations',graph:'3D graph',seasonal:'Seasonal',accuracy:'Lead accuracy'})[type],all.slots.some(p=>p?.type===type));});
 document.querySelectorAll('[data-panel]').forEach(b=>b.classList.toggle('active',all.slots.some(p=>p?.type===b.dataset.panel)));
 sharedButtons[0].set('◀ DAY');sharedButtons[1].set('DAY ▶');sharedButtons[2].set(c.modelName);sharedButtons[3].set(`LEAD +${s.lead}d`);sharedButtons[4].set($('variable').selectedOptions[0]?.textContent??s.variable);sharedButtons[5].set('RESET');slotButtons.forEach((b,i)=>b.set(['LEFT','CENTER','RIGHT'][i],i===all.active));setCaption(c);
 const graphActive=!!panels[all.active]?.graph&&!all.slots[all.active].minimized;$('reset-graph').disabled=!graphActive;graphResetButton.mesh.visible=graphActive;$('mode-note').innerHTML=graphActive?'Drag inside the graph to spin it 360°.<br>Drag its title to move the panel.<br>Date changes use the shared controls.':'Click a panel to focus it.<br>Drag its title to move it.<br>Date changes use the shared controls.';
 $('river-link').href='../?'+selectionQuery(location.search,site,dataset,s);window.SPATIAL.comparison=c;
}
function resetLayout(){state.reset();panels.forEach((p,i)=>{if(p){p.root.position.set(...zones[i].slice(0,3));p.root.rotation.set(0,zones[i][3],0);}});render();resetCamera();}
function hits(){return ray.intersectObjects([...targets.filter(o=>o.visible),...panels.filter(Boolean).map(p=>p.board)],false);}
function setPointerRay(e){scene.updateMatrixWorld(true);const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
function actionAt(hit){if(hit.object.userData.action){hit.object.userData.action();return {action:true};}const i=hit.object.userData.slot,p=panels[i],slot=state.get().slots[i];if(!p||!slot)return {};state.focus(i);const u=hit.uv.x*1024,v=(1-hit.uv.y)*800;
 if(v<86){if(u>939){state.close(i);render();return {action:true};}if(u>874){state.expand(i);render();return {action:true};}if(u>809){state.minimize(i);render();return {action:true};}render();return {drag:i};}
 render();return p.graph?{rotate:i}:{action:true};
}
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0)return;setPointerRay(e);const hit=hits()[0];if(!hit)return;e.stopImmediatePropagation();const action=actionAt(hit);orbit.enabled=false;if(action.rotate!=null){gesture={type:'rotate',slot:action.rotate,x:e.clientX,y:e.clientY};}else if(action.drag!=null){const panel=panels[action.drag],normal=new THREE.Vector3();camera.getWorldDirection(normal);const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,panel.root.position);gesture={type:'move',slot:action.drag,plane,offset:panel.root.position.clone().sub(hit.point)};}renderer.domElement.setPointerCapture(e.pointerId);},true);
renderer.domElement.addEventListener('pointermove',e=>{if(!gesture)return;const p=panels[gesture.slot];if(!p)return;if(gesture.type==='rotate'){rotateGraph(p,e.clientX-gesture.x,e.clientY-gesture.y);gesture.x=e.clientX;gesture.y=e.clientY;return;}setPointerRay(e);const point=new THREE.Vector3();if(ray.ray.intersectPlane(gesture.plane,point)){point.add(gesture.offset);point.y=THREE.MathUtils.clamp(point.y,.65,2.8);point.x=THREE.MathUtils.clamp(point.x,-3.6,3.6);point.z=THREE.MathUtils.clamp(point.z,-3,1.5);p.root.position.copy(point);}});
function endGesture(){gesture=null;orbit.enabled=!renderer.xr.isPresenting;}
renderer.domElement.addEventListener('pointerup',endGesture);renderer.domElement.addEventListener('pointercancel',endGesture);renderer.domElement.addEventListener('lostpointercapture',endGesture);
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>openPanel(b.dataset.panel);
$('issue').onchange=e=>change({issueIndex:indexAt(dataset,e.target.value)});$('model').onchange=e=>change({modelIndex:+e.target.value});$('lead').onchange=e=>change({lead:+e.target.value});$('variable').onchange=e=>change({variable:e.target.value});$('timeline').oninput=e=>change({issueIndex:+e.target.value});$('previous').onclick=()=>change({issueIndex:state.get().selection.issueIndex-1});$('next').onclick=()=>change({issueIndex:state.get().selection.issueIndex+1});$('reset').onclick=resetLayout;
$('focus').onclick=()=>{const p=panels[state.get().active];if(!p)return;orbit.target.copy(p.root.position);camera.position.copy(p.root.position).add(new THREE.Vector3(0,.12,2.5));orbit.update();};
$('close').onclick=()=>{state.close(state.get().active);render();};$('minimize').onclick=()=>{state.minimize(state.get().active);render();};$('expand').onclick=()=>{state.expand(state.get().active);render();};
$('reset-graph').onclick=resetGraph;
for(let i=0;i<2;i++){const controller=renderer.xr.getController(i);controllers.push(controller);rig.add(controller);const beam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-6)]),new THREE.LineBasicMaterial({color:'#91b9cc'}));controller.add(beam);
 controller.addEventListener('selectstart',()=>{scene.updateMatrixWorld(true);ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(new THREE.Matrix4().extractRotation(controller.matrixWorld));const hit=hits()[0];if(!hit)return;const a=actionAt(hit);if(a.rotate!=null){controller.userData.graphRotation={slot:a.rotate,controller:controller.getWorldQuaternion(new THREE.Quaternion()),graph:panels[a.rotate].graphPivot.getWorldQuaternion(new THREE.Quaternion())};}else if(a.drag!=null){controller.attach(panels[a.drag].root);controller.userData.panelSlot=a.drag;}});
 controller.addEventListener('selectend',()=>releaseController(controller));
}
function releaseController(controller){const i=controller.userData.panelSlot;if(i!=null&&panels[i]?.root.parent===controller)scene.attach(panels[i].root);delete controller.userData.panelSlot;delete controller.userData.graphRotation;}
renderer.xr.addEventListener('sessionstart',()=>{document.body.dataset.xr='true';returnButton.mesh.visible=true;sharedButtons.forEach(b=>b.mesh.visible=true);caption.mesh.visible=true;orbit.enabled=false;rig.position.set(0,0,3);camera.position.set(0,0,0);});renderer.xr.addEventListener('sessionend',()=>{document.body.dataset.xr='false';returnButton.mesh.visible=false;controllers.forEach(releaseController);sharedButtons.forEach(b=>b.mesh.visible=false);caption.mesh.visible=false;orbit.enabled=true;resetCamera();});
const vr=VRButton.createButton(renderer);vr.id='enter-vr';$('vr-slot').appendChild(vr);
function resize(){const r=$('viewport').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe($('viewport'));resize();
dataset.models.forEach((m,i)=>$('model').add(new Option(m,i)));for(let i=1;i<=7;i++)$('lead').add(new Option(`+${i} days`,i));
$('station-name').textContent=site==='01646500'?'Potomac · Little Falls':'Columbia · The Dalles';$('river-link').textContent='← River landscape';$('station-select').value=site;$('station-select').onchange=()=>{location.href='./?'+selectionQuery(location.search,$('station-select').value,dataset,state.get().selection);};
window.SPATIAL={site,state,panels,openPanel,change,resetLayout,renderer,camera,orbit,scene,toolbarButtons:typeButtons,riverButton:returnButton.mesh,ready:false,comparison:null};render();$('loading').remove();window.SPATIAL.ready=true;
const viewerQ=new THREE.Quaternion(),panelQ=new THREE.Quaternion();renderer.setAnimationLoop(()=>{if(orbit.enabled&&!renderer.xr.isPresenting)orbit.update();for(const controller of controllers){const held=controller.userData.graphRotation,p=held&&panels[held.slot];if(p?.graphPivot&&p.graph.group.visible){const delta=controller.getWorldQuaternion(new THREE.Quaternion()).multiply(held.controller.clone().invert());p.graphPivot.quaternion.copy(p.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(delta).multiply(held.graph));}}const viewer=renderer.xr.isPresenting?renderer.xr.getCamera():camera;viewer.getWorldQuaternion(viewerQ);for(const p of panels){if(p?.graph&&p.graph.group.visible){p.graph.faceLabels(viewer);}}renderer.render(scene,camera);});
