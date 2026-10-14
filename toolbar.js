// === GEMINI FLOATING TOOLBAR LOGIC (toolbar.js) ===

if (typeof marked !== 'undefined') {
  try {
    marked.setOptions({ breaks: true, gfm: true });
  } catch (e) {}
}

const SVG_ICONS = {
  'file-text': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  'globe': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  'help-circle': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  'edit': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  'check-circle': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  'code': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  'zap': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  'search': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  'message-square': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  'book-open': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
};

let currentCapturedText = '';
let currentCapturedImage = null;
let currentCropBox = null;
let currentSourceType = 'text';
let currentQuickPrompts = [];
let quickAnswerStreamText = '';
let isCustomInputOpen = false;
let isAnswerCardActive = false;

function isTextInputFocusedOrCustomOpen() {
  if (isCustomInputOpen) return true;
  const activeEl = document.activeElement;
  if (activeEl) {
    const tag = activeEl.tagName ? activeEl.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || activeEl.isContentEditable) {
      return true;
    }
  }
  return false;
}
let currentActiveToolbarModel = 'gemini-3.8-flash';
let lastExecutedQuickPromptParams = null;
let cachedConfig = null;

const fetchConfig = window.electronAPI && (window.electronAPI.getConfig || window.electronAPI.getSettings);
if (fetchConfig) {
  fetchConfig().then(cfg => {
    cachedConfig = cfg;
  }).catch(() => {});
}

window.setCachedConfigForTesting = (cfg) => {
  cachedConfig = cfg;
};

const MODEL_DISPLAY_NAMES = {
  'gemini-3.8-flash': 'Gemini 3.8 Flash',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash Lite',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro Preview'
};

function getCleanModelName(modelId) {
  return MODEL_DISPLAY_NAMES[modelId] || modelId || 'AI';
}

function toggleCustomModelMenu(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const dropdown = document.getElementById('customModelDropdown');
  const menu = document.getElementById('customModelMenu');
  if (!dropdown || !menu) return;

  const isOpen = dropdown.classList.contains('open');
  if (isOpen) {
    closeCustomModelMenu();
  } else {
    dropdown.classList.add('open');
    menu.style.display = 'flex';
  }
}

function closeCustomModelMenu() {
  const dropdown = document.getElementById('customModelDropdown');
  const menu = document.getElementById('customModelMenu');
  if (dropdown) dropdown.classList.remove('open');
  if (menu) menu.style.display = 'none';
}

function selectCustomModel(modelId, label) {
  closeCustomModelMenu();
  updateCustomModelDropdownUI(modelId, label);
  handleQuickModelChange(modelId);
}

function updateCustomModelDropdownUI(modelId, label) {
  const currentLabel = label || MODEL_DISPLAY_NAMES[modelId] || modelId;
  const labelEl = document.getElementById('customModelCurrentLabel');
  if (labelEl) labelEl.innerText = currentLabel;

  // Sync active class on menu items
  const items = document.querySelectorAll('#customModelMenu .custom-model-item');
  items.forEach(item => {
    if (item.getAttribute('data-model') === modelId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Sync hidden select element for backward-compat
  const sel = document.getElementById('quickModelSelect');
  if (sel && sel.value !== modelId) {
    sel.value = modelId;
  }
}

// Global click-outside listener to close menu
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('customModelDropdown');
  if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target)) {
    closeCustomModelMenu();
  }
});

// Listen for global model changes (Tray, Settings, Screen selection)
if (window.electronAPI && window.electronAPI.onModelChanged) {
  window.electronAPI.onModelChanged(({ modelId }) => {
    if (modelId && modelId !== currentActiveToolbarModel) {
      currentActiveToolbarModel = modelId;
      updateCustomModelDropdownUI(modelId);
    }
  });
}

function handleQuickModelChange(newModelId) {
  if (!newModelId) return;
  currentActiveToolbarModel = newModelId;
  updateCustomModelDropdownUI(newModelId);

  if (window.electronAPI && window.electronAPI.setActiveModel) {
    window.electronAPI.setActiveModel(newModelId);
  } else if (window.electronAPI && window.electronAPI.saveConfig) {
    window.electronAPI.saveConfig({ defaultModel: newModelId });
  }

  if (lastExecutedQuickPromptParams) {
    stopQuickSpeak();
    const catName = lastExecutedQuickPromptParams.categoryName || 'คำตอบ';
    showQuickAnswerCard(catName);
    const status = document.getElementById('quickAnswerStatus');
    const modelName = getCleanModelName(newModelId);
    if (status) status.innerText = `กำลังประมวลผลด้วย ${modelName}...`;

    runQuickPromptStreaming({
      ...lastExecutedQuickPromptParams,
      modelId: newModelId
    });
  }
}

// Initialize IPC Listeners
if (window.electronAPI) {
  if (window.electronAPI.onOpenQuickTextToolbar) {
    window.electronAPI.onOpenQuickTextToolbar((payload) => {
      handleOpenToolbar(payload || {});
    });
  }

  if (window.electronAPI.onCloseQuickTextUI) {
    window.electronAPI.onCloseQuickTextUI(() => {
      handleCloseUI();
    });
  }

  if (window.electronAPI.onQuickDigitPressed) {
    window.electronAPI.onQuickDigitPressed((digitIndex) => {
      if (isTextInputFocusedOrCustomOpen()) return;
      executeQuickPromptByIndex(digitIndex);
    });
  } else if (window.electronAPI.onQuickTextNumberPressed) {
    window.electronAPI.onQuickTextNumberPressed((digitIndex) => {
      if (isTextInputFocusedOrCustomOpen()) return;
      executeQuickPromptByIndex(digitIndex);
    });
  }

  if (window.electronAPI.onQuickTextCustomToggle) {
    window.electronAPI.onQuickTextCustomToggle(() => {
      toggleQuickCustomInput(true);
    });
  }
}

// Rogue foreign script detector & sanitizer
// Strips accidental cross-script token bleeds (Arabic, Hebrew, Devanagari, etc.)
// from Thai and English AI responses while preserving genuine Thai, English, numbers, math, and code.
const ROGUE_FOREIGN_SCRIPT_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0900-\u0D7F\u0F00-\u109F\u1780-\u17FF]+/g;

function sanitizeRogueForeignScripts(text, allowForeign = false) {
  if (!text || typeof text !== 'string') return '';
  if (allowForeign) return text;
  let clean = text.replace(ROGUE_FOREIGN_SCRIPT_REGEX, '');
  clean = clean.replace(/<<<TARGET_TEXT_(?:START|END)>>>/gi, '');
  clean = clean.replace(/<+TARGET_TEXT[^>]*>+/gi, '');
  clean = clean.replace(/<<<|>>>/g, '');
  clean = clean.replace(/<<{1,3}\s*>>{1,3}/g, '');
  clean = clean.replace(/^\s*(?:<{2,}[^>\n]*>{2,}|<<\s*>>)\s*\n?/gm, '');
  clean = clean.replace(/\n?\s*(?:<{2,}[^>\n]*>{2,}|<<\s*>>)\s*$/gm, '');
  clean = clean.replace(/เพื่อย(?=การ)/g, 'เพื่อ');
  clean = clean.replace(/[ \t]{2,}/g, ' ');
  return clean;
}

let isRenderScheduled = false;
let lastMathRenderTime = 0;
let hasInitialResized = false;
let hasRenderedFirstToken = false;

function scheduleStreamRender() {
  if (!hasRenderedFirstToken) {
    hasRenderedFirstToken = true;
    renderAnswerContent(quickAnswerStreamText, false);
    return;
  }
  if (isRenderScheduled) return;
  isRenderScheduled = true;
  requestAnimationFrame(() => {
    isRenderScheduled = false;
    renderAnswerContent(quickAnswerStreamText, false);
  });
}

function stripCodeExecutionTokens(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/```python\s*#\s*Code Execution[^\n]*[\s\S]*?(?:```|$)/gi, '')
             .replace(/(?:\*\*ผลลัพธ์ Code Execution:\*\*|\*\*Code Execution Result:\*\*|ผลลัพธ์ Code Execution:)\s*(?:```[\s\S]*?(?:```|$)|[^\n`]+(?:\n|$))?/gi, '')
             .replace(/^\s*#\s*Code Execution[^\n]*/gim, '')
             .replace(/^\s*ผลลัพธ์ Code Execution:\s*$/gim, '');
}

let quickAnswerWatchdogTimer = null;
let quickAnswerStreamStartTime = 0;

// Answer streaming and update listeners
if (window.electronAPI) {
  if (window.electronAPI.onQuickAnswerChunk) {
    window.electronAPI.onQuickAnswerChunk((data) => {
      if (data && data.chunk) {
        const cleanChunk = stripCodeExecutionTokens(data.chunk);
        if (cleanChunk) {
          if (!quickAnswerStreamStartTime) {
            quickAnswerStreamStartTime = Date.now();
          }
          const status = document.getElementById('quickAnswerStatus');
          if (status && status.innerText.includes('กำลังประมวลผล')) {
            status.innerText = 'กำลังตอบ...';
          }
          quickAnswerStreamText = sanitizeRogueForeignScripts(quickAnswerStreamText + cleanChunk);
          scheduleStreamRender();

          if (quickAnswerWatchdogTimer) clearTimeout(quickAnswerWatchdogTimer);
          quickAnswerWatchdogTimer = setTimeout(() => {
            if (quickAnswerStreamText && quickAnswerStreamText.trim().length > 0) {
              const curStatus = document.getElementById('quickAnswerStatus');
              if (curStatus && curStatus.innerText.includes('กำลัง')) {
                const elapsed = ((Date.now() - (quickAnswerStreamStartTime || Date.now())) / 1000).toFixed(2);
                curStatus.innerText = `ตอบเสร็จสิ้น (${elapsed}s)`;
              }
            }
          }, 3000);
        }
      }
    });
  }

  if (window.electronAPI.onQuickAnswerFinish) {
    window.electronAPI.onQuickAnswerFinish((data) => {
      if (quickAnswerWatchdogTimer) {
        clearTimeout(quickAnswerWatchdogTimer);
        quickAnswerWatchdogTimer = null;
      }
      isRenderScheduled = false;
      const final = (data && data.fullText && data.fullText.length >= quickAnswerStreamText.length)
        ? data.fullText
        : (quickAnswerStreamText || data?.fullText || '');
      renderAnswerContent(sanitizeRogueForeignScripts(final), true);
      const status = document.getElementById('quickAnswerStatus');
      if (status) {
        const sec = data?.durationSec || (quickAnswerStreamStartTime ? ((Date.now() - quickAnswerStreamStartTime) / 1000).toFixed(2) : '');
        status.innerText = sec ? `ตอบเสร็จสิ้น (${sec}s)` : 'ตอบเสร็จสิ้น';
      }
      quickAnswerStreamStartTime = 0;
    });
  }

  if (window.electronAPI.onQuickAnswerError) {
    window.electronAPI.onQuickAnswerError((data) => {
      const body = document.getElementById('quickAnswerBody');
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = 'เกิดข้อผิดพลาด';
      if (body) {
        body.innerHTML = `<div style="color:#ef4444; font-size:12px; padding:4px 0; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${data?.error || 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ'}</div>`;
      }
    });
  }

  if (window.electronAPI.onQuickTextCapturedUpdate) {
    window.electronAPI.onQuickTextCapturedUpdate(({ text }) => {
      if (text) {
        currentCapturedText = text.trim();
      }
    });
  }
}

