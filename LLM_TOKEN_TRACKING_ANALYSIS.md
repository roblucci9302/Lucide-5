# Lucide LLM Architecture & Token Consumption Analysis

## Executive Summary

The Lucide application has a multi-provider LLM architecture with support for OpenAI, Anthropic, Gemini, Ollama, and local Whisper. While the database schema includes fields for token tracking (`tokens` in `ai_messages` and `tokens_used` in `summaries`), **the actual token capture and usage tracking is NOT currently implemented**.

---

## 1. LLM FACTORY ARCHITECTURE

### Location
`/home/user/Lucide-101214/src/features/common/ai/factory.js`

### Supported Providers

```javascript
PROVIDERS = {
  'openai': { models: ['gpt-4.1'], handler: './providers/openai' },
  'openai-lucide': { models: ['gpt-4.1-lucide'], handler: './providers/openai' },  // Portkey-routed
  'gemini': { models: ['gemini-2.5-flash'], handler: './providers/gemini' },
  'anthropic': { models: ['claude-3-5-sonnet-20241022'], handler: './providers/anthropic' },
  'deepgram': { models: [], handler: './providers/deepgram' },  // STT only
  'ollama': { models: [] /* dynamic */, handler: './providers/ollama' },
  'whisper': { models: ['whisper-tiny', 'whisper-base', etc.], handler: './providers/whisper' }
}
```

### Factory Functions

| Function | Purpose | Return |
|----------|---------|--------|
| `createLLM(provider, opts)` | Non-streaming LLM | `{ generateContent(), chat() }` |
| `createStreamingLLM(provider, opts)` | Streaming LLM | `{ streamChat() }` returns `ReadableStream` |
| `createSTT(provider, opts)` | Speech-to-text | STT session object |
| `getProviderClass(providerId)` | Get provider class | Class constructor |

### Key Implementation Detail
- Lucide providers (Portkey routing) automatically strip the `-lucide` suffix before instantiation
- All providers accept `temperature` and `maxTokens` parameters

---

## 2. LLM CALL SITES

### 2.1 Ask Service
**File**: `/home/user/Lucide-101214/src/features/ask/askService.js`

| Line | Method | Provider Call | Usage |
|------|--------|----------------|-------|
| 386 | `sendMessage()` | `createStreamingLLM(modelInfo.provider, {...})` | Main chat response streaming |
| 396 | `sendMessage()` | `streamingLLM.streamChat(messages)` | **MAIN LLM CALL** for user questions |
| 428 | `sendMessage()` | `streamingLLM.streamChat(textOnlyMessages)` | Fallback (multimodal error) |

**Response Handling**:
- Line 396-411: Streaming response piped to IPC renderer
- Line 503-507: Tokens extracted from SSE stream
- Line 529: Response saved to `askRepository.addAiMessage()` **WITHOUT token data**

**Current State**: Stream processed but tokens NOT captured

---

### 2.2 Summary Service
**File**: `/home/user/Lucide-101214/src/features/listen/summary/summaryService.js`

| Line | Method | Provider Call | Usage |
|------|--------|----------------|-------|
| 167 | `makeOutlineAndRequests()` | `createLLM(modelInfo.provider, {...})` | Meeting analysis |
| 176 | `makeOutlineAndRequests()` | `llm.chat(messages)` | **MAIN LLM CALL** for meeting summary |

**Response Structure**:
```javascript
const completion = await llm.chat(messages);
const responseText = completion.content;  // Only extracts content
// Line 184-191: Saved to summaryRepository.saveSummary() WITHOUT token data
```

**Current State**: Response has `raw` object available but NOT captured

---

### 2.3 Response Service
**File**: `/home/user/Lucide-101214/src/features/listen/response/responseService.js`

| Line | Method | Provider Call | Usage |
|------|--------|----------------|-------|
| 149 | `generateSuggestions()` | `createLLM(modelInfo.provider, {...})` | Real-time response suggestions |
| 158 | `generateSuggestions()` | `llm.chat(messages)` | **MAIN LLM CALL** for suggestions |

