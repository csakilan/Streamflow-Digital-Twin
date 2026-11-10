import * as THREE from 'three';
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