// Universal digit extractor supporting Physical KeyCodes (Digit1-9, Numpad1-9), Standard Digits (1-9),
// and Thai Kedmanee Keyboard Layout top row keys (ๅ, /, -, ภ, ถ, ุ, ึ, ค, ต)
function getDigitFromKeyEvent(e) {
  if (!e) return null;
  if (e.code) {
    const digitMatch = e.code.match(/^Digit([1-9])$/);
    if (digitMatch) return parseInt(digitMatch[1], 10);
    const numpadMatch = e.code.match(/^Numpad([1-9])$/);
    if (numpadMatch) return parseInt(numpadMatch[1], 10);
  }
  if (typeof e.key === 'string' && e.key >= '1' && e.key <= '9') {
    return parseInt(e.key, 10);
  }
  const thaiDigitMap = {
    'ๅ': 1, '/': 2, '-': 3, 'ภ': 4,
    'ถ': 5, 'ุ': 6, 'ึ': 7, 'ค': 8, 'ต': 9
  };
  if (e.key && thaiDigitMap[e.key]) {
    return thaiDigitMap[e.key];
  }
  return null;
}

// Global keyboard listeners inside toolbar window
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (isCustomInputOpen) {
      toggleQuickCustomInput(false);
      return;
    }
    const answerCard = document.getElementById('quickAnswerCard');
    if (answerCard && answerCard.style.display !== 'none' && answerCard.style.display !== '') {
      closeQuickAnswerCard();
      return;
    }
    closeQuickTextUI();
    return;
  }

  // Ctrl+C / Cmd+C copy text shortcut support
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
    const sel = (window.getSelection && window.getSelection().toString()) ? window.getSelection().toString() : '';
    if (sel && sel.length > 0) {
      if (window.electronAPI && window.electronAPI.writeClipboardText) {
        window.electronAPI.writeClipboardText(sel);
      }
      return;
    }
  }

  const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (tag !== 'input' && tag !== 'textarea' && !isAnswerCardActive && !isCustomInputOpen && !isTextInputFocusedOrCustomOpen()) {
    const digit = getDigitFromKeyEvent(e);
    if (digit !== null && digit >= 1 && digit <= 9) {
      e.preventDefault();
      const digitIndex = digit - 1;
      executeQuickPromptByIndex(digitIndex);
    }
  }
});

// Ensure window is immediately focusable & clickable when mouse enters toolbar
window.addEventListener('mouseenter', () => {
  if (window.electronAPI && window.electronAPI.setToolbarFocusable) {
    window.electronAPI.setToolbarFocusable(true);
  }
});

function getScreenPromptForCategory(promptId) {
  switch (promptId) {
    case 'answer':
      return 'ตอบคำถาม แก้โจทย์ หรือให้คำตอบที่ถูกต้อง แม่นยำ ชัดเจน ตรงประเด็น และครบถ้วนที่สุดจากสิ่งที่ปรากฏในภาพนี้ (หากเป็นคำถามปรนัยให้ระบุตัวเลือกที่ถูกพร้อมเหตุผลประกอบ, หากมีหลายหัวข้อหรือหลายประเด็นให้จัดเป็น bullet points พร้อมตัวหนา เช่น * **หัวข้อ:** คำอธิบาย, หากเป็นการคำนวณให้ใช้ LaTeX $...$ หรือ $$...$$)';
    case 'explain':
      return 'อธิบายสิ่งที่ปรากฏในภาพนี้อย่างละเอียด ถูกต้อง ชัดเจน สละสลวย เข้าใจง่าย และครบถ้วนทุกประเด็น (หากมีหลายหัวข้อให้จัดเป็น bullet points พร้อมตัวหนา เช่น * **หัวข้อ:** คำอธิบาย)';
    case 'summarize':
      return 'สรุปประเด็นสำคัญของเนื้อหาหรือข้อความในภาพนี้เป็นข้อๆ ให้ครอบคลุม ชัดเจน สละสลวย และครบถ้วนทุกประเด็นสำคัญ (ห้ามตอบคำถามหรือแก้ปัญหา)';
    case 'translate':
    case 'translate_th':
      return 'แปลข้อความตัวอักษรทั้งหมดที่ปรากฏในภาพนี้อย่างถูกต้อง สละสลวย เป็นธรรมชาติ ตรงตัว 100% ครบถ้วนทุกประโยคและย่อหน้า คงโครงสร้างเดิม ย่อหน้าเดิม และ bullet points (หากข้อความเป็นภาษาต่างประเทศให้แปลเป็นภาษาไทย หากข้อความเป็นภาษาไทยให้แปลเป็นภาษาอังกฤษ ห้ามตอบคำถามหรือแก้ปัญหา แสดงเฉพาะคำแปลเท่านั้น)';
    case 'proofread':
      return 'ตรวจแก้คำผิดและขัดเกลาไวยากรณ์ของข้อความที่ปรากฏในภาพนี้ให้ถูกต้องสมบูรณ์และสละสลวย แสดงข้อความฉบับแก้ไขที่สมบูรณ์ทันที และสรุปจุดแก้ไขสั้นๆ';
    case 'shorten':
      return 'ย่อข้อความหรือเนื้อหาสำคัญที่ปรากฏในภาพนี้ให้กระชับ ชัดเจน โดยยังคงข้อเท็จจริงและสาระสำคัญครบถ้วน 100% คงโครงสร้างเดิม (ห้ามตอบคำถาม)';
    case 'continue_writing':
      return '[ภารกิจ: เขียนขยายความเนื้อหาหรือประเด็นต่อจากข้อความที่ปรากฏในภาพนี้ โดยเขียนต่อยอดในมุมมองเดียวกันอย่างลื่นไหล ห้ามตอบคำถามเด็ดขาด ห้ามตอบรับ ห้ามพิมพ์ "คำตอบคือ" หรือ "ได้ครับ"]\n\nข้อความที่เขียนต่อขยายบริบท (เริ่มเขียนต่อทันที):';
    case 'define':
      return 'อธิบายว่าคำศัพท์หรือหัวข้อเป้าหมายที่ปรากฏในภาพนี้คืออะไร มีความหมาย ความเป็นมา หรือหลักการทำงานอย่างไร อธิบายอย่างละเอียด ชัดเจน สละสลวย และตรงประเด็น';
    case 'ocr':
      return 'ถอดและคัดลอกข้อความตัวอักษรทุกคำ ทุกภาษาที่ปรากฏในภาพนี้ 100% ตามต้นฉบับอย่างเป็นข้อมูลดิบ (Raw Data) ครบถ้วนสมบูรณ์ ไม่ตกหล่น คงการขึ้นบรรทัดใหม่ ย่อหน้า และตาราง Markdown ให้ตรงกับภาพ ห้ามแปล ห้ามสรุป ห้ามแต่งเติม ห้ามใส่คำอธิบายนำหน้าหรือลงท้ายเด็ดขาด เริ่มแสดงข้อความที่ถอดได้ทันทีโดยไม่มีคำนำหน้า ไม่อารัมภบท ไม่ทักทาย';
    default:
      return 'วิเคราะห์และให้คำตอบจากภาพนี้อย่างถูกต้อง ครบถ้วน และตรงประเด็น';
  }
}

function handleOpenToolbar({ text, prompts, image, cropBox, sourceType, autoExecuteCategory }) {
  currentCapturedText = (text || '').trim();
  currentCapturedImage = image || null;
  currentCropBox = cropBox || null;
  currentSourceType = sourceType || (image ? 'screen' : 'text');
  currentQuickPrompts = Array.isArray(prompts) && prompts.length > 0 ? prompts : [];

  const container = document.getElementById('quickTextContainer');
  if (container) {
    container.classList.remove('closing');
  }

  // Reset custom input box & answer card
  isCustomInputOpen = false;
  const toolbar = document.getElementById('quickTextToolbar');
  if (toolbar) toolbar.classList.remove('custom-mode');

  const customBox = document.getElementById('quickCustomBox');
  if (customBox) customBox.style.display = 'none';

  const actionsList = document.getElementById('quickActionsList');
  if (actionsList) actionsList.style.display = 'flex';

  const cancelBtn = document.getElementById('quickCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  const answerCard = document.getElementById('quickAnswerCard');
  if (answerCard) answerCard.style.display = 'none';

  if (window.electronAPI && window.electronAPI.setToolbarAnswerActive) {
    window.electronAPI.setToolbarAnswerActive(false);
  }

  // Sync model selector dropdown with current config
  if (window.electronAPI && window.electronAPI.getConfig) {
    window.electronAPI.getConfig().then(cfg => {
      cachedConfig = cfg;
      if (cfg && cfg.defaultModel) {
        currentActiveToolbarModel = cfg.defaultModel;
        updateCustomModelDropdownUI(cfg.defaultModel);
      }
    }).catch(() => {
      updateCustomModelDropdownUI(currentActiveToolbarModel);
    });
  } else {
    updateCustomModelDropdownUI(currentActiveToolbarModel);
  }

  // Render buttons
  renderQuickActionsToolbar();

  // If a category was chosen from the native selection overlay (e.g. from C++ overlay toolbar 1-8 or ?), execute directly!
  if (autoExecuteCategory) {
    if (autoExecuteCategory === 'custom_ask') {
      toggleQuickCustomInput(true);
    } else {
      executeQuickPrompt(autoExecuteCategory);
    }
  } else {
    // Reset window height to 46px and ensure dynamic width fits toolbar with generous margin
    if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
      const tbEl = document.getElementById('quickTextToolbar');
      const reqW = tbEl ? Math.max(898, Math.ceil(tbEl.scrollWidth || tbEl.offsetWidth) + 4) : 920; // Signature compat: Math.max(1200, Math.ceil(tbEl.scrollWidth) + 40) // Signature compat: Math.max(1180, Math.ceil(tbEl.scrollWidth) + 36) // Signature compat: Math.max(1060, Math.ceil(tbEl.scrollWidth) + 36)
      window.electronAPI.resizeToolbarWindow({ width: reqW, height: 46 });
      requestAnimationFrame(() => {
        const measuredTb = document.getElementById('quickTextToolbar');
        if (measuredTb && window.electronAPI && window.electronAPI.resizeToolbarWindow) {
          const dynamicW = Math.max(898, Math.ceil(measuredTb.scrollWidth || measuredTb.offsetWidth) + 4);
          if (dynamicW > reqW) {
            window.electronAPI.resizeToolbarWindow({ width: dynamicW, height: 46 });
          }
        }
      });
    }
  }
}

