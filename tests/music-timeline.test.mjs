import assert from 'node:assert/strict';
import { BEAT_MS, AUDIO_LOOKAHEAD_MS, buildStage, rollInterval, audioTimeFor, dropStrength, ServerClock } from '../lib/music-timeline.ts';
assert.equal(15000/BEAT_MS,30);
assert.equal(buildStage(15000),'groove');assert.equal(buildStage(8001),'groove');
assert.equal(buildStage(8000),'roll');assert.equal(buildStage(3001),'roll');
assert.equal(buildStage(3000),'predrop');assert.equal(buildStage(1),'predrop');assert.equal(buildStage(0),'landing');
assert.equal(rollInterval(7000),250);assert.equal(rollInterval(5000),125);assert.equal(rollInterval(3500),62.5);
// Different device/context origins still produce the same absolute landing instant.
const target=16000;
for(const [serverNow,audioNow] of [[15200,10],[15400,300],[15800,4]]){
  const scheduled=audioTimeFor(target,serverNow,audioNow);
  assert.ok(Math.abs(serverNow+(scheduled-audioNow)*1000-target)<1e-6);
}
assert.ok(audioTimeFor(1000,1500,10)<10); // Missed events are recognized as past.
assert.ok(AUDIO_LOOKAHEAD_MS>25);
assert.ok(dropStrength(100)>dropStrength(80));assert.ok(dropStrength(80)>dropStrength(20));
assert.equal(dropStrength(-10),dropStrength(0));assert.equal(dropStrength(120),dropStrength(100));
const clock=new ServerClock();assert.equal(clock.sample(1000,1020,1110),100);
assert.equal(clock.sample(2000,2600,2500),100); // Slow poll doesn't shift the beat.
assert.equal(clock.sample(3000,3010,3105),100);
for(let i=0;i<20;i++)clock.sample(4000+i*100,4020+i*100,4110+i*100);
assert.equal(clock.samples.length,12);assert.equal(clock.offset,100);
console.log('Passed musical phase boundaries, accelerating roll, shared audio timestamp, impact scaling, and clock-jitter checks.');

const {presentScene}=await import('../lib/music-timeline.ts');
const outcome={round:1,before:80,after:50,outcome:'DROP',at:16000,choices:[{id:'a',name:'A',choice:'DROP',points:80},{id:'b',name:'B',choice:'BUILD',points:0}]};
const raw={phase:'landing',round:1,deadline:16000,energy:50,history:[outcome],players:[{id:'a',score:100},{id:'b',score:10}]};
const held=presentScene(raw,15999);assert.equal(held.phase,'landing');assert.equal(held.energy,80);assert.equal(held.history.length,0);assert.equal(held.players[0].score,20);
assert.equal(raw.players[0].score,100);assert.equal(raw.history.length,1);
const landed=presentScene(raw,16000);assert.equal(landed.phase,'reveal');assert.equal(landed.deadline,21000);assert.equal(landed.players[0].score,100);assert.equal(landed.energy,50);assert.equal(landed.history[0],outcome);
assert.equal(presentScene({...raw,phase:'choice',deadline:15000,history:[],energy:80},15000).phase,'landing');
console.log('Passed locked score/history masking and exact shared visual reveal boundary.');
