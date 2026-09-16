import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

const sandbox = { crypto: { randomUUID }, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../family-popularity.js', import.meta.url), 'utf8'), sandbox);
let writes = 0;
let fail = false;
const client = { async rpc(name) {
  if (fail) throw new Error('offline');
  if (name === 'record_family_view') { writes++; return { error: null }; }
  return { data: [
    { brand_slug: 'rolex', family_name: 'GMT', views: 12 },
    { brand_slug: 'rolex', family_name: 'Daytona', views: 12 },
    { brand_slug: 'ap', family_name: 'Datejust', views: 99 },
  ] };
} };
const tracker = sandbox.createFamilyPopularity(client);
const families = ['Datejust', 'Daytona', 'GMT', 'Explorer'].map(name => ({ name }));
const names = rows => Array.from(rows, row => row.name);
assert.deepEqual(names(tracker.sort('rolex', families)), names(families));
await tracker.refresh();
assert.deepEqual(names(tracker.sort('rolex', families)), ['Daytona', 'GMT', 'Datejust', 'Explorer']);
assert.deepEqual(names(families), ['Datejust', 'Daytona', 'GMT', 'Explorer']);
await Promise.all([tracker.record('rolex', 'GMT'), tracker.record('rolex', 'GMT')]);
await tracker.record('rolex', 'GMT');
assert.equal(writes, 1);
fail = true;
await tracker.record('rolex', 'Explorer');
await tracker.refresh();
fail = false;
await tracker.record('rolex', 'Explorer');
assert.equal(writes, 2, 'failed writes can be retried');
console.log('Popularity: sorting, ties, brand isolation, deduplication and offline retry passed.');
