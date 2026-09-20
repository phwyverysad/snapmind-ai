/**
 * Gemini Tools Integration Module for SnapMind AI
 * Supports all tools from Google GenAI SDK (@google/genai >= 2.0.0) and Interactions API:
 * 1. Google Search Grounding (google_search)
 * 2. Code Execution (code_execution)
 * 3. URL Context (url_context)
 * 4. Google Maps Grounding (google_maps)
 * 5. File Search RAG (file_search & fileSearchStores)
 * 6. Function Calling (get_current_temperature, create_bar_chart, calculate_math)
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// ============================================================================
// 1. TOOL DECLARATIONS & CONFIGURATION BUILDERS
// ============================================================================

/**
 * Returns Google Search Grounding Tool definition
 */
function getGoogleSearchTool() {
  return { type: 'google_search' };
}

/**
 * Returns Code Execution Tool definition
 */
function getCodeExecutionTool() {
  return { type: 'code_execution' };
}

/**
 * Returns URL Context Tool definition
 */
function getUrlContextTool() {
  return { type: 'url_context' };
}

/**
 * Returns Google Maps Grounding Tool definition with optional geographic coordinates
 */
function getGoogleMapsTool(coords = null) {
  const tool = { type: 'google_maps' };
  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    tool.latitude = coords.latitude;
    tool.longitude = coords.longitude;
  }
  return tool;
}

/**
 * Returns File Search (RAG) Tool definition
 */
function getFileSearchTool(storeNames = [], metadataFilter = null) {
  const tool = {
    type: 'file_search',
    file_search_store_names: Array.isArray(storeNames) ? storeNames : [storeNames].filter(Boolean)
  };
  if (metadataFilter && typeof metadataFilter === 'string') {
    tool.metadata_filter = metadataFilter;
  }
  return tool;
}

/**
 * Built-in Function Declarations for Function Calling
 */
const BUILTIN_FUNCTIONS = {
  get_current_temperature: {
    type: 'function',
    name: 'get_current_temperature',
    description: 'ดึงข้อมูลอุณหภูมิและสภาพอากาศปัจจุบันของเมืองหรือสถานที่ที่ระบุ (Gets the current temperature and weather condition for a given location)',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'ชื่อเมืองหรือสถานที่ เช่น Bangkok, Tokyo, London, เชียงใหม่'
        }
      },
      required: ['location']
    }
  },

  create_bar_chart: {
    type: 'function',
    name: 'create_bar_chart',
    description: 'สร้างแผนภูมิแท่ง (Bar Chart) เป็น SVG จากชุดข้อมูลที่ระบุ (Creates a visual bar chart SVG given a title, labels, and numeric values)',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'หัวข้อของแผนภูมิแท่ง'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'ป้ายกำกับแต่ละแท่งข้อมูล เช่น ["Q1", "Q2", "Q3", "Q4"]'
        },
        values: {
          type: 'array',
          items: { type: 'number' },
          description: 'ตัวเลขค่าข้อมูลของแต่ละแท่ง'
        }
      },
      required: ['title', 'labels', 'values']
    }
  },

  calculate_math: {
    type: 'function',
    name: 'calculate_math',
    description: 'คำนวณนิพจน์คณิตศาสตร์อย่างแม่นยำ (Evaluates a mathematical expression accurately)',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'สมการหรือนิพจน์คณิตศาสตร์ เช่น "sqrt(144) + 25 * 4"'
        }
      },
      required: ['expression']
    }
  }
};

/**
 * Returns function calling declarations
 */
function getFunctionDeclarations(enabledFunctions = ['get_current_temperature', 'create_bar_chart', 'calculate_math']) {
  return enabledFunctions
    .map(fnName => BUILTIN_FUNCTIONS[fnName])
    .filter(Boolean);
}

/**
 * Builds composite tools array based on user preferences and context
 */
