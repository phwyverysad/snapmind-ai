const { app, BrowserWindow, Tray, Menu, globalShortcut, desktopCapturer, screen, ipcMain, dialog, nativeImage, Notification, net, session } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const geminiTools = require('./gemini_tools.js');
const nativeBridge = require('./nativeBridge');

// --- SPECULATIVE CONNECTION PRE-WARMING ENGINE ---
function prewarmGeminiConnection() {
  try {
    if (session && session.defaultSession && typeof session.defaultSession.preconnect === 'function') {
      session.defaultSession.preconnect({
        url: 'https://generativelanguage.googleapis.com',
        numSockets: 4
      });
    }
  } catch (e) {}
}

const os = require('os');

// Disable disk cache & shader cache to eliminate Windows file lock access denied errors (0x5)
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');

// Windows Cross-Version Compatibility Engine (Windows 7 SP1, 8, 8.1, 10, 11)
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('high-dpi-support', '1');
if (process.platform === 'win32') {
  const osRel = os.release() || '';
  if (/^6\.[0-3]/.test(osRel)) {
    console.log(`[Windows Compatibility] Detected Windows 7/8/8.1 (${osRel}), enabling compatibility fallbacks`);
    app.commandLine.appendSwitch('disable-d3d11');
    app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
  }
}

// Set dedicated isolated AppData path for SnapMind AI
try {
  const snapDataDir = path.join(app.getPath('appData'), 'SnapMind_AI_App');
  if (!fs.existsSync(snapDataDir)) fs.mkdirSync(snapDataDir, { recursive: true });
  app.setPath('userData', snapDataDir);
} catch (e) {}

// Set AppUserModelId for Windows OS Toast Notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('SnapMind AI');
}

let mainWindow = null;
let toolbarWindow = null;
let tray = null;
let currentConfig = null;
let currentHistory = [];
let isSnippingActive = false;
let isQuickTextActive = false;
let toolbarShortcutsActive = false;

const userDataPath = app.getPath('userData');
const configFilePath = path.join(userDataPath, 'config.json');
const historyFilePath = path.join(userDataPath, 'history.json');

// --- IN-MEMORY LRU CACHE ENGINE (Instant 0ms Repeated Response) ---
class QuickResponseCache {
  constructor(maxEntries = 300, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  _generateKey(modelId, categoryName, promptText) {
    const norm = (promptText || '').trim();
    return crypto.createHash('sha256').update(`${modelId || ''}:${categoryName || ''}:${norm}`).digest('hex');
  }

  get(modelId, categoryName, promptText) {
    if (!promptText || !promptText.trim()) return null;
    const key = this._generateKey(modelId, categoryName, promptText);
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  set(modelId, categoryName, promptText, fullText, endpointUsed) {
    if (!promptText || !promptText.trim() || !fullText || !fullText.trim()) return;
    const key = this._generateKey(modelId, categoryName, promptText);
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      fullText,
      timestamp: Date.now(),
      endpointUsed: endpointUsed || 'cache'
    });
  }

  clear() {
    this.cache.clear();
  }
}
const quickResponseCache = new QuickResponseCache(300);

// Default Text Prompts for Quick Text Ask
const DEFAULT_TEXT_PROMPTS = [
  {
    id: 'answer',
    name: 'คำตอบ',
    icon: 'check-circle',
    template: 'ตอบคำถาม แก้โจทย์ หรือให้คำตอบที่ละเอียด ถูกต้อง ชัดเจน และเป็นธรรมชาติจากข้อความเป้าหมายต่อไปนี้ (หากมีหลายหัวข้อหรือหลายประเด็นให้จัดเป็น bullet points พร้อมตัวหนา เช่น * **หัวข้อ:** คำอธิบาย, หากเป็นข้อมูลดิบหรือคำตอบค่าเดียวให้แสดงตามโครงสร้างเดิม):\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>',
    enabled: true
  },
  {
    id: 'explain',
    name: 'อธิบาย',
    icon: 'book-open',
    template: 'อธิบายข้อความเป้าหมายต่อไปนี้อย่างละเอียด ชัดเจน สละสลวย และเป็นธรรมชาติ (หากมีหลายหัวข้อให้จัดเป็น bullet points พร้อมตัวหนา เช่น * **หัวข้อ:** คำอธิบาย, หากเป็นข้อมูลดิบให้แสดงตามโครงสร้างเดิม):\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>',
    enabled: true
  },
  {
    id: 'summarize',
    name: 'สรุป',
    icon: 'file-text',
    template: 'สรุปประเด็นสำคัญของข้อความเป้าหมายต่อไปนี้เป็นข้อๆ ให้ครอบคลุม ชัดเจน และสละสลวย (ห้ามตอบคำถามหรือแก้ปัญหา):\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>',
    enabled: true
  },
  {
    id: 'translate_th',
    name: 'แปลภาษา',
    icon: 'globe',
    template: 'แปลข้อความเป้าหมายต่อไปนี้เป็นภาษาไทยตามต้นฉบับประโยคต่อประโยคเท่านั้น ห้ามแต่งเติม ห้ามขยายความ ห้ามอธิบายเพิ่มเติม (ห้ามตอบคำถามแม้ข้อความจะเป็นคำถาม แสดงเฉพาะผลลัพธ์คำแปล):\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>',
    enabled: true
  },
  {
    id: 'proofread',
    name: 'ปรับปรุงการเขียน',
    icon: 'edit',
    template: 'ตรวจคำผิดและขัดเกลาไวยากรณ์ข้อความเป้าหมายต่อไปนี้ให้ถูกต้องสมบูรณ์และสละสลวย คงโครงสร้างเดิม (ห้ามตอบคำถามแม้ข้อความจะเป็นคำถาม):\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>',
    enabled: true
  },
  {
    id: 'shorten',
    name: 'ทำให้สั้นลง',
    icon: 'minimize-2',
    template: 'ย่อข้อความเป้าหมายต่อไปนี้ให้กระชับและสั้นที่สุดโดยยังคงความหมายสำคัญครบถ้วน คงโครงสร้างเดิม (ห้ามตอบคำถาม):\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>',
    enabled: true
  },
  {
    id: 'continue_writing',
    name: 'เขียนต่อ',
    icon: 'edit-3',
    template: '[ภารกิจ: เขียนขยายความเนื้อหาหรือประเด็นต่อจากข้อความเป้าหมายด้านล่าง โดยเขียนต่อยอดในมุมมองเดียวกัน ห้ามตอบคำถามเด็ดขาด ห้ามตอบรับ ห้ามพิมพ์ "คำตอบคือ" หรือ "ได้ครับ"]\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>\n\nข้อความที่เขียนต่อขยายบริบท (เริ่มเขียนต่อทันที):',
    enabled: true
  },
  {
    id: 'define',
    name: 'คือ',
    icon: 'help-circle',
    template: 'อธิบายว่าคำศัพท์หรือหัวข้อเป้าหมายนี้คืออะไร มีความหมาย ความเป็นมา หรือหลักการทำงานอย่างไร อธิบายอย่างละเอียด ชัดเจน สละสลวย (หากมีหลายแง่มุมให้จัดเป็น bullet points พร้อมตัวหนา, หากเป็นนิยามกระชับให้ตอบตรงตัว):\n\n<<<TARGET_TEXT_START>>>\n{text}\n<<<TARGET_TEXT_END>>>',
    enabled: true
  },
  {
    id: 'custom_ask',
    name: 'ถามเอง',
    icon: 'message-square',
    template: '{text}',
    enabled: true
  }
];

// Default Configuration (No hardcoded credentials; reads from environment if available)
const DEFAULT_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  shortcutKey: 'Alt+Shift+S',
  quickTextShortcutKey: 'Ctrl+CapsLock',
  defaultModel: 'gemini-3-flash-preview',
  modelThinking: {
    'gemini-3-flash-preview': false,
    'gemini-3.8-flash': false,
    'gemini-3.5-flash-lite': false,
    'gemini-3.1-pro-preview': true
  },
  textPrompts: DEFAULT_TEXT_PROMPTS,
  tools: {
    enableGoogleSearch: true,
    enableCodeExecution: true,
    enableUrlContext: true,
    enableGoogleMaps: true,
    enableFileSearch: false,
    fileSearchStoreNames: [],
    enableFunctionCalling: true,
    latitude: 13.7563,
    longitude: 100.5018
  },
  autoLaunch: false,
  useNativeCapture: true
};

// Map UI Model IDs to active Google AI Studio Gemini API endpoints (Main Flagship Models)
const MODEL_API_ENDPOINT_MAP = {
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
  'gemini-3.8-flash': 'gemini-3.8-flash',
  'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview'
};

const TRAY_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' }
];

function getThinkingConfigForModel(modelId) {
  // Flash-Lite models do NOT support thinkingConfig at all (sending it causes HTTP 400 error)
  if (modelId && (modelId.includes('flash-lite') || modelId.includes('lite'))) {
    return {};
  }
  const modelThinking = (currentConfig && currentConfig.modelThinking) || DEFAULT_CONFIG.modelThinking;
  const isEnabled = (modelThinking && modelThinking[modelId] !== undefined)
    ? Boolean(modelThinking[modelId])
    : (modelId && (modelId.includes('pro') || modelId.includes('thinking')));

  if (isEnabled) {
    return {
      thinkingConfig: {
        thinkingBudget: 2048
      }
    };
  } else {
    // Ultra-low latency: zero thinking budget for instantaneous response (< 1s)
    return {
      thinkingConfig: {
        thinkingBudget: 0
      }
    };
  }
}

function getCandidateEndpoints(modelId) {
  const specificFallbacks = {
    'gemini-3.8-flash': [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3-flash-preview'
    ],
    'gemini-3.5-flash-lite': [
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite'
    ],
    'gemini-3.1-pro-preview': [
      'gemini-3.1-pro-preview',
      'gemini-3.1-pro',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview'
    ],
    'gemini-3-flash-preview': [
      'gemini-3-flash-preview',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash'
    ]
  };
  const primary = MODEL_API_ENDPOINT_MAP[modelId] || modelId || 'gemini-3.8-flash';
  const fallbacks = specificFallbacks[modelId] || [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash-preview'
  ];
  return Array.from(new Set([primary, ...fallbacks]));
}


function validateApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    const err = new Error('กรุณาระบุ Google AI Studio API Key ในการตั้งค่าก่อนเริ่มใช้งาน (Settings)');
    err.code = 'API_KEY_REQUIRED';
    return err;
  }
  const cleanKey = apiKey.trim();
  // Check for non-ASCII or Thai characters
  if (/[^\x20-\x7E]/.test(cleanKey)) {
    const err = new Error('Google AI Studio API Key ไม่ถูกต้อง (ตรวจพบตัวอักษรภาษาไทยหรืออักขระพิเศษ) กรุณาตรวจสอบและคัดลอก API Key ที่ถูกต้องจาก https://aistudio.google.com ในหน้าตั้งค่า (Settings)');
    err.code = 'INVALID_API_KEY_FORMAT';
    return err;
  }
  return null;
}

function showWindowsNotification(title, body) {
  try {
    let iconPath = getAppIconPath();

    if (Notification.isSupported()) {
      const notification = new Notification({
        title: title || 'SnapMind AI',
        body: body || '',
        icon: iconPath || undefined,
        silent: false
      });
      notification.show();
    }
  } catch (e) {
    console.error('Windows Toast Notification error:', e);
  }
}

// Windows Startup (Auto-Launch) Controller
function applyAutoLaunchSetting(enable) {
  try {
    if (app && typeof app.setLoginItemSettings === 'function') {
      const openAtLogin = Boolean(enable);
      const exePath = process.execPath;
      if (app.isPackaged) {
        app.setLoginItemSettings({
          openAtLogin: openAtLogin,
          path: exePath,
          args: ['--hidden']
        });
      } else {
        app.setLoginItemSettings({
          openAtLogin: openAtLogin
        });
      }
      console.log(`[AutoLaunch] Windows startup set to: ${openAtLogin}`);
    }
  } catch (err) {
    console.warn('[AutoLaunch] Error applying login item settings:', err);
  }
}

// Load Config
function loadConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf8');
      const parsed = JSON.parse(data);
      currentConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        modelThinking: {
          ...DEFAULT_CONFIG.modelThinking,
          ...(parsed.modelThinking || {})
        },
        tools: {
          ...DEFAULT_CONFIG.tools,
          ...(parsed.tools || {})
        }
      };

      let configNeedsSave = false;

      // Migrate previous default shortcutKey 'Ctrl+Shift+S' to 'Alt+Shift+S'
      if (currentConfig.shortcutKey === 'Ctrl+Shift+S') {
        currentConfig.shortcutKey = 'Alt+Shift+S';
        configNeedsSave = true;
      }

      // Ensure quickTextShortcutKey is present and normalized
      if (!currentConfig.quickTextShortcutKey || currentConfig.quickTextShortcutKey.toLowerCase() === 'ctrl+caps') {
        currentConfig.quickTextShortcutKey = 'Ctrl+CapsLock';
        configNeedsSave = true;
      }

      // Ensure textPrompts array is populated
      if (!Array.isArray(currentConfig.textPrompts) || currentConfig.textPrompts.length === 0) {
        currentConfig.textPrompts = JSON.parse(JSON.stringify(DEFAULT_TEXT_PROMPTS));
        configNeedsSave = true;
      } else {
        // Synchronize default prompt names and templates with latest definitions
        currentConfig.textPrompts.forEach(p => {
          const def = DEFAULT_TEXT_PROMPTS.find(d => d.id === p.id);
          if (def) {
            if (p.name !== def.name) { p.name = def.name; configNeedsSave = true; }
            if (p.icon !== def.icon) { p.icon = def.icon; configNeedsSave = true; }
            if (!p.template || !p.template.includes('<<<TARGET_TEXT_START>>>')) {
              p.template = def.template;
              configNeedsSave = true;
            }
          }
        });

        // Ensure all default prompts exist
        DEFAULT_TEXT_PROMPTS.forEach(defPrompt => {
          const exists = currentConfig.textPrompts.some(p => p.id === defPrompt.id);
          if (!exists) {
            currentConfig.textPrompts.push(JSON.parse(JSON.stringify(defPrompt)));
            configNeedsSave = true;
          }
        });

        // If the prompts list contains only default IDs, sort them to match DEFAULT_TEXT_PROMPTS order
        const allAreDefaults = currentConfig.textPrompts.every(p => DEFAULT_TEXT_PROMPTS.some(d => d.id === p.id));
        if (allAreDefaults) {
          const defaultOrder = DEFAULT_TEXT_PROMPTS.map(d => d.id);
          const isSorted = currentConfig.textPrompts.every((p, idx) => defaultOrder.indexOf(p.id) === idx);
          if (!isSorted) {
            currentConfig.textPrompts.sort((a, b) => {
              const idxA = defaultOrder.indexOf(a.id);
              const idxB = defaultOrder.indexOf(b.id);
              return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
            });
            configNeedsSave = true;
          }
        }
      }

      // Sanitize old hardcoded placeholder key
      if (currentConfig.apiKey && currentConfig.apiKey.startsWith('AQ.')) {
        currentConfig.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        configNeedsSave = true;
      }

      if (configNeedsSave) {
        saveConfig(currentConfig, false, true);
      } else if (currentConfig.autoLaunch !== undefined) {
        applyAutoLaunchSetting(currentConfig.autoLaunch);
      }
    } else {
      currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      saveConfig(currentConfig, false, true);
    }
  } catch (err) {
    console.error('Error loading config:', err);
    currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  return currentConfig;
}

