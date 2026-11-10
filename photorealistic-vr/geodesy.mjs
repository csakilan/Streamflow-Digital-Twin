// WGS84 ECEF meters -> a local East / Up / South rendering frame.
export function ecef(latitude,longitude,height=0){
 const p=latitude*Math.PI/180,l=longitude*Math.PI/180,a=6378137,e2=6.69437999014e-3,n=a/Math.sqrt(1-e2*Math.sin(p)**2);
 return [(n+height)*Math.cos(p)*Math.cos(l),(n+height)*Math.cos(p)*Math.sin(l),(n*(1-e2)+height)*Math.sin(p)];
}
export function localFrame(latitude,longitude,height=0){
 const p=latitude*Math.PI/180,l=longitude*Math.PI/180,origin=ecef(latitude,longitude,height);
 const east=[-Math.sin(l),Math.cos(l),0],up=[Math.cos(p)*Math.cos(l),Math.cos(p)*Math.sin(l),Math.sin(p)],south=[Math.sin(p)*Math.cos(l),Math.sin(p)*Math.sin(l),-Math.cos(p)];
 const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),rows=[east,up,south];
 return {origin,rows,matrixRows:[...east,-dot(east,origin),...up,-dot(up,origin),...south,-dot(south,origin),0,0,0,1],toLocal(lat,lon,h=0){const point=ecef(lat,lon,h).map((x,i)=>x-origin[i]);return rows.map(row=>dot(row,point));}};
}
