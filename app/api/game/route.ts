import { assignLayers } from '../../../lib/layers';
import { advance, publicRoom, type Room } from '../../../lib/game';
import { database, readRoom, saveRoom } from '../../../lib/room-store';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
function reply(body: unknown, status = 200) { return Response.json(body, { status, headers }); }
function nameOf(value: unknown) {
  if (typeof value !== 'string') throw new Error('Enter your DJ name.');
  const name = value.trim().replace(/[\x00-\x1f]/g, '');
  if (!name || name.length > 24) throw new Error('Use a DJ name between 1 and 24 characters.');
  return name;
}
function start(room: Room, now: number) {
  room.players=assignLayers(room.players);
  room.phase = 'choice'; room.energy = 20; room.round = 1; delete room.total; delete room.endAfterRound; room.started = now; room.deadline = now + 15000; room.choices = {}; room.history = []; room.game = crypto.randomUUID(); room.players.forEach(p => p.score = 0);
}
export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get('code')?.toUpperCase() || '';
    const token = request.headers.get('X-DJ-Token') || '';
    for (let i = 0; i < 20; i++) {
      const { room, version } = await readRoom(code); publicRoom(room, token);
      const changed = advance(room, Date.now());
      if (changed && !await saveRoom(room, version)) continue;
      return reply(publicRoom(room, token, version + (changed ? 1 : 0)));
    }
    return reply({error:'The room is busy. Reconnecting…'}, 503);
  } catch (e) { return reply({error: e instanceof Error ? e.message : 'Unable to reconnect.'}, 400); }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return reply({error:'Invalid request.'}, 403);
    const text = await request.text(); if (text.length > 2048) return reply({error:'Request too large.'}, 413);
    const body = JSON.parse(text); const token = request.headers.get('X-DJ-Token') || '';
    if (body.action === 'create') {
      const name = nameOf(body.name);
      for (let i = 0; i < 8; i++) {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const code = Array.from(crypto.getRandomValues(new Uint8Array(5)), n => alphabet[n % alphabet.length]).join('');
        const p = { id: crypto.randomUUID(), token: crypto.randomUUID(), name, score: 0 };
        const room: Room = { code, host:p.id, players:[p], phase:'lobby', round:0, energy:20, deadline:0, started:0, game:crypto.randomUUID(), choices:{}, history:[] };
        const inserted = await database().prepare('INSERT OR IGNORE INTO rooms (code, state, version, expires) VALUES (?, ?, 0, ?)').bind(code, JSON.stringify(room), Date.now()+86400000).run();
        if (inserted.meta.changes) return reply({room:publicRoom(room,p.token), token:p.token});
      }
      throw new Error('Unable to open a room. Try again.');
    }
    const code = String(body.code || '').toUpperCase();
    for (let i = 0; i < 20; i++) {
      const { room, version } = await readRoom(code); let session = token; const now = Date.now();
      if (advance(room, now)) { await saveRoom(room,version); continue; }
      if (body.action === 'join') {
        if (room.phase !== 'lobby') throw new Error('This set has started. Join a new room for the next game.');
        const name = nameOf(body.name);
        if (room.players.length >= 8) throw new Error('This room is full (8 DJs).');
        if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) throw new Error('That DJ name is taken. Pick another.');
        session = crypto.randomUUID(); room.players.push({id:crypto.randomUUID(),token:session,name,score:0});
      } else {
        const me = room.players.find(p => p.token === token); if (!me) return reply({error:'Invalid DJ session.'},403);
        if (body.action === 'choice') {
          if (room.phase !== 'choice' || body.round !== room.round || body.game !== room.game) throw new Error('That round has closed.');
          if (body.choice !== 'BUILD' && body.choice !== 'DROP') throw new Error('Choose BUILD or DROP.');
          room.choices[me.id] = body.choice;
        } else if (body.action === 'start' || body.action === 'rematch') {
          if (room.host !== me.id) throw new Error('Only the host can start the set.');
          if (room.phase !== (body.action === 'start' ? 'lobby' : 'ended')) throw new Error('The game has already changed.');
          if (room.players.length < 2) throw new Error('Invite at least one more DJ.');
          if (body.action === 'rematch') { room.phase='lobby';room.energy=20;room.round=0;delete room.total;delete room.endAfterRound;room.deadline=0;room.started=0;room.choices={};room.history=[];room.game=crypto.randomUUID();room.players.forEach(p=>{p.score=0;delete p.layer;}); }
          else start(room,now);
        } else throw new Error('Unknown action.');
      }
      if (await saveRoom(room,version)) return reply({room:publicRoom(room,session,version+1), ...(body.action === 'join' ? {token:session} : {})});
    }
    return reply({error:'The room is busy. Please try again.'},503);
  } catch (e) { return reply({error:e instanceof Error ? e.message : 'The club is temporarily unavailable.'},400); }
}
