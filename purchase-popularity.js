/* Shared 30-day rankings for individual buyback variants. */
function createPurchasePopularity(client) {
  let counts = new Map();
  const counted = new Set();
  const pending = new Set();
  let visitor;
  try {
    visitor = localStorage.getItem('rewatch-viewer');
    if (!/^[0-9a-f-]{36}$/i.test(visitor || '')) {
      visitor = crypto.randomUUID();
      localStorage.setItem('rewatch-viewer', visitor);
    }
  } catch {
    visitor = crypto.randomUUID();
  }
  const key = (watch) => JSON.stringify([watch.ref, watch.variantKey || 'default']);
  return {
    async refresh() {
      try {
        const { data, error } = await client.rpc('get_purchase_popularity');
        if (!error && Array.isArray(data)) {
          counts = new Map(data.map(row => [
            JSON.stringify([row.reference, row.variant_key]), Number(row.views) || 0,
          ]));
        }
      } catch { /* Keep the last known ranking when offline. */ }
    },
    sort(watches, mode = 'popular') {
      return [...watches].sort((a, b) =>
        (mode === 'popular' ? (counts.get(key(b)) || 0) - (counts.get(key(a)) || 0) : 0) ||
        a.ref.localeCompare(b.ref) || a.displayOrder - b.displayOrder
      );
    },
    async record(watch) {
      const id = key(watch) + new Date().toISOString().slice(0, 10);
      if (counted.has(id) || pending.has(id)) return;
      pending.add(id);
      try {
        const { error } = await client.rpc('record_purchase_view', {
          p_reference: watch.ref,
          p_variant_key: watch.variantKey || 'default',
          p_visitor: visitor,
        });
        if (!error) counted.add(id);
      } catch { /* Analytics must never block browsing. */ }
      finally { pending.delete(id); }
    },
  };
}
