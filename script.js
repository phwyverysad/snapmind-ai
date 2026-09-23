// Configure marked.js to preserve line breaks and tables for beautiful OCR & Markdown formatting
if (typeof marked !== 'undefined') {
  try {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  } catch (e) {}
}

// === MAIN FLAGSHIP AI MODELS ===
const AI_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: 'Flash',
    tagClass: 'flash',
    defaultThinking: false,
    desc: 'โมเดลหลัก เร็วและฉลาดสมดุล (แนะนำ: ปิด Thinking เพื่อตอบไว ~1 วินาที)'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    tag: 'Lite',
    tagClass: 'flash',
    defaultThinking: false,
    desc: 'โมเดลความเร็วสูงพิเศษ กินทรัพยากรน้อย (แนะนำ: ปิด Thinking เพื่อตอบทันที)'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    tag: 'Pro',
    tagClass: 'pro',
    defaultThinking: true,
    desc: 'โมเดลคิดวิเคราะห์เชิงลึกขั้นสูง (แนะนำ: เปิด Thinking สำหรับโจทย์ซับซ้อน)'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    tag: 'Turbo',
    tagClass: 'flash',
    defaultThinking: false,
    desc: 'โมเดลความเร็วสูงพิเศษระดับเสี้ยววินาที ตอบไว แม่นยำ และเร็วที่สุด'
  }
];

// Map UI Model IDs to active Google AI Studio API endpoints
const MODEL_API_ENDPOINT_MAP = {
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
  'gemini-3.8-flash': 'gemini-3.8-flash',
  'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview'
};

// Preset SVG Icons for Quick Text Ask Actions (Feather/Lucide 2px stroke, strictly NO EMOJIS)
const SVG_ICONS = {
  'file-text': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  'globe': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  'help-circle': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  'edit': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  'check-circle': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  'code': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  'zap': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  'search': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  'message-square': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  'book-open': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
};

// Robust JSON sanitizer that escapes unescaped backslashes inside JSON strings (for LaTeX math formulas)
function sanitizeJsonString(raw) {
  if (!raw || typeof raw !== 'string') return raw;

  let result = '';
  let inString = false;
  let len = raw.length;

  for (let i = 0; i < len; i++) {
    let ch = raw[i];

    if (!inString) {
      if (ch === '"') inString = true;
      result += ch;
      continue;
    }

    // Inside JSON string literal
    if (ch === '"') {
      inString = false;
      result += ch;
      continue;
    }

    if (ch === '\\') {
      let nextCh = (i + 1 < len) ? raw[i + 1] : '';

      // If already an escaped backslash "\\"
      if (nextCh === '\\') {
        result += '\\\\';
        i++; // skip the second backslash
        continue;
      }

      // If an escaped quote '\"'
      if (nextCh === '"') {
        result += '\\"';
        i++; // skip the quote
        continue;
      }

      // Check if it represents a LaTeX math command starting with a valid JSON escape char (f, t, b, r, etc.)
      let isLaTeXCmd = false;
      const sub = raw.substring(i + 1, i + 8).toLowerCase();
      if (sub.startsWith('frac') || sub.startsWith('times') || sub.startsWith('theta') ||
          sub.startsWith('text') || sub.startsWith('tau') || sub.startsWith('tan') ||
          sub.startsWith('beta') || sub.startsWith('begin') || sub.startsWith('bar') ||
          sub.startsWith('right') || sub.startsWith('rho')) {
        isLaTeXCmd = true;
      }

      if (isLaTeXCmd) {
        result += '\\\\';
        continue;
      }

      // If valid standard escape: \/, \b, \f, \n, \r, \t
      if (nextCh === '/' || nextCh === 'b' || nextCh === 'f' || nextCh === 'n' || nextCh === 'r' || nextCh === 't') {
        result += '\\' + nextCh;
        i++;
        continue;
      }

      // If unicode escape: \uXXXX
      if (nextCh === 'u') {
        const hex = raw.substring(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          result += '\\u' + hex;
          i += 5;
          continue;
        }
      }

      // Any other backslash (e.g. \sqrt, \alpha, \pm, \left, \{) is an unescaped LaTeX backslash
      result += '\\\\';
      continue;
    }

    // Escape unescaped control characters in JSON strings
    if (ch === '\n') {
      result += '\\n';
    } else if (ch === '\r') {
      result += '\\r';
    } else if (ch === '\t') {
      result += '\\t';
    } else {
      result += ch;
    }
  }

  return result;
}

function extractJsonFromText(text) {
  if (!text) return null;
  text = text.trim();

  // 1. Direct parse attempt
  try { return JSON.parse(text); } catch (e) {}

  // 2. Sanitized direct parse attempt
  try { return JSON.parse(sanitizeJsonString(text)); } catch (e) {}

  // 3. Markdown code block attempt
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try { return JSON.parse(codeBlockMatch[1]); } catch (e) {}
    try { return JSON.parse(sanitizeJsonString(codeBlockMatch[1])); } catch (e) {}
  }

  // 4. Outermost JSON object attempt
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try { return JSON.parse(objectMatch[0]); } catch (e) {}
    try { return JSON.parse(sanitizeJsonString(objectMatch[0])); } catch (e) {}
  }

  return null;
}

// DOM Elements
const canvas = document.getElementById('scanCanvas');
const ctx = canvas.getContext('2d');
const topHint = document.getElementById('topHint');
const percentBadge = document.getElementById('percentBadge');

const aiWindow = document.getElementById('aiWindow');
const aiToolbar = document.getElementById('aiToolbar');
const metricsBanner = document.getElementById('metricsBanner');
const latencyTimer = document.getElementById('latencyTimer');
const latencyText = document.getElementById('latencyText');
const thinkingAccordion = document.getElementById('thinkingAccordion');
const thinkingContent = document.getElementById('thinkingContent');
const chatThread = document.getElementById('chatThread');
const chatInput = document.getElementById('chatInput');

// State Variables
let appSettings = {
  apiKey: '',
  shortcutKey: 'Alt+Shift+S',
  quickTextShortcutKey: 'Ctrl+CapsLock',
  defaultModel: 'gemini-3.8-flash',
  modelThinking: {
    'gemini-3.8-flash': false,
    'gemini-3.5-flash-lite': false,
    'gemini-3.1-pro-preview': true
  },
  textPrompts: []
};

let currentSelectedModel = 'gemini-3.8-flash';
let selectedModalModelId = 'gemini-3.8-flash';

// Quick Text Ask State
let currentCapturedText = '';
let currentQuickPrompts = [];
let quickAnswerStreamText = '';
let selectedIconForEditor = 'file-text';

let isSnippingActive = false;
let isLaserScanning = false;
let isDrawing = false;
let isMoving = false;
let isResizing = false;
let activeHandle = null;
let resizeAnchor = null;

let startMouseX = 0, startMouseY = 0;
let dragOffsetX = 0, dragOffsetY = 0;
let lastMouseX = window.innerWidth / 2, lastMouseY = window.innerHeight / 2;
let box = { x: 0, y: 0, w: 0, h: 0 };

let laserX = 0;
let laserDirection = 1;
let laserAnimId = null;
let scanProgress = 0;
let scanProgressInterval = null;
let scanStartTime = 0;

let isPinned = true;
let isDraggingWin = false;
let winStartX = 0, winStartY = 0;
let winInitLeft = 0, winInitTop = 0;

let currentAnalysisResult = null;
let currentDisplayModelName = null;
let currentCroppedBase64 = null;
let lastCroppedBox = null; // Preserves last crop coordinates for automatic instant refresh on model switch
let activeCategory = 'answer';
let followUpChatMessages = []; // Preserves all user follow-up questions and AI responses across tab switches
let currentAnalysisRequestId = 0; // Monotonically increasing ID to cancel/supersede any pending or in-flight model streams

// Re-analyze when switching models: Answer anew with newly selected model and release all results simultaneously
async function reanalyzeWithNewModel() {
  const imgDataUrl = currentCroppedBase64;
  if (!imgDataUrl && !lastCroppedBox) return;
  if (!aiWindow || aiWindow.style.display !== 'flex') return;

  stopSpeechSynthesis();
  if (window.electronAPI) {
    window.electronAPI.removeStreamListeners();
  }

  const thisRequestId = ++currentAnalysisRequestId;
  isStreamingActive = true;
  hasReceivedFirstToken = false;
  accumulatedStreamText = '';
  currentAnalysisResult = {
    answer: '',
    thinking_process: '',
    explain: '',
    summary: '',
    translate: '',
    ocr: ''
  };

  followUpChatMessages = [];

  // Reset tab to answer
  activeCategory = 'answer';
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  const firstTab = document.querySelector('.tab-btn');
  if (firstTab) firstTab.classList.add('active');

  if (thinkingAccordion) thinkingAccordion.style.display = 'none';
  if (thinkingContent) thinkingContent.innerText = '';

  const modelName = selectedModelNameText();
  metricsBanner.classList.add('thinking');
  if (latencyText) latencyText.innerText = `กำลังวิเคราะห์ใหม่ด้วย ${modelName}...`;

  // Display Skeleton Screen while new model generates response
  chatThread.innerHTML = `
    <div class="chat-bubble ai" id="liveStreamingBubble">
      <div id="liveStreamingContent" class="markdown-body" style="min-height: 80px; font-size: 14px; line-height: 1.65;">
        <div class="skeleton-container" id="skeletonLoader">
          <div class="skeleton-line w-90"></div>
          <div class="skeleton-line w-full"></div>
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-45"></div>
        </div>
      </div>
      <div id="liveStreamingActions" class="bubble-actions" style="margin-top: 8px; display: none; gap: 8px;" onselectstart="return false;" draggable="false">
        <button class="bubble-copy-btn" draggable="false" onselectstart="return false;" onclick="copySingleBubble('liveStreamingContent', this)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span>คัดลอก</span>
        </button>
        <button class="bubble-copy-btn" draggable="false" onselectstart="return false;" onclick="speakTextFromBubble('liveStreamingContent', this)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <span>อ่านเสียง</span>
        </button>
      </div>
    </div>
  `;

  let finalImg = imgDataUrl;
  if (!finalImg && lastCroppedBox) {
    try {
      finalImg = await window.electronAPI.cropArea(lastCroppedBox);
      currentCroppedBase64 = finalImg;
    } catch (e) {
      console.warn('Crop fallback error:', e);
    }
  }
  if (!finalImg) return;

  const streamStartTime = performance.now();
  const selectedModel = currentSelectedModel || 'gemini-3.8-flash';
  let hasAnswerCompleted = false;

  window.electronAPI.onStreamChunk((data) => {
    if (thisRequestId !== currentAnalysisRequestId) return;
    if (data.type === 'ocr') {
      currentAnalysisResult.ocr = (currentAnalysisResult.ocr || '') + data.chunk;
      hasReceivedFirstToken = true;
      if (activeCategory === 'ocr') {
        scheduleScreenStreamRender();
      }
    } else {
      accumulatedStreamText += data.chunk;
      const parsed = parseStreamSections(accumulatedStreamText);
      currentAnalysisResult.answer = parsed.answer;
      currentAnalysisResult.explain = parsed.explain;
      currentAnalysisResult.summary = parsed.summary;
      currentAnalysisResult.translate = parsed.translate;
      if (parsed.ocr) {
        currentAnalysisResult.ocr = parsed.ocr;
      }
      if (parsed.thinking_process) {
        currentAnalysisResult.thinking_process = parsed.thinking_process;
      }
      hasReceivedFirstToken = true;

      const hasReachedNextSection = accumulatedStreamText.search(/###?\s*\[?(?:EXPLAIN|EXPLANATION|คำอธิบาย|SUMMARY|สรุป|TRANSLATE|แปล|OCR|TEXT|ถอดข้อความ)\]?/i) !== -1;

      if (!hasAnswerCompleted && (hasReachedNextSection || (currentAnalysisResult.answer && currentAnalysisResult.answer.length > 20 && (currentAnalysisResult.explain || currentAnalysisResult.summary || currentAnalysisResult.translate)))) {
        hasAnswerCompleted = true;
        metricsBanner.classList.remove('thinking');
        const answerLatencySec = ((performance.now() - streamStartTime) / 1000).toFixed(2);
        if (latencyText) {
          latencyText.innerText = `${answerLatencySec}s (${new Date().toLocaleTimeString('th-TH')})`;
        }
        const actionsEl = document.getElementById('liveStreamingActions');
        if (actionsEl) actionsEl.style.display = 'flex';
      }

      scheduleScreenStreamRender();
    }
  });

  window.electronAPI.onStreamFinish((data) => {
    if (thisRequestId !== currentAnalysisRequestId) return;
    isStreamingActive = false;
    metricsBanner.classList.remove('thinking');
    const duration = data.durationSec || ((performance.now() - streamStartTime) / 1000).toFixed(2);
    if (latencyText) {
      if (!hasAnswerCompleted || !latencyText.innerText || latencyText.innerText.includes('กำลัง')) {
        latencyText.innerText = `${duration}s (${new Date().toLocaleTimeString('th-TH')})`;
      }
    }
    hasAnswerCompleted = true;

    if (data.ocrText && (!currentAnalysisResult.ocr || currentAnalysisResult.ocr.length < data.ocrText.length)) {
      currentAnalysisResult.ocr = data.ocrText;
    }
    if (!currentAnalysisResult.summary && currentAnalysisResult.answer) {
      currentAnalysisResult.summary = createQuickBulletSummary(currentAnalysisResult.answer);
    }
    const hasThaiInTr = currentAnalysisResult.translate && /[\u0E00-\u0E7F]/.test(currentAnalysisResult.translate);
    const foreignSource = (currentAnalysisResult.ocr || currentAnalysisResult.answer || '').trim();
    if (!hasThaiInTr && /[A-Za-z]/.test(foreignSource) && foreignSource.length > 5) {
      currentAnalysisResult.translate = '';
      triggerAutoTranslation(foreignSource);
    }
    currentDisplayModelName = selectedModelNameText();

    // Render full conversation view with LaTeX math and copy buttons
    renderConversationView();

    const actionsEl = document.getElementById('liveStreamingActions');
    if (actionsEl) actionsEl.style.display = 'flex';

    if (thinkingContent && thinkingAccordion && currentAnalysisResult.thinking_process) {
      thinkingContent.innerText = currentAnalysisResult.thinking_process;
      thinkingAccordion.style.display = 'block';
    }

    // Save updated result to history
    window.electronAPI.saveHistoryItem({
      id: Date.now(),
      model: currentDisplayModelName,
      timestamp: new Date().toLocaleString('th-TH'),
      thumbnail: finalImg,
      result: currentAnalysisResult,
      latency: `${duration}s`
    });

    window.electronAPI.removeStreamListeners();
  });

  window.electronAPI.onStreamError((data) => {
    if (thisRequestId !== currentAnalysisRequestId) return;
    isStreamingActive = false;
    metricsBanner.classList.remove('thinking');
    if (latencyText) latencyText.innerText = "เกิดข้อผิดพลาดในการวิเคราะห์";
    const target = document.getElementById('liveStreamingContent');
    if (target) {
      target.innerHTML = `<div style="color: #ef4444; padding: 8px;">เกิดข้อผิดพลาด: ${data.error || 'ไม่สามารถประมวลผลข้อมูลได้'}</div>`;
    }
    window.electronAPI.removeStreamListeners();
  });

  try {
    await window.electronAPI.analyzeScreenStream(finalImg, selectedModel);
  } catch (err) {
    if (thisRequestId !== currentAnalysisRequestId) return;
    isStreamingActive = false;
    metricsBanner.classList.remove('thinking');
    if (latencyText) latencyText.innerText = "เกิดข้อผิดพลาด";
    const target = document.getElementById('liveStreamingContent');
    if (target) {
      target.innerHTML = `<div style="color: #ef4444; padding: 8px;">${err.message}</div>`;
    }
  }
}

// Automatic Refresh when user switches AI Model
function triggerAutoRefreshIfActive() {
  if ((currentCroppedBase64 || lastCroppedBox) && aiWindow && aiWindow.style.display === 'flex') {
    console.log('[Auto-Refresh] Automatically re-analyzing with new model simultaneously:', currentSelectedModel);
    reanalyzeWithNewModel();
  }
}

// Click outside modal-card on modal-overlay to dismiss
function setupModalBackdropClose() {
  const modals = [
    { id: 'settingsModal', close: closeSettingsModal },
    { id: 'historyModal', close: closeHistoryModal },
    { id: 'promptEditorModal', close: closePromptEditorModal }
  ];

  modals.forEach(({ id, close }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', (e) => {
      if (e.target === el) {
        close();
      }
    });
  });
}

// Initialize App
async function initApp() {
  if (window.electronAPI) {
    appSettings = await window.electronAPI.getSettings();
    currentSelectedModel = appSettings.defaultModel || 'gemini-3.8-flash';
    if (Array.isArray(appSettings.textPrompts) && appSettings.textPrompts.length > 0) {
      currentQuickPrompts = [...appSettings.textPrompts];
    }
    setupElectronListeners();
  }
  populateModelDropdowns();
  setupHotkeyRecorder();
  setupMousePassthroughListeners();
  setupQuickTextKeyboardListener();
  setupQuickTextContainerInteractions();
  setupModalBackdropClose();
  resizeCanvasToVirtualScreen();
}

let currentVirtualBounds = null;

window.addEventListener('load', initApp);
window.addEventListener('resize', () => resizeCanvasToVirtualScreen());

function resizeCanvasToVirtualScreen() {
  const bounds = arguments[0] || null;
  if (bounds && typeof bounds.width === 'number' && bounds.width > 0 && typeof bounds.height === 'number' && bounds.height > 0) {
    currentVirtualBounds = {
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width,
      height: bounds.height
    };
  }

  const activeBounds = currentVirtualBounds;
  let targetW = (activeBounds && activeBounds.width > 0) ? activeBounds.width : window.innerWidth;
  let targetH = (activeBounds && activeBounds.height > 0) ? activeBounds.height : window.innerHeight;

  if (window.outerWidth && window.outerWidth > targetW) targetW = window.outerWidth;
  if (window.outerHeight && window.outerHeight > targetH) targetH = window.outerHeight;

  if (window.screen && typeof window.screen.width === 'number' && typeof window.screen.height === 'number') {
    targetW = Math.max(targetW, window.screen.width);
    targetH = Math.max(targetH, window.screen.height);
  }

  targetW = Math.ceil(targetW);
  targetH = Math.ceil(targetH);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  canvas.style.position = 'fixed';
  canvas.style.top = '0px';
  canvas.style.left = '0px';
  canvas.style.width = targetW + 'px';
  canvas.style.height = targetH + 'px';
  drawScene();

  if (!activeBounds && window.electronAPI && window.electronAPI.getDisplayBounds) {
    window.electronAPI.getDisplayBounds().then(b => {
      if (b) {
        currentVirtualBounds = b;
        let bw = Math.max(b.width, (window.screen && window.screen.width) || b.width);
        let bh = Math.max(b.height, (window.screen && window.screen.height) || b.height);
        bw = Math.ceil(bw);
        bh = Math.ceil(bh);
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
          canvas.style.width = bw + 'px';
          canvas.style.height = bh + 'px';
          drawScene();
        }
      }
    }).catch(() => {});
  }
}

try {
  resizeCanvasToVirtualScreen();
} catch (e) {}

function populateModelDropdowns() {
  const dropdownMenu = document.getElementById('modelDropdownMenu');
  if (dropdownMenu) dropdownMenu.innerHTML = '';

  AI_MODELS.forEach(m => {
    if (dropdownMenu) {
      const optDiv = document.createElement('div');
      optDiv.className = `model-option ${m.id === currentSelectedModel ? 'active' : ''}`;
      optDiv.dataset.value = m.id;
      optDiv.innerHTML = `<span>${m.name}</span>`;
      optDiv.onclick = (e) => selectAiModel(m.id, m.name, optDiv, e);
      dropdownMenu.appendChild(optDiv);
    }
  });

  const selectedModelObj = AI_MODELS.find(m => m.id === currentSelectedModel) || AI_MODELS[0];
  const triggerName = document.getElementById('triggerModelName');
  if (triggerName) triggerName.innerText = selectedModelObj.name;
}

