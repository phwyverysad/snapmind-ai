const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings & Storage
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),

  // History Storage
  getHistory: () => ipcRenderer.invoke('get-history'),
  saveHistoryItem: (item) => ipcRenderer.invoke('save-history-item', item),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Application Control
  triggerScan: () => ipcRenderer.send('trigger-scan'),
  cancelSnipping: () => ipcRenderer.send('cancel-snipping'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  hideWindow: () => ipcRenderer.send('hide-window'),
  showWindow: () => ipcRenderer.send('show-window'),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),

  // Screen Snipping & Capture
  cropArea: (bounds) => ipcRenderer.invoke('crop-area', bounds),
  getDisplayBounds: () => ipcRenderer.invoke('get-display-bounds'),
  getFreezeScreenFrames: () => ipcRenderer.invoke('get-freeze-screen-frames'),
  onFreezeScreenSnapshot: (callback) => {
    ipcRenderer.removeAllListeners('freeze-screen-snapshot');
    ipcRenderer.on('freeze-screen-snapshot', (event, frames) => callback(frames));
  },

  // Gemini AI Processing (Secure Main Process IPC)
  analyzeScreen: (base64Image, modelId) => ipcRenderer.invoke('gemini-analyze-screen', { base64Image, modelId }),
  analyzeScreenStream: (base64Image, modelId) => ipcRenderer.invoke('gemini-analyze-screen-stream', { base64Image, modelId }),
  sendChatMessage: (query, modelId, context, history) => ipcRenderer.invoke('gemini-chat-message', { query, modelId, context, history }),

  // Gemini Tools (@google/genai SDK & Interactions API)
  getToolsConfig: () => ipcRenderer.invoke('gemini-get-tools-config'),
  updateToolsConfig: (config) => ipcRenderer.invoke('gemini-update-tools-config', config),
  runToolInteraction: (params) => ipcRenderer.invoke('gemini-tools-run-interaction', params),
  executeToolFunction: (name, args) => ipcRenderer.invoke('gemini-tools-execute-function', { name, args }),
  createFileSearchStore: (params) => ipcRenderer.invoke('gemini-file-search-create-store', params),
  uploadFileSearchStore: (params) => ipcRenderer.invoke('gemini-file-search-upload-file', params),
  listFileSearchStores: () => ipcRenderer.invoke('gemini-file-search-list-stores'),
  deleteFileSearchStore: (storeName, force) => ipcRenderer.invoke('gemini-file-search-delete-store', { storeName, force }),

  // Streaming Event Listeners
  onStreamChunk: (callback) => {
    ipcRenderer.removeAllListeners('gemini-stream-chunk');
    ipcRenderer.on('gemini-stream-chunk', (event, data) => callback(data));
  },
  onStreamFinish: (callback) => {
    ipcRenderer.removeAllListeners('gemini-stream-finish');
    ipcRenderer.on('gemini-stream-finish', (event, data) => callback(data));
  },
  onStreamError: (callback) => {
    ipcRenderer.removeAllListeners('gemini-stream-error');
    ipcRenderer.on('gemini-stream-error', (event, data) => callback(data));
  },
  removeStreamListeners: () => {
    ipcRenderer.removeAllListeners('gemini-stream-chunk');
    ipcRenderer.removeAllListeners('gemini-stream-finish');
    ipcRenderer.removeAllListeners('gemini-stream-error');
  },

  // File Operations
  saveTextFile: (content, defaultFilename) => ipcRenderer.invoke('save-text-file', { content, defaultFilename }),
  saveImageFile: (dataUrl, defaultFilename) => ipcRenderer.invoke('save-image-file', { dataUrl, defaultFilename }),

  // Event Listeners
  onStartSnipping: (callback) => ipcRenderer.on('start-snipping', () => callback()),
  onCancelSnipping: (callback) => ipcRenderer.on('cancel-snipping-ui', () => callback()),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings-ui', () => callback()),
  onOpenHistory: (callback) => ipcRenderer.on('open-history-ui', () => callback()),
  onModelChangedFromTray: (callback) => ipcRenderer.on('model-changed-from-tray', (event, modelId) => callback(modelId)),

  // Quick Text Ask (Floating Toolbar) & Custom Prompts
  getTextPrompts: () => ipcRenderer.invoke('get-text-prompts'),
  saveTextPrompts: (prompts) => ipcRenderer.invoke('save-text-prompts', prompts),
  closeQuickText: () => ipcRenderer.send('close-quick-text'),
  quickTextAsk: (params) => ipcRenderer.invoke('gemini-quick-text-ask', params),
  getQuickStreamParams: (params) => ipcRenderer.invoke('get-quick-stream-params', params),
  saveQuickResponseCache: (params) => ipcRenderer.invoke('save-quick-response-cache', params),
  onOpenQuickTextToolbar: (callback) => ipcRenderer.on('open-quick-text-toolbar', (event, data) => callback(data)),
  onCloseQuickTextUI: (callback) => ipcRenderer.on('close-quick-text-ui', () => callback()),
  onQuickAnswerChunk: (callback) => {
    ipcRenderer.removeAllListeners('quick-answer-chunk');
    ipcRenderer.on('quick-answer-chunk', (event, data) => callback(data));
  },
  onQuickAnswerFinish: (callback) => {
    ipcRenderer.removeAllListeners('quick-answer-finish');
    ipcRenderer.on('quick-answer-finish', (event, data) => callback(data));
  },
  onQuickAnswerError: (callback) => {
    ipcRenderer.removeAllListeners('quick-answer-error');
    ipcRenderer.on('quick-answer-error', (event, data) => callback(data));
  },
  removeQuickAnswerListeners: () => {
    ipcRenderer.removeAllListeners('quick-answer-chunk');
    ipcRenderer.removeAllListeners('quick-answer-finish');
    ipcRenderer.removeAllListeners('quick-answer-error');
  },
  setToolbarFocusable: (flag) => ipcRenderer.send('set-toolbar-focusable', flag),
  resizeToolbarWindow: (bounds) => ipcRenderer.send('resize-toolbar-window', bounds),
  moveToolbarBy: (delta) => ipcRenderer.send('move-toolbar-by', delta),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  writeClipboardText: (text) => ipcRenderer.invoke('write-clipboard-text', text),
  copyAndGetSelectedText: () => ipcRenderer.invoke('trigger-copy-and-get-text'),
  onQuickDigitPressed: (callback) => {
    ipcRenderer.removeAllListeners('quick-text-number-pressed');
    ipcRenderer.on('quick-text-number-pressed', (event, index) => callback(index));
  },
  onQuickTextNumberPressed: (callback) => {
    ipcRenderer.removeAllListeners('quick-text-number-pressed');
    ipcRenderer.on('quick-text-number-pressed', (event, index) => callback(index));
  },
  onQuickTextCustomToggle: (callback) => {
    ipcRenderer.removeAllListeners('quick-text-custom-toggle');
    ipcRenderer.on('quick-text-custom-toggle', () => callback());
  },
  setToolbarAnswerActive: (active) => ipcRenderer.send('set-toolbar-answer-active', active),
  onQuickTextCapturedUpdate: (callback) => {
    ipcRenderer.removeAllListeners('quick-text-captured-update');
    ipcRenderer.on('quick-text-captured-update', (event, data) => callback(data));
  }
});

