#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <string>
#include <vector>
#include <cctype>

// Pure Win32 implementation extracted directly from Gemini Floating Toolbar (AppManager.cpp)
// Enhanced for standalone DLL integration with SnapMind AI (webappdesktop/Ai)

static DWORD g_callerPid = 0;
static DWORD g_electronPid = 0;

static bool isAppProcess(DWORD pid) {
    if (pid == 0 || pid == 4) return true; // System / idle
    if (g_callerPid && pid == g_callerPid) return true;
    if (g_electronPid && pid == g_electronPid) return true;

    HANDLE hProc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
    if (hProc) {
        wchar_t imagePath[MAX_PATH] = {};
        DWORD size = MAX_PATH;
        if (QueryFullProcessImageNameW(hProc, 0, imagePath, &size)) {
            const wchar_t* pName = wcsrchr(imagePath, L'\\');
            pName = pName ? pName + 1 : imagePath;
            if (_wcsicmp(pName, L"hotkey_hook.exe") == 0 ||
                _wcsicmp(pName, L"SnapMind.exe") == 0) {
                CloseHandle(hProc);
                return true;
            }
            if (_wcsicmp(pName, L"electron.exe") == 0) {
                if (wcsstr(imagePath, L"webappdesktop") || wcsstr(imagePath, L"Ai")) {
                    CloseHandle(hProc);
                    return true;
                }
            }
        }
        CloseHandle(hProc);
    }
    return false;
}

static bool isAppWindow(HWND hwnd) {
    if (!hwnd || !IsWindow(hwnd)) return true;
    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);
    return isAppProcess(pid);
}

static HWND findTargetNonAppWindow(DWORD callerPid = 0, DWORD electronPid = 0) {
    if (callerPid) g_callerPid = callerPid;
    if (electronPid) g_electronPid = electronPid;

    HWND hwnd = GetForegroundWindow();
    if (hwnd && !isAppWindow(hwnd) && IsWindowVisible(hwnd) && !IsIconic(hwnd)) {
        return hwnd;
    }

    // Search top-level z-order for the user's active window
    for (hwnd = GetTopWindow(nullptr); hwnd; hwnd = GetWindow(hwnd, GW_HWNDNEXT)) {
        if (!IsWindowVisible(hwnd) || IsIconic(hwnd)) continue;
        if (isAppWindow(hwnd)) continue;

        wchar_t cls[64] = {};
        GetClassNameW(hwnd, cls, 63);
        if (wcscmp(cls, L"Progman") == 0 || wcscmp(cls, L"WorkerW") == 0 ||
            wcscmp(cls, L"Shell_TrayWnd") == 0 || wcscmp(cls, L"Shell_SecondaryTrayWnd") == 0) {
            continue;
        }
        LONG exStyle = GetWindowLongW(hwnd, GWL_EXSTYLE);
        if (exStyle & WS_EX_TOOLWINDOW) continue;

        return hwnd;
    }
    return nullptr;
}

static std::wstring readClipboardText(int maxRetries = 10, int delayMs = 15) {
    for (int r = 0; r < maxRetries; ++r) {
        if (OpenClipboard(nullptr)) {
            HANDLE hData = GetClipboardData(CF_UNICODETEXT);
            std::wstring text;
            if (hData) {
                const wchar_t* p = static_cast<const wchar_t*>(GlobalLock(hData));
                if (p) {
                    text = p;
                    GlobalUnlock(hData);
                }
            }
            CloseClipboard();
            if (!text.empty()) {
                return text;
            }
        }
        Sleep(delayMs);
    }
    return L"";
}

