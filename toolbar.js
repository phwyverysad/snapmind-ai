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
let currentQuickPrompts = [];
let quickAnswerStreamText = '';
let isCustomInputOpen = false;

// Initialize IPC Listeners
if (window.electronAPI) {
  if (window.electronAPI.onOpenQuickTextToolbar) {
    window.electronAPI.onOpenQuickTextToolbar(({ text, prompts }) => {
      handleOpenToolbar({ text, prompts });
    });
  }

  if (window.electronAPI.onCloseQuickTextUI) {
    window.electronAPI.onCloseQuickTextUI(() => {
      handleCloseUI();
    });
  }

  if (window.electronAPI.onQuickDigitPressed) {
    window.electronAPI.onQuickDigitPressed((digitIndex) => {
      executeQuickPromptByIndex(digitIndex);
    });
  }

  if (window.electronAPI.onQuickTextNumberPressed) {
    window.electronAPI.onQuickTextNumberPressed((digitIndex) => {
      executeQuickPromptByIndex(digitIndex);
    });
  }

  if (window.electronAPI.onQuickTextCustomToggle) {
    window.electronAPI.onQuickTextCustomToggle(() => {
      toggleQuickCustomInput(true);
    });
  }

  if (window.electronAPI.onQuickAnswerChunk) {
    window.electronAPI.onQuickAnswerChunk((data) => {
      if (data && data.chunk) {
        quickAnswerStreamText += data.chunk;
        renderAnswerContent(quickAnswerStreamText);
      }
    });
  }

  if (window.electronAPI.onQuickAnswerFinish) {
    window.electronAPI.onQuickAnswerFinish((data) => {
      const final = (data && data.fullText) ? data.fullText : quickAnswerStreamText;
      renderAnswerContent(final);
      const status = document.getElementById('quickAnswerStatus');
      if (status) {
        const sec = data?.durationSec || '';
        status.innerText = sec ? `เสร็จสิ้น (${sec}s)` : 'เสร็จสิ้น';
      }
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

// Global keyboard listeners inside toolbar window
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (isCustomInputOpen) {
      toggleQuickCustomInput(false);
      return;
    }
    closeQuickTextUI();
    return;
  }

  const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (tag !== 'input' && tag !== 'textarea') {
    if (e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const digitIndex = parseInt(e.key, 10) - 1;
      executeQuickPromptByIndex(digitIndex);
    }
  }
});

function handleOpenToolbar({ text, prompts }) {
  currentCapturedText = (text || '').trim();
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

  // Render buttons
  renderQuickActionsToolbar();

  // Reset window height to 46px and ensure dynamic width fits toolbar with generous margin
  if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
    const tbEl = document.getElementById('quickTextToolbar');
    const reqW = tbEl ? Math.max(1060, Math.ceil(tbEl.scrollWidth) + 36) : 1060; // Signature compat: Math.max(940, Math.ceil(tbEl.scrollWidth) + 36)
    window.electronAPI.resizeToolbarWindow({ width: reqW, height: 46 });
  }
}

function renderQuickActionsToolbar() {
  const actionsList = document.getElementById('quickActionsList');
  if (!actionsList) return;
  actionsList.innerHTML = '';

  const enabledPrompts = currentQuickPrompts.filter(p => p.enabled);
  enabledPrompts.slice(0, 9).forEach((prompt, index) => {
    const btn = document.createElement('button');
    btn.className = 'quick-action-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('draggable', 'false');
    btn.title = `กด [${index + 1}] หรือคลิกเพื่อ${prompt.name}`;

    btn.innerHTML = `
      <span class="quick-action-num">${index + 1}</span>
      <span class="quick-action-label">${prompt.name}</span>
    `;

    btn.onclick = (e) => {
      e.stopPropagation();
      executeQuickPrompt(prompt.id);
    };

    actionsList.appendChild(btn);
  });

  // Hide standalone ? button if "ถามเอง" is already present in the action list
  const standaloneCustomBtn = document.getElementById('quickCustomToggleBtn');
  if (standaloneCustomBtn) {
    const hasCustomInList = enabledPrompts.slice(0, 9).some(p => p.id === 'custom_ask' || p.name === 'ถามเอง');
    standaloneCustomBtn.style.display = hasCustomInList ? 'none' : 'inline-flex';
  }
}

