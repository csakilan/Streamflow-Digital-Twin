/** Upstream root/auth requests need an explicit resource lifetime as well as tile aborts. */
export function createLifetime(){
  const controller=new AbortController(),authObjects=new Set();let disposed=false;
  const abort=()=>new DOMException('Imagery connection closed','AbortError');
  const assertActive=()=>{if(disposed)throw abort();};
  function options(value={}){
    const signals=[controller.signal,value.signal].filter(Boolean);
    return {...value,signal:signals.length===1?signals[0]:AbortSignal.any(signals)};
  }
  function clear(auth){for(const key of ['apiToken','sessionToken','_bearerToken','_bearerHostname'])if(key in auth)auth[key]=null;}
  function guard(auth){
    if(authObjects.has(auth))return;authObjects.add(auth);
    for(const name of ['fetch','refreshToken']){
      if(typeof auth[name]!=='function')continue;
      const original=auth[name].bind(auth);
      auth[name]=async(...args)=>{
        assertActive();const index=name==='fetch'?1:0;args[index]=options(args[index]);
        try{const result=await original(...args);assertActive();return result;}
        finally{if(disposed)clear(auth);}
      };
    }
  }
  return {signal:controller.signal,guard,dispose(){if(disposed)return;disposed=true;controller.abort();for(const auth of authObjects)clear(auth);}};
}
