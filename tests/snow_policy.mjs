import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as policy from '../assets/akilan-snow/policy.mjs';

// Catches stale snow on a new date, timezone shifts, and confusing SWE with snowfall.
test('selected calendar day controls snowfall; zero and missing are distinct',()=>{
 const archive={start:'2024-01-13',n:4,snowfallCm:[9.24,0,null,-1],weatherCode:[75,3,null,3]};
 assert.deepEqual(policy.historicalWeather?.(archive,'2024-01-13'),{date:'2024-01-13',snowfall_cm:9.24,weather_code:75});
 const snow=policy.snowState('historical',policy.historicalWeather?.(archive,'2024-01-13'));
 assert.equal(snow.active,true);
 const clear=policy.snowState('historical',policy.historicalWeather?.(archive,'2024-01-14'));
 assert.equal(clear.active,false);assert.equal(clear.available,true);
 for(const date of ['2024-01-12','2024-01-15','2024-01-16','2024-01-17','2024-02-30','']){
  const missing=policy.snowState('historical',policy.historicalWeather?.(archive,date));
  assert.equal(missing.active,false,date);assert.equal(missing.available,false,date);
 }
 assert.equal(policy.snowState('historical',{date:'2024-01-13',swe:250,snow_depth:3}).active,false);
});

test('historical amount controls qualitative density, while preview/live remain explicit',()=>{
 const light=policy.snowState('historical',{date:'2024-01-13',snowfall_cm:.1});
 const heavy=policy.snowState('historical',{date:'2024-01-13',snowfall_cm:9.24});
 assert.equal(light.active,true);assert.ok(heavy.intensity>light.intensity);
 assert.equal(policy.snowState('preview',null,.8).intensity,.8);
 assert.equal(policy.snowState('live',{weather_code:75}).active,true);
 assert.equal(policy.snowState('live',{weather_code:63,swe:250}).active,false);
 assert.equal(policy.snowState('off',{snowfall_cm:10,weather_code:75}).active,false);
});
