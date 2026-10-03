import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { SAMPLE_CATALOG } from '../lib/sample-catalog.ts';
import {loadSampleSet,slicePlan} from '../lib/sample-loading.ts';
assert.equal(SAMPLE_CATALOG.length,47);
const credits=fs.readFileSync('public/samples/CREDITS.md','utf8');
for(const sample of SAMPLE_CATALOG){
 const bytes=fs.readFileSync('public'+sample.url);assert.equal(bytes.length,sample.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),sample.sha256);assert.ok(sample.duration>0);assert.ok(credits.includes(sample.source));assert.ok(credits.includes(sample.id+'.mp3'));assert.ok(credits.includes('CC0 1.0'));assert.ok(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255);
}
const progress=[];
const result=await loadSampleSet([{id:'good',url:'ok'},{id:'bad',url:'404'}],async url=>{if(url==='404')throw Error('404');return 'buffer';},p=>progress.push({...p}),100);
assert.equal(result.loaded.get('good'),'buffer');assert.deepEqual(result.failed,['bad']);assert.equal(progress[0].completed,0);assert.equal(progress.at(-1).completed,2);assert.equal(progress.at(-1).failed,1);
let aborted=false;const timeout=await loadSampleSet([{id:'stall',url:'stall'}],(_,signal)=>new Promise(()=>{signal.addEventListener('abort',()=>{aborted=true;});}),()=>{},10);assert.equal(aborted,true);assert.deepEqual(timeout.failed,['stall']);
for(const seconds of [.1,.139,.28]){const plan=slicePlan(4.2,-3,16,seconds);assert.ok(Math.abs((4.2/16)/plan.rate-seconds)<1e-9);assert.ok(plan.offset>=0&&plan.offset<4.2);assert.equal(plan.duration,seconds);}
// Exercise the actual player bank with fake decoders and voices, including a single missing file.
let loads=0;const starts=[];
class Buffer {constructor(decoded){this.duration=decoded.duration;}dispose(){}}
class Player {constructor(buffer){this.buffer=buffer;this.volume={setValueAtTime:(value,time)=>{this.db=value;this.volumeAt=time;}};}connect(bus){this.bus=bus;return this;}start(time,offset,duration){starts.push({player:this,time,offset,duration,rate:this.playbackRate,bus:this.bus});}dispose(){this.disposed=true;}}
const Tone={ToneAudioBuffer:Buffer,Player,getContext:()=>({decodeAudioData:async()=>({duration:4.2})})};
let source=fs.readFileSync('lib/sample-bank.ts','utf8').replace(/^import .*;$/gm,'');source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const context={exports:{},Tone,SAMPLE_CATALOG,loadSampleSet,slicePlan,fetch:async url=>{loads++;return {ok:!url.includes('vinyl_scratch'),arrayBuffer:async()=>new ArrayBuffer(8)};}};vm.runInNewContext(source,context);
const Bank=context.exports.SampleBank,routes=Object.fromEntries(['drums','bass','melody','texture','percussion','chops','second-melody','guitar','fx'].map(id=>[id,{id}])),bank=new Bank(routes);
const report=await bank.preload();assert.equal(report.completed,47);assert.equal(report.failed,1);await bank.preload();assert.equal(loads,47,'Preload is cached');
assert.equal(bank.play('vinyl_scratch',12),false,'Missing sample requests the synth fallback');assert.equal(bank.play('bd_808',12,{gain:.8}),true);assert.equal(starts.at(-1).bus,routes.drums);assert.equal(starts.at(-1).time,12);
assert.equal(bank.chop('loop_amen',15,-3,16,.139,.5),true);assert.ok(Math.abs(starts.at(-1).duration/starts.at(-1).rate-.139)<1e-9);assert.equal(starts.at(-1).time,15);
assert.equal(bank.play('vinyl_backspin',18,{duration:.65,bus:'fx'}),true);assert.equal(starts.at(-1).bus,routes.fx,'Crash cue survives owned texture cut');
for(let i=0;i<8;i++)bank.play('loop_amen',20+i*.1,{duration:.03});assert.equal(new Set(starts.filter(s=>s.time>=20).map(s=>s.player)).size,4,'Voice pool stays bounded');
assert.ok(starts.every(s=>s.player.fadeIn===.001&&s.player.fadeOut===.006));bank.dispose();assert.equal(bank.play('bd_808',30),false);
console.log('Passed sample hashes/credits, cached preload, per-file failures/timeouts, bounded voices, layer routes, shared timestamps, and tempo-matched chops.');
