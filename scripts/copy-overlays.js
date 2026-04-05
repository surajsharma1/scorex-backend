#!/usr/bin/env node
/**
 * Pre-build script: Ensure overlays/ directory is populated for Nixpacks/Render
 * Copies from repo root public/overlays if needed
 */

const fs = require('fs');
const path = require('path');

const overlaysDir = path.join(__dirname, '../public/overlays');
const sourceDir = path.join(__dirname, '../../public/overlays'); // From monorepo root

if (!fs.existsSync(overlaysDir)) {
  fs.mkdirSync(overlaysDir, { recursive: true });
  console.log('📁 Created public/overlays/');
}

if (fs.existsSync(sourceDir)) {
  // Copy from monorepo root public/overlays
  fs.readdirSync(sourceDir).forEach(file => {
    const src = path.join(sourceDir, file);
    const dst = path.join(overlaysDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dst);
      console.log(`📄 Copied ${file}`);
    }
  });
  console.log('✅ Overlays copied from monorepo root');
} else {
  console.log('⚠️ No source overlays found, skipping copy');
}

console.log('🎬 Pre-build complete');
