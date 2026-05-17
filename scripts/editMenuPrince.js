'use strict';

const path = require('path');
const sharp = require('sharp');

const inputPath = path.join(__dirname, '..', 'assets', 'menu.jpg');
const outputPath = path.join(__dirname, '..', 'assets', 'menu.jpg');

const makeSvgOverlay = (w, h) => {
  // These coordinates are tuned for the current 640x640 menu.jpg.
  // If you replace the base image, adjust these numbers.
  // Cover the whole bottom title area to remove old branding cleanly.
  const coverRect = { x: 40, y: 440, width: 560, height: 180, r: 18 };
  const titleY = 535;
  const pillRect = { x: 210, y: 560, width: 220, height: 30, r: 12 };

  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </defs>

  <!-- cover old bottom branding -->
  <rect x="${coverRect.x}" y="${coverRect.y}" width="${coverRect.width}" height="${coverRect.height}" rx="${coverRect.r}"
        fill="rgba(0,0,0,0.92)"/>

  <!-- new title -->
  <text x="${w / 2}" y="${titleY}" text-anchor="middle"
        font-family="Arial Black, Impact, Montserrat, Arial" font-size="64"
        fill="#FFFFFF" stroke="rgba(0,0,0,0.35)" stroke-width="3" paint-order="stroke">
    PRINCE-MD
  </text>

  <!-- label pill -->
  <rect x="${pillRect.x}" y="${pillRect.y}" width="${pillRect.width}" height="${pillRect.height}" rx="${pillRect.r}"
        fill="rgba(0,0,0,0.35)"/>

  <!-- new label -->
  <text x="${w / 2}" y="${pillRect.y + 21}" text-anchor="middle"
        font-family="Arial Black, Impact, Montserrat, Arial" font-size="16"
        fill="#ff8a00">
    PRINCE EDITX
  </text>
</svg>`
  );
};

async function main() {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  const w = meta.width || 640;
  const h = meta.height || 640;

  const svg = makeSvgOverlay(w, h);

  await img
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outputPath);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

