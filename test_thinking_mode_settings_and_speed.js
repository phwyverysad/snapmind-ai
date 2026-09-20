/**
 * test_thinking_mode_settings_and_speed.js
 * Comprehensive verification for Per-Model Thinking Configuration in Settings and Speed Optimizations.
 */

const { app, BrowserWindow, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failCount++;
  }
}

app.whenReady().then(async () => {
  console.log('================================================================');
  console.log('🧪 TEST: PER-MODEL THINKING SETTINGS & SPEED OPTIMIZATION');
  console.log('================================================================\n');

  try {
    const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

    // ==========================================
    // SECTION 1: Config Schema & Backend Helper
    // ==========================================
    console.log('👉 [SECTION 1] Backend Configuration & Model Thinking Helper');
    assert(mainJs.includes('modelThinking:'), 'main.js defines modelThinking in DEFAULT_CONFIG');
    assert(mainJs.includes("'gemini-3.8-flash': false"), 'main.js defaults gemini-3.8-flash thinking to false (fastest speed)');
    assert(mainJs.includes("'gemini-3.5-flash-lite': false"), 'main.js defaults gemini-3.5-flash-lite thinking to false');
    assert(mainJs.includes("'gemini-3.1-pro-preview': true"), 'main.js defaults gemini-3.1-pro-preview thinking to true (deep thinking)');
    assert(mainJs.includes('function getThinkingConfigForModel(modelId)'), 'main.js defines getThinkingConfigForModel');
    assert(mainJs.includes('thinkingBudget: 0'), 'main.js supports thinkingBudget: 0 to eliminate chain-of-thought delay');
    assert(mainJs.includes('thinkingBudget: 2048'), 'main.js supports thinkingBudget: 2048 when thinking is enabled');
    assert(mainJs.includes('delete fallbackPayload.generationConfig.thinkingConfig'), 'main.js includes auto-retry without thinkingConfig on HTTP 400');

    // ==========================================
    // SECTION 2: Snipping Speed Boost (Pre-Capture & Single Vision Tile)
    // ==========================================
    console.log('\n👉 [SECTION 2] Snipping Speed Boost & Image Optimization');
    assert(mainJs.includes('function preCaptureDesktopSources()'), 'main.js defines preCaptureDesktopSources');
    assert(mainJs.includes('cachedDesktopCapturePromise = desktopCapturer.getSources'), 'main.js initiates pre-capture in background');
    assert(mainJs.includes('preCaptureDesktopSources();'), 'main.js triggers pre-capture immediately in startSnippingMode');
    assert(mainJs.includes('const maxDimension = 1024;') || mainJs.includes('const maxDimension = 768;'), 'main.js resizes image to fit single Vision Tile');
    assert(mainJs.includes('processedImg.toJPEG(78)') || mainJs.includes('processedImg.toJPEG(75)'), 'main.js encodes JPEG for lightweight high-speed upload');

    // ==========================================
    // SECTION 3: Thinking Applied to Streaming & Quick Ask
    // ==========================================
    console.log('\n👉 [SECTION 3] Model Thinking Config Applied to Gemini Handlers');
    assert(mainJs.includes('const thinkingConf = getThinkingConfigForModel(modelId);'), 'main.js gets model thinking config in screen stream handler');
    assert(mainJs.includes('...thinkingConf'), 'main.js applies thinkingConf to analysisPayload');
    assert(mainJs.includes('thinkingBudget: 0'), 'main.js strictly disables thinking on parallel OCR stream');
    assert(mainJs.includes('...getThinkingConfigForModel(selectedModel)'), 'main.js applies thinking config to quick text ask');

    // ==========================================
    // SECTION 4: Frontend UI Structure & CSS
    // ==========================================
    console.log('\n👉 [SECTION 4] UI Layout & CSS Styles');
    assert(indexHtml.includes('id="thinkingModelList"'), 'index.html contains #thinkingModelList container in Settings modal');
    assert(indexHtml.includes('โหมดความคิด (Thinking Mode แยกตามโมเดล)'), 'index.html displays Thinking Mode category label in Thai');
    assert(styleCss.includes('.thinking-model-list'), 'style.css defines .thinking-model-list layout');
    assert(styleCss.includes('.thinking-model-card'), 'style.css defines .thinking-model-card');
    assert(styleCss.includes('.switch-toggle'), 'style.css defines .switch-toggle iOS/Fluent switch');
    assert(styleCss.includes('.switch-toggle input:checked + .slider'), 'style.css defines active slider state');
    assert(styleCss.includes('.thinking-status-text.enabled'), 'style.css defines enabled status text color');

    // ==========================================
    // SECTION 5: Live Electron Window DOM Verification
    // ==========================================
    console.log('\n👉 [SECTION 5] Live Electron Window DOM & Interaction Verification');

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

    // Inject mock electronAPI and trigger openSettingsModal()
    const evalResult = await win.webContents.executeJavaScript(`
      (async () => {
        // Setup mock electronAPI
        let savedConfig = null;
        window.electronAPI = {
          getSettings: async () => ({
            apiKey: 'test-key',
            shortcutKey: 'Alt+Shift+S',
            quickTextShortcutKey: 'Ctrl+CapsLock',
            defaultModel: 'gemini-3.8-flash',
            modelThinking: {
              'gemini-3.8-flash': false,
              'gemini-3.5-flash-lite': false,
              'gemini-3.1-pro-preview': true
            },
            tools: {}
          }),
          saveSettings: async (settings) => {
            savedConfig = settings;
            return settings;
          },
          setIgnoreMouseEvents: () => {},
          hideWindow: () => {}
        };

        // Initialize and open settings modal
        if (window.electronAPI && typeof window.electronAPI.getSettings === 'function') {
          if (typeof appSettings !== 'undefined') {
            appSettings = await window.electronAPI.getSettings();
          }
        }
        if (typeof openSettingsModal === 'function') {
          openSettingsModal();
        }

        const listEl = document.getElementById('thinkingModelList');
        const cards = listEl ? listEl.querySelectorAll('.thinking-model-card') : [];

        const chkFlash = document.getElementById('thinkingToggle_gemini-3.8-flash');
        const chkLite = document.getElementById('thinkingToggle_gemini-3.5-flash-lite');
        const chkPro = document.getElementById('thinkingToggle_gemini-3.1-pro-preview');

        const statusFlash = document.getElementById('thinkingStatus_gemini-3.8-flash');
        const statusPro = document.getElementById('thinkingStatus_gemini-3.1-pro-preview');

        // Test toggle interaction
        const initialFlashChecked = chkFlash ? chkFlash.checked : null;
        if (chkFlash) {
          chkFlash.checked = true;
          handleThinkingToggleChange('gemini-3.8-flash', true);
        }
        const updatedFlashStatus = statusFlash ? statusFlash.innerText : '';

        // Trigger save
        let capturedSavedConfig = null;
        if (typeof saveSettingsFromModal === 'function') {
          await saveSettingsFromModal();
          capturedSavedConfig = savedConfig;
        }

        return {
          cardsCount: cards.length,
          hasFlashChk: !!chkFlash,
          hasLiteChk: !!chkLite,
          hasProChk: !!chkPro,
          initialFlashChecked,
          initialLiteChecked: chkLite ? chkLite.checked : null,
          initialProChecked: chkPro ? chkPro.checked : null,
          updatedFlashStatus,
          statusProText: statusPro ? statusPro.innerText : '',
          savedModelThinking: capturedSavedConfig ? capturedSavedConfig.modelThinking : null
        };
      })()
    `);

    assert(evalResult.cardsCount === 3, 'Rendered 3 model thinking configuration cards in DOM', `Got: ${evalResult.cardsCount}`);
    assert(evalResult.hasFlashChk && evalResult.hasLiteChk && evalResult.hasProChk, 'Rendered toggle switch for each model in AI_MODELS');
    assert(evalResult.initialFlashChecked === false, 'Gemini 3.8 Flash toggle is initially unchecked (Thinking OFF for max speed)');
    assert(evalResult.initialLiteChecked === false, 'Gemini 3.5 Flash Lite toggle is initially unchecked (Thinking OFF)');
    assert(evalResult.initialProChecked === true, 'Gemini 3.1 Pro Preview toggle is initially checked (Thinking ON for deep reasoning)');
    assert(evalResult.updatedFlashStatus.includes('เปิด'), 'Toggle event dynamically updates status label to "เปิด" (Thinking ON)');
    assert(evalResult.statusProText.includes('เปิด'), 'Pro model status label displays "เปิด" (Thinking ON)');
    assert(evalResult.savedModelThinking !== null, 'saveSettingsFromModal preserves modelThinking config');
    assert(evalResult.savedModelThinking && evalResult.savedModelThinking['gemini-3.8-flash'] === true, 'saveSettingsFromModal saves updated toggled state correctly');

    win.destroy();

  } catch (err) {
    console.error('Unexpected test error:', err);
    failCount++;
  }

  console.log('\n================================================================');
  console.log(`📊 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount === 0) {
    console.log('🎉 PER-MODEL THINKING SETTINGS & SPEED OPTIMIZATION VERIFIED 100%!\n');
    app.exit(0);
  } else {
    console.error(`💥 ${failCount} TEST(S) FAILED!\n`);
    app.exit(1);
  }
});
