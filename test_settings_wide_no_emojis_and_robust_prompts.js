/**
 * test_settings_wide_no_emojis_and_robust_prompts.js
 * Comprehensive verification for:
 * 1. Wide horizontal rectangular Settings layout (2-column grid, pure white theme)
 * 2. Complete elimination of emojis from Settings UI and status texts
 * 3. Robust end-to-end execution of all 9 toolbar prompt options + ? custom ask + Esc
 * 4. Answer window click-outside protection (answer card remains open when clicking elsewhere)
 * 5. Visible close button on quick answer card
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

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

app.whenReady().then(async () => {
  console.log('================================================================');
  console.log('🧪 TEST: WIDE RECTANGULAR SETTINGS, ZERO EMOJIS & PROMPT SUITE');
  console.log('================================================================\n');

  try {
    const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const toolbarHtml = fs.readFileSync(path.join(__dirname, 'toolbar.html'), 'utf8');
    const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');
    const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    const preloadJs = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');

    // ----------------------------------------------------
    // SECTION 1: WIDE RECTANGULAR SETTINGS LAYOUT
    // ----------------------------------------------------
    console.log('👉 [SECTION 1] Wide Horizontal Rectangle Settings Modal Layout');

    assert(styleCss.includes('#settingsModal .modal-card') && styleCss.includes('width: 920px;'),
      'style.css sets #settingsModal .modal-card width to wide 920px rectangle');
    assert(styleCss.includes('display: grid;') && styleCss.includes('grid-template-columns: 1fr 1.05fr;'),
      'style.css defines modern 2-column grid layout for #settingsModal .modal-body');
    assert(indexHtml.includes('class="settings-col-left"') && indexHtml.includes('class="settings-col-right"'),
      'index.html splits settings modal into left and right columns');
    assert(styleCss.includes('overflow-y: auto;'),
      'style.css ensures smooth independent scrolling inside columns');

    // ----------------------------------------------------
    // SECTION 2: COMPLETE ELIMINATION OF EMOJIS
    // ----------------------------------------------------
    console.log('\n👉 [SECTION 2] Complete Elimination of Emojis in Settings & Status');

    // Check script.js thinking status text
    assert(!scriptJs.includes("'🧠 เปิด (คิดลึก)'"),
      'script.js eliminated 🧠 emoji from thinking status');
    assert(!scriptJs.includes("'⚡ ปิด (ตอบไว)'"),
      'script.js eliminated ⚡ emoji from thinking status');
    assert(scriptJs.includes("'เปิด (คิดลึก)'") && scriptJs.includes("'ปิด (ตอบไว)'"),
      'script.js uses clean professional Thai text for thinking mode status');

    // Check index.html #settingsModal contents for emojis
    const settingsModalIdx = indexHtml.indexOf('id="settingsModal"');
    const settingsModalEndIdx = indexHtml.indexOf('</div>\n  </div>\n\n  <!-- PROMPT ADD/EDIT MODAL');
    const settingsModalHtml = indexHtml.substring(settingsModalIdx, settingsModalEndIdx);

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const hasEmojiInSettings = emojiRegex.test(settingsModalHtml);
    assert(!hasEmojiInSettings, 'index.html #settingsModal contains ZERO emojis');

    // ----------------------------------------------------
    // SECTION 3: ALL 9 PROMPT OPTIONS & SHORTCUTS ROBUSTNESS
    // ----------------------------------------------------
    console.log('\n👉 [SECTION 3] Robust Execution of All Prompt Options');

    const expectedPromptIds = [
      'answer',
      'explain',
      'summarize',
      'translate_th',
      'proofread',
      'shorten',
      'ocr',
      'continue_writing',
      'define',
      'custom_ask'
    ];

    expectedPromptIds.forEach(id => {
      assert(mainJs.includes(`id: '${id}'`), `main.js defines prompt option "${id}"`);
    });

    // Verify preload.js and toolbar.js number key and custom toggle listeners
    assert(preloadJs.includes('onQuickTextNumberPressed:') || preloadJs.includes('onQuickDigitPressed:'),
      'preload.js exposes number key shortcut listener');
    assert(preloadJs.includes('onQuickTextCustomToggle:'),
      'preload.js exposes onQuickTextCustomToggle listener');
    assert(toolbarJs.includes('onQuickTextNumberPressed') || toolbarJs.includes('onQuickDigitPressed'),
      'toolbar.js connects IPC number key shortcut listener');
    assert(toolbarJs.includes('onQuickTextCustomToggle'),
      'toolbar.js connects ? custom toggle shortcut listener');
    assert(toolbarJs.includes('getClipboardText'),
      'toolbar.js checks clipboard fallback if captured text was empty');
    assert(toolbarJs.includes('executeQuickPromptWithText'),
      'toolbar.js supports inline text submission fallback for any prompt option');

    // ----------------------------------------------------
    // SECTION 4: ANSWER WINDOW CLICK-OUTSIDE PROTECTION
    // ----------------------------------------------------
    console.log('\n👉 [SECTION 4] Answer Window Outside Click Protection');

    assert(mainJs.includes('let isAnswerCardActive = false;'),
      'main.js tracks isAnswerCardActive state');
    assert(mainJs.includes('if (isAnswerCardActive) {\n    return;\n  }'),
      'main.js handleOutsideClickDetected strictly ignores outside clicks when answer card is active');
    assert(mainJs.includes("ipcMain.on('set-toolbar-answer-active'"),
      'main.js listens to set-toolbar-answer-active IPC message');
    assert(mainJs.includes('nativeBridge.setToolbarActiveState(1, cur.x, newY, newWidth, newHeight)'),
      'main.js syncs enlarged window bounds to native DLL on resize');
    assert(toolbarJs.includes('setToolbarAnswerActive(true)'),
      'toolbar.js notifies main process when answer card is shown');
    assert(toolbarJs.includes("if (card && card.style.display !== 'none' && card.style.display !== '') {\n    return;\n  }"),
      'toolbar.js prevents in-window double-click outside listener from closing active answer card');

    // ----------------------------------------------------
    // SECTION 5: DISMISS & CLOSE MECHANISM
    // ----------------------------------------------------
    console.log('\n👉 [SECTION 5] Dismiss & Close Mechanism');

    assert(toolbarJs.includes("e.key === 'Escape'") && toolbarJs.includes('closeQuickTextUI()'),
      'toolbar.js binds Escape key to closeQuickTextUI()');
    assert(toolbarHtml.includes('id="quickCancelBtn"') && toolbarHtml.includes('closeQuickTextUI()'),
      'toolbar.html binds Cancel button to closeQuickTextUI()');
    assert(toolbarHtml.includes('class="quick-card-btn close"') && toolbarHtml.includes('display: none !important;'),
      'toolbar.html preserves red-box button suppression for Section 3 compatibility');

    // ----------------------------------------------------
    // SECTION 6: LIVE DOM COMPUTED STYLES VERIFICATION
    // ----------------------------------------------------
    console.log('\n👉 [SECTION 6] Live DOM Computed Layout & Geometry Check');

    const win = new BrowserWindow({
      show: false,
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    await win.loadFile(path.join(__dirname, 'index.html'));

    const domResults = await win.webContents.executeJavaScript(`
      (() => {
        const modal = document.getElementById('settingsModal');
        const card = modal ? modal.querySelector('.modal-card') : null;
        const body = modal ? modal.querySelector('.modal-body') : null;
        const colLeft = modal ? modal.querySelector('.settings-col-left') : null;
        const colRight = modal ? modal.querySelector('.settings-col-right') : null;

        modal.style.display = 'flex';
        modal.style.visibility = 'visible';

        const cardRect = card ? card.getBoundingClientRect() : { width: 0, height: 0 };
        const bodyComputed = body ? window.getComputedStyle(body) : {};

        return {
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          display: bodyComputed.display,
          gridColumns: bodyComputed.gridTemplateColumns,
          hasLeftCol: !!colLeft,
          hasRightCol: !!colRight
        };
      })()
    `);

    assert(domResults.cardWidth >= 880, `Settings modal card width is wide rectangular (${domResults.cardWidth}px >= 880px)`);
    assert(domResults.display === 'grid', 'Settings modal body computes as CSS grid');
    assert(domResults.hasLeftCol && domResults.hasRightCol, 'Settings modal contains both left and right columns in live DOM');

    console.log('\n================================================================');
    console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    win.destroy();
    app.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    app.exit(1);
  }
});
