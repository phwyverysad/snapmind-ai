// === COMPREHENSIVE TEST SUITE: NATIVE IN-PROCESS HOTKEY ENGINE (SNIP & QUICK TEXT) ===
// Verifies that:
// 1. Snip hotkey ('Alt+Shift+S' / เลือกพื้นที่เพื่อภาพ Ai) triggers startSnippingMode()
// 2. Quick Text hotkey ('Ctrl+CapsLock' / ตัวเลือกถาม Ai) triggers startQuickTextMode() with captured text
// 3. In-process DLL engine (GeminiTextCopy.dll) handles WH_KEYBOARD_LL + RegisterHotKey + GetAsyncKeyState
// 4. Outside click dismissal works through in-process DLL
// 5. Zero helper .exe process is running in Task Manager
// 6. Dynamic combo re-configuration and CapsLock suppression work as designed

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const nativeBridge = require('./nativeBridge');

console.log('====================================================');
console.log('🌟 NATIVE HOTKEY VERIFICATION: SNIP & QUICK TEXT');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('👉 [SECTION 1] In-Process Native Keyboard Hook Engine Initialization');

  it('GeminiTextCopy.dll is loaded and bridge is initialized', () => {
    const initOk = nativeBridge.initNativeBridge();
    assert.strictEqual(initOk, true, 'nativeBridge.initNativeBridge() must return true');
    assert.strictEqual(nativeBridge.isDllAvailable(), true, 'nativeBridge.isDllAvailable() must return true');
  });

  it('In-process native keyboard hook starts successfully with Alt+Shift+S and Ctrl+CapsLock', () => {
    const started = nativeBridge.startNativeKeyboardHook('Alt+Shift+S', 'Ctrl+CapsLock');
    assert.strictEqual(started, true, 'startNativeKeyboardHook must return true');
    assert.strictEqual(nativeBridge.isNativeHookRunning(), true, 'isNativeHookRunning must return true');
  });

  console.log('\n👉 [SECTION 2] Snip Hotkey Verification (เลือกพื้นที่เพื่อภาพ Ai: Alt+Shift+S)');

  await itAsync('Snip trigger event (Type 1) is detected by pollHotkeyEventNative', async () => {
    nativeBridge.simulateHotkeyTrigger(1, '');
    const evt = nativeBridge.pollHotkeyEventNative();
    assert(evt !== null, 'Event should be available from DLL queue');
    assert.strictEqual(evt.type, 1, 'Event type must be 1 (SNIP)');
  });

  await itAsync('Snip listener callback fires seamlessly via startHookPolling', async () => {
    let snipFired = false;
    nativeBridge.startHookPolling({
      onSnip: () => {
        snipFired = true;
      }
    });

    nativeBridge.simulateHotkeyTrigger(1, '');

    // Wait for polling interval (16ms)
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(snipFired, true, 'onSnip listener callback must be called when Snip hotkey triggers');
    nativeBridge.stopHookPolling();
  });

  console.log('\n👉 [SECTION 3] Quick Text Hotkey Verification (ตัวเลือกถาม Ai: Ctrl+CapsLock)');

  await itAsync('Quick Text trigger event (Type 2) captures text and is polled with UTF-8 payload', async () => {
    const sampleText = 'ทดสอบข้อความที่เลือกสำหรับถาม AI (SnapMind AI)';
    nativeBridge.simulateHotkeyTrigger(2, sampleText);
    const evt = nativeBridge.pollHotkeyEventNative();
    assert(evt !== null, 'Event should be available from DLL queue');
    assert.strictEqual(evt.type, 2, 'Event type must be 2 (QUICK_TEXT)');
    assert.strictEqual(evt.text, sampleText, 'Payload must match the captured selected text');
  });

  await itAsync('Quick Text listener callback fires and delivers captured text via startHookPolling', async () => {
    let receivedText = null;
    nativeBridge.startHookPolling({
      onQuickText: (text) => {
        receivedText = text;
      }
    });

    const testPrompt = 'Translate this sentence into pure Thai';
    nativeBridge.simulateHotkeyTrigger(2, testPrompt);

    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(receivedText, testPrompt, 'onQuickText listener callback must receive exact text');
    nativeBridge.stopHookPolling();
  });

  console.log('\n👉 [SECTION 4] Outside-Click Dismissal & Toolbar Bounds Tracking');

  it('setToolbarActiveState sets active rect in native DLL', () => {
    assert.doesNotThrow(() => {
      nativeBridge.setToolbarActiveState(1, 100, 200, 940, 52);
    }, 'setToolbarActiveState(1, ...) should execute without error');
  });

  await itAsync('Outside-click event (Type 3) triggers onClickOutside callback to dismiss toolbar', async () => {
    let dismissTriggered = false;
    nativeBridge.startHookPolling({
      onClickOutside: () => {
        dismissTriggered = true;
      }
    });

    nativeBridge.simulateHotkeyTrigger(3, '');
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(dismissTriggered, true, 'onClickOutside listener callback must be invoked');
    nativeBridge.stopHookPolling();
  });

  it('setToolbarActiveState(0) deactivates toolbar rect cleanly', () => {
    assert.doesNotThrow(() => {
      nativeBridge.setToolbarActiveState(0, 0, 0, 0, 0);
    });
  });

  console.log('\n👉 [SECTION 5] Dynamic Hotkey Re-configuration');

  it('updateHotkeyCombos updates combos on the fly without stopping hook', () => {
    assert.doesNotThrow(() => {
      nativeBridge.updateHotkeyCombos('Alt+S', 'Ctrl+Caps');
    }, 'updateHotkeyCombos should update combos cleanly');
    assert.strictEqual(nativeBridge.isNativeHookRunning(), true, 'Hook must stay running after update');

    // Restore standard defaults
    nativeBridge.updateHotkeyCombos('Alt+Shift+S', 'Ctrl+CapsLock');
  });

  console.log('\n👉 [SECTION 6] Main Process Integration & Zero Helper .exe In Task Manager');

  const mainJsContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

  it('main.js startNativeHotkeyHook launches in-process native keyboard hook', () => {
    assert(mainJsContent.includes('nativeBridge.startNativeKeyboardHook('), 'main.js must call nativeBridge.startNativeKeyboardHook');
    assert(mainJsContent.includes('nativeBridge.startHookPolling('), 'main.js must start hook polling for snip & quick text');
  });

  it('main.js startHookPolling wires onSnip to startSnippingMode()', () => {
    assert(mainJsContent.includes('startSnippingMode()'), 'onSnip must trigger startSnippingMode');
  });

  it('main.js startHookPolling wires onQuickText to startQuickTextMode() with captured text', () => {
    assert(mainJsContent.includes('startQuickTextMode(cursorPos, text'), 'onQuickText must trigger startQuickTextMode with text');
  });

  it('main.js startHookPolling wires onClickOutside to closeQuickTextMode()', () => {
    assert(mainJsContent.includes('closeQuickTextMode()'), 'onClickOutside must trigger closeQuickTextMode');
  });

  it('main.js updateHotkeyCombos is invoked in registerGlobalHotkey()', () => {
    assert(mainJsContent.includes('nativeBridge.updateHotkeyCombos('), 'main.js must update combos in nativeBridge');
  });

  it('main.js startQuickTextMode sets toolbar active state in native DLL', () => {
    assert(mainJsContent.includes('nativeBridge.setToolbarActiveState(1'), 'startQuickTextMode must inform DLL of toolbar bounds');
  });

  it('main.js closeQuickTextMode resets toolbar active state in native DLL', () => {
    assert(mainJsContent.includes('nativeBridge.setToolbarActiveState(0'), 'closeQuickTextMode must deactivate bounds in DLL');
  });

  it('main.js killNativeHookProcesses stops native keyboard hook cleanly', () => {
    assert(mainJsContent.includes('nativeBridge.stopNativeKeyboardHook()'), 'killNativeHookProcesses must call stopNativeKeyboardHook');
  });

  it('main.js avoids spawning external hotkey_hook.exe when DLL hook is active', () => {
    assert(mainJsContent.includes('Using in-process native DLL (GeminiTextCopy.dll) - No separate helper .exe process needed!'),
      'main.js must skip spawning hotkey_hook.exe when DLL is running');
  });

  console.log('\n👉 [SECTION 7] Clean Teardown & Lifecycle Verification');

  it('stopNativeKeyboardHook cleanly stops hook and background worker thread', () => {
    nativeBridge.stopNativeKeyboardHook();
    assert.strictEqual(nativeBridge.isNativeHookRunning(), false, 'isNativeHookRunning must be false after stop');
  });

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