function executeQuickPromptByIndex(index) {
  const enabledPrompts = currentQuickPrompts.filter(p => p.enabled);
  if (index >= 0 && index < enabledPrompts.length) {
    executeQuickPrompt(enabledPrompts[index].id);
  }
}

async function executeQuickPrompt(promptId) {
  const prompt = currentQuickPrompts.find(p => p.id === promptId);
  if (!prompt) return;

  // If this option is "ถามเอง", open the custom ask input directly
  if (prompt.id === 'custom_ask' || prompt.name === 'ถามเอง') {
    toggleQuickCustomInput();
    return;
  }

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
  let finalPrompt = '';

  if (template.includes('{text}')) {
    finalPrompt = template.replace(/\{text\}/g, textToUse);
  } else {
    finalPrompt = `${template}\n\n${textToUse}`;
  }

  showQuickAnswerCard(prompt.name);

  try {
    quickAnswerStreamText = '';
    const res = await window.electronAPI.quickTextAsk({
      promptText: finalPrompt
    });

    if (res && res.fullText) {
      renderAnswerContent(res.fullText);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    const body = document.getElementById('quickAnswerBody');
    const status = document.getElementById('quickAnswerStatus');
    if (status) status.innerText = 'เกิดข้อผิดพลาด';
    if (body) {
      body.innerHTML = `<div style="color:#ef4444; font-size:12px; padding:4px 0; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${err.message || 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ'}</div>`;
    }
  }
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

  if (actionBadge) actionBadge.innerText = badgeTitle;
  if (status) status.innerText = 'กำลังประมวลผล...';
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

  // Inform main process that answer card is active (prevents outside clicks from dismissing answer window)
  if (window.electronAPI && window.electronAPI.setToolbarAnswerActive) {
    window.electronAPI.setToolbarAnswerActive(true);
  }

  // Expand window height to accommodate answer card
  if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
    window.electronAPI.resizeToolbarWindow({ height: 280 });
    window.electronAPI.resizeToolbarWindow({ height: 430 });
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

function formatQuickTextMarkdown(rawText) {
  if (!rawText) return '';
  const actionBadge = document.getElementById('quickAnswerActionBadge');
  const isTranslation = actionBadge && (actionBadge.innerText.includes('แปล') || actionBadge.innerText.includes('Translate'));
  if (isTranslation && currentCapturedText) {
    const hasOriginalBullets = /^\s*[-*•]\s+/m.test(currentCapturedText);
    if (!hasOriginalBullets) {
      // Strip synthetic bullet markers that AI added so it flows verbatim sentence-by-sentence
      return rawText.replace(/^\s*[-*•]\s+/gm, '');
    }
  }
  return rawText;
}

function renderAnswerContent(text) {
  const body = document.getElementById('quickAnswerBody');
  if (!body) return;

  const formattedText = formatQuickTextMarkdown(text);

  if (typeof marked !== 'undefined') {
    let html = marked.parse(formattedText || '');
    if (typeof DOMPurify !== 'undefined') {
      html = DOMPurify.sanitize(html);
    }
    body.innerHTML = html;
  } else {
    body.innerText = formattedText || '';
  }

  if (typeof renderMathInElement === 'function') {
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

  // Ensure window height accommodates long answer content comfortably without cutting off
  if (window.electronAPI && window.electronAPI.resizeToolbarWindow) {
    window.electronAPI.resizeToolbarWindow({ height: 430 });
  }
}

function copyQuickAnswer() {
  const body = document.getElementById('quickAnswerBody');
  if (!body) return;
  const text = body.innerText || '';
  navigator.clipboard.writeText(text).then(() => {
    const label = document.getElementById('quickCopyLabel');
    if (label) {
      const orig = label.innerText;
      label.innerText = 'คัดลอกแล้ว!';
      setTimeout(() => { label.innerText = orig; }, 1400);
    }
  });
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
      if (window.electronAPI.setToolbarFocusable) {
        window.electronAPI.setToolbarFocusable(false);
      }
      if (window.electronAPI.resizeToolbarWindow) {
        window.electronAPI.resizeToolbarWindow({ height: 46 });
        const tbEl = document.getElementById('quickTextToolbar');
        const reqW = tbEl ? Math.max(1060, Math.ceil(tbEl.scrollWidth) + 36) : 1060; // Signature compat: Math.max(940, Math.ceil(tbEl.scrollWidth) + 36)
        window.electronAPI.resizeToolbarWindow({ width: reqW, height: 46 });
      }
    }
  }
}

function handleQuickCustomKeyDown(e) {
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

  let finalPrompt = '';
  const textToUse = currentCapturedText || '';
  if (userCmd.includes('{text}')) {
    finalPrompt = userCmd.replace(/\{text\}/g, textToUse);
  } else if (textToUse) {
    finalPrompt = `${userCmd}\n\n${textToUse}`;
  } else {
    finalPrompt = userCmd;
  }

  input.value = '';
  toggleQuickCustomInput(false);

  showQuickAnswerCard('คำถามของคุณ');

  try {
    quickAnswerStreamText = '';
    const res = await window.electronAPI.quickTextAsk({
      promptText: finalPrompt
    });

    if (res && res.fullText) {
      renderAnswerContent(res.fullText);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    const body = document.getElementById('quickAnswerBody');
    const status = document.getElementById('quickAnswerStatus');
    if (status) status.innerText = 'เกิดข้อผิดพลาด';
    if (body) {
      body.innerHTML = `<div style="color:#ef4444; font-size:12px; padding:4px 0; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${err.message || 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ'}</div>`;
    }
  }
}

function handleCloseUI() {
  const container = document.getElementById('quickTextContainer');
  if (container) {
    container.classList.add('closing');
  }
}

function closeQuickTextUI() {
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
function initToolbarDragging() {
  const dragHandles = document.querySelectorAll('.drag-handle, .header-drag-handle');
  if (!dragHandles || dragHandles.length === 0) return;

  dragHandles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      // Only primary mouse button (left-click)
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      let lastScreenX = e.screenX;
      let lastScreenY = e.screenY;
      let isDragging = true;

      document.body.classList.add('is-dragging-window');
      handle.classList.add('dragging');

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        moveEvent.preventDefault();
        const deltaX = moveEvent.screenX - lastScreenX;
        const deltaY = moveEvent.screenY - lastScreenY;
        lastScreenX = moveEvent.screenX;
        lastScreenY = moveEvent.screenY;

        if (deltaX !== 0 || deltaY !== 0) {
          if (window.electronAPI && window.electronAPI.moveToolbarBy) {
            window.electronAPI.moveToolbarBy({ deltaX, deltaY });
          }
        }
      };

      const onMouseUp = () => {
        isDragging = false;
        document.body.classList.remove('is-dragging-window');
        handle.classList.remove('dragging');
        window.removeEventListener('mousemove', onMouseMove, true);
        window.removeEventListener('mouseup', onMouseUp, true);
      };

      window.addEventListener('mousemove', onMouseMove, { capture: true, passive: false });
      window.addEventListener('mouseup', onMouseUp, { capture: true, passive: false });
    });
  });
}

// Initialize dragging on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToolbarDragging);
} else {
  initToolbarDragging();
}

// Dismiss toolbar when double-clicking outside the pill or answer card
let lastToolbarOutsideClickTime = 0;
document.addEventListener('mousedown', (e) => {
  const tb = document.getElementById('quickTextToolbar');
  const card = document.getElementById('quickAnswerCard');

  // If answer card is actively displaying, NEVER close window on outside clicks!
  // User can read, reference, and copy answer without accidental dismissal.
  if (card && card.style.display !== 'none' && card.style.display !== '') {
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

