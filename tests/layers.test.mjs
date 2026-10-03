import assert from 'node:assert/strict';
import { assignLayers, LAYERS, layerMix } from '../lib/layers.ts';
import { settle, advance, publicRoom } from '../lib/game.ts';
for(let n=2;n<=8;n++){
 const players=Array.from({length:n},(_,i)=>({id:String(i),token:'secret'+i,name:'DJ '+i,score:0}));
 const assigned=assignLayers(players);
 assert.equal(new Set(assigned.map(p=>p.layer)).size,n);
 assert.deepEqual(assigned.map(p=>p.layer),LAYERS.slice(0,n).map(l=>l.id));
 assert.ok(players.every(p=>!('layer' in p)),'Assignment does not mutate input');
 const room={code:'TEST2',host:'0',phase:'choice',round:1,energy:80,deadline:15000,started:0,game:'test',players:assigned,choices:{'0':'DROP'},history:[]};
 const initial=layerMix(assigned,[],1);assert.ok(Object.values(initial).every(Boolean));
 assert.deepEqual(layerMix(assigned,room.history,1),initial,'Secret choice does not cut a layer');
 advance(room,15000);assert.equal(room.phase,'landing');
 assert.deepEqual(layerMix(assigned,room.history,1),initial,'Future reveal stays out of current mix');
 const next=layerMix(assigned,room.history,2);assert.equal(next.drums,false);assert.equal(next.bass,true);
 assert.deepEqual(publicRoom(room,'secret0').players.map(p=>p.layer),assigned.map(p=>p.layer));
 advance(room,21000);assert.equal(room.round,2);assert.equal(layerMix(assigned,room.history,2).drums,false);
 advance(room,36000);assert.equal(layerMix(assigned,room.history,3).drums,true,'Default BUILD restores a cut layer');
 assert.deepEqual(room.players.map(p=>p.layer),assigned.map(p=>p.layer),'Ownership stays fixed through rounds');
 const crash={...room,round:3,energy:100,choices:Object.fromEntries(assigned.map(p=>[p.id,'DROP']))};
 const result=settle(crash,50000);assert.equal(result.outcome,'CRASH');assert.equal(result.after,0);
 const mix=layerMix(assigned,[result],4);assert.ok(assigned.every(p=>!mix[p.layer]),'Crash droppers remain cut until BUILD');
}
assert.throws(()=>assignLayers([{id:'only'}]));assert.throws(()=>assignLayers(Array.from({length:9},(_,i)=>({id:String(i)}))));
assert.equal(layerMix([],[],1).texture,true,'Unowned core parts sustain small crews');
console.log('Passed 2–8 player unique layer assignment, public ownership, fixed roles, hidden choices, DROP cuts, default-BUILD restoration, and crash behavior.');
