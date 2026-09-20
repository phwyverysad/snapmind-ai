using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

class NativeHotkeyHook
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_HOTKEY = 0x0312;

    private const uint MOD_ALT = 0x0001;
    private const uint MOD_CONTROL = 0x0002;
    private const uint MOD_SHIFT = 0x0004;
    private const uint MOD_NOREPEAT = 0x4000;

    private const int ID_QUICK_TEXT = 9001;
    private const int ID_SNIP = 9002;

    private const int KEYEVENTF_KEYUP = 0x0002;
    private const byte VK_SHIFT = 0x10;
    private const byte VK_CONTROL = 0x11;
    private const byte VK_MENU = 0x12;
    private const byte VK_CAPITAL = 0x14;
    private const byte VK_C = 0x43;

    private static LowLevelKeyboardProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;
    private static string _snipCombo = "ALT+SHIFT+S";
    private static string _quickTextCombo = "CTRL+CAPITAL";
    private static DateTime _lastSnipTrigger = DateTime.MinValue;
    private static DateTime _lastQuickTextTrigger = DateTime.MinValue;

    private const int WH_MOUSE_LL = 14;
    private const int WM_LBUTTONDOWN = 0x0201;
    private const int WM_RBUTTONDOWN = 0x0204;
    private const int WM_MBUTTONDOWN = 0x0207;
    private const int WM_NCLBUTTONDOWN = 0x00A1;
    private const int WM_NCRBUTTONDOWN = 0x00A4;

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSLLHOOKSTRUCT
    {
        public POINT pt;
        public uint mouseData;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static LowLevelMouseProc _mouseProc = MouseHookCallback;
    private static IntPtr _mouseHookID = IntPtr.Zero;

    private static volatile bool _toolbarActive = false;
    private static volatile int _tbX = 0;
    private static volatile int _tbY = 0;
    private static volatile int _tbW = 0;
    private static volatile int _tbH = 0;
    private static volatile int _toolbarActivatedTimestamp = 0;

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

    [DllImport("user32.dll")]
    private static extern uint MapVirtualKey(uint uCode, uint uMapType);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    private static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern uint GetClipboardSequenceNumber();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool OpenClipboard(IntPtr hWndNewOwner);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool CloseClipboard();

    [DllImport("user32.dll")]
    private static extern IntPtr GetClipboardData(uint uFormat);

    [DllImport("kernel32.dll")]
    private static extern IntPtr GlobalLock(IntPtr hMem);

    [DllImport("kernel32.dll")]
    private static extern bool GlobalUnlock(IntPtr hMem);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll", EntryPoint = "GetWindowLong", SetLastError = true)]
    private static extern int GetWindowLong32(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr", SetLastError = true)]
    private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLong", SetLastError = true)]
    private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr", SetLastError = true)]
    private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    private static IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex)
    {
        if (IntPtr.Size == 8)
            return GetWindowLongPtr64(hWnd, nIndex);
        return new IntPtr(GetWindowLong32(hWnd, nIndex));
    }

    private static IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong)
    {
        if (IntPtr.Size == 8)
            return SetWindowLongPtr64(hWnd, nIndex, dwNewLong);
        return new IntPtr(SetWindowLong32(hWnd, nIndex, dwNewLong.ToInt32()));
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION
    {
        [FieldOffset(0)]
        public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT
    {
        public uint type;
        public INPUTUNION u;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("GeminiTextCopy.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern void SetAppProcessIds(uint callerPid, uint electronPid);

    [DllImport("GeminiTextCopy.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.StdCall)]
    public static extern int AutoCopySelectedTextExW([Out] System.Text.StringBuilder outBuffer, int maxChars, uint callerPid, IntPtr targetHwnd, uint electronPid);

    [DllImport("GeminiTextCopy.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.StdCall)]
    public static extern int AutoCopySelectedTextW([Out] System.Text.StringBuilder outBuffer, int maxChars, uint callerPid, IntPtr targetHwnd);

    public static void SendKeyInput(ushort vk, ushort scan, bool keyUp, bool extended = false)
    {
        try
        {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = 1; // INPUT_KEYBOARD
            inputs[0].u.ki.wVk = vk;
            inputs[0].u.ki.wScan = scan;
            uint flags = 0;
            if (keyUp) flags |= 0x0002;
            if (extended) flags |= 0x0001;
            inputs[0].u.ki.dwFlags = flags;
            inputs[0].u.ki.time = 0;
            inputs[0].u.ki.dwExtraInfo = IntPtr.Zero;
            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }
        catch { }
    }

    private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const uint SWP_SHOWWINDOW = 0x0040;
    private const int GWL_EXSTYLE = -20;
    private const int WS_EX_TOPMOST = 0x00000008;

    public static void MakeWindowTopmost(IntPtr hWnd)
    {
        if (hWnd == IntPtr.Zero) return;
        try
        {
            long exStyle = GetWindowLongPtr(hWnd, GWL_EXSTYLE).ToInt64();
            SetWindowLongPtr(hWnd, GWL_EXSTYLE, new IntPtr(exStyle | WS_EX_TOPMOST));
            int exStyleCompat = GetWindowLong(hWnd, GWL_EXSTYLE);
            SetWindowLong(hWnd, GWL_EXSTYLE, exStyleCompat | WS_EX_TOPMOST);
            SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
        }
        catch { }
    }

    private static void WaitForModifierKeysRelease(int maxMs = 500)
    {
        int waited = 0;
        while (waited < maxMs)
        {
            bool ctrlHeld = (GetAsyncKeyState(0x11) & 0x8000) != 0 ||
                            (GetAsyncKeyState(0xA2) & 0x8000) != 0 ||
                            (GetAsyncKeyState(0xA3) & 0x8000) != 0;
            bool capsHeld = (GetAsyncKeyState(0x14) & 0x8000) != 0;
            if (!ctrlHeld && !capsHeld) break;
            Thread.Sleep(15);
            waited += 15;
        }
    }

    public static void ReleaseModifierKeys()
    {
        try
        {
            WaitForModifierKeysRelease(500);

            keybd_event(VK_CAPITAL, 0x3A, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_CONTROL, 0x1D, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_MENU, 0x38, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_SHIFT, 0x2A, KEYEVENTF_KEYUP, 0);
        }
        catch { }
    }

    private const uint CF_UNICODETEXT = 13;

    private static uint _electronPid = 0;
    private static IntPtr _lastTargetAppHwnd = IntPtr.Zero;
    private static readonly object _copyLock = new object();

    public static bool IsAppWindow(IntPtr hWnd)
    {
        if (hWnd == IntPtr.Zero) return true;
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        return IsAppProcess(pid);
    }

    public static bool IsAppProcess(uint pid)
    {
        if (pid == 0 || pid == 4) return true;
        uint myPid = (uint)Process.GetCurrentProcess().Id;
        if (pid == myPid) return true;
        if (_electronPid != 0 && pid == _electronPid) return true;

        try
        {
            using (Process p = Process.GetProcessById((int)pid))
            {
                string pName = p.ProcessName.ToLower();
                if (pName.Contains("snapmind") || pName.Contains("hotkey_hook")) return true;
                if (pName.Contains("electron"))
                {
                    if (_electronPid != 0) return true;
                }
            }
        }
        catch { }

        return false;
    }

    public static string ReadClipboardDirect()
    {
        for (int i = 0; i < 8; i++)
        {
            if (OpenClipboard(IntPtr.Zero))
            {
                try
                {
                    IntPtr hData = GetClipboardData(CF_UNICODETEXT);
                    if (hData != IntPtr.Zero)
                    {
                        IntPtr ptr = GlobalLock(hData);
                        if (ptr != IntPtr.Zero)
                        {
                            try
                            {
                                return Marshal.PtrToStringUni(ptr);
                            }
                            finally
                            {
                                GlobalUnlock(hData);
                            }
                        }
                    }
                }
                finally
                {
                    CloseClipboard();
                }
            }
            Thread.Sleep(15);
        }
        return null;
    }

    private const byte VK_INSERT = 0x2D;

    public static string CaptureSelectedText(IntPtr targetHwnd = default(IntPtr))
    {
        lock (_copyLock)
        {
            if ((targetHwnd == IntPtr.Zero || IsAppWindow(targetHwnd)) && _lastTargetAppHwnd != IntPtr.Zero && !IsAppWindow(_lastTargetAppHwnd))
            {
                targetHwnd = _lastTargetAppHwnd;
            }

            // 1. Primary: Use proven native Win32 Gemini C++ engine (GeminiTextCopy.dll)
            try
            {
                System.Text.StringBuilder sb = new System.Text.StringBuilder(32768);
                uint myPid = (uint)Process.GetCurrentProcess().Id;
                int len = AutoCopySelectedTextExW(sb, sb.Capacity, myPid, targetHwnd, _electronPid);
                if (len > 0)
                {
                    string res = sb.ToString();
                    if (!string.IsNullOrEmpty(res))
                    {
                        return res.Trim();
                    }
                }
            }
            catch
            {
                try
                {
                    System.Text.StringBuilder sb = new System.Text.StringBuilder(32768);
                    uint myPid = (uint)Process.GetCurrentProcess().Id;
                    int len = AutoCopySelectedTextW(sb, sb.Capacity, myPid, targetHwnd);
                    if (len > 0)
                    {
                        string res = sb.ToString();
                        if (!string.IsNullOrEmpty(res))
                        {
                            return res.Trim();
                        }
                    }
                }
                catch { }
            }

            // 2. Fallback: Internal Win32 keybd_event sequence
            EnsureTargetForeground();
            if (_lastTargetAppHwnd != IntPtr.Zero && !IsAppWindow(_lastTargetAppHwnd) && GetForegroundWindow() != _lastTargetAppHwnd)
            {
                SetForegroundWindow(_lastTargetAppHwnd);
                BringWindowToTop(_lastTargetAppHwnd);
                Thread.Sleep(20);
            }

            int waited = 0;
            while (waited < 300)
            {
                bool caps = (GetAsyncKeyState(0x14) & 0x8000) != 0;
                bool alt = (GetAsyncKeyState(0x12) & 0x8000) != 0;
                bool shift = (GetAsyncKeyState(0x10) & 0x8000) != 0;
                if (!caps && !alt && !shift) break;
                Thread.Sleep(15);
                waited += 15;
            }

            keybd_event((byte)0x14, 0x3A, 2, 0); // CapsLock UP
            keybd_event((byte)0x11, 0x1D, 2, 0); // Ctrl UP
            keybd_event((byte)0x12, 0x38, 2, 0); // Alt UP
            keybd_event((byte)0x10, 0x2A, 2, 0); // Shift UP
            Thread.Sleep(20);

            uint seqBefore = GetClipboardSequenceNumber();

            // Send pristine Ctrl+C with 45ms hold duration
            keybd_event((byte)0x11, 0x1D, 0, 0); // Ctrl DOWN
            Thread.Sleep(25);
            keybd_event((byte)0x43, 0x2E, 0, 0); // C DOWN
            Thread.Sleep(35);
            keybd_event((byte)0x43, 0x2E, 2, 0); // C UP
            Thread.Sleep(25);
            keybd_event((byte)0x11, 0x1D, 2, 0); // Ctrl UP
            Thread.Sleep(20);

            for (int i = 0; i < 20; i++)
            {
                Thread.Sleep(15);
                uint seqNow = GetClipboardSequenceNumber();
                if (seqNow != seqBefore)
                {
                    Thread.Sleep(20);
                    string txt = ReadClipboardDirect();
                    if (!string.IsNullOrEmpty(txt)) return txt.Trim();
                }
            }

            return "";
        }
    }

    private class HiddenMessageForm : Form
    {
        public HiddenMessageForm()
        {
            this.WindowState = FormWindowState.Minimized;
            this.ShowInTaskbar = false;
            this.Visible = false;
            this.FormBorderStyle = FormBorderStyle.None;
            this.Size = new System.Drawing.Size(0, 0);

            RegisterWin32Hotkeys();
        }

        private void RegisterWin32Hotkeys()
        {
            try
            {
                // Register QuickText: Ctrl + CapsLock (VK_CAPITAL = 0x14)
                uint quickMod = MOD_CONTROL | MOD_NOREPEAT;
                uint quickVk = VK_CAPITAL;
                ParseComboToModifiersAndKey(_quickTextCombo, out quickMod, out quickVk);
                bool regQuick = RegisterHotKey(this.Handle, ID_QUICK_TEXT, quickMod | MOD_NOREPEAT, quickVk);
                if (regQuick)
                {
                    // Successfully registered OS hotkey
                }

                // Register Snip: Alt + Shift + S (default) or custom
                uint snipMod = MOD_ALT | MOD_SHIFT | MOD_NOREPEAT;
                uint snipVk = 0x53; // 'S'
                ParseComboToModifiersAndKey(_snipCombo, out snipMod, out snipVk);
                RegisterHotKey(this.Handle, ID_SNIP, snipMod | MOD_NOREPEAT, snipVk);
            }
            catch { }
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_HOTKEY)
            {
                int id = m.WParam.ToInt32();
                if (id == ID_QUICK_TEXT)
                {
                    FireQuickTextTrigger();
                }
                else if (id == ID_SNIP)
                {
                    FireSnipTrigger();
                }
            }
            base.WndProc(ref m);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            try
            {
                UnregisterHotKey(this.Handle, ID_QUICK_TEXT);
                UnregisterHotKey(this.Handle, ID_SNIP);
            }
            catch { }
            base.OnFormClosing(e);
        }
    }
 
    public static void Main(string[] args)
    {
        if (args.Length > 0 && args[0] == "--release-modifiers")
        {
            ReleaseModifierKeys();
            return;
        }

        if (args.Length > 0 && args[0] == "--topmost")
        {
            if (args.Length > 1)
            {
                long hwndVal;
                if (long.TryParse(args[1], out hwndVal))
                {
                    MakeWindowTopmost(new IntPtr(hwndVal));
                }
            }
            return;
        }

        if (args.Length > 0 && args[0] == "--copy")
        {
            string txt = CaptureSelectedText();
            if (!string.IsNullOrEmpty(txt))
            {
                Console.WriteLine(txt);
            }
            return;
        }

        if (args.Length > 0 && !string.IsNullOrEmpty(args[0]))
        {
            _snipCombo = NormalizeCombo(args[0]);
        }

        if (args.Length > 1 && !string.IsNullOrEmpty(args[1]))
        {
            _quickTextCombo = NormalizeCombo(args[1]);
        }

        if (args.Length > 2 && !string.IsNullOrEmpty(args[2]))
        {
            uint ep;
            if (uint.TryParse(args[2], out ep))
            {
                _electronPid = ep;
                try { SetAppProcessIds((uint)Process.GetCurrentProcess().Id, _electronPid); } catch { }
            }
        }

        _hookID = SetHook(_proc);

        Console.WriteLine("HOTKEY_HOOK_READY:SNIP=" + _snipCombo + ";QUICK_TEXT=" + _quickTextCombo);
        Console.Out.Flush();

        // Background thread reading commands on stdin like "COPY", "RELEASE_MODIFIERS", or "TOPMOST"
        Thread stdinThread = new Thread(() =>
        {
            try
            {
                string line;
                while ((line = Console.ReadLine()) != null)
                {
                    string cmd = line.Trim().ToUpper();
                    if (cmd.StartsWith("TOPMOST"))
                    {
                        string[] parts = line.Trim().Split(' ');
                        if (parts.Length > 1)
                        {
                            long hwndVal;
                            if (long.TryParse(parts[1], out hwndVal))
                            {
                                MakeWindowTopmost(new IntPtr(hwndVal));
                                Console.WriteLine("TOPMOST_COMPLETED");
                                Console.Out.Flush();
                            }
                        }
                    }
                    else if (cmd.StartsWith("SET_ELECTRON_PID"))
                    {
                        string[] parts = line.Trim().Split(' ');
                        if (parts.Length > 1)
                        {
                            uint ep;
                            if (uint.TryParse(parts[1], out ep))
                            {
                                _electronPid = ep;
                                try { SetAppProcessIds((uint)Process.GetCurrentProcess().Id, _electronPid); } catch { }
                            }
                        }
                    }
                    else if (cmd == "RELEASE_MODIFIERS")
                    {
                        ReleaseModifierKeys();
                        Console.WriteLine("MODIFIERS_RELEASED");
                        Console.Out.Flush();
                    }
                    else if (cmd == "COPY")
                    {
                        string captured = CaptureSelectedText();
                        if (!string.IsNullOrEmpty(captured))
                        {
                            byte[] utf8 = System.Text.Encoding.UTF8.GetBytes(captured);
                            string b64 = Convert.ToBase64String(utf8);
                            Console.WriteLine("COPY_RESULT:" + b64);
                        }
                        else
                        {
                            Console.WriteLine("COPY_RESULT:NONE");
                        }
                        Console.WriteLine("COPY_COMPLETED");
                        Console.Out.Flush();
                    }
                }
                Application.Exit();
            }
            catch { Application.Exit(); }
        });
        stdinThread.IsBackground = true;
        stdinThread.Start();

        var form = new HiddenMessageForm();
        IntPtr forceHandle = form.Handle; // Force HWND creation for RegisterHotKey & WndProc
        Application.Run(); // Run standard Win32 message loop indefinitely!

        if (_hookID != IntPtr.Zero)
        {
            UnhookWindowsHookEx(_hookID);
        }
    }

    private static string NormalizeCombo(string raw)
    {
        return raw.ToUpper()
                  .Replace(" ", "")
                  .Replace("COMMANDORCONTROL", "CTRL")
                  .Replace("CONTROL", "CTRL")
                  .Replace("CMD", "CTRL")
                  .Replace("CAPSLOCK", "CAPITAL")
                  .Replace("CAPS", "CAPITAL");
    }

    private static void ParseComboToModifiersAndKey(string combo, out uint modifiers, out uint vk)
    {
        modifiers = 0;
        vk = 0;

        if (combo.Contains("CTRL")) modifiers |= MOD_CONTROL;
        if (combo.Contains("ALT")) modifiers |= MOD_ALT;
        if (combo.Contains("SHIFT")) modifiers |= MOD_SHIFT;

        if (combo.EndsWith("CAPITAL") || combo.EndsWith("CAPS"))
        {
            vk = VK_CAPITAL;
            return;
        }

        if (combo.EndsWith("SPACE"))
        {
            vk = 0x20;
            return;
        }

        string[] parts = combo.Split('+');
        string keyStr = parts[parts.Length - 1];

        if (keyStr.Length == 1 && keyStr[0] >= 'A' && keyStr[0] <= 'Z')
        {
            vk = (uint)keyStr[0];
            return;
        }

        if (keyStr.Length == 1 && keyStr[0] >= '0' && keyStr[0] <= '9')
        {
            vk = (uint)keyStr[0];
            return;
        }

        if (keyStr.StartsWith("F") && keyStr.Length > 1)
        {
            int fNum;
            if (int.TryParse(keyStr.Substring(1), out fNum) && fNum >= 1 && fNum <= 24)
            {
                vk = (uint)(0x70 + (fNum - 1));
                return;
            }
        }

        vk = 0x53; // fallback 'S'
    }

    private static IntPtr SetHook(LowLevelKeyboardProc proc)
    {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule)
        {
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private static IntPtr SetMouseHook(LowLevelMouseProc proc)
    {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule)
        {
            return SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private static IntPtr MouseHookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && _toolbarActive)
        {
            int msg = wParam.ToInt32();
            if (msg == WM_LBUTTONDOWN || msg == WM_RBUTTONDOWN || msg == WM_MBUTTONDOWN || msg == WM_NCLBUTTONDOWN || msg == WM_NCRBUTTONDOWN)
            {
                // Grace period: ignore clicks within 200ms of toolbar activation
                if (Environment.TickCount - _toolbarActivatedTimestamp > 200)
                {
                    try
                    {
                        MSLLHOOKSTRUCT mouseStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
                        int clickX = mouseStruct.pt.x;
                        int clickY = mouseStruct.pt.y;

                        // Check if click is OUTSIDE the active toolbar bounds
                        if (clickX < _tbX || clickX > (_tbX + _tbW) || clickY < _tbY || clickY > (_tbY + _tbH))
                        {
                            Console.WriteLine("CLICK_OUTSIDE_TOOLBAR");
                            Console.Out.Flush();
                        }
                    }
                    catch { }
                }
            }
        }
        return CallNextHookEx(_mouseHookID, nCode, wParam, lParam);
    }

    private static void EnsureTargetForeground()
    {
        if (_lastTargetAppHwnd == IntPtr.Zero || IsAppWindow(_lastTargetAppHwnd)) return;
        IntPtr fg = GetForegroundWindow();
        if (fg == _lastTargetAppHwnd) return;

        try
        {
            SetForegroundWindow(_lastTargetAppHwnd);
            BringWindowToTop(_lastTargetAppHwnd);
        }
        catch { }
    }

    public static void SimulateCtrlC()
    {
        try
        {
            CaptureSelectedText();
        }
        catch { }
    }

    private static void FireQuickTextTrigger()
    {
        if ((DateTime.Now - _lastQuickTextTrigger).TotalMilliseconds > 250)
        {
            _lastQuickTextTrigger = DateTime.Now;

            IntPtr curFg = GetForegroundWindow();
            if (curFg != IntPtr.Zero && !IsAppWindow(curFg))
            {
                _lastTargetAppHwnd = curFg;
            }

            IntPtr targetWin = _lastTargetAppHwnd;

            // 1. INSTANT DISPLAY: Emit trigger to Electron immediately with 0ms delay!
            Console.WriteLine("HOTKEY_TRIGGERED:QUICK_TEXT");
            Console.Out.Flush();

            // 2. Concurrently simulate Ctrl+C and capture text via clipboard sequence number
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    string captured = CaptureSelectedText(targetWin);
                    if (!string.IsNullOrEmpty(captured))
                    {
                        byte[] utf8 = System.Text.Encoding.UTF8.GetBytes(captured);
                        string b64 = Convert.ToBase64String(utf8);
                        Console.WriteLine("QUICK_TEXT_CAPTURED:" + b64);
                        Console.WriteLine("HOTKEY_TRIGGERED_WITH_TEXT:" + b64);
                        Console.Out.Flush();
                    }
                    else
                    {
                        Console.WriteLine("QUICK_TEXT_NONE");
                        Console.WriteLine("HOTKEY_TRIGGERED_WITH_TEXT:");
                        Console.Out.Flush();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("QUICK_TEXT_ERROR:" + ex.Message);
                    Console.WriteLine("HOTKEY_TRIGGERED_WITH_TEXT:");
                    Console.Out.Flush();
                }
            });
        }
    }

    private static void FireSnipTrigger()
    {
        if ((DateTime.Now - _lastSnipTrigger).TotalMilliseconds > 300)
        {
            _lastSnipTrigger = DateTime.Now;
            Console.WriteLine("HOTKEY_TRIGGERED:SNIP");
            Console.WriteLine("HOTKEY_TRIGGERED"); // backward compatibility
            Console.Out.Flush();
        }
    }

    private static bool CheckComboMatch(string combo, Keys key, bool isCtrl, bool isAlt, bool isShift)
    {
        bool reqCtrl = combo.Contains("CTRL");
        bool reqAlt = combo.Contains("ALT");
        bool reqShift = combo.Contains("SHIFT");

        if (isCtrl != reqCtrl || isAlt != reqAlt || isShift != reqShift)
            return false;

        string pressedKeyStr = key.ToString().ToUpper();

        if (combo.EndsWith("SPACE") && (key == Keys.Space))
            return true;

        if ((combo.EndsWith("CAPITAL") || combo.EndsWith("CAPS")) && (key == Keys.Capital))
            return true;

        if (combo.EndsWith("+" + pressedKeyStr) || combo == pressedKeyStr)
            return true;

        if (key >= Keys.D0 && key <= Keys.D9)
        {
            string digitStr = ((int)key - (int)Keys.D0).ToString();
            if (combo.EndsWith("+" + digitStr) || combo == digitStr)
                return true;
        }

        return false;
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN))
        {
            IntPtr curFg = GetForegroundWindow();
            if (curFg != IntPtr.Zero && !IsAppWindow(curFg)) {
                _lastTargetAppHwnd = curFg;
            }

            int vkCode = Marshal.ReadInt32(lParam);
            Keys key = (Keys)vkCode;

            // Check modifiers with physical left/right key state tolerance
            bool isCtrl = (GetAsyncKeyState(0x11) & 0x8000) != 0 || 
                          (GetAsyncKeyState(0xA2) & 0x8000) != 0 || 
                          (GetAsyncKeyState(0xA3) & 0x8000) != 0;
            bool isAlt = (GetAsyncKeyState(0x12) & 0x8000) != 0 || 
                         (GetAsyncKeyState(0xA4) & 0x8000) != 0 || 
                         (GetAsyncKeyState(0xA5) & 0x8000) != 0;
            bool isShift = (GetAsyncKeyState(0x10) & 0x8000) != 0 || 
                           (GetAsyncKeyState(0xA0) & 0x8000) != 0 || 
                           (GetAsyncKeyState(0xA1) & 0x8000) != 0;

            // 1. QUICK TEXT ASK: Ctrl + Caps Lock (VK_CAPITAL = 0x14)
            bool isCaps = (key == Keys.Capital);
            bool isQuickTextMatch = CheckComboMatch(_quickTextCombo, key, isCtrl, isAlt, isShift) ||
                                   (isCaps && isCtrl && !isAlt && !isShift);

            // Also check if CapsLock is physically held and Ctrl is pressed
            if (!isQuickTextMatch && (key == Keys.ControlKey || key == Keys.LControlKey || key == Keys.RControlKey))
            {
                bool isCapsHeld = (GetAsyncKeyState(0x14) & 0x8000) != 0;
                if (isCapsHeld && !isAlt && !isShift)
                {
                    isQuickTextMatch = true;
                }
            }

            if (isQuickTextMatch)
            {
                FireQuickTextTrigger();
                // Suppress CapsLock toggle in Windows so CapsLock light does not flip!
                return (IntPtr)1;
            }

            // Ignore standalone modifier keydowns for snipping check
            if (key == Keys.ControlKey || key == Keys.LControlKey || key == Keys.RControlKey ||
                key == Keys.ShiftKey || key == Keys.LShiftKey || key == Keys.RShiftKey ||
                key == Keys.Menu || key == Keys.LMenu || key == Keys.RMenu ||
                key == Keys.LWin || key == Keys.RWin)
            {
                return CallNextHookEx(_hookID, nCode, wParam, lParam);
            }

            // 2. SCREEN SNIP & ASK: Alt + Shift + S (or custom snip combo)
            bool isSnipMatch = CheckComboMatch(_snipCombo, key, isCtrl, isAlt, isShift);
            if (isSnipMatch)
            {
                FireSnipTrigger();
            }
        }

        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }
}
