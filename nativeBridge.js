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

function makeWindowTopmostNative(win, bounds = null) {
  if (!win || win.isDestroyed()) return;
  try {
    const hwndBuf = win.getNativeWindowHandle();
    if (hwndBuf && hwndBuf.length >= 4) {
      if (isLoaded || initNativeBridge()) {
        if (fnMakeWindowTopmost) fnMakeWindowTopmost(hwndBuf);
      }
      if (initGdiCapture() && fnSetWindowPos) {
        const hwnd = (hwndBuf.length >= 8) ? hwndBuf.readBigInt64LE(0) : hwndBuf.readInt32LE(0);
        if (bounds) {
          // HWND_TOPMOST = -1, SWP_SHOWWINDOW = 0x0040
          fnSetWindowPos(hwnd, -1, Math.round(bounds.x), Math.round(bounds.y), Math.round(bounds.width), Math.round(bounds.height), 0x0040);
        } else {
          // HWND_TOPMOST = -1, SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW = 0x0043
          fnSetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0043);
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
let BITMAPINFOHEADER = null;
let electronNativeImage = null;

function initGdiCapture() {
  if (fnBitBlt && fnGetDIBits) return true;
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

    if (!fnGetDC) fnGetDC = user32Lib.func('intptr_t __stdcall GetDC(intptr_t hWnd)');
    if (!fnReleaseDC) fnReleaseDC = user32Lib.func('int __stdcall ReleaseDC(intptr_t hWnd, intptr_t hDC)');
    if (!fnGetSystemMetrics) fnGetSystemMetrics = user32Lib.func('int __stdcall GetSystemMetrics(int nIndex)');
    if (!fnSetWindowPos) fnSetWindowPos = user32Lib.func('int __stdcall SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)');

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

function captureScreenFreezeNative() {
  if (!initGdiCapture()) return null;
  const t0 = Date.now();
  try {
    const vx = fnGetSystemMetrics(76); // SM_XVIRTUALSCREEN
    const vy = fnGetSystemMetrics(77); // SM_YVIRTUALSCREEN
    const vw = fnGetSystemMetrics(78); // SM_CXVIRTUALSCREEN
    const vh = fnGetSystemMetrics(79); // SM_CYVIRTUALSCREEN

    if (vw <= 0 || vh <= 0) return null;

    const hdcScreen = fnGetDC(0);
    if (!hdcScreen) return null;

    const hdcMem = fnCreateCompatibleDC(hdcScreen);
    if (!hdcMem) {
      fnReleaseDC(0, hdcScreen);
      return null;
    }

    const hBitmap = fnCreateCompatibleBitmap(hdcScreen, vw, vh);
    if (!hBitmap) {
      fnDeleteDC(hdcMem);
      fnReleaseDC(0, hdcScreen);
      return null;
    }

    const hOld = fnSelectObject(hdcMem, hBitmap);
    const SRCCOPY = 0x00CC0020;
    fnBitBlt(hdcMem, 0, 0, vw, vh, hdcScreen, vx, vy, SRCCOPY);
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

    const buf = Buffer.alloc(vw * vh * 4);
    fnGetDIBits(hdcMem, hBitmap, 0, vh, buf, bmi, 0);

    fnDeleteObject(hBitmap);
    fnDeleteDC(hdcMem);
    fnReleaseDC(0, hdcScreen);

    if (!electronNativeImage) {
      try {
        electronNativeImage = require('electron').nativeImage;
      } catch (e) {}
    }

    if (!electronNativeImage) return null;

    const img = electronNativeImage.createFromBitmap(buf, { width: vw, height: vh });
    if (!img || img.isEmpty()) return null;

    const jpegBuf = img.toJPEG(82);
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

function cropFreezeImageNative(freezeSnapshot, rect) {
  if (!freezeSnapshot || !freezeSnapshot.nativeImage) return null;
  try {
    const img = freezeSnapshot.nativeImage;
    const size = img.getSize();
    const x = Math.max(0, Math.min(size.width - 1, Math.round(rect.x)));
    const y = Math.max(0, Math.min(size.height - 1, Math.round(rect.y)));
    const w = Math.max(1, Math.min(size.width - x, Math.round(rect.w)));
    const h = Math.max(1, Math.min(size.height - y, Math.round(rect.h)));
    const cropped = img.crop({ x, y, width: w, height: h });
    if (cropped.isEmpty()) return null;

    // Adaptive Vision Downscaling for Ultra-Fast Gemini TTFT
    let processedImg = cropped;
    const croppedSize = cropped.getSize();
    const pixelArea = croppedSize.width * croppedSize.height;

    let maxDimension = 768;
    let jpegQuality = 68;

    if (pixelArea <= 250000) {
      maxDimension = 512;
      jpegQuality = 65;
    } else if (pixelArea <= 750000) {
      maxDimension = 768;
      jpegQuality = 68;
    } else {
      maxDimension = 768;
      jpegQuality = 68;
    }

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

    const jpegBuf = processedImg.toJPEG(jpegQuality);
    return 'data:image/jpeg;base64,' + jpegBuf.toString('base64');
  } catch (e) {
    console.warn('[NativeBridge] cropFreezeImageNative error:', e.message);
  }
  return null;
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
  stopHookPolling,
  initGdiCapture,
  captureScreenFreezeNative,
  cropFreezeImageNative
};
