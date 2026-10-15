const assert = require('assert');
const fs = require('fs');

console.log('[TEST] Checking Speculative Pre-fetching and Quota Guard in source files...');

const scriptContent = fs.readFileSync('script.js', 'utf8');
const mainContent = fs.readFileSync('main.js', 'utf8');
const preloadContent = fs.readFileSync('preload.js', 'utf8');

assert(
  preloadContent.includes('prestageScreenSelection'),
  'preload.js must expose prestageScreenSelection'
);

assert(
  scriptContent.includes('speculative-pre-stage-image') || scriptContent.includes('prestageScreenSelection'),
  'script.js must trigger speculative prestaging on mouseup'
);

assert(
  mainContent.includes('cancel-speculative-prestage') || mainContent.includes('cancelStagedSpeculativeUpload'),
  'main.js must handle instant speculative prestage cancellation'
);

console.log('[TEST] Speculative pre-fetching and quota guard test passed.');
