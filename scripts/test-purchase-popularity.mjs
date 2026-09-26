import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

const sandbox = { crypto: { randomUUID }, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../purchase-popularity.js', import.meta.url), 'utf8'), sandbox);
let writes = 0;
let fail = false;
const client = { async rpc(name) {
  if (fail) throw new Error('offline');
  if (name === 'record_purchase_view') { writes++; return { error: null }; }
  return { data: [
    { reference: '126710BLRO', variant_key: 'jubilee', views: 12 },
    { reference: '126710BLRO', variant_key: 'oyster', views: 3 },
    { reference: '126500LN', variant_key: 'default', views: 12 },
  ] };
} };
const tracker = sandbox.createPurchasePopularity(client);
const watches = [
  { ref: '126710BLRO', variantKey: 'oyster', displayOrder: 1 },
  { ref: '126500LN', variantKey: 'default', displayOrder: 0 },
  { ref: '126710BLRO', variantKey: 'jubilee', displayOrder: 0 },
  { ref: '124270', variantKey: 'default', displayOrder: 0 },
];
const variants = rows => Array.from(rows, row => row.variantKey);
await tracker.refresh();
assert.deepEqual(variants(tracker.sort(watches)), ['default', 'jubilee', 'oyster', 'default']);
assert.deepEqual(variants(tracker.sort(watches, 'reference')), ['default', 'default', 'jubilee', 'oyster']);
assert.equal(watches[0].variantKey, 'oyster', 'sorting does not mutate the catalog');
await Promise.all([tracker.record(watches[0]), tracker.record(watches[0])]);
await tracker.record(watches[0]);
assert.equal(writes, 1);
fail = true;
await tracker.record(watches[1]);
fail = false;
await tracker.record(watches[1]);
assert.equal(writes, 2, 'failed writes can be retried');
console.log('Purchase popularity: variant ranking, reference sorting and view deduplication passed.');
