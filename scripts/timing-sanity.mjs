import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

// Exercise Phaser's actual clock with the game's actual FPS configuration.
// Scene construction and viewport discovery are irrelevant to this clock test.
const bundle=await build({entryPoints:['src/game/config.ts'],bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'config-only',setup(b){
    b.onResolve({filter:/scenes\/(BootScene|WorldScene|HudScene)$/},args=>({path:args.path,namespace:'scene'}));
    b.onLoad({filter:/.*/,namespace:'scene'},args=>({contents:`export class ${args.path.split('/').pop()} {}`}));
    b.onResolve({filter:/layout\/Viewport$/},()=>({path:'viewport',namespace:'viewport'}));
    b.onLoad({filter:/.*/,namespace:'viewport'},()=>({contents:'export const getBrowserViewportMetrics=()=>({renderWidth:1280,renderHeight:720,canvasCssZoom:1});'}));
    b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'phaser'}));
    b.onLoad({filter:/.*/,namespace:'phaser'},()=>({contents:'export default {AUTO:0,Scale:{NONE:0,CENTER_BOTH:0}};'}));
  }}]});
const {gameConfig}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const require=createRequire(import.meta.url);
const TimeStep=require('../node_modules/phaser/src/core/TimeStep.js');
let now=0;
globalThis.window={performance:{now:()=>now},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}};
function advance(fps,config,refocus=false){
  now=0;let elapsed=0;
  const loop=new TimeStep({},config);loop.start((_time,delta)=>elapsed+=delta);
  if(refocus){loop.blur();loop.focus();}
  for(let frame=1;frame<=fps*5;frame++){now=frame*1000/fps;loop.step(now);}
  loop.stop();return elapsed;
}
const oldElapsed=advance(30,{});
assert(oldElapsed<4000,'The previous startup clock must reproduce lost simulation time at 30 FPS');
for(const fps of [15,20,30,60,120])for(const refocus of [false,true]){
  const elapsed=advance(fps,gameConfig.fps,refocus);
  assert(Math.abs(elapsed-5000)<1e-7,`${fps} FPS / focus=${refocus}: walking or healing slows down`);
  assert(Math.abs(elapsed*.225-1125)<1e-7,'Five seconds of unobstructed walking must cover 1125 units');
}
console.log(`Timing: PASS — real Phaser clock at 15/20/30/60/120 FPS, startup and refocus. Previous 30 FPS startup: ${(oldElapsed/5000*100).toFixed(0)}% simulation time; fixed: 100%.`);