**Response Structure**:
```javascript
const completion = await llm.chat(messages);
const responseText = completion.content;  // Only content extracted
// Line 164-177: Suggestions parsed but NO token tracking
```

**Current State**: NO token data captured

---

## 3. PROVIDER RESPONSE FORMATS

### OpenAI Provider
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/openai.js`

#### `createLLM()` Response Structure
```javascript
// Non-streaming (chat method)
{
  content: "assistant response text",
  raw: {
    // Full OpenAI SDK response object
    id: "chatcmpl-...",
    choices: [{ message: { content: "...", role: "assistant" } }],
    usage: {
      prompt_tokens: 123,
      completion_tokens: 45,
      total_tokens: 168
    },
    model: "gpt-4.1",
    created: 1699999999
  }
}
```

**Line 173**: `client.chat.completions.create()` returns full response with `usage` field
**Line 179-182**: Returns object with both `content` and `raw`

#### `createStreamingLLM()` Response Structure
**Lines 282-298**: Returns raw `Response` object from fetch
- Streams SSE format: `data: {choices: [{delta: {content: "..."}}]}`
- NO usage information in streaming responses (constraint of OpenAI API)

---

### Anthropic Provider
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/anthropic.js`

#### `createLLM()` Response Structure
```javascript
// Line 171-177: client.messages.create() response
{
  content: response.content[0].text,
  raw: {
    // Full Anthropic SDK response
    id: "msg_...",
    content: [{ type: "text", text: "..." }],
    model: "claude-3-5-sonnet-20241022",
    stop_reason: "end_turn",
    usage: {
      input_tokens: 234,
      output_tokens: 56
    }
  }
}
```

**Token Field Names**:
- `input_tokens` (not `prompt_tokens`)
- `output_tokens` (not `completion_tokens`)

#### `createStreamingLLM()` Response Structure
**Lines 266-273**: Streaming response as `ReadableStream`
- Converts Anthropic stream chunks to SSE format
- NO usage information available in streaming

---

### Gemini Provider
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/gemini.js`

#### `createLLM()` Response Structure
```javascript
// Line 104-111: generateContent() response
{
  response: {
    text: () => response.text()
  },
  // NO raw response exposed (limitation)
}

// Line 189-196: chat method response
{
  content: response.text(),
  raw: result  // Partial response object, usage unclear
}
```

**Issue**: Gemini SDK `GenerativeAIError` with `tokenUsage` on result object but NOT consistently exposed

---

### Ollama Provider
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/ollama.js`

#### `createLLM()` Response Structure
```javascript
// Lines 176-182: chat response
{
  response: {
    text: () => result.message.content
  },
  raw: {
    // Ollama API response
    model: "llama3.2:latest",
    message: {
      role: "assistant",
      content: "..."
    },
    done: true
    // NO usage information (Ollama doesn't track tokens)
  }
}
```

**Limitation**: Ollama doesn't provide token usage data (local model)

---

## 4. TOKEN INFORMATION AVAILABILITY

### Summary Table

| Provider | `prompt_tokens` | `completion_tokens` | `total_tokens` | Field Location | Notes |
|----------|---|---|---|---|---|
| **OpenAI** | ✅ `response.usage.prompt_tokens` | ✅ `response.usage.completion_tokens` | ✅ `response.usage.total_tokens` | `response.usage` | Complete, reliable |
| **OpenAI (streaming)** | ❌ | ❌ | ❌ | N/A | Not available in stream |
| **Anthropic** | ✅ `response.usage.input_tokens` | ✅ `response.usage.output_tokens` | ⚠️ Computed sum | `response.usage` | Different field names |
| **Anthropic (streaming)** | ❌ | ❌ | ❌ | N/A | Not available in stream |
| **Gemini** | ⚠️ Partial | ⚠️ Partial | ❌ | `result.usageMetadata` | Not consistently exposed |
| **Gemini (streaming)** | ❌ | ❌ | ❌ | N/A | Not available |
| **Ollama** | ❌ | ❌ | ❌ | N/A | Local model, no tracking |
| **Whisper** | ❌ | ❌ | ❌ | N/A | STT only |

