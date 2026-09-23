#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#define NOMINMAX
#include <windows.h>
#include <windowsx.h>
#include <objidl.h>
#include <gdiplus.h>
#include <shlobj.h>
#include <commdlg.h>
#include <shellapi.h>
#include <string>
#include <vector>
#include <chrono>
#include <ctime>
#include <algorithm>

#pragma comment(lib, "gdiplus.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "comdlg32.lib")

// Application states
enum class AppState {
    IDLE,
    SELECTING,
    SELECTED
};

// Drag and resize modes
enum DragMode {
    DRAG_NONE = 0,
    DRAG_SELECTING,
    DRAG_MOVE,
    DRAG_RESIZE_L,
    DRAG_RESIZE_R,
    DRAG_RESIZE_T,
    DRAG_RESIZE_B,
    DRAG_RESIZE_TL,
    DRAG_RESIZE_TR,
    DRAG_RESIZE_BL,
    DRAG_RESIZE_BR
};

// Hit zones for edge/corner detection
enum HitZone {
    HIT_NONE = 0,
    HIT_INSIDE,
    HIT_L,
    HIT_R,
    HIT_T,
    HIT_B,
    HIT_TL,
    HIT_TR,
    HIT_BL,
    HIT_BR
};

// Global application variables
HWND g_hOverlayWnd = NULL;
HWND g_hToastWnd = NULL;
AppState g_state = AppState::IDLE;

POINT g_ptStart = { 0, 0 };
POINT g_ptCurrent = { 0, 0 };
RECT g_selectionRect = { 0, 0, 0, 0 };

DragMode g_dragMode = DRAG_NONE;
POINT g_ptDragStart = { 0, 0 };
RECT g_rectBeforeDrag = { 0, 0, 0, 0 };

HBITMAP g_hOriginalBmp = NULL;
HBITMAP g_hDimmedBmp = NULL;
int g_vx = 0, g_vy = 0, g_vw = 0, g_vh = 0;

std::wstring g_lastSavedPath;

// Helper: Normalize rectangle points
RECT NormalizeRect(POINT p1, POINT p2) {
    RECT r;
    r.left   = (std::min)(p1.x, p2.x);
    r.right  = (std::max)(p1.x, p2.x);
    r.top    = (std::min)(p1.y, p2.y);
    r.bottom = (std::max)(p1.y, p2.y);
    return r;
}

// Helper: GDI+ rounded rectangle path
void AddRoundedRectangle(Gdiplus::GraphicsPath& path, Gdiplus::RectF rect, float radius) {
    float diameter = radius * 2.0f;
    if (diameter > rect.Width) diameter = rect.Width;
    if (diameter > rect.Height) diameter = rect.Height;

    path.AddArc(rect.X, rect.Y, diameter, diameter, 180.0f, 90.0f);
    path.AddArc(rect.X + rect.Width - diameter, rect.Y, diameter, diameter, 270.0f, 90.0f);
    path.AddArc(rect.X + rect.Width - diameter, rect.Y + rect.Height - diameter, diameter, diameter, 0.0f, 90.0f);
    path.AddArc(rect.X, rect.Y + rect.Height - diameter, diameter, diameter, 90.0f, 90.0f);
    path.CloseFigure();
}

// Helper: Get GDI+ encoder CLSID
int GetEncoderClsid(const WCHAR* format, CLSID* pClsid) {
    UINT num = 0, size = 0;
    Gdiplus::GetImageEncodersSize(&num, &size);
    if (size == 0) return -1;
    auto pCodec = (Gdiplus::ImageCodecInfo*)(malloc(size));
    if (!pCodec) return -1;
    Gdiplus::GetImageEncoders(num, size, pCodec);
    for (UINT j = 0; j < num; ++j) {
        if (wcscmp(pCodec[j].MimeType, format) == 0) {
            *pClsid = pCodec[j].Clsid;
            free(pCodec);
            return (int)j;
        }
    }
    free(pCodec);
    return -1;
}

// Helper: Timestamp string for filenames
std::wstring GetTimestampString() {
    auto now = std::chrono::system_clock::now();
    std::time_t t = std::chrono::system_clock::to_time_t(now);
    std::tm tm;
    localtime_s(&tm, &t);
    wchar_t buf[64];
    wcsftime(buf, sizeof(buf) / sizeof(buf[0]), L"%Y-%m-%d_%H%M%S", &tm);
    return buf;
}

// Helper: Get default Screenshots directory (Pictures\Screenshots)
std::wstring GetScreenshotsDirectory() {
    PWSTR pPath = NULL;
    std::wstring folder;
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_Pictures, 0, NULL, &pPath))) {
        folder = pPath;
        CoTaskMemFree(pPath);
        folder += L"\\Screenshots";
    } else {
        wchar_t curDir[MAX_PATH];
        GetCurrentDirectoryW(MAX_PATH, curDir);
        folder = std::wstring(curDir) + L"\\Screenshots";
    }
    CreateDirectoryW(folder.c_str(), NULL);
    return folder;
}

