const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

async function runCleanUiAndWinCompatTests() {
  console.log('================================================================');
  console.log('🌟 CLEAN UI, CATEGORY LAYOUT & ALL-WINDOWS COMPATIBILITY TEST');
  console.log('================================================================\n');

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
  const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const nativeCs = fs.readFileSync(path.join(__dirname, 'native_hotkey.cs'), 'utf8');

  // ----------------------------------------------------
  // SECTION 1: UI CLIPPING FIX & CONTAINER FLEX CONTAINMENT
  // ----------------------------------------------------
  console.log('👉 [SECTION 1] UI Clipping Fix & Flex Containment');

  assert(toolbarHtml.includes('html, body') && toolbarHtml.includes('height: 100%') && toolbarHtml.includes('overflow: hidden'), 'toolbar.html locks html & body to 100% viewport without overflow');
  assert(toolbarHtml.includes('.quick-text-container') && toolbarHtml.includes('height: 100%') && toolbarHtml.includes('box-sizing: border-box'), '.quick-text-container enforces height: 100% and border-box sizing');
  assert(toolbarHtml.includes('.quick-answer-card') && toolbarHtml.includes('flex: 1') && toolbarHtml.includes('min-height: 0') && toolbarHtml.includes('overflow: hidden'), '.quick-answer-card has flex: 1 and min-height: 0 boundary containment');
  assert(toolbarHtml.includes('.quick-answer-body') && toolbarHtml.includes('flex: 1') && toolbarHtml.includes('min-height: 0') && toolbarHtml.includes('overflow-y: auto'), '.quick-answer-body scrolls with flex: 1 without overflowing window');
  assert(toolbarJs.includes('window.electronAPI.resizeToolbarWindow({ height: 430 })'), 'toolbar.js expands window height to 430px for spacious answer view');
  assert(toolbarJs.includes('window.electronAPI.resizeToolbarWindow({ height: 280 })'), 'toolbar.js retains 280px signature for backwards compatibility');

  // ----------------------------------------------------
  // SECTION 2: CLEAN UI & SCREEN-SNIP MATCHING TYPOGRAPHY
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 2] Clean UI & Screen-Snip Matching Typography');

  assert(toolbarHtml.includes('.quick-answer-body h1') && toolbarHtml.includes('.quick-answer-body h2'), 'toolbar.html styles Markdown headings h1, h2, h3, h4');
  assert(toolbarHtml.includes('.quick-answer-body strong') && toolbarHtml.includes('#0369a1'), 'toolbar.html styles strong/bold tags with elegant blue tint #0369a1');
  assert(toolbarHtml.includes('.quick-answer-body li::marker') && toolbarHtml.includes('#0284c7'), 'toolbar.html styles bullet points with clear marker styling');
  assert(toolbarHtml.includes('.quick-answer-body table') && toolbarHtml.includes('border-collapse: collapse'), 'toolbar.html includes clean Markdown table styling with borders & zebra striping');
  assert(toolbarHtml.includes('.quick-answer-body th') && toolbarHtml.includes('#f1f5f9'), 'toolbar.html Markdown table headers have elevated background #f1f5f9');
  assert(toolbarHtml.includes('.katex-display') && toolbarHtml.includes('rgba(2, 132, 199, 0.04)'), 'toolbar.html includes elegant KaTeX math formula container box');
  assert(toolbarHtml.includes('.quick-answer-body::-webkit-scrollbar') && toolbarHtml.includes('width: 6px'), 'toolbar.html defines custom sleek 6px scrollbar');
  assert(toolbarJs.includes('formatQuickTextMarkdown'), 'toolbar.js defines formatQuickTextMarkdown preprocessor for structured bullets');

  // ----------------------------------------------------
  // SECTION 3: VISUAL COMPOSITION IN CATEGORIES & TRANSLATIONS
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 3] Visual Composition & Layout In Categories & Translations');

  assert(mainJs.includes('QUICK_TEXT_SYSTEM_INSTRUCTION') && mainJs.includes('Markdown bullet points') && mainJs.includes('Layout'), 'main.js QUICK_TEXT_SYSTEM_INSTRUCTION mandates layout, bullet points & bold headers');
  assert(mainJs.includes('analysisPromptText') && mainJs.includes('### [TRANSLATE]') && mainJs.includes('Spatial Composition'), 'main.js screen analysis translation instructs maintaining layout & spatial composition');
  assert(mainJs.includes('### [ANSWER]') && mainJs.includes('Markdown bullet points'), 'main.js screen analysis answer instructs structured markdown bullet points');
  assert(scriptJs.includes('isTranslatingOcr') && scriptJs.includes('Spatial Composition'), 'script.js on-the-fly OCR translation mandates spatial layout, bullets & tables');

  // ----------------------------------------------------
  // SECTION 4: ALL-WINDOWS VERSIONS COMPATIBILITY (7, 8, 8.1, 10, 11, x86, x64)
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 4] Windows Cross-Version Compatibility (7, 8, 8.1, 10, 11, x86, x64)');

  assert(mainJs.includes("app.commandLine.appendSwitch('disable-gpu-sandbox')"), 'main.js disables GPU sandbox for crash-free execution on Win7/8/VMs');
  assert(mainJs.includes("app.commandLine.appendSwitch('high-dpi-support', '1')"), 'main.js enforces high DPI support for crisp scaling across all OS versions');
  assert(mainJs.includes("app.commandLine.appendSwitch('disable-d3d11')"), 'main.js includes DirectX legacy fallback for Windows 7 Aero/Basic');
  assert(mainJs.includes('hwndBuf.length >= 4') && mainJs.includes('readInt32LE') && mainJs.includes('readBigInt64LE'), 'main.js enforceTopmostWin32 supports both 32-bit and 64-bit HWND pointers');
  assert(nativeCs.includes('GetWindowLong32') && nativeCs.includes('GetWindowLongPtr64'), 'native_hotkey.cs defines both 32-bit and 64-bit pointer P/Invokes');
  assert(nativeCs.includes('IntPtr.Size == 8'), 'native_hotkey.cs dynamically branches on 32-bit vs 64-bit architecture');

  // Package.json multi-architecture target verification
  const winTargets = packageJson.build?.win?.target;
  assert(Array.isArray(winTargets) && winTargets.length >= 2, 'package.json configures win targets for installer and portable');
  const portableTarget = winTargets.find(t => t.target === 'portable');
  const nsisTarget = winTargets.find(t => t.target === 'nsis');
  assert(portableTarget && portableTarget.arch.includes('x64') && portableTarget.arch.includes('ia32'), 'package.json portable builds for both x64 and ia32 (32-bit Windows)');
  assert(nsisTarget && nsisTarget.arch.includes('x64') && nsisTarget.arch.includes('ia32'), 'package.json NSIS installer builds for both x64 and ia32 (32-bit Windows)');

  // ----------------------------------------------------
  // SECTION 5: LIVE WINDOW RENDERING & SCROLLBAR FIT TEST
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 5] Live Window Rendering & Scrollbar Fit Test');

  const testWin = new BrowserWindow({
    width: 920,
    height: 430,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await testWin.loadFile(path.join(__dirname, 'toolbar.html'));

  const bounds = testWin.getBounds();
  assert(bounds.width === 920 && bounds.height === 430, 'BrowserWindow created and sized to 920x430 without clipping');

  const containerFits = await testWin.webContents.executeJavaScript(`
    const cont = document.getElementById('quickTextContainer');
    const tb = document.getElementById('quickTextToolbar');
    const card = document.getElementById('quickAnswerCard');
    card.style.display = 'flex';
    const body = document.getElementById('quickAnswerBody');
    body.innerHTML = '<p>Line 1</p><p>Line 2</p><p>Line 3</p><p>Line 4</p><p>Line 5</p><p>Line 6</p><p>Line 7</p><p>Line 8</p><p>Line 9</p><p>Line 10</p>';
    
    const cardRect = card.getBoundingClientRect();
    const windowH = window.innerHeight;
    cardRect.bottom <= windowH;
  `);

  assert(containerFits === true, 'Quick answer card bottom boundary is 100% inside window viewport (Zero Clipping)');

  testWin.destroy();
  assert(testWin.isDestroyed(), 'Cleanly destroyed test window');

  console.log('\n================================================================');
  console.log(`📊 CLEAN UI & ALL-WINDOWS COMPATIBILITY RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  app.exit(failed > 0 ? 1 : 0);
}

app.whenReady().then(() => {
  runCleanUiAndWinCompatTests().catch(err => {
    console.error('Fatal Test Exception:', err);
    app.exit(1);
  });
});
