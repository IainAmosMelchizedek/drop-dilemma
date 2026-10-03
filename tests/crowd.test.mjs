import assert from 'node:assert/strict';
import fs from 'node:fs';
import {crowdLevel,crowdSize,crowdMood} from '../lib/crowd.ts';
assert.deepEqual([0,20,40,60,80,100].map(crowdSize),[0,8,16,24,32,40]);
assert.equal(crowdSize(-20),0);assert.equal(crowdSize(1000),40);assert.equal(crowdLevel(60),3);assert.equal(crowdMood(0),'Empty floor');
for(let energy=0;energy<=100;energy++)assert.ok(crowdSize(energy)<=40);
const source=fs.readFileSync('app/components/club-stage.tsx','utf8');assert.ok(!/<(?:img|video)\b/.test(source));
const css=fs.readFileSync('app/globals.css','utf8');
for(const name of ['beam-beat','beam-flash','crowd-nod','crowd-bounce','crowd-jump','crowd-wild','floor-cheer','crowd-exit']){
 const key=css.slice(css.indexOf('@keyframes '+name),css.indexOf('@keyframes '+name)+220);assert.ok(key.includes('transform:'));assert.ok(!/opacity:|filter:/.test(key));
}
assert.ok(css.includes('.reaction-crash .crowd-position{display:none}'));
console.log('Passed crowd levels, 40-figure cap, SVG-only stage, transform animations, and reduced-motion exit.');
