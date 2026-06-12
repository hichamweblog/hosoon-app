const sharp = require('sharp');
const fs = require('fs');

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0A0F1E"/>
  <rect x="50" y="50" width="412" height="412" rx="100" fill="url(#grad)"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" text-anchor="middle" fill="#0A0F1E">ح</text>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6"/>
      <stop offset="100%" stop-color="#D4A853"/>
    </linearGradient>
  </defs>
</svg>
`;

async function run() {
  fs.writeFileSync('icon.svg', svg);
  await sharp('icon.svg').resize(192, 192).png().toFile('public/icon-192.png');
  await sharp('icon.svg').resize(512, 512).png().toFile('public/icon-512.png');
  fs.unlinkSync('icon.svg');
  console.log('Icons generated successfully.');
}

run().catch(console.error);
