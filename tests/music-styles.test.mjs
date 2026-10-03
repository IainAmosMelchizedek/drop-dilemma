import assert from 'node:assert/strict';
import { MUSIC_STYLES, styleForRound, swungAt, humanVelocity, noteFrequency } from '../lib/music-styles.ts';
for(let seed=0;seed<100;seed++){
  const game='game-'+seed;
  for(let round=1;round<=12;round++)assert.deepEqual(styleForRound(game,round),styleForRound(game,round));
  for(const first of [1,6])assert.equal(new Set(Array.from({length:5},(_,i)=>styleForRound(game,first+i).id)).size,5);
  assert.equal(styleForRound(game,1).id,'glitch-hop');
}
for(const style of MUSIC_STYLES){
  const beat=60000/style.bpm;
  assert.equal(swungAt(16000,0,style),16000);
  assert.equal(swungAt(16000,16,style),16000+beat);
  assert.ok(Math.abs(swungAt(16000,8,style)-(16000+style.swing*beat))<1e-8);
  for(let step=-48;step<48;step+=8)assert.ok(swungAt(16000,step+8,style)>swungAt(16000,step,style));
}
assert.ok(MUSIC_STYLES[0].bpm>=105&&MUSIC_STYLES[0].bpm<=110);assert.equal(MUSIC_STYLES[0].halfTime,true);
assert.ok(new Set(Array.from({length:32},(_,i)=>humanVelocity('set',i))).size>20);
assert.equal(humanVelocity('set',2),humanVelocity('set',2));assert.equal(noteFrequency(69),440);
console.log('Passed deterministic five-style rotation, featured Glitch Hop, swung beat grid, and humanized velocities.');
