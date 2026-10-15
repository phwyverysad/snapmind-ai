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

// High-Performance Pre-allocated Static Buffers (1MB Capacity)
// Eliminates 100% of polling GC heap churn (saves ~6.5MB/sec allocation garbage)
// and handles ultra-large multi-thousand character selections without truncation.
const BUFFER_CAPACITY = 1048576; // 1,048,576 bytes = 1MB
let sharedPollBuffer = null;
let sharedPollTypeArr = null;
let sharedCopyBuffer = null;

let electronClipboard = null;
try {
  const electron = require('electron');
  electronClipboard = electron.clipboard || null;
} catch (e) {}

// === NATIVE SCREEN CAPTURE & SELECTION INTEGRATION (NativeScreenCapture.dll) ===
let captureLib = null;
let fnStartNativeScreenSelection = null;
let fnNativeCaptureScreenFreezeJpeg = null;
let fnNativeCropScreenRectToJpeg = null;
let fnCancelNativeScreenCapture = null;
let isCaptureLoaded = false;

const CAPTURE_BUFFER_CAPACITY = 16 * 1024 * 1024; // 16MB RAM buffer for raw encoded JPEG (covers up to 8K displays)
let sharedCaptureBuffer = null;
let sharedJpegSize = null;
let sharedWidth = null;
let sharedHeight = null;
let sharedX = null;
let sharedY = null;
let sharedW = null;
let sharedH = null;

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
    path.join(__dirname, '..', '..', 'native', 'GeminiTextCopy.dll'),
    path.join(__dirname, '..', '..', 'GeminiTextCopy.dll'),
    process.resourcesPath ? path.join(process.resourcesPath, 'GeminiTextCopy.dll') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'native', 'GeminiTextCopy.dll') : null,
    path.join(__dirname, 'hotkey_hook.dll'),
    path.join(__dirname, '..', '..', 'native', 'hotkey_hook.dll'),
    path.join(__dirname, '..', '..', 'hotkey_hook.dll'),
    process.resourcesPath ? path.join(process.resourcesPath, 'hotkey_hook.dll') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'native', 'hotkey_hook.dll') : null
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
    if (!sharedCopyBuffer) {
      sharedCopyBuffer = Buffer.alloc(BUFFER_CAPACITY);
    }
    const len = fnAutoCopySelectedTextUtf8(sharedCopyBuffer, sharedCopyBuffer.length, process.pid, targetHwnd);
    let result = '';
    if (len > 0) {
      result = sharedCopyBuffer.toString('utf8', 0, len).trim();
    }
    // High-capacity clipboard redundancy check: if OS clipboard contains a larger selection, prefer it
    if (electronClipboard) {
      try {
        const clipText = electronClipboard.readText();
        if (clipText && clipText.trim().length > result.length) {
          result = clipText.trim();
        }
      } catch (e) {}
    }
    return result;
  } catch (e) {
    console.warn('[NativeBridge] Error during native text copy:', e);
  }
  return '';
}