---

## 5. CURRENT TRACKING STATUS

### Database Schema (Ready But Unused)
**File**: `/home/user/Lucide-101214/src/features/common/config/schema.js`

```javascript
// ai_messages table - Line 44-55
{
  id: TEXT PRIMARY KEY,
  session_id: TEXT,
  role: TEXT,
  content: TEXT,
  tokens: INTEGER,  // ← DEFINED BUT NEVER POPULATED
  model: TEXT,
  created_at: INTEGER,
  ...
}

// summaries table - Line 57-69
{
  session_id: TEXT PRIMARY KEY,
  text: TEXT,
  tokens_used: INTEGER,  // ← DEFINED BUT NEVER POPULATED
  model: TEXT,
  ...
}
```

### Repository Implementations (No Token Support)

#### Ask Repository
**File**: `/home/user/Lucide-101214/src/features/ask/repositories/sqlite.repository.js`

```javascript
// Line 3-17: addAiMessage()
function addAiMessage({ uid, sessionId, role, content, model = 'unknown' }) {
  const query = `INSERT INTO ai_messages 
    (id, session_id, sent_at, role, content, model, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  // ❌ No tokens parameter accepted
  // ❌ No tokens parameter in INSERT
}
```

#### Summary Repository
**File**: `/home/user/Lucide-101214/src/features/listen/summary/repositories/sqlite.repository.js`

```javascript
// Line 3-28: saveSummary()
function saveSummary({ uid, sessionId, tldr, text, bullet_json, action_json, model }) {
  const query = `INSERT INTO summaries 
    (session_id, generated_at, model, text, tldr, bullet_json, action_json, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  // ❌ No tokens_used parameter accepted
  // ❌ No tokens_used parameter in INSERT
}
```

### Token Utilities (Estimation Only)
**File**: `/home/user/Lucide-101214/src/features/common/utils/tokenUtils.js`

```javascript
// Lines 14-19: Only estimation, NOT actual usage
function estimateTokens(text) {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}
```

---

## 6. RECOMMENDED INTEGRATION POINTS

### Phase 1: Enable Token Capture (Without Breaking Changes)

#### 1.1 Update Repository Signatures
```javascript
// /src/features/ask/repositories/sqlite.repository.js
function addAiMessage({ 
  uid, sessionId, role, content, model = 'unknown',
  tokens = null,  // ← NEW
  prompt_tokens = null,  // ← NEW
  completion_tokens = null  // ← NEW
}) {
  const query = `INSERT INTO ai_messages 
    (id, session_id, sent_at, role, content, tokens, model, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.prepare(query).run(messageId, sessionId, now, role, content, tokens, model, now);
}

// /src/features/listen/summary/repositories/sqlite.repository.js
function saveSummary({ 
  uid, sessionId, tldr, text, bullet_json, action_json, model,
  tokens_used = null,  // ← NEW
  prompt_tokens = null,  // ← NEW
  completion_tokens = null  // ← NEW
}) {
  // Include in INSERT/UPDATE
}
```

#### 1.2 Create Token Extraction Service
```javascript
// /src/features/common/services/tokenTrackingService.js
function extractTokenUsage(provider, response) {
  if (!response || !response.raw) return null;

  switch(provider) {
    case 'openai':
    case 'openai-lucide':
      return {
        prompt_tokens: response.raw.usage?.prompt_tokens,
        completion_tokens: response.raw.usage?.completion_tokens,
        total_tokens: response.raw.usage?.total_tokens
      };
    
    case 'anthropic':
      return {
        prompt_tokens: response.raw.usage?.input_tokens,
        completion_tokens: response.raw.usage?.output_tokens,
        total_tokens: (response.raw.usage?.input_tokens || 0) + 
                      (response.raw.usage?.output_tokens || 0)
      };
    
    case 'gemini':
      // Handle partial usage data
      return {
        prompt_tokens: response.raw?.usageMetadata?.promptTokenCount,
        completion_tokens: response.raw?.usageMetadata?.candidatesTokenCount,
        total_tokens: response.raw?.usageMetadata?.totalTokenCount
      };
    
    default:
      return null;
  }
}
```

#### 1.3 Update Service Call Sites

**Ask Service (Line 396)**:
```javascript
const response = await streamingLLM.streamChat(messages);
// ❌ Streaming doesn't support usage tracking
// Solution: Fall back to non-streaming for tracked calls
```

**Summary Service (Line 176)**:
```javascript
const completion = await llm.chat(messages);
const usage = extractTokenUsage(modelInfo.provider, completion);
summaryRepository.saveSummary({
  sessionId: this.currentSessionId,
  text: responseText,
  tldr: structuredData.summary.join('\n'),
  bullet_json: JSON.stringify(structuredData.topic.bullets),
  action_json: JSON.stringify(structuredData.actions),
  model: modelInfo.model,
  tokens_used: usage?.total_tokens,  // ← ADD
  prompt_tokens: usage?.prompt_tokens,  // ← ADD
  completion_tokens: usage?.completion_tokens  // ← ADD
});
```

**Response Service (Line 158)**:
```javascript
const completion = await llm.chat(messages);
const usage = extractTokenUsage(modelInfo.provider, completion);
// Store usage for analytics
// Note: Response suggestions don't persist data, but can track in memory
```

### Phase 2: Add Token Cost Estimation

#### 2.1 Pricing Configuration
```javascript
// /src/features/common/config/pricingConfig.js
const PRICING = {
  openai: {
    'gpt-4.1': {
      input: 0.03,  // per 1K tokens
      output: 0.06
    },
    'gpt-4o-mini': {
      input: 0.00015,
      output: 0.0006
    }
  },
  anthropic: {
    'claude-3-5-sonnet-20241022': {
      input: 0.003,
      output: 0.015
    }
  },
  gemini: {
    'gemini-2.5-flash': {
      input: 0.075,
      output: 0.3
    }
  }
};

function calculateCost(provider, model, promptTokens, completionTokens) {
  const config = PRICING[provider]?.[model];
  if (!config) return null;
  
  return {
    input_cost: (promptTokens / 1000) * config.input,
    output_cost: (completionTokens / 1000) * config.output,
    total_cost: ((promptTokens / 1000) * config.input) + 
                ((completionTokens / 1000) * config.output)
  };
}
```

#### 2.2 Usage Statistics Repository
```javascript
// /src/features/common/repositories/usageStatistics/index.js
async function recordUsage(userId, usage) {
  // Track per-user, per-provider, per-model token usage
  // Calculate daily/weekly/monthly costs
}

async function getUserStats(userId, dateRange) {
  // Return total tokens, cost, requests by provider/model
}
```

### Phase 3: Add Streaming Token Tracking

**Challenge**: OpenAI streaming doesn't include usage data

**Solution Options**:
1. **Estimate tokens from streamed content**: Use `tokenUtils.estimateTokens()` on actual output
2. **Fall back to non-streaming for token tracking**: Use regular API for important requests
3. **Use Portkey for streaming token tracking**: Portkey tracks streaming requests

```javascript
// Hybrid approach for streaming
async function streamChatWithTokenTracking(provider, streamChat, estimatePrefix) {
  const response = await streamChat();
  const reader = response.body.getReader();
  let fullContent = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullContent += decoder.decode(value);
  }
  
  // Estimate tokens after stream completes
  const estimatedTokens = estimateTokens(estimatePrefix + fullContent);
  
  return {
    content: fullContent,
    usage: {
      prompt_tokens: estimateTokens(estimatePrefix),  // Estimate
      completion_tokens: estimateTokens(fullContent),  // Estimate
      total_tokens: estimatedTokens
    }
  };
}
```

---

## 7. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (IPC)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼──┐      ┌────▼───┐    ┌────▼────┐
   │ Ask   │      │Summary │    │Response │
   │Service│      │Service │    │Service  │
   └────┬──┘      └────┬───┘    └────┬────┘
        │              │              │
        │    ┌─────────┴──────────┬───┘
        │    │                    │
   ┌────▼────▼─────────────────────▼────┐
   │      Factory (factory.js)           │
   │  ┌─────────────────────────────┐   │
   │  │ createLLM()                 │   │
   │  │ createStreamingLLM()        │   │
   │  └──────┬──────────────────────┘   │
   └─────────┼────────────────────────┬─┘
             │                        │
    ┌────────▼────────┬───────────────▼────────────┐
    │    Providers    │                            │
    ├─────────────────┼────────────────────────────┤
    │ • OpenAI        │ Returns:                    │
    │ • Anthropic     │ { content, raw: {...} }    │
    │ • Gemini        │                            │
    │ • Ollama        │ raw contains usage info    │
    │ • Whisper       │ (if not streaming)         │
    └─────────────────┴────────────────────────────┘
             │
    ┌────────▼──────────────────┐
    │   External APIs           │
    │ • OpenAI API              │
    │ • Anthropic API           │
    │ • Google Generative AI    │
    │ • Local Ollama            │
    └───────────────────────────┘
```

