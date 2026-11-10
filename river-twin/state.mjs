import {getComparison,indexAt,dateAt} from './chart/data.mjs';
export function createSelection(dataset){
 const initial=Math.max(0,Math.min(dataset.n-8,indexAt(dataset,'2025-05-09')));
 let value={issueIndex:initial,modelIndex:0,lead:1};
 return {get:()=>({...value}),change(patch){const next={...value,...patch};if(!Number.isInteger(next.issueIndex)||next.issueIndex<0||next.issueIndex>dataset.n-8||!Number.isInteger(next.lead)||next.lead<1||next.lead>7||!Number.isInteger(next.modelIndex)||next.modelIndex<0||next.modelIndex>=dataset.models.length)throw RangeError('Selection outside available data');value=next;return {...value};},comparison:()=>getComparison(dataset,value),date:()=>dateAt(dataset,value.issueIndex)};
}
