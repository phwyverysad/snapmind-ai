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
**SnapMind AI** is a lightweight, responsive desktop assistant for Windows built with Electron and Google Gemini API. It allows you to instantly snip any area of your screen, capture unselectable text from games, videos, or protected documents, and immediately analyze, translate, explain, or process it using customizable AI prompts and streaming responses with zero latency.

---

## Key Features
* **Instant Screen Snipping**: Capture any region on your display with intuitive drag-and-drop selection, smooth real-time crosshair guides, and zero flicker.
* **Smart Text Capture (OCR & Clipboard Engine)**: Native high-speed text grabber utilizing Win32 API and Koffi DLL integration for seamless unselectable text extraction without losing window focus.
* **Floating AI Quick Toolbar**: Contextual floating action bar appearing directly beneath selections with instant one-click actions: Translate, Explain, Grammar, Code Analysis, and Custom Ask.
* **Powered by Google Gemini 2.5**: Full support for `gemini-2.5-flash`, `gemini-2.5-flash-lite`, and `gemini-2.5-pro` with real-time token streaming and thinking mode control.
* **Custom Prompts & Category Manager**: Organize prompts into customizable tabs (Translate, Summarize, Code, Writing) with wide rectangular layout and easy editing.
* **Windows Startup Integration (Auto-Launch)**: Configurable option in settings and system tray to automatically start minimized in the background on Windows boot.
* **System Tray & Global Hotkeys**: Runs quietly in the notification tray with configurable global hotkeys (`Ctrl+Q`, `Ctrl+Shift+S`, `Ctrl+Caps`) for immediate snip and query.
* **Ultra-Lightweight Web Installer**: Compact NSIS web installer that pulls package archives smoothly from GitHub Releases directly to `C:\Program Files\SnapMind AI`.

---

## Downloads
Download the latest version from [GitHub Releases](https://github.com/phwyverysad/snapmind-ai/releases/latest):

| File | Size | Type |
| :--- | :---: | :--- |
| **`SnapMind_AI_WebSetup.exe`** | **~2 MB** | **Web Installer (Recommended)** Lightweight installer that downloads and installs the latest release into `C:\Program Files`. |
| **`SnapMind-AI-Portable.exe`** | **~67 MB** | **Standalone Portable Executable** Runs immediately without installation or admin privileges. |
| **`snapmind-ai-1.0.0-x64.nsis.7z`** | **~63 MB** | **Application Package Archive** Compressed core application package utilized by the Web Installer. |

---

### Run from Source Code
```bash
# Clone the repository and install dependencies
git clone https://github.com/phwyverysad/snapmind-ai.git
cd snapmind-ai
npm install

# Start the application in development mode
npm start
```

### Build Commands
```bash
# Build the Web Installer (downloads package from GitHub Releases)
npm run dist

# Build standalone offline installer (all-in-one setup)
npm run dist:offline
```

---

This project is licensed under the [MIT License](LICENSE) - Copyright (c) 2026 phwyverysad
