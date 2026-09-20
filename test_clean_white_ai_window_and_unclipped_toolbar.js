/**
 * test_clean_white_ai_window_and_unclipped_toolbar.js
 * Comprehensive verification for:
 * 1. Unclipped Floating Toolbar (fixes "ui มันขาดไป" from media_1789904569300.png)
 * 2. Clean White AI Response Window (fixes "หน้าคำตอบ ai ให้คลีนกว่านี้ ไม่ต้องใช้สีฟ้าอ่อน ให้ใช้เป็นสีขาวคลีนสวยงามเลย" from media_1789904737558.png)
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

app.whenReady().then(async () => {
  console.log('================================================================');
  console.log('🧪 TEST: CLEAN WHITE AI WINDOW & UNCLIPPED TOOLBAR SUITE');
  console.log('================================================================\n');

  try {
    const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const toolbarHtml = fs.readFileSync(path.join(__dirname, 'toolbar.html'), 'utf8');
    const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');
    const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    // ====================================================
    // SECTION 1: UNCLIPPED FLOATING TOOLBAR (FIXES media_1789904569300.png)
    // ====================================================
    console.log('👉 [SECTION 1] Unclipped Floating Toolbar Structure & Clearance');

    assert(toolbarHtml.includes('justify-content: center;'), 'toolbar.html centers toolbar pill vertically');
    assert(toolbarHtml.includes('align-items: center;'), 'toolbar.html aligns toolbar container items to center');
    assert(toolbarHtml.includes('margin: 0 auto;'), 'toolbar.html centers pill horizontally with margin 0 auto');
    assert(toolbarHtml.includes('flex-shrink: 0;'), 'toolbar.html prevents toolbar pill from shrinking');
    assert(mainJs.includes('height: 58'), 'main.js allocates generous 58px height to toolbarWindow');
    assert(mainJs.includes('width: 1060'), 'main.js allocates generous 1060px width for wide prompt buttons');
    assert(mainJs.includes('const tbHeight = 58;'), 'main.js sets tbHeight = 58 for prompt mode');
    assert(mainJs.includes('newHeight = 58;'), 'main.js upgrades toolbar height to 58px on resize');
    assert(toolbarJs.includes('Math.max(1060, Math.ceil(tbEl.scrollWidth) + 36)'), 'toolbar.js dynamically reserves at least 1060px width');

    // ====================================================
    // SECTION 2: CLEAN WHITE AI RESPONSE WINDOW (FIXES media_1789904737558.png)
    // ====================================================
    console.log('\n👉 [SECTION 2] Clean Pure White Theme for AI Response Window');

    assert(styleCss.includes('.ai-response-window') && styleCss.includes('background: #ffffff;'), '.ai-response-window uses clean white background');
    
    // Header & Toolbars
    const toolbarRule = styleCss.match(/\.ai-toolbar\s*\{([^}]*)\}/);
    assert(toolbarRule && toolbarRule[1].includes('background: #ffffff;'), '.ai-toolbar header uses clean white background (no #f8fafc)');
    
    // Metrics banner
    const metricsRule = styleCss.match(/\.metrics-banner\s*\{([^}]*)\}/);
    assert(metricsRule && metricsRule[1].includes('background: #ffffff;'), '.metrics-banner uses clean white background (no light blue/slate)');

    // Category Tabs (No light blue background)
    const catTabsRule = styleCss.match(/\.category-tabs\s*\{([^}]*)\}/);
    assert(catTabsRule && catTabsRule[1].includes('background: #ffffff;'), '.category-tabs uses pure white background (eliminated #f1f5f9 light blue)');

    // Tab buttons
    const tabActiveRule = styleCss.match(/\.tab-btn\.active\s*\{([^}]*)\}/);
    assert(tabActiveRule && tabActiveRule[1].includes('background: #ffffff;'), '.tab-btn.active sits cleanly on pure white background');

    // Model dropdown trigger (no blue text)
    const modelDropdownRule = styleCss.match(/\.model-dropdown-trigger\s*\{([^}]*)\}/);
    assert(modelDropdownRule && modelDropdownRule[1].includes('background: #ffffff;'), '.model-dropdown-trigger uses pure white background');
    assert(styleCss.includes('#triggerModelName') && styleCss.includes('color: #0f172a;'), '#triggerModelName uses high-contrast dark text');

    // AI Chat Bubble (No light blue background, no shadow)
    const aiBubbleRule = styleCss.match(/\.chat-bubble\.ai\s*\{([^}]*)\}/);
    assert(aiBubbleRule && aiBubbleRule[1].includes('background: #ffffff;'), '.chat-bubble.ai uses clean pure white background (no #f8fafc)');
    assert(aiBubbleRule && aiBubbleRule[1].includes('box-shadow: none !important;'), '.chat-bubble.ai removes distracting fuzzy border shadow');

    // Bubble Copy Button
    const copyBtnRule = styleCss.match(/\.bubble-copy-btn\s*\{([^}]*)\}/);
    assert(copyBtnRule && copyBtnRule[1].includes('background: #ffffff;'), '.bubble-copy-btn uses clean white background');

    // Chat Input Bar
    const chatInputBarRule = styleCss.match(/\.chat-input-bar\s*\{([^}]*)\}/);
    assert(chatInputBarRule && chatInputBarRule[1].includes('background: #ffffff;'), '.chat-input-bar uses clean pure white background (no #f8fafc)');

    // ====================================================
    // SECTION 3: LIVE ELECTRON WINDOW VERIFICATION (TOOLBAR & AI WINDOW)
    // ====================================================
    console.log('\n👉 [SECTION 3] Live Electron Window Verification');

    // 1. Live Toolbar Rendering & Bottom Border Clearance Check
    const toolbarWin = new BrowserWindow({
      width: 1060,
      height: 58,
      frame: false,
      transparent: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    await toolbarWin.loadFile(path.join(__dirname, 'toolbar.html'));

    const tbMetrics = await toolbarWin.webContents.executeJavaScript(`
      (async () => {
        // Populate exactly the 9 prompts visible in media_1789904569300.png
        const prompts = [
          { id: '1', name: 'คำตอบ', enabled: true },
          { id: '2', name: 'อธิบาย', enabled: true },
          { id: '3', name: 'สรุป', enabled: true },
          { id: '4', name: 'แปลภาษา', enabled: true },
          { id: '5', name: 'ปรับปรุงการเขียน', enabled: true },
          { id: '6', name: 'ทำให้สั้นลง', enabled: true },
          { id: '7', name: 'OCR', enabled: true },
          { id: '8', name: 'เขียนต่อ', enabled: true },
          { id: '9', name: 'คือ', enabled: true }
        ];
        handleOpenToolbar({ text: 'sample text', prompts });

        // Wait for entrance micro-animation (180ms) to complete
        await new Promise(r => setTimeout(r, 200));

        const tb = document.getElementById('quickTextToolbar');
        const tbRect = tb.getBoundingClientRect();
        const winH = window.innerHeight;
        const winW = window.innerWidth;

        const topMargin = tbRect.top;
        const bottomMargin = winH - tbRect.bottom;
        const rightMargin = winW - tbRect.right;
        const leftMargin = tbRect.left;

        return {
          winW,
          winH,
          tbHeight: Math.round(tbRect.height),
          tbWidth: tbRect.width,
          topMargin,
          bottomMargin,
          leftMargin,
          rightMargin,
          hasBottomClearance: bottomMargin >= 4,
          hasTopClearance: topMargin >= 4,
          isUnclipped: tbRect.bottom <= winH && tbRect.top >= 0
        };
      })()
    `);

    assert(tbMetrics.isUnclipped, 'Toolbar pill renders completely within window boundaries without clipping');
    assert(tbMetrics.hasBottomClearance, `Bottom border has generous breathing room clearance (Bottom clearance: ${tbMetrics.bottomMargin.toFixed(1)}px >= 4px)`);
    assert(tbMetrics.hasTopClearance, `Top border has generous breathing room clearance (Top clearance: ${tbMetrics.topMargin.toFixed(1)}px >= 4px)`);
    assert(tbMetrics.tbHeight === 44, `Toolbar pill maintains optimal 44px height (Got: ${tbMetrics.tbHeight}px)`);

    // 2. Live AI Response Window Computed Styles Check (Reuse window)
    await toolbarWin.setSize(800, 600);
    await toolbarWin.loadFile(path.join(__dirname, 'index.html'));

    const aiStyles = await toolbarWin.webContents.executeJavaScript(`
      (() => {
        const aiToolbar = document.getElementById('aiToolbar');
        const metricsBanner = document.getElementById('metricsBanner');
        const catTabs = document.querySelector('.category-tabs');
        const modelTrigger = document.getElementById('modelDropdownTrigger');
        const chatInputBar = document.querySelector('.chat-input-bar');

        const getBg = (el) => el ? window.getComputedStyle(el).backgroundColor : '';

        return {
          aiToolbarBg: getBg(aiToolbar),
          metricsBannerBg: getBg(metricsBanner),
          catTabsBg: getBg(catTabs),
          modelTriggerBg: getBg(modelTrigger),
          chatInputBarBg: getBg(chatInputBar)
        };
      })()
    `);

    assert(aiStyles.aiToolbarBg === 'rgb(255, 255, 255)', `Live DOM: #aiToolbar is pure clean white (Got: ${aiStyles.aiToolbarBg})`);
    assert(aiStyles.metricsBannerBg === 'rgb(255, 255, 255)', `Live DOM: #metricsBanner is pure clean white (Got: ${aiStyles.metricsBannerBg})`);
    assert(aiStyles.catTabsBg === 'rgb(255, 255, 255)', `Live DOM: .category-tabs is pure clean white (Got: ${aiStyles.catTabsBg})`);
    assert(aiStyles.modelTriggerBg === 'rgb(255, 255, 255)', `Live DOM: #modelDropdownTrigger is pure clean white (Got: ${aiStyles.modelTriggerBg})`);
    assert(aiStyles.chatInputBarBg === 'rgb(255, 255, 255)', `Live DOM: .chat-input-bar is pure clean white (Got: ${aiStyles.chatInputBarBg})`);

    toolbarWin.destroy();

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed === 0) {
    console.log('🎉 UNCLIPPED TOOLBAR & CLEAN WHITE AI WINDOW VERIFIED 100%!\n');
    app.exit(0);
  } else {
    console.error(`💥 ${failed} TEST(S) FAILED!\n`);
    app.exit(1);
  }
});
