import {dateAt,getComparison,getInputSummary,getModelSummary,riverSummary} from '../3dchart/data.mjs';
import {getSeasonalContext,getLeadAccuracy} from './analytics.mjs?v=74a5ee91efce';
export const COLORS={bg:'#142534',ink:'#edf4f7',muted:'#a3b8c8',line:'#334d60',observed:'#58bdf3',forecast:'#ffad70',environment:'#6edbc1',snow:'#c6b5ff'};
export const TITLES={overview:'Station overview',flow:'River history',forecast:'Forecast comparison',drivers:'Environmental drivers',models:'Model comparison',correlation:'Factor relationships',graph:'3D relationships',seasonal:'Seasonal context',accuracy:'Forecast accuracy by lead'};
const valid=v=>typeof v==='number'&&Number.isFinite(v);
export const fmt=(v,dp=0)=>valid(v)?v.toLocaleString('en-US',{maximumFractionDigits:dp}):'Unavailable';
export function drawPanel(canvas,{dataset:d,selection:s,type,active,minimized,expanded,correlation}){
 const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height,c=getComparison(d,s),inputs=getInputSummary(d,s.issueIndex),r=riverSummary(d,c),C=COLORS;let plot=null,summary=null;
 const text=(t,x,y,size=34,color=C.ink,max=W-90)=>{g.font=`${size>=40?600:450} ${size}px system-ui`;g.fillStyle=color;g.fillText(t,x,y,max);};
 const line=(x,y,X,Y,color=C.line)=>{g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.stroke();};
 const box=(x,y,w,h,color)=>{g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,18);g.fill();};
 g.clearRect(0,0,W,H);if(type!=='graph'&&!minimized)box(0,0,W,H,C.bg);box(0,0,W,86,active?'#29475a':'#203748');text(TITLES[type],32,57,43);text(minimized?'+':'−',W-176,57,43);text(expanded?'▣':'□',W-113,57,37);text('×',W-49,57,43);
 if(minimized)return {plot:null};
 if(type==='seasonal'){summary=getSeasonalContext(d,c.targetIndex);text(`Observed target day · ${c.targetDate}`,34,132,32,C.muted);text('Same calendar month · other record years',34,174,31,C.environment);line(34,192,W-34,192);}else if(type==='accuracy'){summary=getLeadAccuracy(d,{modelIndex:s.modelIndex,targetIndex:s.issueIndex});text(`Observed window · ${dateAt(d,summary.from)} → ${dateAt(d,summary.to)}`,34,132,30,C.muted);text(c.modelName,34,174,34,C.forecast);line(34,192,W-34,192);}else if(type!=='graph'){text(`${c.issueDate} → ${c.targetDate}  ·  +${c.lead}d`,34,132,32,C.muted);text(c.modelName,34,174,34,C.forecast);line(34,192,W-34,192);}
 function metric(label,value,unit,x,y,color=C.ink){box(x,y,446,122,'#1c3343');text(label.toUpperCase(),x+20,y+34,31,C.muted,405);text(`${value}${unit?' '+unit:''}`,x+20,y+91,47,color,405);}
 function chart(series,{from,to,unit='cfs',y=252,height=365}={}){
  const left=128,right=W-40,top=y,bottom=y+height,vals=series.flatMap(z=>z.values.filter(p=>valid(p.y)).map(p=>p.y));let lo=unit==='cfs'||unit==='mm'?0:vals.length?Math.min(...vals):0,hi=vals.length?Math.max(...vals):1;if(lo===hi)hi=lo+1;
  const X=x=>left+(x-from)/(to-from||1)*(right-left),Y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top);
  text(unit,34,top-20,29,C.muted);
  for(let i=0;i<=3;i++){const v=lo+(hi-lo)*i/3,yy=Y(v);line(left,yy,right,yy);text(Math.abs(v)>=1000?`${(v/1000).toFixed(0)}k`:v.toFixed(hi-lo<10?1:0),16,yy+10,30,C.muted,104);}
  for(const z of series){g.strokeStyle=z.color;g.lineWidth=5;g.beginPath();let pen=false;for(const p of z.values){if(!valid(p.y)){pen=false;continue;}if(!pen)g.moveTo(X(p.x),Y(p.y));else g.lineTo(X(p.x),Y(p.y));pen=true;}g.stroke();}
  text(dateAt(d,from).slice(5),left,bottom+42,31,C.muted);text(dateAt(d,to).slice(5),right-115,bottom+42,31,C.muted);plot={left,right,top,bottom,from,to};return {X,Y};
 }
 function legend(y=716){g.fillStyle=C.observed;g.fillRect(35,y-15,22,7);text('Observed',70,y,29,C.muted,240);g.fillStyle=C.forecast;g.fillRect(285,y-15,22,7);text('Forecast',320,y,29,C.muted,260);}
 if(type==='overview'){
  metric('Recorded daily flow',fmt(c.observedCfs),'cfs',34,216,C.observed);metric('Earlier forecast',fmt(c.predictedCfs),'cfs',544,216,C.forecast);
  metric('Forecast − observed',fmt(c.signedErrorCfs),'cfs',34,360,C.forecast);metric('Daily flow change',fmt(r.changePercent,1),'%',544,360);
  text(`Flow-derived height: ${fmt(c.observedEstimatedStageFt,2)} ft`,36,545,37);text(`Recorded-flow percentile: ${fmt(r.percentile,1)}`,36,596,34,C.muted);
  text(d.station.name,36,655,32,C.muted);text('Heights are estimates, not depth or flood extent.',36,716,29,C.muted);
 }else if(type==='flow'){
  text('Recorded daily flow · 90 target days',34,232,35,C.observed);const from=Math.max(0,c.targetIndex-89),to=c.targetIndex;chart([{color:C.observed,values:Array.from({length:to-from+1},(_,k)=>({x:from+k,y:d.flow[from+k]}))}],{from,to,y:276,height:335});text('Change dates using the shared date controls.',34,708,29,C.muted);
 }else if(type==='forecast'){
  text('One issue date · seven future outcomes',34,232,35);const obs=[],pred=[];for(let l=0;l<=7&&c.issueIndex+l<d.n;l++){obs.push({x:c.issueIndex+l,y:d.flow[c.issueIndex+l]});pred.push({x:c.issueIndex+l,y:l===0?d.flow[c.issueIndex]:d.pred[s.modelIndex][l-1][c.issueIndex]});}
  const {X}=chart([{color:C.observed,values:obs},{color:C.forecast,values:pred}],{from:c.issueIndex,to:Math.min(d.n-1,c.issueIndex+7),y:278,height:330});line(X(c.targetIndex),278,X(c.targetIndex),608,'#b9c7a3');legend();
 }else if(type==='drivers'){
  const variables={rain7:['7-day rainfall','mm',i=>getInputSummary(d,i).rain7.value],rain3:['3-day rainfall','mm',i=>getInputSummary(d,i).rain3.value],soil2:['Soil moisture · 2 inch','%',i=>d.nrcs.soil2[i]],soil8:['Soil moisture · 8 inch','%',i=>d.nrcs.soil8[i]],soil20:['Soil moisture · 20 inch','%',i=>d.nrcs.soil20[i]],temperature:['Mean air temperature','°C',i=>d.tmean[i]],snow:['Snow water equivalent · station 1','in SWE',i=>d.nrcs.snow1SWE?.[i]??null],snow2:['Snow water equivalent · station 2','in SWE',i=>d.nrcs.snow2SWE?.[i]??null],snow3:['Snow water equivalent · station 3','in SWE',i=>d.nrcs.snow3SWE?.[i]??null]};
  const [name,unit,value]=variables[s.variable]??variables.rain7,from=Math.max(0,s.issueIndex-59),to=s.issueIndex,values=Array.from({length:to-from+1},(_,k)=>({x:from+k,y:value(from+k)}));text(`${name} · ${fmt(value(to),1)} ${unit}`,34,232,35,C.environment);
  if(values.some(p=>valid(p.y)))chart([{color:s.variable.startsWith('snow')?C.snow:C.environment,values}],{from,to,unit,y:278,height:310});else{text('Readings unavailable for this station.',50,420,42,C.muted);text('Missing data is not zero.',50,480,36,C.muted);}
  text(`Inputs end on issue date ${c.issueDate}`,34,674,30,C.muted);text(s.variable.startsWith('soil')?d.nrcs.soilStation:s.variable.startsWith('snow')?(d.nrcs.snowStations?.[Number(s.variable.slice(4)||1)-1]??'No supplied snow station'):d.station.weatherStation,34,720,27,C.muted);
 }else if(type==='models'){
  const rows=getModelSummary(d,s),max=Math.max(1,...rows.filter(x=>valid(x.mae)).map(x=>x.mae));text(`MAE · 30 issue dates · lead +${s.lead}`,34,232,35);text('Lower error is better within this window.',34,275,29,C.muted);
  rows.forEach((x,k)=>{const yy=320+k*37;text(x.model,34,yy+20,27,k===s.modelIndex?C.forecast:C.ink,265);box(322,yy,470*(x.mae??0)/max,24,k===s.modelIndex?C.forecast:'#4b8299');text(`${fmt(x.mae)}  n=${x.count}`,805,yy+20,24,C.muted,190);});text('Average absolute forecast error in cfs.',34,734,29,C.muted);
 }else if(type==='correlation'){
  if(!correlation){text('Correlation data unavailable.',45,360,42,C.muted);return {plot};}
  const wanted=['flow','rain7','soil2','tmean','swe'],idx=wanted.map(k=>correlation.vars.findIndex(v=>v.key===k)).filter((k,i,a)=>k>=0&&a.indexOf(k)===i).slice(0,5),labels={swe:'Snow',logflow:'Log flow',flow:'Flow',rain7:'7d rain',precip:'Rain',soil2:'Soil 2in',tmean:'Temp',snow1:'Snow'},size=88,start=350,top=265;
  text('Daily associations · supplied full record',34,232,34);idx.forEach((a,i)=>{const name=labels[correlation.vars[a].key]??correlation.vars[a].name; text(name,start+i*size,top-22,23,C.muted,95);text(name,35,top+i*size+55,30,C.muted,240);idx.forEach((b,j)=>{const v=correlation.matrix[a][b];const f=valid(v)?Math.abs(v):0;box(start+j*size,top+i*size,size-5,size-5,valid(v)?v>=0?`rgb(${Math.round(35+f*130)},${Math.round(55+f*65)},${Math.round(68+f*5)})`:`rgb(35,${Math.round(55+f*65)},${Math.round(68+f*110)})`:'#263b49');text(valid(v)?v.toFixed(2):'—',start+j*size+10,top+i*size+56,30,C.ink,84);});});text('−1 opposite  ·  0 weak  ·  +1 together',34,748,29,C.muted);text('Association is not causation.',34,788,29,C.muted);
 }else if(type==='seasonal'){
  const a=summary; text(`${a.monthLabel} · seasonal comparison`,34,238,37,C.environment);
  metric('Selected-day flow',fmt(a.observedCfs),'cfs',34,267,C.observed);metric('Seasonal median',fmt(a.medianCfs),'cfs',544,267,C.environment);
  box(34,415,956,64,'#1c3343');text(a.position,54,459,39,a.position==='Above typical range'?C.forecast:a.position==='Below typical range'?C.observed:C.environment);
  text('Middle 50% of reference days',34,540,32,C.muted,485);text(a.count?`${fmt(a.lowerCfs)}–${fmt(a.upperCfs)} cfs`:'Unavailable',540,540,34,C.ink,450);line(34,562,990,562);
  text('Seasonal percentile',34,610,33,C.muted);text(valid(a.percentile)?`${fmt(a.percentile,1)} / 100`:'Unavailable',590,610,37,C.observed,395);
  text(`${fmt(a.count)} daily flows · ${a.years} reference years`,34,686,30,C.muted);text(`${a.selectedYear} excluded from the same-month baseline.`,34,731,28,C.muted);text('Local historical comparison · no flood classification.',34,775,27,C.muted);
 }else if(type==='accuracy'){
  const a=summary;text(`${a.days} target days · ends on issue date`,34,234,32,C.muted);
  const columns=[34,230,510,825];['Lead','MAE · cfs','Bias · cfs','Pairs'].forEach((name,i)=>text(name,columns[i],285,30,C.muted));line(34,302,990,302);
  a.rows.forEach((row,i)=>{const y=340+i*51;text(`+${row.lead} day${row.lead>1?'s':''}`,columns[0],y,33,C.ink,175);text(fmt(row.maeCfs),columns[1],y,33,C.forecast,260);text(valid(row.biasCfs)?`${row.biasCfs>0?'+':''}${fmt(row.biasCfs)}`:'Unavailable',columns[2],y,33,C.ink,295);text(fmt(row.count),columns[3],y,33,C.muted,160);});
  text('MAE = average absolute error; lower is better.',34,718,29,C.muted);text('Bias: + overprediction · − underprediction',34,754,29,C.muted);text('Retrospective forecasts · not a held-out ranking.',34,790,26,C.muted);
 }else if(type==='graph'){text(`${c.modelName} · +${c.lead} days · issue ${c.issueDate}`,34,752,27,C.muted);legend(790);}
 return {plot,summary};
}