// Save Config
function saveConfig(config, notifyMsg, skipHotkeyRegister) {
  try {
    currentConfig = { ...currentConfig, ...config };
    if (config && config.autoLaunch !== undefined) {
      applyAutoLaunchSetting(config.autoLaunch);
    }
    fs.writeFileSync(configFilePath, JSON.stringify(currentConfig, null, 2), 'utf8');
    if (!skipHotkeyRegister) {
      registerGlobalHotkey();
    }
    if (tray) updateTrayContextMenu();

    if (config && config.defaultModel) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('model-changed', { modelId: config.defaultModel });
      }
      if (toolbarWindow && !toolbarWindow.isDestroyed()) {
        toolbarWindow.webContents.send('model-changed', { modelId: config.defaultModel });
      }
    }

    if (notifyMsg !== false) {
      const modelObj = TRAY_MODELS.find(m => m.id === currentConfig.defaultModel);
      const modelName = modelObj ? modelObj.name : currentConfig.defaultModel;
      const body = notifyMsg || `บันทึกการตั้งค่าแล้ว (โมเดล: ${modelName}, คีย์ลัด: ${currentConfig.shortcutKey || 'Ctrl+Shift+S'})`;
      showWindowsNotification('SnapMind AI', body);
    }
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

// Load History
function loadHistory() {
  try {
    if (fs.existsSync(historyFilePath)) {
      const data = fs.readFileSync(historyFilePath, 'utf8');
      currentHistory = JSON.parse(data);
    } else {
      currentHistory = [];
    }
  } catch (err) {
    console.error('Error loading history:', err);
    currentHistory = [];
  }
  return currentHistory;
}

// Save History Item (Optimized thumbnail & limit to 20 items)
async function saveHistoryItem(item) {
  try {
    // Downscale thumbnail image to keep history lightweight
    if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('data:image')) {
      try {
        const img = nativeImage.createFromDataURL(item.thumbnail);
        if (!img.isEmpty()) {
          const origSize = img.getSize();
          const thumbW = 160;
          const thumbH = Math.max(1, Math.round((origSize.height / Math.max(1, origSize.width)) * thumbW));
          const smallImg = img.resize({ width: thumbW, height: thumbH, quality: 'better' });
          item.thumbnail = `data:image/jpeg;base64,${smallImg.toJPEG(65).toString('base64')}`;
        }
      } catch (thumbErr) {
        console.warn('Thumbnail resize error:', thumbErr);
      }
    }

    currentHistory.unshift(item);
    if (currentHistory.length > 20) {
      currentHistory = currentHistory.slice(0, 20);
    }
    await fs.promises.writeFile(historyFilePath, JSON.stringify(currentHistory, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving history item:', err);
  }
}

function normalizeAccelerator(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') return 'CommandOrControl+Shift+S';
  let clean = inputStr.trim();
  if (clean.toLowerCase().includes('mouse')) return 'CommandOrControl+Shift+S';

  clean = clean.replace(/Control/gi, 'Ctrl')
               .replace(/Cmd/gi, 'CommandOrControl')
               .replace(/Meta/gi, 'CommandOrControl');

  let parts = clean.split('+').map(p => p.trim()).filter(p => p.length > 0);
  let modifiers = [];
  let mainKey = '';

  parts.forEach(p => {
    const lower = p.toLowerCase();
    if (lower === 'ctrl' || lower === 'control') modifiers.push('CommandOrControl');
    else if (lower === 'alt') modifiers.push('Alt');
    else if (lower === 'shift') modifiers.push('Shift');
    else if (lower === 'cmd' || lower === 'command') modifiers.push('CommandOrControl');
    else mainKey = p;
  });

  if (!mainKey) {
    mainKey = 'S';
  } else if (mainKey.toLowerCase() === 'space') {
    mainKey = 'Space';
  } else if (mainKey.toLowerCase() === 'caps' || mainKey.toLowerCase() === 'capslock' || mainKey.toLowerCase() === 'capital') {
    mainKey = 'CapsLock';
  } else {
    mainKey = mainKey.toUpperCase().replace(/[^\x00-\x7F]/g, '');
    if (!mainKey) mainKey = 'S';
  }

  if (modifiers.length === 0 && !mainKey.startsWith('F')) {
    modifiers.push('CommandOrControl');
  }

  return [...new Set([...modifiers, mainKey])].join('+');
}

const { spawn } = require('child_process');
let nativeHookProcess = null;
let isNativeHookActive = false;

function getNativeHookExePath() {
  let exePath = path.join(__dirname, 'hotkey_hook.exe');
  if (fs.existsSync(exePath)) return exePath;

  if (process.resourcesPath) {
    exePath = path.join(process.resourcesPath, 'hotkey_hook.exe');
    if (fs.existsSync(exePath)) return exePath;
  }

  return null;
}

function killNativeHookProcesses() {
  if (nativeBridge && nativeBridge.isDllAvailable()) {
    try { nativeBridge.stopNativeKeyboardHook(); } catch (e) {}
  }
  if (nativeHookProcess) {
    try { nativeHookProcess.kill(); } catch (e) {}
    nativeHookProcess = null;
  }
  isNativeHookActive = false;
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      execSync('taskkill /F /IM hotkey_hook.exe /T', { stdio: 'ignore' });
    } catch (e) {}
  }
}

function registerElectronGlobalShortcutFallback() {
  const rawKey = currentConfig ? (currentConfig.shortcutKey || DEFAULT_CONFIG.shortcutKey) : DEFAULT_CONFIG.shortcutKey;
  const primaryHotkey = normalizeAccelerator(rawKey);

  if (primaryHotkey && !primaryHotkey.toLowerCase().includes('mouse')) {
    try {
      globalShortcut.unregister(primaryHotkey);
      const success = globalShortcut.register(primaryHotkey, () => {
        console.log(`[Hotkey] Global hotkey triggered via Electron globalShortcut: ${primaryHotkey}`);
        startSnippingMode();
      });

      if (success) {
        console.log(`[Hotkey] Active Global Hotkey (Electron): ${primaryHotkey}`);
      } else {
        console.warn(`[Hotkey] Could not register global hotkey (Electron): ${primaryHotkey}`);
      }
    } catch (e) {
      console.error(`[Hotkey] Exception registering ${primaryHotkey}:`, e);
    }
  }

  // Register Quick Text Hotkey in Electron globalShortcut as dual fallback
  const rawQuickKey = currentConfig ? (currentConfig.quickTextShortcutKey || DEFAULT_CONFIG.quickTextShortcutKey) : DEFAULT_CONFIG.quickTextShortcutKey;
  let quickHotkey = 'Ctrl+CapsLock';
  if (rawQuickKey) {
    if (rawQuickKey.toLowerCase().includes('caps')) {
      quickHotkey = 'Ctrl+CapsLock';
    } else {
      quickHotkey = normalizeAccelerator(rawQuickKey);
    }
  }

  if (quickHotkey) {
    try {
      globalShortcut.unregister(quickHotkey);
      const success = globalShortcut.register(quickHotkey, () => {
        if (isQuickTextActive) {
          console.log(`[GlobalShortcut] Quick text ignored because toolbar is already active`);
          return;
        }
        console.log(`[Hotkey] Quick Text Ask triggered via Electron globalShortcut: ${quickHotkey}`);
        handleQuickTextTrigger();
      });

      if (success) {
        console.log(`[Hotkey] Active Quick Text Hotkey (Electron): ${quickHotkey}`);
      } else {
        console.warn(`[Hotkey] Could not register quick text hotkey (Electron): ${quickHotkey}`);
      }
    } catch (e) {
      console.error(`[Hotkey] Exception registering quick text hotkey ${quickHotkey}:`, e);
    }
  }
}

let lastQuickTextTriggerTime = 0;
let lastCapturedQuickText = '';

const {
  captureSelectedText,
  restoreActiveClipboard,
  setActiveToolbarCapturedText,
  getActiveToolbarCapturedText,
  extractTextFromClipboard
} = require('./textCapture');

// Robust Multi-Tiered Auto-Copy Integration (textCapture.js):
// Tier 1: Hardware Scan Code Win32 low-level hook + sequence validation
// Tier 2: Mid-poll backup copy pulse (Ctrl+Insert & Ctrl+C)
// Tier 3: PowerShell SendWait('^c') fallback pulse
// Tier 4: Multi-Format Extraction (Plain text -> HTML -> RTF)
// Tier 5: In-Memory persistent buffer
async function captureSelectedTextWithRetry() {
  return await captureSelectedText({
    nativeHookProcess,
    deferRestore: true,
    getLatestHookText: () => lastCapturedQuickText
  });
}

async function triggerCopyAndGetText() {
  if (lastCapturedQuickText) {
    setActiveToolbarCapturedText(lastCapturedQuickText);
    return lastCapturedQuickText;
  }

  // Tier 1 & 2: Native hook copy + mid-poll backup pulse
  let result = await captureSelectedText({
    nativeHookProcess,
    deferRestore: true,
    getLatestHookText: () => lastCapturedQuickText
  });

  // Tier 3: Secondary backup copy pulse via existing native hook process stdin (ห้ามเปิด Process ใหม่เด็ดขาด)
  if (!result && !lastCapturedQuickText && nativeHookProcess && !nativeHookProcess.killed && nativeHookProcess.stdin) {
    try {
      nativeHookProcess.stdin.write("COPY\n");
      await new Promise((resolve) => setTimeout(resolve, 80));
    } catch (e) {}
  }

  // Tier 4: Valid result only from active capture
  let finalResult = result || lastCapturedQuickText || '';

  if (finalResult && finalResult.trim().length > 0) {
    setActiveToolbarCapturedText(finalResult.trim());
  } else {
    setActiveToolbarCapturedText('');
  }

  return finalResult ? finalResult.trim() : '';
}

async function handleQuickTextTrigger() {
  const now = Date.now();
  if (now - lastQuickTextTriggerTime < 250) {
    console.log(`[Debounce] Ignored rapid duplicate quick text trigger (${now - lastQuickTextTriggerTime}ms)`);
    return;
  }
  lastQuickTextTriggerTime = now;
  lastCapturedQuickText = ''; // Clean slate for fresh trigger
  setActiveToolbarCapturedText(''); // Clean slate for fresh trigger

  const cursorPos = screen.getCursorScreenPoint();

  const copyPromise = triggerCopyAndGetText();
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(''), 300));
  const capturedText = await Promise.race([copyPromise, timeoutPromise]);
  if (capturedText && capturedText.trim().length > 0) {
    const clean = capturedText.trim();
    lastCapturedQuickText = clean;
    setActiveToolbarCapturedText(clean);
  }

  startQuickTextMode(cursorPos, capturedText);
}

function createToolbarWindow() {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) return toolbarWindow;

  const iconPath = getAppIconPath();
  let appIcon = iconPath ? nativeImage.createFromPath(iconPath) : null;

  toolbarWindow = new BrowserWindow({
    title: 'SnapMind AI - Floating Toolbar',
    icon: appIcon || undefined,
    width: 1060, // Signature compat: width: 940 // Signature compat: width: 920
    height: 58, // Signature compat: height: 52 // Signature compat: height: 46
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  toolbarWindow.setSkipTaskbar(true);
  toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
  try {
    toolbarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch (e) {}
  toolbarWindow.setMenu(null);
  toolbarWindow.loadFile('toolbar.html');

  toolbarWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      closeQuickTextMode();
    }
  });

  return toolbarWindow;
}

function enforceTopmostWin32(win) {
  if (!win || win.isDestroyed()) return;
  try {
    win.setAlwaysOnTop(true, 'screen-saver', 1000);
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    nativeBridge.makeWindowTopmostNative(win);
    const hwndBuf = win.getNativeWindowHandle();
    if (hwndBuf && hwndBuf.length >= 4) {
      const hwndStr = (hwndBuf.length >= 8) ? hwndBuf.readBigInt64LE(0).toString() : hwndBuf.readInt32LE(0).toString();
      if (hwndStr && nativeHookProcess && !nativeHookProcess.killed && nativeHookProcess.stdin) {
        nativeHookProcess.stdin.write(`TOPMOST ${hwndStr}\n`);
      }
    }
  } catch (e) {}
}

let topmostKeeperInterval = null;

function startTopmostKeeper() {
  stopTopmostKeeper();
  topmostKeeperInterval = setInterval(() => {
    if (isQuickTextActive && toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
      enforceTopmostWin32(toolbarWindow);
    } else {
      stopTopmostKeeper();
    }
  }, 120);
}

function stopTopmostKeeper() {
  if (topmostKeeperInterval) {
    clearInterval(topmostKeeperInterval);
    topmostKeeperInterval = null;
  }
}

function registerToolbarShortcuts() {
  if (toolbarShortcutsActive) return;
  toolbarShortcutsActive = true;

  try {
    globalShortcut.unregister('Escape');
    globalShortcut.register('Escape', () => {
      closeQuickTextMode();
    });

    for (let i = 1; i <= 9; i++) {
      const digitKey = `${i}`;
      const digitIndex = i - 1;
      try {
        globalShortcut.unregister(digitKey);
        globalShortcut.register(digitKey, () => {
          if (toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
            toolbarWindow.webContents.send('quick-text-number-pressed', digitIndex);
          }
          if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
            mainWindow.webContents.send('quick-text-number-pressed', digitIndex);
          }
        });
      } catch (e) {}
    }

    try {
      globalShortcut.unregister('?');
      globalShortcut.register('?', () => {
        if (toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
          toolbarWindow.webContents.send('quick-text-custom-toggle');
        }
      });
    } catch (e) {}
  } catch (err) {
    console.error('Error registering toolbar shortcuts:', err);
  }
}

function unregisterToolbarShortcuts() {
  if (!toolbarShortcutsActive) return;
  toolbarShortcutsActive = false;

  try {
    globalShortcut.unregister('Escape');
    globalShortcut.unregister('?');
    for (let i = 1; i <= 9; i++) {
      globalShortcut.unregister(`${i}`);
    }
  } catch (err) {
    console.error('Error unregistering toolbar shortcuts:', err);
  }
}

let outsideClickInterval = null;
let toolbarShowTime = 0;
let lastOutsideClickTime = 0;
let isAnswerCardActive = false;

function handleOutsideClickDetected() {
  if (!isQuickTextActive || !toolbarWindow || toolbarWindow.isDestroyed() || !toolbarWindow.isVisible()) {
    return;
  }
  // NEVER dismiss answer window on outside clicks while AI answer card is active/displaying!
  // User can freely click into documents, editor, or browser to read or reference answer.
  if (isAnswerCardActive) {
    return;
  }
  // Ignore clicks during initial grace period (250ms)
  if (Date.now() - toolbarShowTime < 250) return;

  const now = Date.now();
  const elapsed = now - lastOutsideClickTime;

  // Ignore rapid duplicate events from the same mouse down press (<120ms)
  if (elapsed < 120) {
    return;
  }

  // DOUBLE-CLICK OUTSIDE PROTECTION:
  // Prevent single clicks elsewhere from closing the window unexpectedly.
  // Requires a deliberate double-click outside (2 clicks within 120ms - 600ms) to dismiss.
  if (elapsed <= 600) {
    console.log(`[Outside Click] Double click outside confirmed (${elapsed}ms) -> Dismissing toolbar cleanly...`);
    lastOutsideClickTime = 0;
    closeQuickTextMode();
  } else {
    lastOutsideClickTime = now;
    console.log('[Outside Click] Single click outside detected -> Window stays open (Requires double-click outside to close)');
  }
}

function startOutsideClickMonitor() {
  stopOutsideClickMonitor();
  toolbarShowTime = Date.now();
  lastOutsideClickTime = 0;
  outsideClickInterval = setInterval(() => {
    if (!isQuickTextActive || !toolbarWindow || toolbarWindow.isDestroyed() || !toolbarWindow.isVisible()) {
      stopOutsideClickMonitor();
      return;
    }
    // 250ms grace period after toolbar is shown to ignore the triggering click
    if (Date.now() - toolbarShowTime < 250) return;

    try {
      const bounds = toolbarWindow.getBounds();
      const pt = screen.getCursorScreenPoint();
      const isInsideToolbar = (pt.x >= bounds.x - 10 && pt.x <= bounds.x + bounds.width + 10 &&
                               pt.y >= bounds.y - 10 && pt.y <= bounds.y + bounds.height + 10);
      if (isInsideToolbar) return;

      if (nativeBridge.isMouseClickedOutsideNative(bounds)) {
        handleOutsideClickDetected();
      }
    } catch (e) {}
  }, 40);
}

function stopOutsideClickMonitor() {
  if (outsideClickInterval) {
    clearInterval(outsideClickInterval);
    outsideClickInterval = null;
  }
  lastOutsideClickTime = 0;
}

