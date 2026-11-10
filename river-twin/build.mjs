import {build} from 'esbuild';import {mkdir,copyFile,writeFile,readdir} from 'node:fs/promises';
await mkdir(new URL('./vendor/draco/',import.meta.url),{recursive:true});
// Upstream tile diagnostics can log credential-bearing request URLs. Preserve its
// error events for the UI, but omit dependency console calls from this bundle.
await build({entryPoints:[new URL('./dependencies.mjs',import.meta.url).pathname],bundle:true,format:'esm',plugins:[{name:'shared-three-core',setup(build){build.onResolve({filter:/^three$/},()=>({path:'three',external:true}));}}],minify:true,drop:['console'],legalComments:'eof',outfile:new URL('./vendor/dependencies.js',import.meta.url).pathname});
for(const file of ['three.module.min.js','three.core.min.js'])await copyFile(new URL('./node_modules/three/build/'+file,import.meta.url),new URL('./vendor/'+file,import.meta.url));
for(const file of ['draco_decoder.wasm','draco_wasm_wrapper.js','draco_decoder.js'])await copyFile(new URL('./node_modules/three/examples/jsm/libs/draco/gltf/'+file,import.meta.url),new URL('./vendor/draco/'+file,import.meta.url));
await copyFile(new URL('./node_modules/three/LICENSE',import.meta.url),new URL('./vendor/THREE-LICENSE.txt',import.meta.url));
await copyFile(new URL('./node_modules/3d-tiles-renderer/LICENSE',import.meta.url),new URL('./vendor/3D-TILES-LICENSE.txt',import.meta.url));
await build({stdin:{contents:"export {XRDevice,metaQuest3} from 'iwer';",resolveDir:new URL('.',import.meta.url).pathname},bundle:true,format:'esm',minify:true,legalComments:'eof',outfile:new URL('./vendor/iwer.js',import.meta.url).pathname});
await copyFile(new URL('./node_modules/iwer/LICENSE',import.meta.url),new URL('./vendor/IWER-LICENSE.txt',import.meta.url));
await mkdir(new URL('./vendor/licenses/',import.meta.url),{recursive:true});
for(const pkg of ['3d-tiles-renderer','three','pbf','pmtiles','@mapbox/vector-tile','@mapbox/point-geometry','fflate','gl-matrix','iwer','webxr-layers-polyfill','protocol-buffers-schema','resolve-protobuf-schema']){
 const directory=new URL('./node_modules/'+pkg+'/',import.meta.url);
 for(const file of await readdir(directory)){if(/^(LICENSE|COPYING|NOTICE)/i.test(file))await copyFile(new URL(file,directory),new URL('./vendor/licenses/'+pkg.replaceAll('/','-')+'-'+file,import.meta.url));}
}
await writeFile(new URL('./vendor/NOTICE.txt',import.meta.url),'Runtime: Three.js 0.185.0 (MIT); NASA-AMMOS 3D Tiles Renderer 0.5.4 (Apache-2.0). Dependency console diagnostics are omitted to avoid logging credential-bearing URLs; errors remain available through load-error events. Third-party license notices: licenses/ and bundle legal comments. Draco decoder: Google Draco, Apache-2.0 (included 3D-TILES Apache license). IWER 2.1.0 (MIT) is used only for explicitly enabled desktop XR emulation; see IWER-LICENSE.txt. Imagery tiles and provider credentials are not included.\n');
console.log('Built isolated pinned VR runtime and decoders.');