function renderQuickActionsToolbar(force = false) {
  const actionsList = document.getElementById('quickActionsList');
  if (!actionsList) return;

  const numberedPrompts = currentQuickPrompts.filter(p => p.enabled && p.id !== 'custom_ask' && p.name !== 'ถามเอง');

  // If already rendered with exact prompt count, reuse existing DOM buttons for instant 0ms display
  if (!force && actionsList.children.length === Math.min(9, numberedPrompts.length)) {
    return;
  }
  actionsList.innerHTML = '';

  numberedPrompts.slice(0, 9).forEach((prompt, index) => {
    const btn = document.createElement('button');
    btn.className = 'quick-action-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('draggable', 'false');
    btn.style.animationDelay = '0ms'; /* Instant 0ms display */
    /* Signature compat: animationDelay = `${index * 15}ms`; */
    btn.title = `กด [${index + 1}] หรือคลิกเพื่อ${prompt.name}`;

    btn.innerHTML = `
      <span class="quick-action-num">${index + 1}</span>
      <span class="quick-action-label">${prompt.name}</span>
    `;

    let lastTriggerTime = 0;
    const triggerAction = (e) => {
      if (Date.now() - lastTriggerTime < 350) return;
      lastTriggerTime = Date.now();
      if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
      }
      executeQuickPrompt(prompt.id);
    };

    btn.addEventListener('click', triggerAction);
    btn.addEventListener('pointerdown', (e) => {
      if (e.button === 0) triggerAction(e);
    });
    btn.addEventListener('mousedown', (e) => {
      if (e.button === 0) triggerAction(e);
    });
    btn.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        triggerAction(e);
      }
    });

    actionsList.appendChild(btn);
  });

  // Standalone ? button for "ถามเอง"
  const standaloneCustomBtn = document.getElementById('quickCustomToggleBtn');
  if (standaloneCustomBtn) {
    standaloneCustomBtn.style.animationDelay = '0ms'; /* Instant 0ms display */
    /* Signature compat: standaloneCustomBtn.style.animationDelay = `${numberedPrompts.length * 15}ms`; */
    standaloneCustomBtn.style.display = 'inline-flex';
    if (!standaloneCustomBtn.dataset.boundEvents) {
      standaloneCustomBtn.dataset.boundEvents = 'true';
      let lastCustomTrigger = 0;
      const triggerCustom = (e) => {
        if (Date.now() - lastCustomTrigger < 350) return;
        lastCustomTrigger = Date.now();
        if (e) {
          try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
        }
        toggleQuickCustomInput();
      };
      standaloneCustomBtn.addEventListener('click', triggerCustom);
      standaloneCustomBtn.addEventListener('pointerdown', (e) => {
        if (e.button === 0) triggerCustom(e);
      });
      standaloneCustomBtn.addEventListener('mousedown', (e) => {
        if (e.button === 0) triggerCustom(e);
      });
    }
  }

  // Cancel button
  const cancelBtn = document.getElementById('quickCancelBtn');
  if (cancelBtn && !cancelBtn.dataset.boundEvents) {
    cancelBtn.dataset.boundEvents = 'true';
    let lastCancelTrigger = 0;
    const triggerCancel = (e) => {
      if (Date.now() - lastCancelTrigger < 350) return;
      lastCancelTrigger = Date.now();
      if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
      }
      closeQuickTextUI();
    };
    cancelBtn.addEventListener('click', triggerCancel);
    cancelBtn.addEventListener('pointerdown', (e) => {
      if (e.button === 0) triggerCancel(e);
    });
    cancelBtn.addEventListener('mousedown', (e) => {
      if (e.button === 0) triggerCancel(e);
    });
  }
}

function executeQuickPromptByIndex(index) {
  if (isTextInputFocusedOrCustomOpen()) return;
  const numberedPrompts = currentQuickPrompts.filter(p => p.enabled && p.id !== 'custom_ask' && p.name !== 'ถามเอง');
  if (index >= 0 && index < numberedPrompts.length) {
    executeQuickPrompt(numberedPrompts[index].id);
  } else if (index === numberedPrompts.length) {
    toggleQuickCustomInput();
  }
}

// === AUTOMATIC MATH PROBLEM & CODE EXECUTION DETECTOR ===
function isMathProblem(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (!clean) return false;

  const thaiMathRegex = /(?:โจทย์|คำนวณ|แก้สมการ|หาค่า|จงหา|ผลลัพธ์|เศษส่วน|ทศนิยม|ร้อยละ|เปอร์เซ็นต์|สมการ|อสมการ|ฟังก์ชัน|อนุพันธ์|ดิฟ|อินทิกรัล|อินทิเกรต|เมทริกซ์|เวกเตอร์|ตรีโกณ|ตรีโกณมิติ|เรขาคณิต|พีชคณิต|แคลคูลัส|ความน่าจะเป็น|สถิติ|พื้นที่|ปริมาตร|ความชัน|เส้นรอบรูป|ยกกำลัง|กำลังสอง|รากที่|พหุนาม|ลำดับ|อนุกรม|เลขคณิต|สูตรคูณ|ค่าเฉลี่ย|มัธยฐาน|ฐานนิยม|ส่วนเบี่ยงเบน|สมการเชิงเส้น|กราฟพาราโบลา|ไฮเพอร์โบลา|วงรี)/i;
  if (thaiMathRegex.test(clean)) return true;

  const englishMathRegex = /\b(?:math|calculate|compute|solve|equation|equations|evaluate|eval|integral|integrate|derivative|differentiate|matrix|matrices|vector|vectors|algebra|calculus|trigonometry|geometry|probability|statistics|fraction|fractions|percentage|polynomial|logarithm|factorial|pythagorean|arithmetic|hypotenuse|parabola|ellipse|hyperbola|determinant|eigenvalue|eigenvector|variance|standard deviation|linear equation|quadratic)\b/i;
  if (englishMathRegex.test(clean)) return true;

  const latexMathRegex = /\\(?:frac|sqrt|sum|int|lim|alpha|beta|gamma|theta|pi|cdot|times|div|pm|leq|geq|neq|approx|infty|partial|Delta|nabla|prod|coprod|oint)/;
  if (latexMathRegex.test(clean)) return true;

  const equalsEquationRegex = /(?:[\da-zA-Z\(\)\^+\-*/\s]{2,})\s*=\s*(?:[\da-zA-Z\(\)\^+\-*/\s]{1,})/;
  if (equalsEquationRegex.test(clean) && /[\d+\-*/\^=]/.test(clean)) return true;

  const arithmeticRegex = /\d+\s*[\+\-\*\/×÷\^%]\s*\d+/;
  if (arithmeticRegex.test(clean)) return true;

  const mathFuncRegex = /\b(?:sin|cos|tan|cot|sec|csc|log|ln|sqrt|exp|asin|acos|atan)\s*\(/i;
  if (mathFuncRegex.test(clean)) return true;

  return false;
}

// --- FAST SSE PARSER FOR DIRECT RENDERER STREAMING (WITH CODE EXECUTION SUPPORT) ---
function fastExtractSsePartText(jsonStr, { backgroundCode = false } = {}) {
  try {
    const parsed = JSON.parse(jsonStr);
    const candidate = parsed.candidates?.[0];
    const parts = candidate?.content?.parts;
    let text = '';
    let naturalText = '';
    const codeCalls = [];
    const codeResults = [];
    let hasCodeExecution = false;

    if (Array.isArray(parts)) {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p?.executableCode?.code) {
          hasCodeExecution = true;
          codeCalls.push(p.executableCode.code.trim());
          if (!backgroundCode) {
            text += `\n\`\`\`python\n# Code Execution (คำนวณและประมวลผลโค้ด)\n${p.executableCode.code.trim()}\n\`\`\`\n`;
          }
        }
        if (p?.codeExecutionResult?.output) {
          hasCodeExecution = true;
          codeResults.push(p.codeExecutionResult.output.trim());
          if (!backgroundCode) {
            text += `\n**ผลลัพธ์ Code Execution:**\n\`\`\`\n${p.codeExecutionResult.output.trim()}\n\`\`\`\n\n`;
          }
        }
        if (p?.text) {
          text += p.text;
          naturalText += p.text;
        }
      }
    }
    const finishReason = (candidate?.finishReason && typeof candidate.finishReason === 'string' && candidate.finishReason !== 'null')
      ? candidate.finishReason
      : null;
    const hasUsageMetadata = Boolean(parsed.usageMetadata);
    return { text, naturalText, codeCalls, codeResults, hasCodeExecution, finishReason, hasUsageMetadata };
  } catch (e) {
    return { text: '', naturalText: '', codeCalls: [], codeResults: [], hasCodeExecution: false, finishReason: null, hasUsageMetadata: false };
  }
}

let activeToolbarDirectStreamController = null;

function abortActiveToolbarStream() {
  if (activeToolbarDirectStreamController) {
    try { activeToolbarDirectStreamController.abort(); } catch (e) {}
    activeToolbarDirectStreamController = null;
  }
}

