import * as THREE from 'three';
import {TilesRenderer,GoogleCloudAuthPlugin,CesiumIonAuthPlugin,GLTFExtensionsPlugin,DRACOLoader} from './vendor/dependencies.js';
import {localFrame} from './geodesy.mjs';
import {createLifetime} from './lifetime.mjs';

/** Provider credentials stay inside this resource; no diagnostic snapshot includes it. */
export function createImagery(type,credential,{ready,error},geoRoot,station,assetId){
  const tiles=new TilesRenderer(type==='sample'?'./test-fixtures/tileset.json':undefined);
  const draco=new DRACOLoader().setDecoderPath('./vendor/draco/');
  const lifetime=createLifetime();tiles.fetchOptions={signal:lifetime.signal};
  const register=tiles.registerPlugin.bind(tiles);
  // Ion registers a Google auth plugin only after its endpoint resolves. Guard
  // that plugin too, so an old connection cannot start requests after Disconnect.
  tiles.registerPlugin=plugin=>{if(plugin.auth)lifetime.guard(plugin.auth);return register(plugin);};
  try{
    if(type==='google')tiles.registerPlugin(new GoogleCloudAuthPlugin({apiToken:credential,autoRefreshToken:true,useRecommendedSettings:false}));
    if(type==='ion')tiles.registerPlugin(new CesiumIonAuthPlugin({apiToken:credential,assetId,autoRefreshToken:true,useRecommendedSettings:false}));
    tiles.registerPlugin(new GLTFExtensionsPlugin({dracoLoader:draco}));
    tiles.group.matrix.set(...localFrame(station.latitude,station.longitude).matrixRows);
    tiles.group.matrixAutoUpdate=false;geoRoot.add(tiles.group);
    tiles.errorTarget=16;
    tiles.lruCache.minSize=150;tiles.lruCache.maxSize=600;
    tiles.lruCache.minBytesSize=80*1024*1024;tiles.lruCache.maxBytesSize=160*1024*1024;
    let seen=false,disposed=false,models=0,cameras=[],creditsDirty=true,creditsText='';
    tiles.addEventListener('load-model',()=>{models++;if(!seen&&!disposed){seen=true;ready();}});
    tiles.addEventListener('load-error',event=>{if(!disposed)error(event.error);});
    tiles.addEventListener('tile-visibility-change',()=>{creditsDirty=true;});
    const cleanText=value=>new DOMParser().parseFromString(String(value),'text/html').body.textContent.trim();
    return {
      tiles,
      update(camera,renderer){
        if(disposed)return;
        if(cameras[0]!==camera){for(const previous of cameras)tiles.deleteCamera(previous);tiles.setCamera(camera);cameras=[camera];}
        if(camera.isArrayCamera&&camera.cameras[0]){const v=camera.cameras[0].viewport;tiles.setResolution(camera,v.z,v.w);}
        else tiles.setResolutionFromRenderer(camera,renderer);
        tiles.update();
      },
      credits(){
        if(type==='sample')return 'ENGINE TEST GEOMETRY · NOT RIVER IMAGERY · Hydrology: USGS / supplied HydroTwin forecasts';
        if(!creditsDirty)return creditsText;creditsDirty=false;
        const values=tiles.getAttributions().filter(item=>item.type!=='image').map(item=>cleanText(item.value)).filter(Boolean);
        creditsText=['Basemap: Google Maps',...[...new Set(values)].sort(),...(type==='ion'?['3D tiles access: Cesium ion']:[]),'Hydrology: USGS / supplied HydroTwin forecasts'].join(' · ');return creditsText;
      },
      snapshot(){return {loadedModels:models,visible:tiles.visibleTiles.size,estimatedMB:Math.round(tiles.lruCache.cachedBytes/1024/1024),cameraCount:tiles.cameras.length,stereo:cameras[0]?.isArrayCamera===true};},
      dispose(){if(disposed)return;disposed=true;lifetime.dispose();geoRoot.remove(tiles.group);tiles.dispose();tiles.rootURL=null;draco.dispose();}
    };
  }catch(failure){lifetime.dispose();geoRoot.remove(tiles.group);tiles.dispose();draco.dispose();throw failure;}
}
