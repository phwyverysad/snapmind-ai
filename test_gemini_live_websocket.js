const assert = require('assert');
const { GeminiLiveClient } = require('./gemini_live');

console.log('[TEST] Checking Gemini Multimodal Live Client initialization & Context Caching...');

const client = new GeminiLiveClient({
  apiKey: 'TEST_API_KEY_MOCK',
  modelId: 'gemini-2.0-flash',
  cachedContentId: 'cachedContents/snapmind_system_instructions'
});

assert.strictEqual(typeof client.connect, 'function', 'client.connect must be a function');
assert.strictEqual(typeof client.sendRealtimeFrame, 'function', 'client.sendRealtimeFrame must be a function');
assert.strictEqual(typeof client.sendUserPrompt, 'function', 'client.sendUserPrompt must be a function');
assert.strictEqual(typeof client.close, 'function', 'client.close must be a function');
assert.strictEqual(client.cachedContentId, 'cachedContents/snapmind_system_instructions', 'Context cache ID must be stored');

console.log('[TEST] Gemini Live Client structure test passed.');
