"""Build compact reference water meshes; requires Shapely >= 2.1 (build only).

Input: cached official ArcGIS rings in WGS84. Output: local-meter triangles
clipped to the SAME diagonal/grid as the existing terrain. No water elevations
are inferred from these polygons, and no horizontal/vertical datum is invented.
"""
from pathlib import Path
import json, math, hashlib
import numpy as np
import shapely
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

ROOT=Path(__file__).resolve().parents[1]
DIAG=ROOT/'docs/diagnostics/2026-11-09'
OUT=ROOT/'assets/river-water/data'

def px(lon,z): return (lon+180)/360*256*2**z
def py(lat,z):
 s=math.sin(math.radians(lat));return (.5-math.log((1+s)/(1-s))/(4*math.pi))*256*2**z

def parts(g):
 if g.geom_type=='Polygon': return [g]
 return [p for c in getattr(g,'geoms',[]) for p in parts(c)]

def read_water(path,lon,lat):
 data=json.loads(path.read_text()); assert data['spatialReference']['wkid']==4326
 all_polys=[]
 for feature in data['features']:
  shells=[];holes=[]
  for r in feature['geometry']['rings']:
   area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(r,r[1:]))
   (shells if area<0 else holes).append(r)
  assigned=[[] for _ in shells]
  shell_polys=[Polygon(s) for s in shells]
  for hole in holes:
   probe=Polygon(hole).representative_point()
   candidates=[(s.area,i) for i,s in enumerate(shell_polys) if s.covers(probe)]
   assert candidates,'unassigned source island'
   assigned[min(candidates)[1]].append(hole)
  for shell,hs in zip(shells,assigned): all_polys.extend(parts(shapely.make_valid(Polygon(shell,hs))))
 geo=unary_union(all_polys)
 scale=156543.03392*math.cos(math.radians(lat))
 def local(x,y,z=None):
  x=np.asarray(x); y=np.asarray(y);s=np.sin(np.radians(y))
  return ((x-lon)/360*256*scale,((.5-np.log((1+s)/(1-s))/(4*math.pi))*256-py(lat,0))*scale)
 return shapely.transform(geo,local,interleaved=False)

def build_mesh(water,bounds,n,tolerance):
 x0,z0,x1,z1=bounds; source_clip=water.intersection(box(*bounds)); clipped=source_clip.simplify(tolerance,preserve_topology=True)
 # Clip each terrain triangle, not a whole square. Curved coastlines and holes
 # are exact polygon intersections; subdivision ensures matching elevation.
 cells=[];cb=clipped.bounds
 dx=(x1-x0)/(n-1);dz=(z1-z0)/(n-1)
 for j in range(n-1):
  z=z0+j*dz
  for i in range(n-1):
   x=x0+i*dx
   if x+dx<cb[0] or x>cb[2] or z+dz<cb[1] or z>cb[3]:continue
   cells.extend([Polygon([(x,z),(x,z+dz),(x+dx,z)]),Polygon([(x+dx,z),(x,z+dz),(x+dx,z+dz)])])
 cut=shapely.intersection(np.array(cells,dtype=object),clipped)
 polygons=[p for g in cut if not g.is_empty for p in parts(g) if p.area>1e-8]
 tri=shapely.constrained_delaunay_triangles(np.array(polygons,dtype=object))
 triangles=[t for g in tri for t in g.geoms if t.area>1e-8]
 vertices=[];indices=[];lookup={}
 for t in triangles:
  coords=list(t.exterior.coords)[:3]
  # Up-facing winding in Three.js X/Z coordinates.
  if sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(coords,coords[1:]+coords[:1]))>0:coords.reverse()
  rounded=[(round(x,3),round(z,3)) for x,z in coords]
  cross=(rounded[1][0]-rounded[0][0])*(rounded[2][1]-rounded[0][1])-(rounded[1][1]-rounded[0][1])*(rounded[2][0]-rounded[0][0])
  if abs(cross)<=1e-8:continue
  if cross>0:rounded.reverse()
  for key in rounded:
   if key not in lookup:lookup[key]=len(vertices)//2;vertices.extend(key)
   indices.append(lookup[key])
 rings=[[[[round(x,3),round(z,3)] for x,z in r.coords] for r in [p.exterior,*p.interiors]] for p in parts(clipped)]
 # Clip ORIGINAL boundaries, not the boundary of the clipped polygon. The
 # latter includes artificial cross-river closing edges at the scene bounds.
 def lineparts(g):
  if g.geom_type=='LineString':return [g]
  return [p for c in getattr(g,'geoms',[]) for p in lineparts(c)]
 bank_geometry=water.simplify(tolerance,preserve_topology=True).boundary.intersection(box(*bounds))
 banks=[[[round(x,3),round(z,3)] for x,z in line.segmentize(min(dx,dz)/2).coords] for line in lineparts(bank_geometry)]
 # Independent geometric acceptance: union area and coverage, including islands.
 merged=unary_union(triangles)
 error=merged.symmetric_difference(clipped).area
 assert error<max(.01,clipped.area*1e-8),(error,clipped.area)
 report={'simplificationToleranceM':tolerance,'sourceAreaM2':round(source_clip.area,3),'simplificationDifferenceM2':round(clipped.symmetric_difference(source_clip).area,3),'areaM2':round(clipped.area,3),'preQuantizationCoverageErrorM2':round(error,6),'coordinateRoundingM':.001,'polygons':len(rings),'islands':sum(len(r)-1 for r in rings),'vertices':len(vertices)//2,'triangles':len(indices)//3}
 return {'bounds':bounds,'grid':n,'vertices':vertices,'indices':indices,'polygons':rings,'banks':banks,'validation':report}

def main():
 OUT.mkdir(parents=True,exist_ok=True);meta=json.loads((DIAG/'source-metadata.json').read_text());prov=json.loads((DIAG/'reference-waterbody-provenance.json').read_text());summary={}
 for site in ['01646500','14105700']:
  m=meta[site];lon=m['longitude'];lat=m['latitude'];name=m['name'];scale=156543.03392*math.cos(math.radians(lat))
  def bounds(z,tiles,rounding):
   gx,gy=px(lon,z),py(lat,z);x0=(rounding(gx/256)-2)*256;y0=(rounding(gy/256)-2)*256;k=scale/2**z
   return [(x0-gx)*k,(y0-gy)*k,(x0+tiles*256-gx)*k,(y0+tiles*256-gy)*k]
  source=DIAG/f'{name}-reference-waterbodies.json';water=read_water(source,lon,lat)
  data={'version':1,'site':site,'origin':[lon,lat],'coordinateSystem':'Local X east / Z south in meters; same Web Mercator pixel transform and latitude scale as host app','verticalReference':'none: mapped horizontal footprint; renderer follows existing terrain, not calibrated water elevation','source':next(p for p in prov if p['name']==name),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'referenceDate':'2023-09-14','inner':build_mesh(water,bounds(15,4,lambda v:math.floor(v+.5)),385,.5),'innerQuest':build_mesh(water,bounds(15,4,lambda v:math.floor(v+.5)),289,.5),'table':build_mesh(water,bounds(12,5,math.floor),257,2.)}
  target=OUT/f'{site}.json';temporary=target.with_suffix('.json.tmp');temporary.write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False)+'\n');temporary.replace(target);summary[site]={'bytes':target.stat().st_size,'inner':data['inner']['validation'],'innerQuest':data['innerQuest']['validation'],'table':data['table']['validation']};print(site,json.dumps(summary[site]))
 (OUT/'build-report.json').write_text(json.dumps(summary,indent=2)+'\n')
if __name__=='__main__':main()