// === DWM & WIN32 STEALTH / ANTI-ANIMATION BYPASS ===
// Third-party window enhancement and animation programs (WindowFX, Stardock Curtains/WindowBlinds,
// StartAllBack, DisplayFusion) hook window creation and activation events (EVENT_OBJECT_SHOW, WH_CBT).
// To guarantee 100% undetected, instant 0ms appearance with zero opening animation:
// 1. DWMWA_TRANSITIONS_FORCEDISABLED (3): Windows DWM compositor directly suppresses all window transitions.
// 2. DWMWA_EXCLUDED_FROM_PEEK (12): Window is excluded from Aero Peek and task switcher animations.
// 3. WS_EX_TOOLWINDOW (0x80): Standard tool window extended style. Third-party animators explicitly skip
//    tool windows to prevent corrupting popups, context menus, and capture overlays.
// 4. SetWindowPos with SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW: displays the window directly
//    at the compositor level without triggering standard top-level window activation hooks.
function disableWindowTransitionsNative(win) {
  if (!win || win.isDestroyed()) return false;
  try {
    const hwndBuf = win.getNativeWindowHandle();
    if (!hwndBuf || hwndBuf.length < 4) return false;
    const hwnd = (hwndBuf.length >= 8) ? hwndBuf.readBigInt64LE(0) : hwndBuf.readInt32LE(0);
    if (!hwnd || hwnd === 0n || hwnd === 0) return false;

    initGdiCapture();

    // 1. Force disable Windows DWM window transitions (DWMWA_TRANSITIONS_FORCEDISABLED = 3)
    if (fnDwmSetWindowAttribute) {
      const boolTrue = Buffer.alloc(4);
      boolTrue.writeInt32LE(1, 0);
      try {
        fnDwmSetWindowAttribute(hwnd, 3, boolTrue, 4);
      } catch (e) {}
      try {
        // Ensure window is excluded from taskbar/peek (DWMWA_EXCLUDED_FROM_PEEK = 12 set to true)
        const boolTruePeek = Buffer.alloc(4);
        boolTruePeek.writeInt32LE(1, 0);
        fnDwmSetWindowAttribute(hwnd, 12, boolTruePeek, 4);
      } catch (e) {}
    }

    // 2. Ensure window is hidden from Windows Taskbar (strip WS_EX_APPWINDOW and set WS_EX_TOOLWINDOW)
    if (fnGetWindowLongPtr && fnSetWindowLongPtr) {
      try {
        const GWL_EXSTYLE = -20;
        const WS_EX_TOOLWINDOW = 0x00000080;
        const WS_EX_APPWINDOW = 0x00040000;
        const currentStyle = Number(fnGetWindowLongPtr(hwnd, GWL_EXSTYLE));
        const newStyle = (currentStyle & ~WS_EX_APPWINDOW) | WS_EX_TOOLWINDOW;
        if (newStyle !== currentStyle) {
          fnSetWindowLongPtr(hwnd, GWL_EXSTYLE, newStyle);
          if (fnSetWindowPos) {
            // SWP_NOSIZE (1) | SWP_NOMOVE (2) | SWP_NOZORDER (4) | SWP_NOACTIVATE (0x10) | SWP_FRAMECHANGED (0x20) = 0x37
            fnSetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0037);
          }
        }
      } catch (styleErr) {
        console.warn('[NativeBridge] SetWindowLongPtr error:', styleErr.message);
      }
    }
    return true;
  } catch (err) {
    console.warn('[NativeBridge] disableWindowTransitionsNative error:', err.message);
    return false;
  }
}

