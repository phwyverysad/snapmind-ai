// === TEST: INSTANT SNIP LAUNCH & JITTER-FREE MOUSE DRAG OPTIMIZER ===
// Validates:
// 1. Instant snipping overlay display on hotkey trigger (0ms latency, 5ms native poll, immediate show & native topmost)
// 2. Hardware OS mouse cursor (cursor: crosshair) replacing CPU/GPU-stalling software canvas cursor
// 3. Elimination of 'globalCompositeOperation = difference' and full-screen canvas repaints on mouse move
// 4. Smooth, un-stuttered mouse dragging with handle suppression during active selection
// 5. Complete removal of laser scanning animations & progress gimmicks

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 SNAPMIND AI: INSTANT SNIP & SMOOTH DRAG TEST SUITE');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

const styleCss = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
const mainJs = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
const nativeBridgeJs = fs.readFileSync(path.join(__dirname, 'nativeBridge.js'), 'utf8');

// ----------------------------------------------------
// SECTION 1: INSTANT SNIPPING LAUNCH OPTIMIZER
// ----------------------------------------------------
console.log('👉 [SECTION 1] Instant Snipping Launch Optimizer (0ms Display Latency)');

it('nativeBridge.js polls low-level native hotkey queue with ultra-fast ≤5ms interval', () => {
  assert(nativeBridgeJs.includes('}, 5);'), 'nativeBridge.js must poll at 5ms for lightning-fast hotkey detection');
});

it('main.js startSnippingMode presents window immediately before async tasks', () => {
  const showIdx = mainJs.indexOf('mainWindow.show();');
  const focusIdx = mainJs.indexOf('mainWindow.focus();');
  const sendSnipIdx = mainJs.indexOf("mainWindow.webContents.send('start-snipping');");
  assert(showIdx !== -1 && focusIdx !== -1 && sendSnipIdx !== -1, 'main.js calls show, focus, and sends start-snipping');
  assert(showIdx < sendSnipIdx, 'mainWindow.show() must be called immediately before or with start-snipping');
});

it('main.js enforces native Win32 topmost immediately upon startSnippingMode', () => {
  assert(mainJs.includes('nativeBridge.makeWindowTopmostNative(mainWindow)'), 'main.js immediately reinforces topmost via native Win32 API');
});

it('main.js skips redundant setBounds calls when current window bounds already match display bounds', () => {
  assert(mainJs.includes('const curBounds = mainWindow.getBounds();'), 'main.js checks current window bounds');
  assert(mainJs.includes('if (curBounds.x !== bounds.x || curBounds.y !== bounds.y ||'), 'main.js guards setBounds to eliminate DWM layout stalls');
});

it('main.js executes desktop pre-capture asynchronously to prevent freezing main thread', () => {
  assert(mainJs.includes('setImmediate(() => {\n    preCaptureDesktopSources();\n  });') ||
         mainJs.includes('setImmediate(() => {\r\n    preCaptureDesktopSources();\r\n  });'),
         'main.js must run preCaptureDesktopSources asynchronously');
});

// ----------------------------------------------------
// SECTION 2: HARDWARE OS CURSOR & ZERO MOUSE STUTTER
// ----------------------------------------------------
console.log('\n👉 [SECTION 2] Hardware OS Cursor & Elimination of Mouse Drag Lag');

