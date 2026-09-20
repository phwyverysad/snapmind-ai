using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class TestDiscordCopy
{
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern uint GetClipboardSequenceNumber();

    [DllImport("user32.dll")]
    public static extern bool OpenClipboard(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool CloseClipboard();

    [DllImport("user32.dll")]
    public static extern IntPtr GetClipboardData(uint uFormat);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GlobalLock(IntPtr hMem);

    [DllImport("kernel32.dll")]
    public static extern bool GlobalUnlock(IntPtr hMem);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

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

    static string GetClip()
    {
        if (OpenClipboard(IntPtr.Zero))
        {
            try
            {
                IntPtr h = GetClipboardData(13);
                if (h != IntPtr.Zero)
                {
                    IntPtr p = GlobalLock(h);
                    if (p != IntPtr.Zero)
                    {
                        try { return Marshal.PtrToStringUni(p); }
                        finally { GlobalUnlock(h); }
                    }
                }
            }
            finally { CloseClipboard(); }
        }
        return "";
    }

    public static void Main()
    {
        Console.WriteLine("====================================================");
        Console.WriteLine(">>> PLEASE SWITCH TO DISCORD AND SELECT TEXT NOW <<<");
        Console.WriteLine(">>> YOU HAVE 5 SECONDS...                        <<<");
        Console.WriteLine("====================================================");

        for (int i = 5; i >= 1; i--)
        {
            Console.WriteLine("Counting down: " + i + "...");
            Thread.Sleep(1000);
        }

        IntPtr fg = GetForegroundWindow();
        uint pid;
        GetWindowThreadProcessId(fg, out pid);
        string procName = "unknown";
        try { procName = Process.GetProcessById((int)pid).ProcessName; } catch { }

        StringBuilder title = new StringBuilder(256);
        GetWindowText(fg, title, 256);
        StringBuilder cls = new StringBuilder(256);
        GetClassName(fg, cls, 256);

        Console.WriteLine("\n[Captured Foreground Window]");
        Console.WriteLine("HWND: " + fg);
        Console.WriteLine("Process: " + procName + " (PID " + pid + ")");
        Console.WriteLine("Title: " + title);
        Console.WriteLine("Class: " + cls);

        uint seqBefore = GetClipboardSequenceNumber();
        Console.WriteLine("\nSequence before: " + seqBefore);

        // Send pristine Ctrl+C
        Console.WriteLine("Sending Ctrl+C via keybd_event...");
        keybd_event(0x11, 0x1D, 0, 0); // Ctrl DOWN
        Thread.Sleep(30);
        keybd_event(0x43, 0x2E, 0, 0); // C DOWN
        Thread.Sleep(50);
        keybd_event(0x43, 0x2E, 2, 0); // C UP
        Thread.Sleep(30);
        keybd_event(0x11, 0x1D, 2, 0); // Ctrl UP

        // Wait up to 500ms
        bool ok = false;
        for (int i = 0; i < 25; i++)
        {
            Thread.Sleep(20);
            uint seqAfter = GetClipboardSequenceNumber();
            if (seqAfter != seqBefore)
            {
                ok = true;
                Console.WriteLine("\n🎉 SUCCESS! Clipboard sequence changed to: " + seqAfter);
                Console.WriteLine("Copied text: [" + GetClip() + "]");
                break;
            }
        }

        if (!ok)
        {
            Console.WriteLine("\n❌ Sequence DID NOT change with keybd_event.");
            Console.WriteLine("Trying SendInput with ScanCodes...");

            uint seqBefore2 = GetClipboardSequenceNumber();
            INPUT[] inps = new INPUT[4];
            inps[0].type = 1;
            inps[0].u.ki.wScan = 0x1D;
            inps[0].u.ki.dwFlags = 0x0008; // KEYEVENTF_SCANCODE

            inps[1].type = 1;
            inps[1].u.ki.wScan = 0x2E;
            inps[1].u.ki.dwFlags = 0x0008;

            inps[2].type = 1;
            inps[2].u.ki.wScan = 0x2E;
            inps[2].u.ki.dwFlags = 0x0008 | 0x0002; // KEYEVENTF_KEYUP

            inps[3].type = 1;
            inps[3].u.ki.wScan = 0x1D;
            inps[3].u.ki.dwFlags = 0x0008 | 0x0002;

            SendInput(1, new INPUT[] { inps[0] }, Marshal.SizeOf(typeof(INPUT)));
            Thread.Sleep(30);
            SendInput(1, new INPUT[] { inps[1] }, Marshal.SizeOf(typeof(INPUT)));
            Thread.Sleep(50);
            SendInput(1, new INPUT[] { inps[2] }, Marshal.SizeOf(typeof(INPUT)));
            Thread.Sleep(30);
            SendInput(1, new INPUT[] { inps[3] }, Marshal.SizeOf(typeof(INPUT)));

            for (int i = 0; i < 25; i++)
            {
                Thread.Sleep(20);
                uint seqAfter2 = GetClipboardSequenceNumber();
                if (seqAfter2 != seqBefore2)
                {
                    ok = true;
                    Console.WriteLine("\n🎉 SUCCESS with SendInput! Seq: " + seqAfter2);
                    Console.WriteLine("Copied text: [" + GetClip() + "]");
                    break;
                }
            }
        }

        if (!ok)
        {
            Console.WriteLine("\n❌ SendInput also did not change sequence.");
            Console.WriteLine("Trying SendMessage WM_COPY directly to focused window...");
            // Let's inspect GUIThreadInfo
        }
    }
}