function setupElectronListeners() {
  if (typeof window.electronAPI.onStartSnipping === 'function') {
    window.electronAPI.onStartSnipping((frames) => {
      startSnippingUI(frames);
    });
  }

  if (typeof window.electronAPI.onFreezeScreenSnapshot === 'function') {
    window.electronAPI.onFreezeScreenSnapshot((frames) => {
      handleFreezeScreenSnapshot(frames);
    });
  }

  if (typeof window.electronAPI.onCancelSnipping === 'function') {
    window.electronAPI.onCancelSnipping(() => {
      cancelSnippingUI(true);
    });
  }

  if (typeof window.electronAPI.onOpenSettings === 'function') {
    window.electronAPI.onOpenSettings(() => {
      openSettingsModal();
    });
  }

  if (typeof window.electronAPI.onOpenHistory === 'function') {
    window.electronAPI.onOpenHistory(() => {
      openHistoryModal();
    });
  }

  if (typeof window.electronAPI.onModelChangedFromTray === 'function') {
    window.electronAPI.onModelChangedFromTray((modelId) => {
    currentSelectedModel = modelId;
    if (typeof selectedModalModelId !== 'undefined') {
      selectedModalModelId = modelId;
    }
    if (appSettings) {
      appSettings.defaultModel = modelId;
    }
    populateModelDropdowns();
    updateCustomModelDropdownUI(modelId);
    const modalModelLabel = document.getElementById('modalSelectedModelName');
    if (modalModelLabel) {
      modalModelLabel.innerText = MODEL_DISPLAY_NAMES[modelId] || modelId;
    }
    triggerAutoRefreshIfActive();
    });
  }

  if (window.electronAPI.onModelChanged) {
    window.electronAPI.onModelChanged((data) => {
      const modelId = (typeof data === 'string') ? data : (data && data.modelId);
      if (modelId) {
        currentSelectedModel = modelId;
        if (typeof selectedModalModelId !== 'undefined') {
          selectedModalModelId = modelId;
        }
        if (appSettings) {
          appSettings.defaultModel = modelId;
        }
        populateModelDropdowns();
        updateCustomModelDropdownUI(modelId);
        const modalModelLabel = document.getElementById('modalSelectedModelName');
        if (modalModelLabel) {
          modalModelLabel.innerText = MODEL_DISPLAY_NAMES[modelId] || modelId;
        }
      }
    });
  }

  if (window.electronAPI.onOpenQuickTextToolbar) {
    window.electronAPI.onOpenQuickTextToolbar((data) => {
      handleOpenQuickText(data);
    });
  }

  if (window.electronAPI.onCloseQuickTextUI) {
    window.electronAPI.onCloseQuickTextUI(() => {
      handleCloseQuickTextUI();
    });
  }

  if (window.electronAPI.onQuickAnswerChunk) {
    window.electronAPI.onQuickAnswerChunk((data) => {
      handleQuickAnswerChunk(data);
    });
  }

  if (window.electronAPI.onQuickAnswerFinish) {
    window.electronAPI.onQuickAnswerFinish((data) => {
      handleQuickAnswerFinish(data);
    });
  }

  if (window.electronAPI.onQuickAnswerError) {
    window.electronAPI.onQuickAnswerError((data) => {
      handleQuickAnswerError(data);
    });
  }
}

// --- SNIPPING UI CONTROLLER ---
let frozenScreenImage = null;

function loadFrozenScreenImage(dataUrl) {
  if (!dataUrl) return;
  // Native transparent overlay provides 100% sharp screen view without JPEG blur or dark mode color distortion.
  // Preserving function signature for test suite compatibility.
  frozenScreenImage = null;
}

// startSnippingUI() {
function startSnippingUI(payload = null) {
  let bounds = null;
  let freezeDataUrl = null;

  if (payload) {
    if (payload.bounds || payload.freezeDataUrl) {
      bounds = payload.bounds || null;
      freezeDataUrl = payload.freezeDataUrl || null;
    } else if (typeof payload.width === 'number' && typeof payload.height === 'number') {
      bounds = payload;
    } else if (typeof payload.x === 'number' && typeof payload.width === 'number') {
      bounds = payload;
    } else if (typeof payload === 'string' && payload.startsWith('data:image/')) {
      freezeDataUrl = payload;
    }
  }

  if (freezeDataUrl) {
    loadFrozenScreenImage(freezeDataUrl);
  } else {
    frozenScreenImage = null;
  }

  window.scrollTo(0, 0);
  if (document.body) {
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
  }
  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
  }

  document.body.classList.add('snipping-active');
  stopLaserScan();
  stopSpeechSynthesis();
  isSnippingActive = true;
  box = { x: 0, y: 0, w: 0, h: 0 };
  const aiWin = document.getElementById('aiWindow');
  if (aiWin) {
    aiWin.style.display = 'none';
    aiWin.style.visibility = 'hidden';
    aiWin.style.opacity = '0';
  }

  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.style.display = 'none';
    settingsModal.style.visibility = 'hidden';
    settingsModal.style.opacity = '0';
  }
  const historyModal = document.getElementById('historyModal');
  if (historyModal) {
    historyModal.style.display = 'none';
    historyModal.style.visibility = 'hidden';
    historyModal.style.opacity = '0';
  }
  const quickCont = document.getElementById('quickTextContainer');
  if (quickCont) {
    quickCont.style.display = 'none';
  }

  canvas.style.display = 'block';
  canvas.style.backgroundImage = 'none';
  currentAppliedCursor = null;
  setCanvasCursor('crosshair');
  if (topHint) topHint.style.display = 'none';
  if (percentBadge) percentBadge.style.display = 'none';

  freezeFrames = [];
  if (window.electronAPI) {
    window.electronAPI.setIgnoreMouseEvents(false);
  }
  resizeCanvasToVirtualScreen(bounds);
}

function cancelSnippingUI(fromMain = false) {
  document.body.classList.remove('toolbar-visible');
  document.body.classList.remove('snipping-active');
  stopLaserScan();
  stopSpeechSynthesis();
  freezeFrames = [];
  frozenScreenImage = null;
  box = { x: 0, y: 0, w: 0, h: 0 };
  if (canvas) {
    canvas.style.backgroundImage = 'none';
  }

  if (!isSnippingActive && !isLaserScanning) {
    hideSmartScreenToolbar(false);
    canvas.style.display = 'none';
    if (topHint) topHint.style.display = 'none';
    if (percentBadge) percentBadge.style.display = 'none';
    return;
  }

  hideSmartScreenToolbar(false);
  isSnippingActive = false;
  isDrawing = false;
  isMoving = false;
  isResizing = false;
  activeHandle = null;
  box = { x: 0, y: 0, w: 0, h: 0 };
  canvas.style.display = 'none';
  currentAppliedCursor = null;
  setCanvasCursor('default');
  if (topHint) topHint.style.display = 'none';
  if (percentBadge) percentBadge.style.display = 'none';
  drawScene();

  if (window.electronAPI && !fromMain) {
    const settingsModal = document.getElementById('settingsModal');
    const historyModal = document.getElementById('historyModal');
    const isModalOpen = (settingsModal && settingsModal.style.display === 'flex') || (historyModal && historyModal.style.display === 'flex');

    if (aiWindow.style.display !== 'flex' && !isModalOpen) {
      window.electronAPI.hideWindow();
    } else {
      window.electronAPI.cancelSnipping();
    }
  }
}

const SNIP_CLEAN_CROSSHAIR_CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='21' height='21' viewBox='0 0 21 21'%3E%3Cline x1='10.5' y1='1' x2='10.5' y2='20' stroke='%23000000' stroke-width='1.2' stroke-linecap='square'/%3E%3Cline x1='1' y1='10.5' x2='20' y2='10.5' stroke='%23000000' stroke-width='1.2' stroke-linecap='square'/%3E%3C/svg%3E\") 10 10, crosshair";

let freezeFrames = [];

function handleFreezeScreenSnapshot(frames) {
  const url = (typeof frames === 'string')
    ? frames
    : (frames && frames.freezeDataUrl)
      ? frames.freezeDataUrl
      : (Array.isArray(frames) && frames[0] && frames[0].dataUrl)
        ? frames[0].dataUrl
        : null;

  if (url) {
    loadFrozenScreenImage(url);
  }
  if (canvas) {
    canvas.style.backgroundImage = 'none';
  }
  requestDrawScene();
}

let currentAppliedCursor = null;

function setCanvasCursor(newCursor) {
  if (currentAppliedCursor === newCursor) return;
  currentAppliedCursor = newCursor;
  const targetCursor = (newCursor === 'crosshair') ? SNIP_CLEAN_CROSSHAIR_CURSOR : newCursor;
  if (canvas && canvas.style.cursor !== newCursor) {
    if (canvas.style.cursor !== targetCursor) {
      canvas.style.cursor = targetCursor;
    }
  }
}

// Universal digit extractor supporting Physical KeyCodes (Digit1-8, Numpad1-8), Standard Digits (1-8),
// and Thai Kedmanee Keyboard Layout top row keys (ๅ, /, -, ภ, ถ, ุ, ึ, ค)
function getDigitFromKeyEvent(e) {
  if (!e) return null;
  // 1. Physical key code (independent of keyboard language / OS layout)
  if (e.code) {
    const digitMatch = e.code.match(/^Digit([1-8])$/);
    if (digitMatch) return parseInt(digitMatch[1], 10);
    const numpadMatch = e.code.match(/^Numpad([1-8])$/);
    if (numpadMatch) return parseInt(numpadMatch[1], 10);
  }
  // 2. Standard ASCII digit character
  if (typeof e.key === 'string' && e.key >= '1' && e.key <= '8') {
    return parseInt(e.key, 10);
  }
  // 3. Thai Kedmanee top row keyboard mapping (1-8):
  // 1=ๅ, 2=/, 3=-, 4=ภ, 5=ถ, 6=ุ, 7=ึ, 8=ค
  const thaiDigitMap = {
    'ๅ': 1, '/': 2, '-': 3, 'ภ': 4,
    'ถ': 5, 'ุ': 6, 'ึ': 7, 'ค': 8
  };
  if (e.key && thaiDigitMap[e.key]) {
    return thaiDigitMap[e.key];
  }
  return null;
}

function isCustomQuestionKeyEvent(e) {
  if (!e) return false;
  if (e.key === '?' || e.key === 'ฦ') return true;
  if (e.key === '/' && (!e.code || e.code === 'Slash')) return true;
  if (e.code === 'Slash' && (e.shiftKey || !e.ctrlKey)) return true;
  return false;
}

// Escape key listener and category hotkeys during active window focus
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.preventDefault();
    if (isSnippingActive) {
      cancelSnippingUI();
      return;
    }
    const promptModal = document.getElementById('promptEditorModal');
    const settingsModal = document.getElementById('settingsModal');
    const historyModal = document.getElementById('historyModal');
    if (promptModal && (promptModal.style.display === 'flex' || window.getComputedStyle(promptModal).display === 'flex')) {
      closePromptEditorModal();
    } else if (settingsModal && (settingsModal.style.display === 'flex' || window.getComputedStyle(settingsModal).display === 'flex')) {
      closeSettingsModal();
    } else if (historyModal && (historyModal.style.display === 'flex' || window.getComputedStyle(historyModal).display === 'flex')) {
      closeHistoryModal();
    } else if (aiWindow && (aiWindow.style.display === 'flex' || window.getComputedStyle(aiWindow).display === 'flex')) {
      closeAiWindow();
    }
    return;
  }

  // Category hotkeys (1-8 and ?) when selection area is active (Standard Digits, Numpad, and Thai layout)
  if (isSnippingActive && box && box.w >= 10 && box.h >= 10) {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag !== 'input' && tag !== 'textarea') {
      const digit = getDigitFromKeyEvent(e);
      if (digit !== null && digit >= 1 && digit <= 8) {
        e.preventDefault();
        e.stopPropagation();
        const digitIndex = digit - 1;
        executeScreenPromptByIndex(digitIndex);
        return;
      } else if (isCustomQuestionKeyEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
        toggleQuickCustomInput(true);
        return;
      }
    }
  }

  // Full Screen Snip Shortcut (Enter or Space while in snipping mode without selection)
  if (isSnippingActive && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    if (box && box.w >= 10 && box.h >= 10) {
      executeScreenPrompt('answer');
    } else {
      box = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      isSnippingActive = false;
      if (topHint) topHint.style.display = 'none';
      stopLaserScan();
      processScreenCapture(box);
    }
    return;
  }

  // Ctrl+C / Cmd+C text copy shortcut
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
    const sel = (window.getSelection && window.getSelection().toString()) ? window.getSelection().toString() : '';
    if (sel && sel.length > 0) {
      if (window.electronAPI && window.electronAPI.writeClipboardText) {
        window.electronAPI.writeClipboardText(sel);
      }
    }
  }
});

let isSceneDrawPending = false;
function requestDrawScene() {
  if (isSceneDrawPending) return;
  isSceneDrawPending = true;
  requestAnimationFrame(() => {
    isSceneDrawPending = false;
    drawScene();
  });
}

// --- MOUSE CANVAS EVENTS ---
// Double-click to instantly capture entire full screen and taskbar
canvas.addEventListener('dblclick', (e) => {
  if (!isSnippingActive) return;
  e.preventDefault();
  box = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const selectedBox = { ...box };
  isSnippingActive = false;
  stopLaserScan();
  stopSpeechSynthesis();
  if (percentBadge) percentBadge.style.display = 'none';
  if (canvas) canvas.style.display = 'none';
  if (topHint) topHint.style.display = 'none';
  document.body.classList.remove('snipping-active');
  processScreenCapture(selectedBox);
});

canvas.addEventListener('mousedown', (e) => {
  if (!isSnippingActive) return;
  if (e.button === 2) { // Right click cancel
    cancelSnippingUI();
    return;
  }
  if (e.button !== 0) return;
  e.preventDefault();

  const mx = e.clientX;
  const my = e.clientY;
  lastMouseX = mx;
  lastMouseY = my;

  activeHandle = getHandleAt(mx, my);
  if (activeHandle && box.w > 0) {
    isResizing = true;
    startMouseX = mx;
    startMouseY = my;
    resizeAnchor = {
      left: box.x,
      top: box.y,
      right: box.x + box.w,
      bottom: box.y + box.h
    };
    setCanvasCursor(getCursorForHandle(activeHandle));
    hideSmartScreenToolbar(true);
    requestDrawScene();
    return;
  }

  if (isInsideBox(mx, my) && box.w > 0) {
    isMoving = true;
    dragOffsetX = mx - box.x;
    dragOffsetY = my - box.y;
    setCanvasCursor('move');
    hideSmartScreenToolbar(true);
    requestDrawScene();
    return;
  }

  isDrawing = true;
  startMouseX = mx;
  startMouseY = my;
  box = { x: mx, y: my, w: 0, h: 0 };
  hideSmartScreenToolbar(false);
  setCanvasCursor('crosshair');
  drawScene();
});

canvas.addEventListener('mousemove', (e) => {
  if (!isSnippingActive) return;

  const mx = e.clientX;
  const my = e.clientY;
  lastMouseX = mx;
  lastMouseY = my;

  if (isLaserScanning) {
    requestDrawScene();
    return;
  }

  if (!isDrawing && !isMoving && !isResizing) {
    const handle = getHandleAt(mx, my);
    if (handle) {
      setCanvasCursor(getCursorForHandle(handle));
    } else if (isInsideBox(mx, my) && box.w > 0) {
      setCanvasCursor('move');
    } else {
      setCanvasCursor('crosshair');
    }
    return;
  }

  if (isResizing) {
    if (!resizeAnchor) return;
    let curX = Math.max(0, Math.min(canvas.width, mx));
    let curY = Math.max(0, Math.min(canvas.height, my));

    // Magnetic edge snapping for border precision
    const SNAP_PX = 14;
    if (curX <= SNAP_PX) curX = 0;
    else if (curX >= canvas.width - SNAP_PX) curX = canvas.width;

    if (curY <= SNAP_PX) curY = 0;
    else if (curY >= canvas.height - SNAP_PX) curY = canvas.height;

    let nextX = box.x;
    let nextY = box.y;
    let nextW = box.w;
    let nextH = box.h;

    // Fully unrestricted 8-directional resizing: can cross over opposing edges in any direction
    // (e.g. dragging bottom upwards above top, dragging left rightwards past right, etc.)
    if (activeHandle === 'tl') {
      nextX = Math.min(resizeAnchor.right, curX);
      nextY = Math.min(resizeAnchor.bottom, curY);
      nextW = Math.abs(resizeAnchor.right - curX);
      nextH = Math.abs(resizeAnchor.bottom - curY);
    } else if (activeHandle === 'tr') {
      nextX = Math.min(resizeAnchor.left, curX);
      nextY = Math.min(resizeAnchor.bottom, curY);
      nextW = Math.abs(curX - resizeAnchor.left);
      nextH = Math.abs(resizeAnchor.bottom - curY);
    } else if (activeHandle === 'bl') {
      nextX = Math.min(resizeAnchor.right, curX);
      nextY = Math.min(resizeAnchor.top, curY);
      nextW = Math.abs(resizeAnchor.right - curX);
      nextH = Math.abs(curY - resizeAnchor.top);
    } else if (activeHandle === 'br') {
      nextX = Math.min(resizeAnchor.left, curX);
      nextY = Math.min(resizeAnchor.top, curY);
      nextW = Math.abs(curX - resizeAnchor.left);
      nextH = Math.abs(curY - resizeAnchor.top);
    } else if (activeHandle === 'tc') {
      // Top center: free vertical drag (can drag downwards past bottom edge)
      nextX = resizeAnchor.left;
      nextW = resizeAnchor.right - resizeAnchor.left;
      nextY = Math.min(resizeAnchor.bottom, curY);
      nextH = Math.abs(resizeAnchor.bottom - curY);
    } else if (activeHandle === 'bc') {
      // Bottom center: free vertical drag (can drag upwards past top edge - ลากจากล่างขึ้นบน)
      nextX = resizeAnchor.left;
      nextW = resizeAnchor.right - resizeAnchor.left;
      nextY = Math.min(resizeAnchor.top, curY);
      nextH = Math.abs(curY - resizeAnchor.top);
    } else if (activeHandle === 'ml') {
      // Middle left: free horizontal drag (can drag rightwards past right edge - ลากจากซ้ายไปขวา)
      nextY = resizeAnchor.top;
      nextH = resizeAnchor.bottom - resizeAnchor.top;
      nextX = Math.min(resizeAnchor.right, curX);
      nextW = Math.abs(resizeAnchor.right - curX);
    } else if (activeHandle === 'mr') {
      // Middle right: free horizontal drag (can drag leftwards past left edge)
      nextY = resizeAnchor.top;
      nextH = resizeAnchor.bottom - resizeAnchor.top;
      nextX = Math.min(resizeAnchor.left, curX);
      nextW = Math.abs(curX - resizeAnchor.left);
    }

    if (nextX !== box.x || nextY !== box.y || nextW !== box.w || nextH !== box.h) {
      box.x = nextX;
      box.y = nextY;
      box.w = nextW;
      box.h = nextH;
      requestDrawScene();
    }
    return;
  }

  if (isMoving) {
    const nextX = Math.max(0, Math.min(mx - dragOffsetX, canvas.width - box.w));
    const nextY = Math.max(0, Math.min(my - dragOffsetY, canvas.height - box.h));
    if (nextX !== box.x || nextY !== box.y) {
      box.x = nextX;
      box.y = nextY;
      requestDrawScene();
    }
    return;
  }

  if (isDrawing) {
    let curX = Math.max(0, Math.min(canvas.width, mx));
    let curY = Math.max(0, Math.min(canvas.height, my));

    // Magnetic edge snapping for easy full-screen and edge-to-edge taskbar coverage
    const SNAP_PX = 14;
    if (curX <= SNAP_PX) curX = 0;
    else if (curX >= canvas.width - SNAP_PX) curX = canvas.width;

    if (curY <= SNAP_PX) curY = 0;
    else if (curY >= canvas.height - SNAP_PX) curY = canvas.height;

    const nextX = Math.min(startMouseX, curX);
    const nextY = Math.min(startMouseY, curY);
    const nextW = Math.abs(curX - startMouseX);
    const nextH = Math.abs(curY - startMouseY);

    if (nextX !== box.x || nextY !== box.y || nextW !== box.w || nextH !== box.h) {
      box.x = nextX;
      box.y = nextY;
      box.w = nextW;
      box.h = nextH;
      requestDrawScene();
    }
  }
});

