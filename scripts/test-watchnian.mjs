import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseWatchnian, missingFromKame } from './watchnian.mjs';
const html = `<li class="casestudyList04_item">
<p class="casestudyList04_title02">スカイドゥエラー 336934 ミントグリーン文字盤・ジュビリーブレス</p>
<dl class="casestudyList04_conflictSet casestudyList04_conflictSet-brandNew"><dd>～¥3,000,000</dd></dl>
<dl class="casestudyList04_conflictSet casestudyList04_conflictSet-used"><dd>～¥2,800,000</dd></dl>
<img src="/files_thumbnail/test.jpg/210.jpg"></li>`;
const rows = parseWatchnian(html, 'https://buy.watchnian.com/test/');
assert.equal(rows[0].sourceImageUrl, 'https://buy.watchnian.com/files/test.jpg');
assert.equal(rows[0].sourceThumbnailUrl, 'https://buy.watchnian.com/files_thumbnail/test.jpg/210.jpg');
assert.equal(rows.length, 1);
assert.equal(rows[0].newPriceManYen, 300);
assert.equal(rows[0].usedPriceManYen, 280);
assert.equal((rows[0].newPriceManYen - 15) * 10000 * (170 - 2), 478800000);
const source = readFileSync(new URL('./sync-kame-prices.mjs', import.meta.url), 'utf8');
const calculation = source.slice(source.indexOf('function calculateVndMillions('), source.indexOf('function isSuspiciousJump('));
const calculate = vm.runInNewContext(calculation + '\ncalculateVndMillions');
assert.equal(calculate(300, 15, 168), 478.8);
assert.equal(calculate(null, 15, 168), null);
assert.equal(calculate(10, 15, 168), 0);
assert.equal(missingFromKame(rows, []).length, 1);
assert.equal(missingFromKame(rows, [{ reference:'336934', newPriceManYen:300, usedPriceManYen:280, variant:'ミントグリーン ジュビリー' }]).length, 0);
assert.equal(missingFromKame(rows, [{ reference:'336934', newPriceManYen:300, usedPriceManYen:280, variant:'ミントグリーン オイスター' }]).length, 1);
assert.equal(missingFromKame(rows, [{ reference:'336934', newPriceManYen:300, usedPriceManYen:280, variant:'ミントグリーン' }]).length, 0);
assert.equal(parseWatchnian(html.replace('～¥3,000,000', 'お問い合わせ'), 'https://buy.watchnian.com').length, 0);
console.log('Watchnian: parse, JPY units, conversion, Kame priority, ambiguous matches and missing prices passed.');

assert.equal(missingFromKame(rows, [{reference:'336934', variant:'ミントグリーン', newPriceManYen:null, usedPriceManYen:null}]).length, 1);