function sendToolbarWindowMsg(channel, data) {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('open-' + 'quick-text-toolbar', data);
  }
}

function startQuickTextMode(cursorPos, text) {
  isQuickTextActive = true;
  isAnswerCardActive = false;
  isSnippingActive = false;

  // Speculative pre-warm: open TLS connection to Gemini API ahead of time while user selects category
  prewarmGeminiConnection();

  if (!toolbarWindow || toolbarWindow.isDestroyed()) {
    createToolbarWindow();
  }

  // Ensure toolbar window is focusable and touch-responsive
  try {
    toolbarWindow.setFocusable(true);
  } catch (e) {}

  const activePoint = cursorPos || screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(activePoint);
  const tbWidth = 1060; // Signature compat: const tbWidth = 940; // Signature compat: const tbWidth = 920;
  const tbHeight = 58; // Signature compat: const tbHeight = 52; // Signature compat: const tbHeight = 46;

  const wa = activeDisplay.workArea;
  let posX = Math.round(activePoint.x - 20);

  // Position: Default ABOVE cursor ("ด้านบนสุด") so toolbar never covers the highlighted text
  let posY = Math.round(activePoint.y - tbHeight - 14);

  // If too close to top of screen, flip below cursor
  if (posY < wa.y + 8) {
    posY = Math.round(activePoint.y + 18);
  }

  // Bounds clamping to current display workArea
  if (posX + tbWidth > wa.x + wa.width) {
    posX = wa.x + wa.width - tbWidth - 10;
  }
  if (posX < wa.x) {
    posX = wa.x + 10;
  }
  if (posY + tbHeight > wa.y + wa.height) {
    posY = Math.round(activePoint.y - tbHeight - 15);
  }
  if (posY < wa.y) {
    posY = wa.y + 10;
  }

  toolbarWindow.setBounds({
    x: posX,
    y: posY,
    width: tbWidth,
    height: tbHeight
  });

  const payload = {
    cursor: activePoint,
    text: text || '',
    prompts: currentConfig?.textPrompts || DEFAULT_TEXT_PROMPTS
  };

  sendToolbarWindowMsg('open-quick-text-toolbar', payload);

  // Dedicated zero-focus toolbarWindow is the sole renderer; do not duplicate in mainWindow

  // CRITICAL ZERO FOCUS STEALING: Show toolbar window without stealing focus from origin app
  toolbarWindow.showInactive();

  // Enforce Absolute Topmost so NO app can overlap it
  enforceTopmostWin32(toolbarWindow);
  startTopmostKeeper();

  registerToolbarShortcuts();
  startOutsideClickMonitor();
  if (nativeBridge && nativeBridge.isDllAvailable()) {
    nativeBridge.setToolbarActiveState(1, posX, posY, tbWidth, tbHeight);
  }
}

let lastCapturedScreenImage = null;
let lastCapturedCropBox = null;

function calculateSmartToolbarPosition(rect, tbWidth = 1060, tbHeight = 58) {
  const safeRect = {
    x: Math.round(rect.x || 0),
    y: Math.round(rect.y || 0),
    w: Math.max(1, Math.round(rect.w || 100)),
    h: Math.max(1, Math.round(rect.h || 100))
  };
  const centerX = Math.round(safeRect.x + safeRect.w / 2);
  const centerY = Math.round(safeRect.y + safeRect.h / 2);
  const activeDisplay = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
  const wa = activeDisplay.workArea;

  // Center horizontally relative to the selection box
  let posX = Math.round(safeRect.x + (safeRect.w - tbWidth) / 2);
  // Clamp X within display workArea
  posX = Math.max(wa.x + 10, Math.min(wa.x + wa.width - tbWidth - 10, posX));

  const belowY = Math.round(safeRect.y + safeRect.h + 12);
  const aboveY = Math.round(safeRect.y - tbHeight - 12);

  let posY;
  if (belowY + tbHeight <= wa.y + wa.height - 8) {
    // 1. Primary: Below the selected area
    posY = belowY;
  } else if (aboveY >= wa.y + 8) {
    // 2. Secondary: Above the selected area
    posY = aboveY;
  } else {
    // 3. Selection covers most vertical height: Check beside (Right or Left)
    const rightX = Math.round(safeRect.x + safeRect.w + 14);
    const leftX = Math.round(safeRect.x - tbWidth - 14);
    if (rightX + tbWidth <= wa.x + wa.width - 8) {
      posX = rightX;
      posY = Math.max(wa.y + 10, Math.min(wa.y + wa.height - tbHeight - 10, Math.round(safeRect.y + 10)));
    } else if (leftX >= wa.x + 8) {
      posX = leftX;
      posY = Math.max(wa.y + 10, Math.min(wa.y + wa.height - tbHeight - 10, Math.round(safeRect.y + 10)));
    } else {
      // 4. Safe fallback: Placed at bottom of screen with comfortable padding
      posY = Math.max(wa.y + 10, wa.y + wa.height - tbHeight - 16);
    }
  }

  return { x: posX, y: posY, display: activeDisplay };
}

async function startScreenAreaToolbarMode(rect, preCroppedDataUrl = null, autoExecuteCategory = null) {
  isSnippingActive = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cancel-snipping-ui');
    mainWindow.hide();
  }

  // Unregister temporary Escape shortcut from snipping
  try {
    globalShortcut.unregister('Escape');
    globalShortcut.unregister('Esc');
  } catch (e) {}

  if (!rect || rect.w < 4 || rect.h < 4) {
    console.warn('[Screen Area Toolbar] Selection rect too small, aborting');
    return null;
  }

  // Ultra-fast crop directly from in-memory GDI snapshot (< 1ms)
  let croppedDataUrl = preCroppedDataUrl;
  if (!croppedDataUrl) {
    try {
      croppedDataUrl = await cropAreaDirect(rect);
    } catch (cropErr) {
      console.warn('[Screen Area Toolbar Crop Error]', cropErr.message);
    }
  }

  if (!croppedDataUrl) {
    console.warn('[Screen Area Toolbar] Failed to crop screen area');
    return null;
  }

  isQuickTextActive = true;
  isAnswerCardActive = false;
  prewarmGeminiConnection();

  if (!toolbarWindow || toolbarWindow.isDestroyed()) {
    createToolbarWindow();
  }

  try {
    toolbarWindow.setFocusable(true);
  } catch (e) {}

  const tbWidth = 1060;
  const tbHeight = 58;
  const pos = calculateSmartToolbarPosition(rect, tbWidth, tbHeight);

  toolbarWindow.setBounds({
    x: pos.x,
    y: pos.y,
    width: tbWidth,
    height: tbHeight
  });

  lastCapturedQuickText = '';
  lastCapturedScreenImage = croppedDataUrl;
  lastCapturedCropBox = rect;

  const payload = {
    cursor: { x: pos.x, y: pos.y },
    text: '',
    image: croppedDataUrl,
    cropBox: rect,
    sourceType: 'screen',
    prompts: currentConfig?.textPrompts || DEFAULT_TEXT_PROMPTS,
    autoExecuteCategory: autoExecuteCategory || null
  };

  toolbarWindow.webContents.send('open-quick-text-toolbar', payload);
  toolbarWindow.showInactive();

  enforceTopmostWin32(toolbarWindow);
  startTopmostKeeper();
  registerToolbarShortcuts();
  startOutsideClickMonitor();
  if (nativeBridge && nativeBridge.isDllAvailable()) {
    nativeBridge.setToolbarActiveState(1, pos.x, pos.y, tbWidth, tbHeight);
  }

  return { success: true, position: pos, croppedDataUrl };
}

function closeQuickTextMode() {
  isQuickTextActive = false;
  isAnswerCardActive = false;
  if (nativeBridge && nativeBridge.isDllAvailable()) {
    nativeBridge.setToolbarActiveState(0, 0, 0, 0, 0);
  }
  stopTopmostKeeper();
  stopOutsideClickMonitor();
  unregisterToolbarShortcuts();
  lastCapturedQuickText = '';
  lastCapturedScreenImage = null;
  lastCapturedCropBox = null;
  setActiveToolbarCapturedText('');

  // Restore original clipboard when toolbar closes
  try {
    restoreActiveClipboard();
  } catch (e) {}

  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('close-quick-text-ui');
    try {
      toolbarWindow.setFocusable(false);
    } catch (e) {}
    toolbarWindow.hide();
    toolbarWindow.setSize(1060, 58); // Signature compat: toolbarWindow.setSize(940, 52); // Signature compat: toolbarWindow.setSize(920, 46);
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('close-quick-text-ui');
    try {
      mainWindow.webContents.executeJavaScript(`
        const aiWin = document.getElementById('aiWindow');
        const isAiVisible = aiWin && (aiWin.style.display === 'flex' || aiWin.style.display === 'block');
        isAiVisible;
      `).then(isAiVisible => {
        if (!isAiVisible && !isSnippingActive && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
      }).catch(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
      });
    } catch (e) {}
  }
}

let currentActiveCombos = { snip: '', quick: '' };

function startNativeHotkeyHook(shortcutKeyStr, quickTextKeyStr) {
  const cleanSnip = (shortcutKeyStr || 'Alt+Shift+S').trim().replace(/\s+/g, '');
  const cleanQuick = (quickTextKeyStr || 'Ctrl+CapsLock').trim().replace(/\s+/g, '');

  if (isNativeHookActive && nativeHookProcess && !nativeHookProcess.killed &&
      currentActiveCombos.snip === cleanSnip && currentActiveCombos.quick === cleanQuick) {
    console.log('[Native Hook] Hook process already active with matching shortcuts, preserving process.');
    return;
  }
  currentActiveCombos = { snip: cleanSnip, quick: cleanQuick };
  killNativeHookProcesses();

  // 1. Primary: Direct in-process native DLL integration (GeminiTextCopy.dll) - No separate helper .exe process!
  if (nativeBridge.initNativeBridge() && nativeBridge.isDllAvailable()) {
    console.log(`[Native Hook] Launching In-Process Win32 Keyboard Hook: Snip="${cleanSnip}", QuickText="${cleanQuick}"`);
    const hookStarted = nativeBridge.startNativeKeyboardHook(cleanSnip, cleanQuick, process.pid);
    if (hookStarted) {
      isNativeHookActive = true;
      nativeBridge.startHookPolling({
        onSnip: () => {
          console.log('[Native Hook] In-Process Win32 Hook Triggered (Snip)!');
          startSnippingMode();
        },
        onQuickText: (text) => {
          console.log(`[Native Hook] In-Process Win32 Hook Triggered (Quick Text, length=${text ? text.length : 0})!`);
          lastCapturedQuickText = text || '';
          setActiveToolbarCapturedText(text || '');
          const cursorPos = screen.getCursorScreenPoint();
          startQuickTextMode(cursorPos, text || '');
        },
        onClickOutside: () => {
          if (isQuickTextActive && toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
            try {
              const bounds = toolbarWindow.getBounds();
              const pt = screen.getCursorScreenPoint();
              const isInsideToolbar = (pt.x >= bounds.x - 10 && pt.x <= bounds.x + bounds.width + 10 &&
                                       pt.y >= bounds.y - 10 && pt.y <= bounds.y + bounds.height + 10);
              if (!isInsideToolbar) {
                handleOutsideClickDetected();
              }
            } catch (e) {
              handleOutsideClickDetected();
            }
          }
        }
      });
      console.log('[Native Hook] Using in-process native DLL (GeminiTextCopy.dll) - No separate helper .exe process needed!');
      return;
    }
  }

  const exePath = getNativeHookExePath();
  if (!exePath) {
    console.log('[Native Hook] hotkey_hook.exe not found');
    return;
  }

  try {
    console.log(`[Native Hook] Launching Win32 Low-Level Keyboard Hook: Snip="${cleanSnip}", QuickText="${cleanQuick}"`);
    nativeHookProcess = spawn(exePath, [cleanSnip, cleanQuick, process.pid.toString()]);

    nativeHookProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('CLICK_OUTSIDE_TOOLBAR')) {
        if (isQuickTextActive && toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
          try {
            const bounds = toolbarWindow.getBounds();
            const pt = screen.getCursorScreenPoint();
            const isInsideToolbar = (pt.x >= bounds.x - 10 && pt.x <= bounds.x + bounds.width + 10 &&
                                     pt.y >= bounds.y - 10 && pt.y <= bounds.y + bounds.height + 10);
            if (!isInsideToolbar) {
              handleOutsideClickDetected();
            }
          } catch (e) {
            handleOutsideClickDetected();
          }
        }
      }
      if (msg.includes('HOTKEY_HOOK_READY')) {
        isNativeHookActive = true;
        console.log('[Native Hook] Hook successfully installed and active');
      }
      if (msg.includes('HOTKEY_TRIGGERED_WITH_TEXT:')) {
        const parts = msg.split('HOTKEY_TRIGGERED_WITH_TEXT:');
        for (let i = 1; i < parts.length; i++) {
          const b64 = parts[i].trim().split(/[\r\n]+/)[0];
          let text = '';
          if (b64) {
            try {
              text = Buffer.from(b64, 'base64').toString('utf8').trim();
            } catch (e) {}
          }
          lastCapturedQuickText = text;
          setActiveToolbarCapturedText(text);
          const cursorPos = screen.getCursorScreenPoint();
          console.log(`[Native Hook] Quick Text Triggered With Text (length: ${text.length})`);
          startQuickTextMode(cursorPos, text);
        }
      } else if (msg.includes('HOTKEY_TRIGGERED:QUICK_TEXT')) {
        console.log('[Native Hook] Win32 Low-Level Keyboard Hook Triggered (Quick Text - capturing in background)...');
      } else if (msg.includes('HOTKEY_TRIGGERED:SNIP') || (msg.includes('HOTKEY_TRIGGERED') && !msg.includes('QUICK_TEXT'))) {
        console.log('[Native Hook] Win32 Low-Level Keyboard Hook Triggered (Snip)!');
        startSnippingMode();
      }

      if (msg.includes('QUICK_TEXT_CAPTURED:')) {
        const parts = msg.split('QUICK_TEXT_CAPTURED:');
        for (let i = 1; i < parts.length; i++) {
          const b64 = parts[i].trim().split(/[\r\n]+/)[0];
          if (b64) {
            try {
              const text = Buffer.from(b64, 'base64').toString('utf8').trim();
              if (text) {
                lastCapturedQuickText = text;
                setActiveToolbarCapturedText(text);
                if (toolbarWindow && !toolbarWindow.isDestroyed()) {
                  toolbarWindow.webContents.send('quick-text-captured-update', { text });
                }
              }
            } catch (e) {}
          }
        }
      }

      if (msg.includes('COPY_RESULT:') && !msg.includes('COPY_RESULT:NONE')) {
        const parts = msg.split('COPY_RESULT:');
        for (let i = 1; i < parts.length; i++) {
          const b64 = parts[i].trim().split(/[\r\n]+/)[0];
          if (b64 && b64 !== 'NONE') {
            try {
              const text = Buffer.from(b64, 'base64').toString('utf8').trim();
              if (text) {
                lastCapturedQuickText = text;
                setActiveToolbarCapturedText(text);
                if (toolbarWindow && !toolbarWindow.isDestroyed()) {
                  toolbarWindow.webContents.send('quick-text-captured-update', { text });
                }
              }
            } catch (e) {}
          }
        }
      }
    });

    nativeHookProcess.stderr.on('data', (data) => {
      console.error('[Native Hook Error]', data.toString());
    });

    nativeHookProcess.on('error', (err) => {
      console.error('[Native Hook Exception]', err);
      isNativeHookActive = false;
    });

    nativeHookProcess.on('exit', (code, signal) => {
      console.log(`[Native Hook] Exited (code ${code}, signal ${signal})`);
      isNativeHookActive = false;
    });
  } catch (err) {
    console.error('Failed to launch native hotkey hook:', err);
    isNativeHookActive = false;
  }
}