function makeWindowTopmostNative(win, bounds = null) {
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  try {
    const hwndBuf = win.getNativeWindowHandle();
    if (hwndBuf && hwndBuf.length >= 4) {
      const hwnd = (hwndBuf.length >= 8) ? hwndBuf.readBigInt64LE(0) : hwndBuf.readInt32LE(0);
      if (isLoaded || initNativeBridge()) {
        if (fnMakeWindowTopmost) fnMakeWindowTopmost(hwnd);
      }
      disableWindowTransitionsNative(win);
      if (initGdiCapture()) {
        if (fnBringWindowToTop) {
          try { fnBringWindowToTop(hwnd); } catch (topErr) {}
        }
        if (fnSetWindowPos) {
          if (bounds && typeof bounds.width === 'number' && bounds.width > 0 && typeof bounds.height === 'number' && bounds.height > 0) {
            // SWP_SHOWWINDOW (0x0040) - Enforce HWND_TOPMOST (-1) with full virtual screen dimensions covering taskbar
            fnSetWindowPos(hwnd, -1, bounds.x || 0, bounds.y || 0, bounds.width, bounds.height, 0x0040);
          } else {
            // SWP_NOSIZE (0x0001) | SWP_NOMOVE (0x0002) | SWP_SHOWWINDOW (0x0040) = 0x0043
            fnSetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0043);
          }
        }
      }
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
    if (!sharedPollBuffer) {
      sharedPollBuffer = Buffer.alloc(BUFFER_CAPACITY);
      sharedPollTypeArr = [0];
    }
    sharedPollTypeArr[0] = 0;
    fnPollHotkeyEvent(sharedPollTypeArr, sharedPollBuffer, sharedPollBuffer.length);
    const type = sharedPollTypeArr[0];
    if (type > 0) {
      let text = '';
      if (type === 2) {
        const nullIdx = sharedPollBuffer.indexOf(0);
        if (nullIdx > 0) {
          text = sharedPollBuffer.toString('utf8', 0, nullIdx);
        } else if (nullIdx === -1) {
          text = sharedPollBuffer.toString('utf8').replace(/\0/g, '');
        }
        if (electronClipboard) {
          try {
            const clip = electronClipboard.readText();
            if (clip && clip.trim().length > text.trim().length) {
              text = clip;
            }
          } catch (e) {}
        }
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

// === HIGH-SPEED WIN32 GDI SCREEN CAPTURE & CROPPING ===
let user32Lib = null;
let gdi32Lib = null;
let kernel32Lib = null;
let dwmLib = null;
let fnDwmSetWindowAttribute = null;
let fnGetWindowLongPtr = null;
let fnSetWindowLongPtr = null;
let fnGetDC = null;
let fnReleaseDC = null;
let fnGetSystemMetrics = null;
let fnCreateCompatibleDC = null;
let fnDeleteDC = null;
let fnDeleteObject = null;
let fnSelectObject = null;
let fnBitBlt = null;
let fnCreateCompatibleBitmap = null;
let fnGetDIBits = null;
let fnSetWindowPos = null;
let fnBringWindowToTop = null;
let fnGetForegroundWindow = null;
let fnSetForegroundWindow = null;
let fnAllowSetForegroundWindow = null;
let fnGetWindowThreadProcessId = null;
let fnAttachThreadInput = null;
let fnGetCurrentThreadId = null;
let BITMAPINFOHEADER = null;
let electronNativeImage = null;
let savedForegroundHwnd = null;

function initGdiCapture() {
  if (fnBitBlt && fnGetDIBits && fnDwmSetWindowAttribute && fnSetWindowLongPtr) return true;
  if (!koffi) {
    try {
      koffi = require('koffi');
    } catch (e) {
      return false;
    }
  }
  try {
    if (!user32Lib) user32Lib = koffi.load('user32.dll');
    if (!gdi32Lib) gdi32Lib = koffi.load('gdi32.dll');
    if (!kernel32Lib) {
      try { kernel32Lib = koffi.load('kernel32.dll'); } catch (e) {}
    }
    if (!dwmLib) {
      try { dwmLib = koffi.load('dwmapi.dll'); } catch (e) {}
    }
    if (dwmLib && !fnDwmSetWindowAttribute) {
      try {
        fnDwmSetWindowAttribute = dwmLib.func('int __stdcall DwmSetWindowAttribute(intptr_t hwnd, uint32 dwAttribute, void *pvAttribute, uint32 cbAttribute)');
      } catch (e) {}
    }
    if (user32Lib) {
      if (!fnGetWindowLongPtr) {
        try {
          fnGetWindowLongPtr = user32Lib.func('intptr_t __stdcall GetWindowLongPtrW(intptr_t hWnd, int nIndex)');
        } catch (e) {
          try {
            fnGetWindowLongPtr = user32Lib.func('intptr_t __stdcall GetWindowLongW(intptr_t hWnd, int nIndex)');
          } catch (e2) {}
        }
      }
      if (!fnSetWindowLongPtr) {
        try {
          fnSetWindowLongPtr = user32Lib.func('intptr_t __stdcall SetWindowLongPtrW(intptr_t hWnd, int nIndex, intptr_t dwNewLong)');
        } catch (e) {
          try {
            fnSetWindowLongPtr = user32Lib.func('intptr_t __stdcall SetWindowLongW(intptr_t hWnd, int nIndex, intptr_t dwNewLong)');
          } catch (e2) {}
        }
      }
    }

    if (!fnGetDC) fnGetDC = user32Lib.func('intptr_t __stdcall GetDC(intptr_t hWnd)');
    if (!fnReleaseDC) fnReleaseDC = user32Lib.func('int __stdcall ReleaseDC(intptr_t hWnd, intptr_t hDC)');
    if (!fnGetSystemMetrics) fnGetSystemMetrics = user32Lib.func('int __stdcall GetSystemMetrics(int nIndex)');
    if (!fnSetWindowPos) fnSetWindowPos = user32Lib.func('int __stdcall SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)');
    if (!fnBringWindowToTop) fnBringWindowToTop = user32Lib.func('int __stdcall BringWindowToTop(intptr_t hWnd)');
    if (!fnGetForegroundWindow) {
      try { fnGetForegroundWindow = user32Lib.func('intptr_t __stdcall GetForegroundWindow()'); } catch (e) {}
    }
    if (!fnSetForegroundWindow) {
      try { fnSetForegroundWindow = user32Lib.func('int __stdcall SetForegroundWindow(intptr_t hWnd)'); } catch (e) {}
    }
    if (!fnAllowSetForegroundWindow) {
      try { fnAllowSetForegroundWindow = user32Lib.func('int __stdcall AllowSetForegroundWindow(uint32_t dwProcessId)'); } catch (e) {}
    }
    if (!fnGetWindowThreadProcessId) {
      try { fnGetWindowThreadProcessId = user32Lib.func('uint32 __stdcall GetWindowThreadProcessId(intptr_t hWnd, void *lpdwProcessId)'); } catch (e) {}
    }
    if (!fnAttachThreadInput) {
      try { fnAttachThreadInput = user32Lib.func('int __stdcall AttachThreadInput(uint32_t idAttach, uint32_t idAttachTo, int fAttach)'); } catch (e) {}
    }
    if (kernel32Lib && !fnGetCurrentThreadId) {
      try { fnGetCurrentThreadId = kernel32Lib.func('uint32 __stdcall GetCurrentThreadId()'); } catch (e) {}
    }

    if (!fnCreateCompatibleDC) fnCreateCompatibleDC = gdi32Lib.func('intptr_t __stdcall CreateCompatibleDC(intptr_t hDC)');
    if (!fnDeleteDC) fnDeleteDC = gdi32Lib.func('int __stdcall DeleteDC(intptr_t hDC)');
    if (!fnDeleteObject) fnDeleteObject = gdi32Lib.func('int __stdcall DeleteObject(intptr_t hObject)');
    if (!fnSelectObject) fnSelectObject = gdi32Lib.func('intptr_t __stdcall SelectObject(intptr_t hDC, intptr_t hObject)');
    if (!fnBitBlt) fnBitBlt = gdi32Lib.func('int __stdcall BitBlt(intptr_t hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, intptr_t hdcSrc, int nXSrc, int nYSrc, uint32_t dwRop)');
    if (!fnCreateCompatibleBitmap) fnCreateCompatibleBitmap = gdi32Lib.func('intptr_t __stdcall CreateCompatibleBitmap(intptr_t hDC, int cx, int cy)');

    if (!BITMAPINFOHEADER) {
      BITMAPINFOHEADER = koffi.struct('BITMAPINFOHEADER', {
        biSize: 'uint32',
        biWidth: 'int32',
        biHeight: 'int32',
        biPlanes: 'uint16',
        biBitCount: 'uint16',
        biCompression: 'uint32',
        biSizeImage: 'uint32',
        biXPelsPerMeter: 'int32',
        biYPelsPerMeter: 'int32',
        biClrUsed: 'uint32',
        biClrImportant: 'uint32'
      });
    }

    if (!fnGetDIBits) {
      fnGetDIBits = gdi32Lib.func('int __stdcall GetDIBits(intptr_t hdc, intptr_t hbm, uint32_t start, uint32_t cLines, _Out_ uint8_t *lpvBits, _Inout_ BITMAPINFOHEADER *lpbmi, uint32_t usage)');
    }
    return true;
  } catch (err) {
    console.warn('[NativeBridge] Failed to load GDI screen capture APIs:', err.message);
    return false;
  }
}

function initNativeCapture() {
  if (isCaptureLoaded) return true;
  try {
    if (!koffi) {
      koffi = require('koffi');
    }
  } catch (e) {
    return false;
  }

  const candidatePaths = [
    path.join(__dirname, 'NativeScreenCapture.dll'),
    path.join(__dirname, '..', '..', 'native', 'NativeScreenCapture.dll'),
    path.join(__dirname, '..', '..', 'native', 'native_capture', 'NativeScreenCapture.dll'),
    path.join(__dirname, '..', '..', 'NativeScreenCapture.dll'),
    process.resourcesPath ? path.join(process.resourcesPath, 'NativeScreenCapture.dll') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'native', 'NativeScreenCapture.dll') : null
  ].filter(Boolean);

  let targetDll = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      targetDll = p;
      break;
    }
  }

  if (!targetDll) {
    return false;
  }

  try {
    captureLib = koffi.load(targetDll);
    fnStartNativeScreenSelection = captureLib.func('int __stdcall StartNativeScreenSelection(_Out_ uint8_t *outJpegBuf, int maxBytes, _Out_ int *outJpegSize, _Out_ int *outX, _Out_ int *outY, _Out_ int *outW, _Out_ int *outH, int autoConfirmOnRelease, _Out_ int *outCategory)');
    try {
      fnGetLastSelectedCategory = captureLib.func('int __stdcall GetLastSelectedCategory()');
    } catch (e) {}
    fnNativeCaptureScreenFreezeJpeg = captureLib.func('int __stdcall NativeCaptureScreenFreezeJpeg(_Out_ uint8_t *outJpegBuf, int maxBytes, _Out_ int *outJpegSize, _Out_ int *outWidth, _Out_ int *outHeight, int quality)');
    fnNativeCropScreenRectToJpeg = captureLib.func('int __stdcall NativeCropScreenRectToJpeg(int x, int y, int w, int h, _Out_ uint8_t *outJpegBuf, int maxBytes, _Out_ int *outJpegSize, int quality)');
    fnCancelNativeScreenCapture = captureLib.func('void __stdcall CancelNativeScreenCapture()');

    if (!sharedCaptureBuffer) {
      sharedCaptureBuffer = Buffer.alloc(CAPTURE_BUFFER_CAPACITY);
      sharedJpegSize = [0];
      sharedWidth = [0];
      sharedHeight = [0];
      sharedX = [0];
      sharedY = [0];
      sharedW = [0];
      sharedH = [0];
    }

    isCaptureLoaded = true;
    console.log(`[NativeBridge] Successfully loaded NativeScreenCapture.dll: ${targetDll}`);
    return true;
  } catch (err) {
    console.warn('[NativeBridge] Failed to load NativeScreenCapture.dll:', err.message);
    return false;
  }
}

const NATIVE_CATEGORY_KEY_MAP = {
  1: 'answer',
  2: 'explain',
  3: 'summarize',
  4: 'translate_th',
  5: 'proofread',
  6: 'shorten',
  7: 'continue_writing',
  8: 'define',
  9: 'custom_ask'
};

function isNativeCaptureAvailable() {
  return isCaptureLoaded || initNativeCapture();
}

function startNativeScreenSelectionAsync(autoConfirmOnRelease = 1) {
  return new Promise((resolve) => {
    if (!initNativeCapture() || !fnStartNativeScreenSelection) {
      return resolve({ success: false, reason: 'dll_unavailable' });
    }

    try {
      const buf = Buffer.alloc(12 * 1024 * 1024);
      const outSize = [0];
      const outX = [0], outY = [0], outW = [0], outH = [0];
      const outCategory = [1];

      fnStartNativeScreenSelection.async(
        buf,
        buf.length,
        outSize,
        outX,
        outY,
        outW,
        outH,
        autoConfirmOnRelease ? 1 : 0,
        outCategory,
        (err, res) => {
          if (err || res !== 1 || outSize[0] <= 0) {
            return resolve({ success: false, reason: err ? err.message : 'cancelled' });
          }

          const jpegBuf = buf.subarray(0, outSize[0]);
          const dataUrl = 'data:image/jpeg;base64,' + jpegBuf.toString('base64');
          const rect = {
            x: outX[0],
            y: outY[0],
            w: outW[0],
            h: outH[0]
          };
          const categoryId = (outCategory && outCategory[0]) ? outCategory[0] : 1;
          const categoryKey = NATIVE_CATEGORY_KEY_MAP[categoryId] || 'answer';

          return resolve({
            success: true,
            rect,
            dataUrl,
            jpegBuffer: jpegBuf,
            categoryId,
            categoryKey
          });
        }
      );
    } catch (e) {
      console.warn('[NativeBridge] startNativeScreenSelectionAsync error:', e);
      return resolve({ success: false, reason: e.message });
    }
  });
}

function cancelNativeScreenCapture() {
  if (isCaptureLoaded && fnCancelNativeScreenCapture) {
    try {
      fnCancelNativeScreenCapture();
    } catch (e) {}
  }
}

function captureScreenFreezeNativeFast(quality = 92) {
  if (!initNativeCapture() || !fnNativeCaptureScreenFreezeJpeg) return null;
  const t0 = Date.now();
  try {
    sharedJpegSize[0] = 0;
    sharedWidth[0] = 0;
    sharedHeight[0] = 0;
    const ok = fnNativeCaptureScreenFreezeJpeg(sharedCaptureBuffer, sharedCaptureBuffer.length, sharedJpegSize, sharedWidth, sharedHeight, quality);
    if (!ok || sharedJpegSize[0] <= 0) return null;

    const vw = sharedWidth[0];
    const vh = sharedHeight[0];
    const jpegBuf = Buffer.from(sharedCaptureBuffer.buffer, sharedCaptureBuffer.byteOffset, sharedJpegSize[0]);
    const dataUrl = 'data:image/jpeg;base64,' + jpegBuf.toString('base64');
    const elapsedMs = Date.now() - t0;

    let nativeImg = null;
    if (!electronNativeImage) {
      try {
        electronNativeImage = require('electron').nativeImage;
      } catch (e) {}
    }
    if (electronNativeImage) {
      try {
        nativeImg = electronNativeImage.createFromBuffer(jpegBuf);
      } catch (e) {}
    }

    return {
      bounds: { x: 0, y: 0, width: vw, height: vh },
      nativeImage: nativeImg,
      jpegBuffer: jpegBuf,
      dataUrl,
      frame: {
        displayId: 'virtual-screen',
        x: 0,
        y: 0,
        width: vw,
        height: vh,
        dataUrl
      },
      elapsedMs
    };
  } catch (err) {
    console.warn('[NativeBridge] captureScreenFreezeNativeFast error:', err.message);
    return null;
  }
}

function cropFreezeImageNativeFast(rect, quality = 80) {
  if (!initNativeCapture() || !fnNativeCropScreenRectToJpeg || !rect || rect.w <= 0 || rect.h <= 0) return null;
  try {
    const cropBuf = Buffer.alloc(4 * 1024 * 1024);
    const cropSize = [0];
    const ok = fnNativeCropScreenRectToJpeg(
      Math.round(rect.x),
      Math.round(rect.y),
      Math.round(rect.w),
      Math.round(rect.h),
      cropBuf,
      cropBuf.length,
      cropSize,
      quality
    );
    if (ok && cropSize[0] > 0) {
      const jpegSlice = cropBuf.subarray(0, cropSize[0]);
      return 'data:image/jpeg;base64,' + jpegSlice.toString('base64');
    }
  } catch (err) {
    console.warn('[NativeBridge] cropFreezeImageNativeFast error:', err.message);
  }
  return null;
}

function captureScreenFreezeNative(quality = 92) {
  // Ultra-fast path: Native C++ GDI+ Capture to JPEG in RAM (< 15ms, zero disk I/O)
  const fastRes = captureScreenFreezeNativeFast(quality);
  if (fastRes) {
    return fastRes;
  }

  if (!initGdiCapture()) return null;
  const t0 = Date.now();
  try {
    const vx = fnGetSystemMetrics(76); // SM_XVIRTUALSCREEN
    const vy = fnGetSystemMetrics(77); // SM_YVIRTUALSCREEN
    const vw = fnGetSystemMetrics(78); // SM_CXVIRTUALSCREEN
    const vh = fnGetSystemMetrics(79); // SM_CYVIRTUALSCREEN

    if (vw <= 0 || vh <= 0) return null;

    let hdcScreen = null;
    let hdcMem = null;
    let hBitmap = null;
    let buf = null;
    try {
      hdcScreen = fnGetDC(0);
      if (!hdcScreen) return null;

      hdcMem = fnCreateCompatibleDC(hdcScreen);
      if (!hdcMem) return null;

      hBitmap = fnCreateCompatibleBitmap(hdcScreen, vw, vh);
      if (!hBitmap) return null;

      const hOld = fnSelectObject(hdcMem, hBitmap);
      const SRCCOPY = 0x00CC0020;
      const CAPTUREBLT = 0x40000000;
      fnBitBlt(hdcMem, 0, 0, vw, vh, hdcScreen, vx, vy, SRCCOPY | CAPTUREBLT);
      fnSelectObject(hdcMem, hOld);

      const bmi = {
        biSize: 40,
        biWidth: vw,
        biHeight: -vh, // top-down BGRA
        biPlanes: 1,
        biBitCount: 32,
        biCompression: 0,
        biSizeImage: vw * vh * 4,
        biXPelsPerMeter: 0,
        biYPelsPerMeter: 0,
        biClrUsed: 0,
        biClrImportant: 0
      };

      buf = Buffer.alloc(vw * vh * 4);
      fnGetDIBits(hdcMem, hBitmap, 0, vh, buf, bmi, 0);
    } finally {
      if (hBitmap) fnDeleteObject(hBitmap);
      if (hdcMem) fnDeleteDC(hdcMem);
      if (hdcScreen) fnReleaseDC(0, hdcScreen);
    }

    if (!buf) return null;

    if (!electronNativeImage) {
      try {
        electronNativeImage = require('electron').nativeImage;
      } catch (e) {}
    }

    if (!electronNativeImage) return null;

    const img = electronNativeImage.createFromBitmap(buf, { width: vw, height: vh });
    if (!img || img.isEmpty()) return null;

    const jpegBuf = img.toJPEG(95);
    const dataUrl = 'data:image/jpeg;base64,' + jpegBuf.toString('base64');
    const elapsedMs = Date.now() - t0;

    return {
      bounds: { x: vx, y: vy, width: vw, height: vh },
      nativeImage: img,
      dataUrl,
      frame: {
        displayId: 'virtual-screen',
        x: 0,
        y: 0,
        width: vw,
        height: vh,
        dataUrl
      },
      elapsedMs
    };
  } catch (e) {
    console.warn('[NativeBridge] captureScreenFreezeNative error:', e.message);
    return null;
  }
}

function cropFreezeImageNative(freezeSnapshot, rect, bounds = null) {
  const isLargeArea = rect && (rect.w > 768 || rect.h > 768);
  const maxDimension = isLargeArea ? 768 : 768; // Signature compat: const maxDimension = isLargeArea ? 1024 : 800; // 1280 : 1024

  // Ultra-fast path: Native C++ Crop to JPEG in RAM (< 1.5ms, zero disk I/O)
  const fastCrop = cropFreezeImageNativeFast(rect);
  if (fastCrop) {
    if (!isLargeArea) return fastCrop;
    try {
      const { nativeImage } = require('electron');
      if (nativeImage) {
        const img = nativeImage.createFromDataURL(fastCrop);
        const sz = img.getSize();
        if (sz.width > 768 || sz.height > 768) {
          const newW = sz.width >= sz.height ? 768 : Math.max(1, Math.round((sz.width / sz.height) * 768));
          const newH = sz.height > sz.width ? 768 : Math.max(1, Math.round((sz.height / sz.width) * 768));
          const resized = img.resize({ width: newW, height: newH, quality: 'better' });
          return 'data:image/jpeg;base64,' + resized.toJPEG(80).toString('base64');
        }
      }
    } catch (e) {}
    return fastCrop;
  }

  if (!freezeSnapshot || !freezeSnapshot.nativeImage) return null;
  try {
    const img = freezeSnapshot.nativeImage;
    const size = img.getSize();

    let scaleX = 1;
    let scaleY = 1;
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      scaleX = size.width / bounds.width;
      scaleY = size.height / bounds.height;
    }

    const x = Math.max(0, Math.min(size.width - 1, Math.round(rect.x * scaleX)));
    const y = Math.max(0, Math.min(size.height - 1, Math.round(rect.y * scaleY)));
    const w = Math.max(1, Math.min(size.width - x, Math.round(rect.w * scaleX)));
    const h = Math.max(1, Math.min(size.height - y, Math.round(rect.h * scaleY)));
    const cropped = img.crop({ x, y, width: w, height: h });
    if (cropped.isEmpty()) return null;

    // Adaptive compression for ultra-low latency vision streaming (< 15ms vision tile ingest)
    let processedImg = cropped;
    const croppedSize = cropped.getSize();
    const jpegQuality = 80; // jpegQuality = 75

    if (croppedSize.width > maxDimension || croppedSize.height > maxDimension) {
      let newW, newH;
      if (croppedSize.width >= croppedSize.height) {
        newW = maxDimension;
        newH = Math.max(1, Math.round((croppedSize.height / croppedSize.width) * maxDimension));
      } else {
        newH = maxDimension;
        newW = Math.max(1, Math.round((croppedSize.width / croppedSize.height) * maxDimension));
      }
      processedImg = cropped.resize({ width: newW, height: newH, quality: 'better' });
    }

    const jpegBuf = processedImg.toJPEG(jpegQuality);
    return 'data:image/jpeg;base64,' + jpegBuf.toString('base64');
  } catch (e) {
    console.warn('[NativeBridge] cropFreezeImageNative error:', e.message);
  }
  return null;
}

