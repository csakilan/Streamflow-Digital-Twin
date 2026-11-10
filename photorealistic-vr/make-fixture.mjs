// Small self-authored geometry, deliberately not a substitute for river imagery.
import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import {localFrame} from './geodesy.mjs';
const primitives=[],chunks=[],views=[],accessors=[];let length=0;
function buffer(array,target,type,components){
 const bytes=Buffer.from(array.buffer);const index=views.length;views.push({buffer:0,byteOffset:length,byteLength:bytes.length,target});chunks.push(bytes);length+=bytes.length;
 const values=Array.from({length:components},(_,j)=>Array.from(array).filter((_,i)=>i%components===j));
 accessors.push({bufferView:index,componentType:type,count:array.length/components,type:components===1?'SCALAR':'VEC3',...(components===3?{min:values.map(v=>Math.min(...v)),max:values.map(v=>Math.max(...v))}:{})});
 return accessors.length-1;
}
for(const [size,position,material] of [ [[900,8,900],[0,-4,0],0], [[120,10,890],[0,5,0],1], [[90,85,80],[220,43,-200],2], [[90,45,100],[-210,23,130],2], [[180,140,150],[-260,70,-210],0] ]){
 const geometry=new THREE.BoxGeometry(...size).toNonIndexed();geometry.translate(...position);
 const pos=buffer(geometry.attributes.position.array,34962,5126,3),normal=buffer(geometry.attributes.normal.array,34962,5126,3);
 primitives.push({attributes:{POSITION:pos,NORMAL:normal},material});geometry.dispose();
}
const gltf={asset:{version:'2.0',generator:'HydroTwin synthetic engine test'},buffers:[{uri:'data:application/octet-stream;base64,'+Buffer.concat(chunks).toString('base64'),byteLength:length}],bufferViews:views,accessors,materials:[{pbrMetallicRoughness:{baseColorFactor:[.18,.36,.3,1],roughnessFactor:1}},{pbrMetallicRoughness:{baseColorFactor:[.08,.38,.5,1],roughnessFactor:.6}},{pbrMetallicRoughness:{baseColorFactor:[.75,.61,.38,1],roughnessFactor:1}}],meshes:[{primitives}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
// 3D Tiles glTF Y-up is converted to Z-up by the renderer; invert that in the
// fixture's root transform before moving the scene into ECEF coordinates.
const localToECEF=new THREE.Matrix4().set(...localFrame(38.94977778,-77.12763889).matrixRows).invert();
localToECEF.multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2));
const tileset={asset:{version:'1.1'},geometricError:1000,root:{boundingVolume:{box:[0,0,50,500,0,0,0,500,0,0,0,200]},geometricError:0,refine:'REPLACE',transform:localToECEF.toArray(),content:{uri:'engine-test.gltf'}}};
await mkdir(new URL('./test-fixtures/',import.meta.url),{recursive:true});
await writeFile(new URL('./test-fixtures/engine-test.gltf',import.meta.url),JSON.stringify(gltf));
await writeFile(new URL('./test-fixtures/tileset.json',import.meta.url),JSON.stringify(tileset));
console.log('Created local engine test tileset (not river imagery).');
