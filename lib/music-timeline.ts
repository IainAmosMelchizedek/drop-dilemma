import type { Result } from './game';
// Kept as the original club tempo; each arrangement supplies its own beat length.
export const BEAT_MS = 500;
export const AUDIO_LOOKAHEAD_MS = 180;
export type BuildStage = 'groove' | 'roll' | 'predrop' | 'landing';
export function buildStage(remainingMs: number): BuildStage {
  if (remainingMs <= 0) return 'landing';
  if (remainingMs <= 3000) return 'predrop';
  if (remainingMs <= 8000) return 'roll';
  return 'groove';
}
export function rollInterval(remainingMs: number,beatMs=BEAT_MS) {
  return remainingMs > 6000 ? beatMs / 2 : remainingMs > 4500 ? beatMs / 4 : beatMs / 8;
}
export function audioTimeFor(serverAt: number, serverNow: number, audioNow: number) {
  return audioNow + (serverAt - serverNow) / 1000;
}
export function dropStrength(energy: number) { return .3 + Math.min(100, Math.max(0, energy)) / 100 * .7; }
// Prefer the least delayed recent sample; do not chase every polling jitter.
export class ServerClock {
  samples: {rtt:number;offset:number}[] = [];
  offset = 0;
  sample(sent:number, received:number, serverNow:number) {
    this.samples.push({rtt:Math.max(0,received-sent),offset:serverNow-(sent+received)/2});
    if(this.samples.length>12)this.samples.shift();
    this.offset=this.samples.reduce((a,b)=>a.rtt<=b.rtt?a:b).offset;
    return this.offset;
  }
}
type Scene = {phase:string;round:number;deadline:number;energy:number;history:Result[];players:{id:string;score:number}[]};
// Reveal presentation uses the very same future timestamp as the audio scheduler.
// Outcome data received during the lock stays visually hidden until that instant.
export function presentScene<T extends Scene>(raw:T,now:number):T {
  if(raw.phase==='choice'&&now>=raw.deadline)return {...raw,phase:'landing',deadline:raw.deadline+1000};
  if(raw.phase!=='landing')return raw;
  const result=raw.history.at(-1);
  if(now>=raw.deadline)return {...raw,phase:'reveal',deadline:raw.deadline+5000};
  if(!result||result.round!==raw.round)return raw;
  return {...raw,energy:result.before,history:raw.history.slice(0,-1),players:raw.players.map(p=>({...p,score:p.score-(result.choices.find(c=>c.id===p.id)?.points??0)}))};
}
