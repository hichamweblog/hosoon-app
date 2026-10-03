import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const catalog=JSON.parse(fs.readFileSync('public/mushaf/catalog.json','utf8'));
assert.equal(catalog.pages.length,485);
for(const meta of catalog.pages){const image=fs.readFileSync(`public/mushaf/pages/page${meta.page}.jpg`);assert.equal(image.length,meta.bytes);assert.equal(createHash('sha256').update(image).digest('hex'),meta.sha256);}
console.log(`✓ 485 image files match immutable SHA-256 catalogue (${catalog.totalBytes} bytes)`);
if(fs.existsSync('public/sw.js')){
 const sw=fs.readFileSync('public/sw.js','utf8');
 const urls=[...sw.matchAll(/'url':'([^']+)'/g)].map(match=>match[1]);
 assert.ok(urls.includes('/'));assert.ok(urls.includes('/mushaf/catalog.json'));assert.ok(urls.includes('/manifest.json'));
 assert.equal(urls.filter(url=>url.startsWith('/mushaf/pages/')).length,0);
 assert.ok(!urls.some(url=>url.startsWith('/api/')||url.startsWith('/supabase/')||url.includes('://')));
 console.log(`✓ ${urls.length} shell entries; ZERO automatic mushaf image precaches; no API/Auth precaching`);
}else console.log('Service worker not built yet; run npm run build then verify-offline for manifest checks.');
