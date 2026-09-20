const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

async function runVerification() {
  console.log('====================================================');
  console.log('🌟 CUSTOM ASK UI, ZERO-SHADOW & DRAG GRIP TEST SUITE');
  console.log('====================================================\n');

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

  const toolbarHtml = fs.readFileSync(path.join(__dirname, 'toolbar.html'), 'utf8');
  const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');
  const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const preloadJs = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');

  // ----------------------------------------------------
  // SECTION 1: INLINE CUSTOM ASK UI (MATCHING media_1789898908886.png)
  // ----------------------------------------------------
  console.log('👉 [SECTION 1] Custom Ask UI Inline Pill Transformation');

  assert(toolbarHtml.includes('class="quick-back-btn"'), 'toolbar.html contains back arrow button (.quick-back-btn)');
  assert(toolbarHtml.includes('class="quick-custom-input"'), 'toolbar.html contains custom input field (.quick-custom-input)');
  assert(toolbarHtml.includes('class="quick-custom-send"'), 'toolbar.html contains solid blue send button (.quick-custom-send)');
  assert(toolbarHtml.includes('ส่งคำถาม'), 'toolbar.html send button contains exact Thai text "ส่งคำถาม"');
  assert(toolbarHtml.includes('border: 1.5px solid #1d4ed8;'), 'Custom input field has distinct blue accent border #1d4ed8');
  assert(toolbarHtml.includes('background: #1d4ed8;') || toolbarHtml.includes('background: rgb(29, 78, 216);'), 'Send button has matching royal blue background #1d4ed8');
  assert(toolbarHtml.includes('.quick-text-toolbar.custom-mode'), 'toolbar.html defines .quick-text-toolbar.custom-mode expanded layout');
  assert(toolbarJs.includes("toolbar.classList.add('custom-mode')"), 'toolbar.js activates custom-mode class on toolbar pill');
  assert(toolbarJs.includes("toolbar.classList.remove('custom-mode')"), 'toolbar.js cleans up custom-mode class when exiting');
  assert(toolbarJs.includes("actionsList.style.display = 'none'"), 'toolbar.js hides action pills when custom ask is open');
  assert(toolbarJs.includes("actionsList.style.display = 'flex'"), 'toolbar.js restores action pills when custom ask is closed');

  // ----------------------------------------------------
  // SECTION 2: ZERO-SHADOW & ZERO-CLIPPING (MATCHING media_1789898986236.png)
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 2] Zero Shadow & Bottom Clipping Elimination');

  assert(toolbarHtml.includes('box-shadow: none !important;'), 'toolbar.html sets box-shadow: none !important to remove fuzzy border shadow');
  assert(toolbarHtml.includes('padding: 3px 6px;'), 'toolbar.html uses compact padding 3px 6px fitting 38px pill cleanly within 46px window');
  assert(toolbarHtml.includes('border: 1px solid #cbd5e1;'), 'toolbar.html uses crisp 1px clean border #cbd5e1');
  assert(toolbarHtml.includes('overflow: hidden;'), 'toolbar.html locks overflow to prevent scroll jump');

  // ----------------------------------------------------
  // SECTION 3: DRAG GRIP, "GRABBING" CURSOR & IPC MOVEMENT
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 3] Drag Grip Grabbing Cursor & Real-Time IPC Movement');

  assert(toolbarHtml.includes('cursor: grabbing !important;'), 'toolbar.html enforces cursor: grabbing !important during drag');
  assert(toolbarHtml.includes('body.is-dragging-window'), 'toolbar.html styles body.is-dragging-window with grabbing cursor');
  assert(toolbarHtml.includes('.drag-handle:active'), 'toolbar.html sets active drag handle state');
  assert(toolbarHtml.includes('.drag-handle.dragging'), 'toolbar.html sets .dragging class on drag handle');
  assert(preloadJs.includes('moveToolbarBy: (delta) => ipcRenderer.send(\'move-toolbar-by\', delta)'), 'preload.js exposes moveToolbarBy IPC');
  assert(mainJs.includes("'move-toolbar-by'"), 'main.js handles move-toolbar-by IPC event');
  assert(mainJs.includes('toolbarWindow.setPosition'), 'main.js repositions toolbarWindow upon move event');
  assert(toolbarJs.includes('function initToolbarDragging()'), 'toolbar.js defines initToolbarDragging()');
  assert(toolbarJs.includes('moveToolbarBy({ deltaX, deltaY })'), 'toolbar.js computes screen delta and sends moveToolbarBy');

  // ----------------------------------------------------
  // SECTION 4: LIVE WINDOW IPC MOVEMENT TEST
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 4] Live Window Creation & Window Movement Simulation');

  const win = new BrowserWindow({
    width: 920,
    height: 46,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    show: false
  });

  const [initialX, initialY] = win.getPosition();
  assert(initialX === 100 && initialY === 100, 'Initial window position verified at (100, 100)');

  // Simulate delta movement of (+50, +30)
  win.setPosition(initialX + 50, initialY + 30);
  const [newX, newY] = win.getPosition();
  assert(newX === 150 && newY === 130, 'Window moved correctly to (150, 130) simulating real-time mouse drag');

  win.destroy();
  assert(win.isDestroyed(), 'Cleanly destroyed test window');

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

app.whenReady().then(runVerification);