// Helper: Detect which edge or corner the mouse is near
HitZone GetHitZone(const RECT& r, POINT pt) {
    const int M = 8; // Hit margin in pixels
    if (pt.x < r.left - M || pt.x > r.right + M ||
        pt.y < r.top - M  || pt.y > r.bottom + M) {
        return HIT_NONE;
    }

    bool nearL = std::abs(pt.x - r.left) <= M;
    bool nearR = std::abs(pt.x - r.right) <= M;
    bool nearT = std::abs(pt.y - r.top) <= M;
    bool nearB = std::abs(pt.y - r.bottom) <= M;

    // Corner detection (takes precedence)
    if (nearL && nearT) return HIT_TL;
    if (nearR && nearT) return HIT_TR;
    if (nearL && nearB) return HIT_BL;
    if (nearR && nearB) return HIT_BR;

    // Edge detection
    if (nearL && pt.y >= r.top - M && pt.y <= r.bottom + M) return HIT_L;
    if (nearR && pt.y >= r.top - M && pt.y <= r.bottom + M) return HIT_R;
    if (nearT && pt.x >= r.left - M && pt.x <= r.right + M) return HIT_T;
    if (nearB && pt.x >= r.left - M && pt.x <= r.right + M) return HIT_B;

    // Inside (drag move)
    if (pt.x > r.left && pt.x < r.right && pt.y > r.top && pt.y < r.bottom) {
        return HIT_INSIDE;
    }

    return HIT_NONE;
}

// Helper: Get appropriate cursor for a hit zone
HCURSOR GetCursorForHitZone(HitZone zone) {
    switch (zone) {
    case HIT_INSIDE: return LoadCursorW(NULL, IDC_SIZEALL);
    case HIT_L:
    case HIT_R:      return LoadCursorW(NULL, IDC_SIZEWE);
    case HIT_T:
    case HIT_B:      return LoadCursorW(NULL, IDC_SIZENS);
    case HIT_TL:
    case HIT_BR:     return LoadCursorW(NULL, IDC_SIZENWSE);
    case HIT_TR:
    case HIT_BL:     return LoadCursorW(NULL, IDC_SIZENESW);
    default:         return LoadCursorW(NULL, IDC_CROSS);
    }
}

// Crop selected area from the full screenshot
HBITMAP CropSelection(RECT r) {
    int w = r.right - r.left;
    int h = r.bottom - r.top;
    if (w <= 0 || h <= 0) return NULL;

    HDC hScreenDC = GetDC(NULL);
    HDC hMemDC = CreateCompatibleDC(hScreenDC);
    HBITMAP hCrop = CreateCompatibleBitmap(hScreenDC, w, h);
    HGDIOBJ hOldCrop = SelectObject(hMemDC, hCrop);

    HDC hOrigDC = CreateCompatibleDC(hScreenDC);
    HGDIOBJ hOldOrig = SelectObject(hOrigDC, g_hOriginalBmp);

    BitBlt(hMemDC, 0, 0, w, h, hOrigDC, r.left, r.top, SRCCOPY);

    SelectObject(hOrigDC, hOldOrig);
    DeleteDC(hOrigDC);
    SelectObject(hMemDC, hOldCrop);
    DeleteDC(hMemDC);
    ReleaseDC(NULL, hScreenDC);

    return hCrop;
}

// Copy HBITMAP to Windows Clipboard with both CF_BITMAP and CF_DIB
bool CopyBitmapToClipboard(HWND hWnd, HBITMAP hBmp, int width, int height) {
    BITMAPINFOHEADER bih = {};
    bih.biSize = sizeof(BITMAPINFOHEADER);
    bih.biWidth = width;
    bih.biHeight = height;
    bih.biPlanes = 1;
    bih.biBitCount = 32;
    bih.biCompression = BI_RGB;
    DWORD dwSizeImage = width * height * 4;
    bih.biSizeImage = dwSizeImage;

    HDC hdc = GetDC(NULL);
    HGLOBAL hDIB = GlobalAlloc(GMEM_MOVEABLE, sizeof(BITMAPINFOHEADER) + dwSizeImage);
    if (hDIB) {
        BYTE* pDIB = (BYTE*)GlobalLock(hDIB);
        if (pDIB) {
            memcpy(pDIB, &bih, sizeof(BITMAPINFOHEADER));
            GetDIBits(hdc, hBmp, 0, height, pDIB + sizeof(BITMAPINFOHEADER), (BITMAPINFO*)&bih, DIB_RGB_COLORS);
            GlobalUnlock(hDIB);
        }
    }
    ReleaseDC(NULL, hdc);

    HBITMAP hBmpCopy = (HBITMAP)CopyImage(hBmp, IMAGE_BITMAP, 0, 0, LR_COPYRETURNORG);

    if (OpenClipboard(hWnd)) {
        EmptyClipboard();
        if (hBmpCopy) SetClipboardData(CF_BITMAP, hBmpCopy);
        if (hDIB) SetClipboardData(CF_DIB, hDIB);
        CloseClipboard();
        return true;
    }
    if (hDIB) GlobalFree(hDIB);
    if (hBmpCopy) DeleteObject(hBmpCopy);
    return false;
}

