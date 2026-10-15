const assert = require('assert');
const fs = require('fs');

console.log('================================================================');
console.log('TEST: ESC CLOSES BOTH ANSWER CARD AND OPTIONS TOOLBAR');
console.log('================================================================\n');

const toolbarJs = fs.readFileSync('toolbar.js', 'utf8');
const scriptJs = fs.readFileSync('script.js', 'utf8');
const mainJs = fs.readFileSync('main.js', 'utf8');

// Test 1: In toolbar.js, closeQuickAnswerCard must call closeQuickTextUI
console.log('1. Checking toolbar.js closeQuickAnswerCard...');
const tbCloseAnswerBlock = toolbarJs.substring(
  toolbarJs.indexOf('function closeQuickAnswerCard('),
  toolbarJs.indexOf('function closeQuickAnswerCard(') + 1500
);
assert(
  tbCloseAnswerBlock.includes('closeQuickTextUI()'),
  'toolbar.js closeQuickAnswerCard MUST call closeQuickTextUI() to ensure the options toolbar does not linger on screen'
);

// Test 2: In toolbar.js, Escape keydown must trigger full dismissal
console.log('2. Checking toolbar.js keydown Escape handler...');
const tbKeydownBlock = toolbarJs.substring(
  toolbarJs.indexOf("window.addEventListener('keydown'"),
  toolbarJs.indexOf("window.addEventListener('keydown'") + 600
);
assert(
  !tbKeydownBlock.includes('closeQuickAnswerCard();\n      return;') &&
  !tbKeydownBlock.includes('closeQuickAnswerCard();\r\n      return;'),
  'toolbar.js Escape handler must NOT return early on closeQuickAnswerCard without closing the toolbar'
);
assert(
  tbKeydownBlock.includes('closeQuickTextUI()'),
  'toolbar.js Escape handler must call closeQuickTextUI()'
);

// Test 3: In script.js, closeQuickAnswerCard must dismiss entire UI instead of re-showing toolbar
console.log('3. Checking script.js closeQuickAnswerCard...');
const scriptCloseAnswerBlock = scriptJs.substring(
  scriptJs.indexOf('function closeQuickAnswerCard()'),
  scriptJs.indexOf('function closeQuickAnswerCard()') + 1500
);
assert(
  !scriptCloseAnswerBlock.includes('updateSmartScreenToolbarPosition(box)'),
  'script.js closeQuickAnswerCard must NOT re-show smart screen toolbar when closing'
);
assert(
  scriptCloseAnswerBlock.includes('closeQuickTextUI()'),
  'script.js closeQuickAnswerCard must call closeQuickTextUI()'
);

// Test 4: In main.js, Escape shortcut must be registered to closeQuickTextMode during quick ask
console.log('4. Checking main.js gemini-quick-text-ask Escape preservation...');
const quickAskBlock = mainJs.substring(
  mainJs.indexOf("ipcMain.handle('gemini-quick-text-ask'"),
  mainJs.indexOf("ipcMain.handle('gemini-quick-text-ask'") + 900
);
assert(
  quickAskBlock.includes("globalShortcut.register('Escape', () => {\n      closeQuickTextMode(true);") ||
  quickAskBlock.includes("globalShortcut.register('Escape', () => {\r\n      closeQuickTextMode(true);"),
  'main.js gemini-quick-text-ask must register Escape to closeQuickTextMode so users can dismiss anytime'
);

console.log('\nAll Escape and options toolbar dismissal assertions passed.');
