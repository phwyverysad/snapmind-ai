#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#define NOMINMAX
#define WIN32_LEAN_AND_MEAN
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
#include <cstdint>

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

// Global variables
static HINSTANCE g_hInstance = NULL;
static HWND g_hOverlayWnd = NULL;
static AppState g_state = AppState::IDLE;

static POINT g_ptStart = { 0, 0 };
static POINT g_ptCurrent = { 0, 0 };
static RECT g_selectionRect = { 0, 0, 0, 0 };

static DragMode g_dragMode = DRAG_NONE;
static POINT g_ptDragStart = { 0, 0 };
static RECT g_rectBeforeDrag = { 0, 0, 0, 0 };

static HBITMAP g_hOriginalBmp = NULL;
static HBITMAP g_hDimmedBmp = NULL;
static int g_vx = 0, g_vy = 0, g_vw = 0, g_vh = 0;

static bool g_autoConfirmOnRelease = false;
static bool g_isCaptureConfirmed = false;

// Category metadata definitions matching Ctrl+Caps Floating Toolbar (toolbarWindow):
// [1] คำตอบ (answer)
// [2] อธิบาย (explain)
// [3] สรุป (summarize)
// [4] แปลภาษา (translate_th)
// [5] ปรับปรุงการเขียน (proofread)
// [6] ทำให้สั้นลง (shorten)
// [7] เขียนต่อ (continue_writing)
// [8] คือ (define)
// [?] ถามเอง (custom_ask)
// [Esc] ยกเลิก (cancel)
struct CategoryMetadata {
    int id;
    const wchar_t* badge;
    const wchar_t* label;
    const wchar_t* key;
};

static const CategoryMetadata g_categorySpecs[] = {
    { 1, L"1",   L"คำตอบ",          L"answer" },
    { 2, L"2",   L"อธิบาย",          L"explain" },
    { 3, L"3",   L"สรุป",            L"summarize" },
    { 4, L"4",   L"แปลภาษา",        L"translate_th" },
    { 5, L"5",   L"ปรับปรุงการเขียน", L"proofread" },
    { 6, L"6",   L"ทำให้สั้นลง",     L"shorten" },
    { 7, L"7",   L"เขียนต่อ",         L"continue_writing" },
    { 8, L"8",   L"คือ",             L"define" },
    { 9, L"?",   L"ถามเอง",          L"custom_ask" },
    { 0, L"Esc", L"ยกเลิก",         L"cancel" }
};

static int g_selectedCategoryId = 1;

static ULONG_PTR g_gdiplusToken = 0;
static bool g_gdiplusInitialized = false;

static void EnsureGdiplusInitialized() {
    if (!g_gdiplusInitialized) {
        Gdiplus::GdiplusStartupInput input;
        Gdiplus::GdiplusStartup(&g_gdiplusToken, &input, NULL);
        g_gdiplusInitialized = true;
    }
}

static void ShutdownGdiplus() {
    if (g_gdiplusInitialized) {
        Gdiplus::GdiplusShutdown(g_gdiplusToken);
        g_gdiplusInitialized = false;
    }
}

// Helper: Normalize rectangle points
static RECT NormalizeRect(POINT p1, POINT p2) {
    RECT r;
    r.left   = (std::min)(p1.x, p2.x);
    r.right  = (std::max)(p1.x, p2.x);
    r.top    = (std::min)(p1.y, p2.y);
    r.bottom = (std::max)(p1.y, p2.y);
    return r;
}