---

## 8. IMPLEMENTATION CHECKLIST

### Immediate (Week 1)
- [ ] Create `tokenTrackingService.js` with provider-specific extractors
- [ ] Update repository functions to accept token parameters
- [ ] Modify schema migrations if needed (add columns if missing)
- [ ] Update Summary Service to capture tokens (non-breaking)
- [ ] Update Response Service to track tokens (optional, suggestions are ephemeral)

### Short-term (Week 2-3)
- [ ] Create pricing configuration file
- [ ] Build usage statistics repository
- [ ] Add usage dashboard view
- [ ] Generate monthly cost reports

### Medium-term (Week 4-6)
- [ ] Implement streaming token estimation
- [ ] Add cost alerts/budgets
- [ ] Sync usage data to Firebase (if applicable)
- [ ] Build analytics dashboard

### Long-term (Month 2+)
- [ ] Provider cost optimization recommendations
- [ ] Model auto-switching based on cost
- [ ] Usage forecasting
- [ ] Enterprise billing integration

---

## 9. KEY FINDINGS & RISKS

### Findings
1. ✅ **Schema Ready**: Database schema includes token fields (`ai_messages.tokens`, `summaries.tokens_used`)
2. ❌ **No Implementation**: Token data is never captured or stored despite schema support
3. ✅ **Raw Responses Available**: All non-streaming providers return `raw` response with usage data
4. ⚠️ **Streaming Limitation**: Streaming responses don't include usage data (OpenAI constraint)
5. 🔧 **Provider Inconsistency**: Anthropic uses `input_tokens`/`output_tokens` instead of OpenAI's naming

