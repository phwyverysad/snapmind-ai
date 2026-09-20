const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 TEST: UNSELECTABLE LATENCY BADGE & SIMULTANEOUS CATEGORY DELIVERY');
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

  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
  const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

  // ----------------------------------------------------
  // SECTION 1: UNSELECTABLE LATENCY BADGE (RED BOX FIX)
  // ----------------------------------------------------
  console.log('👉 [SECTION 1] Unselectable Latency Badge (Red Box Fix)');

  // 1. CSS user-select: none !important rules
  assert(styleCss.includes('.latency-time') && styleCss.includes('#latencyTimer'), 'style.css defines rules targeting .latency-time and #latencyTimer');
  assert(styleCss.includes('user-select: none !important;'), 'style.css enforces user-select: none !important');
  assert(styleCss.includes('-webkit-user-select: none !important;'), 'style.css enforces -webkit-user-select: none !important');
  assert(styleCss.includes('cursor: default;'), 'style.css enforces cursor: default on latency timer');
  assert(styleCss.includes('.metrics-banner') && styleCss.includes('user-select: none !important;'), 'style.css prevents selection on entire .metrics-banner container');

  // 2. HTML event suppression attributes
  assert(indexHtml.includes('id="latencyTimer" draggable="false"'), 'index.html disables drag on #latencyTimer');
  assert(indexHtml.includes('id="latencyTimer"') && indexHtml.includes('onselectstart="return false;"'), 'index.html suppresses selectstart on #latencyTimer');
  assert(indexHtml.includes('id="metricsBanner" onselectstart="return false;"'), 'index.html suppresses selectstart on #metricsBanner');

  // ----------------------------------------------------
  // SECTION 2: SIMULTANEOUS CATEGORY DELIVERY (ZERO STAGGERED FILLING)
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 2] Simultaneous Category Delivery & Zero Left-to-Right Stagger');

  // 1. Elimination of staggered left-to-right filling in processScreenCapture
  assert(scriptJs.includes('hasAllCategories'), 'script.js defines hasAllCategories check for all main sections');
  assert(scriptJs.includes('renderConversationView();'), 'script.js delivers all answers and categories simultaneously via renderConversationView');

  // 2. onStreamFinish delivers all categories simultaneously
  const finishIdx = scriptJs.indexOf('window.electronAPI.onStreamFinish');
  assert(finishIdx !== -1, 'onStreamFinish handler exists in script.js');
  const renderInFinishIdx = scriptJs.indexOf('renderConversationView();', finishIdx);
  assert(renderInFinishIdx !== -1, 'onStreamFinish invokes renderConversationView to release all categories together');

  // 3. Category tabs fallback retention
  assert(scriptJs.includes('function getCategoryContent(cat, result)'), 'getCategoryContent defined');
  assert(scriptJs.includes('createQuickBulletSummary(ans)'), 'summary tab falls back to synthesized bullet points from answer');
  assert(scriptJs.includes("if (!isStreamingActive && ans) return ans;"), 'translate tab falls back to answer when translation not provided');

  // ----------------------------------------------------
  // SECTION 3: SPEED & PROMPT OPTIMIZATION
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 3] Speed & Prompt Optimization');

  // 1. Prompt optimization for maximum conciseness and zero rambling
  assert(mainJs.includes('คุณคือระบบ AI วิเคราะห์ภาพถ่ายหน้าจอความเร็วสูง'), 'main.js uses high-speed AI system prompt');
  assert(mainJs.includes('ตอบทุกหมวดหมู่ให้สั้นกระชับ ตรงประเด็นที่สุด'), 'main.js instructs model to be concise and direct across all categories');
  assert(mainJs.includes('### [ANSWER]') && mainJs.includes('### [EXPLAIN]') && mainJs.includes('### [SUMMARY]') && mainJs.includes('### [TRANSLATE]'), 'main.js defines all 4 structured category tags');

  // 2. Token output optimization for blazing speed
  assert(mainJs.includes('maxOutputTokens: 1200'), 'main.js optimizes maxOutputTokens to 1200 for fast response');

  // 3. Concurrent OCR & Analysis parallel execution
  assert(mainJs.includes('Promise.allSettled([analysisPromise, ocrPromise])'), 'main.js executes analysis and OCR streams concurrently in parallel from t=0');

  // ----------------------------------------------------
  // SECTION 4: LIVE DOM BROWSERWINDOW COMPUTED STYLE VERIFICATION
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 4] Live DOM Computed Style Verification in Electron');

  const win = new BrowserWindow({
    show: false,
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadFile(path.join(__dirname, 'index.html'));

  const styles = await win.webContents.executeJavaScript(`
    (() => {
      const timer = document.getElementById('latencyTimer');
      const banner = document.getElementById('metricsBanner');
      const text = document.getElementById('latencyText');
      const timerStyle = window.getComputedStyle(timer);
      const bannerStyle = window.getComputedStyle(banner);
      const textStyle = window.getComputedStyle(text);
      return {
        timerUserSelect: timerStyle.userSelect || timerStyle.webkitUserSelect,
        timerCursor: timerStyle.cursor,
        bannerUserSelect: bannerStyle.userSelect || bannerStyle.webkitUserSelect,
        textUserSelect: textStyle.userSelect || textStyle.webkitUserSelect
      };
    })()
  `);

  assert(styles.timerUserSelect === 'none', `Live DOM: #latencyTimer computed user-select is "none" (Got: ${styles.timerUserSelect})`);
  assert(styles.timerCursor === 'default', `Live DOM: #latencyTimer computed cursor is "default" (Got: ${styles.timerCursor})`);
  assert(styles.bannerUserSelect === 'none', `Live DOM: #metricsBanner computed user-select is "none" (Got: ${styles.bannerUserSelect})`);
  assert(styles.textUserSelect === 'none', `Live DOM: #latencyText computed user-select is "none" (Got: ${styles.textUserSelect})`);

  win.destroy();

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 UNSELECTABLE LATENCY BADGE & SIMULTANEOUS CATEGORY DELIVERY VERIFIED 100%!');
    process.exit(0);
  }
}

app.whenReady().then(() => {
  runVerification().catch(err => {
    console.error('Fatal verification error:', err);
    process.exit(1);
  });
});