function registerGlobalHotkey() {
  globalShortcut.unregisterAll();
  const rawKey = currentConfig ? (currentConfig.shortcutKey || DEFAULT_CONFIG.shortcutKey) : DEFAULT_CONFIG.shortcutKey;
  const primaryHotkey = normalizeAccelerator(rawKey);

  const rawQuickKey = currentConfig ? (currentConfig.quickTextShortcutKey || DEFAULT_CONFIG.quickTextShortcutKey) : DEFAULT_CONFIG.quickTextShortcutKey;

  console.log(`[Hotkey Debug] Raw Config: "${rawKey}" -> Primary Normalized: "${primaryHotkey}", QuickText: "${rawQuickKey}"`);

  // 1. Unconditionally register Electron globalShortcut (primary, rock-solid OS hotkey)
  registerElectronGlobalShortcutFallback();

  // 2. ALSO run Win32 low-level keyboard hook as hardware-level dual hook
  const cleanNativeKey = primaryHotkey.replace(/CommandOrControl/gi, 'Ctrl').replace(/\s+/g, '');
  const cleanQuickKey = rawQuickKey.replace(/CommandOrControl/gi, 'Ctrl').replace(/\s+/g, '');
  if (nativeBridge && nativeBridge.isDllAvailable()) {
    nativeBridge.updateHotkeyCombos(cleanNativeKey, cleanQuickKey);
  }
  startNativeHotkeyHook(cleanNativeKey, cleanQuickKey);
}

function getCombinedDisplaysBounds() {
  const displays = screen.getAllDisplays();
  if (!displays || displays.length === 0) {
    const p = screen.getPrimaryDisplay();
    return p ? p.bounds : { x: 0, y: 0, width: 1920, height: 1080 };
  }
  let minX = displays[0].bounds.x;
  let minY = displays[0].bounds.y;
  let maxX = displays[0].bounds.x + displays[0].bounds.width;
  let maxY = displays[0].bounds.y + displays[0].bounds.height;

  displays.forEach((display) => {
    const { x, y, width, height } = display.bounds;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + width > maxX) maxX = x + width;
    if (y + height > maxY) maxY = y + height;
  });

  const primary = screen.getPrimaryDisplay();
  if (primary && primary.bounds) {
    if (primary.bounds.x < minX) minX = primary.bounds.x;
    if (primary.bounds.y < minY) minY = primary.bounds.y;
    if (primary.bounds.x + primary.bounds.width > maxX) maxX = primary.bounds.x + primary.bounds.width;
    if (primary.bounds.y + primary.bounds.height > maxY) maxY = primary.bounds.y + primary.bounds.height;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function getAppIconPath() {
  let iconPath = path.join(__dirname, 'SnapMind.ico');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, 'icon.ico');
  }
  if (!fs.existsSync(iconPath) && process.resourcesPath) {
    iconPath = path.join(process.resourcesPath, 'SnapMind.ico');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.resourcesPath, 'icon.ico');
    }
  }
  return fs.existsSync(iconPath) ? iconPath : null;
}

function createWindow() {
  const combinedBounds = getCombinedDisplaysBounds();

  const iconPath = getAppIconPath();
  let appIcon = iconPath ? nativeImage.createFromPath(iconPath) : null;

  mainWindow = new BrowserWindow({
    title: 'SnapMind AI',
    icon: appIcon || undefined,
    x: combinedBounds.x,
    y: combinedBounds.y,
    width: combinedBounds.width,
    height: combinedBounds.height,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setSkipTaskbar(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setMenu(null);
  mainWindow.loadFile('index.html');

  // Prevent app from quitting when window is closed
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      cancelSnippingMode();
    }
  });
}

let lastSnippingTriggerTime = 0;
let cachedDesktopCapturePromise = null;
let cachedCaptureTimestamp = 0;
let currentFreezeSnapshot = null;

async function captureScreenFreezeFrames() {
  // Fast path: In-process Win32 GDI capture (15ms, 100% reliable)
  try {
    if (nativeBridge && nativeBridge.captureScreenFreezeNative) {
      const gdiRes = nativeBridge.captureScreenFreezeNative();
      if (gdiRes && gdiRes.frame) {
        currentFreezeSnapshot = gdiRes;
        return [gdiRes.frame];
      }
    }
  } catch (err) {
    console.warn('[GDI Freeze Capture Warning]', err.message);
  }

  try {
    const displays = screen.getAllDisplays();
    if (!displays || displays.length === 0) return [];
    const combinedBounds = getCombinedDisplaysBounds();

    const maxDisplayWidth = Math.max(...displays.map(d => Math.round(d.bounds.width * (d.scaleFactor || 1))));
    const maxDisplayHeight = Math.max(...displays.map(d => Math.round(d.bounds.height * (d.scaleFactor || 1))));

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.min(Math.max(maxDisplayWidth, 1920), 4096),
        height: Math.min(Math.max(maxDisplayHeight, 1080), 4096)
      }
    });

    if (!sources || sources.length === 0) return [];

    cachedCaptureTimestamp = Date.now();
    cachedDesktopCapturePromise = Promise.resolve(sources);

    const frames = displays.map(d => {
      let targetSource = sources.find(s => s.display_id === d.id.toString() || s.id.includes(d.id.toString()));
      if (!targetSource) targetSource = sources[0];

      let dataUrl = null;
      if (targetSource && targetSource.thumbnail) {
        dataUrl = 'data:image/jpeg;base64,' + targetSource.thumbnail.toJPEG(82).toString('base64');
      }

      return {
        displayId: d.id,
        x: d.bounds.x - combinedBounds.x,
        y: d.bounds.y - combinedBounds.y,
        width: d.bounds.width,
        height: d.bounds.height,
        dataUrl
      };
    }).filter(f => Boolean(f.dataUrl));

    return frames;
  } catch (e) {
    console.warn('[Freeze Screen Capture Warning]', e.message);
    return [];
  }
}

function preCaptureDesktopSources() {
  try {
    const displays = screen.getAllDisplays();
    if (!displays || displays.length === 0) return;
    const maxDisplayWidth = Math.max(...displays.map(d => Math.round(d.bounds.width * (d.scaleFactor || 1))));
    const maxDisplayHeight = Math.max(...displays.map(d => Math.round(d.bounds.height * (d.scaleFactor || 1))));

    cachedCaptureTimestamp = Date.now();
    cachedDesktopCapturePromise = desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.min(Math.max(maxDisplayWidth, 1920), 4096),
        height: Math.min(Math.max(maxDisplayHeight, 1080), 4096)
      }
    }).catch(err => {
      console.warn('[PreCapture Warning]', err.message);
      return null;
    });
  } catch (e) {
    cachedDesktopCapturePromise = null;
  }
}

let isNativeSnippingRunning = false;

async function startNativeSnippingMode() {
  if (isNativeSnippingRunning) return;
  isNativeSnippingRunning = true;
  isSnippingActive = true;

  if (nativeBridge && nativeBridge.saveForegroundWindow) {
    nativeBridge.saveForegroundWindow(mainWindow);
  }

  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.hide();
  }
  unregisterToolbarShortcuts();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }

  setImmediate(() => {
    prewarmGeminiConnection();
  });

  try {
    const result = await nativeBridge.startNativeScreenSelectionAsync(1);
    isNativeSnippingRunning = false;

    if (result && result.success && result.rect && result.rect.w >= 4 && result.rect.h >= 4) {
      console.log(`[Native Selection] Confirmed selection: (${result.rect.x}, ${result.rect.y}) ${result.rect.w}x${result.rect.h}`);
      // Show the exact Ctrl+Caps floating toolbar (toolbarWindow) at smart position with null autoExecuteCategory (waiting for user choice)
      await startScreenAreaToolbarMode(result.rect, result.dataUrl, null);
    } else {
      console.log('[Native Selection] Selection cancelled or dismissed');
      isSnippingActive = false;
      if (nativeBridge && nativeBridge.restoreForegroundWindow) {
        nativeBridge.restoreForegroundWindow();
      }
    }
  } catch (err) {
    console.warn('[Native Selection Error]:', err.message);
    isNativeSnippingRunning = false;
    isSnippingActive = false;
    if (nativeBridge && nativeBridge.restoreForegroundWindow) {
      nativeBridge.restoreForegroundWindow();
    }
  }
}

function startSnippingMode() {
  const now = Date.now();
  if (now - lastSnippingTriggerTime < 300) {
    console.log(`[Debounce] Ignored rapid duplicate snipping trigger (${now - lastSnippingTriggerTime}ms)`);
    return;
  }
  lastSnippingTriggerTime = now;

  // Interactive Selection Overlay: Uses in-process C++ NativeScreenCapture.dll for instant GDI freeze
  // Keeps selection on screen, renders 8 handles, allows move/resize, and presents Ctrl+Caps question choices.
  if (process.env.TEST_NATIVE_SNIP_WIN32 && nativeBridge && nativeBridge.isNativeCaptureAvailable()) {
    startNativeSnippingMode();
    return;
  }

  // Save current active foreground window so focus can be instantly restored on cancel
  if (nativeBridge && nativeBridge.saveForegroundWindow) {
    nativeBridge.saveForegroundWindow(mainWindow);
  }

  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.hide();
  }
  unregisterToolbarShortcuts();

  // Instant GDI Screen Freeze Capture into memory (< 15ms, 100% pristine screen view with CAPTUREBLT)
  let freezeDataUrl = null;
  try {
    if (nativeBridge && nativeBridge.captureScreenFreezeNative) {
      const gdiRes = nativeBridge.captureScreenFreezeNative();
      if (gdiRes && gdiRes.nativeImage) {
        currentFreezeSnapshot = gdiRes;
        freezeDataUrl = gdiRes.dataUrl;
      }
    }
  } catch (gdiErr) {
    console.warn('[Fast GDI Snipping Pre-capture Warning]', gdiErr.message);
  }

  // Ultra-speed background tasks: prewarm connection and pre-capture desktop sources
  setImmediate(() => {
    preCaptureDesktopSources();
  });
  setImmediate(() => {
    prewarmGeminiConnection();
  });

  if (!mainWindow || mainWindow.isDestroyed()) return;
  isSnippingActive = true;

  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.hide();
  }
  unregisterToolbarShortcuts();

  const bounds = getCombinedDisplaysBounds();
  // Enforce full-screen virtual bounds covering Windows taskbar BEFORE presentation
  const curBounds = mainWindow.getBounds();
  if (curBounds.x !== bounds.x || curBounds.y !== bounds.y || curBounds.width !== bounds.width || curBounds.height !== bounds.height) {
    mainWindow.setBounds(bounds);
  }
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setSkipTaskbar(true);

  // Instant 0ms presentation without latency while keeping frame synchronization
  mainWindow.show();
  mainWindow.focus();

  if (nativeBridge && nativeBridge.makeWindowTopmostNative) {
    nativeBridge.makeWindowTopmostNative(mainWindow);
    nativeBridge.makeWindowTopmostNative(mainWindow, bounds);
  }
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && isSnippingActive) {
      const cur = mainWindow.getBounds();
      if (cur.height !== bounds.height || cur.width !== bounds.width || cur.y !== bounds.y || cur.x !== bounds.x) {
        mainWindow.setBounds(bounds);
        if (nativeBridge && nativeBridge.makeWindowTopmostNative) {
          nativeBridge.makeWindowTopmostNative(mainWindow, bounds);
        }
      }
    }
  }, 25);

  // Pre-cleanup DOM via executeJavaScript before showing window to eliminate any GPU buffer flash of AI window or Settings/History modals
  try {
    mainWindow.webContents.executeJavaScript(`
      document.body.classList.add('snipping-active');
      const aiWin = document.getElementById('aiWindow');
      if (aiWin) {
        aiWin.style.display = 'none';
        aiWin.style.visibility = 'hidden';
        aiWin.style.opacity = '0';
      }
      const setModal = document.getElementById('settingsModal');
      if (setModal) {
        setModal.style.display = 'none';
        setModal.style.visibility = 'hidden';
        setModal.style.opacity = '0';
      }
      const histModal = document.getElementById('historyModal');
      if (histModal) {
        histModal.style.display = 'none';
        histModal.style.visibility = 'hidden';
        histModal.style.opacity = '0';
      }
      const scanCanvas = document.getElementById('scanCanvas');
      if (scanCanvas) {
        scanCanvas.style.display = 'block';
        scanCanvas.style.backgroundImage = 'none';
      }
    `).catch(() => {});
  } catch (e) {}

  const snipPayload = { bounds, freezeDataUrl };
  mainWindow.webContents.send('start-snipping', snipPayload); // mainWindow.webContents.send('start-snipping');
  if (freezeDataUrl) {
    mainWindow.webContents.send('freeze-screen-snapshot', freezeDataUrl);
  }

  // Dynamically register Escape key ONLY while in snipping mode
  try {
    globalShortcut.unregister('Escape');
    globalShortcut.register('Escape', () => {
      cancelSnippingMode();
    });
  } catch (e) {}
}

function cancelSnippingMode() {
  isSnippingActive = false;
  cachedDesktopCapturePromise = null;
  currentFreezeSnapshot = null;

  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.hide();
  }

  // Unregister Escape shortcut immediately when exiting snipping mode
  try {
    globalShortcut.unregister('Escape');
  } catch (e) {}

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.executeJavaScript(`
        const aiWin = document.getElementById('aiWindow');
        if (aiWin) {
          aiWin.style.display = 'none';
          aiWin.style.visibility = 'hidden';
          aiWin.style.opacity = '0';
        }
        const setModal = document.getElementById('settingsModal');
        if (setModal) {
          setModal.style.display = 'none';
          setModal.style.visibility = 'hidden';
          setModal.style.opacity = '0';
        }
        const histModal = document.getElementById('historyModal');
        if (histModal) {
          histModal.style.display = 'none';
          histModal.style.visibility = 'hidden';
          histModal.style.opacity = '0';
        }
        const quickCont = document.getElementById('quickTextContainer');
        if (quickCont) {
          quickCont.style.display = 'none';
        }
      `).catch(() => {});
    } catch (e) {}
    mainWindow.webContents.send('cancel-snipping-ui');
    mainWindow.setAlwaysOnTop(false);
    mainWindow.hide();
  }

  if (nativeBridge && nativeBridge.cancelNativeScreenCapture) {
    try {
      nativeBridge.cancelNativeScreenCapture();
    } catch (e) {}
  }

  // Restore focus to previous application window immediately
  if (nativeBridge && nativeBridge.restoreForegroundWindow) {
    nativeBridge.restoreForegroundWindow();
  }
}

// Create System Tray Icon
function createTrayIcon() {
  const iconPath = getAppIconPath();
  let trayIcon = iconPath ? nativeImage.createFromPath(iconPath) : null;

  if (!trayIcon) {
    const size = 16;
    const canvasBuffer = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const dx = x - 7.5;
        const dy = y - 7.5;
        if (Math.sqrt(dx * dx + dy * dy) <= 6.5) {
          canvasBuffer[idx] = 199; canvasBuffer[idx + 1] = 132; canvasBuffer[idx + 2] = 2; canvasBuffer[idx + 3] = 255;
        }
      }
    }
    trayIcon = nativeImage.createFromBuffer(canvasBuffer, { width: size, height: size });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('SnapMind AI (Google AI Studio)');

  updateTrayContextMenu();
  tray.on('double-click', () => startSnippingMode());
}

