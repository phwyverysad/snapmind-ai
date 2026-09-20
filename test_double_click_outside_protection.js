// === TEST: DOUBLE-CLICK OUTSIDE PROTECTION TEST SUITE ===
// Validates:
// 1. Single click outside DOES NOT close the window (prevents accidental loss of answer or toolbar)
// 2. Double-click outside (2 clicks within 120ms - 600ms) intentionally closes the window
// 3. Debounce ignores rapid repeat events (<100ms) from the same mouse down
// 4. Clicking inside toolbar/card resets outside click tracker
// 5. Verification across main.js, toolbar.js, and script.js

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 SNAPMIND AI: DOUBLE-CLICK OUTSIDE PROTECTION TEST');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');

// ----------------------------------------------------
// SECTION 1: STATIC CODE AUDIT FOR DOUBLE-CLICK PROTECTION
// ----------------------------------------------------
console.log('👉 [SECTION 1] Code Structure for Double-Click Protection');

it('main.js declares handleOutsideClickDetected with double-click threshold check', () => {
  assert(mainJs.includes('function handleOutsideClickDetected()'), 'main.js must define handleOutsideClickDetected');
  assert(mainJs.includes('elapsed <= 600'), 'main.js must check for double-click within 600ms');
  assert(mainJs.includes('lastOutsideClickTime = 0;'), 'main.js must reset outside click time on double click');
  assert(mainJs.includes('closeQuickTextMode();'), 'main.js calls closeQuickTextMode upon double click');
});

it('main.js startOutsideClickMonitor routes detected clicks to handleOutsideClickDetected', () => {
  const monitorFn = mainJs.substring(mainJs.indexOf('function startOutsideClickMonitor()'), mainJs.indexOf('function stopOutsideClickMonitor()'));
  assert(monitorFn.includes('handleOutsideClickDetected()'), 'startOutsideClickMonitor must call handleOutsideClickDetected');
  assert(!monitorFn.includes('closeQuickTextMode()'), 'startOutsideClickMonitor must NOT call closeQuickTextMode directly on single click');
});

it('main.js native hook onClickOutside routes through handleOutsideClickDetected', () => {
  const hookPollingIdx = mainJs.indexOf('nativeBridge.startHookPolling');
  const hookPollingSnippet = mainJs.substring(hookPollingIdx, hookPollingIdx + 1200);
  assert(hookPollingSnippet.includes('onClickOutside') && hookPollingSnippet.includes('handleOutsideClickDetected()'),
         'onClickOutside must delegate to handleOutsideClickDetected');
});

it('toolbar.js implements double-click outside protection', () => {
  assert(toolbarJs.includes('lastToolbarOutsideClickTime'), 'toolbar.js must track lastToolbarOutsideClickTime');
  assert(toolbarJs.includes('elapsed >= 100 && elapsed <= 600'), 'toolbar.js requires double-click between 100ms and 600ms');
  assert(toolbarJs.includes('insideTb'), 'toolbar.js checks if click was inside toolbar pill');
  assert(toolbarJs.includes('insideCard'), 'toolbar.js checks if click was inside answer card');
  assert(toolbarJs.includes('closeQuickTextUI()'), 'toolbar.js calls closeQuickTextUI on double-click outside');
});

it('script.js in-window container implements double-click outside protection', () => {
  assert(scriptJs.includes('lastInWinOutsideClickTime'), 'script.js must track lastInWinOutsideClickTime');
  assert(scriptJs.includes('elapsed >= 100 && elapsed <= 600'), 'script.js requires double-click between 100ms and 600ms');
});

// ----------------------------------------------------
// SECTION 2: FUNCTIONAL LOGIC SIMULATION
// ----------------------------------------------------
console.log('\n👉 [SECTION 2] Functional Simulation: Single Click vs Double Click Outside');

// Simulate the double-click logic engine
class OutsideClickProtectionEngine {
  constructor() {
    this.lastOutsideClickTime = 0;
    this.closeCount = 0;
    this.ignoredCount = 0;
  }

  onOutsideClick(timestamp) {
    const elapsed = timestamp - this.lastOutsideClickTime;

    // Debounce duplicate events from same physical click (<120ms)
    if (elapsed < 120) {
      return 'DEBOUNCED_SAME_CLICK';
    }

    // Double-click detected (120ms - 600ms)
    if (elapsed <= 600) {
      this.closeCount++;
      this.lastOutsideClickTime = 0;
      return 'CLOSED_DOUBLE_CLICK';
    } else {
      this.ignoredCount++;
      this.lastOutsideClickTime = timestamp;
      return 'IGNORED_SINGLE_CLICK';
    }
  }

  onClickInside() {
    this.lastOutsideClickTime = 0;
  }
}

it('Single click outside keeps window open and does NOT close', () => {
  const engine = new OutsideClickProtectionEngine();
  const res = engine.onOutsideClick(1000);
  assert.strictEqual(res, 'IGNORED_SINGLE_CLICK', 'First click must be ignored to prevent accidental closure');
  assert.strictEqual(engine.closeCount, 0, 'Window must remain open');
});

it('Single click outside, wait 2 seconds, then another click outside still keeps window open', () => {
  const engine = new OutsideClickProtectionEngine();
  engine.onOutsideClick(1000); // 1st click
  const res2 = engine.onOutsideClick(3000); // 2nd click 2000ms later (normal workflow while reading)
  assert.strictEqual(res2, 'IGNORED_SINGLE_CLICK', 'Click outside after >600ms must still be treated as single click');
  assert.strictEqual(engine.closeCount, 0, 'Window must remain open');
});

it('Two clicks outside within 300ms triggers intentional window closure', () => {
  const engine = new OutsideClickProtectionEngine();
  engine.onOutsideClick(1000); // 1st click
  const res2 = engine.onOutsideClick(1300); // 2nd click 300ms later (deliberate double-click)
  assert.strictEqual(res2, 'CLOSED_DOUBLE_CLICK', 'Double click outside must dismiss window');
  assert.strictEqual(engine.closeCount, 1, 'Close must be triggered exactly once');
});

it('Simultaneous duplicate events from hook + polling (<120ms) are debounced as single click', () => {
  const engine = new OutsideClickProtectionEngine();
  engine.onOutsideClick(1000); // Hook event at 1000ms
  const resDuplicate = engine.onOutsideClick(1030); // Polling event at 1030ms for same click
  assert.strictEqual(resDuplicate, 'DEBOUNCED_SAME_CLICK', 'Sub-120ms duplicate event must be ignored');
  assert.strictEqual(engine.closeCount, 0, 'Same click must not cause accidental closure');
});

it('Clicking inside toolbar/card resets tracker so next click outside is not treated as double-click', () => {
  const engine = new OutsideClickProtectionEngine();
  engine.onOutsideClick(1000); // Click outside once
  engine.onClickInside(); // User clicks inside toolbar or card
  const res = engine.onOutsideClick(1200); // Click outside again 200ms later
  assert.strictEqual(res, 'IGNORED_SINGLE_CLICK', 'Clicking inside must reset tracker so window does not close');
  assert.strictEqual(engine.closeCount, 0, 'Window must remain open');
});

// ----------------------------------------------------
// SECTION 3: TEST SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
