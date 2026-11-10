const DAY=86400000;
const valid=value=>typeof value==='number'&&Number.isFinite(value);
const seasonalCache=new WeakMap();
function checkTarget(d,index){if(!Number.isInteger(index)||index<0||index>=d.n)throw new RangeError('Target outside supplied record');}
function quantile(sorted,p){if(!sorted.length)return null;const at=(sorted.length-1)*p,lo=Math.floor(at),hi=Math.ceil(at);return sorted[lo]+(sorted[hi]-sorted[lo])*(at-lo);}

/** Same-month retrospective baseline; the selected year cannot rank itself. */
export function getSeasonalContext(d,targetIndex){
 checkTarget(d,targetIndex);
 const start=Date.parse(d.start+'T00:00:00Z'),date=new Date(start+targetIndex*DAY),month=date.getUTCMonth(),selectedYear=date.getUTCFullYear(),key=`${selectedYear}-${month}`;
 let cache=seasonalCache.get(d);if(!cache){cache=new Map();seasonalCache.set(d,cache);}let reference=cache.get(key);
 if(!reference){const values=[],years=new Set();for(let i=0;i<d.n;i++){if(!valid(d.flow[i]))continue;const at=new Date(start+i*DAY),year=at.getUTCFullYear();if(year!==selectedYear&&at.getUTCMonth()===month){values.push(d.flow[i]);years.add(year);}}values.sort((a,b)=>a-b);reference={values,years:years.size};cache.set(key,reference);}
 const values=reference.values,observedCfs=valid(d.flow[targetIndex])?d.flow[targetIndex]:null,lowerCfs=quantile(values,.25),medianCfs=quantile(values,.5),upperCfs=quantile(values,.75),percentile=observedCfs!==null&&values.length?values.filter(q=>q<=observedCfs).length/values.length*100:null;
 const position=percentile===null?'Unavailable':observedCfs<lowerCfs?'Below typical range':observedCfs>upperCfs?'Above typical range':'Within typical range';
 return {observedCfs,lowerCfs,medianCfs,upperCfs,percentile,position,count:values.length,years:reference.years,selectedYear,month:month+1,monthLabel:new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(date)};
}

/** Fair lead comparison: identical resolved target window, correct issue index. */
export function getLeadAccuracy(d,{modelIndex,targetIndex},days=90){
 checkTarget(d,targetIndex);if(!Number.isInteger(modelIndex)||!d.pred[modelIndex]||!Number.isInteger(days)||days<1)throw new RangeError('Invalid model or evaluation window');
 const from=Math.max(0,targetIndex-days+1),to=targetIndex,rows=[];
 for(let lead=1;lead<=7;lead++){let absolute=0,signed=0,count=0;for(let target=from;target<=to;target++){const issue=target-lead;if(issue<0)continue;const predicted=d.pred[modelIndex][lead-1]?.[issue],observed=d.flow[target];if(!valid(predicted)||!valid(observed))continue;const error=predicted-observed;absolute+=Math.abs(error);signed+=error;count++;}rows.push({lead,count,maeCfs:count?absolute/count:null,biasCfs:count?signed/count:null});}
 return {from,to,rows,days:to-from+1,modelIndex};
}
