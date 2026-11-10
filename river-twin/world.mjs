import * as THREE from 'three';
import {TilesRenderer,GoogleCloudAuthPlugin,CesiumIonAuthPlugin,GLTFExtensionsPlugin,TileCompressionPlugin,DRACOLoader} from './vendor/dependencies.js';
import {localFrame} from './geodesy.mjs';
import {createLifetime} from './lifetime.mjs';

const MIB=1024*1024;
const BUDGETS={desktop:{minMB:256,maxMB:512,minTiles:450,maxTiles:1600},xr:{minMB:80,maxMB:160,minTiles:150,maxTiles:600}};

/** Provider credentials stay inside this resource; no diagnostic snapshot includes it. */
export function createImagery(type,credential,{ready,error},geoRoot,station,assetId,bankOverlay){
  const tiles=new TilesRenderer(type==='sample'?(station.stationId==='USGS-14105700'?'./test-fixtures/tileset-columbia.json':'./test-fixtures/tileset.json'):undefined);
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
    // Match the reference Google viewer's memory optimization. Preserve positions,
    // UVs and normals exactly; only pack indices and omit extra texture mip levels.
    tiles.registerPlugin(new TileCompressionPlugin({disableMipmaps:true,compressIndex:true,compressPosition:false,compressUvs:false,compressNormals:false}));
    tiles.group.matrix.set(...localFrame(station.latitude,station.longitude).matrixRows);
    tiles.group.matrixAutoUpdate=false;geoRoot.add(tiles.group);
    tiles.errorTarget=16;
    let budgetMode=null;
    function setBudget(mode){
      if(mode===budgetMode)return;
      budgetMode=mode;const budget=BUDGETS[mode];
      tiles.lruCache.minSize=budget.minTiles;tiles.lruCache.maxSize=budget.maxTiles;
      tiles.lruCache.minBytesSize=budget.minMB*MIB;tiles.lruCache.maxBytesSize=budget.maxMB*MIB;
      if(mode==='xr'&&(tiles.lruCache.cachedBytes>budget.maxMB*MIB||tiles.lruCache.itemList.length>budget.maxTiles)){
        // LRU eviction protects visible content, so lowering limits alone cannot
        // reclaim a large desktop scene. Release leaf content before parent
        // metadata, then refine under the XR budget using the same root/auth.
        const resident=tiles.lruCache.itemList.slice().sort((a,b)=>(b.internal?.depth??0)-(a.internal?.depth??0));
        for(const tile of resident)tiles.lruCache.remove(tile);
      }
    }
    setBudget('desktop');
    let seen=false,disposed=false,models=0,cameras=[],creditsDirty=true,creditsText='';const resolution=new THREE.Vector2();
    tiles.addEventListener('load-model',event=>{bankOverlay?.attach(event.scene);models++;if(!seen&&!disposed){seen=true;ready();}});
    tiles.addEventListener('load-error',event=>{if(!disposed)error(event.error);});
    tiles.addEventListener('tile-visibility-change',()=>{creditsDirty=true;});
    const cleanText=value=>new DOMParser().parseFromString(String(value),'text/html').body.textContent.trim();
    return {
      tiles,
      update(camera,renderer){
        if(disposed)return;
        // Reuse the same authenticated tileset while switching session budgets.
        setBudget(camera.isArrayCamera?'xr':'desktop');
        if(cameras[0]!==camera){for(const previous of cameras)tiles.deleteCamera(previous);tiles.setCamera(camera);cameras=[camera];}
        if(camera.isArrayCamera&&camera.cameras[0]){const v=camera.cameras[0].viewport;resolution.set(v.z,v.w);}
        else renderer.getDrawingBufferSize(resolution);
        tiles.setResolution(camera,resolution);
        tiles.update();
      },
      credits(){
        if(type==='sample')return 'ENGINE TEST GEOMETRY · NOT RIVER IMAGERY · Hydrology: USGS / supplied HydroTwin forecasts';
        if(!creditsDirty)return creditsText;creditsDirty=false;
        const values=tiles.getAttributions().filter(item=>item.type!=='image').map(item=>cleanText(item.value)).filter(Boolean);
        creditsText=['Basemap: Google Maps',...[...new Set(values)].sort(),...(type==='ion'?['3D tiles access: Cesium ion']:[]),'Hydrology: USGS / supplied HydroTwin forecasts'].join(' · ');return creditsText;
      },
      snapshot(){return {loadedModels:models,visible:tiles.visibleTiles.size,estimatedMB:Math.round(tiles.lruCache.cachedBytes/MIB),budgetMode,budgetMB:BUDGETS[budgetMode].maxMB,refused:tiles.stats.refused,queued:tiles.stats.queued,downloading:tiles.stats.downloading,parsing:tiles.stats.parsing,resolution:resolution.toArray(),cameraCount:tiles.cameras.length,stereo:cameras[0]?.isArrayCamera===true};},
      dispose(){if(disposed)return;disposed=true;lifetime.dispose();geoRoot.remove(tiles.group);tiles.dispose();tiles.rootURL=null;draco.dispose();}
    };
  }catch(failure){lifetime.dispose();geoRoot.remove(tiles.group);tiles.dispose();draco.dispose();throw failure;}
}
