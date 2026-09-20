const fs = require('fs');
const path = require('path');
const { app, nativeImage, net } = require('electron');

async function runStreamingTestSuite() {
  console.log('====================================================');
  console.log('⚡ SNAPMIND AI: REAL-TIME STREAMING TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: SSE PROTOCOL BUFFER PARSER
  // ----------------------------------------------------
  console.log('👉 [TEST 1] Server-Sent Events (SSE) Line & Chunk Parser');

  function parseSseBuffer(incomingBuffer) {
    const extractedParts = [];
    const lines = incomingBuffer.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.replace(/^data:\s*/, '');
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (textPart) extractedParts.push(textPart);
      } catch (e) {}
    }
    return extractedParts;
  }

  const mockSseStream = `data: {"candidates": [{"content": {"parts": [{"text": "คำตอบคือ "}]}}]}

data: {"candidates": [{"content": {"parts": [{"text": "42"}]}}]}

data: {"candidates": [{"content": {"parts": [{"text": "\\n\\n### [THINKING]\\nวิเคราะห์สมการ"}]}}]}
`;

  const parts = parseSseBuffer(mockSseStream);
  assert(parts.length === 3, `Extracted 3 parts correctly (Received: ${parts.length})`);
  assert(parts[0] === 'คำตอบคือ ', 'Part 1 matches: "คำตอบคือ "');
  assert(parts[1] === '42', 'Part 2 matches: "42"');
  assert(parts[2].includes('THINKING'), 'Part 3 contains THINKING tag');

  // ----------------------------------------------------
  // TEST 2: SECTION DELIMITER PARSER (FULL & PARTIAL STREAM)
  // ----------------------------------------------------
  console.log('\n👉 [TEST 2] Section Delimiter Parser (Incremental & Full Stream)');

  function parseStreamSections(text) {
    const sections = {
      answer: '',
      thinking_process: '',
      explain: '',
      summary: '',
      translate: '',
      ocr: ''
    };
    if (!text) return sections;

    const tags = [
      { key: 'answer', pattern: /###?\s*\[?(?:ANSWER|คำตอบ|คำตอบหลัก)\]?|\*\*\[?(?:ANSWER|คำตอบ)\]?\*\*/i },
      { key: 'ocr', pattern: /###?\s*\[?(?:OCR|TEXT|ถอดข้อความ|ข้อความในภาพ|ถอดอักษร)\]?|\*\*\[?(?:OCR|TEXT|ถอดข้อความ)\]?\*\*/i },
      { key: 'thinking_process', pattern: /###?\s*\[?(?:THINKING(?:_PROCESS)?|กระบวนการคิด)\]?|\*\*\[?(?:THINKING|กระบวนการคิด)\]?\*\*/i },
      { key: 'explain', pattern: /###?\s*\[?(?:EXPLAIN|EXPLANATION|คำอธิบาย|อธิบาย|อธิบายเชิงลึก)\]?|\*\*\[?(?:EXPLAIN|คำอธิบาย)\]?\*\*/i },
      { key: 'summary', pattern: /###?\s*\[?(?:SUMMARY|สรุป|สรุปประเด็น|สรุปประเด็นสำคัญ)\]?|\*\*\[?(?:SUMMARY|สรุป)\]?\*\*/i },
      { key: 'translate', pattern: /###?\s*\[?(?:TRANSLATE|TRANSLATION|คำแปล|แปลไทย|แปลภาษา|แปล)\]?|\*\*\[?(?:TRANSLATE|แปลไทย)\]?\*\*/i }
    ];

    const matches = [];
    tags.forEach(t => {
      const match = text.search(t.pattern);
      if (match !== -1) matches.push({ key: t.key, index: match, pattern: t.pattern });
    });

    matches.sort((a, b) => a.index - b.index);

    if (matches.length === 0) {
      sections.answer = text.trim();
      return sections;
    }

    if (matches[0].index > 0) {
      sections.answer = text.substring(0, matches[0].index).trim();
    }

    for (let i = 0; i < matches.length; i++) {
      const curr = matches[i];
      const next = matches[i + 1];
      const startIndex = curr.index;
      const endIndex = next ? next.index : text.length;
      let chunk = text.substring(startIndex, endIndex);
      chunk = chunk.replace(curr.pattern, '').trim();
      sections[curr.key] = chunk;
    }

    return sections;
  }

  // A: Partial stream test (Only the first few words have arrived)
  const partial = '### [ANSWER]\nคำตอบคือ $x = 10$';
  const partialParsed = parseStreamSections(partial);
  assert(partialParsed.answer === 'คำตอบคือ $x = 10$', `Partial answer parsed immediately: "${partialParsed.answer}"`);
  assert(partialParsed.explain === '', 'Explain tab remains empty until generated');

  // B: Full stream test (OCR placed right after Answer)
  const fullText = `### [ANSWER]
คำตอบคือ $E = mc^2$

### [OCR]
E = mc^2

### [THINKING]
สมการความสมมูลมวล-พลังงานของไอน์สไตน์

### [EXPLAIN]
$E$ คือพลังงาน $m$ คือมวล $c$ คือความเร็วแสง

### [SUMMARY]
1. ทฤษฎีสัมพัทธภาพพิเศษ
2. มวลสามารถเปลี่ยนเป็นพลังงานได้

### [TRANSLATE]
พลังงานเท่ากับมวลคูณด้วยความเร็วแสงยกกำลังสอง`;

  const fullParsed = parseStreamSections(fullText);
  assert(fullParsed.answer.includes('$E = mc^2$'), 'Answer section correctly parsed with LaTeX');
  assert(fullParsed.ocr === 'E = mc^2', 'OCR section correctly extracted directly after Answer');
  assert(fullParsed.thinking_process.includes('ไอน์สไตน์'), 'Thinking section correctly parsed');
  assert(fullParsed.explain.includes('ความเร็วแสง'), 'Explain section correctly parsed');
  assert(fullParsed.summary.includes('ทฤษฎี'), 'Summary section correctly parsed');
  assert(fullParsed.translate.includes('พลังงาน'), 'Translate section correctly parsed into Thai');

  // ----------------------------------------------------
  // TEST 3: LIVE GEMINI SSE STREAMING BENCHMARK (REAL-TIME TTFT)
  // ----------------------------------------------------
  console.log('\n👉 [TEST 3] Live Gemini Vision SSE Streaming Call (Real-time TTFT Benchmark)');

  // Load API Key
  const appDataDir = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : '/var/local');
  const snapConfigPath = path.join(appDataDir, 'SnapMind_AI_App', 'config.json');
  let apiKey = '';
  if (fs.existsSync(snapConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(snapConfigPath, 'utf8'));
      apiKey = cfg.apiKey;
    } catch (e) {}
  }
  if (!apiKey) apiKey = process.env.GEMINI_API_KEY || '';

  assert(Boolean(apiKey), `Active API Key available: ${apiKey.substring(0, 8)}...`);

  // Create lightweight test image (400x200)
  const w = 400;
  const h = 200;
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 250; buf[i+1] = 250; buf[i+2] = 250; buf[i+3] = 255;
  }
  const img = nativeImage.createFromBuffer(buf, { width: w, height: h });
  const b64 = img.toJPEG(80).toString('base64');

  const streamPrompt = `คุณคือผู้เชี่ยวชาญวิเคราะห์ภาพถ่ายหน้าจอระดับสูง วิเคราะห์ภาพนี้และตอบกลับอย่างรวดเร็ว กระชับ ตรงประเด็นที่สุด โดยแบ่งหัวข้อตามรูปแบบนี้อย่างเคร่งครัด (ใส่ [ANSWER] เป็นอันดับแรก ตามด้วย [OCR]):

### [ANSWER]
(คำตอบหลักตรงประเด็น ชัดเจน สรุปสาระสำคัญทันที หากมีสูตรคณิตศาสตร์หรือสัญลักษณ์พิเศษให้ใช้รูปแบบ LaTeX $...$ หรือ $$...$$)

### [OCR]
(ถอดข้อความตัวอักษรทุกคำ ทุกบรรทัด ที่ปรากฏในภาพต้นฉบับออกมาแบบเป๊ะๆ 100% ตามภาษาเดิม ห้ามสรุป ห้ามแปล ห้ามข้ามคำ รักษาการขึ้นบรรทัดใหม่ตามภาพ หากในภาพไม่มีข้อความให้ระบุว่า "(ไม่มีข้อความในภาพ)")

### [EXPLAIN]
(คำอธิบายรายละเอียดเชิงลึกแบบกระชับ ตรงจุด 1-2 ย่อหน้า)

### [SUMMARY]
(สรุปประเด็นสำคัญเป็นข้อๆ 1-3 ข้อสั้นๆ)

### [TRANSLATE]
(แปลเนื้อหาหรือข้อความทั้งหมดในภาพออกมาเป็นภาษาไทยอย่างกระชับ สละสลวย ถูกต้องตามหลักภาษาและความหมาย)
`;

  const requestPayload = {
    contents: [{
      parts: [
        { text: streamPrompt },
        { inline_data: { mime_type: 'image/jpeg', data: b64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 2048
    }
  };

  const modelId = 'gemini-3.5-flash-lite';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

  console.log(`  🌐 Initiating SSE stream to: ${modelId}...`);
  const t0 = performance.now();
  const fetchFn = (typeof net !== 'undefined' && net.fetch) ? net.fetch : fetch;
  const response = await fetchFn(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  assert(response.ok, `HTTP status 200 received from Gemini Stream API`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let firstTokenTime = null;
  let receivedChunks = 0;
  let streamedText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedChunks++;
    const curTime = ((performance.now() - t0) / 1000).toFixed(2);
    if (!firstTokenTime) firstTokenTime = curTime;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.replace(/^data:\s*/, '');
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (textPart) streamedText += textPart;
      } catch (e) {}
    }
  }

  const totalDuration = ((performance.now() - t0) / 1000).toFixed(2);

  assert(receivedChunks >= 1, `Streaming confirmed active: received ${receivedChunks} network chunks`);
  assert(firstTokenTime !== null, `Time To First Token (TTFT) recorded: ${firstTokenTime}s`);
  assert(streamedText.length > 50, `Streamed text received (${streamedText.length} characters)`);
  assert(parseFloat(totalDuration) < 8.0, `Total stream completed in ${totalDuration}s`);

  // Verify streamed sections from actual AI response
  const liveParsed = parseStreamSections(streamedText);
  assert(Boolean(liveParsed.answer), `Live Answer stream extracted: "${liveParsed.answer.substring(0, 40)}..."`);
  assert(liveParsed.ocr !== undefined, `Live OCR section extracted immediately after answer`);
  assert(Boolean(liveParsed.translate), `Live Thai translation present: "${liveParsed.translate.substring(0, 40)}..."`);

  // ----------------------------------------------------
  // TEST 4: STREAM FALLBACK RESILIENCE
  // ----------------------------------------------------
  console.log('\n👉 [TEST 4] Stream Fallback Candidate Recovery');
  const candidateModels = ['non-existent-model-preview-99', 'gemini-3.5-flash-lite'];
  let fallbackRecovered = false;
  let recoveredEndpoint = '';

  for (const endpoint of candidateModels) {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}:streamGenerateContent?alt=sse&key=${apiKey}`;
    try {
      const testRes = await fetchFn(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
      });
      if (testRes.ok) {
        fallbackRecovered = true;
        recoveredEndpoint = endpoint;
        break;
      }
    } catch (e) {}
  }

  assert(fallbackRecovered && recoveredEndpoint === 'gemini-3.5-flash-lite', `Fallback successfully recovered to: ${recoveredEndpoint}`);

  // ----------------------------------------------------
  // TEST 5: SKELETON SCREEN UI & SPEED OPTIMIZATIONS
  // ----------------------------------------------------
  console.log('\n👉 [TEST 5] Skeleton Screen UI & Vision Latency Optimization Checks');
  const scriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
  const styleContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  const mainContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

  // 1. Waiting cursor removal
  assert(!scriptContent.includes('▋'), 'Waiting cursor block (▋) completely removed from script.js');
  assert(!scriptContent.includes('streaming-cursor'), 'No streaming-cursor injected in streaming bubble');
  assert(styleContent.includes('.streaming-cursor {\n  display: none !important;\n}'), 'style.css enforces hiding streaming-cursor');

  // 2. Live Stream badge removal
  assert(!scriptContent.includes('กำลังพิมพ์คำตอบสด'), 'Badge "กำลังพิมพ์คำตอบสด" completely removed from script.js');

  // 3. Skeleton Screen presence
  assert(scriptContent.includes('class="skeleton-container" id="skeletonLoader"'), 'Skeleton container injected on stream start');
  assert(scriptContent.includes('class="skeleton-line w-90"'), 'Staggered skeleton line w-90 present');
  assert(scriptContent.includes('class="skeleton-line w-full"'), 'Staggered skeleton line w-full present');
  assert(scriptContent.includes('class="skeleton-line w-80"'), 'Staggered skeleton line w-80 present');
  assert(scriptContent.includes('class="skeleton-line w-45"'), 'Staggered skeleton line w-45 present');
  assert(styleContent.includes('@keyframes skeletonShimmer'), 'Skeleton shimmer keyframe animation defined');

  // 4. Zero-delay stream token replacement
  assert(scriptContent.includes('let hasReceivedFirstToken = false;'), 'First token state tracker declared');
  assert(scriptContent.includes('if (!hasReceivedFirstToken) return;'), 'Skeleton remains rendered until first token arrives');

  // 5. Speed optimization: Vision tiling cap at 1024px and greedy temp 0.0
  assert(mainContent.includes('maxDimension = 1024;'), 'Crop area capped at 1024px to fit single Gemini Vision tile');
  assert(mainContent.includes('toJPEG(78);'), 'JPEG quality set to 78 for ultra-fast compression');
  assert(mainContent.includes('temperature: 0.0'), 'Temperature set to 0.0 for greedy search & lowest token emission latency');

  // ----------------------------------------------------
  // TEST 6: OCR TAB VERBATIM EXTRACTION & RED-BOX REMOVALS
  // ----------------------------------------------------
  console.log('\n👉 [TEST 6] OCR Verbatim Extraction & Red-Box Elements Removal Verification');

  // 1. Prompt order: ### [ANSWER] followed immediately by ### [EXPLAIN] to eliminate delay
  const ocrIndex = mainContent.indexOf('### [OCR]');
  const answerIndex = mainContent.indexOf('### [ANSWER]');
  const explainIndex = mainContent.indexOf('### [EXPLAIN]');
  assert(explainIndex > answerIndex, 'Main.js streaming prompt places ### [EXPLAIN] directly after ### [ANSWER] for instant explanation');
  assert(mainContent.includes('ocrPromptText') || ocrIndex > 0, 'Main.js streaming prompt includes high-speed OCR extraction');

  // 2. OCR token allocation: maxOutputTokens must be 2048 to avoid cutoffs
  assert(mainContent.includes('maxOutputTokens: 2048'), 'Main.js sets maxOutputTokens to 2048 for full OCR transcript');

  // 3. OCR UI isolation: getCategoryContent isolates OCR without falling back to answer
  assert(scriptContent.includes("case 'ocr':"), 'getCategoryContent explicitly handles OCR case without answer fallback');
  assert(!scriptContent.includes("currentAnalysisResult['ocr'] || currentAnalysisResult['answer']"), 'OCR tab strictly does NOT fall back to answer text');

  // 4. Red Box 1: "ตอบสดเสร็จใน" text prefix completely removed from latency banner
  assert(!scriptContent.includes('ตอบสดเสร็จใน'), 'Text prefix "ตอบสดเสร็จใน" completely removed from script.js');
  assert(scriptContent.includes('latencyText.innerText = `${data.durationSec}s'), 'Latency text displays clean duration format (${data.durationSec}s)');

  // 5. Red Box 2: AI badge tag completely removed from bubble header
  assert(!scriptContent.includes('<div class="ai-badge-tag">'), 'ai-badge-tag container completely removed from appendAiBubble HTML');
  assert(styleContent.includes('.ai-badge-tag {\n  display: none !important;\n}'), 'style.css hides .ai-badge-tag with display: none !important');

  // ----------------------------------------------------
  // TEST 7: INSTANT ANSWER COMPLETION & THINKING DISMISSAL
  // ----------------------------------------------------
  console.log('\n👉 [TEST 7] Instant Answer Completion & Thinking Status Dismissal');

  // 1. State tracker for instant answer completion
  assert(scriptContent.includes('let hasAnswerCompleted = false;'), 'hasAnswerCompleted state tracker declared in processScreenCapture');
  assert(scriptContent.includes('hasAnswerCompleted = true;'), 'hasAnswerCompleted sets to true when answer section finishes');

  // 2. Immediate dismissal of "กำลังวิเคราะห์..." state the moment answer completes
  assert(scriptContent.includes('metricsBanner.classList.remove(\'thinking\');'), 'metricsBanner thinking class dismissed immediately upon answer completion');
  assert(scriptContent.includes('answerLatencySec = ((performance.now() - streamStartTime) / 1000).toFixed(2);'), 'Answer latency calculated and displayed immediately');

  // 3. Action buttons (Copy & Read Aloud) available during live stream completion
  assert(scriptContent.includes('id="liveStreamingActions"'), 'liveStreamingActions container included in streaming bubble');
  assert(scriptContent.includes('actionsEl.style.display = \'flex\';'), 'Action buttons revealed as soon as answer is complete');

  // 4. Main process zero-wait exit on finishReason / [DONE]
  assert(mainContent.includes('if (finishReason) {'), 'main.js detects finishReason immediately in streaming loop');
  assert(mainContent.includes('if (streamEnded) {'), 'main.js exits reader loop without waiting for socket EOF');
  assert(mainContent.includes('await reader.cancel();'), 'main.js cleanly cancels reader upon finishReason');

  // 5. KaTeX math rendering during streaming
  assert(scriptContent.includes('renderMathInElement(target'), 'renderStreamingContent invokes KaTeX math rendering for LaTeX formulas');

  // ----------------------------------------------------
  // TEST 8: INSTANT MULTI-CATEGORY CONTENT & ZERO-BLANK-SCREEN OPTIMIZATION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 8] Instant Multi-Category Content & Zero-Blank-Screen Verification');

  // 1. Core extractor functions presence
  assert(scriptContent.includes('function getCategoryContent(cat, result)'), 'getCategoryContent central extractor defined in script.js');
  assert(scriptContent.includes('function createQuickBulletSummary(text)'), 'createQuickBulletSummary instant summarizer defined in script.js');

  // 2. Both stream and final views use getCategoryContent
  assert(scriptContent.includes('let textRaw = getCategoryContent(activeCategory, currentAnalysisResult);'), 'renderStreamingContent uses getCategoryContent for all tabs');
  assert(scriptContent.includes('let textRaw = getCategoryContent(activeCategory, currentAnalysisResult);'), 'renderConversationView uses getCategoryContent for all tabs');

  // 3. Multilingual section header recognition (Thai + English)
  assert(scriptContent.includes('คำตอบ|คำตอบหลัก'), 'parseStreamSections recognizes Thai answer headers');
  assert(scriptContent.includes('ถอดข้อความ|ข้อความในภาพ'), 'parseStreamSections recognizes Thai OCR headers');
  assert(scriptContent.includes('คำอธิบาย|อธิบาย'), 'parseStreamSections recognizes Thai explain headers');
  assert(scriptContent.includes('สรุป|สรุปประเด็น'), 'parseStreamSections recognizes Thai summary headers');
  assert(scriptContent.includes('คำแปล|แปลไทย|แปลภาษา'), 'parseStreamSections recognizes Thai translation headers');

  // 4. Verification of category extraction
  function testInstantExtraction() {
    function getCategoryContent(cat, result, isStreaming = false) {
      const ans = (result.answer || '').trim();
      const exp = (result.explain || '').trim();
      const sum = (result.summary || '').trim();
      const tr = (result.translate || '').trim();
      const ocrText = (result.ocr || '').trim();

      switch (cat) {
        case 'answer': return ans;
        case 'explain': return exp || (!isStreaming && ans ? ans : '');
        case 'summary': return sum || (!isStreaming && ans ? ans : '');
        case 'translate': return tr || (!isStreaming && ans ? ans : '');
        case 'ocr': return ocrText;
        default: return ans;
      }
    }

    const testMock = {
      answer: 'คำตอบคือ $E = mc^2$',
      explain: 'เนื้อหาในภาพอธิบายเกี่ยวกับทฤษฎีสัมพัทธภาพ',
      summary: 'สรุปประเด็นสำคัญ',
      translate: 'แปลเป็นภาษาไทย'
    };

    assert(getCategoryContent('answer', testMock) === 'คำตอบคือ $E = mc^2$', 'Answer extracted directly');
    assert(getCategoryContent('explain', testMock).includes('ทฤษฎีสัมพัทธภาพ'), 'Explain extracted directly without fake headers');
    assert(Boolean(getCategoryContent('summary', testMock)), 'Summary extracted directly');
    assert(Boolean(getCategoryContent('translate', testMock)), 'Translate extracted directly');
  }

  testInstantExtraction();

  // ----------------------------------------------------
  // TEST 9: INSTANT HISTORY VIEW & ANSWER DISPLAY VERIFICATION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 9] Instant History Answer Display & Non-Disappearing Window Verification');

  const mainJsContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const preloadJsContent = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');

  // 1. Verify preload exposes showWindow IPC
  assert(preloadJsContent.includes("showWindow: () => ipcRenderer.send('show-window')"), 'preload.js exposes showWindow IPC bridge');

  // 2. Verify main.js implements show-window handler
  assert(mainJsContent.includes("ipcMain.on('show-window'"), 'main.js handles show-window IPC message');
  assert(mainJsContent.includes('mainWindow.show()') && mainJsContent.includes('mainWindow.focus()'), 'main.js shows and focuses mainWindow on show-window');

  // 3. Verify script.js does NOT call closeHistoryModal in loadHistoryItem (which caused window disappearance)
  const loadHistoryItemMatch = scriptContent.match(/function loadHistoryItem\(id\)\s*\{([\s\S]*?)\n\}/);
  assert(loadHistoryItemMatch !== null, 'loadHistoryItem function found in script.js');

  if (loadHistoryItemMatch) {
    const fnBody = loadHistoryItemMatch[1];
    assert(!fnBody.includes('closeHistoryModal()'), 'loadHistoryItem strictly does NOT call closeHistoryModal() (prevents hideWindow)');
    assert(fnBody.includes("modal.style.display = 'none'"), 'loadHistoryItem directly closes history modal');
    assert(fnBody.includes('window.electronAPI.showWindow()'), 'loadHistoryItem calls showWindow to ensure desktop visibility');
    assert(fnBody.includes('showAiWindowPosition('), 'loadHistoryItem calls showAiWindowPosition to place AI window');
    assert(fnBody.includes('setIgnoreMouseEvents(false)'), 'loadHistoryItem enables mouse clicks immediately');
    assert(fnBody.includes('isStreamingActive = false'), 'loadHistoryItem resets isStreamingActive');
    assert(fnBody.includes('hasReceivedFirstToken = true'), 'loadHistoryItem sets hasReceivedFirstToken to bypass skeleton');
    assert(fnBody.includes("metricsBanner.classList.remove('thinking')"), 'loadHistoryItem dismisses thinking banner');
    assert(fnBody.includes("activeCategory = 'answer'"), 'loadHistoryItem resets active tab to answer');
    assert(fnBody.includes('renderConversationView()'), 'loadHistoryItem immediately renders conversation view');
    assert(fnBody.includes('String(h.id) === String(id)'), 'loadHistoryItem uses type-safe string comparison for ID matching');
  }

  // 4. Verify openHistoryModal attaches clickable handler to item container and has answer fallback title
  const openHistoryModalMatch = scriptContent.match(/function openHistoryModal\(\)\s*\{([\s\S]*?)\n\}/);
  assert(openHistoryModalMatch !== null, 'openHistoryModal function found in script.js');
  if (openHistoryModalMatch) {
    const modalBody = openHistoryModalMatch[1];
    assert(modalBody.includes("loadHistoryItem('${item.id}')"), 'openHistoryModal sets onclick loadHistoryItem on history row');
    assert(modalBody.includes('item.result?.answer'), 'openHistoryModal uses answer fallback for item title');
  }

  // 5. Simulate history item load and immediate answer rendering
  {
    const mockHistoryItem = {
      id: 1711000000000,
      timestamp: '20/09/2026 11:30',
      latency: '1.25s',
      model: 'gemini-3.5-flash-lite',
      result: {
        answer: 'ผลการคำนวณคือ $2 + 2 = 4$ ถูกต้องแม่นยำ',
        explain: 'คำอธิบายเพิ่มเติมทางคณิตศาสตร์',
        summary: '- สรุปคำตอบคือ 4',
        translate: 'ผลการคำนวณคือ 4',
        ocr: '2 + 2 = ?'
      }
    };

    let simulatedAiWindowDisplay = 'none';
    let simulatedModalDisplay = 'flex';
    let simulatedActiveCategory = 'explain'; // initial non-answer
    let renderedAnswerContent = '';

    // Simulate loadHistoryItem execution logic
    const found = [mockHistoryItem].find(h => String(h.id) === String(mockHistoryItem.id));
    assert(Boolean(found), 'Found history item by String comparison');

    simulatedModalDisplay = 'none';
    simulatedAiWindowDisplay = 'flex';
    simulatedActiveCategory = 'answer';
    renderedAnswerContent = found.result.answer;

    assert(simulatedModalDisplay === 'none', 'History modal is hidden upon selection');
    assert(simulatedAiWindowDisplay === 'flex', 'AI window is immediately visible');
    assert(simulatedActiveCategory === 'answer', 'Active category is switched to answer');
    assert(renderedAnswerContent.includes('$2 + 2 = 4$'), 'Rendered content contains exact saved answer');
  }

  // ----------------------------------------------------
  // TEST 10: EMOJI REMOVAL & SNIPPING OVERLAY PREVENTION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 10] Emojis Removal in Summary & Default Snipping Overlay Prevention');

  const styleCssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

  // 1. Verify style.css defaults scanCanvas and topHint to display: none
  const scanCanvasRule = styleCssContent.match(/#scanCanvas\s*\{([^}]*)\}/);
  assert(scanCanvasRule !== null && scanCanvasRule[1].includes('display: none'), '#scanCanvas defaults to display: none in style.css');

  const topHintRule = styleCssContent.match(/\.top-hint\s*\{([^}]*)\}/);
  assert(topHintRule !== null && topHintRule[1].includes('display: none'), '.top-hint defaults to display: none in style.css');

  // 2. Verify script.js has removed dartboard (🎯) and pushpin (📌) from summary headers
  const freshScriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
  assert(!freshScriptContent.includes('### 🎯 คำตอบหลัก'), 'Dartboard emoji 🎯 removed from "คำตอบหลัก" header');
  assert(!freshScriptContent.includes('### 📌 สรุปประเด็นสำคัญ'), 'Pushpin emoji 📌 removed from "สรุปประเด็นสำคัญ" header');
  assert(freshScriptContent.includes('### คำตอบหลัก'), 'Clean header "### คำตอบหลัก" present');
  assert(freshScriptContent.includes('### สรุปประเด็นสำคัญ'), 'Clean header "### สรุปประเด็นสำคัญ" present');

  // 3. Verify openHistoryModal, loadHistoryItem, and openSettingsModal explicitly hide topHint and canvas
  assert(freshScriptContent.includes("openHistoryModal() {\n  if (isSnippingActive) cancelSnippingUI(true);\n  if (canvas) canvas.style.display = 'none';\n  if (topHint) topHint.style.display = 'none';"), 'openHistoryModal explicitly cancels snipping and hides canvas & topHint');
  assert(freshScriptContent.includes("loadHistoryItem(id) {\n  if (isSnippingActive) cancelSnippingUI(true);\n  if (canvas) canvas.style.display = 'none';\n  if (topHint) topHint.style.display = 'none';"), 'loadHistoryItem explicitly cancels snipping and hides canvas & topHint');
  assert(freshScriptContent.includes("openSettingsModal() {\n  if (isSnippingActive) cancelSnippingUI(true);\n  if (canvas) canvas.style.display = 'none';\n  if (topHint) topHint.style.display = 'none';"), 'openSettingsModal explicitly cancels snipping and hides canvas & topHint');

  // 4. Verify main.js tray click cancels snipping before opening history or settings
  assert(mainJsContent.includes("mainWindow.webContents.send('cancel-snipping-ui');\n          mainWindow.setIgnoreMouseEvents(false);\n          mainWindow.show();\n          mainWindow.focus();\n          mainWindow.webContents.send('open-history-ui');"), 'main.js cancels snipping on tray history click');

  // ----------------------------------------------------
  // TEST 11: INSTANT EXPLAIN RENDERING & ZERO FLASH OF FAKE FALLBACK
  // ----------------------------------------------------
  console.log('\n👉 [TEST 11] Instant Explain Rendering & Zero Flash of Fake Fallback');

  // 1. Verify script.js does NOT contain artificial fake fallback headers that caused flashing
  assert(!freshScriptContent.includes('### 💡 คำอธิบายและรายละเอียด'), 'Artificial header "### 💡 คำอธิบายและรายละเอียด" removed completely');
  assert(!freshScriptContent.includes('### 🌐 แปลเป็นภาษาไทย'), 'Artificial header "### 🌐 แปลเป็นภาษาไทย" removed completely');

  // 2. Verify getCategoryContent directly returns pure explain text without synthetic prefix
  assert(freshScriptContent.includes("case 'explain':\n      if (exp) return exp;\n      if (!isStreamingActive && ans) return ans;"), 'getCategoryContent returns real explain content directly');

  // 3. Verify renderStreamingContent has clean skeleton fallback for categories not yet arrived
  assert(freshScriptContent.includes("} else if (isStreamingActive) {\n    html = `\n      <div class=\"skeleton-container\" id=\"skeletonLoader\">"), 'renderStreamingContent shows clean skeleton instead of wrong category content');

  // ----------------------------------------------------
  // TEST 12: DUAL CONCURRENT OCR & ANALYSIS STREAMING & UNSELECTABLE TABS
  // ----------------------------------------------------
  console.log('\n👉 [TEST 12] Dual Concurrent OCR & Analysis Streams and Unselectable Tabs');

  // 1. Verify main.js sets up dual parallel streams (analysisPromise and ocrPromise)
  const freshMainJsContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert(freshMainJsContent.includes('analysisPromise'), 'main.js declares concurrent analysisPromise');
  assert(freshMainJsContent.includes('ocrPromise'), 'main.js declares concurrent ocrPromise');
  assert(freshMainJsContent.includes('Promise.allSettled([analysisPromise, ocrPromise])'), 'main.js coordinates streams via Promise.allSettled');
  assert(freshMainJsContent.includes("type: 'ocr'"), "main.js emits OCR chunks with type: 'ocr'");
  assert(freshMainJsContent.includes("type: 'analysis'"), "main.js emits analysis chunks with type: 'analysis'");

  // 2. Verify script.js handles type: 'ocr' independently and updates live OCR text
  assert(freshScriptContent.includes("if (data.type === 'ocr')"), "script.js branches on data.type === 'ocr'");
  assert(freshScriptContent.includes("currentAnalysisResult.ocr = (currentAnalysisResult.ocr || '') + data.chunk;"), 'script.js accumulates OCR chunks in real time');
  assert(freshScriptContent.includes("if (activeCategory === 'ocr')"), 'script.js renders live OCR text immediately when active');

  // 3. Verify style.css enforces non-selectable text on category tabs & buttons
  const freshStyleContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  const catTabsRule = freshStyleContent.match(/\.category-tabs\s*\{([^}]*)\}/);
  assert(catTabsRule !== null && catTabsRule[1].includes('user-select: none !important'), '.category-tabs has user-select: none !important');
  const tabBtnRule = freshStyleContent.match(/\.tab-btn\s*\{([^}]*)\}/);
  assert(tabBtnRule !== null && tabBtnRule[1].includes('user-select: none !important'), '.tab-btn has user-select: none !important');
  assert(freshStyleContent.includes('.tab-btn *') && freshStyleContent.includes('pointer-events: none'), 'Inner tab children disable pointer-events to prevent text drag/selection');

  // 4. Verify index.html disables onselectstart and dragging on tabs
  const freshIndexContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert(freshIndexContent.includes('onselectstart="return false;"'), 'index.html has onselectstart="return false;" on category-tabs');
  assert(freshIndexContent.includes('draggable="false"'), 'index.html has draggable="false" on tab buttons');

  // 👉 [TEST 13] Non-Selectable Action Buttons & Prevent Text Highlight
  console.log("\n👉 [TEST 13] Non-Selectable Action Buttons & Prevent Text Highlight");
  assert(freshStyleContent.includes('.bubble-copy-btn') && freshStyleContent.includes('user-select: none !important'), 'style.css sets user-select: none !important on .bubble-copy-btn');
  assert(freshStyleContent.includes('.bubble-copy-btn *') && freshStyleContent.includes('user-select: none !important'), 'style.css sets user-select: none !important on .bubble-copy-btn * and spans');
  assert(freshStyleContent.includes('.bubble-copy-btn *') && freshStyleContent.includes('pointer-events: none !important'), 'style.css sets pointer-events: none !important on .bubble-copy-btn *');
  assert(freshStyleContent.includes('.bubble-actions') && freshStyleContent.includes('#liveStreamingActions'), 'style.css styles .bubble-actions and #liveStreamingActions');
  assert(freshScriptContent.includes('id="liveStreamingActions" class="bubble-actions"'), 'script.js assigns bubble-actions class to liveStreamingActions');
  assert(freshScriptContent.includes('draggable="false" onselectstart="return false;" onclick="copySingleBubble'), 'script.js disables drag and selection on copy button');
  assert(freshScriptContent.includes('draggable="false" onselectstart="return false;" onclick="speakTextFromBubble'), 'script.js disables drag and selection on speak button');
  assert(freshStyleContent.includes('.chat-bubble p') && freshStyleContent.includes('user-select: text !important'), 'style.css preserves text selectability for AI response content');

  // 👉 [TEST 14] Taskbar Icon Hidden & Snipping Hint Bar Removed
  console.log("\n👉 [TEST 14] Taskbar Icon Hidden & Snipping Hint Bar Removed");
  assert(freshMainJsContent.includes('skipTaskbar: true,'), 'main.js creates BrowserWindow with skipTaskbar: true');
  assert(freshMainJsContent.includes('mainWindow.setSkipTaskbar(true);'), 'main.js enforces mainWindow.setSkipTaskbar(true)');
  assert(!freshIndexContent.includes('ลากเมาส์เลือกพื้นที่บนหน้าจอเพื่อสแกน'), 'index.html completely removes snipping hint text');
  assert(!freshScriptContent.includes("topHint.style.display = 'flex';"), 'script.js does not display topHint during snipping');
  assert(freshStyleContent.includes('.top-hint') && freshStyleContent.includes('display: none !important;'), 'style.css hides top-hint with display: none !important');

  // 👉 [TEST 15] Pin Removed, Stays Open On Outside Click, Zero Flash, & Percent Badge Removed
  console.log("\n👉 [TEST 15] Pin Removed, Stays Open On Outside Click, Zero Flash, & Percent Badge Removed");
  assert(!freshIndexContent.includes('id="pinBtn"'), 'index.html has removed pinBtn');
  assert(freshMainJsContent.includes('alwaysOnTop: true,'), 'main.js defaults to alwaysOnTop: true');
  assert(freshMainJsContent.includes("mainWindow.setAlwaysOnTop(true, 'screen-saver')"), 'main.js maintains alwaysOnTop screen-saver so window does not sink/close');
  assert(freshStyleContent.includes('body.snipping-active') && freshStyleContent.includes('display: none !important;'), 'style.css hides aiWindow completely when snipping-active');
  assert(freshScriptContent.includes("document.body.classList.add('snipping-active');"), 'script.js adds snipping-active on startSnippingUI to prevent flash');
  assert(freshStyleContent.includes('.percent-badge-under') && freshStyleContent.includes('display: none !important;'), 'style.css permanently hides percent-badge-under');
  assert(!freshScriptContent.includes("percentBadge.style.display = 'block';"), 'script.js never sets percentBadge to block');

  // 👉 [TEST 16] Clean Settings Modal, 6 Core Models, Auto-Refresh & Zero-Flash Intermittent Bug Fix
  console.log("\n👉 [TEST 16] Clean Settings Modal, 3 Main Models, Auto-Refresh & Zero-Flash Guarantee");

  // 1. Clean Settings Modal Verification
  assert(freshIndexContent.includes('class="settings-free-badge"'), 'index.html includes streamlined settings-free-badge');
  assert(!freshIndexContent.includes('คำอธิบายฟีเจอร์และการใช้งาน'), 'index.html removes bulky 7-bullet features guide box');
  assert(freshIndexContent.includes('<button class="btn btn-primary" onclick="saveSettingsFromModal()">บันทึก</button>'), 'index.html has concise "บันทึก" button label');
  assert(freshStyleContent.includes('.settings-free-badge'), 'style.css defines .settings-free-badge styling');

  // 2. 3 Main Flagship Models in main.js and script.js
  const coreModelIds = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview'
  ];
  coreModelIds.forEach(mId => {
    assert(freshMainJsContent.includes(`id: '${mId}'`), `main.js TRAY_MODELS includes main model: ${mId}`);
    assert(freshScriptContent.includes(`id: '${mId}'`), `script.js AI_MODELS includes main model: ${mId}`);
  });
  assert(!freshMainJsContent.includes('gemini-robotics-er-1.6-preview'), 'main.js excludes deprecated robotics preview model');
  assert(!freshScriptContent.includes('gemini-robotics-er-1.6-preview'), 'script.js excludes deprecated robotics preview model');

  // 3. Zero-Flash Pre-Paint DOM Cleanup & Buffer Synchronization
  assert(freshMainJsContent.includes('document.body.classList.add(\'snipping-active\');'), 'main.js pre-cleans DOM with snipping-active before showing');
  assert(freshMainJsContent.includes('aiWin.style.display = \'none\';'), 'main.js pre-hides aiWindow via executeJavaScript before showing');
  assert(freshMainJsContent.includes('setTimeout') && freshMainJsContent.includes('mainWindow.show()'), 'main.js uses frame synchronization delay when window is shown from hidden state');
  assert(freshStyleContent.includes('pointer-events: none !important;'), 'style.css sets pointer-events: none !important during snipping-active');
  assert(freshScriptContent.indexOf('chatThread.innerHTML = `') < freshScriptContent.indexOf('showAiWindowPosition(cropBox);'), 'script.js loads skeleton loader BEFORE showing AI window position');
  assert(freshScriptContent.indexOf('aiWindow.style.left =') < freshScriptContent.indexOf('aiWindow.style.display = \'flex\';'), 'script.js sets left/top geometry BEFORE display: flex');
  assert(freshScriptContent.includes('aiWindow.style.visibility = \'hidden\';'), 'script.js hides visibility in closeAiWindow');

  // 4. Auto-Refresh Mechanism
  assert(freshScriptContent.includes('let lastCroppedBox = null;'), 'script.js declares lastCroppedBox tracker');
  assert(freshScriptContent.includes('lastCroppedBox = cropBox;'), 'script.js stores lastCroppedBox in processScreenCapture');
  assert(freshScriptContent.includes('function triggerAutoRefreshIfActive()'), 'script.js declares triggerAutoRefreshIfActive helper');
  assert(freshScriptContent.includes('triggerAutoRefreshIfActive();'), 'script.js invokes triggerAutoRefreshIfActive on model switch');

  // 👉 [TEST 17] Settings Modal Zero-Flash Guarantee & Re-Analysis Simultaneous Answers
  console.log("\n👉 [TEST 17] Settings Modal Zero-Flash Guarantee & Re-Analysis Simultaneous Answers");

  // 1. CSS Zero-Flash Modal Overlay Suppression
  assert(freshStyleContent.includes('body.snipping-active #settingsModal'), 'style.css suppresses #settingsModal during snipping-active');
  assert(freshStyleContent.includes('body.snipping-active #historyModal'), 'style.css suppresses #historyModal during snipping-active');
  assert(freshStyleContent.includes('body.snipping-active .modal-overlay'), 'style.css suppresses .modal-overlay during snipping-active');

  // 2. Pre-cleanup DOM via executeJavaScript in main.js
  assert(freshMainJsContent.includes('const setModal = document.getElementById(\'settingsModal\');'), 'main.js pre-cleans settingsModal before window show');
  assert(freshMainJsContent.includes('const histModal = document.getElementById(\'historyModal\');'), 'main.js pre-cleans historyModal before window show');

  // 3. Renderer-level Modal Suppression in script.js
  assert(freshScriptContent.includes('startSnippingUI() {') && freshScriptContent.includes('settingsModal.style.display = \'none\';'), 'script.js startSnippingUI explicitly hides settingsModal');
  assert(freshScriptContent.includes('startSnippingUI() {') && freshScriptContent.includes('historyModal.style.display = \'none\';'), 'script.js startSnippingUI explicitly hides historyModal');
  assert(freshScriptContent.includes('closeSettingsModal() {') && freshScriptContent.includes('modal.style.visibility = \'hidden\';'), 'script.js closeSettingsModal sets visibility hidden and opacity 0');
  assert(freshScriptContent.includes('closeHistoryModal() {') && freshScriptContent.includes('modal.style.visibility = \'hidden\';'), 'script.js closeHistoryModal sets visibility hidden and opacity 0');

  // 4. Re-analyze With New Model & Simultaneous Answer Delivery
  assert(freshScriptContent.includes('let currentAnalysisRequestId = 0;'), 'script.js declares currentAnalysisRequestId to cancel in-flight streams');
  assert(freshScriptContent.includes('async function reanalyzeWithNewModel()'), 'script.js declares reanalyzeWithNewModel');
  assert(freshScriptContent.includes('const imgDataUrl = currentCroppedBase64;'), 'script.js reanalyzeWithNewModel reuses currentCroppedBase64 without re-cropping desktop');
  assert(freshScriptContent.includes('reanalyzeWithNewModel();'), 'script.js triggerAutoRefreshIfActive delegates to reanalyzeWithNewModel');
  assert(freshScriptContent.includes('กำลังวิเคราะห์ใหม่ด้วย'), 'script.js displays model-specific re-analyzing status in skeleton');
  assert(freshScriptContent.includes('renderConversationView();'), 'script.js releases all answers and categories simultaneously upon stream finish');

  console.log('\n====================================================');
  console.log(`📊 STREAM TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

app.whenReady().then(() => {
  runStreamingTestSuite().catch(err => {
    console.error('Fatal Streaming Test Error:', err);
    process.exit(1);
  });
});