extern "C" {

__declspec(dllexport) void __stdcall SetAppProcessIds(DWORD callerPid, DWORD electronPid) {
    if (callerPid) g_callerPid = callerPid;
    if (electronPid) g_electronPid = electronPid;
}

__declspec(dllexport) int __stdcall AutoCopySelectedTextExW(wchar_t* outBuffer, int maxChars, DWORD callerPid, HWND targetHwnd, DWORD electronPid) {
    if (!outBuffer || maxChars <= 1) return 0;
    outBuffer[0] = L'\0';

    if (callerPid) g_callerPid = callerPid;
    if (electronPid) g_electronPid = electronPid;

    // 1. Ensure the user's target application has active focus (not SnapMind AI or Hook)
    HWND hwndTarget = (targetHwnd && IsWindow(targetHwnd) && !isAppWindow(targetHwnd)) ? 
                       targetHwnd : findTargetNonAppWindow(callerPid, electronPid);
    if (!hwndTarget && targetHwnd && IsWindow(targetHwnd)) {
        hwndTarget = targetHwnd;
    }

    if (hwndTarget && hwndTarget != GetForegroundWindow()) {
        DWORD curThread = GetCurrentThreadId();
        DWORD targetThread = GetWindowThreadProcessId(hwndTarget, nullptr);
        if (curThread != targetThread) {
            AttachThreadInput(curThread, targetThread, TRUE);
            SetForegroundWindow(hwndTarget);
            BringWindowToTop(hwndTarget);
            AttachThreadInput(curThread, targetThread, FALSE);
        } else {
            SetForegroundWindow(hwndTarget);
            BringWindowToTop(hwndTarget);
        }
        Sleep(30);
    }

    // 2. Wait up to 150ms for user to release conflicting modifier keys (Caps Lock, Alt, Shift)
    for (int i = 0; i < 15; ++i) {
        bool capsHeld = (GetAsyncKeyState(VK_CAPITAL) & 0x8000) != 0;
        bool altHeld = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;
        bool shiftHeld = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;
        if (!capsHeld && !altHeld && !shiftHeld) {
            break;
        }
        Sleep(10);
    }

    // Explicitly release any held modifiers so keyboard state is completely clean
    keybd_event(VK_CAPITAL, 0x3A, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_CONTROL, 0x1D, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_MENU, 0x38, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_SHIFT, 0x2A, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_LWIN, 0x5B, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_RWIN, 0x5C, KEYEVENTF_KEYUP, 0);
    Sleep(20);

    DWORD seqBefore = GetClipboardSequenceNumber();

    // 3. Tier 1: Try WM_COPY first if focused window is a standard Win32 edit control
    if (hwndTarget) {
        GUITHREADINFO gti = { sizeof(GUITHREADINFO) };
        DWORD foreThread = GetWindowThreadProcessId(hwndTarget, nullptr);
        if (foreThread != 0) {
            GetGUIThreadInfo(foreThread, &gti);
        }
        HWND hwndFocus = gti.hwndFocus ? gti.hwndFocus : hwndTarget;
        if (hwndFocus) {
            DWORD_PTR dwResult = 0;
            SendMessageTimeoutW(hwndFocus, WM_COPY, 0, 0, SMTO_ABORTIFHUNG, 50, &dwResult);
            if (GetClipboardSequenceNumber() != seqBefore) {
                std::wstring text = readClipboardText();
                if (!text.empty()) {
                    wcsncpy_s(outBuffer, maxChars, text.c_str(), _TRUNCATE);
                    return static_cast<int>(wcslen(outBuffer));
                }
            }
        }
    }

    // 4. Tier 2: Universal simulated Ctrl + C using both SendInput and keybd_event with scancodes (proven in Gemini AppManager.cpp)
    INPUT inCtrlDown = {};
    inCtrlDown.type = INPUT_KEYBOARD;
    inCtrlDown.ki.wVk = VK_CONTROL;
    inCtrlDown.ki.wScan = 0x1D;
    inCtrlDown.ki.dwFlags = 0;
    SendInput(1, &inCtrlDown, sizeof(INPUT));
    keybd_event(VK_CONTROL, 0x1D, 0, 0);
    Sleep(25);

    INPUT inCDown = {};
    inCDown.type = INPUT_KEYBOARD;
    inCDown.ki.wVk = 'C';
    inCDown.ki.wScan = 0x2E;
    inCDown.ki.dwFlags = 0;
    SendInput(1, &inCDown, sizeof(INPUT));
    keybd_event('C', 0x2E, 0, 0);
    Sleep(45); // Crucial hold duration for Discord / Chrome event dispatcher

    INPUT inCUp = {};
    inCUp.type = INPUT_KEYBOARD;
    inCUp.ki.wVk = 'C';
    inCUp.ki.wScan = 0x2E;
    inCUp.ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &inCUp, sizeof(INPUT));
    keybd_event('C', 0x2E, KEYEVENTF_KEYUP, 0);
    Sleep(25);

    INPUT inCtrlUp = {};
    inCtrlUp.type = INPUT_KEYBOARD;
    inCtrlUp.ki.wVk = VK_CONTROL;
    inCtrlUp.ki.wScan = 0x1D;
    inCtrlUp.ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &inCtrlUp, sizeof(INPUT));
    keybd_event(VK_CONTROL, 0x1D, KEYEVENTF_KEYUP, 0);

    // Poll for sequence update (up to 350ms)
    for (int i = 0; i < 20; i++) {
        Sleep(15);
        if (GetClipboardSequenceNumber() != seqBefore) {
            std::wstring text = readClipboardText();
            if (!text.empty()) {
                wcsncpy_s(outBuffer, maxChars, text.c_str(), _TRUNCATE);
                return static_cast<int>(wcslen(outBuffer));
            }
        }
    }

    // 5. Tier 3: ScanCode-only SendInput fallback
    if (GetClipboardSequenceNumber() == seqBefore) {
        INPUT inCtrlScan = {};
        inCtrlScan.type = INPUT_KEYBOARD;
        inCtrlScan.ki.wScan = 0x1D;
        inCtrlScan.ki.dwFlags = KEYEVENTF_SCANCODE;
        SendInput(1, &inCtrlScan, sizeof(INPUT));
        Sleep(25);

        INPUT inCScan = {};
        inCScan.type = INPUT_KEYBOARD;
        inCScan.ki.wScan = 0x2E;
        inCScan.ki.dwFlags = KEYEVENTF_SCANCODE;
        SendInput(1, &inCScan, sizeof(INPUT));
        Sleep(45);

        inCScan.ki.dwFlags = KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP;
        SendInput(1, &inCScan, sizeof(INPUT));
        Sleep(20);

        inCtrlScan.ki.dwFlags = KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP;
        SendInput(1, &inCtrlScan, sizeof(INPUT));

        for (int i = 0; i < 15; i++) {
            Sleep(15);
            if (GetClipboardSequenceNumber() != seqBefore) {
                std::wstring text = readClipboardText();
                if (!text.empty()) {
                    wcsncpy_s(outBuffer, maxChars, text.c_str(), _TRUNCATE);
                    return static_cast<int>(wcslen(outBuffer));
                }
            }
        }
    }

    // 6. Tier 4: Universal Ctrl + Insert fallback (IBM standard copy supported by Discord / terminal / edit controls)
    if (GetClipboardSequenceNumber() == seqBefore) {
        keybd_event(VK_CONTROL, 0x1D, 0, 0);
        Sleep(25);
        keybd_event(VK_INSERT, 0x52, 0, 0);
        Sleep(45);
        keybd_event(VK_INSERT, 0x52, KEYEVENTF_KEYUP, 0);
        Sleep(20);
        keybd_event(VK_CONTROL, 0x1D, KEYEVENTF_KEYUP, 0);

        for (int i = 0; i < 15; i++) {
            Sleep(15);
            if (GetClipboardSequenceNumber() != seqBefore) {
                std::wstring text = readClipboardText();
                if (!text.empty()) {
                    wcsncpy_s(outBuffer, maxChars, text.c_str(), _TRUNCATE);
                    return static_cast<int>(wcslen(outBuffer));
                }
            }
        }
    }

    // Strict invariant: Never return old/stale clipboard text!
    outBuffer[0] = L'\0';
    return 0;
}

