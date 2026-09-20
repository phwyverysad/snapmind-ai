const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { app, clipboard } = require('electron');

console.log('================================================================');
console.log('🧪 TEST: COPY BEFORE SHOWING TOOLBAR (คัดลอกก่อนแสดงตัวเลือกคำถาม)');
console.log('================================================================\n');

app.whenReady().then(async () => {
  try {
    const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

    // 1. ตรวจสอบว่าใน handleQuickTextTrigger สั่งก๊อปปี้ก่อนเริ่ม startQuickTextMode
    console.log('👉 [CHECK 1] Code Order Invariant in main.js');
    const triggerFnIdx = mainJs.indexOf('async function handleQuickTextTrigger()');
    assert(triggerFnIdx !== -1, 'handleQuickTextTrigger function exists');

    const copyIdx = mainJs.indexOf('triggerCopyAndGetText()', triggerFnIdx);
    const startToolbarIdx = mainJs.indexOf('startQuickTextMode(cursorPos, capturedText);', triggerFnIdx);

    assert(copyIdx !== -1, 'triggerCopyAndGetText is called inside handleQuickTextTrigger');
    assert(startToolbarIdx !== -1, 'startQuickTextMode is called with capturedText');
    assert(copyIdx < startToolbarIdx, 'CRITICAL: triggerCopyAndGetText() is executed BEFORE startQuickTextMode()!');
    console.log('  ✅ PASS: Copy execution strictly precedes toolbar window creation and display.');

    // 2. ตรวจสอบว่าไม่มีการสั่งเปิดหน้าต่างด้วยค่าว่างล่วงหน้า (Zero Pre-Opening with empty string)
    assert(!mainJs.slice(triggerFnIdx, copyIdx).includes('startQuickTextMode'), 'main.js does NOT show toolbar before copy');
    console.log('  ✅ PASS: Toolbar is NOT pre-opened before copying.');

    // 3. จำลอง Live Flow: ตรวจสอบว่าได้ข้อความพร้อมส่งให้ Toolbar ใน Payload ทันที
    console.log('\n👉 [CHECK 2] Live Flow Verification');
    const {
      captureSelectedText,
      setActiveToolbarCapturedText,
      getActiveToolbarCapturedText
    } = require('./textCapture');

    const testText = 'Hello Gemini AI - Copied Before Showing Toolbar ' + Date.now();
    clipboard.writeText(testText);

    // จำลองการคัดลอกก่อนแสดงผล
    const captured = await captureSelectedText({
      deferRestore: true,
      getLatestHookText: () => testText
    });

    assert.strictEqual(captured, testText, 'Text captured successfully prior to display');
    setActiveToolbarCapturedText(captured);
    assert.strictEqual(getActiveToolbarCapturedText(), testText, 'Active text held in memory ready for toolbar payload');

    console.log('  ✅ PASS: Live copy successfully prepares captured text prior to toolbar opening.');

    console.log('\n================================================================');
    console.log('🎉 "คัดลอกก่อนแสดงตัวเลือกคำถาม" VERIFIED 100% SUCCEEDED!');
    console.log('================================================================\n');
    try { clipboard.clear(); } catch (e) {}
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err);
    process.exit(1);
  }
});