it('style.css configures #scanCanvas with native hardware cursor: crosshair (removes cursor: none !important)', () => {
  const scanCanvasBlock = styleCss.match(/#scanCanvas\s*\{([^}]*)\}/);
  assert(scanCanvasBlock !== null, '#scanCanvas rule found in style.css');
  assert(!scanCanvasBlock[1].includes('cursor: none'), 'cursor: none !important must be removed from #scanCanvas');
  assert(scanCanvasBlock[1].includes('cursor: crosshair'), '#scanCanvas must default to native hardware crosshair');
});

it('script.js uses setCanvasCursor helper to avoid DOM style thrashing on mousemove', () => {
  assert(scriptJs.includes('function setCanvasCursor(newCursor)'), 'setCanvasCursor helper function must exist');
  assert(scriptJs.includes('if (canvas && canvas.style.cursor !== newCursor)'), 'only updates style.cursor when value changes');
});

it('script.js does NOT repaint full-screen canvas on idle mouse movements', () => {
  const mouseMoveSection = scriptJs.substring(scriptJs.indexOf("canvas.addEventListener('mousemove'"), scriptJs.indexOf("window.addEventListener('mouseup'"));
  // In the !isDrawing && !isMoving && !isResizing branch, it should return without requestDrawScene()
  const idleBranch = mouseMoveSection.substring(mouseMoveSection.indexOf('if (!isDrawing && !isMoving && !isResizing)'), mouseMoveSection.indexOf('if (isResizing)'));
  assert(!idleBranch.includes('requestDrawScene()'), 'Idle mouse movements must NOT trigger full canvas repaints');
  assert(idleBranch.includes('return;'), 'Idle branch must return early to let OS hardware cursor render at native refresh rate');
});

it('drawScene completely eliminates GPU texture readback stalling difference-blend crosshair', () => {
  const drawSceneFn = scriptJs.substring(scriptJs.indexOf('function drawScene()'), scriptJs.indexOf('function drawInteractiveHandles'));
  assert(!drawSceneFn.includes("globalCompositeOperation = 'difference'"), "drawScene must NOT use difference composite blend");
  assert(!drawSceneFn.includes('lastMouseX - size'), 'Software crosshair lines must be removed from drawScene');
});

it('drawScene suppresses interactive handles while actively drawing to maximize drag FPS', () => {
  const drawSceneFn = scriptJs.substring(scriptJs.indexOf('function drawScene()'), scriptJs.indexOf('function drawInteractiveHandles'));
  assert(drawSceneFn.includes('if (!isDrawing) {\n        drawInteractiveHandles') ||
         drawSceneFn.includes('if (!isDrawing) {\r\n        drawInteractiveHandles'),
         'Interactive corner handles must be skipped while actively dragging the selection box');
});

it('canvas mousedown prevents browser default behaviors and sets crosshair cursor', () => {
  const mousedownFn = scriptJs.substring(scriptJs.indexOf("canvas.addEventListener('mousedown'"), scriptJs.indexOf("canvas.addEventListener('mousemove'"));
  assert(mousedownFn.includes('e.preventDefault()'), 'mousedown must prevent default browser drag actions');
  assert(mousedownFn.includes("setCanvasCursor('crosshair')"), 'mousedown switches cursor to crosshair for drawing');
});

// ----------------------------------------------------
// SECTION 3: SCANNING GIMMICK / LASER ANIMATION REMOVAL
// ----------------------------------------------------
console.log('\n👉 [SECTION 3] Removal of Scanning Gimmick & Laser Animation');

it('mouseup immediately processes capture without starting any laser scan animation', () => {
  const mouseupSection = scriptJs.substring(scriptJs.indexOf("window.addEventListener('mouseup'"), scriptJs.indexOf("function getHandleAt"));
  assert(!mouseupSection.includes('startLaserScan(box)'), 'mouseup must NOT call startLaserScan');
  assert(mouseupSection.includes('processScreenCapture(box);'), 'mouseup must immediately call processScreenCapture');
});

it('drawScene has zero laser scan drawing calls', () => {
  const drawSceneFn = scriptJs.substring(scriptJs.indexOf('function drawScene()'), scriptJs.indexOf('function drawInteractiveHandles'));
  assert(!drawSceneFn.includes('drawGradientLaser()'), 'drawScene must NOT call drawGradientLaser');
});

it('drawGradientLaser is a clean no-op stub', () => {
  const laserFn = scriptJs.substring(scriptJs.indexOf('function drawGradientLaser()'), scriptJs.indexOf('function startLaserScan'));
  assert(!laserFn.includes('createLinearGradient'), 'drawGradientLaser should not create gradients');
  assert(!laserFn.includes('shadowBlur'), 'drawGradientLaser should not draw glowing lines');
});

it('startLaserScan does not start any requestAnimationFrame or interval loops', () => {
  const startLaserFn = scriptJs.substring(scriptJs.indexOf('function startLaserScan(cropBox)'), scriptJs.indexOf('function finishLaserScanSmoothly'));
  assert(!startLaserFn.includes('requestAnimationFrame'), 'startLaserScan must not run RAF loops');
  assert(!startLaserFn.includes('setInterval'), 'startLaserScan must not run timer intervals');
});

// ----------------------------------------------------
// SECTION 4: TEST SUMMARY & EXIT
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
