import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const source = fs.readFileSync(new URL('../chat-history.js', import.meta.url), 'utf8');
const calls = [];
const status = { textContent: '' };
let failures = 1;
const sandbox = {
  crypto: webcrypto, AbortSignal,
  window: { REWATCH_SUPABASE: { url: 'https://example.test', publishableKey: 'test-public' } },
  document: { getElementById: () => status },
  fetch: async (url, options) => {
    calls.push({ url, ...JSON.parse(options.body) });
    if (failures-- > 0) throw new Error('network');
    return { ok: true, json: async () => true };
  },
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
sandbox.window.luxtimeSaveChat('Welcome', 'bot');
await new Promise(setImmediate);
assert.equal(calls.length, 0, 'Opening chat does not store a conversation');
sandbox.window.luxtimeSaveChat('Bán 124273', 'user');
sandbox.window.luxtimeSaveChat('Giá tham khảo', 'bot', { text: 'Facebook', href: 'https://example.test/contact' });
await new Promise(setImmediate);
assert.equal(calls.length, 3);
assert.equal(calls[0].p_message, calls[1].p_message, 'Retry is idempotent');
assert.equal(calls[1].p_conversation, calls[2].p_conversation);
assert.equal(calls[1].p_token, calls[2].p_token);
assert.match(calls[2].p_content, /Facebook: https/);
assert.equal(status.textContent, '');
const oldConversation = calls[0].p_conversation;
vm.runInContext(source, sandbox);
sandbox.window.luxtimeSaveChat('Khách khác', 'user');
await new Promise(setImmediate);
assert.notEqual(calls.at(-1).p_conversation, oldConversation, 'Separate page has separate conversation');
sandbox.fetch = async () => ({ ok: true, json: async () => false });
sandbox.window.luxtimeSaveChat('Over quota', 'user');
await new Promise(setImmediate);
assert.match(status.textContent, /chưa lưu được/);
console.log('Chat history: no greeting-only records, ordered writes, idempotent retry, isolation and failure notice passed.');
