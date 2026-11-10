import * as THREE from 'three';
/** Project an independent 2D GIS bank reference onto the rendered terrain.
 * No guessed water elevation, Google geometry sampling, or geometry export.
 */
export function createBankOverlay(data,geoRoot){
 const [x0,z0,x1,z1]=data.bounds,size=4096,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d'),toX=x=>(x-x0)/(x1-x0)*size,toY=z=>(z-z0)/(z1-z0)*size;
 ctx.lineJoin='round';ctx.lineCap='round';
 for(const [width,alpha] of [[6,.2],[data.lineWidthM,1]]){
  ctx.strokeStyle=`rgba(255,255,255,${alpha})`;ctx.lineWidth=width/(x1-x0)*size;
  ctx.beginPath();for(const path of data.paths){path.forEach(([x,z],i)=>i?ctx.lineTo(toX(x),toY(z)):ctx.moveTo(toX(x),toY(z)));}ctx.stroke();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.generateMipmaps=true;
 const uniforms={bankMask:{value:texture},bankFrame:{value:new THREE.Matrix4()},bankBounds:{value:new THREE.Vector4(x0,z0,x1-x0,z1-z0)},bankEnabled:{value:1}};
 let attached=0;
 function attach(root){root.traverse(object=>{
  for(const material of (Array.isArray(object.material)?object.material:[object.material])){
   if(!material||material.userData.riverBankOverlay)continue;
   material.userData.riverBankOverlay=true;attached++;
   const oldCompile=material.onBeforeCompile,oldKey=material.customProgramCacheKey.bind(material);
   material.onBeforeCompile=function(shader,renderer){
    oldCompile.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='uniform mat4 bankFrame; varying vec3 bankPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nbankPosition=(bankFrame * modelMatrix * vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='uniform sampler2D bankMask; uniform vec4 bankBounds; uniform float bankEnabled; varying vec3 bankPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 bankUV=(bankPosition.xz-bankBounds.xy)/bankBounds.zw;
      float bankInside=step(0.0,bankUV.x)*step(0.0,bankUV.y)*step(bankUV.x,1.0)*step(bankUV.y,1.0);
      float bankAlpha=texture2D(bankMask,vec2(bankUV.x,1.0-bankUV.y)).a*bankInside*bankEnabled;
      // A vertical wall or tree trunk must not become a tall cyan curtain.
      vec3 bankNormal=normalize(cross(dFdx(bankPosition),dFdy(bankPosition)));
      float bankSurface=smoothstep(0.35,0.8,abs(bankNormal.y));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.025,0.70,0.78),bankAlpha*bankSurface*0.85);`);
   };
   material.customProgramCacheKey=()=>oldKey()+'-usgs-bank-reference-v1';material.needsUpdate=true;
  }
 });}
 return {attach,update(){uniforms.bankFrame.value.copy(geoRoot.matrixWorld).invert();},set visible(value){uniforms.bankEnabled.value=value?1:0;},get visible(){return uniforms.bankEnabled.value===1;},snapshot:()=>({visible:uniforms.bankEnabled.value===1,paths:data.paths.length,referenceDate:data.referenceDate,attachedMaterials:attached}),dispose(){texture.dispose();}};
}
