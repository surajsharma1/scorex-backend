const fs = require('fs').promises;\nconst path = require('path');

async function copyOverlays() {
  const srcDir = path.resolve(__dirname, '../../scorex-frontend/scorex-frontend/public/overlays');
  const destDir = path.resolve(__dirname, 'public/overlays');
  
  try {
    await fs.ensureDir(destDir);
    await fs.copy(srcDir, destDir);
    console.log('✅ Copied overlays to backend/public/overlays/');
    console.log(`📁 Source: ${srcDir}`);
    console.log(`📁 Dest: ${destDir}`);
  } catch (err) {
    console.error('❌ Copy failed:', err.message);
    process.exit(1);
  }
}

copyOverlays();

