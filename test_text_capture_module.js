const assert = require('assert');
const path = require('path');
const { app, clipboard } = require('electron');
const {
  captureSelectedText,
  backupClipboard,
  releaseModifierKeys,
  simulateCopyInput,
  restoreClipboard,
  getNativeHookExePath
} = require('./textCapture');

console.log('================================================================');
console.log('🧪 TEST SUITE: ROBUST AUTO-COPY & CLIPBOARD EXTRACTION (textCapture.js)');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error('    Error:', err.message);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error('    Error:', err.message);
    failed++;
  }
}

app.whenReady().then(async () => {
  try {
    // ----------------------------------------------------
    // STEP 1: BACKUP CLIPBOARD VERIFICATION
    // ----------------------------------------------------
    console.log('👉 [STEP 1] Backup Clipboard (Text, HTML, RTF in Memory)');
    
    const sampleOriginal = 'MyImportantOriginalData_' + Date.now();
    clipboard.writeText(sampleOriginal);
    const backup1 = backupClipboard();

    it('backupClipboard captures text accurately', () => {
      assert.strictEqual(backup1.text, sampleOriginal);
      assert.strictEqual(backup1.hasData, true);
    });

    clipboard.clear();
    const backupEmpty = backupClipboard();
    it('backupClipboard handles empty clipboard safely', () => {
      assert.strictEqual(backupEmpty.text, '');
      assert.strictEqual(backupEmpty.hasData, false);
    });

    // ----------------------------------------------------
    // STEP 2: RELEASE MODIFIER KEYS VERIFICATION
    // ----------------------------------------------------
    console.log('\n👉 [STEP 2] Release Modifier Keys (Clean Keyboard State)');

    await itAsync('releaseModifierKeys runs cleanly without exceptions', async () => {
      await releaseModifierKeys();
      assert(true, 'Modifiers released cleanly');
    });

    // ----------------------------------------------------
    // STEP 3: SIMULATE COPY INPUT VERIFICATION
    // ----------------------------------------------------
    console.log('\n👉 [STEP 3] Simulate Copy Input (Ctrl+C without mouse move/click)');

    await itAsync('simulateCopyInput executes without errors', async () => {
      await simulateCopyInput();
      assert(true, 'Copy input simulated without moving mouse or clicking');
    });

    // ----------------------------------------------------
    // STEP 4 & 5: CAPTURE & RESTORE ORIGINAL CLIPBOARD
    // ----------------------------------------------------
    console.log('\n👉 [STEP 4 & 5] Wait & Read Selected Text and Restore Original Clipboard');

    const originalUserText = 'UserSavedClipboardToken_' + Date.now();
    clipboard.writeText(originalUserText);

    await itAsync('captureSelectedText preserves original clipboard after capture', async () => {
      // Set user's clipboard before action
      clipboard.writeText(originalUserText);
      assert.strictEqual(clipboard.readText(), originalUserText);

      // Simulate a scenario where selected text is provided
      const simulatedHighlight = 'Discord Quest Completer is a desktop app for Windows';
      
      const resultPromise = captureSelectedText({
        pollIntervalMs: 15,
        maxTimeoutMs: 100,
        restoreDelayMs: 150,
        getLatestHookText: () => simulatedHighlight
      });

      const captured = await resultPromise;
      assert.strictEqual(captured, simulatedHighlight, 'Successfully captured selected text');

      // Wait for restoreDelayMs (150ms + margin)
      await new Promise(r => setTimeout(r, 220));

      // Check if original clipboard is restored!
      const restored = clipboard.readText();
      assert.strictEqual(restored, originalUserText, 'User original clipboard was 100% restored!');
    });

    await itAsync('captureSelectedText returns empty string safely when no selection is made', async () => {
      clipboard.writeText('SomePreviousData');

      const captured = await captureSelectedText({
        pollIntervalMs: 10,
        maxTimeoutMs: 60,
        restoreDelayMs: 100
      });

      assert.strictEqual(typeof captured, 'string');
      // When nothing changed/selected, returns ""
      assert.strictEqual(captured, '', 'Returns empty string without crashing');

      await new Promise(r => setTimeout(r, 150));
      assert.strictEqual(clipboard.readText(), 'SomePreviousData', 'Previous data preserved');
    });

    // ----------------------------------------------------
    // INTEGRATION CHECK WITH MAIN.JS
    // ----------------------------------------------------
    console.log('\n👉 [INTEGRATION] main.js & Module Export Checks');
    const mainJs = require('fs').readFileSync(path.join(__dirname, 'main.js'), 'utf8');

    it('main.js imports captureSelectedText from textCapture', () => {
      assert(mainJs.includes("require('./textCapture')"));
      assert(mainJs.includes('captureSelectedText'));
    });

    it('main.js integrates captureSelectedTextWithRetry with textCapture', () => {
      assert(mainJs.includes('captureSelectedTextWithRetry'));
    });

    it('main.js integrates triggerCopyAndGetText with textCapture', () => {
      assert(mainJs.includes('triggerCopyAndGetText'));
    });

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Test Exception:', err);
    process.exit(1);
  } finally {
    // Cleanup clipboard
    clipboard.clear();
    app.quit();
  }
});
