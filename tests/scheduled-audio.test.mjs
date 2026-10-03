import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as timeline from '../lib/music-timeline.ts';
import * as styles from '../lib/music-styles.ts';
import * as layers from '../lib/layers.ts';
import { SAMPLE_CATALOG } from '../lib/sample-catalog.ts';
import * as loading from '../lib/sample-loading.ts';
// Test the actual scheduler with a synthetic audio clock; no browser, build, or audio files.
let wall=15000,audio=10,events=[];
class Node {
  constructor(){this.gain=this.frequency=this;this.values=[];}
  connect(destination){this.destination=destination;return this;}toDestination(){return this;}dispose(){}
  cancelScheduledValues(){}setValueAtTime(value,time){this.values.push({value,time});}exponentialRampToValueAtTime(){}linearRampToValueAtTime(){}rampTo(){}
  triggerAttackRelease(note,duration,time,velocity){events.push({note,time,velocity});return this;}
  triggerRelease(){}releaseAll(){}
}
const tone=new Proxy({immediate:()=>audio,getContext:()=>({state:'running'}),start:async()=>{}},{get:(obj,key)=>obj[key]??Node});
let source=fs.readFileSync('lib/scheduled-club-audio.ts','utf8').replace(/^import .*;$/gm,'');
source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
let bankSource=fs.readFileSync('lib/sample-bank.ts','utf8').replace(/^import .*;$/gm,'');
bankSource=ts.transpileModule(bankSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const bankContext={exports:{},Tone:tone,SAMPLE_CATALOG,...loading};vm.runInNewContext(bankSource,bankContext);
const context={exports:{},SampleBank:bankContext.exports.SampleBank,Tone:tone,...timeline,...styles,...layers,Date:{now:()=>wall},setInterval:()=>1,clearInterval:()=>{}};
vm.runInNewContext(source,context);
const Audio=context.exports.ScheduledClubAudio;
const result={round:1,before:80,after:50,outcome:'DROP',at:16000,choices:[]};
const state={game:'test',round:1,phase:'landing',energy:50,deadline:16000,started:0,result};
const engine=new Audio();engine.sync(state);assert.equal(events.length,0,'Locked pause stays quiet');
wall=15850;audio=10.85;engine.sync(state);assert.ok(events.some(e=>Math.abs(e.time-11)<1e-8),'Drop schedules on shared reveal timestamp');
const count=events.length;engine.sync(state);assert.equal(events.length,count,'A result never fires twice');engine.dispose();
events=[];wall=17000;audio=12;const late=new Audio();late.sync(state);assert.ok(!events.some(e=>Array.isArray(e.note)),'Missed landing is not replayed');late.dispose();
events=[];wall=15850;audio=10.85;const crash=new Audio();crash.sync({...state,energy:0,result:{...result,outcome:'CRASH',after:0}});assert.equal(events.length,3,'Power-down and two scratch gestures');
events=[];wall=17000;audio=12;crash.sync({...state,phase:'reveal',deadline:21000,energy:0,result:{...result,outcome:'CRASH',after:0}});assert.equal(events.length,0,'Crash groove stays silent');crash.dispose();
events=[];wall=15000;audio=10;
const owners=layers.assignLayers([{id:'a'},{id:'b'}]);
const ownedResult={...result,choices:[{id:'a',name:'A',choice:'DROP',points:80},{id:'b',name:'B',choice:'BUILD',points:0}]};
const ownedState={...state,players:owners,history:[ownedResult],result:ownedResult};
const owned=new Audio();owned.sync(ownedState);
assert.equal(owned.kick.destination,owned.parts.drums);assert.equal(owned.slap.destination,owned.parts.bass);assert.equal(owned.pad.destination,owned.parts.texture);
assert.equal(owned.parts.drums.values.at(-1).value,1,'Current layer remains on through lock');
wall=15850;audio=10.85;owned.sync(ownedState);
assert.deepEqual(owned.parts.drums.values.at(-1),{value:0,time:11},'Dropper layer cuts on reveal, not receipt');
assert.deepEqual(owned.parts.bass.values.at(-1),{value:1,time:11},'Builder layer lands on same timestamp');
wall=22000;audio=17;owned.sync({...ownedState,round:2,phase:'choice',deadline:36000,result:undefined});
assert.equal(owned.parts.drums.values.at(-1).value,0,'Cut persists through the next choice phase');
owned.dispose();
// Source contracts catch incorrect Tone options and JSX without producing build output.
const program=ts.createProgram(['app/page.tsx','lib/scheduled-club-audio.ts','app/api/game/route.ts','cloudflare-env.d.ts'],{types:['node','@cloudflare/workers-types'],noEmit:true,skipLibCheck:true,strict:true,target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true});
const diagnostics=ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));
console.log('Passed actual audio scheduler lock/drop/crash/late/duplicate checks and game source contracts.');
