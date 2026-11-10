import {getComparison,getInputSummary,dateAt} from './chart/data.mjs';
import {getSeasonalContext,getLeadAccuracy} from './chart/analytics.mjs';
export function readings(dataset,value,stageData){
 const comparison=getComparison(dataset,value);
 return {comparison,stage:stageData.days?.[comparison.targetDate]??null,
  input:getInputSummary(dataset,value.issueIndex),
  forecast:Array.from({length:7},(_,i)=>getComparison(dataset,{...value,lead:i+1})),
  seasonal:getSeasonalContext(dataset,comparison.targetIndex),
  // The issue date ends the evaluation window. Lead only highlights a row.
  accuracy:getLeadAccuracy(dataset,{modelIndex:value.modelIndex,targetIndex:value.issueIndex}),
  accuracyDate:index=>dateAt(dataset,index)};
}
