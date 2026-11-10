import {dateAt,indexAt} from './chart/data.mjs';
import {graphVariables} from './chart/graph-data.mjs';
import {stationQuery} from './navigation.mjs';
/** Keep the same forecast selection when moving between landscape and Data Space. */
export function selectionQuery(search,site,dataset,selection){
 const p=new URLSearchParams(stationQuery(search,site,dateAt(dataset,selection.issueIndex)));
 p.set('model',selection.modelIndex);p.set('lead',selection.lead);p.set('variable',selection.variable??new URLSearchParams(search).get('variable')??'rain7');return p.toString();
}
export function readSelectionQuery(dataset,search){
 const p=new URLSearchParams(search),patch={};
 const index=indexAt(dataset,p.get('day'));if(Number.isInteger(index)&&index>=0&&index<=dataset.n-8)patch.issueIndex=index;
 const model=Number(p.get('model'));if(p.has('model')&&Number.isInteger(model)&&model>=0&&model<dataset.models.length)patch.modelIndex=model;
 const lead=Number(p.get('lead'));if(p.has('lead')&&Number.isInteger(lead)&&lead>=1&&lead<=7)patch.lead=lead;
 if(Object.hasOwn(graphVariables,p.get('variable')))patch.variable=p.get('variable');return patch;
}
