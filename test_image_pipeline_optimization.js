const assert = require('assert');
const { optimizeImageForAiVision } = require('./imagePipeline');

console.log('[TEST] Checking OCR-Aware Adaptive Downscaling & Binary Image Pipeline...');

// 1x1 black JPEG pixel base64
const sampleDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function run() {
  // Test 1: Small crop (code/dense text) -> Must preserve original resolution without downscaling
  const smallResult = await optimizeImageForAiVision(sampleDataUrl, {
    rect: { w: 400, h: 300 },
    maxDimension: 1024,
    denseTextThreshold: { w: 800, h: 600 }
  });
  assert(smallResult, 'Small crop result must exist');
  assert.strictEqual(smallResult.isTextPreserved, true, 'Small crop must flag isTextPreserved as true');

  // Test 2: Standard structure output
  assert(Buffer.isBuffer(smallResult.buffer), 'Result buffer must be a Buffer');
  assert.strictEqual(smallResult.mimeType, 'image/jpeg', 'MimeType should be image/jpeg');
  assert(smallResult.width > 0 && smallResult.height > 0, 'Dimensions must be positive');
  assert(smallResult.dataUrl.startsWith('data:image/jpeg;base64,'), 'dataUrl must be formatted correctly');
  console.log('[TEST] OCR-aware adaptive image pipeline test passed.');
}

run().catch(err => {
  console.error('[TEST FAIL]', err);
  process.exit(1);
});
