#!/usr/bin/env node
// Generates all required iOS app icon sizes from public/logo.png using sharp.
// Run: node scripts/generate-icons.js
// Requires: npm install -D sharp (add to devDependencies)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.resolve('public/logo.png');
const ICONSET = path.resolve('ios/App/App/Assets.xcassets/AppIcon.appiconset');

const SIZES = [
  { size: 20,   scales: [1, 2, 3] },
  { size: 29,   scales: [1, 2, 3] },
  { size: 40,   scales: [1, 2, 3] },
  { size: 60,   scales: [2, 3] },
  { size: 76,   scales: [1, 2] },
  { size: 83.5, scales: [2] },
  { size: 1024, scales: [1] },
];

async function generate() {
  if (!fs.existsSync(ICONSET)) {
    console.error('iOS project not found. Run: npx cap add ios first.');
    process.exit(1);
  }
  const contents = { images: [], info: { version: 1, author: 'xcode' } };
  for (const { size, scales } of SIZES) {
    for (const scale of scales) {
      const px = Math.round(size * scale);
      const filename = `AppIcon-${size}x${size}@${scale}x.png`;
      await sharp(SRC).resize(px, px).toFile(path.join(ICONSET, filename));
      contents.images.push({
        filename,
        idiom: size === 76 || size === 83.5 ? 'ipad' : 'iphone',
        scale: `${scale}x`,
        size: `${size}x${size}`,
      });
      console.log('Generated', filename);
    }
  }
  // 1024 is for App Store, idiom = ios-marketing
  const storeEntry = contents.images.find(i => i.size === '1024x1024');
  if (storeEntry) storeEntry.idiom = 'ios-marketing';
  fs.writeFileSync(
    path.join(ICONSET, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log('Done. Contents.json written.');
}
generate().catch(console.error);