// Save HBITMAP to image file using GDI+
bool SaveBitmapToFile(HBITMAP hBmp, const std::wstring& filePath, const WCHAR* mimeType = L"image/png") {
    CLSID clsid;
    if (GetEncoderClsid(mimeType, &clsid) < 0) return false;
    Gdiplus::Bitmap* bmp = Gdiplus::Bitmap::FromHBITMAP(hBmp, NULL);
    if (!bmp) return false;
    Gdiplus::Status st = bmp->Save(filePath.c_str(), &clsid, NULL);
    delete bmp;
    return (st == Gdiplus::Ok);
}

// Show standard Save File dialog
bool ShowSaveFileDialog(HWND hWnd, std::wstring& outPath, std::wstring& outMime) {
    wchar_t szFile[MAX_PATH] = L"";
    std::wstring defaultName = L"Screenshot_" + GetTimestampString() + L".png";
    wcscpy_s(szFile, defaultName.c_str());

    OPENFILENAMEW ofn = {};
    ofn.lStructSize = sizeof(ofn);
    ofn.hwndOwner = hWnd;
    ofn.lpstrFile = szFile;
    ofn.nMaxFile = sizeof(szFile) / sizeof(szFile[0]);
    ofn.lpstrFilter = L"PNG Image (*.png)\0*.png\0JPEG Image (*.jpg)\0*.jpg\0Bitmap Image (*.bmp)\0*.bmp\0All Files (*.*)\0*.*\0";
    ofn.nFilterIndex = 1;
    ofn.lpstrDefExt = L"png";
    ofn.Flags = OFN_PATHMUSTEXIST | OFN_OVERWRITEPROMPT;

    std::wstring picDir = GetScreenshotsDirectory();
    ofn.lpstrInitialDir = picDir.c_str();

    auto EndsWith = [](const std::wstring& str, const std::wstring& suffix) -> bool {
        if (suffix.size() > str.size()) return false;
        return std::equal(suffix.rbegin(), suffix.rend(), str.rbegin());
    };

    if (GetSaveFileNameW(&ofn)) {
        outPath = szFile;
        std::wstring lower = outPath;
        for (auto& c : lower) c = towlower(c);
        if (EndsWith(lower, L".jpg") || EndsWith(lower, L".jpeg")) {
            outMime = L"image/jpeg";
        } else if (EndsWith(lower, L".bmp")) {
            outMime = L"image/bmp";
        } else {
            outMime = L"image/png";
        }
        return true;
    }
    return false;
}

// Forward declaration of Toast notification window
void ShowToastNotification(HINSTANCE hInstance, const std::wstring& filePath);

// Execute capture: save and copy to clipboard
void ExecuteCapture(bool showSaveDialog) {
    int w = g_selectionRect.right - g_selectionRect.left;
    int h = g_selectionRect.bottom - g_selectionRect.top;
    if (w < 2 || h < 2) return;

    HBITMAP hCrop = CropSelection(g_selectionRect);
    if (!hCrop) return;

    // Copy to clipboard
    CopyBitmapToClipboard(g_hOverlayWnd, hCrop, w, h);

    std::wstring savePath;
    std::wstring mime = L"image/png";

    if (showSaveDialog) {
        ShowWindow(g_hOverlayWnd, SW_HIDE);
        if (!ShowSaveFileDialog(NULL, savePath, mime)) {
            // User cancelled save dialog -> restore overlay window
            ShowWindow(g_hOverlayWnd, SW_SHOW);
            SetForegroundWindow(g_hOverlayWnd);
            DeleteObject(hCrop);
            return;
        }
    } else {
        std::wstring dir = GetScreenshotsDirectory();
        savePath = dir + L"\\Screenshot_" + GetTimestampString() + L".png";
    }

    if (!savePath.empty()) {
        SaveBitmapToFile(hCrop, savePath, mime.c_str());
        g_lastSavedPath = savePath;
    }

    DeleteObject(hCrop);
    MessageBeep(MB_OK);

    // Hide overlay window immediately to unfreeze screen
    ShowWindow(g_hOverlayWnd, SW_HIDE);

    // Show toast feedback window
    HINSTANCE hInst = (HINSTANCE)GetWindowLongPtr(g_hOverlayWnd, GWLP_HINSTANCE);
    ShowToastNotification(hInst, g_lastSavedPath);
}

