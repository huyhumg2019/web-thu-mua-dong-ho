import assert from 'node:assert/strict';
import { isManagedVariant, isManualReference } from './purchase-sync-policy.mjs';

// Deletion tombstones must survive every later automated import.
assert.equal(isManagedVariant({ active: false, price_mode: 'auto', source_name: 'kame-kichi' }), true);
assert.equal(isManagedVariant({ active: false, price_mode: 'manual', source_name: 'watchnian' }), true);
assert.equal(isManagedVariant({ active: true, price_mode: 'manual', source_name: 'future-source' }), true);
assert.equal(isManagedVariant({ active: true, price_mode: 'auto', source_name: 'future-source' }), false);
assert.equal(isManagedVariant(undefined), false);
assert.equal(isManualReference({ price_mode: 'manual', price_source: 'manual' }), true);
assert.equal(isManualReference({ price_mode: 'manual', price_source: 'kame-kichi' }), false);
console.log('Shared price-source protection passed.');