function updateTrayContextMenu() {
  const currentModelId = currentConfig ? currentConfig.defaultModel : 'gemini-3.8-flash';

  const modelSubmenu = TRAY_MODELS.map(m => ({
    label: m.name,
    type: 'radio',
    checked: m.id === currentModelId,
    click: () => {
      saveConfig({ defaultModel: m.id }, `สลับโมเดล AI เป็น "${m.name}" เรียบร้อยแล้ว`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('model-changed-from-tray', m.id);
      }
    }
  }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'สแกนหน้าจอ (Scan Screen)',
      click: () => startSnippingMode()
    },
    {
      label: 'ถาม AI จากข้อความ (Quick Text Ask)',
      click: () => handleQuickTextTrigger()
    },
    {
      label: 'เลือกโมเดล AI (Select Model)',
      submenu: modelSubmenu
    },
    { type: 'separator' },
    {
      label: 'การตั้งค่า (Settings)',
      click: () => openSettingsWindow()
    },
    {
      label: 'ประวัติการสแกน (History)',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('cancel-snipping-ui');
          mainWindow.setIgnoreMouseEvents(false);
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('open-history-ui');
        }
        openHistoryWindow();
      }
    },
    {
      label: 'เริ่มต้นอัตโนมัติเมื่อเปิด Windows',
      type: 'checkbox',
      checked: Boolean(currentConfig && currentConfig.autoLaunch),
      click: (menuItem) => {
        saveConfig({ autoLaunch: menuItem.checked }, menuItem.checked ? 'เปิดการเริ่มต้นพร้อม Windows แล้ว' : 'ปิดการเริ่มต้นพร้อม Windows แล้ว');
      }
    },
    { type: 'separator' },
    {
      label: 'ออกจากโปรแกรม (Exit)',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// App Life Cycle
app.whenReady().then(() => {
  loadConfig();
  loadHistory();
  createWindow();
  createToolbarWindow();
  createTrayIcon();
  registerGlobalHotkey();

  // Pre-warm Google Gemini API TLS connection immediately at startup
  prewarmGeminiConnection();
  // Keep-alive heartbeat: refresh connection pool every 45s so socket never goes cold
  setInterval(() => {
    prewarmGeminiConnection();
  }, 45000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createToolbarWindow();
    }
  });
});

app.on('window-all-closed', (e) => {
  // Keep app running in background tray icon
  if (e) e.preventDefault();
});

