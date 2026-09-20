// === NATIVE WIN32 IN-PROCESS DLL BRIDGE (nativeBridge.js) ===
// Eliminates separate helper .exe processes by loading GeminiTextCopy.dll directly via Koffi FFI.
// Provides in-process Win32 text copying, topmost enforcement, modifier key release, outside-click detection,
// and hardware low-level keyboard/mouse hooks (WH_KEYBOARD_LL + WH_MOUSE_LL + RegisterHotKey + GetAsyncKeyState).

const path = require('path');
const fs = require('fs');

let koffi = null;
let nativeLib = null;
let fnAutoCopySelectedTextUtf8 = null;
let fnMakeWindowTopmost = null;
let fnReleaseModifierKeys = null;
let fnIsMouseClickedOutside = null;
let fnSetAppProcessIds = null;
let fnStartNativeKeyboardHook = null;
let fnStopNativeKeyboardHook = null;
let fnUpdateHotkeyCombos = null;
let fnSetToolbarActiveState = null;
let fnPollHotkeyEvent = null;
let fnIsNativeHookRunning = null;
let fnSimulateHotkeyTrigger = null;
let isLoaded = false;

let hookPollTimer = null;
const hookListeners = {
  onSnip: null,
  onQuickText: null,
  onClickOutside: null
};

function initNativeBridge() {
  if (isLoaded) return true;

  try {
    koffi = require('koffi');
  } catch (e) {
    console.warn('[NativeBridge] Koffi not available, falling back to pure Node/Electron');
    return false;
  }

  const candidatePaths = [
    path.join(__dirname, 'GeminiTextCopy.dll'),
    process.resourcesPath ? path.join(process.resourcesPath, 'GeminiTextCopy.dll') : null,
    path.join(__dirname, 'hotkey_hook.dll'),
    process.resourcesPath ? path.join(process.resourcesPath, 'hotkey_hook.dll') : null
  ].filter(Boolean);

  let targetDll = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      targetDll = p;
      break;
    }
  }

  if (!targetDll) {
    console.warn('[NativeBridge] No native DLL found at candidates:', candidatePaths);
    return false;
  }

  try {
    nativeLib = koffi.load(targetDll);
    fnAutoCopySelectedTextUtf8 = nativeLib.func('int __stdcall AutoCopySelectedTextUtf8(_Out_ uint8_t *outBuffer, int maxBytes, uint32_t callerPid, void *targetHwnd)');
    fnMakeWindowTopmost = nativeLib.func('void __stdcall MakeWindowTopmost(void *hWnd)');
    fnReleaseModifierKeys = nativeLib.func('void __stdcall ReleaseModifierKeys()');
    fnIsMouseClickedOutside = nativeLib.func('int __stdcall IsMouseClickedOutside(int tbX, int tbY, int tbW, int tbH)');
    fnSetAppProcessIds = nativeLib.func('void __stdcall SetAppProcessIds(uint32_t callerPid, uint32_t electronPid)');

    try {
      fnStartNativeKeyboardHook = nativeLib.func('int __stdcall StartNativeKeyboardHook(const char *snipCombo, const char *quickCombo, uint32_t electronPid)');
      fnStopNativeKeyboardHook = nativeLib.func('void __stdcall StopNativeKeyboardHook()');
      fnUpdateHotkeyCombos = nativeLib.func('void __stdcall UpdateHotkeyCombos(const char *snipCombo, const char *quickCombo)');
      fnSetToolbarActiveState = nativeLib.func('void __stdcall SetToolbarActiveState(int active, int x, int y, int w, int h)');
      fnPollHotkeyEvent = nativeLib.func('int __stdcall PollHotkeyEvent(_Out_ int *outType, _Out_ uint8_t *outTextBuffer, int maxBytes)');
      fnIsNativeHookRunning = nativeLib.func('int __stdcall IsNativeHookRunning()');
      fnSimulateHotkeyTrigger = nativeLib.func('void __stdcall SimulateHotkeyTrigger(int triggerType, const char *optionalText)');
    } catch (hookErr) {
      console.warn('[NativeBridge] Optional native hook functions not available in DLL:', hookErr.message);
    }

    if (fnSetAppProcessIds) {
      fnSetAppProcessIds(process.pid, process.pid);
    }

    isLoaded = true;
    console.log(`[NativeBridge] Successfully loaded native in-process DLL: ${path.basename(targetDll)}`);
    return true;
  } catch (err) {
    console.error('[NativeBridge] Failed to load DLL functions:', err);
    return false;
  }
}

function isDllAvailable() {
  return isLoaded;
}

function copySelectedTextNative(targetHwnd = null) {
  if (!isLoaded && !initNativeBridge()) return '';
  try {
    const buf = Buffer.alloc(65536);
    const len = fnAutoCopySelectedTextUtf8(buf, buf.length, process.pid, targetHwnd);
    if (len > 0) {
      return buf.toString('utf8', 0, len).trim();
    }
  } catch (e) {
    console.warn('[NativeBridge] Error during native text copy:', e);
  }
  return '';
}

