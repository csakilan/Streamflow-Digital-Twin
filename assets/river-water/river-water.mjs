import {sampleGridHeight,waterVisibility} from './geometry.mjs?v=1';
import {summarizeStage,stageUrl} from './stage.mjs?v=1';

/** Reference geography adapter. Deliberately independent of the legacy QDEM/flood fill. */
export function createRiverWater(o){
 const {THREE,site}=o;
 let mode=new URLSearchParams(location.search).get('water')||'mapped';
 if(!['mapped','original','imagery'].includes(mode))mode='mapped';
 let data=null,error=null,shore=false,lastSelection='',selection=null,busy=false,lookupController=null;
 const layers={},days={},lookupErrors={},checked=new Set(),ready={ground:false,table:false};
 const info={site,mode,ready:false,referenceDate:null,ground:null,table:null,error:null};
 const control=document.createElement('details');control.id='river-water-control';
 control.innerHTML=`<summary id="river-water-summary">Water: loading</summary><div class="rw-body">
 <strong>River water</strong><div class="rw-modes" role="group" aria-label="Water display">
 <button type="button" data-water="mapped">Mapped river</button><button type="button" data-water="original">Original estimate</button><button type="button" data-water="imagery">Imagery only</button></div>
 <label class="rw-check"><input type="checkbox" id="rw-shore"> Show mapped banks & islands</label>
 <p id="rw-source">Loading mapped reference…</p><p id="rw-meaning"></p>
 <div class="rw-metric"><span id="rw-date"></span><strong id="rw-flow"></strong><span id="rw-estimate"></span></div>
 <div class="rw-metric"><span>Measured gauge height · USGS</span><strong id="rw-measured">Select a date</strong><span id="rw-range"></span><button type="button" id="rw-lookup">Look up this day</button></div>
 <p class="rw-note">Gauge height is relative to the station's gauge zero, not sea level. Mapped water follows the terrain for display; it is not a measured or simulated flood extent.</p>
 <a href="https://3dhp.nationalmap.gov/arcgis/rest/services/usgs_3dhp_all/FeatureServer/60" target="_blank" rel="noopener noreferrer">USGS waterbody source ↗</a>
 </div>`;
 (document.getElementById('links')||document.body).appendChild(control);
 control.addEventListener('pointerdown',e=>e.stopPropagation());control.addEventListener('pointerup',e=>e.stopPropagation());
 control.addEventListener('click',e=>{e.stopPropagation();const button=e.target.closest('[data-water]');if(button)setMode(button.dataset.water);});
 control.querySelector('#rw-shore').addEventListener('change',e=>{shore=e.target.checked;applyVisibility();});
 control.querySelector('#rw-lookup').addEventListener('click',lookup);
 const el=id=>control.querySelector('#'+id);
 const round=(v,n=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:n,minimumFractionDigits:n}):'Unavailable';

 function material(kind){
  const normal=o.normalTexture.clone();normal.repeat.set(1,1);normal.needsUpdate=true;
  const m=new THREE.MeshStandardMaterial({color:'#3c625c',roughness:.28,metalness:.08,transparent:true,opacity:kind==='ground'?.68:.78,normalMap:normal,normalScale:new THREE.Vector2(.13,.13),depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide});
  m.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float referenceFade; varying float vReferenceFade;').replace('#include <begin_vertex>','#include <begin_vertex>\nvReferenceFade = referenceFade;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vReferenceFade;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vReferenceFade;');
  };
  m.customProgramCacheKey=()=> 'mapped-river-fade-v1';return m;
 }
 function build(kind){
  if(!data||!ready[kind])return;
  const d=data[kind==='ground'?'inner':'table'],grid=kind==='ground'?o.groundGrid():o.tableGrid(),count=d.vertices.length/2;
  if(!grid?.positions)return;
  const position=new Float32Array(count*3),uv=new Float32Array(count*2),fade=new Float32Array(count),valid=new Uint8Array(count);
  let invalid=0;
  const [x0,z0,x1,z1]=d.bounds;
  for(let i=0;i<count;i++){
   // Serialized coordinates are rounded to a millimeter, not a claim of survey accuracy.
   const x=Math.max(x0,Math.min(x1,d.vertices[i*2])),z=Math.max(z0,Math.min(z1,d.vertices[i*2+1]));
   const y=sampleGridHeight(grid.positions,grid.n,d.bounds,x,z),p=kind==='ground'?[x,z]:o.projectTable(x,z);
   valid[i]=y!=null?1:0;if(!valid[i])invalid++;
   position.set([p[0],y==null?0:y+(kind==='ground'?.12:.00008),p[1]],i*3);
   uv.set([x/60,z/60],i*2);
   fade[i]=kind==='ground'?Math.max(0,Math.min(1,Math.min(x-x0,x1-x,z-z0,z1-z)/45)):1;
  }
  const indices=[];for(let i=0;i<d.indices.length;i+=3){const [a,b,c]=d.indices.slice(i,i+3);if(valid[a]&&valid[b]&&valid[c])indices.push(a,b,c);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(position,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setAttribute('referenceFade',new THREE.BufferAttribute(fade,1));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
  if(layers[kind]){layers[kind].group.removeFromParent();layers[kind].mesh.geometry.dispose();layers[kind].mesh.material.normalMap.dispose();layers[kind].mesh.material.dispose();layers[kind].line.geometry.dispose();layers[kind].line.material.dispose();}
  const group=new THREE.Group();group.name='USGS mapped reference water';
  const mesh=new THREE.Mesh(geo,material(kind));mesh.name='Mapped water footprint';mesh.renderOrder=2;mesh.frustumCulled=false;group.add(mesh);
  const bank=[];
  const point=([x,z])=>{
   const y=sampleGridHeight(grid.positions,grid.n,d.bounds,Math.max(x0,Math.min(x1,x)),Math.max(z0,Math.min(z1,z)));
   if(y==null)return null;const p=kind==='ground'?[x,z]:o.projectTable(x,z);return [p[0],y+(kind==='ground'?.4:.00015),p[1]];
  };
  for(const polygon of d.polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++){
   const a=point(ring[i-1]),b=point(ring[i]);if(a&&b)bank.push(...a,...b);
  }
  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(bank,3));
  const line=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:'#a7ede0',transparent:true,opacity:.82,depthTest:true}));line.name='Mapped banks and islands';line.renderOrder=3;group.add(line);
  (kind==='ground'?o.groundRoot:o.tableRoot).add(group);layers[kind]={group,mesh,line};
  info[kind]={vertices:count,triangles:indices.length/3,invalidVertices:invalid,...d.validation};
  info.ready=!!layers.ground;applyVisibility();paint();
 }
 function applyVisibility(){
  const visible=waterVisibility(mode,!!data);
  for(const layer of Object.values(layers)){layer.mesh.visible=visible.mapped;layer.line.visible=shore&&mode!=='original';}
  // Called AFTER legacy updateLevel: its forecast routines can turn dots back on.
  for(const object of o.legacyObjects())if(!visible.legacy)object.visible=false;
  if(visible.legacy){for(const object of o.legacySurfaces())object.visible=true;}
 }
 function paint(){
  el('river-water-summary').textContent=error&&mode==='mapped'?'Water: unavailable':`Water: ${mode==='mapped'?'mapped':mode==='original'?'original estimate':'imagery'}`;
  control.querySelectorAll('[data-water]').forEach(b=>{b.classList.toggle('selected',b.dataset.water===mode);b.setAttribute('aria-pressed',String(b.dataset.water===mode));});
  el('rw-source').textContent=error?'Mapped river unavailable; imagery remains visible.':data?`USGS reference · ${data.referenceDate} · ${data.inner.validation.islands} mapped islands in detailed reach`:'Loading mapped reference…';
  el('rw-meaning').textContent=mode==='mapped'?'Reference river shape. Changing the date updates data, not this mapped shoreline.':mode==='original'?'Original terrain/flow estimate, including approximate flood edges. This is the comparison baseline.':'Original aerial imagery; capture date may differ from the selected river date.';
  if(!selection)return;
  el('rw-date').textContent=`${selection.forecast?'Forecast target':'Selected day'} · ${selection.date}`;
  el('rw-flow').textContent=`${round(selection.flow,0)} cfs${selection.forecast?' · '+selection.model:''}`;
  el('rw-estimate').textContent=`Rating-estimated gauge height: ${round(selection.estimatedHeight)} ft`;
  const s=days[selection.date];
  el('rw-measured').textContent=s?`${round(s.meanFt)} ft · sample mean`:busy?'Looking up readings…':lookupErrors[selection.date]?'USGS lookup unavailable':checked.has(selection.date)?'No readings available':'Not loaded for this day';
  el('rw-range').textContent=s?`${round(s.minFt)}–${round(s.maxFt)} ft · ${s.samples} readings${s.provisional?' · provisional':''}. Historical outcome, not an issued forecast.`:'Measured height is displayed separately from the rating estimate.';
  el('rw-lookup').disabled=busy;el('rw-lookup').hidden=!!s;
 }
 async function lookup(){
  if(!selection||busy)return;const date=selection.date;busy=true;paint();lookupController?.abort();lookupController=new AbortController();
  const timer=setTimeout(()=>lookupController.abort(),15000);
  try{const r=await fetch(stageUrl(site,date),{signal:lookupController.signal});if(!r.ok)throw Error('USGS '+r.status);const s=summarizeStage(await r.json(),site,date);if(s)days[date]=s;delete lookupErrors[date];checked.add(date);}
  catch{lookupErrors[date]=true;}
  finally{clearTimeout(timer);busy=false;paint();}
 }
 function setMode(next){
  if(!['mapped','original','imagery'].includes(next))throw RangeError('Unknown water mode');mode=next;info.mode=mode;o.onMode?.();applyVisibility();paint();
 }
 function rebuild(kind){if(kind)ready[kind]=true;else{ready.ground=o.groundReady();ready.table=o.tableReady();}if(kind)build(kind);else{build('ground');build('table');}}
 const api={setMode,cycle(){setMode(mode==='mapped'?'original':mode==='original'?'imagery':'mapped');},rebuild,
  update(dt,s){
   selection=s;applyVisibility();for(const layer of Object.values(layers)){layer.mesh.material.normalMap.offset.x-=dt*.005;layer.mesh.material.normalMap.offset.y+=dt*.0017;}
   const key=JSON.stringify(s);if(key!==lastSelection){lastSelection=key;paint();}
  },snapshot(){return {...info,mode,shorelineVisible:shore,date:selection?.date,estimatedHeightFt:selection?.estimatedHeight,measured:days[selection?.date]??null};},get layers(){return layers;}};
 fetch(new URL(`./data/${site}-stage.json`,import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{Object.assign(days,d.days);paint();}).catch(()=>{});
 fetch(new URL(`./data/${site}.json`,import.meta.url)).then(r=>{if(!r.ok)throw Error('Reference file '+r.status);return r.json();}).then(d=>{
  if(d.site!==site||d.version!==1)throw Error('Reference data mismatch');data=d;info.referenceDate=d.referenceDate;rebuild();paint();
 }).catch(e=>{error=e.message;info.error=error;applyVisibility();paint();});
 paint();return api;
}
