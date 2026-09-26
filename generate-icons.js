import fs from "fs";
import sharp from "sharp";

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width === 256 ? 0 : width, 0);
    entry.writeUInt8(height === 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function run() {
  const src = "public/Hosoon.png";
  if (!fs.existsSync(src)) {
    console.warn(`Source icon ${src} not found. Keeping existing icons.`);
    return;
  }

  // 1. PWA & Web Icons
  await sharp(src).resize(192, 192).png().toFile("public/icon-192.png");
  await sharp(src).resize(512, 512).png().toFile("public/icon-512.png");
  await sharp(src).resize(180, 180).png().toFile("public/apple-touch-icon.png");

  // 2. Next.js App Router metadata icons
  await sharp(src).resize(180, 180).png().toFile("src/app/apple-icon.png");
  await sharp(src).resize(192, 192).png().toFile("src/app/icon.png");

  // 3. Multi-resolution Favicons (16x16, 32x32, 48x48)
  const p16 = await sharp(src).resize(16, 16).png().toBuffer();
  const p32 = await sharp(src).resize(32, 32).png().toBuffer();
  const p48 = await sharp(src).resize(48, 48).png().toBuffer();

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 },
  ]);

  fs.writeFileSync("src/app/favicon.ico", icoBuffer);
  fs.writeFileSync("public/favicon.ico", icoBuffer);

  console.log("Icons and favicons generated successfully from public/Hosoon.png.");
}

run().catch(console.error);