// Window Procedure for Overlay Window
LRESULT CALLBACK OverlayWndProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
    case WM_ERASEBKGND:
        return 1;

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hWnd, &ps);

        // Double buffering
        HDC hMemDC = CreateCompatibleDC(hdc);
        HBITMAP hBackBmp = CreateCompatibleBitmap(hdc, g_vw, g_vh);
        HGDIOBJ hOldBmp = SelectObject(hMemDC, hBackBmp);

        // 1. Draw dimmed screenshot as base
        HDC hDimDC = CreateCompatibleDC(hdc);
        HGDIOBJ hOldDim = SelectObject(hDimDC, g_hDimmedBmp);
        BitBlt(hMemDC, 0, 0, g_vw, g_vh, hDimDC, 0, 0, SRCCOPY);
        SelectObject(hDimDC, hOldDim);
        DeleteDC(hDimDC);

        // 2. If selecting or selected, draw clear original screenshot inside selection
        RECT curRect = g_selectionRect;
        int rw = curRect.right - curRect.left;
        int rh = curRect.bottom - curRect.top;

        if ((g_state == AppState::SELECTING || g_state == AppState::SELECTED) && rw > 0 && rh > 0) {
            HDC hOrigDC = CreateCompatibleDC(hdc);
            HGDIOBJ hOldOrig = SelectObject(hOrigDC, g_hOriginalBmp);
            BitBlt(hMemDC, curRect.left, curRect.top, rw, rh, hOrigDC, curRect.left, curRect.top, SRCCOPY);
            SelectObject(hOrigDC, hOldOrig);
            DeleteDC(hOrigDC);

            Gdiplus::Graphics g(hMemDC);

            // Dimension badge (top-left)
            std::wstring dimText = std::to_wstring(rw) + L" × " + std::to_wstring(rh) + L" px";
            Gdiplus::Font badgeFont(L"Segoe UI", 9.0f, Gdiplus::FontStyleBold, Gdiplus::UnitPoint);
            Gdiplus::RectF layoutRect(0, 0, 200, 30);
            Gdiplus::RectF boundRect;
            g.SetTextRenderingHint(Gdiplus::TextRenderingHintClearTypeGridFit);
            g.MeasureString(dimText.c_str(), (int)dimText.length(), &badgeFont, layoutRect, &boundRect);

            float badgeW = boundRect.Width + 14.0f;
            float badgeH = boundRect.Height + 6.0f;
            float badgeX = (float)curRect.left;
            float badgeY = (float)curRect.top - badgeH - 4.0f;
            if (badgeY < 4.0f) badgeY = (float)curRect.top + 4.0f;

            Gdiplus::GraphicsPath badgePath;
            AddRoundedRectangle(badgePath, Gdiplus::RectF(badgeX, badgeY, badgeW, badgeH), 4.0f);
            Gdiplus::SolidBrush badgeBg(Gdiplus::Color(220, 24, 24, 24));
            g.FillPath(&badgeBg, &badgePath);
            Gdiplus::Pen badgeBorder(Gdiplus::Color(100, 255, 255, 255), 1.0f);
            g.DrawPath(&badgeBorder, &badgePath);

            Gdiplus::SolidBrush textBrush(Gdiplus::Color(255, 255, 255, 255));
            Gdiplus::StringFormat sf;
            sf.SetAlignment(Gdiplus::StringAlignmentCenter);
            sf.SetLineAlignment(Gdiplus::StringAlignmentCenter);
            g.DrawString(dimText.c_str(), (int)dimText.length(), &badgeFont, Gdiplus::RectF(badgeX, badgeY, badgeW, badgeH), &sf, &textBrush);

            // Marquee dashed border (Image 3 style: 1px black and white alternating dashes)
            g.SetSmoothingMode(Gdiplus::SmoothingModeNone);

            Gdiplus::Pen blackPen(Gdiplus::Color(255, 0, 0, 0), 1.0f);
            Gdiplus::REAL dashPattern[2] = { 4.0f, 4.0f };
            blackPen.SetDashPattern(dashPattern, 2);

            Gdiplus::Pen whitePen(Gdiplus::Color(255, 255, 255, 255), 1.0f);
            whitePen.SetDashPattern(dashPattern, 2);
            whitePen.SetDashOffset(4.0f);

            g.DrawRectangle(&blackPen, curRect.left, curRect.top, rw, rh);
            g.DrawRectangle(&whitePen, curRect.left, curRect.top, rw, rh);
        }

        // Blit backbuffer to window
        BitBlt(hdc, 0, 0, g_vw, g_vh, hMemDC, 0, 0, SRCCOPY);

        SelectObject(hMemDC, hOldBmp);
        DeleteObject(hBackBmp);
        DeleteDC(hMemDC);

        EndPaint(hWnd, &ps);
        return 0;
    }

    case WM_LBUTTONDOWN: {
        POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };

        if (g_state == AppState::SELECTED) {
            HitZone zone = GetHitZone(g_selectionRect, pt);
            if (zone == HIT_INSIDE) {
                g_dragMode = DRAG_MOVE;
                g_ptDragStart = pt;
                g_rectBeforeDrag = g_selectionRect;
                SetCapture(hWnd);
                return 0;
            } else if (zone != HIT_NONE) {
                switch (zone) {
                case HIT_L:  g_dragMode = DRAG_RESIZE_L; break;
                case HIT_R:  g_dragMode = DRAG_RESIZE_R; break;
                case HIT_T:  g_dragMode = DRAG_RESIZE_T; break;
                case HIT_B:  g_dragMode = DRAG_RESIZE_B; break;
                case HIT_TL: g_dragMode = DRAG_RESIZE_TL; break;
                case HIT_TR: g_dragMode = DRAG_RESIZE_TR; break;
                case HIT_BL: g_dragMode = DRAG_RESIZE_BL; break;
                case HIT_BR: g_dragMode = DRAG_RESIZE_BR; break;
                default: break;
                }
                g_ptDragStart = pt;
                g_rectBeforeDrag = g_selectionRect;
                SetCapture(hWnd);
                return 0;
            }
        }

        // Start new selection
        g_ptStart = pt;
        g_ptCurrent = pt;
        g_selectionRect = { pt.x, pt.y, pt.x, pt.y };
        g_dragMode = DRAG_SELECTING;
        g_state = AppState::SELECTING;
        SetCapture(hWnd);
        InvalidateRect(hWnd, NULL, FALSE);
        return 0;
    }

    case WM_MOUSEMOVE: {
        POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };

        if (g_dragMode == DRAG_SELECTING) {
            g_ptCurrent = pt;
            g_selectionRect = NormalizeRect(g_ptStart, g_ptCurrent);
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_MOVE) {
            int dx = pt.x - g_ptDragStart.x;
            int dy = pt.y - g_ptDragStart.y;
            int w = g_rectBeforeDrag.right - g_rectBeforeDrag.left;
            int h = g_rectBeforeDrag.bottom - g_rectBeforeDrag.top;
            int newL = g_rectBeforeDrag.left + dx;
            int newT = g_rectBeforeDrag.top + dy;
            if (newL < 0) newL = 0;
            if (newT < 0) newT = 0;
            if (newL + w > g_vw) newL = g_vw - w;
            if (newT + h > g_vh) newT = g_vh - h;

            g_selectionRect = { newL, newT, newL + w, newT + h };
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_TL) {
            g_selectionRect = NormalizeRect({ g_rectBeforeDrag.right, g_rectBeforeDrag.bottom }, pt);
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_BR) {
            g_selectionRect = NormalizeRect({ g_rectBeforeDrag.left, g_rectBeforeDrag.top }, pt);
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_TR) {
            g_selectionRect = NormalizeRect({ g_rectBeforeDrag.left, g_rectBeforeDrag.bottom }, pt);
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_BL) {
            g_selectionRect = NormalizeRect({ g_rectBeforeDrag.right, g_rectBeforeDrag.top }, pt);
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_L) {
            g_selectionRect.left   = (std::min)(pt.x, g_rectBeforeDrag.right);
            g_selectionRect.right  = (std::max)(pt.x, g_rectBeforeDrag.right);
            g_selectionRect.top    = g_rectBeforeDrag.top;
            g_selectionRect.bottom = g_rectBeforeDrag.bottom;
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_R) {
            g_selectionRect.left   = (std::min)(pt.x, g_rectBeforeDrag.left);
            g_selectionRect.right  = (std::max)(pt.x, g_rectBeforeDrag.left);
            g_selectionRect.top    = g_rectBeforeDrag.top;
            g_selectionRect.bottom = g_rectBeforeDrag.bottom;
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_T) {
            g_selectionRect.top    = (std::min)(pt.y, g_rectBeforeDrag.bottom);
            g_selectionRect.bottom = (std::max)(pt.y, g_rectBeforeDrag.bottom);
            g_selectionRect.left   = g_rectBeforeDrag.left;
            g_selectionRect.right  = g_rectBeforeDrag.right;
            InvalidateRect(hWnd, NULL, FALSE);
        } else if (g_dragMode == DRAG_RESIZE_B) {
            g_selectionRect.top    = (std::min)(pt.y, g_rectBeforeDrag.top);
            g_selectionRect.bottom = (std::max)(pt.y, g_rectBeforeDrag.top);
            g_selectionRect.left   = g_rectBeforeDrag.left;
            g_selectionRect.right  = g_rectBeforeDrag.right;
            InvalidateRect(hWnd, NULL, FALSE);
        }
        return 0;
    }

    case WM_LBUTTONUP: {
        if (g_dragMode != DRAG_NONE) {
            ReleaseCapture();
            g_dragMode = DRAG_NONE;
            int rw = g_selectionRect.right - g_selectionRect.left;
            int rh = g_selectionRect.bottom - g_selectionRect.top;
            if (rw >= 5 && rh >= 5) {
                g_state = AppState::SELECTED;
            } else {
                g_state = AppState::IDLE;
            }
            InvalidateRect(hWnd, NULL, FALSE);
        }
        return 0;
    }

    case WM_LBUTTONDBLCLK: {
        POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };
        if (g_state == AppState::SELECTED && PtInRect(&g_selectionRect, pt)) {
            ExecuteCapture(false);
        }
        return 0;
    }

    case WM_RBUTTONDOWN: {
        if (g_state == AppState::SELECTED) {
            g_state = AppState::IDLE;
            g_selectionRect = { 0, 0, 0, 0 };
            InvalidateRect(hWnd, NULL, FALSE);
        } else {
            DestroyWindow(hWnd);
        }
        return 0;
    }

    case WM_KEYDOWN: {
        if (wParam == VK_ESCAPE) {
            if (g_state == AppState::SELECTED) {
                g_state = AppState::IDLE;
                g_selectionRect = { 0, 0, 0, 0 };
                InvalidateRect(hWnd, NULL, FALSE);
            } else {
                DestroyWindow(hWnd);
            }
        } else if (wParam == VK_RETURN || wParam == VK_SPACE) {
            if (g_state == AppState::SELECTED) {
                ExecuteCapture(false);
            }
        } else if ((GetKeyState(VK_CONTROL) & 0x8000)) {
            if (wParam == 'C' && g_state == AppState::SELECTED) {
                ExecuteCapture(false);
            } else if (wParam == 'S' && g_state == AppState::SELECTED) {
                ExecuteCapture(true);
            }
        }
        return 0;
    }

    case WM_SETCURSOR: {
        POINT pt;
        GetCursorPos(&pt);
        ScreenToClient(hWnd, &pt);

        if (g_dragMode == DRAG_MOVE) {
            SetCursor(LoadCursor(NULL, IDC_SIZEALL));
            return TRUE;
        } else if (g_dragMode != DRAG_NONE && g_dragMode != DRAG_SELECTING) {
            switch (g_dragMode) {
            case DRAG_RESIZE_L:
            case DRAG_RESIZE_R:  SetCursor(LoadCursor(NULL, IDC_SIZEWE)); return TRUE;
            case DRAG_RESIZE_T:
            case DRAG_RESIZE_B:  SetCursor(LoadCursor(NULL, IDC_SIZENS)); return TRUE;
            case DRAG_RESIZE_TL:
            case DRAG_RESIZE_BR: SetCursor(LoadCursor(NULL, IDC_SIZENWSE)); return TRUE;
            case DRAG_RESIZE_TR:
            case DRAG_RESIZE_BL: SetCursor(LoadCursor(NULL, IDC_SIZENESW)); return TRUE;
            default: break;
            }
        }

        if (g_state == AppState::SELECTED) {
            HitZone zone = GetHitZone(g_selectionRect, pt);
            SetCursor(GetCursorForHitZone(zone));
            return TRUE;
        }

        SetCursor(LoadCursor(NULL, IDC_CROSS));
        return TRUE;
    }

    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(hWnd, uMsg, wParam, lParam);
}

