import {localFrame} from './geodesy.mjs';
/** Invert the exact Web Mercator / latitude scale used by the USGS source builder. */
export function bankToLocal([x,z],[lon,lat]){
 const rad=Math.PI/180,scale=156543.03392*Math.cos(lat*rad),s=Math.sin(lat*rad);
 const py0=(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*256;
 const longitude=lon+x/(256*scale)*360;
 const latitude=Math.atan(Math.sinh(Math.PI*(1-2*(py0+z/scale)/256)))/rad;
 return localFrame(lat,lon).toLocal(latitude,longitude,0);
}
/** Clip line segments; never introduce a polygon's artificial closing boundary. */
export function clipPaths(paths,[x0,z0,x1,z1]){
 const out=[];
 for(const path of paths){let active=null;
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1];let lo=0,hi=1,valid=true;
   for(const [p,q] of [[-dx,a[0]-x0],[dx,x1-a[0]],[-dz,a[1]-z0],[dz,z1-a[1]]]){
    if(p===0){if(q<0)valid=false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);}
   }
   if(!valid||hi<lo){active=null;continue;}
   const at=t=>[a[0]+t*dx,a[1]+t*dz],start=at(lo),end=at(hi);
   if(!active||Math.hypot(active.at(-1)[0]-start[0],active.at(-1)[1]-start[1])>.01){active=[start];out.push(active);}
   active.push(end);if(hi<1)active=null;
  }
 }
 return out.filter(p=>p.length>1);
}