// // Unified Streaming Engine: Direct Renderer Stream with LRU Cache and IPC Fallback
async function runQuickPromptStreaming({ promptText, promptId, categoryName, imageBase64, modelId }) {
  abortActiveToolbarStream();
  const currentStreamCtrl = new AbortController();
  activeToolbarDirectStreamController = currentStreamCtrl;

  quickAnswerStreamText = '';

  const activeModel = modelId || currentActiveToolbarModel || 'gemini-3.8-flash';
  currentActiveToolbarModel = activeModel;

  const modelSel = document.getElementById('quickModelSelect');
  if (modelSel && modelSel.value !== activeModel) {
    modelSel.value = activeModel;
  }

  // Store params for re-querying when user switches model
  lastExecutedQuickPromptParams = {
    promptText,
    promptId,
    categoryName,
    imageBase64: imageBase64 || currentCapturedImage || null
  };

  const renderError = (errMsg) => {
    const body = document.getElementById('quickAnswerBody');
    const status = document.getElementById('quickAnswerStatus');
    if (status) status.innerText = 'เกิดข้อผิดพลาด';
    if (body) {
      body.innerHTML = `<div style="color:#ef4444; font-size:12px; padding:4px 0; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${errMsg || 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ'}</div>`;
    }
  };

  const imageToUse = imageBase64 || currentCapturedImage || null;

  // 1. Attempt Direct Renderer Streaming if electronAPI exposes getQuickStreamParams
  if (window.electronAPI && window.electronAPI.getQuickStreamParams) {
    try {
      const startTime = Date.now();
      const params = await window.electronAPI.getQuickStreamParams({
        promptText,
        promptId,
        categoryName,
        imageBase64: imageToUse,
        modelId: activeModel
      });

      const { apiKey, endpointsToTry, requestPayload, selectedModel, resolvedCategory, optimizedPrompt } = params;

      let streamSuccess = false;
      let usedEndpoint = selectedModel;
      let finalFullText = '';

      const hasImage = Boolean(imageToUse);
      const fetchTimeoutMs = hasImage ? 25000 : 8000;
      const ttftTimeoutMs = hasImage ? 25000 : 10000;

      for (let i = 0; i < (endpointsToTry ? endpointsToTry.length : 0); i++) {
        const endpoint = endpointsToTry[i];
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}:streamGenerateContent?alt=sse&key=${apiKey}`;

          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => {
            try { controller.abort(); } catch (e) {}
          }, fetchTimeoutMs);

          const epPayload = JSON.parse(JSON.stringify(requestPayload));
          if (epPayload.generationConfig) {
            if (endpoint.includes('lite') || endpoint.includes('flash-lite')) {
              delete epPayload.generationConfig.thinkingConfig;
            } else if (endpoint.includes('3.8')) {
              epPayload.generationConfig.thinkingConfig = { thinkingLevel: 'LOW' };
            } else if (!endpoint.includes('pro')) {
              epPayload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
            }
          }

          try {
            let response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(epPayload),
              signal: controller.signal
            });
            clearTimeout(fetchTimeout);

            if (!response.ok && response.status === 400 && requestPayload.generationConfig?.thinkingConfig) {
              try {
                const fallbackPayload = JSON.parse(JSON.stringify(requestPayload));
                delete fallbackPayload.generationConfig.thinkingConfig;
                const retryRes = await fetch(apiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(fallbackPayload)
                });
                if (retryRes.ok) response = retryRes;
              } catch (retryErr) {}
            }

            if (!response.ok) {
              if (response.status === 404 || response.status === 400 || response.status === 503 || response.status === 429) {
                continue;
              }
              const errText = await response.text().catch(() => '');
              throw new Error(`Gemini Stream Error (${endpoint}) [${response.status}]: ${errText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let sseBuffer = '';
            let streamEnded = false;
            let localFullText = '';
            let receivedFirstChunk = false;
            const rendererBackgroundCodeOutputs = [];

            const ttftTimer = setTimeout(() => {
              if (!receivedFirstChunk) {
                try { reader.cancel(); } catch (e) {}
                try { controller.abort(); } catch (e) {}
              }
            }, ttftTimeoutMs);

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              if (!receivedFirstChunk) {
                receivedFirstChunk = true;
                clearTimeout(ttftTimer);
                const status = document.getElementById('quickAnswerStatus');
                if (status && status.innerText.includes('กำลังประมวลผล')) {
                  status.innerText = 'กำลังตอบ...';
                }
              }

              sseBuffer += decoder.decode(value, { stream: true });
              const lines = sseBuffer.split('\n');
              sseBuffer = lines.pop();

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const jsonStr = trimmed.replace(/^data:\s*/, '');
                if (jsonStr === '[DONE]') {
                  streamEnded = true;
                  break;
                }

                const { text, codeResults, finishReason } = fastExtractSsePartText(jsonStr, { backgroundCode: true });
                if (codeResults && codeResults.length > 0) {
                  rendererBackgroundCodeOutputs.push(...codeResults);
                  const combined = rendererBackgroundCodeOutputs.join('\n');
                  const extractedAns = extractDirectAnswerFromOutput(combined);
                  if (extractedAns) {
                    localFullText = extractedAns;
                    quickAnswerStreamText = extractedAns;
                    scheduleStreamRender();
                    if (isMath || resolvedCategory === 'answer') {
                      streamEnded = true;
                      break;
                    }
                  }
                }
                if (text) {
                  localFullText += text;
                  quickAnswerStreamText = sanitizeRogueForeignScripts(quickAnswerStreamText + text);
                  scheduleStreamRender();
                  const status = document.getElementById('quickAnswerStatus');
                  if (status && status.innerText.includes('กำลังประมวลผล')) {
                    status.innerText = 'กำลังตอบ...';
                  }
                }

                if (finishReason) {
                  streamEnded = true;
                  break;
                }
              }

              if (streamEnded) {
                try { await reader.cancel(); } catch (e) {}
                break;
              }
            }
            clearTimeout(ttftTimer);

            // Trailing buffer flush
            if (sseBuffer && sseBuffer.trim().startsWith('data:')) {
              const jsonStr = sseBuffer.trim().replace(/^data:\s*/, '');
              if (jsonStr !== '[DONE]') {
                const { text, codeResults } = fastExtractSsePartText(jsonStr, { backgroundCode: true });
                if (codeResults && codeResults.length > 0) {
                  rendererBackgroundCodeOutputs.push(...codeResults);
                }
                if (text) {
                  localFullText += text;
                  quickAnswerStreamText = sanitizeRogueForeignScripts(quickAnswerStreamText + text);
                  scheduleStreamRender();
                }
              }
            }

            // If localFullText is empty because Python executed in background, extract answer cleanly
            if (!localFullText.trim() && rendererBackgroundCodeOutputs.length > 0) {
              const combined = rendererBackgroundCodeOutputs.join('\n');
              const extractedAns = extractDirectAnswerFromOutput(combined);
              if (extractedAns) {
                localFullText = extractedAns;
                quickAnswerStreamText = extractedAns;
                scheduleStreamRender();
              }
            }

            if (localFullText && localFullText.trim().length > 0) {
              finalFullText = stripLeadingAnswerPrefix(stripCodeExecutionAndExtractAnswer(localFullText) || localFullText);
              streamSuccess = true;
              usedEndpoint = endpoint;
              break;
            }
          } catch (fetchErr) {
            clearTimeout(fetchTimeout);
            console.warn(`[Direct Renderer Stream] Endpoint ${endpoint} failed:`, fetchErr.message);
            continue;
          }
        }

      if (streamSuccess) {
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        renderAnswerContent(finalFullText, true);
        const status = document.getElementById('quickAnswerStatus');
        if (status) status.innerText = `ตอบเสร็จสิ้น (${durationSec}s)`;

        if (window.electronAPI && window.electronAPI.saveQuickResponseCache) {
          window.electronAPI.saveQuickResponseCache({
            modelId: selectedModel,
            categoryName: resolvedCategory,
            promptText: optimizedPrompt,
            fullText: finalFullText,
            endpointUsed: usedEndpoint
          });
        }

        if (window.electronAPI && window.electronAPI.saveHistoryItem) {
          window.electronAPI.saveHistoryItem({
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('th-TH'),
            category: resolvedCategory,
            model: usedEndpoint || selectedModel,
            question: promptText || optimizedPrompt,
            fullText: finalFullText,
            durationSec: durationSec
          }).catch(() => {});
        }
        return;
      }
    } catch (directErr) {
      console.warn('[Direct Renderer Stream] Direct stream failed, falling back to IPC ask:', directErr.message);
    }
  }

  // 2. Fallback to Main Process IPC Streaming
  try {
    const res = await window.electronAPI.quickTextAsk({
      promptText,
      modelId: activeModel,
      promptId,
      categoryName,
      imageBase64: imageToUse
    });

    if (res && res.fullText) {
      renderAnswerContent(res.fullText, true);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    if (err.message && (err.message.includes('ยกเลิก') || err.message.includes('abort') || err.message.includes('cancel'))) {
      return;
    }
    renderError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ');
  }
}

async function executeQuickPrompt(promptId) {
  let prompt = currentQuickPrompts.find(p => p.id === promptId);
  if (!prompt) {
    prompt = {
      id: promptId,
      name: promptId === 'answer' ? 'คำตอบ' :
            promptId === 'explain' ? 'อธิบาย' :
            promptId === 'summarize' ? 'สรุป' :
            (promptId === 'translate_th' || promptId === 'translate') ? 'แปลภาษา' :
            promptId === 'proofread' ? 'ปรับปรุงการเขียน' :
            promptId === 'shorten' ? 'ทำให้สั้นลง' :
            promptId === 'continue_writing' ? 'เขียนต่อ' :
            promptId === 'define' ? 'คือ' :
            promptId === 'ocr' ? 'ถอดข้อความ' :
            promptId === 'custom_ask' ? 'ถามเอง' : 'วิเคราะห์'
    };
  }

  // If this option is "ถามเอง", open the custom ask input directly
  if (prompt.id === 'custom_ask' || prompt.name === 'ถามเอง') {
    toggleQuickCustomInput(true);
    return;
  }

  let finalPrompt = '';

  if (currentSourceType === 'screen' || currentCapturedImage) {
    // Screen area query: tailor prompt for image analysis
    finalPrompt = getScreenPromptForCategory(prompt.id);
  } else {
    // Text copy mode: check and retrieve text
    // 1. ตรวจสอบว่า currentCapturedText มีค่าหรือไม่
    // 2. ถ้ายังไม่มีค่า (หรือเป็นค่าว่าง): Always-Ready Fallback
    if (!currentCapturedText) {
      // 2.1 ลองเรียก copyAndGetSelectedText() หากยังไม่ได้ทำ
      if (window.electronAPI && window.electronAPI.copyAndGetSelectedText) {
        try {
          const copiedText = await window.electronAPI.copyAndGetSelectedText();
          if (copiedText && copiedText.trim().length > 0) {
            currentCapturedText = copiedText.trim();
          }
        } catch (e) {
          console.warn('Option copy error:', e);
        }
      }

      // 2.2 Clipboard fallback if copy didn't yield text
      if (window.electronAPI && window.electronAPI.getClipboardText) {
        try {
          const clip = await window.electronAPI.getClipboardText();
          if (clip && clip.trim().length > 0) {
            currentCapturedText = clip.trim();
          }
        } catch (e) {}
      }
    }

    // 3. หากตรวจสอบแล้วยังไม่มีข้อความจริงๆ ถึงจะแสดงการ์ดพร้อมกล่องพิมพ์ต่อ
    if (!currentCapturedText || currentCapturedText.trim().length === 0) {
      showQuickAnswerCard(prompt.name);
      const body = document.getElementById('quickAnswerBody');
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = 'ไม่พบข้อความ';
      if (body) {
        body.innerHTML = `
          <div style="padding: 10px; color: #475569; font-size: 13px; line-height: 1.6;">
            <div style="font-weight: 600; color: #334155; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ไม่พบข้อความที่คลุมดำไว้
            </div>
            <div style="margin-bottom: 8px;">กรุณาใช้เมาส์คลุมดำข้อความที่ต้องการถาม แล้วกดคีย์ลัดอีกครั้ง หรือพิมพ์ข้อความที่นี่เพื่อส่งให้ AI ทันที:</div>
            <div style="display:flex; gap:6px; margin-top: 8px;">
              <input type="text" id="quickFallbackInlineInput" class="form-input" placeholder="พิมพ์ข้อความหรือคำถามที่ต้องการ..." style="flex:1; padding:6px 10px; font-size:12.5px; border:1px solid #cbd5e1; border-radius:6px; outline:none;" onkeydown="if(event.key==='Enter'){ executeQuickPromptWithText('${prompt.id}', this.value); }">
              <button class="quick-card-btn" type="button" style="padding:6px 14px; background:#0284c7; color:#fff; border-color:#0284c7; font-weight:600;" onclick="executeQuickPromptWithText('${prompt.id}', document.getElementById('quickFallbackInlineInput').value)">ถาม AI</button>
            </div>
          </div>
        `;
        setTimeout(() => {
          const inp = document.getElementById('quickFallbackInlineInput');
          if (inp) inp.focus();
        }, 60);
      }
      return;
    }

    const template = prompt.template || '{text}';
    const textToUse = currentCapturedText;

    if (template.includes('{text}')) {
      if (template.includes('<<<TARGET_TEXT_START>>>')) {
        finalPrompt = template.replace(/\{text\}/g, textToUse);
      } else {
        const wrappedText = `<<<TARGET_TEXT_START>>>\n${textToUse}\n<<<TARGET_TEXT_END>>>`;
        finalPrompt = template.replace(/\{text\}/g, wrappedText);
      }
    } else {
      finalPrompt = `${template}\n\n<<<TARGET_TEXT_START>>>\n${textToUse}\n<<<TARGET_TEXT_END>>>`;
    }
  }

  showQuickAnswerCard(prompt.name);
  await runQuickPromptStreaming({
    promptText: finalPrompt,
    promptId: prompt.id,
    categoryName: prompt.name,
    imageBase64: currentCapturedImage
  });
}

async function executeQuickPromptWithText(promptId, text) {
  if (!text || !text.trim()) return;
  currentCapturedText = text.trim();
  await executeQuickPrompt(promptId);
}

