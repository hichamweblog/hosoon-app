import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd();
const pages = [];
for (let page = 1; page <= 485; page++) {
  const bytes = await readFile(path.join(root, `public/mushaf/pages/page${page}.jpg`));
  pages.push({ page, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const catalog = { edition: 'warsh-athman-485-v1', totalBytes: pages.reduce((n, p) => n + p.bytes, 0), pages };
await writeFile(path.join(root, 'public/mushaf/catalog.json'), JSON.stringify(catalog) + '\n');
console.log(`${pages.length} pages · ${catalog.totalBytes} bytes · SHA-256 catalog generated`);
