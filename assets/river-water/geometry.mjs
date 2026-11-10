// Match gridGeo's two terrain triangles, rather than bilinear image sampling.
export function sampleGridHeight(positions,n,bounds,x,z){
 const [x0,z0,x1,z1]=bounds;
 if(!Number.isFinite(x+z)||x<x0-1e-5||z<z0-1e-5||x>x1+1e-5||z>z1+1e-5)return null;
 const u=Math.max(0,Math.min(n-1,(x-x0)/(x1-x0)*(n-1))),v=Math.max(0,Math.min(n-1,(z-z0)/(z1-z0)*(n-1)));
 const i=Math.min(n-2,Math.floor(u)),j=Math.min(n-2,Math.floor(v)),fx=u-i,fz=v-j,k=j*n+i;
 const a=positions[k*3+1],b=positions[(k+1)*3+1],c=positions[(k+n)*3+1],d=positions[(k+n+1)*3+1];
 const y=fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(b-d)*(1-fz)+(c-d)*(1-fx);
 return Number.isFinite(y)?y:null;
}
function inRing(ring,x,z){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
export function containsWater(polygons,[x,z]){return polygons.some(rings=>inRing(rings[0],x,z)&&!rings.slice(1).some(r=>inRing(r,x,z)));}
export function waterVisibility(mode,ready){return {mapped:mode==='mapped'&&ready,legacy:mode==='original'};}
// Keep selected-date data separate from the visual interpolation/live beacon.
export function selectRiverReading({day,issue,progress,forecast,flowAt,forecastAt}){
 const lead=forecast?Math.max(0,Math.min(7,Math.round(progress))):null;
 const index=forecast?issue+lead:day,isForecast=forecast&&lead>0;
 const q=isForecast?forecastAt(lead):flowAt(index);
 return {index,lead,forecast:isForecast,flow:Number.isFinite(q)&&q>=0?q:null};
}
export function terrainReady(s){return !!s?.loaded&&s.failedTiles===0&&s.invalidPixels===0;}
export function waterCaption(mode,forecast,lead){
 if(mode==='mapped')return 'Mapped reference shoreline stays fixed · gauge heights are rating estimates';
 if(mode==='imagery')return 'Basemap only · gauge heights are rating estimates';
 return forecast?'Original estimated water surface · white dots: rating-derived comparison':`Original estimated waterline · coloured dots: earlier forecast, +${lead} d`;
}