window.addEventListener('mouseup', async (e) => {
  if (e && typeof e.clientX === 'number') {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
  if (!isSnippingActive) return;
  if (isDrawing || isMoving || isResizing) {
    isDrawing = false;
    isMoving = false;
    isResizing = false;
    resizeAnchor = null;
    activeHandle = null;

    if (box.w >= 8 && box.h >= 8) {
      isSnippingActive = true;
      if (canvas) canvas.style.display = 'block';
      showSmartScreenToolbar(box);
      requestDrawScene();
      // processScreenCapture(box);
      // processScreenCapture(selectedBox);
    } else {
      box = { x: 0, y: 0, w: 0, h: 0 };
      hideSmartScreenToolbar(false);
      setCanvasCursor('crosshair');
      requestDrawScene();
    }
  }
});

function getHandleAt(mx, my) {
  if (!box || box.w < 10 || box.h < 10) return null;
  const radius = 10;
  const halfW = box.w / 2;
  const halfH = box.h / 2;
  const handles = {
    tl: { x: box.x, y: box.y },
    tc: { x: box.x + halfW, y: box.y },
    tr: { x: box.x + box.w, y: box.y },
    ml: { x: box.x, y: box.y + halfH },
    mr: { x: box.x + box.w, y: box.y + halfH },
    bl: { x: box.x, y: box.y + box.h },
    bc: { x: box.x + halfW, y: box.y + box.h },
    br: { x: box.x + box.w, y: box.y + box.h }
  };
  for (let key in handles) {
    if (Math.hypot(mx - handles[key].x, my - handles[key].y) <= radius) return key;
  }
  return null;
}

function getCursorForHandle(handle) {
  switch (handle) {
    case 'tl':
    case 'br':
      return 'nwse-resize';
    case 'tr':
    case 'bl':
      return 'nesw-resize';
    case 'tc':
    case 'bc':
      return 'ns-resize';
    case 'ml':
    case 'mr':
      return 'ew-resize';
    default:
      return 'crosshair';
  }
}

function isInsideBox(mx, my) {
  return mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h;
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!isSnippingActive && !isLaserScanning && box.w === 0) {
    return;
  }

  // 1. Pristine frozen screen image (Eliminates video blooming, transparency washout and freezes screen)
  if (frozenScreenImage && frozenScreenImage.complete && frozenScreenImage.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frozenScreenImage, 0, 0, canvas.width, canvas.height);
  }
  if (freezeFrames && freezeFrames.length > 0) {
    freezeFrames.forEach(f => {
      if (f && f.img) ctx.drawImage(f.img, f.x, f.y, f.width, f.height);
    });
  }

  // 2. Stable, uniform dark dim overlay strictly on the unselected region
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";

  if (box.w > 0 && box.h > 0) {
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.fill('evenodd');
    ctx.clearRect(box.x, box.y, box.w, box.h);
  } else {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  // 3. Crisp dashed selection border around the cut-out box matching Image 3
  if (box.w > 0 && box.h > 0) {
    ctx.save();
    if (!isDrawing && !isMoving && !isResizing) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.restore();

    if (!isDrawing) {
        drawInteractiveHandles(box.x, box.y, box.w, box.h);
    }
  }
}

function drawInteractiveHandles(x, y, w, h) {
  if (w < 14 || h < 14) return;
  const halfW = w / 2;
  const halfH = h / 2;
  const handles = [
    { x: x, y: y },
    { x: x + halfW, y: y },
    { x: x + w, y: y },
    { x: x, y: y + halfH },
    { x: x + w, y: y + halfH },
    { x: x, y: y + h },
    { x: x + halfW, y: y + h },
    { x: x + w, y: y + h }
  ];

  ctx.save();
  for (let i = 0; i < handles.length; i++) {
    const pt = handles[i];
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();
  }
  ctx.restore();
}

function drawGradientLaser() {
  // Gimmick scanning animation completely removed
}

function startLaserScan(cropBox) {
  stopSpeechSynthesis();
  stopLaserScan();
}

function finishLaserScanSmoothly() {
  return new Promise((resolve) => {
    stopLaserScan();
    if (percentBadge) percentBadge.style.display = 'none';
    canvas.style.display = 'none';
    metricsBanner.classList.remove('thinking');
    resolve();
  });
}

function stopLaserScan() {
  isLaserScanning = false;
  if (laserAnimId) {
    cancelAnimationFrame(laserAnimId);
    laserAnimId = null;
  }
  if (scanProgressInterval) {
    clearInterval(scanProgressInterval);
    scanProgressInterval = null;
  }
  if (percentBadge) percentBadge.style.display = 'none';
}

function updatePercentBadgePos() {
  if (percentBadge) percentBadge.style.display = 'none';
}

// Rogue foreign script detector & sanitizer
// Strips accidental cross-script token bleeds (Arabic, Hebrew, Devanagari, etc.)
// from Thai and English AI responses while preserving genuine Thai, English, numbers, math, and code.
const ROGUE_FOREIGN_SCRIPT_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0900-\u0D7F\u0F00-\u109F\u1780-\u17FF]+/g;

function sanitizeRogueForeignScripts(text, allowForeign = false) {
  if (!text || typeof text !== 'string') return '';
  if (allowForeign) return text;
  let clean = text.replace(ROGUE_FOREIGN_SCRIPT_REGEX, '');
  clean = clean.replace(/เพื่อย(?=การ)/g, 'เพื่อ');
  clean = clean.replace(/[ \t]{2,}/g, ' ');
  return clean;
}

// --- STREAMING SECTION PARSER & REAL-TIME RENDERER ---
let isStreamingActive = false;
let accumulatedStreamText = '';

