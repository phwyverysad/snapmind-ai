const assert = require('assert');
const { computeDHash, ImageCacheManager } = require('./imageHasher');

console.log('[TEST] Checking Perceptual Image Hashing and 0ms Memory Cache...');

const sampleDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const buffer = Buffer.from(sampleDataUrl.split(',')[1], 'base64');

const hash = computeDHash(buffer);
assert.strictEqual(typeof hash, 'string', 'computeDHash must return a string');
assert(hash.length > 0, 'Hash must not be empty');

const cache = new ImageCacheManager(10);
cache.set(hash, 'explain', 'Cached AI explanation for this screen area');
const cachedVal = cache.get(hash, 'explain');
assert.strictEqual(cachedVal, 'Cached AI explanation for this screen area', 'Cache must retrieve matching response');

const missingVal = cache.get(hash, 'translate');
assert.strictEqual(missingVal, null, 'Cache must return null for different promptId');

console.log('[TEST] Perceptual hash and cache test passed.');