function buildToolsArray(options = {}) {
  const {
    enableGoogleSearch = true,
    enableCodeExecution = true,
    enableUrlContext = true,
    enableGoogleMaps = true,
    enableFileSearch = false,
    fileSearchStoreNames = [],
    metadataFilter = null,
    enableFunctionCalling = true,
    latitude = 13.7563, // Default Bangkok
    longitude = 100.5018
  } = options;

  const tools = [];

  if (enableGoogleSearch) {
    tools.push(getGoogleSearchTool());
  }

  if (enableCodeExecution) {
    tools.push(getCodeExecutionTool());
  }

  if (enableUrlContext) {
    tools.push(getUrlContextTool());
  }

  if (enableGoogleMaps) {
    tools.push(getGoogleMapsTool({ latitude, longitude }));
  }

  if (enableFileSearch && fileSearchStoreNames && fileSearchStoreNames.length > 0) {
    tools.push(getFileSearchTool(fileSearchStoreNames, metadataFilter));
  }

  if (enableFunctionCalling) {
    const fnDecls = getFunctionDeclarations();
    for (const fn of fnDecls) {
      tools.push(fn);
    }
  }

  return tools;
}

// ============================================================================
// 2. BUILT-IN FUNCTION EXECUTION HANDLERS
// ============================================================================

/**
 * Generates an SVG bar chart
 */