function showQuickAnswerCard(badgeTitle) {
  const answerCard = document.getElementById('quickAnswerCard');
  const actionBadge = document.getElementById('quickAnswerActionBadge');
  const status = document.getElementById('quickAnswerStatus');
  const body = document.getElementById('quickAnswerBody');

  // Reset stream rendering state
  quickAnswerStreamText = '';
  lastRenderedText = '';
  lastRenderedHtml = '';
  lastFullParseTime = 0;
  isRenderScheduled = false;
  hasInitialResized = false;
  lastMathRenderTime = 0;
  hasRenderedFirstToken = false;

  const isMath = isMathProblem(currentCapturedText);
  if (isMath) {
    if (actionBadge) {
      actionBadge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> ${escapeHtml(badgeTitle)} (Code Execution)</span>`;
    }
    if (status) {
      status.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;color:#38bdf8;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> คำนวณและประมวลผลโค้ด...</span>`;
    }
  } else {
    if (actionBadge) actionBadge.innerText = badgeTitle;
    if (status) status.innerText = 'กำลังประมวลผล...';
  }

  // Display original source snippet so user clearly sees what text or screen area is being processed
  const banner = document.getElementById('sourceSnippetBanner');
  const snippet = document.getElementById('sourceSnippetText');
  if (banner && snippet) {
    if ((currentSourceType === 'screen' || currentCapturedImage) && currentCropBox) {
      snippet.innerText = `ภาพหน้าจอที่เลือก (${currentCropBox.w} × ${currentCropBox.h} px)`;
      banner.style.display = 'block';
    } else {
      const rawSrc = (currentCapturedText || '').trim().replace(/\s+/g, ' ');
      if (rawSrc) {
        snippet.innerText = rawSrc.slice(0, 85) + (rawSrc.length > 85 ? '...' : '');
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    }
  }

  if (body) {
    body.innerHTML = `
      <div style="padding: 4px 0;">
        <div class="skeleton-line" style="width: 85%;"></div>
        <div class="skeleton-line" style="width: 100%;"></div>
        <div class="skeleton-line" style="width: 60%;"></div>
      </div>
    `;
  }

  if (answerCard) answerCard.style.display = 'flex';
  isAnswerCardActive = true;

  // Inform main process that answer card is active (prevents outside clicks from dismissing answer window)
  if (window.electronAPI && window.electronAPI.setToolbarAnswerActive) {
    window.electronAPI.setToolbarAnswerActive(true);
  }

  // Enable window focus so user can click, highlight/select text, and copy (Ctrl+C)
  if (window.electronAPI && window.electronAPI.setToolbarFocusable) {
    window.electronAPI.setToolbarFocusable(true);
  }

  // Expand window height to accommodate answer card
  lastAutoExpandedHeight = 180;
  if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
    // Signature compat: window.electronAPI.resizeToolbarWindow({ height: 430 })
    // Signature compat: window.electronAPI.resizeToolbarWindow({ height: 280 })
    window.electronAPI.resizeToolbarWindow({ height: 180 });
  }
}

let quickSpeechSynthesisActive = false;

function stopQuickSpeak() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  quickSpeechSynthesisActive = false;
  const label = document.getElementById('quickSpeakLabel');
  const btn = document.getElementById('quickSpeakBtn');
  if (label) label.innerText = 'อ่านเสียง';
  if (btn) btn.classList.remove('speaking');
}

function toggleQuickSpeak() {
  if (quickSpeechSynthesisActive) {
    stopQuickSpeak();
    return;
  }

  const body = document.getElementById('quickAnswerBody');
  if (!body) return;
  const text = body.innerText ? body.innerText.trim() : '';
  if (!text) return;

  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Match Thai or English voice
  const hasThai = /[\u0E00-\u0E7F]/.test(text);
  utterance.lang = hasThai ? 'th-TH' : 'en-US';
  utterance.rate = 1.05;

  const label = document.getElementById('quickSpeakLabel');
  const btn = document.getElementById('quickSpeakBtn');
  if (label) label.innerText = 'หยุดพูด';
  if (btn) btn.classList.add('speaking');
  quickSpeechSynthesisActive = true;

  utterance.onend = () => {
    stopQuickSpeak();
  };
  utterance.onerror = () => {
    stopQuickSpeak();
  };

  window.speechSynthesis.speak(utterance);
}

// Transform raw Python Code Execution markdown blocks into an elegant, interactive collapsible card
function formatCodeExecutionBlock(text) {
  if (!text || typeof text !== 'string') return '';
  const regex = /```python\s*(?:#\s*Code Execution[^\n]*\n)?([\s\S]*?)```(?:\s*(?:\*\*ผลลัพธ์ Code Execution:\*\*|\*\*Code Execution Result:\*\*)\s*```(?:\w+)?\n?([\s\S]*?)```)?/gi;

  return text.replace(regex, (match, code, output) => {
    const cleanCode = (code || '').trim();
    const cleanOutput = (output || '').trim();
    if (!cleanCode && !cleanOutput) return match;

    const codeHtml = (typeof escapeHtml === 'function') ? escapeHtml(cleanCode) : cleanCode;
    const outputHtml = (typeof escapeHtml === 'function') ? escapeHtml(cleanOutput) : cleanOutput;

    return `\n<details class="code-execution-card code-execution-block" style="display: none !important;">
  <summary class="code-execution-summary" title="คลิกเพื่อขยายดูโค้ดและการคำนวณ">
    <div class="code-exec-summary-left">
      <span class="code-exec-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </span>
      <span class="code-exec-title">กระบวนการคำนวณ (Python Code Execution)</span>
    </div>
    <div class="code-exec-summary-right">
      <span class="code-exec-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 3px;"><polyline points="20 6 9 17 4 12"/></svg>คำนวณสำเร็จ 100%
      </span>
      <span class="code-exec-arrow">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </div>
  </summary>
  <div class="code-execution-content">
    <div class="code-exec-label">Python Script ที่ใช้ประมวลผล:</div>
    <pre class="code-exec-pre"><code class="language-python">${codeHtml}</code></pre>
    ${cleanOutput ? `<div class="code-exec-label">ผลลัพธ์การรัน (Console Output):</div><pre class="code-exec-output-pre"><code>${outputHtml}</code></pre>` : ''}
  </div>
</details>\n`;
  });
}

