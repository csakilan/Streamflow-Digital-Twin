// Build-only: independent USGS polygons, never Google imagery or geometry.
import {readFileSync,writeFileSync} from 'node:fs';
import {bankToLocal,clipPaths} from './bank-data.mjs';
for(const site of ['01646500','14105700']){
 const source=JSON.parse(readFileSync(new URL(`../assets/river-water/data/${site}.json`,import.meta.url)));
 const paths=clipPaths(source.table.banks,[-4000,-4000,4000,4000]).map(path=>path.map(point=>{const local=bankToLocal(point,source.origin);return [local[0],local[2]].map(n=>Math.round(n*100)/100);}));
 const record={site,origin:source.origin,referenceDate:source.referenceDate,source:source.source,sourceSha256:source.sourceSha256,
  coordinateSystem:'WGS84 ECEF projected into station East / South meters; no water elevation',
  bounds:[-4100,-4100,4100,4100],lineWidthM:2.5,paths};
 writeFileSync(new URL(`./data/${site}-banks.json`,import.meta.url),JSON.stringify(record));
 console.log(site,paths.length,'independent bank paths');
}