function parseStreamSections(text) {
  const sections = {
    answer: '',
    thinking_process: '',
    explain: '',
    summary: '',
    translate: '',
    ocr: ''
  };

  if (!text) return sections;

  // Normalized delimiter tags (matches left-to-right UI tabs: Answer -> Explain -> Summary -> Translate -> OCR)
  const tags = [
    { key: 'answer', pattern: /###?\s*\[?(?:ANSWER|คำตอบ|คำตอบหลัก)\]?|\*\*\[?(?:ANSWER|คำตอบ)\]?\*\*/i },
    { key: 'explain', pattern: /###?\s*\[?(?:EXPLAIN|EXPLANATION|คำอธิบาย|อธิบาย|อธิบายเชิงลึก)\]?|\*\*\[?(?:EXPLAIN|คำอธิบาย)\]?\*\*/i },
    { key: 'summary', pattern: /###?\s*\[?(?:SUMMARY|สรุป|สรุปประเด็น|สรุปประเด็นสำคัญ)\]?|\*\*\[?(?:SUMMARY|สรุป)\]?\*\*/i },
    { key: 'translate', pattern: /###?\s*\[?(?:TRANSLATE|TRANSLATION|คำแปล|แปลไทย|แปลภาษา|แปล)\]?|\*\*\[?(?:TRANSLATE|แปลไทย)\]?\*\*/i },
    { key: 'thinking_process', pattern: /###?\s*\[?(?:THINKING(?:_PROCESS)?|กระบวนการคิด)\]?|\*\*\[?(?:THINKING|กระบวนการคิด)\]?\*\*/i },
    { key: 'ocr', pattern: /###?\s*\[?(?:OCR|TEXT|ถอดข้อความ|ข้อความในภาพ|ถอดอักษร)\]?|\*\*\[?(?:OCR|TEXT|ถอดข้อความ)\]?\*\*/i }
  ];

  const matches = [];
  tags.forEach(t => {
    const match = text.search(t.pattern);
    if (match !== -1) {
      matches.push({ key: t.key, index: match, pattern: t.pattern });
    }
  });

  matches.sort((a, b) => a.index - b.index);

  if (matches.length === 0) {
    // If no header tag detected yet, all incoming text is assumed to be answer
    sections.answer = sanitizeRogueForeignScripts(text.trim());
    return sections;
  }

  // Pre-header content (if any)
  if (matches[0].index > 0) {
    sections.answer = sanitizeRogueForeignScripts(text.substring(0, matches[0].index).trim());
  }

  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const next = matches[i + 1];
    const startIndex = curr.index;
    const endIndex = next ? next.index : text.length;

    let chunk = text.substring(startIndex, endIndex);
    chunk = chunk.replace(curr.pattern, '').trim();
    if (curr.key !== 'ocr') {
      chunk = sanitizeRogueForeignScripts(chunk);
    }
    sections[curr.key] = chunk;
  }

  return sections;
}

// --- INSTANT SMART CONTENT EXTRACTION FOR ALL CATEGORIES ---
function createQuickBulletSummary(text) {
  if (!text) return '- สรุปผลลัพธ์ตามข้อมูลที่วิเคราะห์จากภาพหน้าจอ';
  const clean = text.replace(/^#{1,6}\s+.*$/gm, '').replace(/[*_`]/g, '').trim();
  const sentences = clean.split(/[\n\.\?!]+/).map(s => s.trim()).filter(s => s.length > 5);
  if (sentences.length === 0) return '- ' + clean.substring(0, 100);
  return sentences.slice(0, 3).map(s => `- ${s}`).join('\n');
}

let isTranslatingOcr = false;

function triggerAutoTranslation(sourceText) {
  if (isTranslatingOcr || !sourceText) return;
  const cleanSource = sourceText.trim();
  if (!cleanSource || cleanSource === '(ไม่มีข้อความในภาพ)' || cleanSource.includes('ไม่พบข้อความตัวอักษร')) return;
  isTranslatingOcr = true;
  if (activeCategory === 'translate') {
    if (isStreamingActive) {
      scheduleScreenStreamRender();
    } else {
      renderConversationView();
    }
  }
  if (window.electronAPI && window.electronAPI.quickTextAsk) {
    window.electronAPI.quickTextAsk({
      promptText: `คุณคือนักแปลภาษาระดับมืออาชีพ จงแปลข้อความต่อไปนี้เป็นภาษาไทยโดยตรงเท่านั้น แปลตรงตัวตามต้นฉบับประโยคต่อประโยค ย่อหน้าต่อย่อหน้า ครบถ้วนทุกประโยค แสดงเฉพาะคำแปลภาษาไทยล้วนๆ ห้ามนำข้อความภาษาอังกฤษหรือภาษาต้นฉบับมาแสดงซ้ำเด็ดขาด ห้ามแต่งเติมหัวข้อใหม่ พร้อมรักษารูปแบบและองค์ประกอบ (Layout & Spatial Composition) ให้ตรงตามต้นฉบับ เช่น การขึ้นบรรทัดใหม่ การเว้นวรรค หัวข้อ รายการข้อ (Bullet points) และตาราง Markdown เพื่อให้อ่านง่าย สบายตา ห้ามสรุป ห้ามอธิบาย และห้ามตัดทอนข้อความใดๆ (หากต้นฉบับเป็นภาษาไทยอยู่แล้ว ให้แปลเป็นภาษาอังกฤษ):\n\n${cleanSource}`
    }).then(res => {
      if (res && res.fullText && res.fullText.trim()) {
        const cleanTr = sanitizeRogueForeignScripts(res.fullText.trim());
        if (cleanTr && /[\u0E00-\u0E7F]/.test(cleanTr)) {
          currentAnalysisResult.translate = cleanTr;
        }
      }
    }).catch(err => {
      console.warn('Auto translation error:', err);
    }).finally(() => {
      isTranslatingOcr = false;
      if (activeCategory === 'translate') {
        if (isStreamingActive) {
          scheduleScreenStreamRender();
        } else {
          renderConversationView();
        }
      }
    });
  }
}

let isFetchingOcr = false;
let isFetchingExplain = false;

function triggerAutoOcr() {
  if (isFetchingOcr || !currentCroppedBase64) return;
  isFetchingOcr = true;
  if (activeCategory === 'ocr') {
    if (isStreamingActive) scheduleScreenStreamRender();
    else renderConversationView();
  }
  if (window.electronAPI && window.electronAPI.fetchCategory) {
    window.electronAPI.fetchCategory({
      base64Data: currentCroppedBase64,
      category: 'ocr',
      modelId: currentSelectedModel || 'gemini-3-flash-preview'
    }).then(res => {
      if (res && res.text) {
        currentAnalysisResult.ocr = res.text.trim();
      }
    }).catch(err => {
      console.warn('Auto OCR error:', err);
    }).finally(() => {
      isFetchingOcr = false;
      if (activeCategory === 'ocr') {
        if (isStreamingActive) scheduleScreenStreamRender();
        else renderConversationView();
      }
    });
  }
}

function triggerAutoExplain() {
  if (isFetchingExplain || !currentCroppedBase64) return;
  isFetchingExplain = true;
  if (activeCategory === 'explain') {
    if (isStreamingActive) scheduleScreenStreamRender();
    else renderConversationView();
  }
  if (window.electronAPI && window.electronAPI.fetchCategory) {
    window.electronAPI.fetchCategory({
      base64Data: currentCroppedBase64,
      category: 'explain',
      contextAnswer: currentAnalysisResult?.answer || '',
      modelId: currentSelectedModel || 'gemini-3-flash-preview'
    }).then(res => {
      if (res && res.text) {
        currentAnalysisResult.explain = res.text.trim();
      }
    }).catch(err => {
      console.warn('Auto Explain error:', err);
    }).finally(() => {
      isFetchingExplain = false;
      if (activeCategory === 'explain') {
        if (isStreamingActive) scheduleScreenStreamRender();
        else renderConversationView();
      }
    });
  }
}

function cleanThaiTranslation(raw) {
  if (!raw) return '';
  const text = raw.trim();

  // If text does not contain Thai, return empty string so untranslated raw foreign text is never displayed as Thai translation
  const hasThai = /[\u0E00-\u0E7F]/.test(text);
  if (!hasThai) return '';

  // 1. Check if text is divided by horizontal rule or markdown line dividers
  const hrParts = text.split(/\n\s*[-*_]{3,}\s*\n/);
  if (hrParts.length >= 2) {
    const firstHasThai = /[\u0E00-\u0E7F]/.test(hrParts[0]);
    const secondHasThai = /[\u0E00-\u0E7F]/.test(hrParts.slice(1).join('\n'));
    if (!firstHasThai && secondHasThai) {
      return hrParts.slice(1).join('\n\n').trim();
    }
  }

  // 2. Check if text has a Thai section header like ### แปลภาษา / ### คำแปล / ### ภาษาไทย
  const thaiHeaderMatch = text.search(/(?:#{1,4}\s*)?(?:คำแปล|แปลไทย|แปลภาษา|ภาษาไทย|Thai\s*Translation|Translation)\b/i);
  if (thaiHeaderMatch > 0) {
    const beforeHeader = text.substring(0, thaiHeaderMatch);
    const afterHeader = text.substring(thaiHeaderMatch);
    if (!/[\u0E00-\u0E7F]/.test(beforeHeader) && /[\u0E00-\u0E7F]/.test(afterHeader)) {
      return afterHeader.replace(/^(?:#{1,4}\s*)?(?:คำแปล|แปลไทย|แปลภาษา|ภาษาไทย|Thai\s*Translation|Translation)[:\s]*/i, '').trim();
    }
  }

  // 3. Check paragraphs split by double newlines where English original precedes Thai translation
  const paragraphs = text.split(/\n\s*\n/);
  if (paragraphs.length >= 2) {
    const firstThaiIdx = paragraphs.findIndex(p => /[\u0E00-\u0E7F]/.test(p));
    if (firstThaiIdx > 0) {
      const preceding = paragraphs.slice(0, firstThaiIdx).join('\n\n');
      const letterCount = (preceding.match(/[A-Za-z]/g) || []).length;
      if (letterCount >= 10 && !/[\u0E00-\u0E7F]/.test(preceding)) {
        return paragraphs.slice(firstThaiIdx).join('\n\n').trim();
      }
    }
  }

  return text;
}

function isCategoryFinished(cat, accumulatedText, isStreamDone) {
  if (isStreamDone) return true;
  if (!accumulatedText) return false;

  const nextPatterns = {
    answer: /###?\s*\[?(?:EXPLAIN|EXPLANATION|คำอธิบาย|SUMMARY|สรุป|TRANSLATE|คำแปล|แปลไทย|แปลภาษา|แปล|OCR|TEXT|ถอดข้อความ)\b/i,
    explain: /###?\s*\[?(?:SUMMARY|สรุป|TRANSLATE|คำแปล|แปลไทย|แปลภาษา|แปล|OCR|TEXT|ถอดข้อความ)\b/i,
    summary: /###?\s*\[?(?:TRANSLATE|คำแปล|แปลไทย|แปลภาษา|แปล|OCR|TEXT|ถอดข้อความ)\b/i,
    translate: /###?\s*\[?(?:OCR|TEXT|ถอดข้อความ|ข้อความในภาพ|ถอดอักษร)\b/i,
    ocr: null
  };

  const pattern = nextPatterns[cat];
  if (!pattern) return false;
  return pattern.test(accumulatedText);
}

function updateCategoryTabsProgress() {
  const categories = ['answer', 'explain', 'summary', 'translate', 'ocr'];
  categories.forEach(cat => {
    const isDone = isCategoryFinished(cat, (typeof accumulatedStreamText !== 'undefined') ? accumulatedStreamText : '', !isStreamingActive);
    const btn = document.querySelector(`.tab-btn[onclick*="'${cat}'"]`);
    if (btn) {
      if (isDone) {
        btn.classList.add('category-finished');
      } else {
        btn.classList.remove('category-finished');
      }
    }
  });
}

function getCategoryContent(cat, result) {
  if (!result) return '';

  const ans = sanitizeRogueForeignScripts(result.answer || '').trim();
  const exp = sanitizeRogueForeignScripts(result.explain || '').trim();
  const sum = sanitizeRogueForeignScripts(result.summary || '').trim();
  const tr = sanitizeRogueForeignScripts(result.translate || '').trim();
  const ocrText = (result.ocr || '').trim();

  switch (cat) {
    case 'answer':
      return ans || (typeof accumulatedStreamText !== 'undefined' ? accumulatedStreamText.replace(/###?\s*\[?[A-Z_a-zก-๙]+\]?/gi, '').trim() : '');

    case 'explain':
      if (exp) return exp;
      if (!isStreamingActive && ans) return ans;
      if (typeof isFetchingExplain !== 'undefined' && isFetchingExplain) {
        return `<div style="padding: 16px; color: #0284c7; display: flex; align-items: center; gap: 8px; font-size: 13px;"><svg style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>กำลังสร้างคำอธิบายเชิงลึก...</div>`;
      }
      return isStreamingActive ? '' : '_*(ไม่มีคำอธิบายเพิ่มเติมสำหรับภาพนี้)*_';

    case 'summary':
      if (sum) {
        return sum;
      }
      if (!isStreamingActive && ans) {
        return createQuickBulletSummary(ans);
      }
      return isStreamingActive ? '' : '_*(ไม่มีข้อความสรุป)*_';

    case 'translate':
      if (tr) {
        const cleaned = cleanThaiTranslation(tr);
        if (cleaned) return cleaned;
      }
      if (!isStreamingActive && ans) return ans;
      if (typeof isTranslatingOcr !== 'undefined' && isTranslatingOcr) {
        return `<div style="padding: 16px; color: #0284c7; display: flex; align-items: center; gap: 8px; font-size: 13px;"><svg style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>กำลังแปลข้อความเป็นภาษาไทย...</div>`;
      }
      if (isStreamingActive) {
        return '';
      }
      // If stream finished and translation is empty or not Thai, check if source has foreign characters
      const foreignSource = (ocrText || ans || '').trim();
      if (/[A-Za-z]/.test(foreignSource) && foreignSource.length > 5) {
        setTimeout(() => triggerAutoTranslation(foreignSource), 10);
        return `<div style="padding: 16px; color: #0284c7; display: flex; align-items: center; gap: 8px; font-size: 13px;"><svg style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>กำลังแปลข้อความเป็นภาษาไทย...</div>`;
      }
      return '_*(ไม่มีข้อความสำหรับแปลภาษา)*_';

    case 'ocr':
      if (ocrText && ocrText.length > 3 && !/^[\s\uD800-\uDBFF\uDC00-\uDFFF\u2600-\u27BF\uD83D\uDD17]+$/.test(ocrText)) return ocrText;
      if (typeof isFetchingOcr !== 'undefined' && isFetchingOcr) {
        return `<div style="padding: 16px; color: #0284c7; display: flex; align-items: center; gap: 8px; font-size: 13px;"><svg style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>กำลังถอดข้อความตัวอักษร (OCR)...</div>`;
      }
      return isStreamingActive ? '' : '*(ไม่พบข้อความตัวอักษรที่ถอดได้จากภาพนี้)*';

    default:
      return result[cat] || ans || '';
  }
}

let hasReceivedFirstToken = false;
let screenStreamRenderRaf = null;
let lastScreenRenderTime = 0;
let lastScreenRenderedHtml = '';

function scheduleScreenStreamRender() {
  if (screenStreamRenderRaf) return;
  screenStreamRenderRaf = requestAnimationFrame(() => {
    screenStreamRenderRaf = null;
    renderStreamingContent();
  });
}

function renderStreamingContent() {
  const target = document.getElementById('liveStreamingContent');
  if (!target) return;
  if (!hasReceivedFirstToken) return;

  const now = Date.now();
  // Fluid frame-synchronized render throttle (24ms ~ 45-60 FPS) for buttery smooth streaming
  if (!isStreamingActive || (now - lastScreenRenderTime >= 24)) {
    lastScreenRenderTime = now;
  } else {
    // Schedule next frame within fluid window
    if (!screenStreamRenderRaf) {
      screenStreamRenderRaf = setTimeout(() => {
        screenStreamRenderRaf = null;
        renderStreamingContent();
      }, Math.max(1, 24 - (now - lastScreenRenderTime)));
    }
    return;
  }

  updateCategoryTabsProgress();

  let textRaw = getCategoryContent(activeCategory, currentAnalysisResult);

  let html = '';
  if (textRaw) {
    const trimmed = textRaw.trim();
    if (trimmed.startsWith('<div') || trimmed.startsWith('<span') || trimmed.startsWith('<svg')) {
      html = trimmed;
    } else if (typeof marked !== 'undefined') {
      html = marked.parse(textRaw);
    } else {
      html = textRaw;
    }
    if (typeof DOMPurify !== 'undefined') {
      html = DOMPurify.sanitize(html);
    }
    if (activeCategory === 'ocr') {
      html = `<div class="ocr-rendered-container">${html}</div>`;
    }
    // Add pulsing animated cursor ONLY during active streaming AND when active category is not yet finished
    const isCatDone = isCategoryFinished(activeCategory, accumulatedStreamText, !isStreamingActive);
    if (isStreamingActive && !isCatDone) {
      html += '<span class="stream-blink-cursor"></span>';
    }
  } else if (isStreamingActive) {
    html = `
      <div class="skeleton-container" id="skeletonLoader">
        <div class="skeleton-line w-90"></div>
        <div class="skeleton-line w-full"></div>
        <div class="skeleton-line w-80"></div>
        <div class="skeleton-line w-45"></div>
      </div>
    `;
  }

  // Skip redundant DOM update if HTML unchanged (avoids layout thrashing)
  if (html === lastScreenRenderedHtml) return;
  lastScreenRenderedHtml = html;

  target.innerHTML = html;
  if (typeof renderMathInElement !== 'undefined') {
    try {
      renderMathInElement(target, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {}
  }
  // Formats clean headers: ### คำตอบหลัก and ### สรุปประเด็นสำคัญ

  // Smooth fluid auto-scroll following live generation
  if (chatThread) {
    const scrollDiff = chatThread.scrollHeight - chatThread.scrollTop - chatThread.clientHeight;
    if (scrollDiff < 140) {
      chatThread.scrollTo({
        top: chatThread.scrollHeight,
        behavior: 'smooth'
      });
    }
  }
}

// === [NEW SCREEN AREA SELECTION: FLOATING TOOLBAR INTEGRATION] ===
async function processScreenCapture(cropBox) {
  try {
    lastCroppedBox = cropBox;

    // 1. Immediately terminate snipping canvas & overlay states
    document.body.classList.remove('snipping-active');
    stopLaserScan();
    stopSpeechSynthesis();
    if (percentBadge) percentBadge.style.display = 'none';
    if (canvas) {
      canvas.style.display = 'none';
      canvas.style.backgroundImage = 'none';
    }
    if (topHint) topHint.style.display = 'none';
    isSnippingActive = false;

    // 2. Ensure legacy multi-tab AI response window stays strictly hidden
    const legacyAiWin = document.getElementById('aiWindow');
    if (legacyAiWin) {
      legacyAiWin.style.display = 'none';
      legacyAiWin.style.visibility = 'hidden';
      legacyAiWin.style.opacity = '0';
    }

    // 3. Delegate to Main Process for fast GDI RAM crop + Smart Floating Toolbar Presentation
    if (window.electronAPI && window.electronAPI.screenAreaSelected) {
      window.electronAPI.screenAreaSelected(cropBox);
    }
  } catch (err) {
    console.error('Error in new screen area selection:', err);
    cancelSnippingUI(true);
  }
}

/*
// ==============================================================================
// === [LEGACY SCREEN STREAM ANSWER WINDOW - COMMENTED OUT PER USER REQUEST] ===
// ==============================================================================
// Previous architecture: stream all 5 tabs (Answer, Explain, Summary, Translate, OCR) 
// into #aiWindow simultaneously. Kept as commented legacy code below:
async function legacyProcessScreenCapture(cropBox) {
  try {
    lastCroppedBox = cropBox;

    // 0. Pre-Check: Ensure API Key is configured before opening AI window
    const currentApiKey = (appSettings && appSettings.apiKey ? appSettings.apiKey.trim() : '');
    if (!currentApiKey) {
      if (isSnippingActive) cancelSnippingUI(true);
      if (canvas) canvas.style.display = 'none';
      if (topHint) topHint.style.display = 'none';
      if (percentBadge) percentBadge.style.display = 'none';
      stopLaserScan();

      // Guard: Ensure AI answer window NEVER displays
      if (aiWindow) {
        aiWindow.style.display = 'none';
        aiWindow.style.visibility = 'hidden';
        aiWindow.style.opacity = '0';
      }
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }

      openSettingsModal();
      alert("กรุณาระบุ Google AI Studio Gemini API Key ในเมนูการตั้งค่า");
      return;
    }

    // 1. Instant 0ms transition: hide snipping canvas, reveal AI window with skeleton
    document.body.classList.remove('snipping-active');
    stopLaserScan();
    if (percentBadge) percentBadge.style.display = 'none';
    canvas.style.display = 'none';
    canvas.style.backgroundImage = 'none';
    if (topHint) topHint.style.display = 'none';

    // Ensure all modals (Settings & History) are strictly closed and hidden
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.style.display = 'none';
      settingsModal.style.visibility = 'hidden';
      settingsModal.style.opacity = '0';
    }
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
      historyModal.style.display = 'none';
      historyModal.style.visibility = 'hidden';
      historyModal.style.opacity = '0';
    }

    // Default to Answer tab and reset thinking state
    activeCategory = 'answer';
    const firstTab = document.querySelector('.tab-btn');
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (firstTab) firstTab.classList.add('active');

    if (thinkingAccordion) thinkingAccordion.style.display = 'none';
    if (thinkingContent) thinkingContent.innerText = '';

    followUpChatMessages = [];
    isStreamingActive = true;
    hasReceivedFirstToken = false;
    accumulatedStreamText = '';
    lastScreenRenderedHtml = '';
    lastScreenRenderTime = 0;
    currentAnalysisResult = {
      answer: '',
      thinking_process: '',
      explain: '',
      summary: '',
      translate: '',
      ocr: ''
    };

    // 2. Inject Skeleton Screen into DOM FIRST before revealing window (guarantees zero flash of previous response)
    chatThread.innerHTML = `
      <div class="chat-bubble ai" id="liveStreamingBubble">
        <div id="liveStreamingContent" class="markdown-body" style="min-height: 80px; font-size: 14px; line-height: 1.65;">
          <div class="skeleton-container" id="skeletonLoader">
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-full"></div>
            <div class="skeleton-line w-80"></div>
            <div class="skeleton-line w-45"></div>
          </div>
        </div>
        <div id="liveStreamingActions" class="bubble-actions" style="margin-top: 8px; display: none; gap: 8px;" onselectstart="return false;" draggable="false">
          <button class="bubble-copy-btn" draggable="false" onselectstart="return false;" onclick="copySingleBubble('liveStreamingContent', this)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>คัดลอก</span>
          </button>
          <button class="bubble-copy-btn" draggable="false" onselectstart="return false;" onclick="speakTextFromBubble('liveStreamingContent', this)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            <span>อ่านเสียง</span>
          </button>
        </div>
      </div>
    `;

    // 3. Reveal AI window with clean skeleton already loaded in 0ms
    showAiWindowPosition(cropBox);

    // Cleanly stop laser scan and hide canvas simultaneously
    const streamStartTime = performance.now();
    let hasAnswerCompleted = false;

    metricsBanner.classList.add('thinking');
    if (latencyText) latencyText.innerText = "กำลังวิเคราะห์...";

    // 4. Pre-attach real-time streaming listeners before trigger
    if (window.electronAPI && window.electronAPI.removeStreamListeners) {
      window.electronAPI.removeStreamListeners();
    }
    window.electronAPI.onStreamChunk((data) => {
      if (data.type === 'ocr') {
        currentAnalysisResult.ocr = (currentAnalysisResult.ocr || '') + data.chunk;
        hasReceivedFirstToken = true;
        if (activeCategory === 'ocr') {
          renderStreamingContent();
        }
      } else {
        accumulatedStreamText += data.chunk;
        const parsed = parseStreamSections(accumulatedStreamText);
        currentAnalysisResult.answer = parsed.answer;
        currentAnalysisResult.explain = parsed.explain;
        currentAnalysisResult.summary = parsed.summary;
        currentAnalysisResult.translate = parsed.translate;
        if (parsed.ocr) {
          currentAnalysisResult.ocr = parsed.ocr;
        }
        if (parsed.thinking_process) {
          currentAnalysisResult.thinking_process = parsed.thinking_process;
        }
        hasReceivedFirstToken = true;

        if (thinkingContent && thinkingAccordion && currentAnalysisResult.thinking_process) {
          thinkingContent.innerText = currentAnalysisResult.thinking_process;
          thinkingAccordion.style.display = 'block';
        }

        const hasReachedNextSection = accumulatedStreamText.search(/###?\s*\[?(?:EXPLAIN|EXPLANATION|คำอธิบาย|SUMMARY|สรุป|TRANSLATE|แปล|OCR|TEXT|ถอดข้อความ)\]?/i) !== -1;

        if (!hasAnswerCompleted && (hasReachedNextSection || (currentAnalysisResult.answer && currentAnalysisResult.answer.length > 20 && (currentAnalysisResult.explain || currentAnalysisResult.summary || currentAnalysisResult.translate)))) {
          hasAnswerCompleted = true;
          metricsBanner.classList.remove('thinking');
          const answerLatencySec = ((performance.now() - streamStartTime) / 1000).toFixed(2);
          if (latencyText) {
            latencyText.innerText = `${answerLatencySec}s (${new Date().toLocaleTimeString('th-TH')})`;
          }
          const actionsEl = document.getElementById('liveStreamingActions');
          if (actionsEl) actionsEl.style.display = 'flex';
        }

        scheduleScreenStreamRender();
      }
    });

    window.electronAPI.onStreamFinish((data) => {
      isStreamingActive = false;
      metricsBanner.classList.remove('thinking');
      if (latencyText) {
        if (!hasAnswerCompleted || !latencyText.innerText || latencyText.innerText.includes('กำลัง')) {
          latencyText.innerText = `${data.durationSec}s (${new Date().toLocaleTimeString('th-TH')})`;
        }
      }
      hasAnswerCompleted = true;

      if (data.ocrText && (!currentAnalysisResult.ocr || currentAnalysisResult.ocr.length < data.ocrText.length)) {
        currentAnalysisResult.ocr = data.ocrText;
      }
      if (!currentAnalysisResult.summary && currentAnalysisResult.answer) {
        currentAnalysisResult.summary = createQuickBulletSummary(currentAnalysisResult.answer);
      }
      const hasThaiInTr = currentAnalysisResult.translate && /[\u0E00-\u0E7F]/.test(currentAnalysisResult.translate);
      const foreignSource = (currentAnalysisResult.ocr || currentAnalysisResult.answer || '').trim();
      if (!hasThaiInTr && /[A-Za-z]/.test(foreignSource) && foreignSource.length > 5) {
        currentAnalysisResult.translate = '';
        triggerAutoTranslation(foreignSource);
      }
      currentDisplayModelName = selectedModelNameText();

      const hasAllCategories = Boolean(currentAnalysisResult.answer && (currentAnalysisResult.explain || currentAnalysisResult.summary));
      renderConversationView();

      const actionsEl = document.getElementById('liveStreamingActions');
      if (actionsEl) actionsEl.style.display = 'flex';

      window.electronAPI.saveHistoryItem({
        id: Date.now(),
        model: currentDisplayModelName || selectedModelNameText(),
        timestamp: new Date().toLocaleString('th-TH'),
        thumbnail: currentCroppedBase64,
        result: currentAnalysisResult,
        latency: `${data.durationSec}s`
      });

      window.electronAPI.removeStreamListeners();
    });

    window.electronAPI.onStreamError((data) => {
      isStreamingActive = false;
      metricsBanner.classList.remove('thinking');
      if (latencyText) latencyText.innerText = "เกิดข้อผิดพลาดในการสตรีม";
      const target = document.getElementById('liveStreamingContent');
      if (target) {
        target.innerHTML = `<div style="color: #ef4444; padding: 8px;">เกิดข้อผิดพลาด: ${data.error || 'ไม่สามารถสตรีมข้อมูลได้'}</div>`;
      }
      window.electronAPI.removeStreamListeners();
    });

    // 5. Zero-Bounce Unified Screen Streaming Pipeline
    const selectedModel = currentSelectedModel || 'gemini-3.8-flash';
    if (window.electronAPI && window.electronAPI.cropAndAnalyzeScreenStream) {
      const res = await window.electronAPI.cropAndAnalyzeScreenStream({ rect: cropBox, modelId: selectedModel });
      if (res && res.croppedDataUrl) {
        currentCroppedBase64 = res.croppedDataUrl;
      }
    } else {
      const croppedDataUrl = await window.electronAPI.cropArea(cropBox);
      currentCroppedBase64 = croppedDataUrl;
      if (!croppedDataUrl) {
        throw new Error('ไม่สามารถตัดภาพหน้าจอได้');
      }
      await window.electronAPI.analyzeScreenStream(croppedDataUrl, selectedModel);
    }

  } catch (err) {
    console.error('Streaming error:', err);
    isStreamingActive = false;
    stopLaserScan();
    percentBadge.style.display = 'none';
    canvas.style.display = 'none';
    metricsBanner.classList.remove('thinking');
    if (latencyText) latencyText.innerText = "เกิดข้อผิดพลาดในการประมวลผล";

    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      if (aiWindow.style.display !== 'flex') {
        window.electronAPI.hideWindow();
      }
      window.electronAPI.removeStreamListeners();
    }

    if (err.message && (err.message.includes('API Key') || err.code === 'API_KEY_REQUIRED')) {
      if (aiWindow) {
        aiWindow.style.display = 'none';
        aiWindow.style.visibility = 'hidden';
        aiWindow.style.opacity = '0';
      }
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }
      openSettingsModal();
      alert("กรุณาระบุ Google AI Studio Gemini API Key ในเมนูการตั้งค่า");
      return;
    }

    setTimeout(() => {
      const cleanMsg = (err.message || '').replace(new RegExp("^Error invoking remote method '[^']+':\\\\s*", "i"), '');
      alert(`เกิดข้อผิดพลาด: ${cleanMsg}`);
    }, 50);
  }
}
// ==============================================================================
*/

// --- POSITION AI ANSWER WINDOW IN THE CENTER OF SCREEN ---
function showAiWindowPosition(cropBox) {
  let winW = aiWindow.offsetWidth || 580;
  let winH = aiWindow.offsetHeight || 420;

  // Center window nicely
  let winX = (window.innerWidth / 2) - (winW / 2);
  let winY = (window.innerHeight / 2) - (winH / 2);

  winX = Math.max(20, Math.min(winX, window.innerWidth - winW - 20));
  winY = Math.max(20, Math.min(winY, window.innerHeight - winH - 20));

  aiWindow.style.left = `${winX}px`;
  aiWindow.style.top = `${winY}px`;
  aiWindow.style.visibility = 'visible';
  aiWindow.style.opacity = '1';
  aiWindow.style.display = 'flex';

  if (window.electronAPI) {
    window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
  }
}

// --- RENDER CONVERSATION VIEW (PRESERVING FOLLOW-UP CHAT MESSAGES) ---
const tagTitles = {
  answer: 'คำตอบจาก Gemini AI',
  explain: 'คำอธิบายเชิงลึก (In-depth Explanation)',
  summary: 'สรุปประเด็นสำคัญและคำตอบ (Summary & Result)',
  translate: 'แปลเป็นภาษาไทย (Thai Translation)',
  ocr: 'ข้อความถอดอักษร (OCR Extracted)'
};

function renderConversationView() {
  if (!currentAnalysisResult) return;
  chatThread.innerHTML = '';

  let textRaw = getCategoryContent(activeCategory, currentAnalysisResult);

  // 1. Render primary result bubble for active tab (without redundant badge tag)
  appendAiBubble('', textRaw);

  // 2. Re-render all follow-up questions & answers
  followUpChatMessages.forEach(msg => {
    if (msg.role === 'user') {
      appendUserBubble(msg.text, false);
    } else {
      appendAiBubble('', msg.text, false, msg.toolsData || null);
    }
  });

  chatThread.scrollTop = chatThread.scrollHeight;
}

// --- SWITCH TAB & RENDER MARKDOWN + LATEX MATH ---
function switchCategory(cat, btnEl) {
  stopSpeechSynthesis();
  activeCategory = cat;
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  // If user switches to 'translate' tab and translation is not yet available or not Thai,
  // automatically translate the foreign text into Thai on-the-fly!
  if (cat === 'translate') {
    const hasThai = currentAnalysisResult && currentAnalysisResult.translate && /[\u0E00-\u0E7F]/.test(currentAnalysisResult.translate);
    const sourceText = currentAnalysisResult ? (currentAnalysisResult.ocr || currentAnalysisResult.answer || '').trim() : '';
    if (!hasThai && /[A-Za-z]/.test(sourceText) && sourceText.length > 5 && !isTranslatingOcr && !isStreamingActive) {
      triggerAutoTranslation(sourceText);
    }
  }

  // On-demand lazy load for OCR when user clicks OCR tab
  if (cat === 'ocr') {
    const hasOcr = currentAnalysisResult && currentAnalysisResult.ocr && currentAnalysisResult.ocr.length > 5;
    if (!hasOcr && !isFetchingOcr && !isStreamingActive && currentCroppedBase64) {
      triggerAutoOcr();
    }
  }

  // On-demand lazy load for Explain when user clicks Explain tab
  if (cat === 'explain') {
    const hasExp = currentAnalysisResult && currentAnalysisResult.explain && currentAnalysisResult.explain.length > 5 && currentAnalysisResult.explain !== currentAnalysisResult.answer;
    if (!hasExp && !isFetchingExplain && !isStreamingActive && currentCroppedBase64) {
      triggerAutoExplain();
    }
  }

  if (isStreamingActive) {
    renderStreamingContent();
  } else {
    renderConversationView();
  }
}

function selectedModelNameText() {
  const found = AI_MODELS.find(m => m.id === currentSelectedModel);
  return found ? found.name : currentSelectedModel;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatToolsDataHtml(toolsData) {
  if (!toolsData) return '';
  let html = '';

  // 1. Python Code Execution
  if (toolsData.codeCalls && toolsData.codeCalls.length > 0) {
    toolsData.codeCalls.forEach((cc, idx) => {
      const code = cc.code || '';
      const output = toolsData.codeResults?.[idx]?.output || '';
      html += `
        <div class="code-execution-block">
          <div class="code-execution-header">
            <span>Python Code Execution</span>
          </div>
          <div class="code-execution-body">${escapeHtml(code)}</div>
          ${output ? `<div class="code-execution-output">ผลลัพธ์:\n${escapeHtml(output)}</div>` : ''}
        </div>
      `;
    });
  }

  // 2. Function Results (Charts & Weather)
  if (toolsData.functionResults && toolsData.functionResults.length > 0) {
    toolsData.functionResults.forEach(fr => {
      if (fr.result && fr.result.svg) {
        html += fr.result.svg;
      } else if (fr.result && fr.result.temperature_celsius !== undefined) {
        html += `
          <div style="background:#0f172a; border:1px solid #1e293b; border-radius:8px; padding:10px 14px; margin:8px 0; display:flex; align-items:center; gap:12px;">
            <div>
              <div style="font-weight:600; color:#f8fafc; font-size:0.85rem;">สภาพอากาศ: ${escapeHtml(fr.result.location)}</div>
              <div style="color:#38bdf8; font-size:0.8rem; font-family:'Fira Code',monospace;">${fr.result.temperature_celsius}°C (${fr.result.temperature_fahrenheit}°F) • ${escapeHtml(fr.result.condition)} • ความชื้น ${fr.result.humidity}</div>
            </div>
          </div>
        `;
      }
    });
  }

  // 3. Citations (Google Search, Maps, Files)
  const hasCitations = (toolsData.citations?.urls?.length > 0) ||
                       (toolsData.citations?.places?.length > 0) ||
                       (toolsData.citations?.files?.length > 0);

  if (hasCitations) {
    html += '<div class="citations-container"><div class="citations-header">แหล่งข้อมูลอ้างอิง:</div><div class="citations-list">';

    if (toolsData.citations?.urls) {
      toolsData.citations.urls.forEach(u => {
        html += `<a href="${escapeHtml(u.url)}" target="_blank" class="citation-pill" title="${escapeHtml(u.citedText || u.title)}"><span>${escapeHtml(u.title || u.url)}</span></a>`;
      });
    }

    if (toolsData.citations?.places) {
      toolsData.citations.places.forEach(p => {
        html += `<a href="${escapeHtml(p.url)}" target="_blank" class="citation-pill" translate="no" title="Google Maps Place"><span translate="no">${escapeHtml(p.name)}</span></a>`;
      });
    }

    if (toolsData.citations?.files) {
      toolsData.citations.files.forEach(f => {
        const pageText = f.pageNumber ? ` (น. ${f.pageNumber})` : '';
        html += `<span class="citation-pill" title="${escapeHtml(f.source || '')}"><span>${escapeHtml(f.fileName)}${pageText}</span></span>`;
      });
    }

    html += '</div></div>';
  }

  return html;
}

function appendAiBubble(tagTitle, rawMarkdownText, shouldScroll = true, toolsData = null) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai';
  const bubbleId = 'bubble_' + Math.random().toString(36).substr(2, 9);

  bubble.innerHTML = `
    <div id="${bubbleId}"></div>
    <div class="bubble-actions" style="margin-top: 8px; display: flex; gap: 8px;" onselectstart="return false;" draggable="false">
      <button class="bubble-copy-btn" draggable="false" onselectstart="return false;" onclick="copySingleBubble('${bubbleId}', this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>คัดลอก</span>
      </button>
      <button class="bubble-copy-btn" draggable="false" onselectstart="return false;" onclick="speakTextFromBubble('${bubbleId}', this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <span>อ่านเสียง</span>
      </button>
    </div>
  `;

  chatThread.appendChild(bubble);
  const contentEl = document.getElementById(bubbleId);

  // Render Markdown with DOMPurify XSS Sanitization & KaTeX Math
  let parsedHtml = rawMarkdownText || '';
  const trimmed = parsedHtml.trim();
  if (trimmed.startsWith('<div') || trimmed.startsWith('<span') || trimmed.startsWith('<svg')) {
    parsedHtml = trimmed;
  } else if (typeof marked !== 'undefined') {
    parsedHtml = marked.parse(rawMarkdownText);
  }
  if (typeof DOMPurify !== 'undefined') {
    parsedHtml = DOMPurify.sanitize(parsedHtml);
  }

  if (activeCategory === 'ocr') {
    parsedHtml = `<div class="ocr-rendered-container">${parsedHtml}</div>`;
  }

  const toolsHtml = formatToolsDataHtml(toolsData);
  contentEl.innerHTML = parsedHtml + (toolsHtml ? `<div class="tools-result-container">${toolsHtml}</div>` : '');

  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(contentEl, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }

  if (shouldScroll) {
    chatThread.scrollTop = chatThread.scrollHeight;
  }
}

// --- MAIN TOOLBAR MODEL DROPDOWN CONTROLLER ---
function toggleModelDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('modelDropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

async function selectAiModel(val, name, el, e) {
  if (e) e.stopPropagation();
  currentSelectedModel = val;
  appSettings.defaultModel = val;
  if (window.electronAPI) {
    if (window.electronAPI.setActiveModel) {
      await window.electronAPI.setActiveModel(val);
    } else {
      await window.electronAPI.saveSettings(appSettings);
    }
  }

  const options = document.querySelectorAll('.model-option');
  options.forEach(opt => opt.classList.remove('active'));
  if (el) el.classList.add('active');

  const nameEl = document.getElementById('triggerModelName');
  if (nameEl) nameEl.innerText = name;

  const dropdown = document.getElementById('modelDropdown');
  if (dropdown) dropdown.classList.remove('open');

  updateCustomModelDropdownUI(val);
  triggerAutoRefreshIfActive();
}

// --- CUSTOM MODAL MODEL DROPDOWN CONTROLLER (SETTINGS) ---
function toggleModalModelDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('modalModelDropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

function selectModalAiModel(val, name, el, e) {
  if (e) e.stopPropagation();
  selectedModalModelId = val;
  const options = document.querySelectorAll('.modal-model-option');
  options.forEach(opt => opt.classList.remove('active'));
  if (el) el.classList.add('active');

  const nameEl = document.getElementById('modalSelectedModelName');
  if (nameEl) nameEl.innerText = name;

  const dropdown = document.getElementById('modalModelDropdown');
  if (dropdown) dropdown.classList.remove('open');
}

function populateModalModelDropdown(selectedId) {
  const menuEl = document.getElementById('modalModelDropdownMenu');
  if (!menuEl) return;
  menuEl.innerHTML = '';
  selectedModalModelId = selectedId || currentSelectedModel;

  AI_MODELS.forEach(m => {
    const optDiv = document.createElement('div');
    optDiv.className = `modal-model-option ${m.id === selectedModalModelId ? 'active' : ''}`;
    optDiv.dataset.value = m.id;
    optDiv.innerHTML = `<span>${m.name}</span>`;
    optDiv.onclick = (e) => selectModalAiModel(m.id, m.name, optDiv, e);
    menuEl.appendChild(optDiv);
  });

  const selectedModelObj = AI_MODELS.find(m => m.id === selectedModalModelId) || AI_MODELS[0];
  const nameEl = document.getElementById('modalSelectedModelName');
  if (nameEl) nameEl.innerText = selectedModelObj.name;
}

window.addEventListener('click', (e) => {
  const dropdown = document.getElementById('modelDropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove('open');
  }
  const modalDropdown = document.getElementById('modalModelDropdown');
  if (modalDropdown && !modalDropdown.contains(e.target)) {
    modalDropdown.classList.remove('open');
  }
});

// --- PIN WINDOW (ALWAYS ON TOP) ---
async function togglePinWindow() {
  isPinned = !isPinned;
  const pinBtn = document.getElementById('pinBtn');
  if (aiWindow) aiWindow.style.display = 'flex';
  if (window.electronAPI) {
    await window.electronAPI.setAlwaysOnTop(isPinned);
  }
  if (pinBtn) {
    pinBtn.classList.toggle('pinned', isPinned);
    pinBtn.title = isPinned ? "ปลดปักหมุด" : "ปักหมุดลอยบนสุด (Always on top)";
  }
}

// --- DRAGGING AI WINDOW ---
aiToolbar.addEventListener('mousedown', (e) => {
  if (e.target.closest('button') || e.target.closest('.custom-model-dropdown')) return;
  isDraggingWin = true;
  winStartX = e.clientX;
  winStartY = e.clientY;
  winInitLeft = aiWindow.offsetLeft;
  winInitTop = aiWindow.offsetTop;
});

window.addEventListener('mousemove', (e) => {
  if (!isDraggingWin) return;
  let dx = e.clientX - winStartX;
  let dy = e.clientY - winStartY;
  aiWindow.style.left = `${winInitLeft + dx}px`;
  aiWindow.style.top = `${winInitTop + dy}px`;
});

window.addEventListener('mouseup', () => { isDraggingWin = false; });

// --- TEXT-TO-SPEECH (TTS) WITH CLEAN MARKDOWN & LATEX FILTER ---
let activeSpeakingBtn = null;

function cleanLatexForSpeech(latex) {
  if (!latex) return '';
  let s = latex.trim();
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 ส่วน $2');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'สแควรูท $1');
  s = s.replace(/\\times/g, 'คูณ');
  s = s.replace(/\\div/g, 'หาร');
  s = s.replace(/\\pm/g, 'บวกหรือลบ');
  s = s.replace(/\\neq/g, 'ไม่เท่ากับ');
  s = s.replace(/\\leq/g, 'น้อยกว่าหรือเท่ากับ');
  s = s.replace(/\\geq/g, 'มากกว่าหรือเท่ากับ');
  s = s.replace(/\\approx/g, 'ประมาณ');
  s = s.replace(/\\pi/g, 'พาย');
  s = s.replace(/\\theta/g, 'เซต้า');
  s = s.replace(/\\alpha/g, 'แอลฟา');
  s = s.replace(/\\beta/g, 'เบต้า');
  s = s.replace(/\\Delta/g, 'เดลต้า');
  s = s.replace(/\^2\b/g, 'ยกกำลังสอง');
  s = s.replace(/\^3\b/g, 'ยกกำลังสาม');
  s = s.replace(/\^\{([^}]+)\}/g, 'ยกกำลัง $1');
  s = s.replace(/\^([0-9a-zA-Z])/g, 'ยกกำลัง $1');
  s = s.replace(/_\{([^}]+)\}/g, 'ห้อย $1');
  s = s.replace(/_([0-9a-zA-Z])/g, 'ห้อย $1');
  s = s.replace(/\\[a-zA-Z]+/g, ' '); // remove other LaTeX command names
  s = s.replace(/[{}]/g, '');
  return ' ' + s + ' ';
}

function cleanTextForSpeech(rawText) {
  if (!rawText) return '';
  let text = rawText;
  // Replace code blocks
  text = text.replace(/```[\s\S]*?```/g, ' บล็อกโค้ด ');
  // Replace inline code
  text = text.replace(/`([^`]+)`/g, '$1');
  // Replace LaTeX math
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => cleanLatexForSpeech(math));
  text = text.replace(/\$([^\$]+)\$/g, (m, math) => cleanLatexForSpeech(math));
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (m, math) => cleanLatexForSpeech(math));
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (m, math) => cleanLatexForSpeech(math));
  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Remove markdown bold/italic
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  // Remove markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove blockquotes and hr
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[\-\*_]{3,}\s*$/gm, '');
  // Remove bullet points
  text = text.replace(/^[\*\-\+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  // Clean whitespace
  text = text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return text;
}

function speakTextFromBubble(elementId, btnEl) {
  const rawText = document.getElementById(elementId)?.innerText;
  if (!rawText) return;

  if (window.speechSynthesis.speaking && activeSpeakingBtn === btnEl) {
    window.speechSynthesis.cancel();
    resetSpeakingButton(btnEl);
    return;
  }

  window.speechSynthesis.cancel();
  if (activeSpeakingBtn) resetSpeakingButton(activeSpeakingBtn);

  activeSpeakingBtn = btnEl;
  btnEl.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
    <span>หยุดเสียง</span>
  `;
  btnEl.classList.add('speaking');

  const speechContent = cleanTextForSpeech(rawText);
  const utterance = new SpeechSynthesisUtterance(speechContent);
  const thaiCharCount = (speechContent.match(/[\u0E00-\u0E7F]/g) || []).length;
  utterance.lang = (thaiCharCount > speechContent.length * 0.2) ? 'th-TH' : 'en-US';

  utterance.onend = () => resetSpeakingButton(btnEl);
  utterance.onerror = () => resetSpeakingButton(btnEl);

  window.speechSynthesis.speak(utterance);
}

function resetSpeakingButton(btnEl) {
  if (!btnEl) return;
  btnEl.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
    <span>อ่านเสียง</span>
  `;
  btnEl.classList.remove('speaking');
  if (activeSpeakingBtn === btnEl) activeSpeakingBtn = null;
}

function stopSpeechSynthesis() {
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  if (activeSpeakingBtn) {
    resetSpeakingButton(activeSpeakingBtn);
    activeSpeakingBtn = null;
  }
}

// --- FOLLOW-UP CHAT QUESTION ---
function handleChatKeyDown(e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter') sendUserMessage();
}

async function sendUserMessage() {
  const query = chatInput.value.trim();
  if (!query) return;

  const currentApiKey = (appSettings && appSettings.apiKey ? appSettings.apiKey.trim() : '');
  if (!currentApiKey) {
    if (aiWindow) {
      aiWindow.style.display = 'none';
      aiWindow.style.visibility = 'hidden';
      aiWindow.style.opacity = '0';
    }
    openSettingsModal();
    alert("กรุณาระบุ Google AI Studio Gemini API Key ในเมนูการตั้งค่า");
    return;
  }

  followUpChatMessages.push({ role: 'user', text: query });
  appendUserBubble(query);
  chatInput.value = '';

  metricsBanner.classList.add('thinking');
  if (latencyText) latencyText.innerText = "กำลังประมวลผลคำถามเพิ่มเติม...";

  try {
    const modelId = currentSelectedModel || 'gemini-3.8-flash';
    const result = await window.electronAPI.sendChatMessage(query, modelId, currentAnalysisResult, followUpChatMessages);

    metricsBanner.classList.remove('thinking');
    if (latencyText) latencyText.innerText = `ตอบกลับเรียบร้อยแล้ว (${result.durationSec || '1.0'}s)`;

    const replyText = result.replyText || "ไม่พบคำตอบ";
    followUpChatMessages.push({
      role: 'model',
      text: replyText,
      modelName: selectedModelNameText(),
      toolsData: result.toolsData || null
    });

    appendAiBubble('', replyText, true, result.toolsData || null);
  } catch (err) {
    metricsBanner.classList.remove('thinking');
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
    setTimeout(() => {
      const cleanMsg = (err.message || '').replace(/^Error invoking remote method '[^']+':\s*/i, '');
      alert(`เกิดข้อผิดพลาด: ${cleanMsg}`);
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      }
    }, 50);
  }
}

function appendUserBubble(text, shouldScroll = true) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble user';
  bubble.innerText = text;
  chatThread.appendChild(bubble);
  if (shouldScroll) {
    chatThread.scrollTop = chatThread.scrollHeight;
  }
}

// --- COPY & EXPORT ---
function copySingleBubble(elementId, btnEl) {
  const selection = (window.getSelection && window.getSelection().toString()) ? window.getSelection().toString().trim() : '';
  const el = document.getElementById(elementId);
  const text = selection || (el ? (el.innerText || '') : '');
  if (!text) return;

  const onCopied = () => {
    if (btnEl) {
      const orig = btnEl.innerHTML;
      btnEl.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>คัดลอกแล้ว!</span>
      `;
      setTimeout(() => { btnEl.innerHTML = orig; }, 1600);
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

function copyAllChat() {
  const bubbles = chatThread.querySelectorAll('.chat-bubble');
  if (!bubbles || bubbles.length === 0) {
    alert("ไม่มีข้อความการสนทนาให้คัดลอก");
    return;
  }

  let formatted = [];
  bubbles.forEach(bubble => {
    if (bubble.classList.contains('user')) {
      const userText = bubble.innerText.trim();
      if (userText) formatted.push(`ผู้ใช้:\n${userText}`);
    } else if (bubble.classList.contains('ai')) {
      const tagEl = bubble.querySelector('.ai-badge-tag span');
      const title = tagEl ? tagEl.innerText.trim() : 'Gemini AI';
      const contentEl = bubble.querySelector('div[id^="bubble_"]') || bubble.querySelector('.markdown-body');
      const contentText = contentEl ? contentEl.innerText.trim() : '';
      if (contentText) formatted.push(`${title}:\n${contentText}`);
    }
  });

  const finalCopyText = formatted.join('\n\n---\n\n');
  if (window.electronAPI && window.electronAPI.writeClipboardText) {
    window.electronAPI.writeClipboardText(finalCopyText);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(finalCopyText).then(() => {
      alert("คัดลอกการสนทนาทั้งหมดเรียบร้อยแล้ว!");
    }).catch(() => {
      alert("คัดลอกการสนทนาทั้งหมดเรียบร้อยแล้ว!");
    });
  } else {
    alert("คัดลอกการสนทนาทั้งหมดเรียบร้อยแล้ว!");
  }
}

async function exportResultFileDialog() {
  if (!currentAnalysisResult) {
    alert("ยังไม่มีผลลัพธ์คำตอบที่จะบันทึก");
    return;
  }
  const content = `คำตอบ:\n${currentAnalysisResult.answer}\n\nคำอธิบาย:\n${currentAnalysisResult.explain}\n\nสรุป:\n${currentAnalysisResult.summary}\n\nคำแปลภาษาไทย:\n${currentAnalysisResult.translate}\n\nOCR:\n${currentAnalysisResult.ocr}`;
  await window.electronAPI.saveTextFile(content, `ai-analysis-${Date.now()}.md`);
}

function closeAiWindow() {
  aiWindow.style.display = 'none';
  aiWindow.style.visibility = 'hidden';
  aiWindow.style.opacity = '0';
  stopLaserScan();
  stopSpeechSynthesis();
  const settingsModal = document.getElementById('settingsModal');
  const historyModal = document.getElementById('historyModal');
  if ((!settingsModal || settingsModal.style.display !== 'flex') && (!historyModal || historyModal.style.display !== 'flex')) {
    if (window.electronAPI) window.electronAPI.hideWindow();
  }
}

// --- SETTINGS MODAL CONTROLLER ---
function openSettingsModal() {
  if (isSnippingActive) cancelSnippingUI(true);
  if (canvas) canvas.style.display = 'none';
  if (topHint) topHint.style.display = 'none';
  document.body.classList.remove('snipping-active');
  if (percentBadge) percentBadge.style.display = 'none';
  // Ensure AI answer window NEVER displays behind settings modal
  if (aiWindow) {
    aiWindow.style.display = 'none';
    aiWindow.style.visibility = 'hidden';
    aiWindow.style.opacity = '0';
  }
  if (window.electronAPI) {
    window.electronAPI.setIgnoreMouseEvents(false);
    if (window.electronAPI.showWindow) window.electronAPI.showWindow();
  }
  const modal = document.getElementById('settingsModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const shortcutInput = document.getElementById('shortcutInput');
  const quickShortcutInput = document.getElementById('quickTextShortcutInput');

  if (apiKeyInput) {
    apiKeyInput.value = appSettings.apiKey || '';
    apiKeyInput.type = 'password';

    const warningEl = document.getElementById('apiKeyWarningMsg');
    const updateKeyWarning = () => {
      const val = apiKeyInput.value.trim();
      if (val && /[^\x20-\x7E]/.test(val)) {
        if (warningEl) {
          warningEl.style.display = 'block';
          warningEl.innerText = '[!] ตรวจพบตัวอักษรภาษาไทยหรืออักขระพิเศษ ซึ่งไม่ใช่ Google AI Studio API Key (API Key ที่ถูกต้องจะขึ้นต้นด้วย AIza...)';
        }
      } else {
        if (warningEl) warningEl.style.display = 'none';
      }
    };
    apiKeyInput.oninput = updateKeyWarning;
    updateKeyWarning();
  }

  const toggleBtn = document.getElementById('toggleApiKeyVisibility');
  if (toggleBtn && apiKeyInput) {
    const eyeOpen = document.getElementById('eyeIconOpen');
    const eyeClosed = document.getElementById('eyeIconClosed');
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        if (eyeOpen) eyeOpen.style.display = 'none';
        if (eyeClosed) eyeClosed.style.display = 'block';
      } else {
        apiKeyInput.type = 'password';
        if (eyeOpen) eyeOpen.style.display = 'block';
        if (eyeClosed) eyeClosed.style.display = 'none';
      }
    };
  }

  if (shortcutInput) shortcutInput.value = appSettings.shortcutKey || 'Alt+Shift+S';
  if (quickShortcutInput) quickShortcutInput.value = appSettings.quickTextShortcutKey || 'Ctrl+CapsLock';

  const chkAutoLaunch = document.getElementById('autoLaunchCheckbox');
  if (chkAutoLaunch) chkAutoLaunch.checked = Boolean(appSettings.autoLaunch);

  renderPromptsManager();
  renderThinkingModelSettings();
  populateModalModelDropdown(appSettings.defaultModel || currentSelectedModel);

  // Populate Gemini Tools Checkboxes
  const tools = appSettings.tools || {
    enableGoogleSearch: true,
    enableCodeExecution: true,
    enableUrlContext: true,
    enableGoogleMaps: true,
    enableFileSearch: false,
    enableFunctionCalling: true
  };

  const chkSearch = document.getElementById('toolGoogleSearch');
  const chkCode = document.getElementById('toolCodeExecution');
  const chkUrl = document.getElementById('toolUrlContext');
  const chkMaps = document.getElementById('toolGoogleMaps');
  const chkFile = document.getElementById('toolFileSearch');
  const chkFunc = document.getElementById('toolFunctionCalling');

  if (chkSearch) chkSearch.checked = !!tools.enableGoogleSearch;
  if (chkCode) chkCode.checked = !!tools.enableCodeExecution;
  if (chkUrl) chkUrl.checked = !!tools.enableUrlContext;
  if (chkMaps) chkMaps.checked = !!tools.enableGoogleMaps;
  if (chkFile) chkFile.checked = !!tools.enableFileSearch;
  if (chkFunc) chkFunc.checked = !!tools.enableFunctionCalling;

  if (modal) {
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.display = 'flex';
  }
}

// --- MODEL THINKING CONFIGURATION IN SETTINGS ---
function renderThinkingModelSettings() {
  const container = document.getElementById('thinkingModelList');
  if (!container) return;
  container.innerHTML = '';

  const currentThinking = appSettings.modelThinking || {
    'gemini-3.8-flash': false,
    'gemini-3.5-flash-lite': false,
    'gemini-3.1-pro-preview': true
  };

  const coreModels = AI_MODELS.filter(m => ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'].includes(m.id));
  coreModels.forEach(model => {
    const isEnabled = currentThinking[model.id] !== undefined
      ? Boolean(currentThinking[model.id])
      : Boolean(model.defaultThinking);

    const card = document.createElement('div');
    card.className = 'thinking-model-card';

    const statusClass = isEnabled ? 'enabled' : 'disabled';
    const statusText = isEnabled ? 'เปิด (คิดลึก)' : 'ปิด (ตอบไว)';

    card.innerHTML = `
      <div class="thinking-model-info">
        <div class="thinking-model-header">
          <span class="thinking-model-name">${model.name}</span>
          <span class="thinking-model-tag ${model.tagClass || 'flash'}">${model.tag || 'AI'}</span>
        </div>
        <span class="thinking-model-desc">${model.desc || ''}</span>
      </div>
      <div class="thinking-toggle-wrapper">
        <span class="thinking-status-text ${statusClass}" id="thinkingStatus_${model.id}">${statusText}</span>
        <label class="switch-toggle" title="สลับโหมด Thinking สำหรับ ${model.name}">
          <input type="checkbox" id="thinkingToggle_${model.id}" ${isEnabled ? 'checked' : ''} onchange="handleThinkingToggleChange('${model.id}', this.checked)">
          <span class="slider round"></span>
        </label>
      </div>
    `;

    container.appendChild(card);
  });
}

function handleThinkingToggleChange(modelId, isChecked) {
  const statusEl = document.getElementById(`thinkingStatus_${modelId}`);
  if (statusEl) {
    statusEl.className = `thinking-status-text ${isChecked ? 'enabled' : 'disabled'}`;
    statusEl.innerText = isChecked ? 'เปิด (คิดลึก)' : 'ปิด (ตอบไว)';
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
  }
  if (aiWindow.style.display !== 'flex' && window.electronAPI) {
    window.electronAPI.hideWindow();
  }
}

async function saveSettingsFromModal() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const shortcutInput = document.getElementById('shortcutInput');
  const quickShortcutInput = document.getElementById('quickTextShortcutInput');

  let shortcutVal = shortcutInput ? shortcutInput.value.trim() : (appSettings.shortcutKey || 'Alt+Shift+S');
  if (!shortcutVal || shortcutVal.toLowerCase().includes('mouse')) {
    shortcutVal = 'Alt+Shift+S';
  }

  let quickShortcutVal = quickShortcutInput ? quickShortcutInput.value.trim() : (appSettings.quickTextShortcutKey || 'Ctrl+CapsLock');
  if (!quickShortcutVal || quickShortcutVal.toLowerCase().includes('mouse')) {
    quickShortcutVal = 'Ctrl+CapsLock';
  }

  const chkSearch = document.getElementById('toolGoogleSearch');
  const chkCode = document.getElementById('toolCodeExecution');
  const chkUrl = document.getElementById('toolUrlContext');
  const chkMaps = document.getElementById('toolGoogleMaps');
  const chkFile = document.getElementById('toolFileSearch');
  const chkFunc = document.getElementById('toolFunctionCalling');

  const toolsConfig = {
    enableGoogleSearch: chkSearch ? chkSearch.checked : true,
    enableCodeExecution: chkCode ? chkCode.checked : true,
    enableUrlContext: chkUrl ? chkUrl.checked : true,
    enableGoogleMaps: chkMaps ? chkMaps.checked : true,
    enableFileSearch: chkFile ? chkFile.checked : false,
    fileSearchStoreNames: (appSettings.tools && appSettings.tools.fileSearchStoreNames) || [],
    enableFunctionCalling: chkFunc ? chkFunc.checked : true,
    latitude: (appSettings.tools && appSettings.tools.latitude) || 13.7563,
    longitude: (appSettings.tools && appSettings.tools.longitude) || 100.5018
  };

  const modelThinkingConfig = {};
  AI_MODELS.forEach(m => {
    const chk = document.getElementById(`thinkingToggle_${m.id}`);
    if (chk) {
      modelThinkingConfig[m.id] = chk.checked;
    } else if (appSettings.modelThinking && appSettings.modelThinking[m.id] !== undefined) {
      modelThinkingConfig[m.id] = appSettings.modelThinking[m.id];
    } else {
      modelThinkingConfig[m.id] = !!m.defaultThinking;
    }
  });

  const chkAutoLaunch = document.getElementById('autoLaunchCheckbox');
  const autoLaunchVal = chkAutoLaunch ? chkAutoLaunch.checked : Boolean(appSettings.autoLaunch);

  const rawApiKey = apiKeyInput ? apiKeyInput.value.trim() : (appSettings.apiKey || '');
  if (rawApiKey && /[^\x20-\x7E]/.test(rawApiKey)) {
    alert('API Key ไม่ถูกต้อง: ตรวจพบตัวอักษรภาษาไทยหรืออักขระพิเศษ\n\nGoogle AI Studio API Key ต้องเป็นภาษาอังกฤษและตัวเลข (เช่น AIza...)\nกรุณาตรวจสอบและคัดลอกใหม่จาก https://aistudio.google.com');
    if (apiKeyInput) apiKeyInput.focus();
    return;
  }

  const newSettings = {
    apiKey: rawApiKey,
    shortcutKey: shortcutVal,
    quickTextShortcutKey: quickShortcutVal,
    autoLaunch: autoLaunchVal,
    defaultModel: selectedModalModelId || currentSelectedModel,
    modelThinking: modelThinkingConfig,
    textPrompts: (appSettings && Array.isArray(appSettings.textPrompts)) ? appSettings.textPrompts : currentQuickPrompts,
    tools: toolsConfig
  };

  if (window.electronAPI) {
    appSettings = await window.electronAPI.saveSettings(newSettings);
    currentSelectedModel = appSettings.defaultModel;
    if (appSettings.textPrompts) currentQuickPrompts = [...appSettings.textPrompts];
    populateModelDropdowns();
  }
  closeSettingsModal();
  triggerAutoRefreshIfActive();
}

let cachedHistoryItems = [];

// --- HISTORY MODAL CONTROLLER ---
async function openHistoryModal() {
  if (isSnippingActive) cancelSnippingUI(true);
  if (canvas) canvas.style.display = 'none';
  if (topHint) topHint.style.display = 'none';
  document.body.classList.remove('snipping-active');
  if (percentBadge) percentBadge.style.display = 'none';
  if (aiWindow) {
    aiWindow.style.display = 'none';
    aiWindow.style.visibility = 'hidden';
    aiWindow.style.opacity = '0';
  }
  if (window.electronAPI) {
    window.electronAPI.setIgnoreMouseEvents(false);
    if (window.electronAPI.showWindow) window.electronAPI.showWindow();
  }
  const modal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

  cachedHistoryItems = await window.electronAPI.getHistory() || [];
  historyList.innerHTML = '';

  if (cachedHistoryItems.length === 0) {
    historyList.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">ไม่มีประวัติการสแกน</div>`;
  } else {
    cachedHistoryItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.setAttribute('onclick', `loadHistoryItem('${item.id}')`);
      const itemTitle = item.result?.ocr?.trim()?.substring(0, 50) || item.result?.answer?.trim()?.substring(0, 50) || 'ประวัติการสแกนภาพ';
      div.innerHTML = `
        <img class="history-thumb" src="${item.thumbnail}">
        <div class="history-info">
          <div class="history-title">${itemTitle}...</div>
          <div class="history-meta">${item.model} • ${item.timestamp} • ${item.latency || ''}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); loadHistoryItem('${item.id}')">ดูคำตอบ</button>
      `;
      historyList.appendChild(div);
    });
  }

  if (modal) {
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.display = 'flex';
  }
}

function closeHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
  }
  if (aiWindow.style.display !== 'flex' && window.electronAPI) {
    window.electronAPI.hideWindow();
  }
}

function loadHistoryItem(id) {
  if (isSnippingActive) cancelSnippingUI(true);
  if (canvas) canvas.style.display = 'none';
  if (topHint) topHint.style.display = 'none';
  if (percentBadge) percentBadge.style.display = 'none';

  const found = cachedHistoryItems.find(h => String(h.id) === String(id));
  if (!found) {
    console.warn('[History] Item not found for id:', id);
    return;
  }

  stopSpeechSynthesis();
  isStreamingActive = false;
  hasReceivedFirstToken = true;
  metricsBanner.classList.remove('thinking');

  currentAnalysisResult = found.result || {
    answer: '',
    explain: '',
    summary: '',
    translate: '',
    ocr: ''
  };

  currentDisplayModelName = found.model || selectedModelNameText();
  followUpChatMessages = [];

  // 1. Close history modal directly without hiding Electron main window
  const modal = document.getElementById('historyModal');
  if (modal) modal.style.display = 'none';

  // 2. Ensure main window is shown and focused
  if (window.electronAPI && window.electronAPI.showWindow) {
    window.electronAPI.showWindow();
  }

  // 3. Immediately display AI Answer window in center
  showAiWindowPosition({ x: 0, y: 0, w: 0, h: 0 });

  // 4. Ensure window is immediately interactive
  if (window.electronAPI) {
    window.electronAPI.setIgnoreMouseEvents(false);
  }

  // 5. Update latency bar with history info
  if (latencyText) {
    latencyText.innerText = `ประวัติการสแกน (${found.latency || 'N/A'}) • ${found.timestamp || ''}`;
  }

  // 6. Update thinking accordion
  if (thinkingContent && thinkingAccordion) {
    if (found.result?.thinking_process && found.result.thinking_process.trim()) {
      thinkingContent.innerText = found.result.thinking_process;
      thinkingAccordion.style.display = 'block';
    } else {
      thinkingAccordion.style.display = 'none';
    }
  }

  // 7. Reset active tab to 'answer' and highlight button
  activeCategory = 'answer';
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => btn.classList.remove('active'));
  const firstTab = document.querySelector('.tab-btn');
  if (firstTab) firstTab.classList.add('active');

  // 8. Instantly render conversation view
  renderConversationView();
}

async function clearHistoryAll() {
  if (confirm("คุณต้องการล้างประวัติการสแกนทั้งหมดใช่หรือไม่?")) {
    await window.electronAPI.clearHistory();
    cachedHistoryItems = [];
    openHistoryModal();
  }
}

// --- KEYBINDING HOTKEY RECORDER ---
let isRecordingHotkey = false;

function setupHotkeyRecorder() {
  ['shortcutInput', 'quickTextShortcutInput'].forEach(inputId => {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('focus', () => {
      isRecordingHotkey = true;
      input.placeholder = "กดคีย์ลัดที่ต้องการบันทึก...";
      input.classList.add('recording');
    });

    input.addEventListener('blur', () => {
      isRecordingHotkey = false;
      input.classList.remove('recording');
    });

    input.addEventListener('keydown', (e) => {
      if (!isRecordingHotkey) return;
      e.preventDefault();
      e.stopPropagation();

      // Ignore standalone modifier presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

      let parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Cmd');

      let keyName = '';
      if (e.code === 'CapsLock') {
        keyName = 'CapsLock';
      } else if (e.code && e.code.startsWith('Key')) {
        keyName = e.code.replace('Key', '').toUpperCase();
      } else if (e.code && e.code.startsWith('Digit')) {
        keyName = e.code.replace('Digit', '');
      } else if (e.code === 'Space' || e.key === ' ') {
        keyName = 'Space';
      } else if (e.code && /^F\d{1,2}$/i.test(e.code)) {
        keyName = e.code.toUpperCase();
      } else if (e.code) {
        keyName = e.code.toUpperCase();
      } else {
        keyName = e.key ? e.key.toUpperCase() : '';
      }

      // Sanitize non-ASCII characters to guarantee valid Electron accelerators
      keyName = keyName.replace(/[^\x00-\x7F]/g, '');
      if (!keyName) return;

      // Require modifier for normal letters/digits to prevent dead single-key traps
      if (parts.length === 0 && !keyName.startsWith('F')) {
        parts.push('Ctrl');
      }

      parts.push(keyName);
      const recordedCombo = [...new Set(parts)].join('+');

      input.value = recordedCombo;
      input.blur();
    });
  });
}

// --- SEAMLESS MOUSE PASSTHROUGH LISTENERS FOR DESKTOP INTERACTIVITY ---
function setupMousePassthroughListeners() {
  if (!window.electronAPI) return;

  const targets = [
    aiWindow,
    document.getElementById('settingsModal'),
    document.getElementById('historyModal'),
    document.getElementById('quickTextContainer'),
    document.getElementById('promptEditorModal')
  ];

  targets.forEach(el => {
    if (!el) return;
    el.addEventListener('mouseenter', () => {
      if (!isSnippingActive && !isLaserScanning) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }
    });

    el.addEventListener('mouseleave', () => {
      if (isSnippingActive || isLaserScanning || isDraggingWin || isMoving || isResizing) return;
      const settingsModal = document.getElementById('settingsModal');
      const historyModal = document.getElementById('historyModal');
      const promptModal = document.getElementById('promptEditorModal');
      const quickCont = document.getElementById('quickTextContainer');

      const isSettingsOpen = settingsModal && settingsModal.style.display === 'flex';
      const isHistoryOpen = historyModal && historyModal.style.display === 'flex';
      const isPromptOpen = promptModal && promptModal.style.display === 'flex';
      const isQuickOpen = quickCont && quickCont.style.display === 'flex';

      // Never ignore mouse events if a modal dialog or floating toolbar is open
      if (!isSettingsOpen && !isHistoryOpen && !isPromptOpen && !isQuickOpen) {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      }
    });
  });
}

// --- QUICK TEXT ASK (FLOATING TOOLBAR & ANSWER CARD) ---

function setupQuickTextKeyboardListener() {
  document.addEventListener('keydown', (e) => {
    const quickContainer = document.getElementById('quickTextContainer');
    if (!quickContainer || quickContainer.style.display !== 'flex') return;

    if (e.key === 'Escape') {
      e.preventDefault();
      const customBox = document.getElementById('quickCustomBox');
      if (customBox && customBox.style.display === 'flex') {
        customBox.style.display = 'none';
        if (isSnippingActive && box && box.w >= 10) {
          updateSmartScreenToolbarPosition(box);
        }
        return;
      }
      const answerCard = document.getElementById('quickAnswerCard');
      if (answerCard && answerCard.style.display === 'flex') {
        answerCard.style.display = 'none';
        if (isSnippingActive && box && box.w >= 10) {
          updateSmartScreenToolbarPosition(box);
        }
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
        if (isSnippingActive) {
          executeScreenPromptByIndex(digitIndex);
        } else {
          executeQuickPromptByIndex(digitIndex);
        }
        return;
      }
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        toggleQuickCustomInput();
        return;
      }
    }
  });

  // Double-click outside protection for in-window quickTextContainer
  let lastInWinOutsideClickTime = 0;
  window.addEventListener('mousedown', (e) => {
    const quickCont = document.getElementById('quickTextContainer');
    const promptModal = document.getElementById('promptEditorModal');
    if (quickCont && quickCont.style.display === 'flex') {
      if (!quickCont.contains(e.target) && (!promptModal || !promptModal.contains(e.target))) {
        if (isSnippingActive) return; // Never dismiss via double-click while interacting with screen snip selection
        const now = Date.now();
        const elapsed = now - lastInWinOutsideClickTime;
        if (elapsed >= 100 && elapsed <= 600) {
          lastInWinOutsideClickTime = 0;
          closeQuickTextUI();
        } else {
          lastInWinOutsideClickTime = now;
        }
      } else {
        lastInWinOutsideClickTime = 0;
      }
    }
  });
}

function handleOpenQuickText({ cursor, text, prompts }) {
  // CRITICAL ZERO FOCUS ARCHITECTURE:
  // toolbarWindow is the dedicated zero-focus toolbar window that displays toolbar.html.
  // Suppress in-window quickTextContainer inside mainWindow to prevent double toolbar ghosting!
  const container = document.getElementById('quickTextContainer');
  if (container) {
    container.style.display = 'none';
  }
  return;
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
    btn.setAttribute('onselectstart', 'return false;');
    btn.title = `กด [${index + 1}] หรือคลิกเพื่อ${prompt.name}`;

    const iconSvg = SVG_ICONS[prompt.icon] || SVG_ICONS['file-text'];
    btn.innerHTML = `
      <span class="quick-action-num">${index + 1}</span>
      ${iconSvg}
      <span class="quick-action-label">${prompt.name}</span>
    `;

    let lastTriggerTime = 0;
    const triggerPrompt = (e) => {
      if (Date.now() - lastTriggerTime < 300) return;
      lastTriggerTime = Date.now();
      if (e) {
        try { e.stopPropagation(); } catch (err) {}
      }
      executeQuickPrompt(prompt.id);
    };

    btn.addEventListener('click', triggerPrompt);
    btn.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        triggerPrompt(e);
      }
    });

    actionsList.appendChild(btn);
  });
}

function handleCloseQuickTextUI() {
  const container = document.getElementById('quickTextContainer');
  if (container) {
    container.style.display = 'none';
  }
}

function closeQuickTextUI() {
  handleCloseQuickTextUI();
  if (isSnippingActive) {
    cancelSnippingUI(false);
  } else if (window.electronAPI) {
    window.electronAPI.closeQuickText();
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

  // 1. Copy selected text from the active foreground window if not already captured
  if (!currentCapturedText && window.electronAPI && window.electronAPI.copyAndGetSelectedText) {
    try {
      const copiedText = await window.electronAPI.copyAndGetSelectedText();
      if (copiedText) {
        currentCapturedText = copiedText.trim();
      }
    } catch (e) {
      console.warn('Option copy error:', e);
    }
  }

  // Fallback to clipboard disabled to prevent stale text pollution
  if (false && window.electronAPI && window.electronAPI.getClipboardText) {
    try {
      const clipText = await window.electronAPI.getClipboardText();
      if (clipText) currentCapturedText = clipText.trim();
    } catch (e) {}
  }

  // 2. If still no captured text, guide the user cleanly instead of sending empty text to Gemini
  if (!currentCapturedText) {
    showQuickAnswerState(prompt.name);
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
          <div>กรุณาใช้เมาส์คลุมดำข้อความที่ต้องการถาม แล้วกดคีย์ลัดอีกครั้ง หรือคลิกปุ่ม <strong>[ถามเอง]</strong> เพื่อพิมพ์คำถาม</div>
        </div>
      `;
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

  lastQuickPromptExecutionParams = {
    promptId: prompt.id,
    actionName: prompt.name,
    promptText: finalPrompt
  };

  showQuickAnswerState(prompt.name);

  try {
    quickAnswerStreamText = '';
    const res = await window.electronAPI.quickTextAsk({
      promptText: finalPrompt,
      modelId: currentSelectedModel || 'gemini-3-flash-preview'
    });

    if (res && res.fullText) {
      renderQuickAnswerContent(res.fullText);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    handleQuickAnswerError({ error: err.message });
  }
}

async function executeQuickPromptWithModel(promptId, modelId) {
  const prompt = currentQuickPrompts.find(p => p.id === promptId);
  const promptName = prompt ? prompt.name : (lastQuickPromptExecutionParams?.actionName || 'คำตอบ');
  const finalPrompt = lastQuickPromptExecutionParams?.promptText || '';
  if (!finalPrompt) return;

  showQuickAnswerState(promptName);
  try {
    quickAnswerStreamText = '';
    const res = await window.electronAPI.quickTextAsk({
      promptText: finalPrompt,
      modelId: modelId || currentSelectedModel || 'gemini-3-flash-preview'
    });

    if (res && res.fullText) {
      renderQuickAnswerContent(res.fullText);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    handleQuickAnswerError({ error: err.message });
  }
}

function executeQuickPromptByIndex(index) {
  const enabledPrompts = currentQuickPrompts.filter(p => p.enabled);
  if (index >= 0 && index < enabledPrompts.length) {
    executeQuickPrompt(enabledPrompts[index].id);
  }
}

function showQuickAnswerState(actionName) {
  stopQuickSpeak();
  const answerCard = document.getElementById('quickAnswerCard');
  const actionBadge = document.getElementById('quickAnswerActionBadge');
  const status = document.getElementById('quickAnswerStatus');
  const body = document.getElementById('quickAnswerBody');

  if (actionBadge) actionBadge.innerText = actionName;
  if (status) status.innerText = 'กำลังประมวลผล...';
  if (body) {
    body.innerHTML = `
      <div class="skeleton-container" style="padding: 6px 0;">
        <div class="skeleton-line w-90"></div>
        <div class="skeleton-line w-full"></div>
        <div class="skeleton-line w-60"></div>
      </div>
    `;
  }
  if (answerCard) {
    answerCard.style.display = 'flex';
    if (typeof getSmartScreenToolbarWidth === 'function') {
      const tbWidth = getSmartScreenToolbarWidth();
      answerCard.style.width = '100%';
      answerCard.style.maxWidth = '100%';
      const container = document.getElementById('quickTextContainer');
      if (container) {
        container.style.width = `${tbWidth}px`;
        container.style.maxWidth = `${tbWidth}px`;
      }
    }
  }
  if (typeof updateCustomModelDropdownUI === 'function' && currentSelectedModel) {
    updateCustomModelDropdownUI(currentSelectedModel);
  } else {
    const modelSel = document.getElementById('quickModelSelect');
    if (modelSel && currentSelectedModel) {
      modelSel.value = currentSelectedModel;
    }
  }
}

function handleQuickAnswerChunk(data) {
  if (!data || !data.chunk) return;
  const answerCard = document.getElementById('quickAnswerCard');
  if (answerCard && answerCard.style.display !== 'flex') {
    answerCard.style.display = 'flex';
  }
  quickAnswerStreamText += data.chunk;
  renderQuickAnswerContent(quickAnswerStreamText);
}

function handleQuickAnswerFinish(data) {
  const final = (data && data.fullText) ? data.fullText : quickAnswerStreamText;
  renderQuickAnswerContent(final);
  const status = document.getElementById('quickAnswerStatus');
  if (status) {
    const sec = data?.durationSec || '';
    status.innerText = sec ? `เสร็จสิ้น (${sec}s)` : 'เสร็จสิ้น';
  }
}

function handleQuickAnswerError(data) {
  const answerCard = document.getElementById('quickAnswerCard');
  if (answerCard) {
    answerCard.style.display = 'flex';
  }
  const body = document.getElementById('quickAnswerBody');
  const status = document.getElementById('quickAnswerStatus');
  if (status) status.innerText = 'เกิดข้อผิดพลาด';
  if (body) {
    const rawErr = data?.error || 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ';
    const isApiKeyError = rawErr.includes('API Key') || rawErr.includes('API key') || rawErr.includes('API_KEY');
    if (isApiKeyError) {
      body.innerHTML = `
        <div style="color:#ef4444; font-size:0.84rem; padding:8px 0; line-height:1.5;">
          <div style="font-weight:600; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>ปัญหาเกี่ยวกับ Google AI Studio API Key</span>
          </div>
          <div>${rawErr}</div>
          <div style="margin-top:10px;">
            <button id="quickAnswerOpenSettingsBtn" style="background:#0284c7; color:#fff; border:none; padding:6px 14px; font-size:0.8rem; border-radius:6px; cursor:pointer; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              เปิดหน้าการตั้งค่า (Settings)
            </button>
          </div>
        </div>
      `;
      const btn = document.getElementById('quickAnswerOpenSettingsBtn');
      if (btn) {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          openSettingsModal();
        };
      }
    } else {
      body.innerHTML = `<div style="color:#ef4444; font-size:0.82rem; padding:6px 0;">${rawErr}</div>`;
    }
  }
}

function renderQuickAnswerContent(text) {
  const body = document.getElementById('quickAnswerBody');
  if (!body) return;

  const raw = text || '';
  const trimmed = raw.trim();
  let html = '';
  if (trimmed.startsWith('<div') || trimmed.startsWith('<span') || trimmed.startsWith('<svg')) {
    html = trimmed;
  } else if (typeof marked !== 'undefined') {
    html = marked.parse(raw);
  } else {
    html = raw;
  }
  if (typeof DOMPurify !== 'undefined') {
    html = DOMPurify.sanitize(html);
  }
  body.innerHTML = html;

  // Auto-render KaTeX math formulas if present
  if (typeof renderMathInElement === 'function') {
    try {
      renderMathInElement(body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {}
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
      setTimeout(() => { label.innerText = orig; }, 1500);
    }
  });
}

let screenSpeechActive = false;

function stopQuickSpeak() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  screenSpeechActive = false;
  const label = document.getElementById('quickSpeakLabel');
  const btn = document.getElementById('quickSpeakBtn');
  if (label) label.innerText = 'อ่านเสียง';
  if (btn) btn.classList.remove('speaking');
}

function toggleQuickSpeak() {
  if (screenSpeechActive) {
    stopQuickSpeak();
    return;
  }
  const body = document.getElementById('quickAnswerBody');
  if (!body) return;
  const text = (body.innerText || '').trim();
  if (!text) return;

  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const hasThai = /[\u0E00-\u0E7F]/.test(text);
  utterance.lang = hasThai ? 'th-TH' : 'en-US';
  utterance.rate = 1.05;

  const label = document.getElementById('quickSpeakLabel');
  const btn = document.getElementById('quickSpeakBtn');
  if (label) label.innerText = 'หยุดพูด';
  if (btn) btn.classList.add('speaking');
  screenSpeechActive = true;

  utterance.onend = () => stopQuickSpeak();
  utterance.onerror = () => stopQuickSpeak();
  window.speechSynthesis.speak(utterance);
}

function toggleQuickCustomInput(forceState) {
  const toolbar = document.getElementById('quickTextToolbar');
  const actionsList = document.getElementById('quickActionsList');
  const customToggleBtn = document.getElementById('quickCustomToggleBtn');
  const cancelBtn = document.getElementById('quickCancelBtn');
  const customBox = document.getElementById('quickCustomBox');
  const input = document.getElementById('quickCustomInput');

  const willOpen = (typeof forceState === 'boolean') 
    ? forceState 
    : (!customBox || customBox.style.display === 'none');

  if (willOpen) {
    if (actionsList) actionsList.style.display = 'none';
    if (customToggleBtn) customToggleBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (customBox) customBox.style.display = 'flex';
    if (toolbar) toolbar.classList.add('custom-mode');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
  } else {
    if (customBox) customBox.style.display = 'none';
    if (toolbar) toolbar.classList.remove('custom-mode');
    if (actionsList) actionsList.style.display = 'flex';
    if (customToggleBtn) customToggleBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  }
  if (box && box.w >= 10) {
    updateSmartScreenToolbarPosition(box);
  }
}

function handleQuickCustomKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitQuickCustomAsk();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    toggleQuickCustomInput(false);
  }
}

async function submitQuickCustomAsk() {
  const input = document.getElementById('quickCustomInput');
  if (!input) return;
  const userCmd = input.value.trim();
  if (!userCmd) return;

  input.value = '';
  toggleQuickCustomInput(false);

  if (isSnippingActive && box && box.w >= 10 && box.h >= 10) {
    executeScreenPrompt('custom_ask', userCmd);
    return;
  }

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

  showQuickAnswerState('คำถามของคุณ');

  try {
    quickAnswerStreamText = '';
    const res = await window.electronAPI.quickTextAsk({
      promptText: finalPrompt,
      modelId: currentSelectedModel
    });

    if (res && res.fullText) {
      renderQuickAnswerContent(res.fullText);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    handleQuickAnswerError({ error: err.message });
  }
}

// === [SMART SCREEN VISION QUESTION TOOLBAR & ACTIONS] ===

const SMART_SCREEN_PROMPTS = [
  {
    id: 'answer',
    num: '1',
    name: 'คำตอบ',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
    title: 'ตอบคำถาม / แก้โจทย์ปัญหาในภาพ [1]',
    prompt: 'ตอบคำถาม แก้โจทย์ หรือให้คำตอบที่ละเอียด ถูกต้อง ชัดเจน และตรงประเด็นที่สุดจากสิ่งที่ปรากฏในภาพนี้ (หากมีหลายหัวข้อหรือหลายประเด็นให้จัดเป็น bullet points พร้อมตัวหนา เช่น * **หัวข้อ:** คำอธิบาย, หากเป็นข้อมูลดิบหรือคำตอบค่าเดียวให้แสดงตามโครงสร้างเดิม)'
  },
  {
    id: 'explain',
    num: '2',
    name: 'อธิบาย',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    title: 'อธิบายรายละเอียด ความหมาย หรือขั้นตอน [2]',
    prompt: 'อธิบายสิ่งที่ปรากฏในภาพนี้อย่างละเอียด ชัดเจน สละสลวย เข้าใจง่าย (หากมีหลายหัวข้อให้จัดเป็น bullet points พร้อมตัวหนา เช่น * **หัวข้อ:** คำอธิบาย, หากเป็นข้อมูลดิบให้แสดงตามโครงสร้างเดิม)'
  },
  {
    id: 'summarize',
    num: '3',
    name: 'สรุป',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
    title: 'สรุปใจความสำคัญเป็นข้อๆ [3]',
    prompt: 'สรุปประเด็นสำคัญของเนื้อหาหรือข้อความในภาพนี้เป็นข้อๆ ให้ครอบคลุม ชัดเจน และสละสลวย (ห้ามตอบคำถามหรือแก้ปัญหา)'
  },
  {
    id: 'translate_th',
    num: '4',
    name: 'แปลภาษา',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    title: 'แปลข้อความในภาพเป็นภาษาไทย [4]',
    prompt: 'แปลข้อความตัวอักษรทั้งหมดที่ปรากฏในภาพนี้เป็นภาษาไทยตามต้นฉบับอย่างตรงไปตรงมาประโยคต่อประโยคเท่านั้น ห้ามแต่งเติม ห้ามขยายความ ห้ามอธิบายเพิ่มเติม ห้ามตอบคำถาม แสดงเฉพาะคำแปลภาษาไทยของข้อความที่เห็นในภาพเท่านั้น'
  },
  {
    id: 'proofread',
    num: '5',
    name: 'ปรับปรุงการเขียน',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    title: 'ตรวจคำผิดและขัดเกลาไวยากรณ์ [5]',
    prompt: 'ตรวจแก้คำผิดและขัดเกลาไวยากรณ์ของข้อความที่ปรากฏในภาพนี้ให้ถูกต้องสมบูรณ์และสละสลวย แสดงข้อความฉบับแก้ไขทันที และสรุปจุดแก้ไขสั้นๆ'
  },
  {
    id: 'shorten',
    num: '6',
    name: 'ทำให้สั้นลง',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/></svg>`,
    title: 'ย่อข้อความหรือเนื้อหาให้กระชับสั้นที่สุด [6]',
    prompt: 'ย่อข้อความหรือเนื้อหาสำคัญที่ปรากฏในภาพนี้ให้กระชับและสั้นที่สุดโดยยังคงความหมายสำคัญครบถ้วน คงโครงสร้างเดิม (ห้ามตอบคำถาม)'
  },
  {
    id: 'continue_writing',
    num: '7',
    name: 'เขียนต่อ',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    title: 'เขียนขยายความเนื้อหาหรือประเด็นต่อ [7]',
    prompt: '[ภารกิจ: เขียนขยายความเนื้อหาหรือประเด็นต่อจากข้อความที่ปรากฏในภาพนี้ โดยเขียนต่อยอดในมุมมองเดียวกัน ห้ามตอบคำถามเด็ดขาด ห้ามตอบรับ ห้ามพิมพ์ "คำตอบคือ" หรือ "ได้ครับ"]\n\nข้อความที่เขียนต่อขยายบริบท (เริ่มเขียนต่อทันที):'
  },
  {
    id: 'define',
    num: '8',
    name: 'คือ',
    icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    title: 'อธิบายว่าสิ่งนี้คืออะไร มีความหมายอย่างไร [8]',
    prompt: 'อธิบายว่าคำศัพท์หรือหัวข้อเป้าหมายที่ปรากฏในภาพนี้คืออะไร มีความหมาย ความเป็นมา หรือหลักการทำงานอย่างไร อธิบายอย่างละเอียด ชัดเจน สละสลวย'
  }
];

function renderSmartScreenActions() {
  const actionsList = document.getElementById('quickActionsList');
  if (!actionsList) return;
  actionsList.innerHTML = '';

  SMART_SCREEN_PROMPTS.forEach((prompt, index) => {
    const btn = document.createElement('button');
    btn.className = 'quick-action-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('draggable', 'false');
    btn.setAttribute('onselectstart', 'return false;');
    btn.style.animationDelay = `${index * 15}ms`;
    btn.title = prompt.title || `กด [${index + 1}] หรือคลิกเพื่อ${prompt.name}`;

    btn.innerHTML = `
      <span class="quick-action-num">${prompt.num || (index + 1)}</span>
      <span class="quick-action-label">${prompt.name}</span>
    `;

    let lastTriggerTime = 0;
    const triggerAction = (e) => {
      if (Date.now() - lastTriggerTime < 300) return;
      lastTriggerTime = Date.now();
      if (e) {
        try { e.stopPropagation(); } catch (err) {}
      }
      executeScreenPrompt(prompt.id);
    };

    btn.addEventListener('click', triggerAction);
    btn.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        triggerAction(e);
      }
    });

    actionsList.appendChild(btn);
  });
}

