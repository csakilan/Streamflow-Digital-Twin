import * as THREE from 'three';
import {dateAt} from '../assets/3dchart/data.mjs';

const WIDTH=960,HEIGHT=850,TOP=108,HEADER=112;
const numeric=(value,digits=0)=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:digits}):'Unavailable';

/** A single canvas is a real scene object, so the same panel works in both eyes. */
export function createPanel(dataset,selection,onAction){
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.18,1.18*HEIGHT/WIDTH),material);mesh.renderOrder=100;
  const group=new THREE.Group();group.add(mesh);let minimized=false,hitZones=[];
  function text(value,x,y,size=24,color='#bbd0d9',weight='400'){
    ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui,sans-serif`;ctx.fillText(String(value),x,y);
  }
  function drawButton(id,label,x,y,width){
    ctx.fillStyle='#24434f';ctx.beginPath();ctx.roundRect(x,y,width,60,10);ctx.fill();
    text(label,x+18,y+39,23,'#e8f6f4','600');hitZones.push({id,x,y,w:width,h:60});
  }
  function draw(){
    ctx.clearRect(0,0,WIDTH,HEIGHT);hitZones=[];
    ctx.fillStyle='#102631';ctx.beginPath();ctx.roundRect(0,TOP,WIDTH,minimized?HEADER:HEIGHT-TOP,24);ctx.fill();
    ctx.strokeStyle='#4c737e';ctx.lineWidth=2;ctx.stroke();
    text('POTOMAC / LITTLE FALLS',32,TOP+43,26,'#8ce7d2','650');
    text('Grab this header to move',32,TOP+80,18,'#9db7c4');
    drawButton('minimize',minimized?'+':'−',WIDTH-79,TOP+21,58);
    if(!minimized){
      const value=selection.get(),c=selection.comparison();
      text('ISSUED',32,TOP+156,18,'#91aeb9');text(c.issueDate,32,TOP+193,29,'#eff7f5','600');
      text(`TARGET / +${c.lead} DAY${c.lead===1?'':'S'}`,490,TOP+156,18,'#91aeb9');text(c.targetDate,490,TOP+193,29,'#eff7f5','600');
      text('EARLIER FORECAST',32,TOP+253,19,'#efb277');text('OBSERVED OUTCOME',490,TOP+253,19,'#77cfed');
      text(numeric(c.predictedCfs),32,TOP+306,45,'#ffbd7b','650');text(numeric(c.observedCfs),490,TOP+306,45,'#85dcf1','650');
      text('cfs · cubic feet per second',32,TOP+341,18,'#afc4ce');
      text(`Gauge height estimate: ${numeric(c.predictedStageFt,2)} ft`,32,TOP+384,20,'#e8b47d');
      text(`Outcome estimate: ${numeric(c.observedEstimatedStageFt,2)} ft`,490,TOP+384,20,'#8bd4e7');
      text('Height from supplied rating fit; not depth or terrain elevation.',32,TOP+417,18,'#aac2ca');
      drawHistory(c);
      drawButton('previous','← Issue day',32,TOP+586,210);drawButton('next','Issue day →',252,TOP+586,210);
      drawButton('lead',`Lead +${value.lead}d`,476,TOP+586,185);drawButton('model',c.modelName,675,TOP+586,253);
      text('Historical comparison · forecast and outcome share a target day',32,TOP+690,18,'#aac2ca');
      text('USGS daily mean discharge / supplied HydroTwin predictions',32,TOP+722,18,'#aac2ca');
    }
    texture.needsUpdate=true;
  }
  function drawHistory(c){
    const x=32,y=TOP+464,w=896,h=90,start=Math.max(0,c.issueIndex-21),end=Math.min(dataset.n-1,c.issueIndex+7);
    const values=dataset.flow.slice(start,end+1).filter(Number.isFinite),max=Math.max(1,...values,c.predictedCfs??0);
    ctx.strokeStyle='#33535f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x+w,y+h);ctx.stroke();
    ctx.strokeStyle='#73cce5';ctx.lineWidth=4;ctx.beginPath();let down=false;
    for(let i=start;i<=end;i++){const f=dataset.flow[i];if(!Number.isFinite(f)){down=false;continue;}const px=x+(i-start)/(end-start)*w,py=y+h-f/max*h;if(down)ctx.lineTo(px,py);else ctx.moveTo(px,py);down=true;}ctx.stroke();
    const pointX=x+(c.targetIndex-start)/(end-start)*w;
    if(Number.isFinite(c.predictedCfs)){ctx.fillStyle='#ffbc7c';ctx.beginPath();ctx.arc(pointX,y+h-c.predictedCfs/max*h,7,0,Math.PI*2);ctx.fill();}
    text(dateAt(dataset,start),x,y-10,16);text('Daily flow / forecast target •',x+600,y-10,16);
  }
  const pointFromHit=hit=>({x:hit.uv.x*WIDTH,y:(1-hit.uv.y)*HEIGHT});
  function pick(raycaster){
    const hit=raycaster.intersectObject(mesh)[0];if(!hit)return null;
    const p=pointFromHit(hit);
    if(p.y<TOP||p.y>(minimized?TOP+HEADER:HEIGHT))return null;
    const action=hitZones.find(z=>p.x>=z.x&&p.x<=z.x+z.w&&p.y>=z.y&&p.y<=z.y+z.h)?.id;
    return {hit,action:action??(p.y<TOP+HEADER?'drag':null)};
  }
  function activate(action){if(action==='minimize'){minimized=!minimized;draw();}else if(action&&action!=='drag')onAction(action);}
  draw();
  function targets(camera){
    group.updateWorldMatrix(true,true);
    return [...hitZones,{id:'header',x:290,y:TOP+25,w:180,h:60},{id:'body',x:300,y:TOP+260,w:150,h:50}].map(z=>{
      const local=new THREE.Vector3(((z.x+z.w/2)/WIDTH-.5)*1.18,(.5-(z.y+z.h/2)/HEIGHT)*1.18*HEIGHT/WIDTH,0);
      const world=group.localToWorld(local),screen=world.clone().project(camera);
      return {id:z.id,world:world.toArray(),screen:[(screen.x+1)/2*innerWidth,(1-screen.y)/2*innerHeight]};
    });
  }
  return {group,mesh,draw,pick,activate,targets,get minimized(){return minimized;},dispose(){mesh.geometry.dispose();material.dispose();texture.dispose();}};
}

export function createCredits(){
  const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=176;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.225),material);mesh.renderOrder=110;
  let previous='';const logo=new Image();logo.src='./vendor/google-maps-white.png';logo.onload=()=>{const value=previous;previous='';update(value);};
  function update(value){
    if(value===previous)return;previous=value;
    const google=value.startsWith('Basemap: Google Maps'),lines=[];let line='';ctx.font='26px system-ui';
    for(const word of value.split(/\s+/)){if(ctx.measureText(line+word).width>1735){lines.push(line);line='';}line+=word+' ';}lines.push(line);
    const top=google?103:42,height=Math.max(176,top+lines.length*34);
    if(canvas.height!==height){canvas.height=height;mesh.scale.y=height/176;}
    ctx.clearRect(0,0,1800,height);ctx.fillStyle='#071920ed';ctx.fillRect(0,0,1800,height);
    if(google&&logo.complete&&logo.naturalWidth)ctx.drawImage(logo,28,20,logo.naturalWidth/logo.naturalHeight*40,40);
    ctx.fillStyle='#e4f1ee';ctx.font='26px system-ui';lines.forEach((text,i)=>ctx.fillText(text,28,top+i*34));texture.needsUpdate=true;
  }
  return {mesh,update};
}