// Helper: GDI+ rounded rectangle path
static void AddRoundedRectangle(Gdiplus::GraphicsPath& path, Gdiplus::RectF rect, float radius) {
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
static int GetEncoderClsid(const WCHAR* format, CLSID* pClsid) {
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

// Helper: Detect which edge or corner the mouse is near
static HitZone GetHitZone(const RECT& r, POINT pt) {
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
static HCURSOR GetCursorForHitZone(HitZone zone) {
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

// Crop selected area from full screenshot
static HBITMAP CropSelection(RECT r) {
    int w = r.right - r.left;
    int h = r.bottom - r.top;
    if (w <= 0 || h <= 0 || !g_hOriginalBmp) return NULL;

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
static bool CopyBitmapToClipboard(HWND hWnd, HBITMAP hBmp, int width, int height) {
    if (!hBmp || width <= 0 || height <= 0) return false;
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

// Save HBITMAP directly to RAM Memory Buffer (Zero Disk I/O)
static bool SaveBitmapToMemory(HBITMAP hBmp, uint8_t* outBuf, int maxBytes, int* outSize, const WCHAR* mimeType = L"image/jpeg", int quality = 80) {
    if (!hBmp || !outBuf || maxBytes <= 0 || !outSize) return false;
    *outSize = 0;
    EnsureGdiplusInitialized();

    CLSID clsid;
    if (GetEncoderClsid(mimeType, &clsid) < 0) return false;

    Gdiplus::Bitmap* bmp = Gdiplus::Bitmap::FromHBITMAP(hBmp, NULL);
    if (!bmp) return false;

    IStream* pStream = NULL;
    if (CreateStreamOnHGlobal(NULL, TRUE, &pStream) != S_OK || !pStream) {
        delete bmp;
        return false;
    }

    Gdiplus::EncoderParameters encoderParams;
    ULONG qualityVal = (ULONG)quality;
    encoderParams.Count = 1;
    encoderParams.Parameter[0].Guid = Gdiplus::EncoderQuality;
    encoderParams.Parameter[0].Type = Gdiplus::EncoderParameterValueTypeLong;
    encoderParams.Parameter[0].NumberOfValues = 1;
    encoderParams.Parameter[0].Value = &qualityVal;

    Gdiplus::Status st = bmp->Save(pStream, &clsid, &encoderParams);
    delete bmp;

    if (st != Gdiplus::Ok) {
        pStream->Release();
        return false;
    }

    HGLOBAL hMem = NULL;
    if (GetHGlobalFromStream(pStream, &hMem) != S_OK || !hMem) {
        pStream->Release();
        return false;
    }

    SIZE_T sz = GlobalSize(hMem);
    if (sz == 0) {
        pStream->Release();
        return false;
    }

    BYTE* pData = (BYTE*)GlobalLock(hMem);
    if (!pData) {
        pStream->Release();
        return false;
    }

    int copyLen = (int)(std::min)((SIZE_T)maxBytes, sz);
    memcpy(outBuf, pData, copyLen);
    *outSize = copyLen;

    GlobalUnlock(hMem);
    pStream->Release();
    return true;
}

// Capture entire virtual screen (all monitors)
static void CaptureVirtualScreen() {
    EnsureGdiplusInitialized();
    g_vx = GetSystemMetrics(SM_XVIRTUALSCREEN);
    g_vy = GetSystemMetrics(SM_YVIRTUALSCREEN);
    g_vw = GetSystemMetrics(SM_CXVIRTUALSCREEN);
    g_vh = GetSystemMetrics(SM_CYVIRTUALSCREEN);

    HDC hScreenDC = GetDC(NULL);
    HDC hMemDC = CreateCompatibleDC(hScreenDC);
    if (g_hOriginalBmp) DeleteObject(g_hOriginalBmp);
    g_hOriginalBmp = CreateCompatibleBitmap(hScreenDC, g_vw, g_vh);
    HGDIOBJ hOldBmp = SelectObject(hMemDC, g_hOriginalBmp);

    BitBlt(hMemDC, 0, 0, g_vw, g_vh, hScreenDC, g_vx, g_vy, SRCCOPY | CAPTUREBLT);

    // Create dimmed copy
    HDC hDimDC = CreateCompatibleDC(hScreenDC);
    if (g_hDimmedBmp) DeleteObject(g_hDimmedBmp);
    g_hDimmedBmp = CreateCompatibleBitmap(hScreenDC, g_vw, g_vh);
    HGDIOBJ hOldDim = SelectObject(hDimDC, g_hDimmedBmp);

    BitBlt(hDimDC, 0, 0, g_vw, g_vh, hMemDC, 0, 0, SRCCOPY);

    // Dim overlay using GDI+ (40% black tint)
    {
        Gdiplus::Graphics g(hDimDC);
        Gdiplus::SolidBrush dimBrush(Gdiplus::Color(100, 0, 0, 0));
        g.FillRectangle(&dimBrush, 0, 0, g_vw, g_vh);
    }

    SelectObject(hDimDC, hOldDim);
    DeleteDC(hDimDC);

    SelectObject(hMemDC, hOldBmp);
    DeleteDC(hMemDC);
    ReleaseDC(NULL, hScreenDC);
}

// Window Procedure for Overlay Window
static LRESULT CALLBACK OverlayWndProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
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

            // Marquee dashed border (Classic 1px black and white alternating dashes)
            g.SetSmoothingMode(Gdiplus::SmoothingModeNone);

            Gdiplus::Pen blackPen(Gdiplus::Color(255, 0, 0, 0), 1.0f);
            Gdiplus::REAL dashPattern[2] = { 4.0f, 4.0f };
            blackPen.SetDashPattern(dashPattern, 2);

            Gdiplus::Pen whitePen(Gdiplus::Color(255, 255, 255, 255), 1.0f);
            whitePen.SetDashPattern(dashPattern, 2);
            whitePen.SetDashOffset(4.0f);

            g.DrawRectangle(&blackPen, curRect.left, curRect.top, rw, rh);
            g.DrawRectangle(&whitePen, curRect.left, curRect.top, rw, rh);

            // Draw 8-Directional resize handles when selected
            if (g_state == AppState::SELECTED && rw >= 16 && rh >= 16) {
                const int hSize = 8;
                int midX = curRect.left + rw / 2;
                int midY = curRect.top + rh / 2;
                POINT handles[8] = {
                    { curRect.left, curRect.top },
                    { midX, curRect.top },
                    { curRect.right, curRect.top },
                    { curRect.left, midY },
                    { curRect.right, midY },
                    { curRect.left, curRect.bottom },
                    { midX, curRect.bottom },
                    { curRect.right, curRect.bottom }
                };
                Gdiplus::SolidBrush hBrush(Gdiplus::Color(255, 255, 255, 255));
                Gdiplus::Pen hPen(Gdiplus::Color(255, 2, 132, 199), 1.5f);
                for (int i = 0; i < 8; ++i) {
                    g.FillRectangle(&hBrush, handles[i].x - hSize / 2, handles[i].y - hSize / 2, hSize, hSize);
                    g.DrawRectangle(&hPen, handles[i].x - hSize / 2, handles[i].y - hSize / 2, hSize, hSize);
                }
            }
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
            if (rw >= 8 && rh >= 8) {
                g_state = AppState::SELECTED;
                if (g_autoConfirmOnRelease) {
                    g_isCaptureConfirmed = true;
                    DestroyWindow(hWnd);
                    return 0;
                }
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
            g_selectedCategoryId = 1;
            g_isCaptureConfirmed = true;
            DestroyWindow(hWnd);
        }
        return 0;
    }

    case WM_RBUTTONDOWN: {
        if (g_state == AppState::SELECTED) {
            g_state = AppState::IDLE;
            g_selectionRect = { 0, 0, 0, 0 };
            InvalidateRect(hWnd, NULL, FALSE);
        } else {
            g_isCaptureConfirmed = false;
            DestroyWindow(hWnd);
        }
        return 0;
    }

    case WM_KEYDOWN: {
        if (wParam == VK_ESCAPE) {
            // Direct immediate exit on Esc per user requirement
            g_isCaptureConfirmed = false;
            DestroyWindow(hWnd);
            return 0;
        } else if (g_state == AppState::SELECTED) {
            if (wParam >= '1' && wParam <= '8') {
                g_selectedCategoryId = (int)(wParam - '0');
                g_isCaptureConfirmed = true;
                DestroyWindow(hWnd);
                return 0;
            } else if (wParam >= VK_NUMPAD1 && wParam <= VK_NUMPAD8) {
                g_selectedCategoryId = (int)(wParam - VK_NUMPAD1 + 1);
                g_isCaptureConfirmed = true;
                DestroyWindow(hWnd);
                return 0;
            } else if (wParam == VK_OEM_2 || wParam == '?') { // '?' or '/' for custom ask
                g_selectedCategoryId = 9;
                g_isCaptureConfirmed = true;
                DestroyWindow(hWnd);
                return 0;
            } else if (wParam == VK_RETURN || wParam == VK_SPACE) {
                g_selectedCategoryId = 1; // Default to 'answer'
                g_isCaptureConfirmed = true;
                DestroyWindow(hWnd);
                return 0;
            } else if ((GetKeyState(VK_CONTROL) & 0x8000) && (wParam == 'C' || wParam == 'c')) {
                g_selectedCategoryId = 1;
                g_isCaptureConfirmed = true;
                DestroyWindow(hWnd);
                return 0;
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

        if (g_state == AppState::SELECTED && g_dragMode == DRAG_NONE) {
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

// === EXPORTED C-ABI FUNCTIONS FOR SNAPMIND AI ===

extern "C" {

// 1. Interactive Full-Screen Selection
// Returns: 1 if confirmed, 0 if cancelled / error
__declspec(dllexport) int __stdcall StartNativeScreenSelection(
    uint8_t* outJpegBuf,
    int maxBytes,
    int* outJpegSize,
    int* outX,
    int* outY,
    int* outW,
    int* outH,
    int autoConfirmOnRelease,
    int* outCategory
) {
    if (!outJpegBuf || maxBytes <= 0 || !outJpegSize) return 0;
    *outJpegSize = 0;
    g_selectedCategoryId = 1;

    // Per-Monitor V2 DPI awareness for native hardware pixel precision
    HMODULE hUser32 = GetModuleHandleW(L"user32.dll");
    typedef BOOL(WINAPI* PFN_SetProcessDpiAwarenessContext)(DPI_AWARENESS_CONTEXT);
    auto pfnSetContext = (PFN_SetProcessDpiAwarenessContext)GetProcAddress(hUser32, "SetProcessDpiAwarenessContext");
    if (pfnSetContext) {
        pfnSetContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    } else {
        SetProcessDPIAware();
    }

    EnsureGdiplusInitialized();

    g_autoConfirmOnRelease = (autoConfirmOnRelease != 0);
    g_isCaptureConfirmed = false;
    g_state = AppState::IDLE;
    g_selectionRect = { 0, 0, 0, 0 };

    CaptureVirtualScreen();

    const wchar_t OVERLAY_CLASS[] = L"SnapMindNativeCaptureOverlayClass";
    WNDCLASSEXW wc = {};
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.style = CS_HREDRAW | CS_VREDRAW | CS_DBLCLKS;
    wc.lpfnWndProc = OverlayWndProc;
    wc.hInstance = g_hInstance;
    wc.hCursor = LoadCursor(NULL, IDC_CROSS);
    wc.lpszClassName = OVERLAY_CLASS;
    RegisterClassExW(&wc);

    g_hOverlayWnd = CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        OVERLAY_CLASS,
        L"SnapMindScreenCapture",
        WS_POPUP,
        g_vx, g_vy, g_vw, g_vh,
        NULL, NULL, g_hInstance, NULL
    );

    if (!g_hOverlayWnd) {
        return 0;
    }

    ShowWindow(g_hOverlayWnd, SW_SHOW);
    UpdateWindow(g_hOverlayWnd);
    SetForegroundWindow(g_hOverlayWnd);
    SetFocus(g_hOverlayWnd);

    // Message loop for overlay
    MSG msg = {};
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    if (g_hOverlayWnd && IsWindow(g_hOverlayWnd)) {
        DestroyWindow(g_hOverlayWnd);
        g_hOverlayWnd = NULL;
    }

    if (!g_isCaptureConfirmed) {
        if (g_hOriginalBmp) { DeleteObject(g_hOriginalBmp); g_hOriginalBmp = NULL; }
        if (g_hDimmedBmp) { DeleteObject(g_hDimmedBmp); g_hDimmedBmp = NULL; }
        return 0; // Cancelled
    }

    int w = g_selectionRect.right - g_selectionRect.left;
    int h = g_selectionRect.bottom - g_selectionRect.top;
    if (w < 4 || h < 4) {
        if (g_hOriginalBmp) { DeleteObject(g_hOriginalBmp); g_hOriginalBmp = NULL; }
        if (g_hDimmedBmp) { DeleteObject(g_hDimmedBmp); g_hDimmedBmp = NULL; }
        return 0;
    }

    HBITMAP hCrop = CropSelection(g_selectionRect);
    if (!hCrop) {
        if (g_hOriginalBmp) { DeleteObject(g_hOriginalBmp); g_hOriginalBmp = NULL; }
        if (g_hDimmedBmp) { DeleteObject(g_hDimmedBmp); g_hDimmedBmp = NULL; }
        return 0;
    }

    // Copy to system clipboard automatically
    CopyBitmapToClipboard(NULL, hCrop, w, h);

    // Encode directly to memory buffer (Zero-Disk I/O)
    bool ok = SaveBitmapToMemory(hCrop, outJpegBuf, maxBytes, outJpegSize, L"image/jpeg", 82);
    DeleteObject(hCrop);

    if (g_hOriginalBmp) { DeleteObject(g_hOriginalBmp); g_hOriginalBmp = NULL; }
    if (g_hDimmedBmp) { DeleteObject(g_hDimmedBmp); g_hDimmedBmp = NULL; }

    if (!ok || *outJpegSize <= 0) {
        return 0;
    }

    if (outX) *outX = g_vx + g_selectionRect.left;
    if (outY) *outY = g_vy + g_selectionRect.top;
    if (outW) *outW = w;
    if (outH) *outH = h;
    if (outCategory) *outCategory = g_selectedCategoryId;

    return 1; // Confirmed & Captured
}

// Get the category ID from the last completed selection
__declspec(dllexport) int __stdcall GetLastSelectedCategory() {
    return g_selectedCategoryId;
}

// 2. Headless Screen Freeze Capture to RAM
__declspec(dllexport) int __stdcall NativeCaptureScreenFreezeJpeg(
    uint8_t* outJpegBuf,
    int maxBytes,
    int* outJpegSize,
    int* outWidth,
    int* outHeight,
    int quality
) {
    if (!outJpegBuf || maxBytes <= 0 || !outJpegSize) return 0;
    *outJpegSize = 0;

    EnsureGdiplusInitialized();
    CaptureVirtualScreen();

    if (!g_hOriginalBmp) return 0;

    if (outWidth) *outWidth = g_vw;
    if (outHeight) *outHeight = g_vh;

    int q = (quality > 0 && quality <= 100) ? quality : 78;
    bool ok = SaveBitmapToMemory(g_hOriginalBmp, outJpegBuf, maxBytes, outJpegSize, L"image/jpeg", q);
    return ok ? 1 : 0;
}

// 3. Headless Crop from Pre-frozen Screen to RAM
__declspec(dllexport) int __stdcall NativeCropScreenRectToJpeg(
    int x, int y, int w, int h,
    uint8_t* outJpegBuf,
    int maxBytes,
    int* outJpegSize,
    int quality
) {
    if (!outJpegBuf || maxBytes <= 0 || !outJpegSize || w <= 0 || h <= 0) return 0;
    *outJpegSize = 0;

    if (!g_hOriginalBmp) {
        CaptureVirtualScreen();
        if (!g_hOriginalBmp) return 0;
    }

    RECT r = { x - g_vx, y - g_vy, x - g_vx + w, y - g_vy + h };
    HBITMAP hCrop = CropSelection(r);
    if (!hCrop) return 0;

    int q = (quality > 0 && quality <= 100) ? quality : 80;
    bool ok = SaveBitmapToMemory(hCrop, outJpegBuf, maxBytes, outJpegSize, L"image/jpeg", q);
    DeleteObject(hCrop);
    return ok ? 1 : 0;
}

// 4. Cancel active native overlay window programmatically
__declspec(dllexport) void __stdcall CancelNativeScreenCapture() {
    if (g_hOverlayWnd && IsWindow(g_hOverlayWnd)) {
        g_isCaptureConfirmed = false;
        PostMessage(g_hOverlayWnd, WM_CLOSE, 0, 0);
    }
}

} // extern "C"

BOOL APIENTRY DllMain(HMODULE hModule, DWORD ul_reason_for_call, LPVOID lpReserved) {
    switch (ul_reason_for_call) {
    case DLL_PROCESS_ATTACH:
        g_hInstance = hModule;
        DisableThreadLibraryCalls(hModule);
        break;
    case DLL_PROCESS_DETACH:
        ShutdownGdiplus();
        break;
    }
    return TRUE;
}