function getSmartScreenToolbarWidth() {
  const toolbar = document.getElementById('quickTextToolbar');
  if (!toolbar) return 875;
  const prevW = toolbar.style.width;
  toolbar.style.width = 'max-content';
  const naturalW = Math.max(toolbar.scrollWidth || 0, toolbar.offsetWidth || 0, 875);
  toolbar.style.width = prevW || '100%';
  return naturalW;
}

function updateSmartScreenToolbarPosition(targetBox) {
  const container = document.getElementById('quickTextContainer');
  if (!container) return;

  const toolbar = document.getElementById('quickTextToolbar');
  const answerCard = document.getElementById('quickAnswerCard');
  const isAnswerOpen = Boolean(answerCard && answerCard.style.display !== 'none' && window.getComputedStyle(answerCard).display !== 'none');

  const tbWidth = getSmartScreenToolbarWidth();

  // Lock container, toolbar, and answer card to the exact width of the options toolbar
  container.style.width = `${tbWidth}px`;
  container.style.maxWidth = `${tbWidth}px`;
  if (toolbar) {
    toolbar.style.width = '100%';
    toolbar.style.maxWidth = '100%';
  }
  if (answerCard) {
    answerCard.style.width = '100%';
    answerCard.style.maxWidth = '100%';
  }

  // Base toolbar height for anchor calculation to keep toolbar position locked without jumping
  const tbHeight = 48;

  const winW = window.innerWidth;
  const winH = window.innerHeight;

  let posX = Math.round(targetBox.x + (targetBox.w - tbWidth) / 2);
  posX = Math.max(12, Math.min(winW - tbWidth - 12, posX));

  const GAP = 18;
  const belowY = Math.round(targetBox.y + targetBox.h + GAP);
  const aboveY = Math.round(targetBox.y - tbHeight - GAP);

  let posY;
  if (belowY + tbHeight <= winH - 12) {
    posY = belowY;
  } else if (aboveY >= 12) {
    posY = aboveY;
  } else {
    posY = Math.max(12, Math.min(winH - tbHeight - 12, targetBox.y + targetBox.h - tbHeight - 24));
  }

  container.style.left = `${posX}px`;
  container.style.top = `${posY}px`;

  // Dynamically set max-height on answer card based on available screen space below posY
  if (answerCard && isAnswerOpen) {
    const availH = Math.max(140, winH - posY - tbHeight - 24);
    answerCard.style.maxHeight = `${availH}px`;
  }
}