// Window Procedure for Toast Notification Window
LRESULT CALLBACK ToastWndProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
    case WM_CREATE:
        SetTimer(hWnd, 1001, 3500, NULL); // Auto close after 3.5 seconds
        return 0;

    case WM_TIMER:
        if (wParam == 1001) {
            KillTimer(hWnd, 1001);
            DestroyWindow(hWnd);
        }
        return 0;

    case WM_ERASEBKGND:
        return 1;

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hWnd, &ps);

        RECT rc;
        GetClientRect(hWnd, &rc);
        int w = rc.right - rc.left;
        int h = rc.bottom - rc.top;

        HDC hMemDC = CreateCompatibleDC(hdc);
        HBITMAP hBmp = CreateCompatibleBitmap(hdc, w, h);
        HGDIOBJ hOld = SelectObject(hMemDC, hBmp);

        Gdiplus::Graphics g(hMemDC);
        g.SetSmoothingMode(Gdiplus::SmoothingModeAntiAlias);
        g.SetTextRenderingHint(Gdiplus::TextRenderingHintClearTypeGridFit);

        // Dark card background
        Gdiplus::GraphicsPath path;
        AddRoundedRectangle(path, Gdiplus::RectF(1.0f, 1.0f, (float)w - 2.0f, (float)h - 2.0f), 8.0f);
        Gdiplus::SolidBrush bgBrush(Gdiplus::Color(255, 30, 30, 30));
        g.FillPath(&bgBrush, &path);

        Gdiplus::Pen borderPen(Gdiplus::Color(255, 60, 60, 60), 1.0f);
        g.DrawPath(&borderPen, &path);

        // Success checkmark circle
        Gdiplus::SolidBrush checkBg(Gdiplus::Color(255, 16, 124, 65));
        g.FillEllipse(&checkBg, 16, 18, 44, 44);

        Gdiplus::Font checkFont(L"Segoe UI", 18.0f, Gdiplus::FontStyleBold, Gdiplus::UnitPoint);
        Gdiplus::SolidBrush whiteBrush(Gdiplus::Color(255, 255, 255, 255));
        Gdiplus::StringFormat csf;
        csf.SetAlignment(Gdiplus::StringAlignmentCenter);
        csf.SetLineAlignment(Gdiplus::StringAlignmentCenter);
        g.DrawString(L"✓", 1, &checkFont, Gdiplus::RectF(16, 18, 44, 44), &csf, &whiteBrush);

        // Title
        Gdiplus::Font titleFont(L"Segoe UI", 10.5f, Gdiplus::FontStyleBold, Gdiplus::UnitPoint);
        g.DrawString(L"แคปหน้าจอสำเร็จ! (คัดลอกแล้ว)", -1, &titleFont, Gdiplus::PointF(72.0f, 14.0f), &whiteBrush);

        // Description
        Gdiplus::Font subFont(L"Segoe UI", 9.0f, Gdiplus::FontStyleRegular, Gdiplus::UnitPoint);
        Gdiplus::SolidBrush grayBrush(Gdiplus::Color(255, 180, 180, 180));
        g.DrawString(L"รูปภาพอยู่ใน Clipboard พร้อมกด Ctrl+V วางได้เลย", -1, &subFont, Gdiplus::PointF(72.0f, 36.0f), &grayBrush);

        // Action hint
        if (!g_lastSavedPath.empty()) {
            Gdiplus::Font linkFont(L"Segoe UI", 8.5f, Gdiplus::FontStyleUnderline, Gdiplus::UnitPoint);
            Gdiplus::SolidBrush blueBrush(Gdiplus::Color(255, 80, 160, 255));
            g.DrawString(L"📁 บันทึกไฟล์แล้ว (คลิกที่นี่เพื่อเปิดโฟลเดอร์)", -1, &linkFont, Gdiplus::PointF(72.0f, 56.0f), &blueBrush);
        }

        BitBlt(hdc, 0, 0, w, h, hMemDC, 0, 0, SRCCOPY);

        SelectObject(hMemDC, hOld);
        DeleteObject(hBmp);
        DeleteDC(hMemDC);

        EndPaint(hWnd, &ps);
        return 0;
    }

    case WM_LBUTTONUP: {
        // Open folder in explorer
        if (!g_lastSavedPath.empty()) {
            std::wstring param = L"/select,\"" + g_lastSavedPath + L"\"";
            ShellExecuteW(NULL, L"open", L"explorer.exe", param.c_str(), NULL, SW_SHOWNORMAL);
        }
        DestroyWindow(hWnd);
        return 0;
    }

    case WM_SETCURSOR:
        SetCursor(LoadCursor(NULL, IDC_HAND));
        return TRUE;

    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(hWnd, uMsg, wParam, lParam);
}

