/* Shared rankings; the browser stores only an anonymous deduplication ID. */
function createFamilyPopularity(client) {
  let counts = new Map();
  let visitor;
  const counted = new Set();
  const pending = new Set();
  try {
    visitor = localStorage.getItem('rewatch-viewer');
    if (!/^[0-9a-f-]{36}$/i.test(visitor || '')) {
      visitor = crypto.randomUUID();
      localStorage.setItem('rewatch-viewer', visitor);
    }
  } catch {
    visitor = crypto.randomUUID();
  }
  const key = (brand, family) => JSON.stringify([brand, family]);
  async function refresh() {
    try {
      const { data, error } = await client.rpc('get_family_popularity');
      if (!error && Array.isArray(data)) {
        counts = new Map(data.map(row => [key(row.brand_slug, row.family_name), Number(row.views)]));
      }
    } catch { /* Keep the last known ranking if offline. */ }
  }
  return {
    refresh,
    sort(brand, families) {
      return families.map((family, index) => ({ family, index }))
        .sort((a, b) => (counts.get(key(brand, b.family.name)) || 0)
          - (counts.get(key(brand, a.family.name)) || 0) || a.index - b.index)
        .map(item => item.family);
    },
    async record(brand, family) {
      const id = key(brand, family) + new Date().toISOString().slice(0, 10);
      if (counted.has(id) || pending.has(id)) return;
      pending.add(id);
      try {
        const { error } = await client.rpc('record_family_view', {
          p_brand: brand, p_family: family, p_visitor: visitor,
        });
        if (!error) {
          counted.add(id);
          await refresh();
        }
      } catch { /* Analytics must never block browsing. */ }
      finally { pending.delete(id); }
    },
  };
}
