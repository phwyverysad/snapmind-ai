// === TEST SUITE: AUTO-LAUNCH ON STARTUP & SNAPMIND_AI_WEBSETUP CONFIGURATION ===
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 VERIFYING AUTO-LAUNCH STARTUP & SNAPMIND_AI_WEBSETUP CONFIG');
console.log('====================================================\n');

// 1. Check main.js
console.log('👉 [1] Verifying main.js Auto-Launch Logic');
const mainJs = fs.readFileSync('main.js', 'utf8');

assert(mainJs.includes('autoLaunch: false'), 'main.js DEFAULT_CONFIG includes autoLaunch: false');
assert(mainJs.includes('function applyAutoLaunchSetting(enable)'), 'main.js defines applyAutoLaunchSetting function');
assert(mainJs.includes('app.setLoginItemSettings'), 'main.js uses app.setLoginItemSettings for native Windows startup integration');
assert(mainJs.includes('args: [\'--hidden\']'), 'main.js passes --hidden flag when starting with Windows');
assert(mainJs.includes('applyAutoLaunchSetting(currentConfig.autoLaunch)'), 'main.js loadConfig applies autoLaunch');
assert(mainJs.includes('applyAutoLaunchSetting(config.autoLaunch)'), 'main.js saveConfig applies autoLaunch');
assert(mainJs.includes('เริ่มต้นอัตโนมัติเมื่อเปิด Windows'), 'main.js System Tray menu includes Windows startup checkbox toggle');

// 2. Check index.html
console.log('\n👉 [2] Verifying index.html Settings Modal UI');
const indexHtml = fs.readFileSync('index.html', 'utf8');

assert(indexHtml.includes('id="autoLaunchCheckbox"'), 'index.html contains #autoLaunchCheckbox input');
assert(indexHtml.includes('auto-launch-card'), 'index.html contains .auto-launch-card layout');
assert(indexHtml.includes('เริ่มต้นอัตโนมัติเมื่อเปิด Windows'), 'index.html displays clear Thai title for auto launch');
assert(indexHtml.includes('เปิดโปรแกรมในพื้นหลังทันทีเมื่อเข้าสู่ระบบ'), 'index.html displays helpful subtitle explaining background startup');

// 3. Check script.js
console.log('\n👉 [3] Verifying script.js Settings Modal Logic');
const scriptJs = fs.readFileSync('script.js', 'utf8');

assert(scriptJs.includes("document.getElementById('autoLaunchCheckbox')"), 'script.js references autoLaunchCheckbox element');
assert(scriptJs.includes('chkAutoLaunch.checked = Boolean(appSettings.autoLaunch)'), 'script.js openSettingsModal populates autoLaunchCheckbox.checked from appSettings');
assert(scriptJs.includes('autoLaunch: autoLaunchVal'), 'script.js saveSettingsFromModal saves autoLaunchVal into newSettings');

// 4. Check package.json
console.log('\n👉 [4] Verifying package.json WebSetup & Program Files Config');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert(pkg.build && pkg.build.nsis, 'package.json contains build.nsis configuration');
assert(pkg.build.nsis.artifactName === 'SnapMind_AI_WebSetup.exe', 'artifactName is configured as "SnapMind_AI_WebSetup.exe"');
assert(pkg.build.nsis.perMachine === true, 'perMachine is set to true (installs into Program Files)');
assert(pkg.build.nsis.allowToChangeInstallationDirectory === true, 'allowToChangeInstallationDirectory is true');
assert(pkg.build.nsis.allowElevation === true, 'allowElevation is true (requests UAC for Program Files)');
assert(pkg.build.compression === 'maximum', 'compression is set to maximum for minimal file size');
assert(Array.isArray(pkg.build.electronLanguages) && pkg.build.electronLanguages.includes('th'), 'electronLanguages includes "th"');
assert(pkg.scripts.dist.includes('--x64'), 'dist script specifies --x64 architecture for minimal file size');

console.log('\n====================================================');
console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL AUTO-LAUNCH & WEBSETUP TESTS PASSED!');
  process.exit(0);
}
