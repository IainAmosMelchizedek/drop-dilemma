import assert from 'node:assert/strict';
import { mock } from 'node:test';
import fs from 'node:fs';
import { settle, advance, publicRoom } from '../lib/game.ts';
function fixture(n=4,energy=20){return {code:'TEST2',host:'0',phase:'choice',round:1,energy,deadline:15000,started:0,game:'test',players:Array.from({length:n},(_,i)=>({id:String(i),token:'secret'+i,name:'DJ '+i,score:0})),choices:{},history:[]};}
let cases=0;
for(let n=2;n<=8;n++)for(let mask=0;mask<2**n;mask++)for(const energy of [0,20,57.5,100]){
  const r=fixture(n,energy);let drops=0;
  r.players.forEach((p,i)=>{if(mask&(1<<i)){r.choices[p.id]='DROP';drops++;}});
  const result=settle(r,15000),crash=drops>n/2;
  assert.equal(result.after,crash?0:Math.min(100,(drops?energy/2:energy)+10*(n-drops)));
  assert.equal(result.outcome,crash?'CRASH':drops?'DROP':'BUILD');
  for(const p of result.choices)assert.equal(p.points,!crash&&p.choice==='DROP'?energy/drops:0);
  assert.ok(Math.abs(r.players.reduce((sum,p)=>sum+p.score,0)-(!crash&&drops?energy:0))<1e-9);
  cases++;
}
const r=fixture();r.choices={'0':'DROP','1':'BUILD'};
const view=publicRoom(r,'secret0',3);
assert.equal(view.myChoice,'DROP');assert.equal(view.revision,3);
assert.ok(!('total' in view));assert.ok(!('endAfterRound' in view));assert.ok(!('choices' in view));assert.ok(view.players.every(p=>!('token' in p)));
assert.throws(()=>publicRoom(r,'forged'));
assert.equal(advance(r,14999),false);assert.equal(advance(r,15000),true);assert.equal(r.phase,'landing');assert.equal(r.history.length,1);
assert.equal(r.history[0].at,16000);assert.equal(r.deadline,16000);
assert.equal(advance(r,15000),false);assert.equal(advance(r,15999),false);
assert.equal(advance(r,16000),true);assert.equal(r.phase,'reveal');assert.equal(r.deadline,21000);
assert.equal(advance(r,20999),false);assert.equal(advance(r,21000),true);assert.equal(r.round,2);assert.equal(r.phase,'choice');assert.deepEqual(r.choices,{});
assert.equal(r.deadline,36000); // The next player choice window is still exactly 15s.
let draws=0;
advance(r,420000,()=>{draws++;return false;});assert.equal(r.phase,'ended');assert.equal(r.history.length,20);assert.equal(r.round,20);assert.equal(draws,15);
assert.equal(advance(r,500000,()=>{throw Error('Ended game cannot draw');}),false);
const early=fixture();let earlyDraws=0;
advance(early,84000,()=>{earlyDraws++;return true;});assert.equal(early.round,5);assert.equal(early.phase,'choice');assert.equal(earlyDraws,0,'First five rounds are guaranteed');
advance(early,99000,()=>{earlyDraws++;return true;});assert.equal(early.phase,'landing');assert.equal(earlyDraws,1);
const hidden=publicRoom({...early,total:12},'secret0');assert.ok(!('total' in hidden));assert.ok(!('endAfterRound' in hidden));
advance(early,100000,()=>{throw Error('Cannot redraw during reveal');});assert.equal(early.phase,'reveal');
advance(early,104999,()=>{throw Error('Cannot end before full reveal');});assert.equal(early.phase,'reveal');
advance(early,105000,()=>{throw Error('Persisted ending cannot redraw');});assert.equal(early.phase,'ended');assert.equal(early.history.length,5);
const continuing=fixture();let continuationDraws=0;
advance(continuing,126000,()=>++continuationDraws===2);assert.equal(continuing.round,6);assert.equal(continuing.phase,'ended');assert.equal(continuationDraws,2);
// A uniform 32-bit draw has four equally sized residue classes: exactly one ends.
for(let residue=0;residue<4;residue++){
 const rng=mock.method(globalThis.crypto,'getRandomValues',array=>{array[0]=residue;return array;});
 try{const roundFive={...fixture(),round:5};advance(roundFive,15000);assert.equal(roundFive.endAfterRound,residue===0);assert.equal(rng.mock.callCount(),1);advance(roundFive,21000);assert.equal(rng.mock.callCount(),1,'Reveal completion uses persisted draw');}finally{rng.mock.restore();}
}
const page=fs.readFileSync('app/page.tsx','utf8');assert.ok(!page.includes('8–12'));assert.ok(!/safety cap|cap of 20|20 rounds/i.test(page));assert.ok(page.includes('25% chance'));assert.ok(page.includes('75% chance'));
console.log(`Passed ${cases} scoring cases plus hidden-choice, token, 15s choice/1s lock/5s reveal, default-BUILD, guaranteed opening, 25% continuation draw, private ending, full final reveal, catch-up, and hidden safety-cap checks.`);