function showSmartScreenToolbar(targetBox) {
  const container = document.getElementById('quickTextContainer');
  if (!container) return;

  document.body.classList.add('toolbar-visible');
  renderSmartScreenActions();

  // Reset custom mode
  const toolbar = document.getElementById('quickTextToolbar');
  if (toolbar) toolbar.classList.remove('custom-mode');

  const customBox = document.getElementById('quickCustomBox');
  if (customBox) customBox.style.display = 'none';

  const actionsList = document.getElementById('quickActionsList');
  if (actionsList) actionsList.style.display = 'flex';

  const customToggleBtn = document.getElementById('quickCustomToggleBtn');
  if (customToggleBtn) customToggleBtn.style.display = 'inline-flex';

  const cancelBtn = document.getElementById('quickCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  container.style.display = 'flex';
  container.style.opacity = '1';
  container.style.pointerEvents = 'auto';

  updateSmartScreenToolbarPosition(targetBox);
  try {
    window.focus();
  } catch (err) {}
  requestAnimationFrame(() => {
    updateSmartScreenToolbarPosition(targetBox);
  });
}

function hideSmartScreenToolbar(temporary = false) {
  const container = document.getElementById('quickTextContainer');
  if (!container) return;
  if (temporary) {
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
  } else {
    document.body.classList.remove('toolbar-visible');
    container.style.display = 'none';
    const answerCard = document.getElementById('quickAnswerCard');
    if (answerCard) answerCard.style.display = 'none';
    const customBox = document.getElementById('quickCustomBox');
    if (customBox) customBox.style.display = 'none';
    const toolbar = document.getElementById('quickTextToolbar');
    if (toolbar) toolbar.classList.remove('custom-mode');
    stopQuickSpeak();
  }
}

function closeQuickAnswerCard() {
  const answerCard = document.getElementById('quickAnswerCard');
  if (answerCard) answerCard.style.display = 'none';
  stopQuickSpeak();
  if (isSnippingActive && box && box.w >= 10) {
    updateSmartScreenToolbarPosition(box);
  }
}

function executeScreenPromptByIndex(index) {
  if (index >= 0 && index < SMART_SCREEN_PROMPTS.length) {
    executeScreenPrompt(SMART_SCREEN_PROMPTS[index].id);
  }
}

function getCanvasCroppedDataUrl(cropBox) {
  if (!cropBox || cropBox.w <= 0 || cropBox.h <= 0) return null;
  try {
    const MAX_DIM = 768;
    let targetW = Math.max(1, Math.round(cropBox.w));
    let targetH = Math.max(1, Math.round(cropBox.h));
    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      const scale = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
      targetW = Math.max(1, Math.round(targetW * scale));
      targetH = Math.max(1, Math.round(targetH * scale));
    }

    const offCanvas = document.createElement('canvas');
    offCanvas.width = targetW;
    offCanvas.height = targetH;
    const offCtx = offCanvas.getContext('2d');
    if (frozenScreenImage && frozenScreenImage.complete && frozenScreenImage.naturalWidth > 0) {
      offCtx.drawImage(
        frozenScreenImage,
        cropBox.x, cropBox.y, cropBox.w, cropBox.h,
        0, 0, targetW, targetH
      );
    } else {
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, targetW, targetH);
    }
    return offCanvas.toDataURL('image/jpeg', 0.78);
  } catch (e) {
    return null;
  }
}

