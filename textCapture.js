// === ROBUST AUTO-COPY & CLIPBOARD EXTRACTION MODULE (textCapture.js) ===
// Implements multi-tiered reliable text selection capture with multi-layer fallbacks

const { clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const nativeBridge = require('./nativeBridge');

let activeClipboardBackup = null;
let activeToolbarCapturedText = '';

function getNativeHookExePath() {
  const localExe = path.join(__dirname, 'hotkey_hook.exe');
  if (fs.existsSync(localExe)) return localExe;
  if (process.resourcesPath) {
    const resExe = path.join(process.resourcesPath, 'hotkey_hook.exe');
    if (fs.existsSync(resExe)) return resExe;
  }
  return null;
}

/**
 * ดึงข้อความจากคลิปบอร์ดแบบ Multi-Format (Plain Text -> HTML -> RTF)
 * เพื่อรองรับโปรแกรมที่ส่งข้อมูลเฉพาะฟอร์แมต Rich Text / HTML เช่น Word, Outlook, Browser
 */
function extractTextFromClipboard() {
  try {
    const raw = (clipboard.readText() || '').trim();
    if (raw) return raw;

    // ระบบสำรอง 1: สกัด Plain text จาก HTML
    const html = clipboard.readHTML() || '';
    if (html) {
      const stripped = html.replace(/<style[\s\S]*?<\/style>/gi, '')
                           .replace(/<script[\s\S]*?<\/script>/gi, '')
                           .replace(/<[^>]+>/g, ' ')
                           .replace(/&nbsp;/gi, ' ')
                           .replace(/&amp;/gi, '&')
                           .replace(/&lt;/gi, '<')
                           .replace(/&gt;/gi, '>')
                           .replace(/&quot;/gi, '"')
                           .replace(/\s+/g, ' ')
                           .trim();
      if (stripped) return stripped;
    }

    // ระบบสำรอง 2: สกัดจาก RTF
    const rtf = clipboard.readRTF() || '';
    if (rtf) {
      const strippedRtf = rtf.replace(/\{\\[\s\S]*?\}/g, '')
                             .replace(/\\[a-z0-9-]+\s?/gi, '')
                             .replace(/[{}]/g, '')
                             .replace(/\s+/g, ' ')
                             .trim();
      if (strippedRtf) return strippedRtf;
    }
  } catch (e) {}
  return '';
}

/**
 * ขั้นตอนที่ 1: สำรองข้อมูลคลิปบอร์ดเดิม (Backup Clipboard)
 * บันทึกข้อมูล Clipboard ปัจจุบันของผู้ใช้ทั้ง Text, HTML, RTF เก็บไว้ใน Memory Buffer
 */
function backupClipboard() {
  const backup = {
    text: '',
    html: '',
    rtf: '',
    hasData: false
  };

  try {
    backup.text = clipboard.readText() || '';
    backup.html = clipboard.readHTML() || '';
    backup.rtf = clipboard.readRTF() || '';
    backup.hasData = Boolean(backup.text || backup.html || backup.rtf);
  } catch (err) {
    console.warn('[textCapture] Error backing up clipboard:', err);
  }

  return backup;
}

/**
 * ขั้นตอนที่ 2: เคลียร์สถานะปุ่มกด (Release Modifier Keys)
 * ส่งคำสั่ง RELEASE_MODIFIERS ผ่าน background hook stdin ตัวเดิมเท่านั้น
 * ห้ามเปิด Process ใหม่เด็ดขาด เพื่อไม่ให้หน้าต่างเป้าหมายหลุดโฟกัส
 */
async function releaseModifierKeys(nativeHookProcess = null) {
  if (nativeBridge && nativeBridge.isDllAvailable()) {
    nativeBridge.releaseModifiersNative();
  }
  if (nativeHookProcess && !nativeHookProcess.killed && nativeHookProcess.stdin) {
    try {
      nativeHookProcess.stdin.write("RELEASE_MODIFIERS\n");
    } catch (e) {}
  }
}

/**
 * ขั้นตอนที่ 3: จำลองการกด Ctrl + C (Simulate Copy Input)
 * ส่งคำสั่ง COPY ผ่าน background hook process stdin ตัวเดิมเท่านั้น
 * ห้าม spawn child process (เช่น exec powershell หรือ exec hotkey_hook.exe --copy) เด็ดขาด เพื่อไม่ให้หน้าต่างเป้าหมายหลุดโฟกัส
 */
async function simulateCopyInput(nativeHookProcess = null) {
  if (nativeHookProcess && !nativeHookProcess.killed && nativeHookProcess.stdin) {
    try {
      nativeHookProcess.stdin.write("COPY\n");
    } catch (e) {}
  }
}

/**
 * ขั้นตอนที่ 5: กู้คืนคลิปบอร์ดเดิม (Restore Original Clipboard)
 * คืนค่าข้อมูลที่สำรองไว้ในขั้นตอนที่ 1 กลับเข้า Clipboard ของผู้ใช้
 */
function restoreClipboard(backup, delayMs = 250) {
  if (!backup) return;

  setTimeout(() => {
    try {
      if (backup.hasData) {
        if (backup.html || backup.rtf) {
          clipboard.write({
            text: backup.text || '',
            html: backup.html || '',
            rtf: backup.rtf || ''
          });
        } else if (backup.text) {
          clipboard.writeText(backup.text);
        }
      } else {
        clipboard.clear();
      }
    } catch (err) {
      console.warn('[textCapture] Error restoring clipboard backup:', err);
    }
  }, delayMs);
}

/**
 * กู้คืนคลิปบอร์ดเดิมที่สำรองไว้ในหน่วยความจำทันที (เมื่อปิด Toolbar หรือเริ่มส่งคำถาม AI)
 */
function restoreActiveClipboard() {
  if (activeClipboardBackup) {
    try {
      if (activeClipboardBackup.hasData) {
        if (activeClipboardBackup.html || activeClipboardBackup.rtf) {
          clipboard.write({
            text: activeClipboardBackup.text || '',
            html: activeClipboardBackup.html || '',
            rtf: activeClipboardBackup.rtf || ''
          });
        } else if (activeClipboardBackup.text) {
          clipboard.writeText(activeClipboardBackup.text);
        }
      } else {
        clipboard.clear();
      }
    } catch (err) {
      console.warn('[textCapture] Error restoring active clipboard:', err);
    }
    activeClipboardBackup = null;
  }
}

function getActiveToolbarCapturedText() {
  return activeToolbarCapturedText;
}

function setActiveToolbarCapturedText(text) {
  activeToolbarCapturedText = (text || '').trim();
}

/**
 * ระบบจำลองการคัดลอกข้อความที่คลุมดำอัตโนมัติ พร้อมระบบสำรองหลายชั้น (Multi-Tiered Redundancy)
 *
 * @param {Object} [options]
 * @param {ChildProcess} [options.nativeHookProcess] Process ของ hotkey_hook
 * @param {string} [options.lastCapturedHookText] ข้อความที่ Hook ส่งมาก่อนหน้า (ถ้ามี)
 * @param {Function} [options.getLatestHookText] ฟังก์ชันดึงข้อความล่าสุดจาก Hook
 * @param {number} [options.pollIntervalMs=20] ความถี่ในการ Polling
 * @param {number} [options.maxTimeoutMs=360] เวลารอสูงสุด
 * @param {number} [options.restoreDelayMs] หน่วงเวลาก่อน Restore Clipboard เดิม (ถ้าไม่ระบุ จะ deferRestore)
 * @param {boolean} [options.deferRestore] เลื่อนการ Restore ไปจนกว่าจะปิด Toolbar หรือส่ง AI
 * @returns {Promise<string>} ข้อความที่คลุมดำ (หรือ "" หากไม่มีการเลือก)
 */
async function captureSelectedText(options = {}) {
  const pollInterval = options.pollIntervalMs || 20;
  const maxTimeout = options.maxTimeoutMs || 360;
  const nativeHookProcess = options.nativeHookProcess || null;
  // หาก deferRestore เป็น true หรือไม่ได้ระบุ restoreDelayMs ชัดเจน จะเลื่อนการคืนค่าไม่ให้ลบทับข้อความเร็วเกินไป
  const deferRestore = options.deferRestore !== undefined ? options.deferRestore : (options.restoreDelayMs === undefined);

  // ----------------------------------------------------
  // ขั้นตอนที่ 1: สำรองข้อมูลคลิปบอร์ดเดิม (Backup Clipboard)
  // ----------------------------------------------------
  const backup = backupClipboard();
  activeClipboardBackup = backup;
  const initialText = (backup.text || '').trim();

  try {
    // ----------------------------------------------------
    // ขั้นตอนที่ 0: ดึงข้อความผ่าน In-Process Native DLL (GeminiTextCopy.dll) โดยตรง
    // ----------------------------------------------------
    if (nativeBridge && nativeBridge.isDllAvailable()) {
      nativeBridge.releaseModifiersNative();
      const direct = nativeBridge.copySelectedTextNative();
      if (direct && direct.trim().length > 0) {
        activeToolbarCapturedText = direct.trim();
        return direct.trim();
      }
    }

    // ----------------------------------------------------
    // ขั้นตอนที่ 2: เคลียร์สถานะปุ่มกด (Release Modifier Keys)
    // ----------------------------------------------------
    await releaseModifierKeys(nativeHookProcess);

    // ----------------------------------------------------
    // ขั้นตอนที่ 3: จำลองการกด Ctrl + C ชั้นที่ 1
    // ----------------------------------------------------
    await simulateCopyInput(nativeHookProcess);

    // ----------------------------------------------------
    // ขั้นตอนที่ 4: ดักจับและอ่านข้อความ พร้อมระบบสำรองตรวจเช็คหลายชั้น
    // ----------------------------------------------------
    let capturedText = '';
    const pollRounds = Math.ceil(maxTimeout / pollInterval);
    let backupPulseSent = false;

    for (let i = 0; i < pollRounds; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      // ตรวจสอบว่า Hook ดักจับส่งมาแล้วหรือไม่
      if (options.getLatestHookText) {
        const hookText = options.getLatestHookText();
        if (hookText && hookText.trim()) {
          capturedText = hookText.trim();
          break;
        }
      }

      // ตรวจสอบ Clipboard ปัจจุบันผ่าน Multi-Format Extraction (เฉพาะเมื่อเนื้อหาเปลี่ยนแปลงจากเดิม)
      try {
        const currentClip = extractTextFromClipboard();
        if (currentClip && currentClip.trim().length > 0 && currentClip.trim() !== initialText) {
          capturedText = currentClip.trim();
          break;
        }
      } catch (e) {}

      // ระบบสำรองขณะ Polling: หากผ่านไป 120ms (รอบที่ 6) แล้วยังไม่ได้ข้อความ
      // ให้ส่ง Backup Copy Pulse กระตุ้นอีก 1 ครั้ง
      if (!capturedText && i === 6 && !backupPulseSent) {
        backupPulseSent = true;
        simulateCopyInput(nativeHookProcess).catch(() => {});
      }
    }

    // ระบบสำรองขั้นที่ 2: ตรวจสอบจาก Hook text
    if (!capturedText && options.getLatestHookText) {
      const hookText = options.getLatestHookText();
      if (hookText && hookText.trim().length > 0) {
        capturedText = hookText.trim();
      }
    }

    // ระบบสำรองขั้นที่ 3: ตรวจสอบ Multi-Format อีกครั้งเฉพาะเมื่อต่างจากข้อมูลเดิม
    if (!capturedText) {
      const finalClip = extractTextFromClipboard();
      if (finalClip && finalClip.trim().length > 0 && finalClip.trim() !== initialText) {
        capturedText = finalClip.trim();
      }
    }

    const trimmed = (capturedText || '').trim();
    if (trimmed && trimmed.length > 0) {
      activeToolbarCapturedText = trimmed;
    }

    // ----------------------------------------------------
    // ขั้นตอนที่ 5: กู้คืนคลิปบอร์ดเดิม (Restore Original Clipboard)
    // ----------------------------------------------------
    // ห้ามคืนค่าหรือล้าง Clipboard ทิ้งภายใน 250ms ขณะที่ Toolbar ยังเปิดใช้งานอยู่!
    // เก็บข้อความไว้ใน Memory ตลอดอายุการเปิดแถบ Toolbar เพื่อให้ผู้ใช้คลิกเปลี่ยนปุ่มคำสั่งซ้ำๆ ได้
    if (!deferRestore && options.restoreDelayMs !== undefined) {
      restoreClipboard(backup, options.restoreDelayMs);
    }

    return trimmed;
  } catch (err) {
    console.error('[textCapture] Exception in captureSelectedText:', err);
    // ในกรณีเกิดข้อผิดพลาด หากไม่ได้สั่ง deferRestore ให้กู้คืนคลิปบอร์ดเดิม
    if (!deferRestore) {
      restoreClipboard(backup, 50);
    }
    return '';
  }
}

module.exports = {
  captureSelectedText,
  backupClipboard,
  releaseModifierKeys,
  simulateCopyInput,
  restoreClipboard,
  restoreActiveClipboard,
  getActiveToolbarCapturedText,
  setActiveToolbarCapturedText,
  extractTextFromClipboard,
  getNativeHookExePath
};
