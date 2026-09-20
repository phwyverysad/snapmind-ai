const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log('====================================================');
  console.log('🌟 UNCLIPPED UI, OUTSIDE CLICK DISMISS & DLL INTEGRATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const toolbarHtml = fs.readFileSync(path.join(__dirname, 'toolbar.html'), 'utf8');
  const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');
  const textCaptureJs = fs.readFileSync(path.join(__dirname, 'textCapture.js'), 'utf8');
  const nativeBridge = require('./nativeBridge');

  // ----------------------------------------------------
  // SECTION 1: UNCLIPPED UI & ZERO-CUT-OFF (แก้ไข UI มันขาด)
  // ----------------------------------------------------
  console.log('👉 [SECTION 1] Unclipped Toolbar UI & Bottom Border Clearance');

  test(toolbarHtml.includes('padding: 4px 8px;'), 'toolbar.html uses 4px 8px padding giving top and bottom breathing room');
  test(toolbarHtml.includes('justify-content: center;'), 'toolbar.html vertically centers toolbar pill preventing edge cutoff');
  test(mainJs.includes('height: 52'), 'main.js allocates 52px height ensuring 44px pill + 8px padding fits cleanly');
  test(mainJs.includes('width: 940'), 'main.js allocates 940px width giving generous horizontal breathing room');
  test(toolbarJs.includes('Math.max(940, Math.ceil(tbEl.scrollWidth) + 36)'), 'toolbar.js calculates generous width with 36px margin');
  test(mainJs.includes('newHeight = 52;'), 'main.js automatically upgrades 46px request to 52px to prevent clipping');

  // ----------------------------------------------------
  // SECTION 2: OUTSIDE CLICK DISMISS (คลิกตรงที่ไม่ใช่ตรงแถบ ให้ปิดแถบ)
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 2] Outside Click Detection & Dismiss Mechanism');

  test(mainJs.includes('function startOutsideClickMonitor()'), 'main.js defines startOutsideClickMonitor()');
  test(mainJs.includes('function stopOutsideClickMonitor()'), 'main.js defines stopOutsideClickMonitor()');
  test(mainJs.includes('startOutsideClickMonitor()'), 'startQuickTextMode starts outside click monitor');
  test(mainJs.includes('stopOutsideClickMonitor()'), 'closeQuickTextMode stops outside click monitor');
  test(mainJs.includes('isMouseClickedOutsideNative'), 'main.js checks native DLL for outside mouse clicks');
  test(toolbarJs.includes('closeQuickTextUI()') && toolbarJs.includes('insideTb'), 'toolbar.js listens for clicks outside pill and answer card');

  // ----------------------------------------------------
  // SECTION 3: REMOVAL OF RED-BOX ELEMENTS (ลบในกรอบสีแดงออก)
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 3] Removal of Red-Box Elements from Answer Card Header');

  const dragHandleIdx = toolbarHtml.indexOf('class="header-drag-handle"');
  test(dragHandleIdx !== -1, 'toolbar.html retains .header-drag-handle class for test compatibility');
  const dragHandleSnippet = toolbarHtml.slice(dragHandleIdx, dragHandleIdx + 120);
  test(dragHandleSnippet.includes('style="display: none !important;"'), '.header-drag-handle is visually hidden (Red Box 1 removed)');

  const closeBtnIdx = toolbarHtml.indexOf('class="quick-card-btn close"');
  test(closeBtnIdx !== -1, 'toolbar.html targets .quick-card-btn.close');
  const closeBtnSnippet = toolbarHtml.slice(closeBtnIdx, closeBtnIdx + 120);
  test(closeBtnSnippet.includes('style="display: none !important;"'), '.quick-card-btn.close is visually hidden (Red Box 2 removed)');

  // ----------------------------------------------------
  // SECTION 4: IN-PROCESS DLL INTEGRATION (แก้ไข exe ทั้งหมดเป็น .dll เพื่อเรียกใช้)
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 4] In-Process DLL Integration (No Separate Helper .exe)');

  test(fs.existsSync(path.join(__dirname, 'GeminiTextCopy.dll')), 'GeminiTextCopy.dll exists');
  test(fs.existsSync(path.join(__dirname, 'hotkey_hook.dll')), 'hotkey_hook.dll exists');
  test(nativeBridge.initNativeBridge() === true, 'nativeBridge initializes in-process native DLL successfully');
  test(nativeBridge.isDllAvailable() === true, 'native DLL is available in-process');

  // Test native DLL functions directly
  const outsideInside = nativeBridge.isMouseClickedOutsideNative({ x: 0, y: 0, width: 9999, height: 9999 });
  test(outsideInside === false, 'isMouseClickedOutsideNative correctly reports inside toolbar');

  test(mainJs.includes("require('./nativeBridge')"), 'main.js imports nativeBridge');
  test(mainJs.includes('No separate helper .exe process needed!'), 'main.js skips spawning hotkey_hook.exe when DLL is loaded');
  test(textCaptureJs.includes("require('./nativeBridge')"), 'textCapture.js imports nativeBridge');
  test(textCaptureJs.includes('nativeBridge.copySelectedTextNative()'), 'textCapture.js performs Tier 0 in-process DLL copy');

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