__declspec(dllexport) int __stdcall AutoCopySelectedTextW(wchar_t* outBuffer, int maxChars, DWORD callerPid, HWND targetHwnd) {
    return AutoCopySelectedTextExW(outBuffer, maxChars, callerPid, targetHwnd, g_electronPid);
}

__declspec(dllexport) int __stdcall AutoCopySelectedTextUtf8(char* outBuffer, int maxBytes, DWORD callerPid, HWND targetHwnd) {
    if (!outBuffer || maxBytes <= 1) return 0;
    outBuffer[0] = '\0';

    wchar_t wbuf[32768] = {};
    int wlen = AutoCopySelectedTextW(wbuf, 32768, callerPid, targetHwnd);
    if (wlen <= 0) return 0;

    int written = WideCharToMultiByte(CP_UTF8, 0, wbuf, wlen, outBuffer, maxBytes - 1, nullptr, nullptr);
    if (written > 0) {
        outBuffer[written] = '\0';
        return written;
    }
    return 0;
}

__declspec(dllexport) void __stdcall MakeWindowTopmost(HWND hWnd) {
    if (!hWnd || !IsWindow(hWnd)) return;
    LONG_PTR exStyle = GetWindowLongPtrW(hWnd, GWL_EXSTYLE);
    SetWindowLongPtrW(hWnd, GWL_EXSTYLE, exStyle | WS_EX_TOPMOST);
    SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
}

__declspec(dllexport) void __stdcall ReleaseModifierKeys() {
    keybd_event(VK_CAPITAL, 0x3A, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_CONTROL, 0x1D, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_MENU, 0x38, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_SHIFT, 0x2A, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_LWIN, 0x5B, KEYEVENTF_KEYUP, 0);
    keybd_event(VK_RWIN, 0x5C, KEYEVENTF_KEYUP, 0);
}

__declspec(dllexport) int __stdcall IsMouseClickedOutside(int tbX, int tbY, int tbW, int tbH) {
    bool leftDown = (GetAsyncKeyState(VK_LBUTTON) & 0x8000) != 0;
    bool rightDown = (GetAsyncKeyState(VK_RBUTTON) & 0x8000) != 0;
    if (!leftDown && !rightDown) return 0;

    POINT pt;
    if (!GetCursorPos(&pt)) return 0;

    if (pt.x < tbX || pt.x > (tbX + tbW) || pt.y < tbY || pt.y > (tbY + tbH)) {
        return 1;
    }
    return 0;
}

__declspec(dllexport) int __stdcall GetSelectedTextDirectUtf8(char* outBuffer, int maxBytes) {
    return AutoCopySelectedTextUtf8(outBuffer, maxBytes, g_callerPid, nullptr);
}

