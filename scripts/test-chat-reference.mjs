import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../chat-widget.js', import.meta.url), 'utf8');
const requests = [];
let rows = [];
let fail = false;
const sandbox = {
  window: {}, URL, AbortController, setTimeout, clearTimeout,
  fetch: async (url, options) => {
    requests.push({ url, options });
    if (fail) return { ok: false };
    return { ok: true, json: async () => rows };
  },
};
vm.createContext(sandbox);
vm.runInContext(source.slice(0, source.indexOf('  const root =')) + '\n})();', sandbox);
const { lookupReferences, lookupPurchase, knownAnswer } = sandbox.window.LUXTIME_CHAT_HELP;
const refs = (text, history = []) => Array.from(lookupReferences(text, history));
const config = { url: 'https://catalog.example', publishableKey: 'public-test-key' };
assert.deepEqual(refs('Tôi muốn bán Rolex 126234'), ['126234']);
assert.deepEqual(refs('126710 blro'), ['126710BLRO']);
assert.deepEqual(refs('5711 / 1A - 010'), ['57111A010']);
assert.deepEqual(refs('15510ST.OO.1320ST.08'), ['15510STOO1320ST08']);
assert.deepEqual(refs('bán 126234 và 126500LN'), ['126234', '126500LN']);
assert.deepEqual(refs('mình bán đồng hồ năm 2026'), []);
assert.deepEqual(refs('0901234567'), []);
assert.deepEqual(refs('muốn mua 126234'), []);
assert.deepEqual(refs('ký gửi 126234'), []);
assert.deepEqual(refs('126234', [{ role: 'user', content: 'Tôi muốn mua đồng hồ' }]), []);
assert.deepEqual(refs('126234', [{ role: 'user', content: 'Bán đồng hồ' }]), ['126234']);
assert.deepEqual(refs('muốn bán 126234', [{ role: 'user', content: 'muốn mua' }]), ['126234']);
assert.match(knownAnswer('Bán đồng hồ').answer, /gửi mã Reference/);

rows = [
  { reference: '126234', brand: 'Rolex', family: 'Datejust', variant_label: 'Mặt xanh', new_price_million_vnd: 415.8, used_price_million_vnd: 390 },
  { reference: '126234', brand: 'Rolex', family: 'Datejust', variant_label: 'Mặt đen', new_price_million_vnd: null, used_price_million_vnd: 0 },
  { reference: '1262349', brand: 'Wrong prefix', new_price_million_vnd: 999 },
];
let answer = await lookupPurchase(['126234'], config);
assert.match(answer, /Mặt xanh/);
assert.match(answer, /415\.000\.000đ/);
assert.match(answer, /390\.000\.000đ/);
assert.match(answer, /Mặt đen: hàng mới cần liên hệ báo giá/);
assert.doesNotMatch(answer, /Wrong prefix|999\.000\.000/);
assert.equal(requests[0].url.searchParams.get('reference'), 'ilike.126234*');
assert.equal(requests[0].options.headers.apikey, 'public-test-key');
assert.equal(requests[0].url.origin, config.url);
rows = [{ reference: '5711/1A-010', brand: 'Patek Philippe', used_price_million_vnd: 3000 }];
assert.match(await lookupPurchase(['57111A010'], config), /3\.000\.000\.000đ/);
rows = [];
assert.match(await lookupPurchase(['999999'], config), /Chưa tìm thấy mã 999999.*Facebook/);
rows = Array.from({ length: 101 }, (_, index) => ({ reference: `126234-${index}`, used_price_million_vnd: 100 }));
assert.match(await lookupPurchase(['126234'], config), /một số phiên bản/);
assert.match(await lookupPurchase(['126234XYZ'], config), /quá nhiều phiên bản/);
fail = true;
await assert.rejects(lookupPurchase(['126234'], config), /Catalog request failed/);
await assert.rejects(lookupPurchase(['126234'], {}), /Catalog unavailable/);
console.log('Chat lookup: references, intent/history, variants, prices, missing data, limits and failures passed.');

if (process.argv.includes('--live')) {
  vm.runInContext(fs.readFileSync(new URL('../supabase-config.js', import.meta.url), 'utf8'), sandbox);
  sandbox.fetch = fetch;
  const liveConfig = sandbox.window.REWATCH_SUPABASE;
  const response = await fetch(`${liveConfig.url}/rest/v1/purchase_catalog_variants?select=reference&limit=1`, {
    headers: { apikey: liveConfig.publishableKey },
  });
  assert.equal(response.ok, true);
  const [sample] = await response.json();
  assert.ok(sample?.reference, 'Live catalog must contain a reference');
  const liveAnswer = await lookupPurchase(refs(sample.reference), liveConfig);
  assert.match(liveAnswer, /Giá thu mua dự kiến cho/);
  assert.ok(liveAnswer.includes(sample.reference));
  console.log(`Live public catalog: ${sample.reference} resolved successfully.`);
}