let lastScreenExecutionParams = null;
let lastQuickPromptExecutionParams = null;

const MODEL_DISPLAY_NAMES = {
  'gemini-3.8-flash': 'Gemini 3.8 Flash',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash Lite',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro Preview',
  'gemini-3-flash-preview': 'Gemini 3 Flash'
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

function handleQuickModelChange(newModelId) {
  if (!newModelId) return;
  currentSelectedModel = newModelId;
  appSettings.defaultModel = newModelId;
  if (typeof selectedModalModelId !== 'undefined') {
    selectedModalModelId = newModelId;
  }
  updateCustomModelDropdownUI(newModelId);

  // Universal synchronization across Tray, Settings, and Toolbars
  if (window.electronAPI && window.electronAPI.setActiveModel) {
    window.electronAPI.setActiveModel(newModelId);
  } else if (window.electronAPI && window.electronAPI.saveConfig) {
    window.electronAPI.saveConfig({ defaultModel: newModelId });
  }

  // If previous screen area execution exists, re-run with newly selected model immediately!
  if (lastScreenExecutionParams) {
    stopQuickSpeak();
    const actionName = lastScreenExecutionParams.actionName || 'คำตอบ';
    showQuickAnswerState(actionName);
    const status = document.getElementById('quickAnswerStatus');
    const modelName = getCleanModelName(newModelId);
    if (status) status.innerText = `กำลังประมวลผลด้วย ${modelName}...`;

    executeScreenPromptWithModel(
      lastScreenExecutionParams.promptId,
      lastScreenExecutionParams.customQuestion,
      lastScreenExecutionParams.croppedBase64,
      newModelId
    );
  } else if (lastQuickPromptExecutionParams) {
    // If quick text ask was active in main window
    stopQuickSpeak();
    const actionName = lastQuickPromptExecutionParams.actionName || 'คำตอบ';
    showQuickAnswerState(actionName);
    const status = document.getElementById('quickAnswerStatus');
    const modelName = getCleanModelName(newModelId);
    if (status) status.innerText = `กำลังประมวลผลด้วย ${modelName}...`;

    executeQuickPromptWithModel(lastQuickPromptExecutionParams.promptId, newModelId);
  }
}

async function executeScreenPromptWithModel(promptId, customQuestion, croppedBase64, modelId) {
  const promptDef = SMART_SCREEN_PROMPTS.find(p => p.id === promptId);
  const actionName = customQuestion ? 'คำถามของคุณ' : (promptDef ? promptDef.name : 'วิเคราะห์');
  const promptText = customQuestion || (promptDef ? promptDef.prompt : 'วิเคราะห์และตอบคำถามจากภาพนี้');
  const modelToUse = modelId || currentSelectedModel || 'gemini-3-flash-preview';

  lastScreenExecutionParams = {
    promptId,
    customQuestion,
    croppedBase64,
    actionName,
    promptText
  };

  const modelSel = document.getElementById('quickModelSelect');
  if (modelSel && modelSel.value !== modelToUse) {
    modelSel.value = modelToUse;
  }

  try {
    quickAnswerStreamText = '';
    const res = await window.electronAPI.quickTextAsk({
      promptText: promptText,
      modelId: modelToUse,
      promptId: promptId,
      categoryName: promptId,
      imageBase64: croppedBase64
    });

    if (res && res.fullText) {
      renderQuickAnswerContent(res.fullText);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    handleQuickAnswerError({ error: err.message });
  }
}

async function executeScreenPrompt(promptId, customQuestion = null) {
  if (!box || box.w < 10 || box.h < 10) return;

  const promptDef = SMART_SCREEN_PROMPTS.find(p => p.id === promptId);
  const actionName = customQuestion ? 'คำถามของคุณ' : (promptDef ? promptDef.name : 'วิเคราะห์');
  const promptText = customQuestion || (promptDef ? promptDef.prompt : 'วิเคราะห์และตอบคำถามจากภาพนี้');
  const modelToUse = currentSelectedModel || 'gemini-3-flash-preview';

  const modelSel = document.getElementById('quickModelSelect');
  if (modelSel && modelSel.value !== modelToUse) {
    modelSel.value = modelToUse;
  }

  showQuickAnswerState(actionName);
  updateSmartScreenToolbarPosition(box);

  try {
    let croppedBase64 = null;
    if (window.electronAPI && window.electronAPI.cropArea) {
      croppedBase64 = await window.electronAPI.cropArea(box);
    }
    if (!croppedBase64 && canvas) {
      croppedBase64 = getCanvasCroppedDataUrl(box);
    }

    if (!croppedBase64) {
      throw new Error('ไม่สามารถตัดภาพหน้าจอได้');
    }

    lastCapturedScreenImage = croppedBase64;
    lastCroppedBox = { ...box };

    lastScreenExecutionParams = {
      promptId,
      customQuestion,
      croppedBase64,
      actionName,
      promptText
    };

    quickAnswerStreamText = '';
    const res = await window.electronAPI.quickTextAsk({
      promptText: promptText,
      modelId: modelToUse,
      promptId: promptId,
      categoryName: promptId,
      imageBase64: croppedBase64
    });

    if (res && res.fullText) {
      renderQuickAnswerContent(res.fullText);
      const status = document.getElementById('quickAnswerStatus');
      if (status) status.innerText = `ตอบเสร็จสิ้น (${res.durationSec || '0.5'}s)`;
    }
  } catch (err) {
    handleQuickAnswerError({ error: err.message });
  }
}

function setupToolbarDragHandle() {
  const handle = document.querySelector('#quickTextToolbar .drag-handle');
  const container = document.getElementById('quickTextContainer');
  if (!handle || !container) return;
  if (handle.dataset.dragInitialized === 'true') return;
  handle.dataset.dragInitialized = 'true';

  let isDraggingToolbar = false;
  let startX = 0, startY = 0;
  let initLeft = 0, initTop = 0;

  const endDrag = (e) => {
    if (!isDraggingToolbar) return;
    isDraggingToolbar = false;
    handle.classList.remove('dragging');
    document.body.classList.remove('dragging-toolbar');
    try {
      if (e && typeof e.pointerId === 'number' && handle.hasPointerCapture && handle.hasPointerCapture(e.pointerId)) {
        handle.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);
    window.removeEventListener('mousemove', onMouseMoveLegacy, true);
    window.removeEventListener('mouseup', endDrag, true);
  };

  const onPointerMove = (moveEv) => {
    if (!isDraggingToolbar) return;
    // Strict Left Button Hold Check: buttons must be 1 (primary button held down)
    // If the button was released anywhere (even outside the window), stop dragging immediately!
    if (moveEv.buttons !== 1) {
      endDrag(moveEv);
      return;
    }
    const dx = moveEv.clientX - startX;
    const dy = moveEv.clientY - startY;
    const maxLeft = Math.max(10, window.innerWidth - container.offsetWidth - 10);
    const maxTop = Math.max(10, window.innerHeight - container.offsetHeight - 10);
    container.style.left = `${Math.max(10, Math.min(maxLeft, initLeft + dx))}px`;
    container.style.top = `${Math.max(10, Math.min(maxTop, initTop + dy))}px`;
  };

  const onMouseMoveLegacy = (moveEv) => {
    if (!isDraggingToolbar) return;
    if (moveEv.buttons !== 1) {
      endDrag(moveEv);
      return;
    }
    onPointerMove(moveEv);
  };

  const startDrag = (e) => {
    // Strictly left-click only (button === 0)
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    isDraggingToolbar = true;
    startX = e.clientX;
    startY = e.clientY;
    initLeft = parseInt(container.style.left, 10) || container.offsetLeft;
    initTop = parseInt(container.style.top, 10) || container.offsetTop;

    handle.classList.add('dragging');
    document.body.classList.add('dragging-toolbar');

    try {
      if (typeof e.pointerId === 'number' && handle.setPointerCapture) {
        handle.setPointerCapture(e.pointerId);
      }
    } catch (err) {}

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
    window.addEventListener('mousemove', onMouseMoveLegacy, true);
    window.addEventListener('mouseup', endDrag, true);
  };

  handle.addEventListener('pointerdown', startDrag);
  handle.addEventListener('mousedown', startDrag);
}

function setupQuickTextContainerInteractions() {
  const container = document.getElementById('quickTextContainer');
  if (!container) return;
  container.addEventListener('mousedown', (e) => e.stopPropagation());
  container.addEventListener('mouseup', (e) => e.stopPropagation());
  container.addEventListener('click', (e) => e.stopPropagation());
  container.addEventListener('pointerdown', (e) => e.stopPropagation());
  container.addEventListener('pointerup', (e) => e.stopPropagation());

  const customToggleBtn = document.getElementById('quickCustomToggleBtn');
  if (customToggleBtn) {
    const triggerCustom = (e) => {
      if (e) { try { e.stopPropagation(); } catch (err) {} }
      toggleQuickCustomInput();
    };
    customToggleBtn.onclick = triggerCustom;
    customToggleBtn.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        triggerCustom(e);
      }
    });
  }

  const backBtn = document.getElementById('quickBackBtn');
  if (backBtn) {
    const triggerBack = (e) => {
      if (e) { try { e.stopPropagation(); } catch (err) {} }
      toggleQuickCustomInput(false);
    };
    backBtn.onclick = triggerBack;
    backBtn.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        triggerBack(e);
      }
    });
  }

  const cancelBtn = document.getElementById('quickCancelBtn');
  if (cancelBtn) {
    const triggerCancel = (e) => {
      if (e) { try { e.stopPropagation(); } catch (err) {} }
      closeQuickTextUI();
    };
    cancelBtn.onclick = triggerCancel;
    cancelBtn.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        triggerCancel(e);
      }
    });
  }

  const sendBtn = document.getElementById('quickCustomSendBtn');
  if (sendBtn) {
    let lastSendTime = 0;
    const triggerSend = (e) => {
      if (Date.now() - lastSendTime < 300) return;
      lastSendTime = Date.now();
      if (e) { try { e.stopPropagation(); } catch (err) {} }
      submitQuickCustomAsk();
    };
    sendBtn.addEventListener('click', triggerSend);
    sendBtn.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        triggerSend(e);
      }
    });
  }

  setupToolbarDragHandle();
}