// Display Toast notification window
void ShowToastNotification(HINSTANCE hInstance, const std::wstring& filePath) {
    const wchar_t TOAST_CLASS[] = L"ScreenCaptureToastClass";

    WNDCLASSEXW wc = {};
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = ToastWndProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.lpszClassName = TOAST_CLASS;
    RegisterClassExW(&wc);

    RECT wa;
    SystemParametersInfoW(SPI_GETWORKAREA, 0, &wa, 0);

    int toastW = 390;
    int toastH = 86;
    int tx = wa.right - toastW - 16;
    int ty = wa.bottom - toastH - 16;

    g_hToastWnd = CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        TOAST_CLASS,
        L"Notification",
        WS_POPUP,
        tx, ty, toastW, toastH,
        NULL, NULL, hInstance, NULL
    );

    // Apply rounded window region
    HRGN hRgn = CreateRoundRectRgn(0, 0, toastW, toastH, 12, 12);
    SetWindowRgn(g_hToastWnd, hRgn, TRUE);

    ShowWindow(g_hToastWnd, SW_SHOW);
    UpdateWindow(g_hToastWnd);
}

// Capture entire virtual screen (all monitors)
void CaptureVirtualScreen() {
    g_vx = GetSystemMetrics(SM_XVIRTUALSCREEN);
    g_vy = GetSystemMetrics(SM_YVIRTUALSCREEN);
    g_vw = GetSystemMetrics(SM_CXVIRTUALSCREEN);
    g_vh = GetSystemMetrics(SM_CYVIRTUALSCREEN);

    HDC hScreenDC = GetDC(NULL);
    HDC hMemDC = CreateCompatibleDC(hScreenDC);
    g_hOriginalBmp = CreateCompatibleBitmap(hScreenDC, g_vw, g_vh);
    HGDIOBJ hOldBmp = SelectObject(hMemDC, g_hOriginalBmp);

    BitBlt(hMemDC, 0, 0, g_vw, g_vh, hScreenDC, g_vx, g_vy, SRCCOPY | CAPTUREBLT);

    // Create dimmed copy
    HDC hDimDC = CreateCompatibleDC(hScreenDC);
    g_hDimmedBmp = CreateCompatibleBitmap(hScreenDC, g_vw, g_vh);
    HGDIOBJ hOldDim = SelectObject(hDimDC, g_hDimmedBmp);

    BitBlt(hDimDC, 0, 0, g_vw, g_vh, hMemDC, 0, 0, SRCCOPY);

    // Dim overlay using GDI+
    {
        Gdiplus::Graphics g(hDimDC);
        Gdiplus::SolidBrush dimBrush(Gdiplus::Color(115, 0, 0, 0)); // 45% black tint
        g.FillRectangle(&dimBrush, 0, 0, g_vw, g_vh);
    }

    SelectObject(hDimDC, hOldDim);
    DeleteDC(hDimDC);

    SelectObject(hMemDC, hOldBmp);
    DeleteDC(hMemDC);
    ReleaseDC(NULL, hScreenDC);
}

