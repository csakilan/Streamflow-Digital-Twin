/** Changing rivers must preserve the user's explicit access/testing mode. */
export function stationQuery(search,station,day){
 const current=new URLSearchParams(search),next=new URLSearchParams();
 next.set('station',station);next.set('day',day);
 for(const flag of ['manualAuth','engineTest','emulateXR'])if(current.has(flag))next.set(flag,current.get(flag));
 return next.toString();
}
