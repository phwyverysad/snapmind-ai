const { execSync } = require('child_process');
const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.startsWith('test_') && f.endsWith('.js'));
let passed = 0;
let failed = 0;
const failures = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const needsElectron = content.includes('app.whenReady') || content.includes('BrowserWindow') || content.includes("require('electron')") || content.includes('require("electron")');
  const cmd = (needsElectron ? 'npx electron ' : 'node ') + f;
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log('✅ PASS: ' + f);
    passed++;
  } catch (err) {
    console.error('❌ FAIL: ' + f + ' -> ' + (err.stderr ? err.stderr.toString().slice(0, 200) : err.message.slice(0, 200)));
    failed++;
    failures.push(f);
  }
});

console.log('\n========================================');
console.log('RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED');
if (failures.length > 0) {
  console.log('Failed files:', failures);
  process.exit(1);
} else {
  console.log('All test suites PASSED with 0 regressions!');
  process.exit(0);
}
console.log('========================================');