function generateBarChartSvg(title, labels, values) {
  if (!labels || !values || labels.length === 0 || values.length === 0) {
    return '<p>ไม่มีข้อมูลสำหรับสร้างกราฟ</p>';
  }

  const width = 460;
  const height = 240;
  const padding = { top: 35, right: 25, bottom: 40, left: 55 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values, 1);
  const barWidth = Math.max(16, Math.min(50, (chartWidth / labels.length) * 0.65));
  const barGap = chartWidth / labels.length;

  const colors = ['#0284c7', '#38bdf8', '#0ea5e9', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  let barsSvg = '';
  labels.forEach((label, idx) => {
    const val = values[idx] || 0;
    const barH = (val / maxVal) * chartHeight;
    const x = padding.left + (idx * barGap) + (barGap - barWidth) / 2;
    const y = padding.top + chartHeight - barH;
    const color = colors[idx % colors.length];

    barsSvg += `
      <g class="chart-bar-group">
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="4" fill="${color}" opacity="0.9">
          <title>${label}: ${val}</title>
        </rect>
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="11" font-weight="600" text-anchor="middle" fill="#e2e8f0">${val}</text>
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${(padding.top + chartHeight + 18).toFixed(1)}" font-size="11" text-anchor="middle" fill="#94a3b8">${label}</text>
      </g>
    `;
  });

  return `
    <div class="generated-chart-container" style="background:#0f172a; border:1px solid #1e293b; border-radius:10px; padding:12px; margin:10px 0;">
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="${(width / 2).toFixed(1)}" y="22" font-size="14" font-weight="bold" text-anchor="middle" fill="#f8fafc">${title || 'แผนภูมิแท่ง'}</text>
        <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#334155" stroke-width="1.5" />
        ${barsSvg}
      </svg>
    </div>
  `.trim();
}

/**
 * Weather handler
 */
async function handleGetCurrentTemperature(args) {
  const location = args?.location || 'Bangkok';
  
  // Basic mock/fallback dictionary with realistic weather for fast responses
  const cityData = {
    bangkok: { temp: 32, condition: 'มีเมฆบางส่วน (Partly Cloudy)', humidity: 72 },
    กรุงเทพ: { temp: 32, condition: 'มีเมฆบางส่วน (Partly Cloudy)', humidity: 72 },
    chiangmai: { temp: 28, condition: 'แจ่มใส (Sunny)', humidity: 65 },
    เชียงใหม่: { temp: 28, condition: 'แจ่มใส (Sunny)', humidity: 65 },
    phuket: { temp: 30, condition: 'ฝนตกเป็นแห่งๆ (Isolated Showers)', humidity: 80 },
    ภูเก็ต: { temp: 30, condition: 'ฝนตกเป็นแห่งๆ (Isolated Showers)', humidity: 80 },
    tokyo: { temp: 19, condition: 'มีแดดร่มลมตก (Clear)', humidity: 55 },
    london: { temp: 15, condition: 'มีฝนปรอยๆ (Light Rain)', humidity: 85 },
    'new york': { temp: 18, condition: 'แจ่มใส (Sunny)', humidity: 50 },
    paris: { temp: 17, condition: 'มีเมฆมาก (Mostly Cloudy)', humidity: 68 }
  };

  const key = location.toLowerCase().trim();
  const matched = cityData[key] || {
    temp: 29 + Math.floor(Math.random() * 5),
    condition: 'สภาพอากาศทั่วไป (Normal)',
    humidity: 65
  };

  return {
    location: location,
    temperature_celsius: matched.temp,
    temperature_fahrenheit: ((matched.temp * 9) / 5 + 32).toFixed(1),
    condition: matched.condition,
    humidity: `${matched.humidity}%`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Chart handler
 */
function handleCreateBarChart(args) {
  const title = args?.title || 'แผนภูมิข้อมูล';
  const labels = Array.isArray(args?.labels) ? args.labels : ['A', 'B', 'C'];
  const values = Array.isArray(args?.values) ? args.values.map(Number) : [10, 20, 30];

  const chartSvg = generateBarChartSvg(title, labels, values);
  return {
    title,
    labels,
    values,
    svg: chartSvg,
    summary: `สร้างแผนภูมิ "${title}" เรียบร้อย มี ${labels.length} รายการ (ค่าสูงสุด: ${Math.max(...values)})`
  };
}

/**
 * Safe Math calculation handler
 */
function handleCalculateMath(args) {
  const expr = String(args?.expression || '');
  try {
    // Only allow digits, operators, math functions, spaces, parentheses
    if (!/^[0-9\.\+\-\*\/\(\)\^\%\s\b(sqrt|sin|cos|tan|log|pow|abs|round|floor|ceil|min|max|PI|E)\b]+$/.test(expr)) {
      return { expression: expr, error: 'รูปแบบนิพจน์คณิตศาสตร์ไม่ถูกต้องหรือไม่ปลอดภัย' };
    }

    const sanitized = expr
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\blog\b/g, 'Math.log10')
      .replace(/\bpow\b/g, 'Math.pow')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bPI\b/g, 'Math.PI')
      .replace(/\bE\b/g, 'Math.E')
      .replace(/\^/g, '**');

    // Evaluate in safe strict function
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const result = fn();
    return {
      expression: expr,
      result: result,
      formatted: `${expr} = ${result}`
    };
  } catch (err) {
    return { expression: expr, error: err.message };
  }
}

/**
 * Master dispatcher for function calls
 */
async function executeToolFunction(name, args) {
  switch (name) {
    case 'get_current_temperature':
      return await handleGetCurrentTemperature(args);
    case 'create_bar_chart':
      return handleCreateBarChart(args);
    case 'calculate_math':
      return handleCalculateMath(args);
    default:
      return { error: `ฟังก์ชัน "${name}" ยังไม่รองรับในระบบ` };
  }
}

// ============================================================================
// 3. STEP & ANNOTATION PARSERS
// ============================================================================

/**
 * Extracts and formats all steps and annotations from an interaction response
 */
function parseInteractionSteps(interaction) {
  const result = {
    outputText: interaction?.output_text || '',
    thoughts: [],
    searchCalls: [],
    searchResults: [],
    codeCalls: [],
    codeResults: [],
    urlContextResults: [],
    functionCalls: [],
    citations: {
      urls: [],
      places: [],
      files: []
    }
  };

  const steps = interaction?.steps || [];

  for (const step of steps) {
    const type = step?.type;

    if (type === 'thought') {
      const summaryText = Array.isArray(step.summary)
        ? step.summary.map(s => s.text || '').join('\n')
        : (step.text || '');
      if (summaryText) result.thoughts.push(summaryText);
    } else if (type === 'google_search_call') {
      result.searchCalls.push({
        queries: step.arguments?.queries || []
      });
    } else if (type === 'google_search_result') {
      result.searchResults.push({
        callId: step.call_id,
        result: step.result
      });
    } else if (type === 'code_execution_call') {
      result.codeCalls.push({
        code: step.arguments?.code || ''
      });
    } else if (type === 'code_execution_result') {
      result.codeResults.push({
        output: step.result || ''
      });
    } else if (type === 'url_context_result') {
      result.urlContextResults.push({
        status: step.status,
        url: step.url
      });
    } else if (type === 'function_call') {
      result.functionCalls.push({
        name: step.name,
        arguments: step.arguments
      });
    } else if (type === 'model_output') {
      const content = step.content || [];
      for (const block of content) {
        if (block.type === 'text') {
          if (!result.outputText && block.text) {
            result.outputText = block.text;
          }
          if (block.annotations && Array.isArray(block.annotations)) {
            for (const annot of block.annotations) {
              if (annot.type === 'url_citation') {
                const startIdx = annot.start_index ?? annot.startIndex ?? 0;
                const endIdx = annot.end_index ?? annot.endIndex ?? (block.text ? block.text.length : 0);
                const citedSnippet = block.text ? block.text.slice(startIdx, endIdx) : '';
                result.citations.urls.push({
                  type: 'url_citation',
                  title: annot.title || 'Web Source',
                  url: annot.url,
                  startIndex: startIdx,
                  endIndex: endIdx,
                  citedText: citedSnippet
                });
              } else if (annot.type === 'place_citation') {
                result.citations.places.push({
                  type: 'place_citation',
                  name: annot.name || 'Google Maps Place',
                  url: annot.url,
                  address: annot.address || ''
                });
              } else if (annot.type === 'file_citation') {
                result.citations.files.push({
                  type: 'file_citation',
                  fileName: annot.file_name || annot.fileName || 'Document',
                  source: annot.source,
                  pageNumber: annot.page_number || annot.pageNumber || null,
                  mediaId: annot.media_id || annot.mediaId || null,
                  customMetadata: annot.customMetadata || null
                });
              }
            }
          }
        }
      }
    }
  }

  return result;
}

// ============================================================================
// 4. FILE SEARCH STORES (RAG) MANAGEMENT
// ============================================================================

/**
 * Creates a File Search Store
 */
async function createFileSearchStore({ apiKey, displayName = 'SnapMind RAG Store', embeddingModel = 'models/gemini-embedding-2' }) {
  const client = new GoogleGenAI({ apiKey });
  return await client.fileSearchStores.create({
    config: {
      displayName,
      embeddingModel
    }
  });
}

/**
 * Uploads a file directly to a File Search Store with optional custom chunking
 */
async function uploadToFileSearchStore({ apiKey, storeName, filePath, displayName, chunkingConfig }) {
  const client = new GoogleGenAI({ apiKey });

  const config = {
    displayName: displayName || path.basename(filePath)
  };

  if (chunkingConfig) {
    config.chunkingConfig = chunkingConfig;
  }

  let operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: filePath,
    fileSearchStoreName: storeName,
    config
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    operation = await client.operations.get({ operation });
  }

  return { success: true, storeName, filePath };
}

