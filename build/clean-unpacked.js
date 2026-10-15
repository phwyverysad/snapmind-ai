const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  try {
    const appOutDir = context.appOutDir;
    // Replace huge 9.4MB LICENSES.chromium.html with a concise license placeholder
    const licenseHtml = path.join(appOutDir, 'LICENSES.chromium.html');
    if (fs.existsSync(licenseHtml)) {
      fs.writeFileSync(licenseHtml, '<!DOCTYPE html><html><body><p>Chromium and Electron Open Source Licenses</p></body></html>', 'utf8');
      console.log('  • Optimized LICENSES.chromium.html (saved ~9.4 MB)');
    }
  } catch (e) {
    console.warn('  • afterPack optimization warning:', e.message);
  }
};
