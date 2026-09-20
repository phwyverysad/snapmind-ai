const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 TEST SUITE: OCR LAYOUT PRESERVATION & PROMPT EDITOR REDESIGN');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
const toolbarHtml = fs.readFileSync(path.join(__dirname, 'toolbar.html'), 'utf8');
const toolbarJs = fs.readFileSync(path.join(__dirname, 'toolbar.js'), 'utf8');

// ----------------------------------------------------
// SECTION 1: OCR LAYOUT PRESERVATION & COMPOSITION PROMPTS
// ----------------------------------------------------
console.log('👉 [SECTION 1] OCR Layout Preservation & Visual Composition Prompts');

it('main.js JSON OCR prompt instructs model to preserve spatial layout & composition', () => {
  assert(mainJs.includes('Layout & Spatial Composition'), 'prompt specifies Layout & Spatial Composition');
  assert(mainJs.includes('ตาราง (Markdown Table)'), 'prompt instructs Markdown Table for tables');
  assert(mainJs.includes('การขึ้นบรรทัดใหม่'), 'prompt instructs line break preservation');
});

it('main.js concurrent ocrPromptText instructs Document Layout Analysis with tables & code', () => {
  assert(mainJs.includes('Optical Character Recognition (OCR) และ Document Layout Analysis'), 'prompt defines high quality OCR & Layout analysis');
  assert(mainJs.includes('ตาราง Markdown Table (| คอลัมน์ 1 | คอลัมน์ 2 |)'), 'prompt gives Markdown Table format instructions');
  assert(mainJs.includes('Code Block') && mainJs.includes('โค้ดคอมพิวเตอร์'), 'prompt instructs code block formatting');
  assert(mainJs.includes('ห้ามแปล ห้ามสรุป ห้ามตัดทอนข้อความ'), 'prompt strictly prohibits summarization or translation');
});

// ----------------------------------------------------
// SECTION 2: MARKED.JS BREAKS & TABLE FORMATTING
// ----------------------------------------------------
console.log('\n👉 [SECTION 2] Markdown Formatting & Table Styles for OCR');

it('script.js configures marked with breaks: true and gfm: true', () => {
  assert(scriptJs.includes('marked.setOptions({'), 'script.js calls marked.setOptions');
  assert(scriptJs.includes('breaks: true'), 'script.js enables breaks: true to preserve line breaks');
  assert(scriptJs.includes('gfm: true'), 'script.js enables GitHub Flavored Markdown');
});

it('toolbar.js configures marked with breaks: true and gfm: true', () => {
  assert(toolbarJs.includes('marked.setOptions({ breaks: true, gfm: true })'), 'toolbar.js configures breaks & gfm');
});

it('style.css defines clean Markdown table styles with headers & zebra striping', () => {
  assert(styleCss.includes('.chat-bubble.ai table'), 'style.css defines table styles');
  assert(styleCss.includes('.chat-bubble.ai th'), 'style.css defines th styles with background');
  assert(styleCss.includes('.chat-bubble.ai td'), 'style.css defines td styles with borders');
  assert(styleCss.includes('.chat-bubble.ai tr:nth-child(even)'), 'style.css defines zebra striping');
});

it('style.css defines code block & pre styles with monospace font', () => {
  assert(styleCss.includes('.chat-bubble.ai pre'), 'style.css defines pre block');
  assert(styleCss.includes('.chat-bubble.ai code'), 'style.css defines code tags');
  assert(styleCss.includes('Fira Code'), 'style.css uses Fira Code / monospace font');
});

it('script.js and style.css define dedicated .ocr-rendered-container with spatial layout preservation', () => {
  assert(scriptJs.includes('ocr-rendered-container'), 'script.js wraps OCR output in ocr-rendered-container');
  assert(styleCss.includes('.ocr-rendered-container'), 'style.css defines .ocr-rendered-container class');
  assert(styleCss.includes('line-height: 1.75;'), 'style.css provides comfortable line-height for OCR');
});

// ----------------------------------------------------
// SECTION 3: SEPARATION OF {text} IN PROMPT EDITOR MODAL
// ----------------------------------------------------
console.log('\n👉 [SECTION 3] Separation of {text} in Prompt Editor UI');