// === IN-PROCESS WIN32 LOW-LEVEL KEYBOARD & MOUSE HOOK ENGINE ===
// Eliminates separate helper .exe process (hotkey_hook.exe) completely.
// Runs low-level WH_KEYBOARD_LL + WH_MOUSE_LL + RegisterHotKey in a background thread with Win32 message loop.

struct ComboSpec {
    bool hasCtrl;
    bool hasAlt;
    bool hasShift;
    bool hasWin;
    DWORD vk;
};

static ComboSpec ParseCombo(const char* rawCombo, DWORD defaultVk, bool defCtrl, bool defAlt, bool defShift) {
    ComboSpec spec = { false, false, false, false, 0 };
    if (!rawCombo || !rawCombo[0]) {
        spec.hasCtrl = defCtrl;
        spec.hasAlt = defAlt;
        spec.hasShift = defShift;
        spec.vk = defaultVk;
        return spec;
    }

    std::string s = rawCombo;
    std::string upper;
    for (char c : s) {
        if (!isspace((unsigned char)c)) {
            upper += (char)toupper((unsigned char)c);
        }
    }

    if (upper.find("CTRL") != std::string::npos ||
        upper.find("CONTROL") != std::string::npos ||
        upper.find("COMMANDORCONTROL") != std::string::npos ||
        upper.find("CMD") != std::string::npos) {
        spec.hasCtrl = true;
    }
    if (upper.find("ALT") != std::string::npos || upper.find("MENU") != std::string::npos) {
        spec.hasAlt = true;
    }
    if (upper.find("SHIFT") != std::string::npos) {
        spec.hasShift = true;
    }
    if (upper.find("WIN") != std::string::npos) {
        spec.hasWin = true;
    }

    size_t lastPlus = upper.rfind('+');
    std::string keyPart = (lastPlus != std::string::npos) ? upper.substr(lastPlus + 1) : upper;

    if (keyPart == "CAPITAL" || keyPart == "CAPS" || keyPart == "CAPSLOCK") {
        spec.vk = VK_CAPITAL;
    } else if (keyPart == "SPACE") {
        spec.vk = VK_SPACE;
    } else if (keyPart == "ESC" || keyPart == "ESCAPE") {
        spec.vk = VK_ESCAPE;
    } else if (keyPart == "TAB") {
        spec.vk = VK_TAB;
    } else if (keyPart == "ENTER" || keyPart == "RETURN") {
        spec.vk = VK_RETURN;
    } else if (keyPart.length() == 1 && keyPart[0] >= 'A' && keyPart[0] <= 'Z') {
        spec.vk = (DWORD)keyPart[0];
    } else if (keyPart.length() == 1 && keyPart[0] >= '0' && keyPart[0] <= '9') {
        spec.vk = (DWORD)keyPart[0];
    } else if (keyPart.length() >= 2 && keyPart[0] == 'F') {
        int fNum = atoi(keyPart.c_str() + 1);
        if (fNum >= 1 && fNum <= 24) {
            spec.vk = VK_F1 + (fNum - 1);
        } else {
            spec.vk = defaultVk;
        }
    } else {
        spec.vk = defaultVk;
    }

    return spec;
}

static bool CheckComboMatch(const ComboSpec& spec, DWORD vkCode, bool isCtrl, bool isAlt, bool isShift, bool isWin) {
    if (spec.vk == 0) return false;
    if (spec.hasCtrl != isCtrl) return false;
    if (spec.hasAlt != isAlt) return false;
    if (spec.hasShift != isShift) return false;
    if (spec.hasWin != isWin) return false;
    return (vkCode == spec.vk);
}

struct NativeEvent {
    int type; // 1 = SNIP, 2 = QUICK_TEXT, 3 = CLICK_OUTSIDE
    std::string text;
};

static CRITICAL_SECTION g_eventLock;
static bool g_eventLockInitialized = false;
static std::vector<NativeEvent> g_eventQueue;

static void EnsureEventLock() {
    if (!g_eventLockInitialized) {
        InitializeCriticalSection(&g_eventLock);
        g_eventLockInitialized = true;
    }
}

static void PushNativeEvent(int type, const std::string& text) {
    EnsureEventLock();
    EnterCriticalSection(&g_eventLock);
    if (g_eventQueue.size() < 100) {
        g_eventQueue.push_back({ type, text });
    }
    LeaveCriticalSection(&g_eventLock);
}

static ComboSpec g_snipCombo = { false, true, true, false, 0x53 }; // Alt+Shift+S
static ComboSpec g_quickTextCombo = { true, false, false, false, VK_CAPITAL }; // Ctrl+CapsLock
static ULONGLONG g_lastQuickTextTrigger = 0;
static ULONGLONG g_lastSnipTrigger = 0;
static HWND g_lastTargetAppHwnd = NULL;

