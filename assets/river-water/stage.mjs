// A daily summary of retrieved readings, not the official USGS daily statistic.
export function summarizeStage(response,site,date){
 const readings=new Map();let provisional=false;
 for(const s of response?.value?.timeSeries??[]){
  if(!s.sourceInfo?.siteCode?.some(c=>c.value===site)||!s.variable?.variableCode?.some(c=>c.value==='00065')||s.variable?.unit?.unitCode!=='ft')continue;
  for(const group of s.values??[])for(const v of group.value??[]){
   if(v.dateTime?.slice(0,10)!==date||v.value==null||String(v.value).trim()==='')continue;
   const value=Number(v.value),stamp=Date.parse(v.dateTime);
   if(!Number.isFinite(value)||!Number.isFinite(stamp)||value===s.variable.noDataValue||value<=-9999)continue;
   readings.set(stamp,value);if(v.qualifiers?.includes('P'))provisional=true;
  }
 }
 if(!readings.size)return null;
 const values=[...readings.values()],times=[...readings.keys()].sort((a,b)=>a-b);
 return {date,meanFt:values.reduce((a,b)=>a+b,0)/values.length,minFt:Math.min(...values),maxFt:Math.max(...values),samples:values.length,provisional,first:new Date(times[0]).toISOString(),last:new Date(times.at(-1)).toISOString()};
}
export function stageUrl(site,date){
 // Date-only NWIS requests are interpreted in station local time. Filter the
 // returned timestamps by that same local date, retaining each source offset.
 const p=new URLSearchParams({format:'json',sites:site,parameterCd:'00065',startDT:date,endDT:date,siteStatus:'all'});
 return 'https://waterservices.usgs.gov/nwis/iv/?'+p;
}