it('index.html provides dedicated pure instruction textarea without requiring {text}', () => {
  assert(indexHtml.includes('id="promptInstructionInput"'), 'index.html contains #promptInstructionInput');
  assert(indexHtml.includes('class="prompt-hint-pill"'), 'index.html has prompt-hint-pill badge');
  assert(indexHtml.includes('พิมพ์เฉพาะคำสั่งที่ต้องการ'), 'index.html guides user to type prompt only');
});

it('index.html contains separate attached text card with auto-inject explanation', () => {
  assert(indexHtml.includes('class="prompt-text-injection-card"'), 'index.html contains .prompt-text-injection-card');
  assert(indexHtml.includes('ไม่ต้องพิมพ์ {text} อีกต่อไป'), 'index.html clearly states user does not need to type {text}');
  assert(indexHtml.includes('รวมให้อัตโนมัติ ⚡'), 'index.html shows auto-connect badge');
});

it('index.html contains real-time Live Preview container', () => {
  assert(indexHtml.includes('class="prompt-preview-container"'), 'index.html contains .prompt-preview-container');
  assert(indexHtml.includes('id="promptLivePreview"'), 'index.html contains #promptLivePreview');
});

it('script.js strips {text} when opening existing prompt so user only sees clean instruction', () => {
  assert(scriptJs.includes(".replace(/\\{text\\}/g, '').trim()"), 'script.js strips {text} from existing template');
  assert(scriptJs.includes("if (cleanPrompt.endsWith(':'))"), 'script.js strips trailing colon for clean prompt display');
  assert(scriptJs.includes('updatePromptLivePreview()'), 'script.js updates live preview on open');
});

it('script.js automatically updates live preview and automatically handles {text} on save', () => {
  assert(scriptJs.includes('function handlePromptInstructionChange()'), 'script.js defines handlePromptInstructionChange');
  assert(scriptJs.includes('function updatePromptLivePreview()'), 'script.js defines updatePromptLivePreview');
  assert(scriptJs.includes('`${instruction}:\\n\\n{text}`'), 'script.js automatically attaches {text} upon save');
});

it('style.css defines sleek styles for prompt editor card, injection card, and live preview', () => {
  assert(styleCss.includes('.prompt-editor-card'), 'style.css defines .prompt-editor-card');
  assert(styleCss.includes('.prompt-text-injection-card'), 'style.css styles .prompt-text-injection-card with soft blue');
  assert(styleCss.includes('.prompt-preview-code'), 'style.css styles .prompt-preview-code with monospace code font');
});

// ----------------------------------------------------
// SECTION 4: WINDOW DRAG HANDLES FOR EFFORTLESS DRAGGING
// ----------------------------------------------------
console.log('\n👉 [SECTION 4] Window Drag Handles (Effortless Dragging)');

it('index.html main aiToolbar includes prominent .window-drag-handle', () => {
  assert(indexHtml.includes('class="window-drag-handle"'), 'index.html aiToolbar contains .window-drag-handle');
  assert(styleCss.includes('.window-drag-handle'), 'style.css defines .window-drag-handle');
  assert(styleCss.includes('-webkit-app-region: drag;'), 'style.css makes .window-drag-handle draggable');
  assert(styleCss.includes('cursor: grab;'), 'style.css sets cursor: grab on handle');
});

it('toolbar.html contains prominent 32px .drag-handle and draggable pill', () => {
  assert(toolbarHtml.includes('class="drag-handle"'), 'toolbar.html contains .drag-handle');
  assert(toolbarHtml.includes('width: 32px;'), 'toolbar.html sets large 32px drag handle hit target');
  assert(toolbarHtml.includes('-webkit-app-region: drag;'), 'toolbar.html sets -webkit-app-region: drag');
});

it('toolbar.html answer card header is also draggable', () => {
  assert(toolbarHtml.includes('.quick-answer-header'), 'toolbar.html styles .quick-answer-header');
  assert(toolbarHtml.includes('class="header-drag-handle"'), 'toolbar.html includes .header-drag-handle');
});

console.log('\n================================================================');
console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

process.exitCode = failed > 0 ? 1 : 0;