static HMODULE g_hModule = NULL;
static HHOOK g_hKeyboardHook = NULL;
static HHOOK g_hMouseHook = NULL;
static HANDLE g_hHookThread = NULL;
static DWORD g_hookThreadId = 0;
static HWND g_hHiddenWnd = NULL;
static volatile bool g_hookRunning = false;

static volatile bool g_toolbarActive = false;
static volatile int g_tbX = 0, g_tbY = 0, g_tbW = 0, g_tbH = 0;
static volatile ULONGLONG g_toolbarActivatedTime = 0;

static DWORD WINAPI QuickTextCaptureWorkerThread(LPVOID lpParam) {
    HWND targetWin = (HWND)lpParam;
    char textBuf[32768] = {};
    AutoCopySelectedTextUtf8(textBuf, sizeof(textBuf), g_callerPid, targetWin);
    PushNativeEvent(2, textBuf); // 2 = EVENT_QUICK_TEXT
    return 0;
}

static volatile int g_dbgKeyCount = 0;

static LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    g_dbgKeyCount++;
    if (nCode >= 0 && (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN)) {
        KBDLLHOOKSTRUCT* kbd = (KBDLLHOOKSTRUCT*)lParam;
        DWORD vkCode = kbd->vkCode;

        bool isCtrl = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0 ||
                      (GetAsyncKeyState(VK_LCONTROL) & 0x8000) != 0 ||
                      (GetAsyncKeyState(VK_RCONTROL) & 0x8000) != 0 ||
                      (GetKeyState(VK_CONTROL) & 0x8000) != 0;
        bool isAlt = ((kbd->flags & 0x20) != 0) ||
                     (GetAsyncKeyState(VK_MENU) & 0x8000) != 0 ||
                     (GetAsyncKeyState(VK_LMENU) & 0x8000) != 0 ||
                     (GetAsyncKeyState(VK_RMENU) & 0x8000) != 0 ||
                     (GetKeyState(VK_MENU) & 0x8000) != 0;
        bool isShift = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0 ||
                       (GetAsyncKeyState(VK_LSHIFT) & 0x8000) != 0 ||
                       (GetAsyncKeyState(VK_RSHIFT) & 0x8000) != 0 ||
                       (GetKeyState(VK_SHIFT) & 0x8000) != 0;
        bool isWin = (GetAsyncKeyState(VK_LWIN) & 0x8000) != 0 ||
                     (GetAsyncKeyState(VK_RWIN) & 0x8000) != 0;

        HWND curFg = GetForegroundWindow();
        if (curFg && !isAppWindow(curFg)) {
            g_lastTargetAppHwnd = curFg;
        }

        // 1. QUICK TEXT ASK: Ctrl + CapsLock (or configured combo)
        bool isCaps = (vkCode == VK_CAPITAL);
        bool isQuickTextMatch = CheckComboMatch(g_quickTextCombo, vkCode, isCtrl, isAlt, isShift, isWin) ||
                               (isCaps && isCtrl && !isAlt && !isShift);

        // Also check if CapsLock is physically held and Ctrl is pressed
        if (!isQuickTextMatch && (vkCode == VK_CONTROL || vkCode == VK_LCONTROL || vkCode == VK_RCONTROL)) {
            bool isCapsHeld = (GetAsyncKeyState(VK_CAPITAL) & 0x8000) != 0;
            if (isCapsHeld && !isAlt && !isShift) {
                isQuickTextMatch = true;
            }
        }

        if (isQuickTextMatch) {
            ULONGLONG now = GetTickCount64();
            if (now - g_lastQuickTextTrigger > 250) {
                g_lastQuickTextTrigger = now;
                HWND targetWin = g_lastTargetAppHwnd;
                CreateThread(NULL, 0, QuickTextCaptureWorkerThread, (LPVOID)targetWin, 0, NULL);
            }
            // Suppress CapsLock toggle in Windows!
            return 1;
        }

        // Ignore standalone modifiers for snip check
        if (vkCode == VK_CONTROL || vkCode == VK_LCONTROL || vkCode == VK_RCONTROL ||
            vkCode == VK_SHIFT || vkCode == VK_LSHIFT || vkCode == VK_RSHIFT ||
            vkCode == VK_MENU || vkCode == VK_LMENU || vkCode == VK_RMENU ||
            vkCode == VK_LWIN || vkCode == VK_RWIN) {
            return CallNextHookEx(g_hKeyboardHook, nCode, wParam, lParam);
        }

        // 2. SCREEN SNIP: Alt + Shift + S (or configured combo)
        bool isSnipMatch = CheckComboMatch(g_snipCombo, vkCode, isCtrl, isAlt, isShift, isWin);
        if (isSnipMatch) {
            ULONGLONG now = GetTickCount64();
            if (now - g_lastSnipTrigger > 300) {
                g_lastSnipTrigger = now;
                PushNativeEvent(1, ""); // 1 = EVENT_SNIP
            }
        }
    }
    return CallNextHookEx(g_hKeyboardHook, nCode, wParam, lParam);
}

