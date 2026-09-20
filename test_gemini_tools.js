/**
 * SnapMind AI: Comprehensive Gemini Tools Test Suite
 * Validates all 6 tools from เครื่องมือ.txt:
 * 1. Google Search Grounding (google_search)
 * 2. Code Execution (code_execution)
 * 3. URL Context (url_context)
 * 4. Google Maps Grounding (google_maps)
 * 5. File Search RAG (file_search & fileSearchStores)
 * 6. Function Calling (get_current_temperature, create_bar_chart, calculate_math)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 SNAPMIND AI: GEMINI TOOLS TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function pass(desc) {
  passedTests++;
  console.log(`  ✅ PASS: ${desc}`);
}

function fail(desc, err) {
  failedTests++;
  console.error(`  ❌ FAIL: ${desc}`);
  if (err) console.error(`     ${err.message || err}`);
}

// ----------------------------------------------------
// TEST 1: MODULE LOADING & EXPORT INTEGRITY
// ----------------------------------------------------
console.log('👉 [TEST 1] Gemini Tools Module Loading & Export Integrity');
try {
  const geminiTools = require('./gemini_tools.js');
  assert(typeof geminiTools.getGoogleSearchTool === 'function', 'getGoogleSearchTool exported');
  assert(typeof geminiTools.getCodeExecutionTool === 'function', 'getCodeExecutionTool exported');
  assert(typeof geminiTools.getUrlContextTool === 'function', 'getUrlContextTool exported');
  assert(typeof geminiTools.getGoogleMapsTool === 'function', 'getGoogleMapsTool exported');
  assert(typeof geminiTools.getFileSearchTool === 'function', 'getFileSearchTool exported');
  assert(typeof geminiTools.getFunctionDeclarations === 'function', 'getFunctionDeclarations exported');
  assert(typeof geminiTools.buildToolsArray === 'function', 'buildToolsArray exported');
  assert(typeof geminiTools.executeToolFunction === 'function', 'executeToolFunction exported');
  assert(typeof geminiTools.parseInteractionSteps === 'function', 'parseInteractionSteps exported');
  assert(typeof geminiTools.runGeminiInteraction === 'function', 'runGeminiInteraction exported');
  assert(typeof geminiTools.createFileSearchStore === 'function', 'createFileSearchStore exported');
  pass('All core tool builders, managers, and runners exported cleanly');
} catch (e) {
  fail('Module exports check failed', e);
}

// ----------------------------------------------------
// TEST 2: GOOGLE SEARCH GROUNDING TOOL
// ----------------------------------------------------
console.log('\n👉 [TEST 2] Google Search Grounding Tool (google_search)');
try {
  const { getGoogleSearchTool, buildToolsArray } = require('./gemini_tools.js');
  const searchTool = getGoogleSearchTool();
  assert.strictEqual(searchTool.type, 'google_search', 'Tool type is google_search');
  pass('Google Search tool matches exact @google/genai SDK specification: { type: "google_search" }');

  const toolsArr = buildToolsArray({
    enableGoogleSearch: true,
    enableCodeExecution: false,
    enableUrlContext: false,
    enableGoogleMaps: false,
    enableFileSearch: false,
    enableFunctionCalling: false
  });
  assert.strictEqual(toolsArr.length, 1, 'Only google_search enabled');
  assert.strictEqual(toolsArr[0].type, 'google_search');
  pass('Composite tool builder isolates google_search tool correctly');
} catch (e) {
  fail('Google Search tool check failed', e);
}

// ----------------------------------------------------
// TEST 3: CODE EXECUTION TOOL
// ----------------------------------------------------
console.log('\n👉 [TEST 3] Code Execution Tool (code_execution)');
try {
  const { getCodeExecutionTool, buildToolsArray } = require('./gemini_tools.js');
  const codeTool = getCodeExecutionTool();
  assert.strictEqual(codeTool.type, 'code_execution', 'Tool type is code_execution');
  pass('Code Execution tool matches exact @google/genai SDK specification: { type: "code_execution" }');

  const toolsArr = buildToolsArray({
    enableGoogleSearch: false,
    enableCodeExecution: true,
    enableUrlContext: false,
    enableGoogleMaps: false,
    enableFileSearch: false,
    enableFunctionCalling: false
  });
  assert.strictEqual(toolsArr.length, 1);
  assert.strictEqual(toolsArr[0].type, 'code_execution');
  pass('Composite tool builder isolates code_execution tool correctly');
} catch (e) {
  fail('Code Execution tool check failed', e);
}

// ----------------------------------------------------
// TEST 4: URL CONTEXT TOOL
// ----------------------------------------------------
console.log('\n👉 [TEST 4] URL Context Tool (url_context)');
try {
  const { getUrlContextTool, buildToolsArray } = require('./gemini_tools.js');
  const urlTool = getUrlContextTool();
  assert.strictEqual(urlTool.type, 'url_context', 'Tool type is url_context');
  pass('URL Context tool matches exact @google/genai SDK specification: { type: "url_context" }');

  const toolsArr = buildToolsArray({
    enableGoogleSearch: false,
    enableCodeExecution: false,
    enableUrlContext: true,
    enableGoogleMaps: false,
    enableFileSearch: false,
    enableFunctionCalling: false
  });
  assert.strictEqual(toolsArr.length, 1);
  assert.strictEqual(toolsArr[0].type, 'url_context');
  pass('Composite tool builder isolates url_context tool correctly');
} catch (e) {
  fail('URL Context tool check failed', e);
}

// ----------------------------------------------------
// TEST 5: GOOGLE MAPS GROUNDING TOOL
// ----------------------------------------------------
console.log('\n👉 [TEST 5] Google Maps Grounding Tool (google_maps)');
try {
  const { getGoogleMapsTool, buildToolsArray } = require('./gemini_tools.js');
  
  // Test basic maps tool without coordinates
  const basicMaps = getGoogleMapsTool();
  assert.strictEqual(basicMaps.type, 'google_maps');
  assert.strictEqual(basicMaps.latitude, undefined);
  pass('Basic Google Maps tool matches { type: "google_maps" }');

  // Test maps tool with geographic coordinates
  const coordsMaps = getGoogleMapsTool({ latitude: 13.7563, longitude: 100.5018 });
  assert.strictEqual(coordsMaps.type, 'google_maps');
  assert.strictEqual(coordsMaps.latitude, 13.7563);
  assert.strictEqual(coordsMaps.longitude, 100.5018);
  pass('Google Maps tool handles coordinates (latitude: 13.7563, longitude: 100.5018) properly');

  const toolsArr = buildToolsArray({
    enableGoogleSearch: false,
    enableCodeExecution: false,
    enableUrlContext: false,
    enableGoogleMaps: true,
    latitude: 37.78193,
    longitude: -122.40476,
    enableFileSearch: false,
    enableFunctionCalling: false
  });
  assert.strictEqual(toolsArr.length, 1);
  assert.strictEqual(toolsArr[0].type, 'google_maps');
  assert.strictEqual(toolsArr[0].latitude, 37.78193);
  assert.strictEqual(toolsArr[0].longitude, -122.40476);
  pass('Composite tool builder sets custom coordinates for Google Maps');
} catch (e) {
  fail('Google Maps tool check failed', e);
}

// ----------------------------------------------------
// TEST 6: FILE SEARCH RAG TOOL & STORE CONFIGURATION
// ----------------------------------------------------
console.log('\n👉 [TEST 6] File Search Tool (file_search & RAG Stores)');
try {
  const { getFileSearchTool, buildToolsArray } = require('./gemini_tools.js');
  
  const fileTool = getFileSearchTool(['stores/my-store-123'], 'author="Robert Graves"');
  assert.strictEqual(fileTool.type, 'file_search');
  assert.deepStrictEqual(fileTool.file_search_store_names, ['stores/my-store-123']);
  assert.strictEqual(fileTool.metadata_filter, 'author="Robert Graves"');
  pass('File Search tool includes store names array and custom metadata filter');

  const toolsArr = buildToolsArray({
    enableGoogleSearch: false,
    enableCodeExecution: false,
    enableUrlContext: false,
    enableGoogleMaps: false,
    enableFileSearch: true,
    fileSearchStoreNames: ['stores/catalog'],
    metadataFilter: 'category="books"',
    enableFunctionCalling: false
  });
  assert.strictEqual(toolsArr.length, 1);
  assert.strictEqual(toolsArr[0].type, 'file_search');
  assert.strictEqual(toolsArr[0].file_search_store_names[0], 'stores/catalog');
  pass('Composite tool builder builds file_search configuration with store references');
} catch (e) {
  fail('File Search tool check failed', e);
}

// ----------------------------------------------------
// TEST 7: FUNCTION CALLING & BUILT-IN TOOL IMPLEMENTATIONS
// ----------------------------------------------------
console.log('\n👉 [TEST 7] Function Calling Tool (Weather, Chart SVG & Math)');
(async () => {
  try {
    const { getFunctionDeclarations, executeToolFunction, BUILTIN_FUNCTIONS } = require('./gemini_tools.js');
    
    // Check Declarations
    const decls = getFunctionDeclarations();
    assert(decls.length >= 3, 'At least 3 function declarations available');
    const weatherDecl = decls.find(d => d.name === 'get_current_temperature');
    const chartDecl = decls.find(d => d.name === 'create_bar_chart');
    const mathDecl = decls.find(d => d.name === 'calculate_math');

    assert(Boolean(weatherDecl), 'get_current_temperature declaration found');
    assert.strictEqual(weatherDecl.type, 'function');
    assert(weatherDecl.parameters.required.includes('location'), 'location required');

    assert(Boolean(chartDecl), 'create_bar_chart declaration found');
    assert.strictEqual(chartDecl.type, 'function');
    assert(chartDecl.parameters.required.includes('title'), 'title required');
    assert(chartDecl.parameters.required.includes('labels'), 'labels required');
    assert(chartDecl.parameters.required.includes('values'), 'values required');

    assert(Boolean(mathDecl), 'calculate_math declaration found');
    pass('Function calling declarations strictly adhere to JSON schema specification');

    // Execute get_current_temperature
    const weatherRes = await executeToolFunction('get_current_temperature', { location: 'Bangkok' });
    assert.strictEqual(weatherRes.location, 'Bangkok');
    assert(typeof weatherRes.temperature_celsius === 'number');
    assert(Boolean(weatherRes.condition));
    pass(`get_current_temperature executed: ${weatherRes.location} -> ${weatherRes.temperature_celsius}°C (${weatherRes.condition})`);

    // Execute create_bar_chart
    const chartRes = await executeToolFunction('create_bar_chart', {
      title: 'Quarterly Sales',
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      values: [50000, 75000, 60000, 90000]
    });
    assert.strictEqual(chartRes.title, 'Quarterly Sales');
    assert(chartRes.svg.includes('<svg'), 'SVG tag present in chart');
    assert(chartRes.svg.includes('Quarterly Sales'), 'Chart title present in SVG');
    assert(chartRes.svg.includes('50000') && chartRes.svg.includes('90000'), 'Values present in SVG bars');
    pass('create_bar_chart generates valid responsive SVG bar chart with data labels and values');

    // Execute calculate_math
    const mathRes = await executeToolFunction('calculate_math', { expression: 'sqrt(144) + 25 * 4' });
    assert.strictEqual(mathRes.result, 112);
    pass(`calculate_math executed: "sqrt(144) + 25 * 4" -> ${mathRes.result}`);

  } catch (e) {
    fail('Function calling check failed', e);
  }

  // ----------------------------------------------------
  // TEST 8: STEP PARSER & CITATION ANNOTATIONS
  // ----------------------------------------------------
  console.log('\n👉 [TEST 8] Interaction Steps & Citations Parser');
  try {
    const { parseInteractionSteps } = require('./gemini_tools.js');

    const mockInteraction = {
      output_text: "Spain won Euro 2024, defeating England 2-1 in the final.",
      steps: [
        {
          type: "thought",
          summary: [{ type: "text", text: "User is asking about Euro 2024. Need to search web." }]
        },
        {
          type: "google_search_call",
          arguments: { queries: ["UEFA Euro 2024 winner"] }
        },
        {
          type: "google_search_result",
          call_id: "search_001",
          result: [{ search_suggestions: "Euro 2024 results" }]
        },
        {
          type: "code_execution_call",
          arguments: { code: "print(50 * 50)" }
        },
        {
          type: "code_execution_result",
          result: "2500\n"
        },
        {
          type: "url_context_result",
          status: "success",
          url: "https://example.com/data"
        },
        {
          type: "function_call",
          name: "create_bar_chart",
          arguments: { title: "Test Chart", labels: ["A", "B"], values: [10, 20] }
        },
        {
          type: "model_output",
          content: [
            {
              type: "text",
              text: "Spain won Euro 2024, defeating England 2-1 in the final.",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://www.uefa.com/euro2024/news",
                  title: "UEFA.com",
                  start_index: 0,
                  end_index: 56
                },
                {
                  type: "place_citation",
                  name: "Olympiastadion Berlin",
                  url: "https://maps.google.com/?cid=123",
                  address: "Olympischer Platz 3, 14053 Berlin"
                },
                {
                  type: "file_citation",
                  file_name: "tournament_stats.pdf",
                  source: "UEFA Tournament Report",
                  page_number: 14,
                  media_id: "media_789"
                }
              ]
            }
          ]
        }
      ]
    };

    const parsed = parseInteractionSteps(mockInteraction);

    assert.strictEqual(parsed.thoughts.length, 1);
    assert.strictEqual(parsed.searchCalls.length, 1);
    assert.strictEqual(parsed.searchCalls[0].queries[0], "UEFA Euro 2024 winner");
    assert.strictEqual(parsed.searchResults.length, 1);
    pass('Parser extracts thoughts, google_search_call queries, and search results');

    assert.strictEqual(parsed.codeCalls.length, 1);
    assert.strictEqual(parsed.codeCalls[0].code, "print(50 * 50)");
    assert.strictEqual(parsed.codeResults.length, 1);
    assert.strictEqual(parsed.codeResults[0].output, "2500\n");
    pass('Parser extracts code_execution_call and code_execution_result');

    assert.strictEqual(parsed.urlContextResults.length, 1);
    assert.strictEqual(parsed.urlContextResults[0].url, "https://example.com/data");
    pass('Parser extracts url_context_result');

    assert.strictEqual(parsed.functionCalls.length, 1);
    assert.strictEqual(parsed.functionCalls[0].name, "create_bar_chart");
    pass('Parser extracts function_call');

    // Citations
    assert.strictEqual(parsed.citations.urls.length, 1);
    assert.strictEqual(parsed.citations.urls[0].title, "UEFA.com");
    assert.strictEqual(parsed.citations.urls[0].url, "https://www.uefa.com/euro2024/news");
    pass('Parser extracts url_citation with title, url, and text offsets');

    assert.strictEqual(parsed.citations.places.length, 1);
    assert.strictEqual(parsed.citations.places[0].name, "Olympiastadion Berlin");
    assert.strictEqual(parsed.citations.places[0].url, "https://maps.google.com/?cid=123");
    pass('Parser extracts place_citation with name and Google Maps URL');

    assert.strictEqual(parsed.citations.files.length, 1);
    assert.strictEqual(parsed.citations.files[0].fileName, "tournament_stats.pdf");
    assert.strictEqual(parsed.citations.files[0].pageNumber, 14);
    assert.strictEqual(parsed.citations.files[0].mediaId, "media_789");
    pass('Parser extracts file_citation with filename, page number, and media ID');

  } catch (e) {
    fail('Interaction step parser test failed', e);
  }

  // ----------------------------------------------------
  // TEST 9: FILE SEARCH STORES (RAG) API CLIENT PROTO
  // ----------------------------------------------------
  console.log('\n👉 [TEST 9] File Search Stores (RAG) SDK Prototype Verification');
  try {
    const { GoogleGenAI } = require('@google/genai');
    const dummyClient = new GoogleGenAI({ apiKey: 'DUMMY_TEST_KEY_FOR_TESTING' });

    assert(Boolean(dummyClient.fileSearchStores), 'fileSearchStores service exists');
    const storeProto = Object.getOwnPropertyNames(Object.getPrototypeOf(dummyClient.fileSearchStores));
    assert(storeProto.includes('create'), 'create method exists');
    assert(storeProto.includes('uploadToFileSearchStore'), 'uploadToFileSearchStore method exists');
    assert(storeProto.includes('importFile'), 'importFile method exists');
    assert(storeProto.includes('delete'), 'delete method exists');
    assert(storeProto.includes('downloadMedia'), 'downloadMedia method exists');

    const docProto = Object.getOwnPropertyNames(Object.getPrototypeOf(dummyClient.fileSearchStores.documents || {}));
    assert(docProto.includes('delete'), 'documents.delete method exists');
    assert(docProto.includes('get'), 'documents.get method exists');

    pass('@google/genai SDK fileSearchStores implements create, upload, import, delete, downloadMedia, and documents API');
  } catch (e) {
    fail('File Search Stores prototype check failed', e);
  }

  // ----------------------------------------------------
  // TEST 10: MAIN PROCESS & CONFIG INTEGRATION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 10] Main Process Integration & Tools Persistence');
  try {
    const mainContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

    assert(mainContent.includes("require('./gemini_tools.js')"), 'main.js imports gemini_tools.js');
    assert(mainContent.includes('enableGoogleSearch: true'), 'DEFAULT_CONFIG has enableGoogleSearch');
    assert(mainContent.includes('enableCodeExecution: true'), 'DEFAULT_CONFIG has enableCodeExecution');
    assert(mainContent.includes('enableUrlContext: true'), 'DEFAULT_CONFIG has enableUrlContext');
    assert(mainContent.includes('enableGoogleMaps: true'), 'DEFAULT_CONFIG has enableGoogleMaps');
    assert(mainContent.includes('enableFunctionCalling: true'), 'DEFAULT_CONFIG has enableFunctionCalling');

    assert(mainContent.includes("ipcMain.handle('gemini-get-tools-config'"), 'gemini-get-tools-config handler exists');
    assert(mainContent.includes("ipcMain.handle('gemini-update-tools-config'"), 'gemini-update-tools-config handler exists');
    assert(mainContent.includes("ipcMain.handle('gemini-tools-run-interaction'"), 'gemini-tools-run-interaction handler exists');
    assert(mainContent.includes("ipcMain.handle('gemini-file-search-create-store'"), 'gemini-file-search-create-store handler exists');
    assert(mainContent.includes("ipcMain.handle('gemini-file-search-upload-file'"), 'gemini-file-search-upload-file handler exists');
    assert(mainContent.includes("ipcMain.handle('gemini-file-search-list-stores'"), 'gemini-file-search-list-stores handler exists');
    assert(mainContent.includes("ipcMain.handle('gemini-file-search-delete-store'"), 'gemini-file-search-delete-store handler exists');
    assert(mainContent.includes("ipcMain.handle('gemini-tools-execute-function'"), 'gemini-tools-execute-function handler exists');

    assert(mainContent.includes('toolsData'), 'gemini-chat-message returns toolsData');
    pass('main.js registers all Gemini Tools IPC channels and persists tool preferences');
  } catch (e) {
    fail('Main process integration check failed', e);
  }

  // ----------------------------------------------------
  // TEST 11: PRELOAD & CONTEXTBRIDGE EXPOSURE
  // ----------------------------------------------------
  console.log('\n👉 [TEST 11] Preload.js ContextBridge Tools Exposure');
  try {
    const preloadContent = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');

    assert(preloadContent.includes('getToolsConfig:'), 'getToolsConfig exposed');
    assert(preloadContent.includes('updateToolsConfig:'), 'updateToolsConfig exposed');
    assert(preloadContent.includes('runToolInteraction:'), 'runToolInteraction exposed');
    assert(preloadContent.includes('executeToolFunction:'), 'executeToolFunction exposed');
    assert(preloadContent.includes('createFileSearchStore:'), 'createFileSearchStore exposed');
    assert(preloadContent.includes('uploadFileSearchStore:'), 'uploadFileSearchStore exposed');
    assert(preloadContent.includes('listFileSearchStores:'), 'listFileSearchStores exposed');
    assert(preloadContent.includes('deleteFileSearchStore:'), 'deleteFileSearchStore exposed');

    pass('preload.js safely exposes all Gemini Tools API invocations to Renderer');
  } catch (e) {
    fail('Preload check failed', e);
  }

  // ----------------------------------------------------
  // TEST 12: UI SETTINGS & RENDERER INTEGRATION
  // ----------------------------------------------------
  console.log('\n👉 [TEST 12] HTML & Script UI Integration');
  try {
    const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const scriptContent = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
    const styleContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

    // HTML elements
    assert(htmlContent.includes('id="toolGoogleSearch"'), 'toolGoogleSearch checkbox in index.html');
    assert(htmlContent.includes('id="toolCodeExecution"'), 'toolCodeExecution checkbox in index.html');
    assert(htmlContent.includes('id="toolUrlContext"'), 'toolUrlContext checkbox in index.html');
    assert(htmlContent.includes('id="toolGoogleMaps"'), 'toolGoogleMaps checkbox in index.html');
    assert(htmlContent.includes('id="toolFileSearch"'), 'toolFileSearch checkbox in index.html');
    assert(htmlContent.includes('id="toolFunctionCalling"'), 'toolFunctionCalling checkbox in index.html');
    pass('index.html contains all 6 Gemini Tools UI toggle checkboxes in Settings Modal');

    // Script functions
    assert(scriptContent.includes('formatToolsDataHtml'), 'formatToolsDataHtml defined in script.js');
    assert(scriptContent.includes('code-execution-block'), 'code execution block formatted in script.js');
    assert(scriptContent.includes('citations-container'), 'citations formatted in script.js');
    assert(scriptContent.includes('toolGoogleSearch'), 'script.js manages toolGoogleSearch checkbox');
    assert(scriptContent.includes('toolCodeExecution'), 'script.js manages toolCodeExecution checkbox');
    pass('script.js renders citations, code execution blocks, charts, and synchronizes settings');

    // Style elements
    assert(styleContent.includes('.tools-grid'), 'tools-grid styled in style.css');
    assert(styleContent.includes('.tool-checkbox-card'), 'tool-checkbox-card styled in style.css');
    assert(styleContent.includes('.citation-pill'), 'citation-pill styled in style.css');
    assert(styleContent.includes('.code-execution-block'), 'code-execution-block styled in style.css');
    pass('style.css styles tools grid, citation pills, and Python code blocks');
  } catch (e) {
    fail('UI & Renderer integration check failed', e);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`📊 TOOLS TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
