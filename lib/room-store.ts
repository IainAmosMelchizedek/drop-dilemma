import { env } from 'cloudflare:workers';
import type { Room } from './game';
export function database() {
  if (!env.DB) throw new Error('The club is temporarily unavailable. Please try again.');
  return env.DB;
}
export async function readRoom(code: string) {
  const row = await database().prepare('SELECT state, version FROM rooms WHERE code = ? AND expires > ?').bind(code, Date.now()).first<{state: string; version: number}>();
  if (!row) throw new Error('Room not found or expired. Check your room code.');
  return { room: JSON.parse(row.state) as Room, version: row.version };
}
export async function saveRoom(room: Room, version: number) {
  const r = await database().prepare('UPDATE rooms SET state = ?, version = version + 1, expires = ? WHERE code = ? AND version = ?').bind(JSON.stringify(room), Date.now() + 86400000, room.code, version).run();
  return r.meta.changes === 1;
}