static LRESULT CALLBACK LowLevelMouseProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0 && g_toolbarActive) {
        if (wParam == WM_LBUTTONDOWN || wParam == WM_RBUTTONDOWN || wParam == WM_MBUTTONDOWN ||
            wParam == WM_NCLBUTTONDOWN || wParam == WM_NCRBUTTONDOWN) {
            ULONGLONG now = GetTickCount64();
            if (now - g_toolbarActivatedTime > 200) {
                MSLLHOOKSTRUCT* ms = (MSLLHOOKSTRUCT*)lParam;
                int clickX = ms->pt.x;
                int clickY = ms->pt.y;
                if (clickX < g_tbX || clickX > (g_tbX + g_tbW) || clickY < g_tbY || clickY > (g_tbY + g_tbH)) {
                    PushNativeEvent(3, ""); // 3 = EVENT_CLICK_OUTSIDE
                }
            }
        }
    }
    return CallNextHookEx(g_hMouseHook, nCode, wParam, lParam);
}

static void RegisterHotKeysOnWindow(HWND hWnd) {
    UnregisterHotKey(hWnd, 9001);
    UnregisterHotKey(hWnd, 9002);

    UINT quickMod = MOD_NOREPEAT;
    if (g_quickTextCombo.hasCtrl) quickMod |= MOD_CONTROL;
    if (g_quickTextCombo.hasAlt) quickMod |= MOD_ALT;
    if (g_quickTextCombo.hasShift) quickMod |= MOD_SHIFT;
    if (g_quickTextCombo.hasWin) quickMod |= MOD_WIN;
    if (g_quickTextCombo.vk) {
        RegisterHotKey(hWnd, 9001, quickMod, g_quickTextCombo.vk);
    }

    UINT snipMod = MOD_NOREPEAT;
    if (g_snipCombo.hasCtrl) snipMod |= MOD_CONTROL;
    if (g_snipCombo.hasAlt) snipMod |= MOD_ALT;
    if (g_snipCombo.hasShift) snipMod |= MOD_SHIFT;
    if (g_snipCombo.hasWin) snipMod |= MOD_WIN;
    if (g_snipCombo.vk) {
        RegisterHotKey(hWnd, 9002, snipMod, g_snipCombo.vk);
    }
}

static LRESULT CALLBACK HiddenWndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
    if (message == WM_HOTKEY) {
        int id = (int)wParam;
        if (id == 9001) { // QuickText
            ULONGLONG now = GetTickCount64();
            if (now - g_lastQuickTextTrigger > 250) {
                g_lastQuickTextTrigger = now;
                HWND targetWin = g_lastTargetAppHwnd;
                CreateThread(NULL, 0, QuickTextCaptureWorkerThread, (LPVOID)targetWin, 0, NULL);
            }
        } else if (id == 9002) { // Snip
            ULONGLONG now = GetTickCount64();
            if (now - g_lastSnipTrigger > 300) {
                g_lastSnipTrigger = now;
                PushNativeEvent(1, "");
            }
        }
        return 0;
    }
    return DefWindowProcW(hWnd, message, wParam, lParam);
}

