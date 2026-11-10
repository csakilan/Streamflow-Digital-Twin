import * as THREE from 'three';
import {dateAt} from './chart/data.mjs';
import {readings} from './readings.mjs';
export {createCredits} from './credits.mjs';
const WIDTH=960,HEIGHT=1080,HEADER=105;
export const numeric=(v,digits=0)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:digits}):'Unavailable';
export function createPanel(dataset,selection,onAction,stageData){
 const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.18,1.18*HEIGHT/WIDTH),material);mesh.renderOrder=100;
 const group=new THREE.Group();group.add(mesh);let minimized=false,hitZones=[],tab='river';
 const title=dataset.station.stationId.endsWith('01646500')?'POTOMAC / LITTLE FALLS':'COLUMBIA / THE DALLES';
 function text(value,x,y,size=24,color='#b5ced7',weight='400'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui,sans-serif`;ctx.fillText(String(value),x,y);}
 function button(id,label,x,y,w,active=false){ctx.fillStyle=active?'#286c70':'#24434f';ctx.beginPath();ctx.roundRect(x,y,w,58,10);ctx.fill();text(label,x+14,y+37,22,'#e8f6f4','600');hitZones.push({id,x,y,w,h:58});}
 function line(y){ctx.strokeStyle='#34535f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(32,y);ctx.lineTo(928,y);ctx.stroke();}
 function row(label,value,y,color='#eef7f5'){text(label,32,y,23);text(value,530,y,27,color,'600');line(y+18);}
 function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);hitZones=[];
  ctx.fillStyle='#102631f5';ctx.beginPath();ctx.roundRect(0,0,WIDTH,minimized?230:HEIGHT,24);ctx.fill();ctx.strokeStyle='#527987';ctx.lineWidth=2;ctx.stroke();
  const v=selection.get(),r=readings(dataset,v,stageData),c=r.comparison;
  text(title,30,43,27,'#8ce7d2','650');text('Drag this header to move the data panel',30,79,20);
  button('minimize',minimized?'+':'−',884,21,52);
  if(minimized){text(`Target ${c.targetDate} · +${v.lead}d`,32,134,23);text(`Observed ${numeric(c.observedCfs)} cfs`,32,185,30,'#85dcf1','650');text(`Forecast ${numeric(c.predictedCfs)} cfs`,490,185,30,'#ffbd7b','650');texture.needsUpdate=true;return;}
  [['river','River'],['forecast','7 days'],['weather','Weather'],['season','Season'],['accuracy','Accuracy']].forEach(([id,label],i)=>button('tab:'+id,label,24+i*185,118,175,tab===id));
  if(tab==='river'){
   text('ISSUED',32,220,20);text(c.issueDate,32,261,32,'#eff7f5','600');
   text(`TARGET / +${c.lead} DAY${c.lead===1?'':'S'}`,490,220,20);text(c.targetDate,490,261,32,'#eff7f5','600');
   text('FORECAST',32,324,22,'#efb277');text('OBSERVED',490,324,22,'#77cfed');
   text(numeric(c.predictedCfs),32,388,59,'#ffbd7b','650');text(numeric(c.observedCfs),490,388,59,'#85dcf1','650');
   text('cfs · cubic feet of water passing per second',32,429,23);
   row('Forecast gauge height · estimate',numeric(c.predictedStageFt,2)+' ft',494,'#ffbd7b');
   row('Observed-flow height · estimate',numeric(c.observedEstimatedStageFt,2)+' ft',553,'#85dcf1');
   row('Measured gauge stage · target day',r.stage?numeric(r.stage.meanFt,2)+' ft':'Not packaged for this day',612);
   text(r.stage?`Mean of ${r.stage.samples} instantaneous USGS readings.`:'Measured stage coverage is limited to cached dates.',32,659,21);
   text('Gauge height is relative to a station datum, not river depth.',32,696,21);
   history(c,32,742,896,100);
  }else if(tab==='forecast'){
   text('ONE FORECAST RUN · issued '+c.issueDate,32,227,27,'#eff7f5','600');
   text('Lead',32,284,22);text('Target date',190,284,22);text('Forecast · cfs',440,284,22,'#ffbd7b');text('Actual · cfs',700,284,22,'#85dcf1');
   r.forecast.forEach((f,i)=>{const y=342+i*61;if(f.lead===v.lead){ctx.fillStyle='#274954';ctx.fillRect(22,y-33,916,49);}text('+'+f.lead+' day',32,y,25);text(f.targetDate,190,y,25);text(numeric(f.predictedCfs),440,y,29,'#ffbd7b','600');text(numeric(f.observedCfs),700,y,29,'#85dcf1','600');});
   text('Actuals are historical outcomes, not information at issuance.',32,807,22);
   text('Changing lead selects a row; the issue date stays fixed.',32,844,22);
  }else if(tab==='weather'){
   const i=r.input;text('INPUTS ON ISSUE DATE · '+i.date,32,226,27,'#eff7f5','600');
   [['Mean air temperature',numeric(i.temperature,1)+' °C'],['Rain · previous 3 days',numeric(i.rain3.value,1)+' mm'],['Rain · previous 7 days',numeric(i.rain7.value,1)+' mm'],['Soil moisture · 2 in depth',numeric(i.soil2,1)+' %'],['Soil moisture · 8 in depth',numeric(i.soil8,1)+' %'],['Soil moisture · 20 in depth',numeric(i.soil20,1)+' %'],['Snow water equivalent · site 1',numeric(i.snow1,1)+' in'],['Snow water equivalent · site 2',numeric(i.snow2,1)+' in'],['Snow water equivalent · site 3',numeric(i.snow3,1)+' in']].forEach(([k,val],j)=>row(k,val,291+j*55));
   text('Regional sensors, not measurements at the river gauge.',32,816,21);text('SWE = liquid water in snow; it does not prove falling snow.',32,850,21);
  }else if(tab==='season'){
   const s=r.seasonal;text(s.monthLabel.toUpperCase()+' · SEASONAL CONTEXT',32,229,28,'#eff7f5','600');
   text('Is this target day unusual for this month?',32,280,25);
   row('Selected day · observed flow',numeric(s.observedCfs)+' cfs',356,'#85dcf1');row('Typical month · median',numeric(s.medianCfs)+' cfs',424);
   row('Middle half · lower to upper',numeric(s.lowerCfs)+' – '+numeric(s.upperCfs)+' cfs',492);
   row('Percent of reference days at/below it',numeric(s.percentile,1)+' %',560);
   text(s.position,32,642,35,'#8ce7d2','600');
   text(`${s.count} daily values from ${s.years} other years.`,32,714,24);text(`Selected year ${s.selectedYear} is excluded.`,32,757,24);
   text('Retrospective context across the supplied record.',32,820,22);
  }else{
   const a=r.accuracy;text('FORECAST ACCURACY BY LEAD',32,225,28,'#eff7f5','600');
   text(dateAt(dataset,a.from)+' → '+dateAt(dataset,a.to)+' · ends on issue date',32,270,23);
   text('Lead',32,330,23);text('MAE · cfs',245,330,23);text('Bias · cfs',500,330,23);text('Pairs',775,330,23);
   a.rows.forEach((x,i)=>{const y=386+i*55;if(x.lead===v.lead){ctx.fillStyle='#274954';ctx.fillRect(22,y-32,916,47);}text('+'+x.lead+' day',32,y,25);text(numeric(x.maeCfs),245,y,28,'#ffbd7b','600');text((x.biasCfs>0?'+':'')+numeric(x.biasCfs),500,y,28,'#eff7f5');text(x.count,775,y,28);});
   text('MAE: average mistake size; lower is better.',32,800,22);text('Bias: + overpredicts / − underpredicts. Pairs: comparisons.',32,835,21);text('Up to 90 target days · retrospective, not held-out ranking.',32,868,21);
  }
  button('previous','← Issue day',24,916,212);button('next','Issue day →',247,916,212);button('lead',`Lead +${v.lead}d`,470,916,178);button('model',c.modelName,659,916,277);
  button('view','Scene ↻',24,994,168);button('banks','Bank outline',204,994,210);button('z','Graph Z ↻',426,994,226);button('data','Data Space',664,994,272);
  texture.needsUpdate=true;
 }
 function history(c,x,y,w,h){const start=Math.max(0,c.issueIndex-21),end=Math.min(dataset.n-1,c.issueIndex+7),values=dataset.flow.slice(start,end+1).filter(Number.isFinite),max=Math.max(1,...values,c.predictedCfs??0);ctx.strokeStyle='#73cce5';ctx.lineWidth=4;ctx.beginPath();let down=false;for(let i=start;i<=end;i++){const f=dataset.flow[i];if(!Number.isFinite(f)){down=false;continue;}const px=x+(i-start)/(end-start)*w,py=y+h-f/max*h;if(down)ctx.lineTo(px,py);else ctx.moveTo(px,py);down=true;}ctx.stroke();if(Number.isFinite(c.predictedCfs)){ctx.fillStyle='#ffbc7c';ctx.beginPath();ctx.arc(x+(c.targetIndex-start)/(end-start)*w,y+h-c.predictedCfs/max*h,7,0,Math.PI*2);ctx.fill();}text('Daily observed flow + selected forecast dot',x,y-15,20);}
 function pick(raycaster){const hit=raycaster.intersectObject(mesh)[0];if(!hit)return null;const p={x:hit.uv.x*WIDTH,y:(1-hit.uv.y)*HEIGHT};if(p.y<0||p.y>(minimized?230:HEIGHT))return null;return {hit,action:hitZones.find(z=>p.x>=z.x&&p.x<=z.x+z.w&&p.y>=z.y&&p.y<=z.y+z.h)?.id??(p.y<HEADER?'drag':null)};}
 function activate(action){if(action==='minimize'){minimized=!minimized;draw();}else if(action?.startsWith('tab:')){tab=action.slice(4);draw();}else if(action&&action!=='drag')onAction(action);}
 function targets(camera){group.updateWorldMatrix(true,true);return [...hitZones,{id:'header',x:290,y:23,w:180,h:60},{id:'body',x:300,y:325,w:150,h:50}].map(z=>{const local=new THREE.Vector3(((z.x+z.w/2)/WIDTH-.5)*1.18,(.5-(z.y+z.h/2)/HEIGHT)*1.18*HEIGHT/WIDTH,0),world=group.localToWorld(local),screen=world.clone().project(camera);return {id:z.id,world:world.toArray(),screen:[(screen.x+1)/2*innerWidth,(1-screen.y)/2*innerHeight]};});}
 draw();return {group,mesh,draw,pick,activate,targets,get minimized(){return minimized;},get tab(){return tab;},dispose(){mesh.geometry.dispose();material.dispose();texture.dispose();}};
}