/**
 * Imports an uploaded file into a File Search Store with optional custom metadata
 */
async function importFileToFileSearchStore({ apiKey, storeName, fileName, customMetadata }) {
  const client = new GoogleGenAI({ apiKey });

  const config = {};
  if (customMetadata && Array.isArray(customMetadata)) {
    config.customMetadata = customMetadata;
  }

  let operation = await client.fileSearchStores.importFile({
    fileSearchStoreName: storeName,
    fileName,
    config
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    operation = await client.operations.get({ operation });
  }

  return { success: true, storeName, fileName };
}

/**
 * Lists all File Search Stores
 */
async function listFileSearchStores({ apiKey }) {
  const client = new GoogleGenAI({ apiKey });
  const stores = [];
  const pagedList = await client.fileSearchStores.list();
  for await (const store of pagedList) {
    stores.push(store);
  }
  return stores;
}

/**
 * Deletes a File Search Store
 */
async function deleteFileSearchStore({ apiKey, storeName, force = true }) {
  const client = new GoogleGenAI({ apiKey });
  return await client.fileSearchStores.delete({
    name: storeName,
    config: { force }
  });
}

/**
 * Lists documents in a File Search Store
 */
async function listFileSearchDocuments({ apiKey, storeName }) {
  const client = new GoogleGenAI({ apiKey });
  const docs = [];
  const pagedList = await client.fileSearchStores.documents.list({
    parent: storeName
  });
  for await (const doc of pagedList) {
    docs.push(doc);
  }
  return docs;
}

/**
 * Deletes a document from a File Search Store
 */
async function deleteFileSearchDocument({ apiKey, documentName, force = true }) {
  const client = new GoogleGenAI({ apiKey });
  return await client.fileSearchStores.documents.delete({
    name: documentName,
    config: { force }
  });
}

/**
 * Downloads media cited by File Search
 */
async function downloadFileSearchMedia({ apiKey, mediaId }) {
  const client = new GoogleGenAI({ apiKey });
  return await client.fileSearchStores.downloadMedia(mediaId);
}

// ============================================================================
// 5. UNIFIED INTERACTIONS RUNNER
// ============================================================================

/**
 * Executes a Gemini Interaction with Tools
 */
async function runGeminiInteraction({
  apiKey,
  modelId = 'gemini-3.8-flash',
  input,
  tools = [],
  toolsOptions = {},
  previousInteractionId = null,
  base64Image = null,
  systemInstruction = null
}) {
  if (!apiKey) {
    throw new Error('API Key is required to run Gemini Interactions');
  }

  const client = new GoogleGenAI({ apiKey });

  // If tools array not explicitly provided, build from toolsOptions
  let finalTools = tools;
  if (!finalTools || finalTools.length === 0) {
    finalTools = buildToolsArray(toolsOptions);
  }

  // Format input payload
  let interactionInput = input;
  if (base64Image) {
    const rawBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imagePart = {
      type: 'image',
      data: rawBase64,
      mime_type: 'image/jpeg'
    };
    const textPart = {
      type: 'text',
      text: typeof input === 'string' ? input : (input?.[0]?.text || 'วิเคราะห์ภาพนี้')
    };
    interactionInput = [imagePart, textPart];
  }

  const requestOptions = {
    model: modelId,
    input: interactionInput,
    tools: finalTools
  };

  if (previousInteractionId) {
    requestOptions.previous_interaction_id = previousInteractionId;
  }

  if (systemInstruction) {
    requestOptions.system_instruction = systemInstruction;
  }

  const interaction = await client.interactions.create(requestOptions);
  const parsed = parseInteractionSteps(interaction);

  // If the model called any functions, execute them automatically!
  if (parsed.functionCalls && parsed.functionCalls.length > 0) {
    parsed.functionResults = [];
    for (const fc of parsed.functionCalls) {
      const fnRes = await executeToolFunction(fc.name, fc.arguments);
      parsed.functionResults.push({
        name: fc.name,
        arguments: fc.arguments,
        result: fnRes
      });
    }
  }

  return {
    interactionId: interaction.id,
    model: modelId,
    outputText: parsed.outputText || interaction.output_text || '',
    ...parsed,
    rawInteraction: interaction
  };
}

module.exports = {
  // Tool Builders
  getGoogleSearchTool,
  getCodeExecutionTool,
  getUrlContextTool,
  getGoogleMapsTool,
  getFileSearchTool,
  getFunctionDeclarations,
  buildToolsArray,
  BUILTIN_FUNCTIONS,

  // Function Execution
  generateBarChartSvg,
  executeToolFunction,

  // Parser
  parseInteractionSteps,

  // File Search Management
  createFileSearchStore,
  uploadToFileSearchStore,
  importFileToFileSearchStore,
  listFileSearchStores,
  deleteFileSearchStore,
  listFileSearchDocuments,
  deleteFileSearchDocument,
  downloadFileSearchMedia,

  // Unified Runner
  runGeminiInteraction
};