static DWORD WINAPI KeyboardHookThread(LPVOID lpParam) {
    g_hookThreadId = GetCurrentThreadId();

    if (!g_hModule) {
        g_hModule = GetModuleHandleW(L"GeminiTextCopy.dll");
        if (!g_hModule) {
            g_hModule = GetModuleHandleW(NULL);
        }
    }

    WNDCLASSEXW wc = { sizeof(WNDCLASSEXW) };
    wc.lpfnWndProc = HiddenWndProc;
    wc.hInstance = g_hModule;
    wc.lpszClassName = L"SnapMindNativeHookMsgWnd";
    RegisterClassExW(&wc);

    g_hHiddenWnd = CreateWindowExW(0, wc.lpszClassName, L"SnapMindMsg", 0, 0, 0, 0, 0, HWND_MESSAGE, NULL, wc.hInstance, NULL);
    RegisterHotKeysOnWindow(g_hHiddenWnd);
    RegisterHotKeysOnWindow(NULL);

    g_hKeyboardHook = SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc, g_hModule, 0);
    g_hMouseHook = SetWindowsHookExW(WH_MOUSE_LL, LowLevelMouseProc, g_hModule, 0);

    g_hookRunning = true;

    while (true) {
        DWORD waitRes = MsgWaitForMultipleObjectsEx(0, NULL, 20, QS_ALLINPUT, MWMO_ALERTABLE);

        // 1. Process all pending Win32 messages (WM_HOTKEY, WM_QUIT, etc.)
        MSG msg;
        while (PeekMessageW(&msg, NULL, 0, 0, PM_REMOVE)) {
            if (msg.message == WM_QUIT) {
                goto thread_exit;
            }
            if (msg.message == WM_HOTKEY) {
                int id = (int)msg.wParam;
                if (id == 9001) {
                    ULONGLONG now = GetTickCount64();
                    if (now - g_lastQuickTextTrigger > 250) {
                        g_lastQuickTextTrigger = now;
                        HWND targetWin = g_lastTargetAppHwnd;
                        CreateThread(NULL, 0, QuickTextCaptureWorkerThread, (LPVOID)targetWin, 0, NULL);
                    }
                } else if (id == 9002) {
                    ULONGLONG now = GetTickCount64();
                    if (now - g_lastSnipTrigger > 300) {
                        g_lastSnipTrigger = now;
                        PushNativeEvent(1, "");
                    }
                }
            }
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        // 2. Hardware-level physical key state check (Triple-layer unblockable backup)
        bool isCtrl = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0 ||
                      (GetAsyncKeyState(VK_LCONTROL) & 0x8000) != 0 ||
                      (GetAsyncKeyState(VK_RCONTROL) & 0x8000) != 0;
        bool isAlt = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0 ||
                     (GetAsyncKeyState(VK_LMENU) & 0x8000) != 0 ||
                     (GetAsyncKeyState(VK_RMENU) & 0x8000) != 0;
        bool isShift = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0 ||
                       (GetAsyncKeyState(VK_LSHIFT) & 0x8000) != 0 ||
                       (GetAsyncKeyState(VK_RSHIFT) & 0x8000) != 0;
        bool isWin = (GetAsyncKeyState(VK_LWIN) & 0x8000) != 0 ||
                     (GetAsyncKeyState(VK_RWIN) & 0x8000) != 0;

        // Check Quick Text combo (Ctrl + CapsLock or configured combo)
        bool isCaps = (GetAsyncKeyState(VK_CAPITAL) & 0x8000) != 0;
        bool isQuickTextHard = (isCaps && isCtrl && !isAlt && !isShift);
        if (!isQuickTextHard && g_quickTextCombo.vk) {
            bool vkDown = (GetAsyncKeyState(g_quickTextCombo.vk) & 0x8000) != 0;
            if (vkDown && (g_quickTextCombo.hasCtrl == isCtrl) && (g_quickTextCombo.hasAlt == isAlt) &&
                (g_quickTextCombo.hasShift == isShift) && (g_quickTextCombo.hasWin == isWin)) {
                isQuickTextHard = true;
            }
        }

        if (isQuickTextHard) {
            ULONGLONG now = GetTickCount64();
            if (now - g_lastQuickTextTrigger > 300) {
                g_lastQuickTextTrigger = now;
                HWND curFg = GetForegroundWindow();
                if (curFg && !isAppWindow(curFg)) g_lastTargetAppHwnd = curFg;
                HWND targetWin = g_lastTargetAppHwnd;
                CreateThread(NULL, 0, QuickTextCaptureWorkerThread, (LPVOID)targetWin, 0, NULL);
            }
        }

        // Check Snip combo (Alt + Shift + S or configured combo)
        bool isSnipHard = false;
        if (g_snipCombo.vk) {
            bool vkDown = (GetAsyncKeyState(g_snipCombo.vk) & 0x8000) != 0;
            if (vkDown && (g_snipCombo.hasCtrl == isCtrl) && (g_snipCombo.hasAlt == isAlt) &&
                (g_snipCombo.hasShift == isShift) && (g_snipCombo.hasWin == isWin)) {
                isSnipHard = true;
            }
        } else {
            bool sDown = (GetAsyncKeyState(0x53) & 0x8000) != 0;
            if (sDown && isAlt && isShift && !isCtrl) {
                isSnipHard = true;
            }
        }

        if (isSnipHard) {
            ULONGLONG now = GetTickCount64();
            if (now - g_lastSnipTrigger > 350) {
                g_lastSnipTrigger = now;
                PushNativeEvent(1, ""); // 1 = EVENT_SNIP
            }
        }
    }

thread_exit:
    if (g_hKeyboardHook) {
        UnhookWindowsHookEx(g_hKeyboardHook);
        g_hKeyboardHook = NULL;
    }
    if (g_hMouseHook) {
        UnhookWindowsHookEx(g_hMouseHook);
        g_hMouseHook = NULL;
    }
    if (g_hHiddenWnd) {
        UnregisterHotKey(g_hHiddenWnd, 9001);
        UnregisterHotKey(g_hHiddenWnd, 9002);
        DestroyWindow(g_hHiddenWnd);
        g_hHiddenWnd = NULL;
    }
    UnregisterClassW(L"SnapMindNativeHookMsgWnd", wc.hInstance);

    g_hookRunning = false;
    return 0;
}

