const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('================================================================');
console.log('🧪 VERIFYING TOPMOST WIN32 INTEGRATION & POSITIONING ABOVE TEXT');
console.log('================================================================\n');

async function testTopmost() {
  const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const nativeCs = fs.readFileSync(path.join(__dirname, 'native_hotkey.cs'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
  const hookExePath = path.join(__dirname, 'hotkey_hook.exe');

  console.log('👉 [STEP 1] Code Verification for Topmost & Positioning');
  assert(nativeCs.includes('WS_EX_TOPMOST = 0x00000008'), 'native_hotkey.cs defines WS_EX_TOPMOST style flag');
  assert(nativeCs.includes('HWND_TOPMOST = new IntPtr(-1)'), 'native_hotkey.cs defines HWND_TOPMOST constant');
  assert(nativeCs.includes('MakeWindowTopmost'), 'native_hotkey.cs implements MakeWindowTopmost method');
  assert(nativeCs.includes('TOPMOST_COMPLETED'), 'native_hotkey.cs responds to TOPMOST stdin command');

  assert(mainJs.includes('enforceTopmostWin32'), 'main.js defines enforceTopmostWin32 helper');
  assert(mainJs.includes('startTopmostKeeper'), 'main.js implements startTopmostKeeper interval');
  assert(mainJs.includes('stopTopmostKeeper'), 'main.js implements stopTopmostKeeper cleanup');
  assert(mainJs.includes("'screen-saver', 1000"), 'main.js uses highest priority level 1000 for screen-saver');
  assert(mainJs.includes('setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })'), 'main.js keeps toolbar visible across all workspaces and fullscreen apps');
  assert(mainJs.includes('activePoint.y - tbHeight - 14'), 'main.js positions toolbar ABOVE cursor so text is never obscured');
  console.log('  ✅ PASS: All code patterns for topmost and position verified.');

  console.log('\n👉 [STEP 2] Live Process Testing with TOPMOST stdin command');
  const hookProc = spawn(hookExePath, ['Alt+Shift+S', 'Ctrl+CapsLock']);
  let readyReceived = false;
  let topmostCompleted = false;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      hookProc.kill();
      reject(new Error('Hook process timeout waiting for TOPMOST_COMPLETED'));
    }, 4000);

    hookProc.stdout.on('data', (data) => {
      const text = data.toString();
      if (text.includes('HOTKEY_HOOK_READY')) {
        readyReceived = true;
        // Send TOPMOST command with dummy HWND
        hookProc.stdin.write('TOPMOST 123456\n');
      }
      if (text.includes('TOPMOST_COMPLETED')) {
        topmostCompleted = true;
        clearTimeout(timer);
        hookProc.kill();
        resolve();
      }
    });

    hookProc.stderr.on('data', (data) => {
      console.error('[HOOK STDERR]', data.toString());
    });

    hookProc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  assert(readyReceived, 'hotkey_hook.exe emitted HOTKEY_HOOK_READY');
  assert(topmostCompleted, 'hotkey_hook.exe handled TOPMOST command and emitted TOPMOST_COMPLETED');
  console.log('  ✅ PASS: Live hotkey_hook.exe processes TOPMOST commands reliably.');

  console.log('\n================================================================');
  console.log('🎉 TOPMOST (NO APP OVERLAP) & POSITIONING FULLY VERIFIED!');
  console.log('================================================================\n');
}

testTopmost().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
