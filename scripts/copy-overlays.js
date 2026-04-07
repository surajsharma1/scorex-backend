#!/usr/bin/env node
/**
 * Pre-build script: Copy overlays from sibling frontend repo (separate repos setup)
 * For Nixpacks/Render - local dev skips if already present
 */

const fs = require('fs');
const path = require('path');

const overlaysDir = path.join(__dirname, '../public/overlays');
const frontendOverlaysDir = path.join(__dirname, '../../../scorex-frontend/scorex-frontend/public/overlays'); // Sibling repo

// Ensure target dir
if (!fs.existsSync(overlaysDir)) {
  fs.mkdirSync(overlaysDir, { recursive: true });
  console.log('📁 Created public/overlays/');
}

// Copy if frontend source exists
if (fs.existsSync(frontendOverlaysDir)) {
  fs.readdirSync(frontendOverlaysDir).forEach(file => {
    const src = path.join(frontendOverlaysDir, file);
    const dst = path.join(overlaysDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dst);
      console.log(`📄 Copied ${file} from frontend repo`);
    }
  });
  console.log('✅ Overlays synced from scorex-frontend/public/overlays');
} else {
  console.log('⚠️ Frontend overlays source not found, using local public/overlays');
}

console.log('🎬 Pre-build copy-overlays complete');