static void StopNativeKeyboardHookInternal() {
    if (g_hookThreadId) {
        PostThreadMessageW(g_hookThreadId, WM_QUIT, 0, 0);
        if (g_hHookThread) {
            WaitForSingleObject(g_hHookThread, 1000);
            CloseHandle(g_hHookThread);
            g_hHookThread = NULL;
        }
        g_hookThreadId = 0;
    }
    g_hookRunning = false;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    if (fdwReason == DLL_PROCESS_ATTACH) {
        g_hModule = (HMODULE)hinstDLL;
        DisableThreadLibraryCalls(hinstDLL);
        EnsureEventLock();
    } else if (fdwReason == DLL_PROCESS_DETACH) {
        StopNativeKeyboardHookInternal();
        if (g_eventLockInitialized) {
            DeleteCriticalSection(&g_eventLock);
            g_eventLockInitialized = false;
        }
    }
    return TRUE;
}

__declspec(dllexport) int __stdcall StartNativeKeyboardHook(const char* snipCombo, const char* quickCombo, DWORD electronPid) {
    EnsureEventLock();
    if (electronPid) {
        g_electronPid = electronPid;
        g_callerPid = electronPid;
    }

    g_snipCombo = ParseCombo(snipCombo, 0x53, false, true, true); // Alt+Shift+S
    g_quickTextCombo = ParseCombo(quickCombo, VK_CAPITAL, true, false, false); // Ctrl+CapsLock

    if (g_hookRunning && g_hHookThread) {
        if (g_hHiddenWnd) {
            RegisterHotKeysOnWindow(g_hHiddenWnd);
        }
        return 1;
    }

    StopNativeKeyboardHookInternal();

    g_hHookThread = CreateThread(NULL, 0, KeyboardHookThread, NULL, 0, NULL);
    if (!g_hHookThread) return 0;

    for (int i = 0; i < 50; i++) {
        Sleep(10);
        if (g_hookRunning) return 1;
    }
    return g_hookRunning ? 1 : 0;
}

__declspec(dllexport) void __stdcall StopNativeKeyboardHook() {
    StopNativeKeyboardHookInternal();
}

__declspec(dllexport) void __stdcall UpdateHotkeyCombos(const char* snipCombo, const char* quickCombo) {
    g_snipCombo = ParseCombo(snipCombo, 0x53, false, true, true);
    g_quickTextCombo = ParseCombo(quickCombo, VK_CAPITAL, true, false, false);
    if (g_hHiddenWnd) {
        RegisterHotKeysOnWindow(g_hHiddenWnd);
    }
}

__declspec(dllexport) void __stdcall SetToolbarActiveState(int active, int x, int y, int w, int h) {
    g_toolbarActive = (active != 0);
    g_tbX = x;
    g_tbY = y;
    g_tbW = w;
    g_tbH = h;
    if (active) {
        g_toolbarActivatedTime = GetTickCount64();
    }
}

__declspec(dllexport) int __stdcall PollHotkeyEvent(int* outType, char* outTextBuffer, int maxBytes) {
    EnsureEventLock();
    if (!outType) return 0;
    *outType = 0;
    if (outTextBuffer && maxBytes > 0) outTextBuffer[0] = '\0';

    EnterCriticalSection(&g_eventLock);
    if (!g_eventQueue.empty()) {
        NativeEvent evt = g_eventQueue.front();
        g_eventQueue.erase(g_eventQueue.begin());
        LeaveCriticalSection(&g_eventLock);

        *outType = evt.type;
        if (outTextBuffer && maxBytes > 0) {
            strncpy_s(outTextBuffer, maxBytes, evt.text.c_str(), _TRUNCATE);
        }
        return evt.type;
    }
    LeaveCriticalSection(&g_eventLock);
    return 0;
}

__declspec(dllexport) int __stdcall GetDebugKeyCount() {
    return g_dbgKeyCount;
}

__declspec(dllexport) int __stdcall IsNativeHookRunning() {
    return g_hookRunning ? 1 : 0;
}

__declspec(dllexport) void __stdcall GetHookDiagnostics(char* outBuf, int maxBytes) {
    if (!outBuf || maxBytes <= 0) return;
    snprintf(outBuf, maxBytes, "hMod=%p hook=%p mouseHook=%p running=%d threadId=%lu err=%lu",
        g_hModule, g_hKeyboardHook, g_hMouseHook, g_hookRunning ? 1 : 0, g_hookThreadId, GetLastError());
}

__declspec(dllexport) void __stdcall SimulateHotkeyTrigger(int triggerType, const char* optionalText) {
    if (triggerType == 1) {
        PushNativeEvent(1, "");
    } else if (triggerType == 2) {
        PushNativeEvent(2, (optionalText && optionalText[0]) ? optionalText : "Simulated text for unit testing");
    } else if (triggerType == 3) {
        PushNativeEvent(3, "");
    }
}

} // extern "C"
