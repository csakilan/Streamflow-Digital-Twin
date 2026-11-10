import {readFileSync,writeFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const metadata=read('source-metadata.json'),results={};
function ringContains(ring,x,y){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
for(const [site,m] of Object.entries(metadata)){
 const buildings=read(`${m.name}-source-footprints.json`).elements,reference=read(`${m.name}-reference-waterbodies.json`);
 const features=reference.features.map(f=>({rings:f.geometry.rings.map(r=>({r,bounds:[Math.min(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[0])),Math.max(...r.map(p=>p[1]))]}))}));
 const isWater=(x,y)=>features.some(f=>{let inside=false;for(const {r,bounds:b} of f.rings)if(x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3]&&ringContains(r,x,y))inside=!inside;return inside;});
 const pixelX=(lon,z)=>(lon+180)/360*256*2**z;
 const pixelY=(lat,z)=>{const s=Math.sin(lat*Math.PI/180);return (.5-Math.log((1+s)/(1-s))/(4*Math.PI))*256*2**z;};
 const mx=lon=>(pixelX(lon,0)-pixelX(m.longitude,0))*156543.03392*Math.cos(m.latitude*Math.PI/180);
 const mz=lat=>(pixelY(lat,0)-pixelY(m.latitude,0))*156543.03392*Math.cos(m.latitude*Math.PI/180);
 const scale=156543.03392*Math.cos(m.latitude*Math.PI/180)/2**15;
 const x0=(Math.round(pixelX(m.longitude,15)/256)-2)*256,y0=(Math.round(pixelY(m.latitude,15)/256)-2)*256;
 const west=(x0-pixelX(m.longitude,15))*scale,north=(y0-pixelY(m.latitude,15))*scale;
 const candidates=[];let rendered=0;
 for(const b of buildings){const pts=b.geometry.map(g=>[g.lon,g.lat]);if(pts.length<4)continue;
  if(!pts.every(([lon,lat])=>mx(lon)>=west+2&&mx(lon)<=west+m.innerBlockWidthM-2&&mz(lat)>=north+2&&mz(lat)<=north+m.innerBlockWidthM-2))continue;
  rendered++;const unique=pts.slice(0,-1),center=unique.reduce((a,p)=>[a[0]+p[0]/unique.length,a[1]+p[1]/unique.length],[0,0]);
  if(!isWater(...center))continue;
  let area=0;for(let i=0,j=unique.length-1;i<unique.length;j=i++)area+=mx(unique[j][0])*mz(unique[i][1])-mx(unique[i][0])*mz(unique[j][1]);
  candidates.push({id:b.id,center,world:[mx(center[0]),mz(center[1])],areaM2:Math.abs(area)/2,allVerticesInMappedWater:pts.every(p=>isWater(...p)),distanceToGaugeM:Math.hypot(mx(center[0]),mz(center[1]))});
 }
 candidates.sort((a,b)=>a.distanceToGaugeM-b.distanceToGaugeM);
 results[site]={site,name:m.name,renderedFootprints:rendered,centroidsInReferenceWater:candidates.length,allVerticesInReferenceWater:candidates.filter(c=>c.allVerticesInMappedWater).length,candidates};
 console.log(JSON.stringify({...results[site],candidates:candidates.slice(0,5)},null,2));
}
writeFileSync(new URL('building-water-overlap.json',import.meta.url),JSON.stringify(results,null,2));