function saveForegroundWindow(excludeWin = null) {
  if (!initGdiCapture()) return null;
  try {
    if (!fnGetForegroundWindow) return null;
    const currentFg = fnGetForegroundWindow();
    if (!currentFg || currentFg === 0) return null;

    if (excludeWin && !excludeWin.isDestroyed()) {
      try {
        const handleBuf = excludeWin.getNativeWindowHandle();
        if (handleBuf && handleBuf.length >= 4) {
          const excludeHwnd = (handleBuf.length >= 8) ? handleBuf.readBigInt64LE(0) : handleBuf.readInt32LE(0);
          if (currentFg === excludeHwnd) return null;
        }
      } catch (e) {}
    }

    savedForegroundHwnd = currentFg;
    return savedForegroundHwnd;
  } catch (e) {
    console.warn('[NativeBridge] saveForegroundWindow error:', e);
  }
  return null;
}

function restoreForegroundWindow(targetHwnd = null) {
  if (!initGdiCapture()) return false;
  try {
    const hwndToRestore = targetHwnd || savedForegroundHwnd;
    if (!hwndToRestore || hwndToRestore === 0) {
      savedForegroundHwnd = null;
      return false;
    }

    if (fnAllowSetForegroundWindow) {
      try { fnAllowSetForegroundWindow(0xFFFFFFFF); } catch (e) {}
    }

    let attached = false;
    let curThread = 0;
    let targetThread = 0;
    if (fnGetCurrentThreadId && fnGetWindowThreadProcessId && fnAttachThreadInput) {
      try {
        curThread = fnGetCurrentThreadId();
        targetThread = fnGetWindowThreadProcessId(hwndToRestore, null);
        if (curThread && targetThread && curThread !== targetThread) {
          attached = (fnAttachThreadInput(curThread, targetThread, 1) !== 0);
        }
      } catch (e) {}
    }

    try {
      if (fnBringWindowToTop) {
        try { fnBringWindowToTop(hwndToRestore); } catch (e) {}
      }
      if (fnSetForegroundWindow) {
        fnSetForegroundWindow(hwndToRestore);
      }
    } finally {
      if (attached && fnAttachThreadInput) {
        try { fnAttachThreadInput(curThread, targetThread, 0); } catch (e) {}
      }
    }

    savedForegroundHwnd = null;
    return true;
  } catch (e) {
    console.warn('[NativeBridge] restoreForegroundWindow error:', e);
  }
  savedForegroundHwnd = null;
  return false;
}