function stripLeadingAnswerPrefix(text) {
  if (!text || typeof text !== 'string') return '';
  let clean = text.trim();
  const prefixRegex = /^(?:[-*•]\s*)?(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?(?:คำตอบที่ถูกต้องคือ|คำตอบที่ถูกต้อง|คำตอบที่ได้คือ|คำตอบของโจทย์คือ|คำตอบข้อนี้คือ|คำตอบคือ|คำตอบ(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|ผลการ(?:แปล(?:ภาษา(?:ไทย|อังกฤษ)?)?|วิเคราะห์(?:ภาพ)?|สรุป|ปรับปรุง|ตรวจ(?:ข้อความ)?|ย่อ(?:ข้อความ)?|ถอดข้อความ|ดำเนินงาน)(?:\s*[:=\n]|\s*คือ|\s*(?:\*{1,3}|_{1,3}))|ผลลัพธ์(?:\s*[:=\n]|\s*คือ|\s*(?:\*{1,3}|_{1,3}))|คำแปล(?:ภาษาไทย|ภาษาอังกฤษ)?(?:\s*[:=\n]|\s*คือ|\s*มีดังนี้|\s*(?:\*{1,3}|_{1,3}))|(?:ข้อความ)?ฉบับ(?:แก้ไข|ปรับปรุง|ย่อ)(?:\s*[:=\n]|\s*คือ|\s*(?:\*{1,3}|_{1,3}))|ข้อความที่(?:แปล|ปรับปรุงแล้ว|ปรับปรุง|แก้ไข|ย่อแล้ว|ถอดได้)(?:\s*[:=\n]|\s*คือ|\s*(?:\*{1,3}|_{1,3}))|สรุป(?:ประเด็นสำคัญ|สาระสำคัญ|ได้ว่า|คือ)(?:\s*[:=])?|สรุป(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|คำอธิบาย(?:\s*[:=\n]|\s*คือ|\s*(?:\*{1,3}|_{1,3}))|(?:ความหมาย|คำนิยาม|นิยาม)(?:\s*[:=\n]|\s*คือ|\s*(?:\*{1,3}|_{1,3}))|ถอดข้อความ(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|ข้อความจากภาพ(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|Answer(?:\s+is)?(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|Correct\s+Answer(?:\s+is)?(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|Translation(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|Summary(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|Explanation(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|Definition(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3}))|Result(?:\s*[:=\n]|\s*(?:\*{1,3}|_{1,3})))(?:\*{1,3}|_{1,3})?\s*[:=]?\s*/i;

  let prev = '';
  let count = 0;
  while (clean !== prev && count < 3) {
    prev = clean;
    clean = clean.replace(prefixRegex, '').trim();
    count++;
  }
  return clean;
}

function extractDirectAnswerFromOutput(output) {
  if (!output || typeof output !== 'string') return '';
  if (/(?:Traceback\s+\(most\s+recent\s+call\s+last\)|SyntaxError:|NameError:|TypeError:|ZeroDivisionError:)/i.test(output)) {
    return '';
  }
  const lines = output.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(/(?:(?:minimum|maximum|optimum|final)?\s*(?:value|answer|result|val|sol|solution|คำตอบ)|direct\s+substitution)[:=]\s*(.+)$/i);
    if (match && match[1]) {
      let val = match[1].trim();
      if (/^\d+\.0$/.test(val)) val = val.slice(0, -2);
      return stripLeadingAnswerPrefix(val);
    }
  }

  const lastLine = lines[lines.length - 1];
  if (lastLine.length < 100) {
    let cleanLast = lastLine.replace(/^\[|\s*\]$/g, '').trim();
    if (/^\d+\.0$/.test(cleanLast)) cleanLast = cleanLast.slice(0, -2);
    return stripLeadingAnswerPrefix(cleanLast || lastLine);
  }

  return stripLeadingAnswerPrefix(lastLine);
}

function stripCodeExecutionAndExtractAnswer(text) {
  if (!text || typeof text !== 'string') return '';

  let collectedOutputs = [];
  const outRegex = /(?:\*\*ผลลัพธ์ Code Execution:\*\*|\*\*Code Execution Result:\*\*|ผลลัพธ์ Code Execution:)\s*(?:```(?:\w+)?\n?([\s\S]*?)```|([^\n`]+))/gi;
  let outMatch;
  while ((outMatch = outRegex.exec(text)) !== null) {
    const outContent = (outMatch[1] || outMatch[2] || '').trim();
    if (outContent) {
      collectedOutputs.push(outContent);
    }
  }

  let cleaned = text.replace(/```python\s*#\s*Code Execution[^\n]*[\s\S]*?(?:```|$)/gi, '');
  cleaned = cleaned.replace(/(?:\*\*ผลลัพธ์ Code Execution:\*\*|\*\*Code Execution Result:\*\*|ผลลัพธ์ Code Execution:)\s*(?:```[\s\S]*?(?:```|$)|[^\n`]+(?:\n|$))?/gi, '');
  cleaned = cleaned.replace(/^\s*#\s*Code Execution\s*\(คำนวณและประมวลผลโค้ด\)[^\n]*/gim, '');
  cleaned = cleaned.replace(/^\s*ผลลัพธ์ Code Execution:\s*$/gim, '');
  cleaned = cleaned.trim();

  if (cleaned) {
    return stripLeadingAnswerPrefix(cleaned);
  }

  if (collectedOutputs.length > 0) {
    const combinedOutput = collectedOutputs.join('\n');
    return stripLeadingAnswerPrefix(extractDirectAnswerFromOutput(combinedOutput));
  }

  return '';
}

function formatQuickTextMarkdown(rawText) {
  // Signature compat: return rawText;
  if (!rawText) return '';
  let cleanText = rawText.replace(/^\s*(?:<{2,}[^>\n]*>{2,}|<{2,}|>{2,}|<<\s*>>)\s*\n?/i, '');
  cleanText = cleanText.replace(/\n?\s*(?:<{2,}[^>\n]*>{2,}|<{2,}|>{2,}|<<\s*>>)\s*$/i, '');
  cleanText = cleanText
    .replace(/<<<TARGET_TEXT_(?:START|END)>>>/gi, '')
    .replace(/<+TARGET_TEXT[^>]*>+/gi, '')
    .replace(/<<<|>>>/g, '')
    .replace(/<<>>/g, '')
    .replace(/<{2,}\s*>{2,}/g, '')
    .replace(/<{2,}/g, '')
    .replace(/>{2,}/g, '');
  cleanText = cleanText
    .replace(/^\s*(?:<{2,}[^>\n]*>{2,}|<{2,}|>{2,}|<<\s*>>)\s*\n?/gm, '')
    .replace(/\n?\s*(?:<{2,}[^>\n]*>{2,}|<{2,}|>{2,}|<<\s*>>)\s*$/gm, '');
  const actionBadge = document.getElementById('quickAnswerActionBadge');
  const isTranslation = actionBadge && (actionBadge.innerText.includes('แปล') || actionBadge.innerText.includes('Translate'));
  if (isTranslation) {
    if (currentCapturedText && !/^\s*[-*•]\s+/m.test(currentCapturedText)) {
      cleanText = cleanText.replace(/^\s*[-*•]\s+/gm, '');
    }
    return stripLeadingAnswerPrefix(cleanText);
  }
  // User directive: ไม่ต้องแสดง Code Execution ให้แสดงคำตอบที่ได้เลย สั้นๆได้ใจความ
  cleanText = stripCodeExecutionAndExtractAnswer(cleanText);
  return stripLeadingAnswerPrefix(cleanText);
}

let lastAutoExpandedHeight = 0;

function autoExpandToolbarToContent(isFinal = false) {
  if (userResizedToolbarAnswerHeight) {
    return;
  }
  const card = document.getElementById('quickAnswerCard');
  const tb = document.getElementById('quickTextToolbar');
  const body = document.getElementById('quickAnswerBody');
  if (!card || card.style.display === 'none') return;

  const tbH = (tb && tb.offsetHeight > 0) ? tb.offsetHeight : 44;
  const cardHeader = card.querySelector('.quick-answer-header');
  const headerH = (cardHeader && cardHeader.offsetHeight > 0) ? cardHeader.offsetHeight : 42;
  
  const snippetBanner = document.getElementById('sourceSnippetBanner');
  const bannerH = (snippetBanner && snippetBanner.style.display !== 'none' && snippetBanner.offsetHeight > 0)
    ? snippetBanner.offsetHeight
    : 0;

  const resizeBottom = document.getElementById('quickAnswerResizeBottom');
  const resizeH = (resizeBottom && resizeBottom.offsetHeight > 0) ? resizeBottom.offsetHeight : 10;

  const bodyScrollH = body ? Math.max(body.scrollHeight, body.offsetHeight, 60) : 60;
  const cardContentH = headerH + bannerH + bodyScrollH + resizeH + 24;
  const totalNeededH = tbH + 8 + cardContentH + 16;
  
  const maxAllowedH = Math.max(280, Math.min(800, (window.screen.availHeight || 900) - 100));
  const targetH = Math.max(180, Math.min(maxAllowedH, Math.round(totalNeededH)));

  if (isFinal || targetH > lastAutoExpandedHeight || Math.abs(targetH - lastAutoExpandedHeight) >= 2) {
    lastAutoExpandedHeight = targetH;
    if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
      window.electronAPI.resizeToolbarWindow({ height: targetH });
    }
  }
}

let lastFullParseTime = 0;
let lastRenderedText = '';
let lastRenderedHtml = '';

function renderAnswerContent(text, isFinal = false) {
  const body = document.getElementById('quickAnswerBody');
  if (!body) return;

  const formattedText = formatQuickTextMarkdown(text);
  if (!isFinal && formattedText === lastRenderedText) {
    autoExpandToolbarToContent(isFinal);
    return;
  }
  lastRenderedText = formattedText;

  if (!formattedText && !isFinal) {
    autoExpandToolbarToContent(isFinal);
    return;
  }

  const now = Date.now();

  // Fluid frame-synchronized render throttle (24ms ~ 45-60 FPS) for buttery smooth streaming
  const shouldFullParse = isFinal || (now - lastFullParseTime >= 24) || formattedText.endsWith('\n');

  if (shouldFullParse && typeof marked !== 'undefined') {
    lastFullParseTime = now;
    let html = marked.parse(formattedText || '');
    if (typeof DOMPurify !== 'undefined') {
      html = DOMPurify.sanitize(html, { ADD_TAGS: ['details', 'summary'] });
    }
    // Add pulsing animated cursor during active streaming for smooth visual feedback
    if (!isFinal) {
      html += '<span class="stream-blink-cursor"></span>';
    }
    // Skip redundant DOM update if HTML unchanged (avoids layout thrashing)
    if (html !== lastRenderedHtml) {
      lastRenderedHtml = html;
      body.innerHTML = html;
      if (!body._hasCodeExecToggleListener) {
        body._hasCodeExecToggleListener = true;
        body.addEventListener('toggle', (e) => {
          if (e.target && e.target.classList && e.target.classList.contains('code-execution-card')) {
            autoExpandToolbarToContent(true);
          }
        }, true);
      }
    }

    // Smooth fluid auto-scroll following live generation
    const scrollDiff = body.scrollHeight - body.scrollTop - body.clientHeight;
    if (scrollDiff < 140) {
      body.scrollTo({
        top: body.scrollHeight,
        behavior: 'smooth'
      });
    }
  } else if (!shouldFullParse) {
    // Throttled frame
  } else {
    body.innerText = formattedText || '';
    body.scrollTop = body.scrollHeight;
  }

  // Throttled and conditional KaTeX math rendering: skips expensive DOM walking unless math symbols are present
  const hasMath = formattedText && (formattedText.includes('$') || formattedText.includes('\\(') || formattedText.includes('\\['));
  if (typeof renderMathInElement === 'function' && hasMath && (isFinal || now - lastMathRenderTime > 300)) {
    lastMathRenderTime = now;
    try {
      renderMathInElement(body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {}
  }

  // Dynamically auto-expand window height downward following the streamed answer
  autoExpandToolbarToContent(isFinal);
  requestAnimationFrame(() => {
    autoExpandToolbarToContent(isFinal);
  });
}

function copyQuickAnswer() {
  const selection = (window.getSelection && window.getSelection().toString()) ? window.getSelection().toString().trim() : '';
  const body = document.getElementById('quickAnswerBody');
  const text = selection || (body ? (body.innerText || '') : '');
  if (!text) return;

  const onCopied = () => {
    const label = document.getElementById('quickCopyLabel');
    if (label) {
      const orig = label.innerText;
      label.innerText = 'คัดลอกแล้ว!';
      setTimeout(() => { label.innerText = orig; }, 1400);
    }
  };

  if (window.electronAPI && window.electronAPI.writeClipboardText) {
    window.electronAPI.writeClipboardText(text);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onCopied).catch(onCopied);
  } else {
    onCopied();
  }
}

function toggleQuickCustomInput(forceState) {
  if (typeof forceState === 'boolean') {
    isCustomInputOpen = forceState;
  } else {
    isCustomInputOpen = !isCustomInputOpen;
  }
  const toolbar = document.getElementById('quickTextToolbar');
  const actionsList = document.getElementById('quickActionsList');
  const customToggleBtn = document.getElementById('quickCustomToggleBtn');
  const cancelBtn = document.getElementById('quickCancelBtn');
  const customBox = document.getElementById('quickCustomBox');
  const input = document.getElementById('quickCustomInput');

  if (isCustomInputOpen) {
    if (actionsList) actionsList.style.display = 'none';
    if (customToggleBtn) customToggleBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (customBox) customBox.style.display = 'flex';
    if (toolbar) toolbar.classList.add('custom-mode');

    if (window.electronAPI && window.electronAPI.copyAndGetSelectedText) {
      window.electronAPI.copyAndGetSelectedText().then(clip => {
        if (clip) currentCapturedText = clip.trim();
      }).catch(() => {});
    } else if (!currentCapturedText && window.electronAPI && window.electronAPI.getClipboardText) {
      window.electronAPI.getClipboardText().then(clip => {
        if (clip) currentCapturedText = clip.trim();
      }).catch(() => {});
    }

    // Expand window and enable focusable for keyboard input
    if (window.electronAPI) {
      if (window.electronAPI.setToolbarCustomAskOpen) {
        window.electronAPI.setToolbarCustomAskOpen(true);
      }
      if (window.electronAPI.resizeToolbarWindow) {
        window.electronAPI.resizeToolbarWindow({ height: 86 });
        window.electronAPI.resizeToolbarWindow({ width: 920, height: 46 });
      }
      if (window.electronAPI.setToolbarFocusable) {
        window.electronAPI.setToolbarFocusable(true);
      }
    }
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
  } else {
    if (customBox) customBox.style.display = 'none';
    if (toolbar) toolbar.classList.remove('custom-mode');
    if (actionsList) actionsList.style.display = 'flex';
    if (customToggleBtn) {
      const enabledPrompts = currentQuickPrompts.filter(p => p.enabled);
      const hasCustomInList = enabledPrompts.slice(0, 9).some(p => p.id === 'custom_ask' || p.name === 'ถามเอง');
      customToggleBtn.style.display = hasCustomInList ? 'none' : 'inline-flex';
    }
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    if (window.electronAPI) {
      if (window.electronAPI.setToolbarCustomAskOpen) {
        window.electronAPI.setToolbarCustomAskOpen(false);
      }
      if (window.electronAPI.setToolbarFocusable) {
        window.electronAPI.setToolbarFocusable(false);
      }
      if (window.electronAPI.resizeToolbarWindow) {
        window.electronAPI.resizeToolbarWindow({ height: 46 });
        const tbEl = document.getElementById('quickTextToolbar');
        const reqW = tbEl ? Math.max(898, Math.ceil(tbEl.scrollWidth || tbEl.offsetWidth) + 4) : 920; // Signature compat: Math.max(1180, Math.ceil(tbEl.scrollWidth) + 36) // Signature compat: Math.max(1060, Math.ceil(tbEl.scrollWidth) + 36)
        window.electronAPI.resizeToolbarWindow({ width: reqW, height: 46 });
      }
    }
  }
}

function handleQuickCustomKeyDown(e) {
  if (e.isComposing || e.keyCode === 229) {
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    submitQuickCustomAsk();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    toggleQuickCustomInput(false);
  }
}

async function submitQuickCustomAsk() {
  const input = document.getElementById('quickCustomInput');
  if (!input) return;
  const userCmd = input.value.trim();
  if (!userCmd) return;

  let finalPrompt = '';
  let imageToSend = null;

  if (currentSourceType === 'screen' || currentCapturedImage) {
    imageToSend = currentCapturedImage;
    finalPrompt = userCmd;
  } else {
    if (window.electronAPI && window.electronAPI.copyAndGetSelectedText) {
      try {
        const clip = await window.electronAPI.copyAndGetSelectedText();
        if (clip) currentCapturedText = clip.trim();
      } catch (e) {}
    } else if (!currentCapturedText && window.electronAPI && window.electronAPI.getClipboardText) {
      try {
        const clip = await window.electronAPI.getClipboardText();
        if (clip) currentCapturedText = clip.trim();
      } catch (e) {}
    }

    const textToUse = currentCapturedText || '';
    if (userCmd.includes('{text}')) {
      finalPrompt = userCmd.replace(/\{text\}/g, textToUse);
    } else if (textToUse) {
      finalPrompt = `${userCmd}\n\n${textToUse}`;
    } else {
      finalPrompt = userCmd;
    }
  }

  input.value = '';
  toggleQuickCustomInput(false);

  showQuickAnswerCard('คำถามของคุณ');
  await runQuickPromptStreaming({
    promptText: finalPrompt,
    promptId: 'custom_ask',
    categoryName: 'คำถามของคุณ',
    imageBase64: imageToSend
  });
}

function handleCloseUI() {
  const container = document.getElementById('quickTextContainer');
  if (container) {
    container.classList.add('closing');
  }
}

function closeQuickTextUI() {
  abortActiveToolbarStream();
  if (window.electronAPI && window.electronAPI.cancelAiGeneration) {
    try { window.electronAPI.cancelAiGeneration(); } catch (e) {}
  }
  currentCapturedImage = null;
  currentCropBox = null;
  currentSourceType = 'text';
  isAnswerCardActive = false;
  stopQuickSpeak();
  handleCloseUI();
  if (window.electronAPI) {
    if (window.electronAPI.setToolbarFocusable) {
      window.electronAPI.setToolbarFocusable(false);
    }
    if (window.electronAPI.setToolbarAnswerActive) {
      window.electronAPI.setToolbarAnswerActive(false);
    }
    if (window.electronAPI.closeQuickText) {
      window.electronAPI.closeQuickText();
    }
  }
}

// === ROCK-SOLID TOOLBAR DRAGGING & GRABBING CURSOR ===
let isGlobalToolbarDragging = false;
let globalToolbarDragEndTime = 0;

function initToolbarDragging() {
  const dragHandles = document.querySelectorAll('.drag-handle, .header-drag-handle, .quick-answer-header');
  if (!dragHandles || dragHandles.length === 0) return;

  dragHandles.forEach(handle => {
    const startDragHandler = (e) => {
      // Only primary mouse button (left-click)
      if (e.button !== 0) return;

      // If user clicked inside interactive controls (buttons, inputs, dropdown, links), do NOT drag
      if (e.target && e.target.closest && e.target.closest('button, .custom-model-dropdown, input, textarea, a, select')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Debounce duplicate pointerdown + mousedown events
      if (isGlobalToolbarDragging || (Date.now() - globalToolbarDragEndTime < 100)) {
        return;
      }

      let lastScreenX = e.screenX;
      let lastScreenY = e.screenY;
      isGlobalToolbarDragging = true;

      document.body.classList.add('is-dragging-window');
      handle.classList.add('dragging');

      if (window.electronAPI && window.electronAPI.setToolbarDragging) {
        window.electronAPI.setToolbarDragging(true);
      }

      const onMouseMove = (moveEvent) => {
        if (!isGlobalToolbarDragging) return;
        // Strict Left Button Hold Check: buttons must be 1 (primary button held down)
        if (moveEvent.buttons !== 1) {
          onMouseUp(moveEvent);
          return;
        }
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        const deltaX = moveEvent.screenX - lastScreenX;
        const deltaY = moveEvent.screenY - lastScreenY;
        if (deltaX === 0 && deltaY === 0) return;

        lastScreenX = moveEvent.screenX;
        lastScreenY = moveEvent.screenY;

        if (window.electronAPI && window.electronAPI.moveToolbarBy) {
          window.electronAPI.moveToolbarBy({ deltaX, deltaY, dx: deltaX, dy: deltaY });
        }
      };

      const onMouseUp = (upEvent) => {
        if (!isGlobalToolbarDragging) return;
        isGlobalToolbarDragging = false;
        globalToolbarDragEndTime = Date.now();
        if (upEvent) {
          try {
            upEvent.preventDefault();
            upEvent.stopPropagation();
          } catch (err) {}
        }
        document.body.classList.remove('is-dragging-window');
        handle.classList.remove('dragging');
        window.removeEventListener('mousemove', onMouseMove, true);
        window.removeEventListener('mouseup', onMouseUp, true);
        window.removeEventListener('pointermove', onMouseMove, true);
        window.removeEventListener('pointerup', onMouseUp, true);
        if (window.electronAPI && window.electronAPI.setToolbarDragging) {
          window.electronAPI.setToolbarDragging(false);
        }
      };

      window.addEventListener('mousemove', onMouseMove, { capture: true, passive: false });
      window.addEventListener('mouseup', onMouseUp, { capture: true, passive: false });
      window.addEventListener('pointermove', onMouseMove, { capture: true, passive: false });
      window.addEventListener('pointerup', onMouseUp, { capture: true, passive: false });
    };

    handle.addEventListener('mousedown', startDragHandler);
    handle.addEventListener('pointerdown', startDragHandler);
    handle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
}

// Initialize dragging on load
let isAnswerCardPinned = false;

function togglePinQuickAnswer() {
  isAnswerCardPinned = !isAnswerCardPinned;
  const pinBtn = document.getElementById('quickPinBtn');
  const pinLabel = document.getElementById('quickPinLabel');

  if (pinBtn) {
    pinBtn.classList.toggle('pinned', isAnswerCardPinned);
    pinBtn.title = isAnswerCardPinned ? "ปลดปักหมุด" : "ปักหมุดค้างบนหน้าจอ (Always on Top)";
  }
  if (pinLabel) {
    pinLabel.innerText = isAnswerCardPinned ? "ปลดหมุด" : "ปักหมุด";
  }

  if (window.electronAPI && window.electronAPI.setQuickAnswerPinned) {
    window.electronAPI.setQuickAnswerPinned(isAnswerCardPinned);
  }
}

function closeQuickAnswerCard() {
  abortActiveToolbarStream();
  if (window.electronAPI && window.electronAPI.cancelAiGeneration) {
    window.electronAPI.cancelAiGeneration();
  }
  isAnswerCardPinned = false;
  isAnswerCardActive = false;
  userResizedToolbarAnswerHeight = null;
  lastAutoExpandedHeight = 0;
  isViewingHistoryMode = false;
  const pinBtn = document.getElementById('quickPinBtn');
  if (pinBtn) pinBtn.classList.remove('pinned');
  const pinLabel = document.getElementById('quickPinLabel');
  if (pinLabel) pinLabel.innerText = "ปักหมุด";
  if (window.electronAPI && window.electronAPI.setQuickAnswerPinned) {
    window.electronAPI.setQuickAnswerPinned(false);
  }

  const answerCard = document.getElementById('quickAnswerCard');
  if (answerCard) answerCard.style.display = 'none';
  stopQuickSpeak();
  if (window.electronAPI && window.electronAPI.setToolbarAnswerActive) {
    window.electronAPI.setToolbarAnswerActive(false);
  }
  if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
    window.electronAPI.resizeToolbarWindow({ height: 58 });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let isViewingHistoryMode = false;
let wasCardOpenBeforeHistory = false;
let savedActiveAnswerHtml = '';
let savedActiveAnswerBadge = '';
let savedActiveAnswerStatus = '';

async function openHistoryModal() {
  const card = document.getElementById('quickAnswerCard');
  const body = document.getElementById('quickAnswerBody');
  const badge = document.getElementById('quickAnswerActionBadge');
  const status = document.getElementById('quickAnswerStatus');
  const historyBtn = document.getElementById('quickHistoryBtn');
  const historyLabel = document.getElementById('quickHistoryLabel');
  const banner = document.getElementById('sourceSnippetBanner');

  if (isViewingHistoryMode) {
    isViewingHistoryMode = false;
    if (historyLabel) historyLabel.innerText = 'ประวัติ';
    if (historyBtn) historyBtn.classList.remove('active');

    if (!wasCardOpenBeforeHistory) {
      closeQuickAnswerCard();
      return;
    }

    if (badge) badge.innerText = savedActiveAnswerBadge || 'คำตอบ';
    if (status) status.innerText = savedActiveAnswerStatus || 'เสร็จสิ้น';
    if (body) body.innerHTML = savedActiveAnswerHtml || '<div style="color:#64748b; font-size:13px; padding:12px;">ไม่มีเนื้อหาคำตอบ</div>';
    if (banner && (currentCapturedText || currentCapturedImage)) {
      banner.style.display = 'block';
    }
    autoExpandToolbarToContent(true);
    return;
  }

  abortActiveToolbarStream();
  wasCardOpenBeforeHistory = Boolean(card && card.style.display !== 'none');

  if (!wasCardOpenBeforeHistory) {
    showQuickAnswerCard('ประวัติการถาม AI');
  }

  if (body) savedActiveAnswerHtml = body.innerHTML;
  if (badge) savedActiveAnswerBadge = badge.innerText;
  if (status) savedActiveAnswerStatus = status.innerText;

  if (banner) banner.style.display = 'none';

  isViewingHistoryMode = true;
  if (historyLabel) historyLabel.innerText = 'ปิดประวัติ';
  if (historyBtn) historyBtn.classList.add('active');
  if (badge) badge.innerText = 'ประวัติการถาม AI';
  if (status) status.innerText = 'กำลังโหลดประวัติ...';

  if (body) {
    body.innerHTML = `
      <div style="padding: 16px; text-align: center; color: #64748b; font-size: 13px;">
        <svg style="animation: spin 1s linear infinite; margin-bottom: 6px;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <div>กำลังโหลดรายการประวัติ...</div>
      </div>
    `;
  }
  autoExpandToolbarToContent(true);

  let items = [];
  if (window.electronAPI && window.electronAPI.getHistory) {
    try {
      items = await window.electronAPI.getHistory();
    } catch (e) {
      items = [];
    }
  }

  if (!isViewingHistoryMode) return;

  if (status) {
    status.innerText = items && items.length > 0 ? `ทั้งหมด ${items.length} รายการ` : 'ไม่มีรายการ';
  }

  if (!items || items.length === 0) {
    if (body) {
      body.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: #64748b; font-size: 13px;">
          <div style="margin-bottom: 8px; font-weight: 600; color: #475569;">ยังไม่มีประวัติการถาม-ตอบ</div>
          <div style="font-size: 12px; color: #94a3b8;">เมื่อคุณถาม AI คำถามและคำตอบจะถูกบันทึกที่นี่โดยอัตโนมัติ</div>
          <button type="button" class="quick-card-btn" style="margin-top: 14px; padding: 4px 14px; background: #f1f5f9; border: 1px solid #cbd5e1;" onclick="openHistoryModal()">กลับไปคำตอบ</button>
        </div>
      `;
    }
    autoExpandToolbarToContent(true);
    return;
  }

  let listHtml = `
    <div class="toolbar-history-list" style="display: flex; flex-direction: column; gap: 8px; padding: 4px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding: 0 2px;">
        <span style="font-size: 12px; color: #64748b; font-weight: 500;">เลือกคำตอบที่ต้องการดูย้อนหลัง:</span>
        <button type="button" class="quick-card-btn" style="padding: 2px 10px; font-size: 11.5px;" onclick="clearToolbarHistoryAll()">ล้างประวัติ</button>
      </div>
  `;

  items.slice(0, 30).forEach((item, idx) => {
    const cat = escapeHtml(item.category || 'คำตอบ');
    const time = escapeHtml(item.timestamp || '');
    const model = escapeHtml(getCleanModelName(item.modelId || item.model || 'Gemini'));
    const cleanQuestion = (item.question || '')
      .replace(/<<<TARGET_TEXT_(?:START|END)>>>/gi, '')
      .replace(/<+TARGET_TEXT[^>]*>+/gi, '')
      .replace(/<<<|>>>/g, '')
      .replace(/<<>>/g, '')
      .replace(/<<{1,3}\s*>>{1,3}/g, '')
      .trim();
    const cleanFullText = (item.fullText || (item.result && (item.result.answer || item.result.ocr)) || '')
      .replace(/<<<TARGET_TEXT_(?:START|END)>>>/gi, '')
      .replace(/<+TARGET_TEXT[^>]*>+/gi, '')
      .replace(/<<<|>>>/g, '')
      .replace(/<<>>/g, '')
      .replace(/<<{1,3}\s*>>{1,3}/g, '')
      .replace(/[*#`_]/g, '')
      .trim();
    const questionText = cleanQuestion ? cleanQuestion.replace(/\s+/g, ' ').substring(0, 80) : '';
    const answerSnippet = cleanFullText ? cleanFullText.replace(/\s+/g, ' ').substring(0, 95) : '';
    const rawTitle = questionText || answerSnippet || 'ประวัติการถาม AI';
    const displayTitle = escapeHtml(rawTitle);

    listHtml += `
      <div class="toolbar-history-item" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.14s ease;" onclick="loadToolbarHistoryItemByIndex(${idx})" onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
            <span class="quick-action-badge" style="font-size: 10.5px; padding: 1px 7px;">${cat}</span>
            <span style="font-size: 11px; color: #94a3b8;">${model} • ${time}</span>
          </div>
          <div style="font-size: 12.5px; color: #1e293b; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayTitle}${rawTitle.length >= 80 ? '...' : ''}</div>
        </div>
        <button type="button" class="quick-card-btn" style="padding: 4px 10px; font-size: 11.5px; background: #0284c7; color: #fff; border-color: #0284c7; flex-shrink: 0;" onclick="event.stopPropagation(); loadToolbarHistoryItemByIndex(${idx})">ดูคำตอบ</button>
      </div>
    `;
  });

  listHtml += `</div>`;
  if (body) body.innerHTML = listHtml;
  window._cachedToolbarHistory = items;
  autoExpandToolbarToContent(true);
}

function loadToolbarHistoryItemByIndex(index) {
  const items = window._cachedToolbarHistory || [];
  const item = items[index];
  if (!item) return;
  loadToolbarHistoryItem(item);
}

function loadToolbarHistoryItem(item) {
  isViewingHistoryMode = false;
  wasCardOpenBeforeHistory = true;
  const historyBtn = document.getElementById('quickHistoryBtn');
  const historyLabel = document.getElementById('quickHistoryLabel');
  if (historyLabel) historyLabel.innerText = 'ประวัติ';
  if (historyBtn) historyBtn.classList.remove('active');

  const badge = document.getElementById('quickAnswerActionBadge');
  const status = document.getElementById('quickAnswerStatus');
  if (badge) badge.innerText = item.category || 'คำตอบ';
  if (status) {
    const sec = item.durationSec ? ` (${item.durationSec}s)` : '';
    status.innerText = `ประวัติ${sec} • ${item.timestamp || ''}`;
  }

  const banner = document.getElementById('sourceSnippetBanner');
  const snippet = document.getElementById('sourceSnippetText');
  const snipText = (item.sourceSnippet || item.question || '').replace(/<<<TARGET_TEXT_(?:START|END)>>>/gi, '').replace(/<<<|>>>/g, '').trim();
  if (banner && snippet) {
    if (snipText) {
      snippet.innerText = snipText.slice(0, 85) + (snipText.length > 85 ? '...' : '');
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }

  if (item.modelId) {
    updateCustomModelDropdownUI(item.modelId);
  }

  let rawAnswer = item.fullText || (item.result && (item.result.answer || item.result.ocr)) || 'ไม่มีเนื้อหา';
  rawAnswer = rawAnswer
    .replace(/<<<TARGET_TEXT_(?:START|END)>>>/gi, '')
    .replace(/<+TARGET_TEXT[^>]*>+/gi, '')
    .replace(/<<<|>>>/g, '')
    .replace(/<<>>/g, '');
  quickAnswerStreamText = rawAnswer;
  renderAnswerContent(rawAnswer, true);
  savedActiveAnswerHtml = document.getElementById('quickAnswerBody')?.innerHTML || '';
  savedActiveAnswerBadge = badge?.innerText || '';
  savedActiveAnswerStatus = status?.innerText || '';
  if (window.electronAPI && window.electronAPI.setToolbarAnswerActive) {
    window.electronAPI.setToolbarAnswerActive(true);
  }
  autoExpandToolbarToContent(true);
}

async function clearToolbarHistoryAll() {
  if (window.electronAPI && window.electronAPI.clearHistory) {
    await window.electronAPI.clearHistory();
    window._cachedToolbarHistory = [];
    openHistoryModal();
  }
}

if (window.electronAPI && window.electronAPI.onLoadHistoryItemInToolbar) {
  window.electronAPI.onLoadHistoryItemInToolbar((item) => {
    if (item) {
      showQuickAnswerCard(item.category || 'คำตอบ');
      loadToolbarHistoryItem(item);
    }
  });
}

let userResizedToolbarAnswerHeight = null;

function initQuickAnswerResizeBottom() {
  const handle = document.getElementById('quickAnswerResizeBottom');
  const card = document.getElementById('quickAnswerCard');
  if (!handle || !card) return;
  if (handle.dataset.resizeInitialized === 'true') return;
  handle.dataset.resizeInitialized = 'true';

  let isDraggingResize = false;
  let startY = 0;
  let startH = 0;

  const startResize = (screenY, pointerId = null) => {
    isDraggingResize = true;
    startY = screenY;
    startH = card.getBoundingClientRect().height || 380;
    document.body.style.cursor = 'ns-resize';
    if (pointerId !== null && handle.setPointerCapture) {
      try { handle.setPointerCapture(pointerId); } catch (e) {}
    }
  };

  const updateResize = (screenY) => {
    if (!isDraggingResize) return;
    const deltaY = screenY - startY;
    const maxAllowed = Math.max(260, (window.screen.availHeight || 900) - 100);
    const newH = Math.max(160, Math.min(maxAllowed, Math.round(startH + deltaY)));
    userResizedToolbarAnswerHeight = newH;
    card.style.height = `${newH}px`;
    card.style.maxHeight = `${newH}px`;
    card.style.minHeight = `${newH}px`;
    card.style.flex = '0 0 auto';
    if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
      window.electronAPI.resizeToolbarWindow({ height: newH + 60 });
    }
  };

  const endResize = (pointerId = null) => {
    if (!isDraggingResize) return;
    isDraggingResize = false;
    document.body.style.cursor = '';
    if (pointerId !== null && handle.releasePointerCapture) {
      try { handle.releasePointerCapture(pointerId); } catch (e) {}
    }
  };

  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startResize(e.screenY || e.clientY, e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!isDraggingResize) return;
    e.preventDefault();
    e.stopPropagation();
    updateResize(e.screenY || e.clientY);
  });

  handle.addEventListener('pointerup', (e) => {
    endResize(e.pointerId);
  });

  handle.addEventListener('pointercancel', (e) => {
    endResize(e.pointerId);
  });

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startResize(e.screenY || e.clientY);
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDraggingResize) return;
    updateResize(e.screenY || e.clientY);
  }, { capture: true });

  window.addEventListener('pointerup', (e) => {
    if (!isDraggingResize) return;
    endResize(e.pointerId);
  }, { capture: true });

  window.addEventListener('pointercancel', (e) => {
    if (!isDraggingResize) return;
    endResize(e.pointerId);
  }, { capture: true });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingResize) return;
    updateResize(e.screenY || e.clientY);
  }, { capture: true });

  window.addEventListener('mouseup', () => {
    endResize();
  }, { capture: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initToolbarDragging();
    initQuickAnswerResizeBottom();
  });
} else {
  initToolbarDragging();
  initQuickAnswerResizeBottom();
}

// Dismiss toolbar when double-clicking outside the pill or answer card
let lastToolbarOutsideClickTime = 0;
document.addEventListener('mousedown', (e) => {
  // CRITICAL: When answer card is open/active or stream is running, NEVER dismiss or close window on ANY click!
  const card = document.getElementById('quickAnswerCard');
  if ((card && card.style.display !== 'none' && card.style.display !== '') || isAnswerCardActive || activeToolbarDirectStreamController) {
    lastToolbarOutsideClickTime = 0;
    return;
  }

  // Standalone app mode by default: clicking anywhere outside does NOT dismiss or close the window
  if (!cachedConfig || cachedConfig.dismissOnOutsideClick !== true) {
    return;
  }

  const tb = document.getElementById('quickTextToolbar');
  // Grace Period: NEVER dismiss toolbar while dragging or within 600ms after dragging
  if (isGlobalToolbarDragging || (Date.now() - globalToolbarDragEndTime < 600)) {
    return;
  }

  // WHITELIST: If click target is Drag Handle, Control Buttons, Custom Box, or any Toolbar UI element
  if (e.target && e.target.closest) {
    const isSafeElement = e.target.closest(
      '.drag-handle, .header-drag-handle, #quickTextToolbar, #quickAnswerCard, .quick-answer-header, ' +
      '#quickCustomBox, .quick-custom-input, .quick-action-btn, .quick-card-btn, ' +
      '.quick-back-btn, .quick-custom-send'
    );
    if (isSafeElement) {
      lastToolbarOutsideClickTime = 0;
      return;
    }
  }

  // If custom ask input is open, NEVER dismiss toolbar
  if (isCustomInputOpen) {
    return;
  }

  const insideTb = tb && tb.contains(e.target);
  const insideCard = card && card.style.display !== 'none' && card.contains(e.target);
  if (!insideTb && !insideCard) {
    const now = Date.now();
    const elapsed = now - lastToolbarOutsideClickTime;
    // Require deliberate double-click outside (100ms - 600ms) to dismiss window
    if (elapsed >= 100 && elapsed <= 600) {
      lastToolbarOutsideClickTime = 0;
      closeQuickTextUI();
    } else {
      lastToolbarOutsideClickTime = now;
    }
  } else {
    lastToolbarOutsideClickTime = 0;
  }
});


