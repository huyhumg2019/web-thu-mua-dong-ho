// Usage: node scripts/test-chat-history-db.mjs <path-to-pglite-dist-index.js>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
  create function auth.uid() returns uuid language sql stable as
  $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
  create table public.profiles(id uuid primary key, role text);
  insert into public.profiles values
  ('00000000-0000-0000-0000-000000000001','admin'),
  ('00000000-0000-0000-0000-000000000002','staff'),
  ('00000000-0000-0000-0000-000000000003','customer');`);
const migration = fs.readFileSync(new URL('../supabase/setup-chat-history.sql', import.meta.url), 'utf8');
// PGlite has no background cron; validate the actual RPC/table SQL here.
await db.exec(migration.slice(0, migration.indexOf('create extension if not exists pg_cron;')) + '\ncommit;');
const conversation = randomUUID(), token = randomUUID(), message = randomUUID();
const append = async (id = message, capability = token) => (await db.query(
  'select public.append_chat_message($1,$2,$3,$4,$5) as saved',
  [conversation, capability, id, 'user', 'Bán 124273'])).rows[0].saved;
await db.exec('set role anon');
assert.equal(await append(), true);
assert.equal(await append(), true);
assert.equal(await append(randomUUID(), randomUUID()), false);
await assert.rejects(db.query('select * from public.chat_messages'), /permission denied/);
await assert.rejects(db.query('select * from public.list_admin_chats()'), /permission denied/);
await db.exec('reset role; set role authenticated');
for (const suffix of ['2', '3']) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [`00000000-0000-0000-0000-00000000000${suffix}`]);
  await assert.rejects(db.query('select * from public.list_admin_chats()'), /Admin only/);
  await assert.rejects(db.query('select * from public.get_admin_chat($1)', [conversation]), /Admin only/);
}
await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)");
assert.equal((await db.query('select * from public.list_admin_chats()')).rows.length, 1);
assert.equal((await db.query('select * from public.get_admin_chat($1)', [conversation])).rows.length, 1);
await db.exec('reset role');
await db.query('update public.chat_conversations set message_count=120 where id=$1', [conversation]);
assert.equal(await append(randomUUID()), false);
await db.query('update public.chat_conversations set message_count=1, expires_at=now()-interval \'1 second\' where id=$1', [conversation]);
assert.equal(await append(randomUUID()), false);
await db.exec('set role authenticated');
assert.equal((await db.query('select * from public.list_admin_chats()')).rows.length, 0);
assert.equal((await db.query('select * from public.get_admin_chat($1)', [conversation])).rows.length, 0);
await db.exec("reset role; delete from public.chat_conversations where expires_at <= now();");
assert.equal((await db.query('select * from public.chat_messages')).rows.length, 0);
await db.exec('update public.chat_log_daily_usage set count=3000');
assert.equal(await append(randomUUID()), false);
await db.close();
console.log('Database: anonymous append, no public reads, admin-only RPCs, token isolation, idempotency, caps, expiry and cascading cleanup passed. Cron must be verified on Supabase.');