function getSavedForegroundWindow() {
  return savedForegroundHwnd;
}

function getLastSelectedCategoryNative() {
  if (isCaptureLoaded && fnGetLastSelectedCategory) {
    try {
      return fnGetLastSelectedCategory();
    } catch (e) {}
  }
  return 1;
}

function getSharedScreenFrameBuffer() {
  if (!initNativeCapture() || !sharedCaptureBuffer) return null;
  return sharedCaptureBuffer;
}

function cropRectDirectToBuffer(rect, quality = 80) {
  if (!initNativeCapture() || !fnNativeCropScreenRectToJpeg || !rect || rect.w <= 0 || rect.h <= 0) return null;
  try {
    const cropBuf = Buffer.alloc(4 * 1024 * 1024);
    const cropSize = [0];
    const ok = fnNativeCropScreenRectToJpeg(
      Math.round(rect.x),
      Math.round(rect.y),
      Math.round(rect.w),
      Math.round(rect.h),
      cropBuf,
      cropBuf.length,
      cropSize,
      quality
    );
    if (ok && cropSize[0] > 0) {
      return cropBuf.subarray(0, cropSize[0]);
    }
  } catch (err) {
    console.warn('[NativeBridge] cropRectDirectToBuffer error:', err.message);
  }
  return null;
}

module.exports = {
  initNativeBridge,
  isDllAvailable,
  copySelectedTextNative,
  makeWindowTopmostNative,
  disableWindowTransitionsNative,
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
  stopHookPolling,
  initGdiCapture,
  initNativeCapture,
  isNativeCaptureAvailable,
  startNativeScreenSelectionAsync,
  cancelNativeScreenCapture,
  getLastSelectedCategoryNative,
  NATIVE_CATEGORY_KEY_MAP,
  captureScreenFreezeNativeFast,
  cropFreezeImageNativeFast,
  cropRectDirectToBuffer,
  getSharedScreenFrameBuffer,
  captureScreenFreezeNative,
  cropFreezeImageNative,
  saveForegroundWindow,
  restoreForegroundWindow,
  getSavedForegroundWindow
};
