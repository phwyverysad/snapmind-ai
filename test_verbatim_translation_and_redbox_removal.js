const fs = require('fs');
const path = require('path');

function runTests() {
  console.log('====================================================');
  console.log('🌟 VERBATIM TRANSLATION, ENLARGED TOOLBAR & REDBOX REMOVAL');
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

  const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const toolbarHtml = fs.readFileSync(path.join(__dirname, 'toolbar.html'), 'utf8');
  const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  // ----------------------------------------------------
  // SECTION 1: VERBATIM TRANSLATION (NO BULLETS, NO TOPICS)
  // ----------------------------------------------------
  console.log('👉 [SECTION 1] Verbatim Direct Translation & Elimination of Synthetic Bullets');

  assert(mainJs.includes('ห้ามแยกหัวข้อเอง'), 'main.js bans self-invented topic separation');
  assert(mainJs.includes('ห้ามสร้างหัวข้อย่อย'), 'main.js bans creating subheadings');
  assert(mainJs.includes('ห้ามใส่ Markdown bullet points (- ...) หรือจุดรายการเองโดยเด็ดขาดหากต้นฉบับเป็นข้อความธรรมดาหรือย่อหน้าปกติ'), 'main.js explicitly bans bullet lists on normal paragraphs');
  assert(mainJs.includes('ไม่ต้องแยกหัวข้อ ไม่ต้องใส่หัวข้อย่อย ไม่ต้องใส่ bullet points'), 'main.js instructs keeping normal paragraphs without synthetic bullet points');
  assert(toolbarJs.includes('replace(/^\\s*[-*•]\\s+/gm'), 'toolbar.js strips synthetic bullet markers when translating normal continuous paragraphs');

  // ----------------------------------------------------
  // SECTION 2: ENLARGED TOOLBAR PILL & BUTTONS
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 2] Enlarged Toolbar Pill & Comfortable Hit Targets');

  assert(toolbarHtml.includes('height: 44px;') && toolbarHtml.includes('min-height: 44px;'), 'toolbar.html enlarges pill height to 44px');
  assert(toolbarHtml.includes('border-radius: 10px;'), 'toolbar.html updates border-radius to 10px for bigger pill');
  assert(toolbarHtml.includes('height: 32px;') && toolbarHtml.includes('border-radius: 7px;'), 'toolbar.html enlarges button height to 32px');
  assert(toolbarHtml.includes('min-width: 21px;') && toolbarHtml.includes('height: 21px;'), 'toolbar.html enlarges number badges to 21x21px');
  assert(toolbarHtml.includes('font-size: 12.8px;'), 'toolbar.html increases action label font size to 12.8px');

  // ----------------------------------------------------
  // SECTION 3: ANSWER CARD SHADOW REMOVAL
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 3] Answer Card Edge Shadow Removal');

  const answerCardCssIdx = toolbarHtml.indexOf('.quick-answer-card {');
  assert(answerCardCssIdx !== -1, 'toolbar.html defines .quick-answer-card');
  const answerCardSnippet = toolbarHtml.slice(answerCardCssIdx, answerCardCssIdx + 300);
  assert(answerCardSnippet.includes('box-shadow: none !important;'), '.quick-answer-card sets box-shadow: none !important; removing fuzzy edge shadow');
  assert(!answerCardSnippet.includes('box-shadow: 0 12px 32px'), '.quick-answer-card eliminated 32px fuzzy drop shadow');

  // ----------------------------------------------------
  // SECTION 4: RED BOXES REMOVAL IN AI RESPONSE WINDOW
  // ----------------------------------------------------
  console.log('\n👉 [SECTION 4] Removal of Red-Box Elements from aiToolbar Header');

  assert(indexHtml.includes('class="window-drag-handle"') && indexHtml.includes('style="display: none !important;"'), 'index.html hides .window-drag-handle from aiToolbar (Red Box 1)');
  assert(!indexHtml.includes('onclick="exportResultFileDialog()"'), 'index.html removed Save/Export button from toolbar-right (Red Box 2)');
  assert(!indexHtml.includes('onclick="copyAllChat()"'), 'index.html removed Copy-All button from toolbar-right (Red Box 2)');
  assert(indexHtml.includes('openHistoryModal()'), 'index.html keeps History button');
  assert(indexHtml.includes('openSettingsModal()'), 'index.html keeps Settings button');
  assert(indexHtml.includes('closeAiWindow()'), 'index.html keeps Close button');

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
