// === PERCEPTUAL IMAGE HASHING & 0MS LOCAL CACHE (imageHasher.js) ===
// Computes fast 64-bit difference hashes (dHash) to fingerprint screen regions
// and maintains an LRU memory cache for instant sub-millisecond repeat queries.

const crypto = require('crypto');

let electronNativeImage = null;
try {
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.nativeImage) {
    electronNativeImage = electron.nativeImage;
  }
} catch (e) {}

/**
 * Computes a 64-bit difference hash (dHash) from an image buffer.
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {string} 16-character hexadecimal hash
 */
function computeDHash(imageBuffer) {
  if (!imageBuffer || imageBuffer.length === 0) {
    return '0000000000000000';
  }

  // High-fidelity native path when running inside Electron
  if (electronNativeImage) {
    try {
      const img = electronNativeImage.createFromBuffer(imageBuffer);
      if (!img.isEmpty()) {
        const small = img.resize({ width: 9, height: 8, quality: 'fast' });
        const bitmap = small.toBitmap(); // RGBA bytes
        let hashBits = '';
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const idx1 = (y * 9 + x) * 4;
            const idx2 = (y * 9 + (x + 1)) * 4;
            const lum1 = 0.299 * bitmap[idx1] + 0.587 * bitmap[idx1 + 1] + 0.114 * bitmap[idx1 + 2];
            const lum2 = 0.299 * bitmap[idx2] + 0.587 * bitmap[idx2 + 1] + 0.114 * bitmap[idx2 + 2];
            hashBits += lum1 > lum2 ? '1' : '0';
          }
        }
        let hex = '';
        for (let i = 0; i < hashBits.length; i += 4) {
          hex += parseInt(hashBits.substr(i, 4), 2).toString(16);
        }
        return hex.padStart(16, '0');
      }
    } catch (err) {
      // Fallback to sample buffer hashing
    }
  }

  // Fast Buffer sampling difference hash (works in pure Node and as resilient fallback)
  try {
    const step = Math.max(1, Math.floor(imageBuffer.length / 72));
    let hashBits = '';
    for (let i = 0; i < 64; i++) {
      const b1 = imageBuffer[(i * step) % imageBuffer.length];
      const b2 = imageBuffer[((i + 1) * step) % imageBuffer.length];
      hashBits += b1 > b2 ? '1' : '0';
    }
    let hex = '';
    for (let i = 0; i < hashBits.length; i += 4) {
      hex += parseInt(hashBits.substr(i, 4), 2).toString(16);
    }
    return hex.padStart(16, '0');
  } catch (e) {
    return crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 16);
  }
}

/**
 * High-performance LRU memory cache for instantaneous 0ms AI responses.
 */
class ImageCacheManager {
  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
    this.cache = new Map();
  }

  get(hash, promptId = 'default') {
    const key = `${hash}_${promptId}`;
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  has(hash, promptId = 'default') {
    return this.cache.has(`${hash}_${promptId}`);
  }

  set(hash, promptId = 'default', responseText) {
    const key = `${hash}_${promptId}`;
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, responseText);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

module.exports = {
  computeDHash,
  ImageCacheManager
};
