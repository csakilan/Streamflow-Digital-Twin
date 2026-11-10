// WMO snowfall/snow-grain/snow-shower codes; snowpack/SWE is deliberately not an input.
export const SNOW_CODES=new Map([[71,.28],[73,.6],[75,1],[77,.22],[85,.35],[86,.9]]);
export function historicalWeather(archive,date){
 if(!archive||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const ms=Date.parse(date+'T00:00:00Z'),start=Date.parse(archive.start+'T00:00:00Z');
 if(!Number.isFinite(ms)||!Number.isFinite(start)||new Date(ms).toISOString().slice(0,10)!==date)return null;
 const i=(ms-start)/86400000;
 if(!Number.isInteger(i)||i<0||i>=archive.n)return null;
 const amount=archive.snowfallCm?.[i];
 if(!Number.isFinite(amount)||amount<0)return null;
 return {date,snowfall_cm:amount,weather_code:archive.weatherCode?.[i]??null};
}
export function snowState(mode,weather,previewIntensity=.6){
 if(mode==='preview')return {active:true,intensity:Math.max(.1,Math.min(1,Number(previewIntensity)||.6)),label:'Preview snow · illustrative, not observed weather'};
 if(mode==='historical'){
  const cm=weather?.snowfall_cm;
  if(!Number.isFinite(cm)||cm<0)return {active:false,intensity:0,available:false,label:'Selected-date snowfall unavailable · snow hidden'};
  // Daily accumulation controls qualitative density, not an invented hourly rate.
  return {active:cm>0,intensity:cm>0?Math.min(1,.12+.88*Math.sqrt(cm/10)):0,available:true,
   label:`${weather.date} · ${cm.toFixed(2)} cm (${(cm/2.54).toFixed(2)} in) daily snowfall · estimated`};
 }
 if(mode!=='live')return {active:false,intensity:0,label:'Snow off'};
 const code=weather?.weather_code;
 if(!Number.isFinite(code))return {active:false,intensity:0,label:'Live weather unavailable · snow hidden'};
 const intensity=SNOW_CODES.get(code)??0;
 return {active:intensity>0,intensity,label:intensity?'Live weather model indicates snowfall':'Live weather model indicates no snowfall'};
}
