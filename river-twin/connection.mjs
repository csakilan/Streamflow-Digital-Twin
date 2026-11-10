export function safeError(error){
 const code=Number(error?.status)||Number(String(error?.message??'').match(/\b(401|403|404|429|500|502|503)\b/)?.[0]);
 if(code===401||code===403)return 'Imagery access was denied. Check the token, asset access and allowed website origins.';
 if(code===429)return 'The imagery service quota was reached. Check your provider account before reconnecting.';
 if(code===404)return 'The imagery asset was not found. Check that Google Photorealistic 3D Tiles is enabled.';
 return 'Imagery could not be loaded. Check account access and the network connection.';
}
export function createConnection(factory,onChange=()=>{}){
 let active=null,generation=0,starts=0,status='idle',message='3D imagery is not connected.',provider=null;
 const snapshot=()=>({status,message,provider,starts,active:!!active});
 const notify=()=>onChange(snapshot());
 return {snapshot,get resource(){return active;},connect(type,credential){
  if(active)return false;
  if(!['ion','google','sample'].includes(type))throw RangeError('Unknown imagery provider');
  if(type!=='sample'&&(!credential||/\s/.test(credential)||credential.length<10))throw TypeError('Enter a valid access token in this tab.');
  const id=++generation;provider=type;status='loading';message='Connecting to 3D imagery…';starts++;notify();
  const callbacks={ready(){if(id!==generation)return;status='ready';message='Captured 3D landscape. The selected river readings are historical.';notify();},error(error){if(id!==generation)return;status='error';message=safeError(error);notify();}};
  try{active=factory(type,credential,callbacks);notify();return true;}catch(error){status='error';message=safeError(error);notify();return false;}
 },disconnect(){generation++;active?.dispose();active=null;status='idle';message='3D imagery is not connected.';provider=null;notify();}};
}
