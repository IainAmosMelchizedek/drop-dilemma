import type { LayerId } from './layers';
export type Choice = 'BUILD' | 'DROP';
export type Player = { id: string; token: string; name: string; score: number; layer?:LayerId };
export type Result = { round: number; before: number; after: number; outcome: 'BUILD' | 'DROP' | 'CRASH'; at: number; choices: { id: string; name: string; choice: Choice; points: number }[] };
export const CHOICE_MS=15000, LOCK_MS=1000, REVEAL_MS=5000;
export type Room = { code: string; host: string; phase: 'lobby' | 'choice' | 'landing' | 'reveal' | 'ended'; round: number; total?: number; endAfterRound?:boolean; energy: number; deadline: number; started: number; game: string; players: Player[]; choices: Record<string, Choice>; history: Result[] };
export function settle(room: Room, at: number): Result {
  const choices = room.players.map(p => ({ id: p.id, name: p.name, choice: room.choices[p.id] || 'BUILD' as Choice, points: 0 }));
  const drops = choices.filter(p => p.choice === 'DROP').length;
  const crash = drops > choices.length / 2;
  const before = room.energy;
  const after = crash ? 0 : Math.min(100, (drops ? before / 2 : before) + (choices.length - drops) * 10);
  for (const p of choices) {
    if (!crash && drops && p.choice === 'DROP') p.points = before / drops;
    room.players.find(x => x.id === p.id)!.score += p.points;
  }
  room.energy = after;
  return { round: room.round, before, after, outcome: crash ? 'CRASH' : drops ? 'DROP' : 'BUILD', choices, at };
}
// Server-only safeguards and continuation draws; never included in public room data.
const SAFETY_ROUNDS=20;
function continuationEnds(){return (crypto.getRandomValues(new Uint32Array(1))[0]&3)===0;}
export function advance(room: Room, now: number, drawEnd:()=>boolean=continuationEnds): boolean {
  let changed = false;
  while ((room.phase === 'choice' || room.phase === 'landing' || room.phase === 'reveal') && now >= room.deadline) {
    changed = true;
    if (room.phase === 'choice') { room.history.push(settle(room, room.deadline+LOCK_MS)); room.endAfterRound=room.round>=SAFETY_ROUNDS||(room.round>=5&&drawEnd()); room.phase = 'landing'; room.deadline += LOCK_MS; }
    else if (room.phase === 'landing') {room.phase='reveal';room.deadline+=REVEAL_MS;}
    else if (room.endAfterRound) room.phase = 'ended';
    else { delete room.endAfterRound; room.round++; room.phase = 'choice'; room.choices = {}; room.deadline += CHOICE_MS; }
  }
  return changed;
}
export function publicRoom(room: Room, token: string, revision = 0) {
  const me = room.players.find(p => p.token === token);
  if (!me) throw new Error('Your DJ session is not valid. Rejoin this room.');
  const { total, endAfterRound, choices, players, ...visible } = room;
  return { ...visible, revision, players: players.map(({token, ...p}) => p), me: me.id, myChoice: choices[me.id] || 'BUILD', serverNow: Date.now() };
}