### Risks
- **Unbounded Usage**: Without tracking, users could accidentally incur large costs
- **No Cost Visibility**: Users have no insight into API spending
- **Orphaned Schema**: Unused schema columns may cause confusion
- **Streaming Gap**: Streaming requests (primary use case in Ask) can't track tokens
- **Estimation Fallback**: If implementing token estimation, accuracy will be ~±10%

---

## File Location Reference

| Component | File Path |
|-----------|-----------|
| Factory | `/src/features/common/ai/factory.js` |
| OpenAI Provider | `/src/features/common/ai/providers/openai.js` |
| Anthropic Provider | `/src/features/common/ai/providers/anthropic.js` |
| Gemini Provider | `/src/features/common/ai/providers/gemini.js` |
| Ollama Provider | `/src/features/common/ai/providers/ollama.js` |
| Ask Service | `/src/features/ask/askService.js` |
| Ask Repository | `/src/features/ask/repositories/sqlite.repository.js` |
| Summary Service | `/src/features/listen/summary/summaryService.js` |
| Summary Repository | `/src/features/listen/summary/repositories/sqlite.repository.js` |
| Response Service | `/src/features/listen/response/responseService.js` |
| Schema | `/src/features/common/config/schema.js` |
| Token Utils | `/src/features/common/utils/tokenUtils.js` |
| Conv. History Service | `/src/features/common/services/conversationHistoryService.js` |

