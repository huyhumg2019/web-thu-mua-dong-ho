export const WATCHNIAN_URL = 'https://buy.watchnian.com/brand_rolex_sky-dweller_watch/';
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export function identity(value) {
  const dial = [
    ['mint', /ミントグリーン/], ['blue', /ブルー/], ['black', /ブラック/],
    ['white', /ホワイト/], ['chocolate', /チョコ|ブラウン/], ['champagne', /シャンパン|ゴールデン/],
    ['slate', /スレート|グレー|ロジウム/],
  ].find(([, pattern]) => pattern.test(value))?.[0];
  const bracelet = /ジュビリー|Jubilee/i.test(value) ? 'Jubilee'
    : /オイスター.*フレックス|Oysterflex/i.test(value) ? 'Oysterflex'
    : /オイスター|Oyster/i.test(value) ? 'Oyster' : null;
  return { dial, bracelet };
}
export function parseWatchnian(html, url) {
  const rows = [];
  for (const match of html.matchAll(/<li\b[^>]*class="casestudyList04_item"[^>]*>([\s\S]*?)<\/li>/g)) {
    const block = match[1];
    const title = text(block.match(/<p class="casestudyList04_title02">([\s\S]*?)<\/p>/)?.[1] || '');
    const reference = title.match(/\b([23]3[6]?\d{3})\b/)?.[1] || title.match(/\b(\d{6})\b/)?.[1];
    const price = kind => {
      const part = block.match(new RegExp(`class="casestudyList04_conflictSet casestudyList04_conflictSet-${kind}"[^>]*>([\\s\\S]*?)<\\/dl>`))?.[1] || '';
      const amount = text(part).match(/[¥￥]\s*([\d,]+)/)?.[1];
      return amount ? Number(amount.replaceAll(',', '')) / 10000 : null;
    };
    const newPriceManYen = price('brandNew');
    const usedPriceManYen = price('used');
    const { dial, bracelet } = identity(title);
    const image = block.match(/<img\b[^>]*src="([^"]+)"/)?.[1];
    const thumbnailUrl = image ? new URL(image, url) : null;
    // The listing uses a 210px thumbnail; the same image is available in /files/.
    const originalPath = thumbnailUrl?.pathname.match(
      /^\/files_thumbnail\/([^/]+)\/\d+\.(?:jpe?g|png|webp)$/i,
    );
    const sourceImageUrl = originalPath
      ? new URL(`/files/${originalPath[1]}`, url).href
      : thumbnailUrl?.href || '';
    if (!reference || !dial || !bracelet || !newPriceManYen || !usedPriceManYen) continue;
    const labels = { mint:'xanh mint', blue:'xanh lam', black:'đen', white:'trắng', chocolate:'chocolate', champagne:'champagne', slate:'xám' };
    rows.push({ reference, brand:'Rolex', model:'Sky-Dweller', variant:title,
      newPriceManYen, usedPriceManYen, source:'watchnian', sourceUrl:url,
      sourceImageUrl, sourceThumbnailUrl:thumbnailUrl?.href || '', dial, bracelet,
      variantKey:`watchnian-${dial}-${bracelet.toLowerCase()}`,
      variantLabel:`Mặt ${labels[dial]} · Dây ${bracelet}` });
  }
  return rows;
}
export function missingFromKame(rows, kame) {
  return rows.filter(row => !kame.some(existing => {
    if (existing.reference !== row.reference) return false;
    if (!(existing.newPriceManYen > 0 && existing.usedPriceManYen > 0)) return false;
    const id = identity(existing.variant);
    // Unknown dial/bracelet is ambiguous: prefer Kame, never guess a duplicate.
    return (!id.dial || id.dial === row.dial) && (!id.bracelet || id.bracelet === row.bracelet);
  }));
}
export async function fetchWatchnian(fetcher = fetch) {
  async function read(url) {
    const response = await fetcher(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Watchnian HTTP ${response.status}`);
    return response.text();
  }
  const html = await read(WATCHNIAN_URL);
  const urls = [...new Set([...html.matchAll(/href="([^"]*rolex_sky-dweller_watch_item_detail_\d+\/?)"/g)]
    .map(match => new URL(match[1].replace(/\/?$/, '/'), WATCHNIAN_URL).href))];
  if (!urls.length || urls.length > 40) throw new Error('Không đọc được danh mục Watchnian');
  const rows = [];
  for (const url of urls) rows.push(...parseWatchnian(await read(url), url));
  if (!rows.length) throw new Error('Không đọc được giá Watchnian');
  return [...new Map(rows.map(row => [`${row.reference}:${row.variantKey}`, row])).values()];
}