app.on('will-quit', () => {
  unregisterToolbarShortcuts();
  globalShortcut.unregisterAll();
  killNativeHookProcesses();
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

// --- GEMINI API CALL WITH AUTOMATIC ENDPOINT ROUTING & FALLBACK ---
async function callGeminiApiWithFallback(requestPayload, modelId) {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const keyErr = validateApiKeyFormat(apiKey);
  if (keyErr) throw keyErr;

  const endpointsToTry = getCandidateEndpoints(modelId);
  let lastError = null;

  for (let i = 0; i < endpointsToTry.length; i++) {
    const endpoint = endpointsToTry[i];
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}:generateContent?key=${apiKey}`;

    try {
      const fetchFn = (typeof net !== 'undefined' && net.fetch) ? net.fetch : fetch;
      let response = await fetchFn(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok && response.status === 400 && requestPayload.generationConfig?.thinkingConfig) {
        try {
          const fallbackPayload = JSON.parse(JSON.stringify(requestPayload));
          delete fallbackPayload.generationConfig.thinkingConfig;
          const retryRes = await fetchFn(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackPayload)
          });
          if (retryRes.ok) {
            response = retryRes;
          }
        } catch (retryErr) {}
      }

      if (response.ok) {
        const jsonResult = await response.json();
        return {
          success: true,
          data: jsonResult,
          endpointUsed: endpoint
        };
      }

      const errText = await response.text();
      let parsedMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          parsedMsg = errJson.error.message;
        }
      } catch (e) {}

      // Fast-fail if API key is invalid/expired
      const isApiKeyError = response.status === 400 && (
        parsedMsg.includes('API key not valid') ||
        parsedMsg.includes('API_KEY_INVALID') ||
        parsedMsg.includes('Invalid API Key') ||
        parsedMsg.includes('API key expired') ||
        parsedMsg.includes('API_KEY_EXPIRED') ||
        (parsedMsg.includes('INVALID_ARGUMENT') && parsedMsg.includes('API key'))
      );
      if (isApiKeyError) {
        throw new Error('Google AI Studio API Key ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบหรือระบุ API Key ที่ใช้งานได้ในหน้าการตั้งค่า (Settings)');
      }
      if (response.status === 403 || response.status === 401) {
        throw new Error(`การเข้าถึง Gemini API ถูกปฏิเสธ (${response.status}): ${parsedMsg || 'กรุณาตรวจสอบสิทธิ์ของ API Key'}`);
      }

      if (response.status === 429) {
        let retryMatch = errText.match(/retry in ([0-9\.]+)s/i);
        let retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
        lastError = new Error(`โควต้าการใช้งาน API ชั่วคราวเต็ม (Rate Limit 429)\n\nกรุณารอประมาณ ${retrySec} วินาทีแล้วลองใหม่อีกครั้ง หรือสลับโมเดล`);
        lastError.status = 429;
        // Continue to fallback model if available
        continue;
      }

      lastError = new Error(`Gemini API (${endpoint}) [${response.status}]: ${parsedMsg}`);
      lastError.status = response.status;

      // If model not found (404) or bad request for this endpoint (400), try next fallback
      if (response.status === 404 || response.status === 400 || response.status === 503) {
        console.warn(`[Gemini Fallback] Endpoint "${endpoint}" failed with ${response.status}: ${parsedMsg}. Trying next fallback...`);
        continue;
      }

    } catch (netErr) {
      console.warn(`[Gemini Network Error] Endpoint "${endpoint}" failed:`, netErr.message);
      lastError = netErr;
    }
  }

  throw (lastError || new Error('ไม่สามารถเชื่อมต่อ Gemini API ได้'));
}

// IPC Handlers
ipcMain.handle('get-settings', () => loadConfig());
ipcMain.handle('save-settings', (event, settings) => {
  saveConfig(settings);
  return currentConfig;
});
ipcMain.handle('set-active-model', (event, modelId) => {
  if (!modelId) return { success: false };
  saveConfig({ defaultModel: modelId }, false, true);
  return { success: true, modelId };
});
ipcMain.handle('show-notification', (event, { title, body }) => {
  showWindowsNotification(title, body);
});

ipcMain.handle('get-history', () => loadHistory());
ipcMain.handle('save-history-item', async (event, item) => {
  await saveHistoryItem(item);
  return currentHistory;
});
ipcMain.handle('clear-history', () => {
  currentHistory = [];
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify([], null, 2), 'utf8');
  } catch (e) {
    console.error(e);
  }
  return [];
});

ipcMain.on('trigger-scan', () => startSnippingMode());
ipcMain.on('cancel-snipping', () => cancelSnippingMode());
ipcMain.on('hide-window', () => {
  isSnippingActive = false;
  try { globalShortcut.unregister('Escape'); } catch (e) {}
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.hide();
  }
  if (nativeBridge && nativeBridge.restoreForegroundWindow) {
    nativeBridge.restoreForegroundWindow();
  }
});
function openSettingsWindow() {
  isSnippingActive = false;
  try { globalShortcut.unregister('Escape'); } catch (e) {}
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cancel-snipping-ui');
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('open-settings-ui');
  }
}

function openHistoryWindow() {
  isSnippingActive = false;
  try { globalShortcut.unregister('Escape'); } catch (e) {}
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cancel-snipping-ui');
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('open-history-ui');
  }
}

ipcMain.on('open-settings', () => openSettingsWindow());
ipcMain.on('open-history', () => openHistoryWindow());

ipcMain.on('show-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSkipTaskbar(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.handle('set-always-on-top', (event, flag) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSkipTaskbar(true);
    mainWindow.setAlwaysOnTop(flag, flag ? 'screen-saver' : 'normal');
    mainWindow.show();
    mainWindow.focus();
  }
  return flag;
});

ipcMain.handle('get-display-bounds', () => getCombinedDisplaysBounds());

// --- GEMINI TOOLS IPC HANDLERS ---
ipcMain.handle('gemini-get-tools-config', () => {
  const cfg = loadConfig();
  return cfg.tools || DEFAULT_CONFIG.tools;
});

ipcMain.handle('gemini-update-tools-config', (event, newToolsConfig) => {
  const cfg = loadConfig();
  cfg.tools = { ...(cfg.tools || DEFAULT_CONFIG.tools), ...newToolsConfig };
  saveConfig(cfg, 'บันทึกการตั้งค่าเครื่องมือ AI เรียบร้อยแล้ว');
  return cfg.tools;
});

ipcMain.handle('gemini-tools-run-interaction', async (event, params) => {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('กรุณาระบุ Google AI Studio API Key ก่อนใช้งานเครื่องมือ');
  }
  const toolsOptions = (currentConfig && currentConfig.tools) || DEFAULT_CONFIG.tools;
  return await geminiTools.runGeminiInteraction({
    apiKey,
    modelId: params?.modelId || currentConfig.defaultModel || 'gemini-3.8-flash',
    input: params?.input,
    tools: params?.tools,
    toolsOptions: { ...toolsOptions, ...(params?.toolsOptions || {}) },
    previousInteractionId: params?.previousInteractionId,
    base64Image: params?.base64Image,
    systemInstruction: params?.systemInstruction
  });
});

ipcMain.handle('gemini-file-search-create-store', async (event, { displayName, embeddingModel }) => {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return await geminiTools.createFileSearchStore({ apiKey, displayName, embeddingModel });
});

ipcMain.handle('gemini-file-search-upload-file', async (event, { storeName, filePath, displayName, chunkingConfig }) => {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return await geminiTools.uploadToFileSearchStore({ apiKey, storeName, filePath, displayName, chunkingConfig });
});

ipcMain.handle('gemini-file-search-list-stores', async () => {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return await geminiTools.listFileSearchStores({ apiKey });
});

ipcMain.handle('gemini-file-search-delete-store', async (event, { storeName, force }) => {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return await geminiTools.deleteFileSearchStore({ apiKey, storeName, force });
});

ipcMain.handle('gemini-tools-execute-function', async (event, { name, args }) => {
  return await geminiTools.executeToolFunction(name, args);
});

// Snapshot & Freeze Frame IPC Handlers
ipcMain.handle('get-freeze-screen-frames', async () => {
  return await captureScreenFreezeFrames();
});

// Native Clipboard Copy IPC Handler
ipcMain.handle('write-clipboard-text', (event, text) => {
  try {
    const { clipboard } = require('electron');
    if (clipboard && typeof clipboard.writeText === 'function') {
      clipboard.writeText(String(text || ''));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
});

// Multi-Monitor Aware Screen Cropping & Image Optimization (Direct Helper)
async function cropAreaDirect(rect) {
  const combinedBounds = getCombinedDisplaysBounds();

  // Ultra-fast path: Crop directly from in-memory frozen GDI desktop image (< 1ms)
  if (!currentFreezeSnapshot && nativeBridge && nativeBridge.captureScreenFreezeNative) {
    try {
      currentFreezeSnapshot = nativeBridge.captureScreenFreezeNative();
    } catch (e) {}
  }
  if (currentFreezeSnapshot && currentFreezeSnapshot.nativeImage && nativeBridge && nativeBridge.cropFreezeImageNative) {
    try {
      const croppedDataUrl = nativeBridge.cropFreezeImageNative(currentFreezeSnapshot, rect, combinedBounds);
      if (croppedDataUrl) {
        return croppedDataUrl;
      }
    } catch (cropNativeErr) {
      console.warn('[Crop Area Native Fallback]', cropNativeErr.message);
    }
  }
  const displays = screen.getAllDisplays();

  if (!displays || displays.length === 0) {
    throw new Error('No displays detected.');
  }

  // Convert window-relative coordinates to virtual desktop coordinates
  const virtualX = combinedBounds.x + rect.x;
  const virtualY = combinedBounds.y + rect.y;
  const virtualW = Math.max(1, rect.w);
  const virtualH = Math.max(1, rect.h);

  const centerX = virtualX + (virtualW / 2);
  const centerY = virtualY + (virtualH / 2);

  // Identify which display contains the center of selection
  let targetDisplay = displays.find(d => {
    return centerX >= d.bounds.x && centerX < d.bounds.x + d.bounds.width &&
           centerY >= d.bounds.y && centerY < d.bounds.y + d.bounds.height;
  });

  if (!targetDisplay) {
    targetDisplay = displays.find(d => {
      return virtualX >= d.bounds.x && virtualX < d.bounds.x + d.bounds.width &&
             virtualY >= d.bounds.y && virtualY < d.bounds.y + d.bounds.height;
    }) || screen.getPrimaryDisplay() || displays[0];
  }

  // Fast path: Consume pre-captured desktop sources from RAM cache if available (< 2ms)
  let sources = null;
  if (cachedDesktopCapturePromise && (Date.now() - cachedCaptureTimestamp < 15000)) {
    try {
      sources = await cachedDesktopCapturePromise;
    } catch (e) {}
    cachedDesktopCapturePromise = null;
  }

  // Fallback: Request high-res thumbnails for all screens freshly
  if (!sources || sources.length === 0) {
    const maxDisplayWidth = Math.max(...displays.map(d => Math.round(d.bounds.width * (d.scaleFactor || 1))));
    const maxDisplayHeight = Math.max(...displays.map(d => Math.round(d.bounds.height * (d.scaleFactor || 1))));

    sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.min(Math.max(maxDisplayWidth, 1920), 4096),
        height: Math.min(Math.max(maxDisplayHeight, 1080), 4096)
      }
    });
  }

  if (!sources || sources.length === 0) {
    throw new Error('Unable to capture screen sources.');
  }

  // Match target display to desktopCapturer source with multi-monitor scoring
  let targetSource = sources.find(s => s.display_id === targetDisplay.id.toString() || s.id.includes(targetDisplay.id.toString()));
  if (!targetSource) {
    const targetAspect = targetDisplay.bounds.width / targetDisplay.bounds.height;
    const targetPixelWidth = Math.round(targetDisplay.bounds.width * (targetDisplay.scaleFactor || 1));
    const targetPixelHeight = Math.round(targetDisplay.bounds.height * (targetDisplay.scaleFactor || 1));

    let bestScore = -Infinity;
    let bestSource = sources[0];

    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      let score = 0;

      if (s.display_id && (s.display_id === String(targetDisplay.id))) score += 100;
      if (s.id && s.id.includes(String(targetDisplay.id))) score += 80;

      const sz = s.thumbnail.getSize();
      if (sz.width > 0 && sz.height > 0) {
        const aspect = sz.width / sz.height;
        const aspectDiff = Math.abs(aspect - targetAspect);
        score += Math.max(0, 50 - aspectDiff * 100);

        const widthDiff = Math.abs(sz.width - targetPixelWidth);
        const heightDiff = Math.abs(sz.height - targetPixelHeight);
        score += Math.max(0, 50 - (widthDiff + heightDiff) * 0.05);
      }

      if (score > bestScore) {
        bestScore = score;
        bestSource = s;
      }
    }
    targetSource = bestSource;
  }

  const screenImg = targetSource.thumbnail;
  const imageSize = screenImg.getSize();

  const scaleX = imageSize.width / targetDisplay.bounds.width;
  const scaleY = imageSize.height / targetDisplay.bounds.height;

  const cropX = Math.max(0, Math.round((virtualX - targetDisplay.bounds.x) * scaleX));
  const cropY = Math.max(0, Math.round((virtualY - targetDisplay.bounds.y) * scaleY));
  const cropW = Math.max(1, Math.min(imageSize.width - cropX, Math.round(virtualW * scaleX)));
  const cropH = Math.max(1, Math.min(imageSize.height - cropY, Math.round(virtualH * scaleY)));

  if (cropW > 0 && cropH > 0) {
    const cropped = screenImg.crop({
      x: cropX,
      y: cropY,
      width: cropW,
      height: cropH
    });

    let processedImg = cropped;
    const croppedSize = cropped.getSize();
    const pixelArea = croppedSize.width * croppedSize.height;

    const maxDimension = 1024;
    let jpegQuality = 78;

    if (croppedSize.width > maxDimension || croppedSize.height > maxDimension) {
      let newW, newH;
      if (croppedSize.width >= croppedSize.height) {
        newW = maxDimension;
        newH = Math.max(1, Math.round((croppedSize.height / croppedSize.width) * maxDimension));
      } else {
        newH = maxDimension;
        newW = Math.max(1, Math.round((croppedSize.width / croppedSize.height) * maxDimension));
      }
      processedImg = cropped.resize({ width: newW, height: newH, quality: 'good' });
    }

    // Cleanly exit snipping state and unregister temporary Escape shortcut
    isSnippingActive = false;
    try {
      globalShortcut.unregister('Escape');
    } catch (e) {}

    const jpegBuffer = processedImg.toJPEG(78);
    return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
  }

  throw new Error('Invalid crop dimensions.');
}

ipcMain.handle('crop-area', async (event, rect) => {
  return await cropAreaDirect(rect);
});

ipcMain.handle('screen-area-selected', async (event, rect, preCroppedDataUrl = null) => {
  return await startScreenAreaToolbarMode(rect, preCroppedDataUrl);
});

ipcMain.handle('start-native-screen-selection', async (event, autoConfirm = 0) => {
  if (nativeBridge && nativeBridge.isNativeCaptureAvailable()) {
    return await nativeBridge.startNativeScreenSelectionAsync(autoConfirm ? 1 : 0);
  }
  return { success: false, reason: 'dll_unavailable' };
});

ipcMain.handle('is-native-capture-available', () => {
  return !!(nativeBridge && nativeBridge.isNativeCaptureAvailable());
});

// Secure Main Process Gemini Vision API Handler
ipcMain.handle('gemini-analyze-screen', async (event, { base64Image, modelId }) => {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const promptText = `คุณคือผู้เชี่ยวชาญวิเคราะห์ภาพถ่ายหน้าจอ วิเคราะห์ภาพนี้และตอบกลับมาเป็นรูปแบบ JSON เพียงอย่างเดียวอย่างละเอียด ชัดเจน สละสลวย เป็นธรรมชาติ ไม่ตอบห้วนหรือทื่อ (ข้อกำหนดภาษา: ใช้ภาษาไทยและภาษาอังกฤษที่ถูกต้องตามหลักภาษาเท่านั้น ห้ามมีอักษรภาษาอื่นที่ไม่เกี่ยวข้อง เช่น ภาษาอาหรับ ฮินดี เปอร์เซีย ปะปนเข้ามาเด็ดขาด):
{
  "thinking_process": "อธิบายขั้นตอนการคิดใน 1 ประโยคสั้นๆ",
  "answer": "คำตอบหลักอย่างละเอียด ถูกต้อง สละสลวย เป็นธรรมชาติ ไม่ทื่อ (หากมีหลายหัวข้อหรือหลายประเด็นให้จัดเป็น bullet points พร้อมหัวข้อตัวหนา เช่น * **หัวข้อ:** คำอธิบาย, หากเป็นข้อมูลดิบหรือคำตอบค่าเดียวให้ตอบตรงตัว, สูตรคณิตศาสตร์ใช้ LaTeX $...$ หรือ $$...$$)",
  "explain": "คำอธิบายเชิงลึกอย่างละเอียด ชัดเจน สละสลวย เข้าใจง่าย เป็นธรรมชาติ (หากมีหลายหัวข้อย่อยให้ใช้ bullet points พร้อมตัวหนา, หากเป็นข้อมูลดิบให้เขียนแบบความเรียง)",
  "summary": "สรุปใจความสำคัญเป็นข้อๆ อย่างครอบคลุม สละสลวย ด้วย bullet points",
  "translate": "แปลเนื้อหาทั้งหมดในภาพออกมาเป็นภาษาไทยอย่างสละสลวยและคงรูปแบบเดิมของต้นฉบับ (Raw Data)",
  "ocr": "ถอดข้อความตัวอักษรทุกคำ ทุกภาษาที่ปรากฏในภาพต้นฉบับออกมาแบบเป๊ะๆ 100% ตามภาษาเดิมอย่างเป็นข้อมูลดิบ (Raw Data) โดยรักษารูปแบบและองค์ประกอบ (Layout & Spatial Composition) ให้ตรงกับภาพต้นฉบับ เช่น การขึ้นบรรทัดใหม่ ย่อหน้า ตาราง (Markdown Table) รายการ โค้ด หรือหัวข้อ ห้ามแปล ห้ามสรุป ห้ามข้ามคำ หากไม่มีข้อความให้ระบุว่า (ไม่มีข้อความในภาพ)"
}`;

  const thinkingConf = getThinkingConfigForModel(modelId);

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 2048,
      ...thinkingConf
    }
  };

  const startTime = Date.now();
  const result = await callGeminiApiWithFallback(requestBody, modelId);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  const candidate = result.data.candidates?.[0];
  const candidateText = candidate?.content?.parts?.[0]?.text || '';
  const finishReason = candidate?.finishReason;

  return {
    rawText: candidateText,
    finishReason: finishReason,
    durationSec: durationSec,
    endpointUsed: result.endpointUsed
  };
});

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

// High-performance SSE Text Token Micro-Parser: extracts "text" and real terminal finishReason
function fastExtractSsePartText(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    const candidate = parsed.candidates?.[0];
    const parts = candidate?.content?.parts;
    let text = '';
    if (Array.isArray(parts)) {
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]?.text) {
          text += parts[i].text;
        }
      }
    }
    const finishReason = (candidate?.finishReason && typeof candidate.finishReason === 'string' && candidate.finishReason !== 'null')
      ? candidate.finishReason
      : null;
    return { text, finishReason };
  } catch (e) {
    return { text: '', finishReason: null };
  }
}

// Helper to execute a resilient Gemini SSE stream with endpoint fallback and low-latency racing
async function executeSingleGeminiStream(apiKey, endpointCandidates, requestPayload, onChunk) {
  const fetchFn = (typeof net !== 'undefined' && net.fetch) ? net.fetch : fetch;
  let fullText = '';
  let lastError = null;
  let usedEndpoint = null;
  let consecutive429Count = 0;

  for (let i = 0; i < (endpointCandidates ? endpointCandidates.length : 0); i++) {
    const endpoint = endpointCandidates[i];
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const controller = new AbortController();
    let isAbortedByTimeout = false;

    // Dynamic per-endpoint payload adaptation:
    // 1. Lite models do not support thinkingConfig (sending it triggers HTTP 400).
    // 2. Flash models require thinkingBudget: 0 to eliminate thinking latency (< 1s first token).
    // 3. Pro models retain thinkingConfig if enabled.
    const isLiteEndpoint = endpoint && (endpoint.includes('lite') || endpoint.includes('flash-lite'));
    const isProEndpoint = endpoint && endpoint.includes('pro');
    const endpointPayload = JSON.parse(JSON.stringify(requestPayload));

    if (endpointPayload.generationConfig) {
      if (isLiteEndpoint) {
        delete endpointPayload.generationConfig.thinkingConfig;
      } else if (!isProEndpoint) {
        endpointPayload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
    }

    const connectTimeoutMs = 12000;
    let connectTimer = setTimeout(() => {
      isAbortedByTimeout = true;
      try { controller.abort(); } catch (e) {}
    }, connectTimeoutMs);

    try {
      let response = await fetchFn(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpointPayload),
        signal: controller.signal
      });
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }

      // If endpoint rejects thinkingConfig with HTTP 400, retry once immediately without thinkingConfig
      if (!response.ok && response.status === 400 && endpointPayload.generationConfig?.thinkingConfig) {
        try {
          const fallbackPayload = JSON.parse(JSON.stringify(endpointPayload));
          delete fallbackPayload.generationConfig.thinkingConfig;
          const retryRes = await fetchFn(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackPayload),
            signal: controller.signal
          });
          if (retryRes.ok) {
            response = retryRes;
          }
        } catch (retryErr) {}
      }

      // If endpoint rejects payload with 400, check for inlineData vs inline_data mismatch and retry
      if (!response.ok && response.status === 400) {
        try {
          const payloadStr = JSON.stringify(requestPayload);
          const hasCamelInline = payloadStr.includes('"inlineData"');
          const hasSnakeInline = payloadStr.includes('"inline_data"');
          if (hasCamelInline || hasSnakeInline) {
            const convertedPayload = JSON.parse(payloadStr);
            if (convertedPayload.generationConfig?.thinkingConfig && !endpoint.includes('pro')) {
              delete convertedPayload.generationConfig.thinkingConfig;
            }
            if (convertedPayload.contents) {
              for (const c of convertedPayload.contents) {
                if (c.parts) {
                  for (let pIdx = 0; pIdx < c.parts.length; pIdx++) {
                    const p = c.parts[pIdx];
                    if (p.inlineData) {
                      c.parts[pIdx] = {
                        inline_data: {
                          mime_type: p.inlineData.mimeType || 'image/jpeg',
                          data: p.inlineData.data
                        }
                      };
                    } else if (p.inline_data && hasSnakeInline) {
                      c.parts[pIdx] = {
                        inlineData: {
                          mimeType: p.inline_data.mime_type || 'image/jpeg',
                          data: p.inline_data.data
                        }
                      };
                    }
                  }
                }
              }
            }
            const retryRes = await fetchFn(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(convertedPayload),
              signal: controller.signal
            });
            if (retryRes.ok) {
              response = retryRes;
            }
          }
        } catch (retrySchemaErr) {}
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let errJson = null;
        try { errJson = JSON.parse(errText); } catch (e) {}
        const apiMessage = errJson?.error?.message || errText || '';

        // Detect invalid or expired API Key immediately - DO NOT loop through fallbacks!
        const isApiKeyError = response.status === 400 && (
          apiMessage.includes('API key not valid') ||
          apiMessage.includes('API_KEY_INVALID') ||
          apiMessage.includes('Invalid API Key') ||
          apiMessage.includes('API key expired') ||
          apiMessage.includes('API_KEY_EXPIRED') ||
          (apiMessage.includes('INVALID_ARGUMENT') && apiMessage.includes('API key'))
        );
        if (isApiKeyError) {
          throw new Error('Google AI Studio API Key ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบหรือระบุ API Key ที่ใช้งานได้ในหน้าการตั้งค่า (Settings)');
        }

        if (response.status === 403 || response.status === 401) {
          throw new Error(`การเข้าถึง Gemini API ถูกปฏิเสธ (${response.status}): ${apiMessage || 'กรุณาตรวจสอบสิทธิ์ของ API Key ใน Google AI Studio'}`);
        }

        if (response.status === 429) {
          consecutive429Count++;
          const retryMatch = apiMessage.match(/retry in ([0-9\.]+)s/i);
          const retryWaitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 25;
          lastError = new Error(`โควต้าฟรีของ Google AI Studio ชั่วคราวเต็ม (Rate Limit 429) กรุณารอสักครู่ (ประมาณ ${retryWaitSec} วินาที) แล้วลองใหม่อีกครั้ง หรือระบุ API Key ที่ไม่มีข้อจำกัด`);
          console.warn(`[Gemini Fallback] Endpoint "${endpoint}" rate-limited (429). Trying next fallback...`);
          if (consecutive429Count >= 2) {
            console.warn(`[Gemini Rate Limit] Project quota exhausted across multiple endpoints. Halting fallback cascade to avoid quota penalty.`);
            throw lastError;
          }
          continue;
        }
        if (response.status === 503) {
          lastError = new Error(`โมเดล "${endpoint}" กำลังมีผู้ใช้งานหนาแน่นชั่วคราว (Service Unavailable 503)`);
          console.warn(`[Gemini Fallback] Endpoint "${endpoint}" overloaded (503). Trying next fallback...`);
          continue;
        }
        if (response.status === 404 || response.status === 400) {
          lastError = new Error(`โมเดล "${endpoint}" ไม่รองรับคำขอนี้ (${response.status}): ${apiMessage || 'Endpoint unavailable'}`);
          console.warn(`[Gemini Fallback] Endpoint "${endpoint}" returned ${response.status}: ${apiMessage}. Trying next fallback...`);
          continue;
        }
        lastError = new Error(`Gemini Stream Error (${endpoint}) [${response.status}]: ${apiMessage}`);
        throw lastError;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let sseBuffer = '';
      let streamEnded = false;
      let receivedAnyChunk = false;

      // TTFT Watchdog: If connected but no chunk arrives within deadline, failover to next model
      const ttftTimeoutMs = 8000;
      let ttftTimer = setTimeout(() => {
        if (!receivedAnyChunk) {
          isAbortedByTimeout = true;
          try { reader.cancel(); } catch (e) {}
          try { controller.abort(); } catch (e) {}
        }
      }, ttftTimeoutMs);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!receivedAnyChunk) {
          receivedAnyChunk = true;
          if (ttftTimer) {
            clearTimeout(ttftTimer);
            ttftTimer = null;
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

          const extracted = fastExtractSsePartText(jsonStr);
          if (extracted.text) {
            fullText += extracted.text;
            onChunk(extracted.text, endpoint);
          }

          const finishReason = extracted.finishReason;
          if (finishReason) {
            if (finishReason === 'STOP' || finishReason === 'MAX_TOKENS') {
              streamEnded = true;
              break;
            }
          }
        }

        if (streamEnded) {
          try { await reader.cancel(); } catch (e) {}
          break;
        }
      }

      // Flush any trailing line in sseBuffer so no final words or punctuation are lost
      if (sseBuffer && sseBuffer.trim()) {
        const trimmed = sseBuffer.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (jsonStr !== '[DONE]') {
            const extracted = fastExtractSsePartText(jsonStr);
            if (extracted.text) {
              fullText += extracted.text;
              onChunk(extracted.text, endpoint);
            }
          }
        }
      }

      if (ttftTimer) {
        clearTimeout(ttftTimer);
        ttftTimer = null;
      }

      if (fullText && fullText.trim().length > 0) {
        usedEndpoint = endpoint;
        return { success: true, fullText, endpoint: usedEndpoint };
      }
    } catch (streamErr) {
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
      if (isAbortedByTimeout || streamErr.name === 'AbortError' || streamErr.message?.includes('aborted')) {
        if (!lastError || !lastError.message?.includes('Rate Limit 429')) {
          lastError = new Error(`การเชื่อมต่อกับโมเดล "${endpoint}" หมดเวลา (Timeout) กรุณาลองใหม่อีกครั้ง`);
        }
      } else {
        lastError = streamErr;
      }
      console.warn(`[Gemini Stream Error] Endpoint "${endpoint}":`, lastError.message);
    }
  }

  throw (lastError || new Error('ไม่สามารถเชื่อมต่อ Gemini API ได้'));
}

// Helper: Execute Screen Vision Streaming Analysis
async function executeScreenStreamAnalysis({ base64Data, modelId, event, croppedDataUrl = null }) {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const keyErr = validateApiKeyFormat(apiKey);
  if (keyErr) throw keyErr;

  const isFlashLite = modelId && modelId.includes('flash-lite');
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const selectedModel = modelId || (currentConfig && currentConfig.defaultModel) || 'gemini-3.8-flash';
  const endpointsToTry = getCandidateEndpoints(selectedModel);
  const startTime = Date.now();

  const thinkingConf = getThinkingConfigForModel(modelId);

  // High-Speed Multi-Category Structured Prompt: Streams Answer in ~1.8s, finishes all 5 tabs in ~3.5s
  const unifiedPromptText = `คุณคือระบบ AI วิเคราะห์ภาพถ่ายหน้าจอความเร็วสูง วิเคราะห์ภาพหน้าจอนี้อย่างถูกต้อง แม่นยำ กระชับ ตอบทุกหมวดหมู่ให้สั้นกระชับ ตรงประเด็นที่สุด (ไม่อารัมภบท ไม่ทักทาย):
ข้อกำหนดภาษา: ใช้ภาษาไทยและภาษาอังกฤษที่ถูกต้องตามหลักภาษาเท่านั้น ห้ามมีตัวอักษรหรืออักขระภาษาอื่นที่ไม่เกี่ยวข้อง (NEVER output or mix unrelated foreign scripts)
หากภาพมีหลายข้อคำถามหรือหลายประเด็น ให้ตอบครบถ้วนทุกข้อตามลำดับ
### [ANSWER]
ตอบตรงประเด็นทันที หากมีหลายหัวข้อให้จัดเป็น Markdown bullet points พร้อมตัวหนา เช่น * **หัวข้อ:** คำอธิบาย หากเป็นคำถามหรือโจทย์ ให้ระบุคำตอบหรือข้อที่ถูกต้อง (สูตรคณิตศาสตร์ใช้ LaTeX $...$ หรือ $$...$$)
### [EXPLAIN]
อธิบายเหตุผลหรือหลักการสำคัญสั้นๆ 1-3 บรรทัด
### [SUMMARY]
สรุปสาระสำคัญเป็นข้อๆ 1-2 ข้อ ด้วย bullet points
### [TRANSLATE]
แปลข้อความภาษาต่างประเทศทั้งหมดในภาพเป็นภาษาไทยอย่างละเอียด รักษาโครงสร้างเดิม Spatial Composition ห้ามปล่อยเป็นภาษาอังกฤษล้วนโดยไม่แปลเด็ดขาด หากข้อความเดิมเป็นภาษาไทยให้ระบุ "(ข้อความต้นฉบับเป็นภาษาไทย)"
### [OCR]
ถอดข้อความสำคัญจากภาพตามต้นฉบับ หากไม่มีข้อความให้ระบุ "(ไม่มีข้อความในภาพ)"`;

  const analysisPromptText = unifiedPromptText;

  const ocrPromptText = `หน้าที่ของคุณคือ: ทำการวิเคราะห์ภาพเพื่อ Optical Character Recognition (OCR) และ Document Layout Analysis (Layout & Spatial Composition)
ถอดและคัดลอกข้อความทุกตัวอักษร ตัวเลข สัญลักษณ์ และโค้ดคอมพิวเตอร์ (Code Block) ที่ปรากฏในภาพต้นฉบับออกมาแบบ 100% ตัวต่อตัวอักษร รักษาการขึ้นบรรทัดใหม่
หากมีตารางให้จัดเป็น ตาราง Markdown Table (| คอลัมน์ 1 | คอลัมน์ 2 |) ตาราง (Markdown Table) ตามโครงสร้างเดิม ห้ามแปล ห้ามสรุป ห้ามตัดทอนข้อความ เริ่มต้นแสดงผลลัพธ์ทันที ไม่อารัมภบท ไม่ทักทาย`;

  const payload = {
    contents: [
      {
        parts: [
          { text: analysisPromptText },
          { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 4096, // maxOutputTokens: 2048 // maxOutputTokens: 1200
      ...thinkingConf
    }
  };

  const analysisPayload = payload;
  let usedEndpoint = selectedModel;

  try {
    const analysisPromise = executeSingleGeminiStream(apiKey, endpointsToTry, analysisPayload, (partText, ep) => {
      usedEndpoint = ep;
      if (event && event.sender && !event.sender.isDestroyed()) {
        event.sender.send('gemini-stream-chunk', {
          chunk: partText,
          type: 'analysis',
          endpointUsed: ep
        });
      }
    });

    const ocrPayload = {
      contents: [
        {
          parts: [
            { text: ocrPromptText },
            { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    const ocrPromise = executeSingleGeminiStream(apiKey, endpointsToTry, ocrPayload, (partText, ep) => {
      if (event && event.sender && !event.sender.isDestroyed()) {
        event.sender.send('gemini-stream-chunk', {
          chunk: partText,
          type: 'ocr',
          endpointUsed: ep
        });
      }
    }).catch(e => {
      console.warn('[Parallel OCR Stream]', e?.message || e);
      return { fullText: '' };
    });

    const settled = await Promise.allSettled([analysisPromise, ocrPromise]);
    const streamRes = settled[0].status === 'fulfilled' ? settled[0].value : { fullText: '' };
    const ocrRes = settled[1].status === 'fulfilled' ? settled[1].value : { fullText: '' };

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    const fullText = streamRes.fullText || '';

    let ocrText = ocrRes.fullText || '';
    if (!ocrText) {
      const ocrMatch = fullText.match(/###?\s*\[?(?:OCR|TEXT|ถอดข้อความ|ข้อความในภาพ|ถอดอักษร)\]?[\r\n]+([\s\S]*?)(?:###?\s*\[?(?:EXPLAIN|SUMMARY|TRANSLATE|ANSWER)|$)/i);
      if (ocrMatch && ocrMatch[1]) {
        ocrText = ocrMatch[1].trim();
      }
    }

    const result = {
      success: true,
      fullText,
      ocrText,
      durationSec,
      endpointUsed: usedEndpoint
    };
    if (croppedDataUrl) {
      result.croppedDataUrl = croppedDataUrl;
    }

    if (event && event.sender && !event.sender.isDestroyed()) {
      event.sender.send('gemini-stream-finish', result);
    }

    return result;
  } catch (lastError) {
    if (event && event.sender && !event.sender.isDestroyed()) {
      event.sender.send('gemini-stream-error', {
        error: lastError?.message || 'ไม่สามารถสตรีมข้อมูลจาก Gemini API ได้'
      });
    }
    throw (lastError || new Error('ไม่สามารถเชื่อมต่อ Gemini Stream API ได้'));
  }
}

// Secure Main Process Gemini Vision Streaming API Handler
ipcMain.handle('gemini-analyze-screen-stream', async (event, { base64Image, modelId }) => {
  return await executeScreenStreamAnalysis({
    base64Data: base64Image,
    modelId,
    event
  });
});

// Unified Zero-Bounce IPC: Crops screen in RAM and immediately streams Gemini API without bounce
ipcMain.handle('crop-and-analyze-screen-stream', async (event, { rect, modelId }) => {
  const croppedDataUrl = await cropAreaDirect(rect);
  if (!croppedDataUrl) {
    throw new Error('ไม่สามารถตัดภาพหน้าจอได้');
  }
  return await executeScreenStreamAnalysis({
    base64Data: croppedDataUrl,
    modelId,
    event,
    croppedDataUrl
  });
});

// On-Demand Category Generation (for lazy loading tabs like OCR or in-depth Explain)
ipcMain.handle('gemini-fetch-category', async (event, { base64Data, category, modelId, contextAnswer }) => {
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const keyErr = validateApiKeyFormat(apiKey);
  if (keyErr) throw keyErr;
  const selectedModel = modelId || (currentConfig && currentConfig.defaultModel) || 'gemini-3-flash-preview';
  const endpointsToTry = getCandidateEndpoints(selectedModel);

  let promptText = '';
  if (category === 'ocr') {
    promptText = 'ถอดข้อความตัวอักษรทุกคำ ทุกภาษาที่ปรากฏในภาพนี้ 100% ตามต้นฉบับอย่างเป็นข้อมูลดิบ (Raw Data) คงการขึ้นบรรทัดใหม่ ย่อหน้า และตาราง Markdown ให้ตรงกับภาพ ห้ามแปล ห้ามสรุป ห้ามข้ามคำ';
  } else if (category === 'explain') {
    promptText = `อธิบายรายละเอียด หลักการ และความเป็นมาของเนื้อหาในภาพนี้อย่างละเอียด ชัดเจน สละสลวย เข้าใจง่าย:\n${contextAnswer ? `คำตอบหลัก: ${contextAnswer}` : ''}`;
  } else if (category === 'translate') {
    promptText = 'แปลข้อความภาษาต่างประเทศทั้งหมดในภาพนี้เป็นภาษาไทยอย่างสละสลวย ครบถ้วนทุกประโยคและย่อหน้า 100% คงรูปแบบเดิม';
  } else {
    promptText = `วิเคราะห์เนื้อหาในส่วน ${category} จากภาพนี้อย่างกระชับ`;
  }

  const cleanBase64 = base64Data ? base64Data.replace(/^data:image\/\w+;base64,/, '') : '';
  const parts = [{ text: promptText }];
  if (cleanBase64) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 4096,
      thinkingConfig: (selectedModel && selectedModel.includes('flash-lite')) ? undefined : { thinkingBudget: 0 }
    }
  };

  const res = await executeSingleGeminiStream(apiKey, endpointsToTry, payload, (chunk) => {
    if (event && event.sender && !event.sender.isDestroyed()) {
      event.sender.send('gemini-stream-chunk', { chunk, type: category, category });
    }
  });

  return { success: true, text: res.fullText || '' };
});

// Secure Main Process Gemini Follow-up Chat API Handler (Multi-turn Context Aware)
ipcMain.handle('gemini-chat-message', async (event, { query, modelId, context, history }) => {
  const contents = [];

  // 1. Initial scan result context (anchored as first user turn + model acknowledge)
  if (context) {
    let contextStr = '';
    if (typeof context === 'object') {
      const parts = [];
      if (context.answer) parts.push(`คำตอบหลัก: ${context.answer}`);
      if (context.ocr) parts.push(`ข้อความในภาพ: ${context.ocr}`);
      if (context.explain) parts.push(`คำอธิบาย: ${context.explain}`);
      if (context.summary) parts.push(`สรุป: ${context.summary}`);
      contextStr = parts.join('\n\n') || JSON.stringify(context, (k, v) => (k === 'thumbnail' ? undefined : v));
    } else {
      contextStr = String(context);
    }

    if (contextStr.trim()) {
      contents.push({
        role: 'user',
        parts: [{ text: `บริบทและผลการวิเคราะห์ภาพหน้าจอเดิม:\n${contextStr}\n\nเราจะเริ่มคุยต่อเนื่องเกี่ยวกับภาพนี้` }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'รับทราบข้อมูลผลการวิเคราะห์ภาพหน้าจอเดิมแล้วครับ พร้อมตอบคำถามต่อเนื่องเกี่ยวกับภาพนี้ครับ' }]
      });
    }
  }

  // 2. Add full multi-turn conversation history
  const TURBO_TEXT_SUFFIX = '\n\n(ตอบตรงประเด็น สั้น กระชับ ชัดเจน แม่นยำ 100% ไม่อารัมภบท ไม่ทักทาย สูตรคณิตศาสตร์ใช้ LaTeX $...$ โค้ดใช้ Code block)';
  if (Array.isArray(history) && history.length > 0) {
    history.forEach((msg, idx) => {
      let text = (msg.text || '').trim();
      if (!text) return;
      const isLast = (idx === history.length - 1);
      if (isLast && msg.role === 'user') {
        text += TURBO_TEXT_SUFFIX;
      }
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text }]
      });
    });
  } else if (query) {
    contents.push({
      role: 'user',
      parts: [{ text: `${query}${TURBO_TEXT_SUFFIX}` }]
    });
  }

  // Fallback if contents is empty
  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: query || 'สวัสดี' }]
    });
  }

  // Ensure strict alternation of roles for Gemini API (merge adjacent turns of same role)
  const sanitizedContents = [];
  for (const c of contents) {
    if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === c.role) {
      sanitizedContents[sanitizedContents.length - 1].parts[0].text += '\n\n' + c.parts[0].text;
    } else {
      sanitizedContents.push({ role: c.role, parts: [{ text: c.parts[0].text }] });
    }
  }

  const thinkingConf = getThinkingConfigForModel(modelId);
  const requestBody = {
    contents: sanitizedContents,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 1024,
      ...thinkingConf
    }
  };

  const startTime = Date.now();
  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const toolsOptions = (currentConfig && currentConfig.tools) || DEFAULT_CONFIG.tools;
  const isAnyToolEnabled = toolsOptions.enableGoogleSearch ||
                           toolsOptions.enableCodeExecution ||
                           toolsOptions.enableUrlContext ||
                           toolsOptions.enableGoogleMaps ||
                           (toolsOptions.enableFileSearch && toolsOptions.fileSearchStoreNames?.length > 0) ||
                           toolsOptions.enableFunctionCalling;

  // Ultra-Fast Filter: Only run heavy tools/interactions if user query explicitly seeks external/live data
  const hasSearchIntent = /(\b(?:ค้นหา|เสิร์ช|google|search|สภาพอากาศ|พยากรณ์|ข่าว|เช็คราคา|ตารางบิน|ราคาหุ้น|แมป|แผนที่|พิกัด|https?:\/\/)\b)/i.test(query || '');
  const shouldRunToolInteraction = isAnyToolEnabled && apiKey && (
    hasSearchIntent ||
    toolsOptions.enableFunctionCalling ||
    (toolsOptions.enableFileSearch && toolsOptions.fileSearchStoreNames?.length > 0)
  );

  // Try executing with @google/genai Interactions API if explicit tool intent detected
  if (shouldRunToolInteraction) {
    try {
      const interactionInput = query || (sanitizedContents.length > 0 ? sanitizedContents[sanitizedContents.length - 1].parts[0].text : 'วิเคราะห์ข้อมูล');
      const interactionResult = await geminiTools.runGeminiInteraction({
        apiKey,
        modelId,
        input: interactionInput,
        toolsOptions
      });

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      return {
        replyText: interactionResult.outputText || 'ประมวลผลคำขอเรียบร้อยแล้ว',
        durationSec,
        endpointUsed: modelId,
        toolsData: {
          searchCalls: interactionResult.searchCalls,
          searchResults: interactionResult.searchResults,
          codeCalls: interactionResult.codeCalls,
          codeResults: interactionResult.codeResults,
          urlContextResults: interactionResult.urlContextResults,
          functionCalls: interactionResult.functionCalls,
          functionResults: interactionResult.functionResults,
          citations: interactionResult.citations
        }
      };
    } catch (toolErr) {
      console.warn('[Gemini Tools Notice] Interaction tool fallback to standard API:', toolErr.message);
    }
  }

  // Standard fallback route (with REST tools only if explicit search intent detected)
  if (isAnyToolEnabled && hasSearchIntent) {
    const restTools = [];
    if (toolsOptions.enableGoogleSearch) restTools.push({ googleSearch: {} });
    if (toolsOptions.enableCodeExecution) restTools.push({ codeExecution: {} });
    if (restTools.length > 0) {
      requestBody.tools = restTools;
    }
  }

  const result = await callGeminiApiWithFallback(requestBody, modelId);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  const candidate = result.data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text || 'ไม่พบคำตอบจาก AI';

  return {
    replyText,
    durationSec,
    endpointUsed: result.endpointUsed
  };
});

// File Operation Handlers
ipcMain.handle('save-text-file', async (event, { content, defaultFilename }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'บันทึกไฟล์ข้อความ',
    defaultPath: defaultFilename || 'ai-response.md',
    filters: [
      { name: 'Markdown File', extensions: ['md'] },
      { name: 'Text File', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!canceled && filePath) {
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true, filePath };
  }
  return { success: false };
});

ipcMain.handle('save-image-file', async (event, { dataUrl, defaultFilename }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'บันทึกไฟล์รูปภาพ',
    defaultPath: defaultFilename || 'captured-screen.png',
    filters: [
      { name: 'PNG Image', extensions: ['png'] },
      { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }
    ]
  });

  if (!canceled && filePath) {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    return { success: true, filePath };
  }
  return { success: false };
});

// --- QUICK TEXT ASK & CUSTOM PROMPTS IPC HANDLERS ---
// QUICK_TEXT_SYSTEM_INSTRUCTION: Maintain Layout and use Markdown bullet points
// ข้อกำหนดภาษา: ใช้ภาษาไทยและภาษาอังกฤษที่ถูกต้องตามหลักภาษาเท่านั้น
const CATEGORY_SYSTEM_INSTRUCTIONS = {
  answer: "หน้าที่ของคุณคือ: ให้คำตอบอย่างถูกต้อง ชัดเจน สั้นกระชับ ตรงประเด็นทันที ไม่ตอบเยิ่นเย้อ ไม่แต่งเติมเนื้อหาที่ไม่จำเป็น เริ่มต้นที่คำตอบทันที ไม่อารัมภบท ไม่ทักทาย หากมีสูตรคณิตศาสตร์ใช้ LaTeX $...$ หากมีโค้ดใช้ Code block ใช้ภาษาไทยและอังกฤษที่ถูกต้องเท่านั้น",

  explain: "หน้าที่ของคุณคือ: อธิบายเนื้อหาเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> อย่างชัดเจน ลึกซึ้ง เข้าใจง่าย 2-4 บรรทัด หรือเป็นข้อๆ ชัดเจน เริ่มต้นคำอธิบายทันที ไม่อารัมภบท ไม่ทักทาย",

  summarize: "หน้าที่ของคุณคือ: สรุปประเด็นสำคัญของข้อความเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> เป็น bullet points สั้นกระชับ ชัดเจนตามเนื้อหาต้นฉบับเท่านั้น ห้ามแต่งเติม ห้ามตอบคำถามหรือแก้โจทย์ เริ่มต้นสรุปทันที ไม่อารัมภบท ไม่ทักทาย",

  translate_th: "หน้าที่ของคุณคือ: แปลข้อความเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> เป็นภาษาไทยตามข้อความต้นฉบับอย่างตรงไปตรงมาและเคร่งครัดประโยคต่อประโยค Literal & Verbatim Translation แปลตรงตัวตามเนื้อหาต้นฉบับ 100% แสดงเฉพาะคำแปลภาษาไทยล้วนๆ ห้ามแต่งเติม ห้ามขยายความ ห้ามอธิบายเพิ่มเติม ห้ามอธิบายคำศัพท์หรือไวยากรณ์ ห้ามเพิ่มหมายเหตุ ห้ามแต่งเติมหัวข้อใหม่ ห้ามเติม 'ชื่อแอปพลิเคชัน:', 'การทำงานหลัก:', 'ประโยชน์:' ห้ามมีข้อความภาษาอังกฤษก่อนหน้าคำแปลเด็ดขาด ห้ามแยกหัวข้อเอง ห้ามสร้างหัวข้อย่อย ห้ามใส่ Markdown bullet points (- ...) หรือจุดรายการเองโดยเด็ดขาดหากต้นฉบับเป็นข้อความธรรมดาหรือย่อหน้าปกติ ไม่ต้องแยกหัวข้อ ไม่ต้องใส่หัวข้อย่อย ไม่ต้องใส่ bullet points ห้ามตอบคำถามแม้ข้อความเป็นคำถาม เริ่มต้นแสดงคำแปลภาษาไทยทันทีโดยไม่มีคำนำหน้า ไม่อารัมภบท ไม่ทักทาย ข้อกำหนดภาษา: ใช้ภาษาไทยและภาษาอังกฤษที่ถูกต้องตามหลักภาษาเท่านั้น",

  proofread: "หน้าที่ของคุณคือ: ตรวจแก้คำผิดและขัดเกลาไวยากรณ์ข้อความเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> ให้ถูกต้อง แสดงข้อความฉบับแก้ไขทันที และสรุปจุดแก้ไขสั้นๆ เริ่มต้นทันที ไม่อารัมภบท ไม่ทักทาย",

  shorten: "หน้าที่ของคุณคือ: ย่อข้อความเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> ให้สั้นกระชับที่สุดโดยคงสาระสำคัญครบถ้วน แสดงผลลัพธ์ทันที ไม่อารัมภบท ไม่ทักทาย",

  ocr: "หน้าที่ของคุณคือ: ถอดและคัดลอกข้อความเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> แบบ 100% ตัวต่อตัวอักษรตามต้นฉบับ ห้ามแปล ห้ามสรุป ห้ามแต่งเติม หากมีโค้ดให้ใส่ Code block ไม่อารัมภบท ไม่ทักทาย",

  continue_writing: "หน้าที่ของคุณคือ: ทำหน้าที่เป็น Text Continuation Engine (Auto-complete) เท่านั้น\nกฎเหล็กสำคัญ:\n1. ห้ามตอบคำถามเด็ดขาด ห้ามแก้ปัญหา ห้ามตอบรับ ห้ามพิมพ์คำว่า 'คำตอบคือ', 'ตอบ:', 'ได้ครับ', 'ได้ค่ะ', 'สามารถทำได้'\n2. หากข้อความเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> เป็นคำถามหรือมีคำว่า 'ช่วยตอบก่อน' จงเขียนต่อในมุมมองของผู้ถาม เช่น ขยายความคำถาม อธิบายปัญหา หรือระบุบริบทการทำงานเพิ่มเติม ห้ามสวมบทบาทเป็นผู้ตอบคำถามเด็ดขาด\n3. เริ่มต้นพิมพ์ข้อความส่วนต่อขยายเนื้อหาทันทีโดยไม่มีคำนำหน้า",

  define: "หน้าที่ของคุณคือ: อธิบายความหมาย หลักการ หรือความเป็นมาของหัวข้อเป้าหมายใน <<<TARGET_TEXT_START>>> ถึง <<<TARGET_TEXT_END>>> อย่างชัดเจน สั้นกระชับ ตรงประเด็นทันที ไม่อารัมภบท ไม่ทักทาย",

  custom_ask: "หน้าที่ของคุณคือ: ตอบคำถามหรือปฏิบัติตามคำสั่งอย่างถูกต้อง ตรงประเด็น สั้นกระชับ ชัดเจนทันที ไม่อารัมภบท ไม่ทักทาย หากมีสูตรคณิตศาสตร์ใช้ LaTeX $...$ หากมีโค้ดใช้ Code block"
};

// Auxiliary capability definition: id: 'ocr'

const CATEGORY_MAX_OUTPUT_TOKENS = {
  shorten: 512, // shorten: 1024
  define: 512,
  translate_th: 768,
  summarize: 2048,
  answer: 4096,
  ocr: 4096,
  proofread: 2048,
  explain: 4096,
  continue_writing: 4096,
  custom_ask: 4096
};

function resolveQuickTextCategory(promptId, promptText) {
  if (promptId && CATEGORY_SYSTEM_INSTRUCTIONS[promptId]) return promptId;
  if (!promptText || typeof promptText !== 'string') return 'answer';
  if (promptText.startsWith('ตอบคำถาม') || promptText.startsWith('แก้โจทย์')) return 'answer';
  if (promptText.startsWith('อธิบาย')) {
    if (promptText.includes('คืออะไร')) return 'define';
    return 'explain';
  }
  if (promptText.startsWith('สรุป')) return 'summarize';
  if (promptText.startsWith('แปล')) return 'translate_th';
  if (promptText.startsWith('ตรวจคำผิด') || promptText.startsWith('ปรับปรุง')) return 'proofread';
  if (promptText.startsWith('ย่อ')) return 'shorten';
  if (promptText.startsWith('คัดลอกและถอด') || promptText.startsWith('ถอด')) return 'ocr';
  if (promptText.startsWith('เขียนเนื้อหาต่อ') || promptText.startsWith('เขียนต่อ') || promptText.includes('พิมพ์เนื้อหาต่อ')) return 'continue_writing';
  return 'custom_ask';
}

function getQuickTextSystemInstruction(categoryId, promptText) {
  const cat = resolveQuickTextCategory(categoryId, promptText);
  return CATEGORY_SYSTEM_INSTRUCTIONS[cat] || CATEGORY_SYSTEM_INSTRUCTIONS.custom_ask;
}

ipcMain.handle('get-text-prompts', () => {
  if (!currentConfig) loadConfig();
  return currentConfig.textPrompts || DEFAULT_TEXT_PROMPTS;
});

ipcMain.handle('save-text-prompts', (event, prompts) => {
  if (Array.isArray(prompts)) {
    if (!currentConfig) loadConfig();
    currentConfig.textPrompts = prompts;
    saveConfig(currentConfig, 'บันทึกคำสั่งถาม AI เรียบร้อยแล้ว');
  }
  return currentConfig.textPrompts;
});

ipcMain.on('close-quick-text', () => {
  closeQuickTextMode();
});

ipcMain.on('set-toolbar-focusable', (event, flag) => {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    const focusable = Boolean(flag);
    try {
      toolbarWindow.setFocusable(focusable);
      if (focusable) {
        toolbarWindow.focus();
      }
    } catch (e) {}
  }
});

ipcMain.on('resize-toolbar-window', (event, bounds) => {
  if (toolbarWindow && !toolbarWindow.isDestroyed() && bounds) {
    try {
      const cur = toolbarWindow.getBounds();
      let newWidth = bounds.width || cur.width;
      let newHeight = bounds.height || cur.height;
      if (newHeight === 46 || newHeight === 52) {
        newHeight = 58; // Signature compat: newHeight = 52;
      }
      if (newWidth === 920 || newWidth === 940) {
        newWidth = 1060; // Signature compat: newWidth = 940;
      }
      const activeDisplay = screen.getDisplayNearestPoint({ x: cur.x, y: cur.y });
      const wa = activeDisplay.workArea;

      let newY = cur.y;
      if (newY + newHeight > wa.y + wa.height) {
        newY = Math.max(wa.y + 10, wa.y + wa.height - newHeight - 10);
      }

      toolbarWindow.setBounds({
        x: cur.x,
        y: newY,
        width: newWidth,
        height: newHeight
      });
      toolbarWindow.setSize(newWidth, newHeight);

      if (newHeight >= 200) {
        isAnswerCardActive = true;
      } else if (newHeight <= 60) {
        isAnswerCardActive = false;
      }

      if (nativeBridge && nativeBridge.isDllAvailable()) {
        nativeBridge.setToolbarActiveState(1, cur.x, newY, newWidth, newHeight);
      }

      enforceTopmostWin32(toolbarWindow);
    } catch (e) {}
  }
});

ipcMain.on('set-toolbar-answer-active', (event, active) => {
  isAnswerCardActive = Boolean(active);
});

ipcMain.on('move-toolbar-by', (event, { deltaX, deltaY }) => {
  if (toolbarWindow && !toolbarWindow.isDestroyed() && (deltaX || deltaY)) {
    try {
      const cur = toolbarWindow.getBounds();
      const nextX = Math.round(cur.x + (deltaX || 0));
      const nextY = Math.round(cur.y + (deltaY || 0));
      toolbarWindow.setPosition(nextX, nextY);
      enforceTopmostWin32(toolbarWindow);
      if (nativeBridge && nativeBridge.isDllAvailable()) {
        nativeBridge.setToolbarActiveState(1, nextX, nextY, cur.width, cur.height);
      }
    } catch (e) {}
  }
});

ipcMain.handle('get-clipboard-text', () => {
  try {
    return getActiveToolbarCapturedText() || '';
  } catch (e) {
    return '';
  }
});

ipcMain.handle('trigger-copy-and-get-text', async () => {
  try {
    return await triggerCopyAndGetText();
  } catch (e) {
    console.error('Error in trigger-copy-and-get-text IPC:', e);
    return '';
  }
});

function sanitizeAndOptimizeInputText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let clean = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  clean = clean.replace(/\n{3,}/g, '\n\n');
  clean = clean.replace(/[ \t]+$/gm, '');
  return clean.trim();
}

ipcMain.handle('gemini-quick-text-ask', async (event, { promptText, modelId, promptId, categoryName, imageBase64, sourceType }) => {
  // Restore original clipboard when user starts sending prompt to AI
  try {
    restoreActiveClipboard();
  } catch (e) {}

  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const keyErr = validateApiKeyFormat(apiKey);
  if (keyErr) throw keyErr;

  const selectedModel = modelId || (currentConfig && currentConfig.defaultModel) || 'gemini-3.8-flash';
  const endpointsToTry = getCandidateEndpoints(selectedModel);
  const startTime = Date.now();

  const optimizedPrompt = sanitizeAndOptimizeInputText(promptText);
  const resolvedCategory = resolveQuickTextCategory(promptId, promptText);

  // Always perform fresh AI dispatch (no cached stale bypass)
  const isPro = selectedModel && (selectedModel.includes('pro') || selectedModel.includes('thinking'));
  const isFlashLite = selectedModel && selectedModel.includes('flash-lite');
  let thinkingConf = {};
  if (isPro) {
    thinkingConf = getThinkingConfigForModel(selectedModel);
  } else if (!isFlashLite) {
    thinkingConf = { thinkingConfig: { thinkingBudget: 0 } };
  }

  const systemInstructionText = CATEGORY_SYSTEM_INSTRUCTIONS[resolvedCategory] || CATEGORY_SYSTEM_INSTRUCTIONS.custom_ask;
  const maxTokens = CATEGORY_MAX_OUTPUT_TOKENS[resolvedCategory] || 768;

  const userParts = [];
  const imageToUse = imageBase64 || lastCapturedScreenImage;
  if (imageToUse) {
    const cleanBase64 = imageToUse.replace(/^data:image\/\w+;base64,/, '');
    userParts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: cleanBase64
      }
    });
  }
  if (optimizedPrompt) {
    userParts.push({ text: optimizedPrompt });
  } else if (userParts.length === 0) {
    userParts.push({ text: 'วิเคราะห์และให้คำตอบจากภาพนี้' });
  }

  const requestPayload = {
    system_instruction: {
      parts: [
        { text: systemInstructionText }
      ]
    },
    contents: [
      {
        role: 'user',
        parts: userParts
      }
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: maxTokens,
      ...getThinkingConfigForModel(selectedModel)
    }
  };

  let usedEndpoint = selectedModel;

  try {
    const streamRes = await executeSingleGeminiStream(apiKey, endpointsToTry, requestPayload, (chunk, ep) => {
      usedEndpoint = ep;
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('quick-answer-chunk', {
          chunk,
          endpointUsed: ep
        });
      }
    });

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    const fullText = streamRes.fullText || '';

    // Cache successful response in memory
    quickResponseCache.set(selectedModel, resolvedCategory, optimizedPrompt, fullText, usedEndpoint);

    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('quick-answer-finish', {
        fullText,
        durationSec,
        endpointUsed: usedEndpoint
      });
    }

    return {
      success: true,
      fullText,
      durationSec,
      endpointUsed: usedEndpoint
    };
  } catch (err) {
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('quick-answer-error', {
        error: err.message || 'เกิดข้อผิดพลาดในการประมวลผลคำตอบ'
      });
    }
    throw err;
  }
});

// IPC Handler: Prepare parameters for Direct Renderer Streaming and check LRU Cache
ipcMain.handle('get-quick-stream-params', async (event, { promptText, promptId, categoryName, modelId, imageBase64 }) => {
  try {
    restoreActiveClipboard();
  } catch (e) {}

  const apiKey = (currentConfig && currentConfig.apiKey) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const keyErr = validateApiKeyFormat(apiKey);
  if (keyErr) throw keyErr;

  const selectedModel = modelId || (currentConfig && currentConfig.defaultModel) || 'gemini-3.8-flash';
  const endpointsToTry = getCandidateEndpoints(selectedModel);
  const optimizedPrompt = sanitizeAndOptimizeInputText(promptText);
  const resolvedCategory = resolveQuickTextCategory(promptId, promptText);

  const isPro = selectedModel && (selectedModel.includes('pro') || selectedModel.includes('thinking'));
  const isFlashLite = selectedModel && selectedModel.includes('flash-lite');
  let thinkingConf = {};
  if (isPro) {
    thinkingConf = getThinkingConfigForModel(selectedModel);
  } else if (!isFlashLite) {
    thinkingConf = { thinkingConfig: { thinkingBudget: 0 } };
  }

  const systemInstructionText = CATEGORY_SYSTEM_INSTRUCTIONS[resolvedCategory] || CATEGORY_SYSTEM_INSTRUCTIONS.custom_ask;
  const maxTokens = CATEGORY_MAX_OUTPUT_TOKENS[resolvedCategory] || 768;

  const userParts = [];
  const imageToUse = imageBase64 || lastCapturedScreenImage;
  if (imageToUse) {
    const cleanBase64 = imageToUse.replace(/^data:image\/\w+;base64,/, '');
    userParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64
      }
    });
  }
  if (optimizedPrompt) {
    userParts.push({ text: optimizedPrompt });
  } else if (userParts.length === 0) {
    userParts.push({ text: 'วิเคราะห์และให้คำตอบจากภาพนี้' });
  }

  const requestPayload = {
    system_instruction: {
      parts: [
        { text: systemInstructionText }
      ]
    },
    contents: [
      {
        role: 'user',
        parts: userParts
      }
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: maxTokens,
      ...getThinkingConfigForModel(selectedModel)
    }
  };

  return {
    cached: false,
    apiKey,
    endpointsToTry,
    selectedModel,
    resolvedCategory,
    optimizedPrompt,
    requestPayload
  };
});

// IPC Handler: Save Direct Renderer Stream result to In-Memory LRU Cache
ipcMain.handle('save-quick-response-cache', (event, { modelId, categoryName, promptText, fullText, endpointUsed }) => {
  try {
    quickResponseCache.set(modelId, categoryName, promptText, fullText, endpointUsed);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

module.exports = {
  sanitizeRogueForeignScripts,
  calculateSmartToolbarPosition,
  startScreenAreaToolbarMode,
  startNativeSnippingMode,
  resolveQuickTextCategory,
  CATEGORY_SYSTEM_INSTRUCTIONS,
  DEFAULT_TEXT_PROMPTS,
  getCandidateEndpoints,
  executeSingleGeminiStream
};


