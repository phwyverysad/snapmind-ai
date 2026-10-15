const assert = require('assert');
const nativeBridge = require('./nativeBridge');

console.log('[TEST] Checking Zero-Copy Frame Buffer and Crop to Buffer API...');

assert.strictEqual(typeof nativeBridge.getSharedScreenFrameBuffer, 'function', 'nativeBridge.getSharedScreenFrameBuffer must exist');
assert.strictEqual(typeof nativeBridge.cropRectDirectToBuffer, 'function', 'nativeBridge.cropRectDirectToBuffer must exist');

const testRect = { x: 50, y: 50, w: 200, h: 150 };
const result = nativeBridge.cropRectDirectToBuffer(testRect);
assert(result === null || Buffer.isBuffer(result), 'cropRectDirectToBuffer must return a Node.js Buffer or null when display is uninitialized');

console.log('[TEST] Zero-Copy Frame Buffer API test passed.');