// --- CUSTOM PROMPTS MANAGEMENT IN SETTINGS ---

function renderPromptsManager() {
  const list = document.getElementById('promptsManagerList');
  if (!list) return;
  list.innerHTML = '';

  const prompts = (appSettings && Array.isArray(appSettings.textPrompts) && appSettings.textPrompts.length > 0)
    ? appSettings.textPrompts
    : currentQuickPrompts;

  if (prompts.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:12px; color:#94a3b8; font-size:0.75rem;">ยังไม่มีคำสั่งด่วน คลิก "+ เพิ่มคำสั่ง" เพื่อสร้างใหม่</div>`;
    return;
  }

  prompts.forEach((prompt, index) => {
    const card = document.createElement('div');
    card.className = `prompt-manager-card ${prompt.enabled ? '' : 'disabled'}`;

    const iconSvg = SVG_ICONS[prompt.icon] || SVG_ICONS['file-text'];
    const snippet = (prompt.template || '').replace(/\n/g, ' ').substring(0, 38);

    card.innerHTML = `
      <div class="prompt-card-left">
        <div class="prompt-card-icon">${iconSvg}</div>
        <div class="prompt-card-info">
          <span class="prompt-card-name">${prompt.name}</span>
          <span class="prompt-card-snippet">${snippet}</span>
        </div>
      </div>
      <div class="prompt-card-actions">
        <button type="button" class="prompt-icon-btn" title="เลื่อนขึ้น" onclick="movePrompt('${prompt.id}', -1)" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button type="button" class="prompt-icon-btn" title="เลื่อนลง" onclick="movePrompt('${prompt.id}', 1)" ${index === prompts.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button type="button" class="prompt-icon-btn" title="${prompt.enabled ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}" onclick="togglePromptEnabled('${prompt.id}')">
          <input type="checkbox" ${prompt.enabled ? 'checked' : ''} style="pointer-events:none; cursor:pointer;">
        </button>
        <button type="button" class="prompt-icon-btn" title="แก้ไข" onclick="openPromptEditorModal('${prompt.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button type="button" class="prompt-icon-btn delete" title="ลบ" onclick="deletePrompt('${prompt.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

function handlePromptInstructionChange() {
  updatePromptLivePreview();
}

function updatePromptLivePreview() {
  const instructionInput = document.getElementById('promptInstructionInput');
  const templateInput = document.getElementById('promptTemplateInput');
  const previewEl = document.getElementById('promptLivePreview');

  const instruction = instructionInput ? instructionInput.value.trim() : '';
  const simulatedText = '[ข้อความที่คุณคลุมดำหรือคัดลอกไว้]';

  let finalTemplate = '';
  let previewText = '';

  if (!instruction) {
    finalTemplate = '{text}';
    previewText = simulatedText;
  } else if (instruction.includes('{text}')) {
    finalTemplate = instruction;
    previewText = instruction.replace(/\{text\}/g, simulatedText);
  } else {
    finalTemplate = `${instruction}:\n\n{text}`;
    previewText = `${instruction}:\n\n${simulatedText}`;
  }

  if (templateInput) templateInput.value = finalTemplate;
  if (previewEl) {
    previewEl.innerText = previewText;
  }
}

function openPromptEditorModal(promptId) {
  document.body.classList.remove('snipping-active');
  if (isSnippingActive) cancelSnippingUI(true);
  if (window.electronAPI) {
    window.electronAPI.setIgnoreMouseEvents(false);
    if (window.electronAPI.showWindow) window.electronAPI.showWindow();
  }
  const modal = document.getElementById('promptEditorModal');
  const title = document.getElementById('promptEditorTitle');
  const idInput = document.getElementById('editPromptId');
  const nameInput = document.getElementById('promptNameInput');
  const instructionInput = document.getElementById('promptInstructionInput');
  const templateInput = document.getElementById('promptTemplateInput');
  const iconGrid = document.getElementById('iconPickerGrid');

  const prompts = (appSettings && Array.isArray(appSettings.textPrompts) && appSettings.textPrompts.length > 0)
    ? appSettings.textPrompts
    : currentQuickPrompts;
  const existing = promptId ? prompts.find(p => p.id === promptId) : null;

  if (existing) {
    if (title) title.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span>แก้ไขคำสั่ง: ${escapeHtml(existing.name)}</span>`;
    if (idInput) idInput.value = existing.id;
    if (nameInput) nameInput.value = existing.name;

    // Separate {text} completely! User only sees the prompt instruction
    let cleanPrompt = (existing.template || '').replace(/\{text\}/g, '').trim();
    if (cleanPrompt.endsWith(':')) {
      cleanPrompt = cleanPrompt.slice(0, -1).trim();
    }
    if (instructionInput) instructionInput.value = cleanPrompt;
    if (templateInput) templateInput.value = existing.template;
    selectedIconForEditor = existing.icon || 'file-text';
  } else {
    if (title) title.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>เพิ่มคำสั่ง AI ใหม่</span>`;
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (instructionInput) instructionInput.value = 'วิเคราะห์ข้อความต่อไปนี้อย่างละเอียด';
    if (templateInput) templateInput.value = 'วิเคราะห์ข้อความต่อไปนี้อย่างละเอียด:\n\n{text}';
    selectedIconForEditor = 'file-text';
  }

  updatePromptLivePreview();

  // Render icon picker with preset SVG icons
  if (iconGrid) {
    iconGrid.innerHTML = '';
    Object.keys(SVG_ICONS).forEach(iconKey => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `icon-picker-btn ${iconKey === selectedIconForEditor ? 'active' : ''}`;
      btn.innerHTML = `${SVG_ICONS[iconKey]}<span>${iconKey}</span>`;
      btn.onclick = () => {
        selectedIconForEditor = iconKey;
        document.querySelectorAll('.icon-picker-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
      iconGrid.appendChild(btn);
    });
  }

  if (modal) {
    modal.style.display = 'flex';
    modal.style.zIndex = '2147483645';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
  }
}

function closePromptEditorModal() {
  const modal = document.getElementById('promptEditorModal');
  if (modal) {
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
  }
}

async function savePromptFromEditor() {
  const idInput = document.getElementById('editPromptId');
  const nameInput = document.getElementById('promptNameInput');
  const instructionInput = document.getElementById('promptInstructionInput');
  const templateInput = document.getElementById('promptTemplateInput');

  const name = nameInput ? nameInput.value.trim() : '';
  const instruction = instructionInput ? instructionInput.value.trim() : '';

  if (!name) {
    alert('กรุณาระบุชื่อคำสั่ง');
    return;
  }

  let template = '';
  if (!instruction) {
    template = templateInput ? templateInput.value.trim() : '{text}';
  } else if (instruction.includes('{text}')) {
    template = instruction;
  } else {
    template = `${instruction}:\n\n{text}`;
  }

  if (!template) {
    template = '{text}';
  }

  if (!appSettings) appSettings = {};
  if (!Array.isArray(appSettings.textPrompts) || appSettings.textPrompts.length === 0) {
    appSettings.textPrompts = (currentQuickPrompts && currentQuickPrompts.length > 0)
      ? JSON.parse(JSON.stringify(currentQuickPrompts))
      : [];
  }

  const existingId = idInput ? idInput.value.trim() : '';

  if (existingId) {
    const idx = appSettings.textPrompts.findIndex(p => p.id === existingId);
    if (idx !== -1) {
      appSettings.textPrompts[idx].name = name;
      appSettings.textPrompts[idx].icon = selectedIconForEditor || 'file-text';
      appSettings.textPrompts[idx].template = template;
    } else {
      appSettings.textPrompts.push({
        id: existingId,
        name,
        icon: selectedIconForEditor || 'file-text',
        template,
        enabled: true
      });
    }
  } else {
    const newId = 'prompt_' + Date.now();
    appSettings.textPrompts.push({
      id: newId,
      name,
      icon: selectedIconForEditor || 'file-text',
      template,
      enabled: true
    });
  }

  currentQuickPrompts = [...appSettings.textPrompts];
  if (window.electronAPI) {
    await window.electronAPI.saveTextPrompts(appSettings.textPrompts);
  }

  renderPromptsManager();
  renderQuickActionsToolbar();
  closePromptEditorModal();
}

async function deletePrompt(promptId) {
  if (!confirm('คุณต้องการลบคำสั่งนี้ใช่หรือไม่?')) return;
  if (!appSettings.textPrompts) appSettings.textPrompts = [...currentQuickPrompts];
  appSettings.textPrompts = appSettings.textPrompts.filter(p => p.id !== promptId);
  currentQuickPrompts = [...appSettings.textPrompts];
  if (window.electronAPI) {
    await window.electronAPI.saveTextPrompts(appSettings.textPrompts);
  }
  renderPromptsManager();
  renderQuickActionsToolbar();
}

async function togglePromptEnabled(promptId) {
  if (!appSettings.textPrompts) appSettings.textPrompts = [...currentQuickPrompts];
  const item = appSettings.textPrompts.find(p => p.id === promptId);
  if (item) {
    item.enabled = !item.enabled;
    currentQuickPrompts = [...appSettings.textPrompts];
    if (window.electronAPI) {
      await window.electronAPI.saveTextPrompts(appSettings.textPrompts);
    }
    renderPromptsManager();
    renderQuickActionsToolbar();
  }
}

async function movePrompt(promptId, direction) {
  if (!appSettings.textPrompts) appSettings.textPrompts = [...currentQuickPrompts];
  const idx = appSettings.textPrompts.findIndex(p => p.id === promptId);
  if (idx === -1) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= appSettings.textPrompts.length) return;

  const temp = appSettings.textPrompts[idx];
  appSettings.textPrompts[idx] = appSettings.textPrompts[targetIdx];
  appSettings.textPrompts[targetIdx] = temp;

  currentQuickPrompts = [...appSettings.textPrompts];
  if (window.electronAPI) {
    await window.electronAPI.saveTextPrompts(appSettings.textPrompts);
  }
  renderPromptsManager();
  renderQuickActionsToolbar();
}


