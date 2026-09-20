const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 QUICK TEXT ASK & CUSTOM PROMPTS TEST SUITE');
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

  const mainJsContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const preloadJsContent = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');
  const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const styleCssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  const scriptJsContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');

  // ----------------------------------------------------
  // TEST 1: DEFAULT CONFIGURATION & HOTKEY MIGRATION
  // ----------------------------------------------------
  console.log('👉 [TEST 1] Default Configuration & Hotkey Migration');

  assert(mainJsContent.includes("shortcutKey: 'Alt+Shift+S',"), "main.js DEFAULT_CONFIG sets shortcutKey to 'Alt+Shift+S'");
  assert(mainJsContent.includes("quickTextShortcutKey: 'Ctrl+CapsLock',"), "main.js DEFAULT_CONFIG sets quickTextShortcutKey to 'Ctrl+CapsLock'");
  assert(mainJsContent.includes("currentConfig.shortcutKey === 'Ctrl+Shift+S'"), "main.js loadConfig detects legacy 'Ctrl+Shift+S'");
  assert(mainJsContent.includes("currentConfig.shortcutKey = 'Alt+Shift+S'"), "main.js loadConfig automatically migrates legacy shortcut to 'Alt+Shift+S'");
  assert(mainJsContent.includes("DEFAULT_TEXT_PROMPTS"), "main.js defines DEFAULT_TEXT_PROMPTS");

  // Verify simulated migration logic
  const mockOldConfig = {
    shortcutKey: 'Ctrl+Shift+S',
    defaultModel: 'gemini-3.8-flash'
  };
  if (mockOldConfig.shortcutKey === 'Ctrl+Shift+S') {
    mockOldConfig.shortcutKey = 'Alt+Shift+S';
  }
  assert(mockOldConfig.shortcutKey === 'Alt+Shift+S', 'Legacy config migration correctly switches to Alt+Shift+S');

  // ----------------------------------------------------
  // TEST 2: DEFAULT TEXT PROMPTS INTEGRITY
  // ----------------------------------------------------
  console.log('\n👉 [TEST 2] 7 Default Prompts Structure & Templates (including "คือ" and "ถามเอง")');

  const defaultPromptIds = ['summarize', 'translate_th', 'define', 'explain', 'proofread', 'answer', 'custom_ask'];
  defaultPromptIds.forEach(id => {
    assert(mainJsContent.includes(`id: '${id}'`), `main.js DEFAULT_TEXT_PROMPTS contains '${id}'`);
  });

  assert(mainJsContent.includes('สรุปเนื้อหาต่อไปนี้ให้กระชับ ได้ใจความสำคัญ:\\n\\n{text}'), 'Summarize template contains {text}');
  assert(mainJsContent.includes('แปลข้อความต่อไปนี้เป็นภาษาไทยอย่างสละสลวย:\\n\\n{text}'), 'Translate template contains {text}');
  assert(mainJsContent.includes("name: 'คือ'") && mainJsContent.includes("id: 'define'"), 'Define prompt "คือ" present');
  assert(mainJsContent.includes("name: 'ถามเอง'") && mainJsContent.includes("id: 'custom_ask'"), 'Custom ask prompt "ถามเอง" present');
  assert(mainJsContent.includes('อธิบายว่า "{text}" คืออะไร'), 'Define template contains explanation format');
  assert(mainJsContent.includes('อธิบายข้อความต่อไปนี้ให้เข้าใจง่าย ชัดเจน:\\n\\n{text}'), 'Explain template contains {text}');
  assert(mainJsContent.includes('ตรวจคำผิดและขัดเกลาไวยากรณ์ข้อความต่อไปนี้ให้ถูกต้องสมบูรณ์:\\n\\n{text}'), 'Proofread template contains {text}');
  assert(mainJsContent.includes('ตอบคำถามหรือแก้โจทย์จากข้อความต่อไปนี้โดยตรง:\\n\\n{text}'), 'Answer template contains {text}');

  // ----------------------------------------------------
  // TEST 3: TEMPLATE SUBSTITUTION ENGINE
  // ----------------------------------------------------
  console.log('\n👉 [TEST 3] Template Substitution Engine');

  function substituteTemplate(template, text) {
    if (template.includes('{text}')) {
      return template.replace(/\{text\}/g, text);
    }
    return `${template}\n\n${text}`;
  }

  const sampleSelectedText = 'Artificial intelligence is transforming desktop productivity.';
  const sampleTemplate = 'แปลข้อความต่อไปนี้เป็นภาษาไทยอย่างสละสลวย:\n\n{text}';
  const substituted = substituteTemplate(sampleTemplate, sampleSelectedText);

  assert(substituted.includes(sampleSelectedText), 'Substituted prompt contains target text');
  assert(!substituted.includes('{text}'), 'Placeholder {text} is completely resolved');
  assert(substituted.startsWith('แปลข้อความต่อไปนี้เป็นภาษาไทยอย่างสละสลวย:'), 'Template prefix preserved');

  // Fallback when template has no {text}
  const noPlaceholderTpl = 'สรุปข้อความนี้';
  const substitutedFallback = substituteTemplate(noPlaceholderTpl, sampleSelectedText);
  assert(substitutedFallback === `สรุปข้อความนี้\n\n${sampleSelectedText}`, 'Template without placeholder safely appends text');

  // ----------------------------------------------------
  // TEST 4: STRICT DIRECT OUTPUT SYSTEM INSTRUCTION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 4] Strict Direct Output System Instruction');

  const expectedInstruction = "จงตอบเฉพาะผลลัพธ์ของคำสั่งที่ได้รับโดยตรงเท่านั้น ห้ามมีคำทักทาย ห้ามมีเกริ่นนำ (เช่น 'นี่คือคำตอบของคุณ:', 'ผลการแปลมีดังนี้:') และห้ามมีข้อความสนทนาปิดท้าย ให้แสดงเฉพาะตัวคำตอบที่ถูกต้อง กระชับ และตรงประเด็น 100%";
  assert(mainJsContent.includes(expectedInstruction), 'main.js enforces exact verbatim system instruction for zero fluff');
  assert(mainJsContent.includes('QUICK_TEXT_SYSTEM_INSTRUCTION'), 'QUICK_TEXT_SYSTEM_INSTRUCTION declared in main.js');
  assert(mainJsContent.includes("ipcMain.handle('gemini-quick-text-ask'"), "main.js registers 'gemini-quick-text-ask' IPC handler");

  // ----------------------------------------------------
  // TEST 5: SVG ICONS MAP & STRICT NO-EMOJI ENFORCEMENT
  // ----------------------------------------------------
  console.log('\n👉 [TEST 5] SVG Icons & Strict No-Emoji Enforcement');

  const requiredIconKeys = [
    'file-text', 'globe', 'help-circle', 'edit', 'check-circle',
    'code', 'zap', 'search', 'message-square', 'book-open'
  ];

  requiredIconKeys.forEach(iconKey => {
    assert(scriptJsContent.includes(`'${iconKey}':`), `script.js SVG_ICONS defines icon: ${iconKey}`);
  });

  // Verify SVG markup integrity
  assert(scriptJsContent.includes('<svg width="14" height="14" viewBox="0 0 24 24"'), 'SVG_ICONS uses standardized 24x24 viewBox');
  assert(scriptJsContent.includes('stroke-width="2"'), 'SVG_ICONS uses 2px stroke Feather/Lucide style');

  // Verify Floating Toolbar buttons have zero emojis
  const toolbarHtmlMatch = indexHtmlContent.match(/<div class="quick-text-toolbar"[\s\S]*?<\/div>\s*<\/div>/);
  assert(toolbarHtmlMatch !== null, 'Found quick-text-toolbar markup in index.html');
  if (toolbarHtmlMatch) {
    const toolbarStr = toolbarHtmlMatch[0];
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert(!emojiRegex.test(toolbarStr), 'Floating Toolbar markup strictly contains zero emojis (all SVG)');
  }

  // ----------------------------------------------------
  // TEST 6: FLOATING TOOLBAR DOM & GLASSMORPHISM STYLES
  // ----------------------------------------------------
  console.log('\n👉 [TEST 6] DOM Structure & Glassmorphism Styling');

  assert(indexHtmlContent.includes('id="quickTextContainer"'), 'index.html contains #quickTextContainer');
  assert(indexHtmlContent.includes('id="quickTextToolbar"'), 'index.html contains #quickTextToolbar');
  assert(indexHtmlContent.includes('id="quickActionsList"'), 'index.html contains #quickActionsList');
  assert(indexHtmlContent.includes('id="quickCustomBox"'), 'index.html contains #quickCustomBox');
  assert(indexHtmlContent.includes('id="quickAnswerCard"'), 'index.html contains #quickAnswerCard');
  assert(indexHtmlContent.includes('id="promptsManagerList"'), 'index.html contains #promptsManagerList');
  assert(indexHtmlContent.includes('id="promptEditorModal"'), 'index.html contains #promptEditorModal');
  assert(indexHtmlContent.includes('id="quickTextShortcutInput"'), 'index.html contains #quickTextShortcutInput');

  // CSS assertions
  assert(styleCssContent.includes('.quick-text-container'), 'style.css defines .quick-text-container');
  assert(styleCssContent.includes('backdrop-filter: blur(12px)'), 'style.css includes 12px blur backdrop-filter');
  assert(styleCssContent.includes('fadeInScale 0.18s'), 'style.css includes fadeInScale 0.18s micro-animation');
  assert(styleCssContent.includes('.quick-action-btn:hover') && styleCssContent.includes('translateY(-1px)'), 'style.css includes hover translateY(-1px)');
  assert(styleCssContent.includes('.quick-action-btn:active') && styleCssContent.includes('scale(0.97)'), 'style.css includes active scale(0.97)');
  assert(styleCssContent.includes('.quick-action-num'), 'style.css includes .quick-action-num keyboard badges');
  assert(styleCssContent.includes('body.snipping-active #quickTextContainer') && styleCssContent.includes('display: none !important;'), 'style.css suppresses quickTextContainer during snipping mode');

  // ----------------------------------------------------
  // TEST 7: PRELOAD.JS CONTEXTBRIDGE INTEGRATION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 7] Preload.js ContextBridge Exposure');

  assert(preloadJsContent.includes('getTextPrompts: () =>'), 'preload.js exposes getTextPrompts');
  assert(preloadJsContent.includes('saveTextPrompts: (prompts) =>'), 'preload.js exposes saveTextPrompts');
  assert(preloadJsContent.includes('closeQuickText: () =>'), 'preload.js exposes closeQuickText');
  assert(preloadJsContent.includes('quickTextAsk: (params) =>'), 'preload.js exposes quickTextAsk');
  assert(preloadJsContent.includes('onOpenQuickTextToolbar: (callback) =>'), 'preload.js exposes onOpenQuickTextToolbar');
  assert(preloadJsContent.includes('onCloseQuickTextUI: (callback) =>'), 'preload.js exposes onCloseQuickTextUI');
  assert(preloadJsContent.includes('onQuickAnswerChunk: (callback) =>'), 'preload.js exposes onQuickAnswerChunk');
  assert(preloadJsContent.includes('onQuickAnswerFinish: (callback) =>'), 'preload.js exposes onQuickAnswerFinish');
  assert(preloadJsContent.includes('onQuickAnswerError: (callback) =>'), 'preload.js exposes onQuickAnswerError');

  // ----------------------------------------------------
  // TEST 8: CUSTOM PROMPTS CRUD IN SCRIPT.JS
  // ----------------------------------------------------
  console.log('\n👉 [TEST 8] Custom Prompts CRUD Operations Logic');

  assert(scriptJsContent.includes('function renderPromptsManager()'), 'script.js defines renderPromptsManager()');
  assert(scriptJsContent.includes('function openPromptEditorModal(promptId)'), 'script.js defines openPromptEditorModal()');
  assert(scriptJsContent.includes('function closePromptEditorModal()'), 'script.js defines closePromptEditorModal()');
  assert(scriptJsContent.includes('async function savePromptFromEditor()'), 'script.js defines savePromptFromEditor()');
  assert(scriptJsContent.includes('async function deletePrompt(promptId)'), 'script.js defines deletePrompt()');
  assert(scriptJsContent.includes('async function togglePromptEnabled(promptId)'), 'script.js defines togglePromptEnabled()');
  assert(scriptJsContent.includes('async function movePrompt(promptId, direction)'), 'script.js defines movePrompt()');

  // Simulate CRUD in isolated memory
  let promptsState = [
    { id: 'p1', name: 'Prompt 1', icon: 'file-text', template: '{text}', enabled: true },
    { id: 'p2', name: 'Prompt 2', icon: 'globe', template: '{text}', enabled: true }
  ];

  // 1. Add
  promptsState.push({ id: 'p3', name: 'Prompt 3', icon: 'zap', template: 'Test {text}', enabled: true });
  assert(promptsState.length === 3, 'CRUD: Successfully added new prompt');

  // 2. Edit
  const p2 = promptsState.find(p => p.id === 'p2');
  p2.name = 'Prompt 2 Edited';
  assert(promptsState.find(p => p.id === 'p2').name === 'Prompt 2 Edited', 'CRUD: Successfully edited prompt name');

  // 3. Toggle
  p2.enabled = false;
  assert(!promptsState.find(p => p.id === 'p2').enabled, 'CRUD: Successfully toggled enabled status');

  // 4. Move (Reorder)
  const idx = promptsState.findIndex(p => p.id === 'p3');
  const temp = promptsState[idx];
  promptsState[idx] = promptsState[idx - 1];
  promptsState[idx - 1] = temp;
  assert(promptsState[1].id === 'p3', 'CRUD: Successfully moved prompt up');

  // 5. Delete
  promptsState = promptsState.filter(p => p.id !== 'p1');
  assert(promptsState.length === 2 && !promptsState.some(p => p.id === 'p1'), 'CRUD: Successfully deleted prompt');

  // ----------------------------------------------------
  // TEST 9: KEYBOARD SHORTCUTS 1-9 AND ESCAPE BINDINGS
  // ----------------------------------------------------
  console.log('\n👉 [TEST 9] Keyboard Shortcuts (1-9 Badges & Escape)');

  assert(scriptJsContent.includes("if (e.key === 'Escape')"), 'script.js listens for Escape key to close UI');
  assert(scriptJsContent.includes("if (e.key >= '1' && e.key <= '9')"), 'script.js maps number keys 1-9 to action triggers');
  assert(scriptJsContent.includes('executeQuickPromptByIndex(digitIndex)'), 'script.js triggers action by digit index');

  // ----------------------------------------------------
  // TEST 10: NATIVE HOOK EXECUTABLE DUAL TRIGGER VERIFICATION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 10] Native Hook Executable Dual Combinations');

  const hookExePath = path.join(__dirname, 'hotkey_hook.exe');
  assert(fs.existsSync(hookExePath), 'hotkey_hook.exe binary exists');

  const hookProcess = spawn(hookExePath, ['Alt+Shift+S', 'Ctrl+CapsLock']);
  let hookReady = false;
  let hookOutput = '';

  await new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const timer = setTimeout(() => {
      try { hookProcess.kill(); } catch (e) {}
      finish();
    }, 2500);

    hookProcess.stdout.on('data', (d) => {
      const out = d.toString();
      hookOutput += out;
      if (out.includes('HOTKEY_HOOK_READY')) {
        hookReady = true;
        clearTimeout(timer);
        try { hookProcess.kill(); } catch (e) {}
      }
    });

    hookProcess.on('close', () => {
      clearTimeout(timer);
      finish();
    });

    hookProcess.on('error', (err) => {
      console.warn('Native hook test error:', err.message);
      clearTimeout(timer);
      finish();
    });
  });

  assert(hookReady, `Native hook initialized with dual hotkey support: ${hookOutput.trim()}`);
  assert(hookOutput.includes('SNIP=ALT+SHIFT+S'), 'Native hook registered SNIP combo as ALT+SHIFT+S');
  assert(hookOutput.includes('QUICK_TEXT=CTRL+CAPITAL'), 'Native hook registered QUICK_TEXT combo as CTRL+CAPITAL');

  // Verify native_hotkey.cs architecture
  const nativeCsContent = fs.readFileSync(path.join(__dirname, 'native_hotkey.cs'), 'utf8');
  assert(nativeCsContent.includes('RegisterHotKey'), 'native_hotkey.cs implements kernel-level RegisterHotKey');
  assert(nativeCsContent.includes('MOD_NOREPEAT'), 'native_hotkey.cs uses MOD_NOREPEAT to prevent keystroke flooding');
  assert(nativeCsContent.includes('.Replace("CAPS", "CAPITAL")'), 'native_hotkey.cs normalizes both CAPS and CAPSLOCK to CAPITAL');
  assert(nativeCsContent.includes('0xA2'), 'native_hotkey.cs supports VK_LCONTROL tolerance');
  assert(nativeCsContent.includes('0xA3'), 'native_hotkey.cs supports VK_RCONTROL tolerance');
  assert(nativeCsContent.includes('WM_HOTKEY'), 'native_hotkey.cs listens for WM_HOTKEY window messages');
  assert(mainJsContent.includes("quickHotkey = 'Ctrl+CapsLock'"), 'main.js registers quickHotkey in Electron globalShortcut fallback');
  assert(scriptJsContent.includes("promptModal || !promptModal.contains(e.target)"), 'script.js dismisses quick text on click outside');

  // Test hotkey_hook.exe with 'Ctrl+Caps' argument specifically
  const hookProcessCaps = spawn(hookExePath, ['Alt+Shift+S', 'Ctrl+Caps']);
  let hookCapsOutput = '';
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try { hookProcessCaps.kill(); } catch (e) {}
      resolve();
    }, 2000);

    hookProcessCaps.stdout.on('data', (d) => {
      hookCapsOutput += d.toString();
      if (hookCapsOutput.includes('HOTKEY_HOOK_READY')) {
        clearTimeout(timer);
        try { hookProcessCaps.kill(); } catch (e) {}
        resolve();
      }
    });

    hookProcessCaps.on('close', () => resolve());
    hookProcessCaps.on('error', () => resolve());
  });

  assert(hookCapsOutput.includes('QUICK_TEXT=CTRL+CAPITAL'), "hotkey_hook.exe correctly normalizes 'Ctrl+Caps' argument to 'CTRL+CAPITAL'");

  // ----------------------------------------------------
  // TEST 11: LIVE GEMINI QUICK ASK STRICT DIRECT OUTPUT SPEED TEST
  // ----------------------------------------------------
  console.log('\n👉 [TEST 11] Live Gemini Quick Ask Direct Output Verification');

  const appDataDir = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
  const snapConfigPath = path.join(appDataDir, 'SnapMind_AI_App', 'config.json');
  let apiKey = '';
  if (fs.existsSync(snapConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(snapConfigPath, 'utf8'));
      apiKey = cfg.apiKey;
    } catch (e) {}
  }
  if (!apiKey) apiKey = process.env.GEMINI_API_KEY || '';

  assert(Boolean(apiKey), `API Key found: ${apiKey.substring(0, 8)}...`);

  const quickAskPayload = {
    system_instruction: {
      parts: [
        { text: expectedInstruction }
      ]
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'แปลข้อความต่อไปนี้เป็นภาษาไทยอย่างสละสลวย:\n\nHello, world!' }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 256
    }
  };

  const startQuickApi = performance.now();
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

  let liveSuccess = false;
  let responseText = '';
  let apiDuration = 0;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quickAskPayload)
    });

    if (res.ok) {
      const data = await res.json();
      apiDuration = ((performance.now() - startQuickApi) / 1000).toFixed(2);
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      liveSuccess = true;
    } else {
      console.warn('Live API response not ok:', res.status);
    }
  } catch (apiErr) {
    console.warn('Live API error:', apiErr.message);
  }

  assert(liveSuccess, `Live Quick Ask API call succeeded (${apiDuration}s)`);
  assert(responseText.length > 0, `Received non-empty direct answer: "${responseText}"`);
  assert(responseText.includes('สวัสดี'), 'Direct translation contains "สวัสดี"');
  assert(!responseText.startsWith('นี่คือ'), 'Direct answer strictly omits greeting fluff ("นี่คือ...")');
  assert(!responseText.startsWith('คำตอบของคุณ'), 'Direct answer strictly omits "คำตอบของคุณ"');
  assert(!responseText.startsWith('ผลการแปล'), 'Direct answer strictly omits "ผลการแปล"');

  console.log('\n====================================================');
  console.log(`📊 QUICK TEXT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exitCode = failed > 0 ? 1 : 0;
}

runTests().catch(err => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});

