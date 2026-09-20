<div align="center">

# SnapMind AI

**Instant AI Screen Scanner, Text Capture, and Real-Time Translation powered by Google Gemini API**

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?style=flat-square&logo=windows&logoColor=white)](https://github.com/phwyverysad/snapmind-ai)
[![Built With](https://img.shields.io/badge/Built%20With-Electron%20%7C%20Node.js%20%7C%20Gemini%20API-FFC131?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Languages](https://img.shields.io/badge/Languages-TH%20%7C%20EN-5c5ce0?style=flat-square)](https://github.com/phwyverysad/snapmind-ai)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Download](https://img.shields.io/badge/Download-Latest%20Release-brightgreen?style=flat-square)](https://github.com/phwyverysad/snapmind-ai/releases/latest)

</div>

---

## Overview
**SnapMind AI** is a high-performance desktop assistant for Windows built with Electron, native Win32 C++ DLLs, and Google Gemini API. It enables users to instantly snip any display region, extract unselectable text from protected apps, games, or videos, and receive immediate AI-powered answers, literal translations, summaries, code analyses, and conversational follow-ups with real-time token streaming and zero latency.

---

## Key Features

### Instant Screen Snipping (`Alt+Shift+S`)
* **0ms Latency Launch**: Snip tool opens instantaneously with native OS crosshair cursor, smooth drag coordinates, and zero screen tearing or flicker.
* **5 Parallel AI Categories**: Processes screen snips simultaneously into organized tabs:
  * **คำตอบ**: Direct answers and step-by-step problem solving.
  * **อธิบาย**: Clear, detailed conceptual breakdowns.
  * **สรุป**: High-yield key points and summaries.
  * **แปลภาษา**: 100% Thai-only literal translation (no unprompted category generation).
  * **ข้อความ OCR**: Precise verbatim character-by-character text extraction.
* **Interactive Follow-Up Chat**: Continue conversations directly below results with full multi-turn conversational context.

### Floating Quick AI Toolbar (`Ctrl+CapsLock`)
* **Smart Text Grabber**: Extracts selected text from any active application without losing focus using in-process native Win32 DLL hooks (`GeminiTextCopy.dll`).
* **Clean Borderless Floating Pill**: Floats contextually below selections with 9 instant 1-click keyboard shortcuts:
  * `[ 1 ] คำตอบ` — Answer questions or solve problems directly
  * `[ 2 ] อธิบาย` — Explain text clearly and concisely
  * `[ 3 ] สรุป` — Summarize key takeaways
  * `[ 4 ] แปลภาษา` — 100% Verbatim Thai translation
  * `[ 5 ] ปรับปรุงการเขียน` — Grammar correction and text proofreading
  * `[ 6 ] ทำให้สั้นลง` — Shorten and condense text
  * `[ 7 ] OCR` — Exact text extraction
  * `[ 8 ] เขียนต่อ` — Smooth sentence and paragraph continuation
  * `[ 9 ] คือ` — Definitions and conceptual background
  * `[ ? ] ถามเอง` — Inline custom prompt input bar
  * `[ Esc ] ยกเลิก` — Dismiss toolbar

### Flagship Google Gemini Models
* **`gemini-3.8-flash` (Default)**: Next-generation ultra-fast multimodal model designed for lightning-fast answers, vision reasoning, and high throughput.
* **`gemini-3.5-flash-lite`**: Lightweight, cost-effective model optimized for instant text processing with the lowest latency.
* **`gemini-3.1-pro-preview`**: Flagship reasoning model with full **Thinking Process Accordion** support for complex logic, math, and coding queries.

### Built-in Gemini Grounding Tools
* **Google Search Grounding**: Live web search integration for up-to-date facts and citations.
* **Code Execution Sandbox**: Run and verify Python code snippets directly in Gemini responses.
* **URL Context Analysis**: Fetch and synthesize web page content directly from links.
* **Google Maps Grounding**: Accurate geospatial queries and location-aware recommendations.
* **File Search / RAG Store**: Vector knowledge search powered by `models/gemini-embedding-2`.

### Windows Native Architecture & Settings
* **In-Process DLL Bridge**: Powered by native C++ (`GeminiTextCopy.dll`) and C# (`hotkey_hook.dll`) loaded via Koffi FFI — zero external `.exe` child processes in Task Manager.
* **Windows Startup (Auto-Launch)**: Configurable option in settings and system tray to launch minimized on boot (`app.setLoginItemSettings`).
* **Wide Rectangular Settings (920px)**: Clean dual-column configuration panel with zero emojis, custom prompt editor, and model switcher.
* **Official Program Files Installation**: Installs cleanly into `C:\Program Files\SnapMind AI` via lightweight Web Setup.

---

## Downloads
Download the latest release from [GitHub Releases](https://github.com/phwyverysad/snapmind-ai/releases/latest):

| File | Size | Type |
| :--- | :---: | :--- |
| **`SnapMind_AI_WebSetup.exe`** | **~1.7 MB** | **Web Installer (Recommended)** Ultra-compact installer that pulls the package from GitHub Releases directly into `C:\Program Files\SnapMind AI`. |
| **`SnapMind-AI-Portable.exe`** | **~67 MB** | **Standalone Portable Executable** Runs immediately without installation or admin privileges. |
| **`snapmind-ai-1.0.0-x64.nsis.7z`** | **~61.7 MB** | **Application Package Archive** Compressed core application package utilized by the Web Installer. |

---

### Run from Source Code
```bash
# Clone repository and install dependencies
git clone https://github.com/phwyverysad/snapmind-ai.git
cd snapmind-ai
npm install

# Start in development mode
npm start
```

### Build Commands
```bash
# Build the Web Installer (downloads package archive from GitHub Releases)
npm run dist

# Build offline standalone installer (all-in-one setup)
npm run dist:offline
```

---

This project is licensed under the [MIT License](LICENSE) - Copyright (c) 2026 phwyverysad
