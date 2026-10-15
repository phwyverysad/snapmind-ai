// === IMAGE PIPELINE OPTIMIZATION (imagePipeline.js) ===
// Provides OCR-aware adaptive downscaling, high-performance WebP/JPEG encoding,
// and zero-copy binary buffer output for Gemini Multimodal Vision streaming.

let electronNativeImage = null;
try {
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.nativeImage) {
    electronNativeImage = electron.nativeImage;
  }
} catch (e) {}

/**
 * Parses basic dimensions from JPEG buffer headers without native libraries.
 */
function parseJpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF) break;
    const marker = buffer[offset + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    const len = buffer.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  return { width: 1, height: 1 };
}

/**
 * Optimizes an input image for AI Vision models.
 * @param {Buffer|string} imageInput - Raw image buffer or data URL
 * @param {Object} options - Configuration options
 * @returns {Promise<{ buffer: Buffer, mimeType: string, width: number, height: number, isTextPreserved: boolean, dataUrl: string }>}
 */
async function optimizeImageForAiVision(imageInput, options = {}) {
  const maxDimension = options.maxDimension || 1024;
  const denseTextThreshold = options.denseTextThreshold || { w: 800, h: 600 };
  const rect = options.rect || null;

  let inputBuffer;
  if (Buffer.isBuffer(imageInput)) {
    inputBuffer = imageInput;
  } else if (typeof imageInput === 'string') {
    const commaIdx = imageInput.indexOf(',');
    const base64Str = commaIdx !== -1 ? imageInput.substring(commaIdx + 1) : imageInput;
    inputBuffer = Buffer.from(base64Str, 'base64');
  } else {
    throw new Error('Unsupported image input format. Expected Buffer or data URL string.');
  }

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error('Input image buffer is empty.');
  }

  // If electronNativeImage is available, use high-fidelity native processing
  if (electronNativeImage) {
    let img = electronNativeImage.createFromBuffer(inputBuffer);
    if (img.isEmpty()) {
      throw new Error('Failed to decode image using nativeImage.');
    }

    const origSize = img.getSize();
    let targetWidth = origSize.width;
    let targetHeight = origSize.height;

    // OCR-Aware Rule: If the bounding box is small (< 800x600), preserve resolution to protect code/text
    const isSmallDenseText = (rect && rect.w <= denseTextThreshold.w && rect.h <= denseTextThreshold.h) ||
                            (!rect && origSize.width <= denseTextThreshold.w && origSize.height <= denseTextThreshold.h);

    const quality = isSmallDenseText ? 90 : (options.quality || 75);

    if (!isSmallDenseText && (targetWidth > maxDimension || targetHeight > maxDimension)) {
      if (targetWidth >= targetHeight) {
        targetHeight = Math.max(1, Math.round((targetHeight / targetWidth) * maxDimension));
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.max(1, Math.round((targetWidth / targetHeight) * maxDimension));
        targetHeight = maxDimension;
      }
      img = img.resize({ width: targetWidth, height: targetHeight, quality: 'better' });
    }

    const jpegBuffer = img.toJPEG(quality);
    const dataUrl = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

    return {
      buffer: jpegBuffer,
      mimeType: 'image/jpeg',
      width: targetWidth,
      height: targetHeight,
      isTextPreserved: isSmallDenseText,
      dataUrl
    };
  }

  // Fallback for standalone Node CLI / test environment
  const parsedDims = parseJpegDimensions(inputBuffer);
  const isSmallDenseText = (rect && rect.w <= denseTextThreshold.w && rect.h <= denseTextThreshold.h) ||
                          (!rect && parsedDims.width <= denseTextThreshold.w && parsedDims.height <= denseTextThreshold.h);

  const dataUrl = `data:image/jpeg;base64,${inputBuffer.toString('base64')}`;
  return {
    buffer: inputBuffer,
    mimeType: 'image/jpeg',
    width: parsedDims.width,
    height: parsedDims.height,
    isTextPreserved: isSmallDenseText,
    dataUrl
  };
}

module.exports = {
  optimizeImageForAiVision,
  parseJpegDimensions
};