function makeWindowTopmostNative(win) {
  if (!win || win.isDestroyed()) return;
  if (!isLoaded && !initNativeBridge()) return;
  try {
    const hwndBuf = win.getNativeWindowHandle();
    if (hwndBuf && hwndBuf.length >= 4) {
      fnMakeWindowTopmost(hwndBuf);
    }
  } catch (e) {
    console.warn('[NativeBridge] Error enforcing topmost:', e);
  }
}

function releaseModifiersNative() {
  if (!isLoaded && !initNativeBridge()) return;
  try {
    fnReleaseModifierKeys();
  } catch (e) {}
}

function isMouseClickedOutsideNative(bounds) {
  if (!bounds || (!isLoaded && !initNativeBridge())) return false;
  try {
    const result = fnIsMouseClickedOutside(
      Math.round(bounds.x),
      Math.round(bounds.y),
      Math.round(bounds.width),
      Math.round(bounds.height)
    );
    return result === 1;
  } catch (e) {
    return false;
  }
}

function startNativeKeyboardHook(snipCombo, quickCombo, electronPid = process.pid) {
  if (!isLoaded && !initNativeBridge()) return false;
  if (!fnStartNativeKeyboardHook) return false;
  try {
    const res = fnStartNativeKeyboardHook(snipCombo || 'Alt+Shift+S', quickCombo || 'Ctrl+CapsLock', electronPid);
    return res === 1;
  } catch (e) {
    console.error('[NativeBridge] Failed to start native keyboard hook:', e);
    return false;
  }
}

function stopNativeKeyboardHook() {
  stopHookPolling();
  if (fnStopNativeKeyboardHook) {
    try {
      fnStopNativeKeyboardHook();
    } catch (e) {}
  }
}

function updateHotkeyCombos(snipCombo, quickCombo) {
  if (fnUpdateHotkeyCombos) {
    try {
      fnUpdateHotkeyCombos(snipCombo || 'Alt+Shift+S', quickCombo || 'Ctrl+CapsLock');
    } catch (e) {}
  }
}

function setToolbarActiveState(active, x = 0, y = 0, w = 0, h = 0) {
  if (fnSetToolbarActiveState) {
    try {
      fnSetToolbarActiveState(active ? 1 : 0, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    } catch (e) {}
  }
}

function isNativeHookRunning() {
  if (fnIsNativeHookRunning) {
    try {
      return fnIsNativeHookRunning() === 1;
    } catch (e) {
      return false;
    }
  }
  return false;
}

function simulateHotkeyTrigger(triggerType, optionalText = '') {
  if (fnSimulateHotkeyTrigger) {
    try {
      fnSimulateHotkeyTrigger(triggerType, optionalText);
    } catch (e) {}
  }
}

function pollHotkeyEventNative() {
  if (!fnPollHotkeyEvent) return null;
  try {
    const typeArr = [0];
    const textBuf = Buffer.alloc(32768);
    fnPollHotkeyEvent(typeArr, textBuf, textBuf.length);
    const type = typeArr[0];
    if (type > 0) {
      let text = '';
      const nullIdx = textBuf.indexOf(0);
      if (nullIdx > 0) {
        text = textBuf.toString('utf8', 0, nullIdx);
      } else if (nullIdx === -1) {
        text = textBuf.toString('utf8').replace(/\0/g, '');
      }
      return { type, text: text.trim() };
    }
  } catch (e) {
    console.warn('[NativeBridge] Error polling hotkey event:', e);
  }
  return null;
}

function startHookPolling(listeners = {}) {
  if (listeners.onSnip) hookListeners.onSnip = listeners.onSnip;
  if (listeners.onQuickText) hookListeners.onQuickText = listeners.onQuickText;
  if (listeners.onClickOutside) hookListeners.onClickOutside = listeners.onClickOutside;

  if (hookPollTimer) return;

  hookPollTimer = setInterval(() => {
    const evt = pollHotkeyEventNative();
    if (!evt) return;
    if (evt.type === 1 && typeof hookListeners.onSnip === 'function') {
      hookListeners.onSnip();
    } else if (evt.type === 2 && typeof hookListeners.onQuickText === 'function') {
      hookListeners.onQuickText(evt.text);
    } else if (evt.type === 3 && typeof hookListeners.onClickOutside === 'function') {
      hookListeners.onClickOutside();
    }
  }, 5); // Ultra-responsive in-process polling (≤5ms latency)
}

function stopHookPolling() {
  if (hookPollTimer) {
    clearInterval(hookPollTimer);
    hookPollTimer = null;
  }
}

module.exports = {
  initNativeBridge,
  isDllAvailable,
  copySelectedTextNative,
  makeWindowTopmostNative,
  releaseModifiersNative,
  isMouseClickedOutsideNative,
  startNativeKeyboardHook,
  stopNativeKeyboardHook,
  updateHotkeyCombos,
  setToolbarActiveState,
  isNativeHookRunning,
  simulateHotkeyTrigger,
  pollHotkeyEventNative,
  startHookPolling,
  stopHookPolling
};