// Application Entry Point
int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, PWSTR pCmdLine, int nCmdShow) {
    // Enable Per-Monitor V2 DPI awareness for native hardware pixel precision
    HMODULE hUser32 = GetModuleHandleW(L"user32.dll");
    typedef BOOL(WINAPI* PFN_SetProcessDpiAwarenessContext)(DPI_AWARENESS_CONTEXT);
    auto pfnSetContext = (PFN_SetProcessDpiAwarenessContext)GetProcAddress(hUser32, "SetProcessDpiAwarenessContext");
    if (pfnSetContext) {
        pfnSetContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    } else {
        SetProcessDPIAware();
    }

    // Initialize GDI+
    Gdiplus::GdiplusStartupInput gdiplusStartupInput;
    ULONG_PTR gdiplusToken;
    Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);

    // Freeze and capture screen immediately
    CaptureVirtualScreen();

    // Register Overlay Window Class
    const wchar_t OVERLAY_CLASS[] = L"ScreenCaptureOverlayClass";
    WNDCLASSEXW wc = {};
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.style = CS_HREDRAW | CS_VREDRAW | CS_DBLCLKS;
    wc.lpfnWndProc = OverlayWndProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursor(NULL, IDC_CROSS);
    wc.lpszClassName = OVERLAY_CLASS;
    RegisterClassExW(&wc);

    // Create fullscreen borderless overlay across all monitors
    g_hOverlayWnd = CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        OVERLAY_CLASS,
        L"ScreenCapture",
        WS_POPUP,
        g_vx, g_vy, g_vw, g_vh,
        NULL, NULL, hInstance, NULL
    );

    if (!g_hOverlayWnd) {
        Gdiplus::GdiplusShutdown(gdiplusToken);
        return 1;
    }

    ShowWindow(g_hOverlayWnd, SW_SHOW);
    UpdateWindow(g_hOverlayWnd);
    SetForegroundWindow(g_hOverlayWnd);
    SetFocus(g_hOverlayWnd);

    // Main message loop
    MSG msg = {};
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    if (g_hOverlayWnd && IsWindow(g_hOverlayWnd)) {
        DestroyWindow(g_hOverlayWnd);
    }

    // Clean up resources
    if (g_hOriginalBmp) DeleteObject(g_hOriginalBmp);
    if (g_hDimmedBmp) DeleteObject(g_hDimmedBmp);

    Gdiplus::GdiplusShutdown(gdiplusToken);
    return 0;
}
