# Quick Reference: LLM Token Tracking Integration Points

## Critical Call Sites with Line Numbers

### 1. Ask Service - Main LLM Call (Streaming)
**File**: `/home/user/Lucide-101214/src/features/ask/askService.js`
- **Line 386**: `createStreamingLLM()` instantiation
- **Line 396**: `streamingLLM.streamChat(messages)` - PRIMARY CHAT CALL (STREAMING - NO USAGE DATA)
- **Line 428**: Fallback streaming call (multimodal error retry)
- **Line 529**: Response saved to DB without token data

**Issue**: Streaming doesn't include usage information in response

---

### 2. Summary Service - LLM Call (Non-Streaming)
**File**: `/home/user/Lucide-101214/src/features/listen/summary/summaryService.js`
- **Line 167**: `createLLM()` instantiation
- **Line 176**: `llm.chat(messages)` - LLM CALL FOR SUMMARY (NON-STREAMING)
- **Line 178**: `completion.content` extracted (usage data discarded)
- **Line 184-191**: `summaryRepository.saveSummary()` called WITHOUT tokens

**Opportunity**: Non-streaming - usage data available but not captured!

---

### 3. Response Service - LLM Call (Non-Streaming)
**File**: `/home/user/Lucide-101214/src/features/listen/response/responseService.js`
- **Line 149**: `createLLM()` instantiation
- **Line 158**: `llm.chat(messages)` - LLM CALL FOR RESPONSE SUGGESTIONS (NON-STREAMING)
- **Line 159**: `completion.content` extracted (usage data discarded)
- **Line 164-177**: Suggestions parsed but NOT persisted

**Opportunity**: Non-streaming - usage data available but not captured!

---

## Provider Response Objects with Usage Data

### OpenAI Provider Response Structure
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/openai.js`

**Line 171-182**: chat method - returns with `raw` object
```javascript
// Access token data at:
response.raw.usage.prompt_tokens      // Field: prompt_tokens
response.raw.usage.completion_tokens  // Field: completion_tokens
response.raw.usage.total_tokens       // Field: total_tokens
```

### Anthropic Provider Response Structure
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/anthropic.js`

**Line 171-177**: chat method response
```javascript
// Access token data at (DIFFERENT FIELD NAMES!):
response.raw.usage.input_tokens   // Field: input_tokens (NOT prompt_tokens)
response.raw.usage.output_tokens  // Field: output_tokens (NOT completion_tokens)
// MUST compute total = input + output
```

### Gemini Provider Response Structure
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/gemini.js`

**Line 104-111 & 189-196**: chat/generateContent methods
```javascript
// Access token data at (INCONSISTENT):
response.raw.usageMetadata.promptTokenCount      // Partial
response.raw.usageMetadata.candidatesTokenCount  // Partial
response.raw.usageMetadata.totalTokenCount       // Partial
// ⚠️ May not always be present
```

### Ollama Provider Response Structure
**File**: `/home/user/Lucide-101214/src/features/common/ai/providers/ollama.js`

**Line 176-182 & 215-219**: chat methods
```javascript
// NO token data available
response.raw.done  // Only completion indicator
// Local models don't track tokens
```

---

## Database Schema - Ready But Unused

**File**: `/home/user/Lucide-101214/src/features/common/config/schema.js`

### ai_messages table (Lines 44-55)
```
- id (TEXT PRIMARY KEY)
- session_id (TEXT NOT NULL)
- role (TEXT)
- content (TEXT)
- tokens (INTEGER) ← DEFINED BUT NEVER POPULATED
- model (TEXT)
- created_at (INTEGER)
```

### summaries table (Lines 57-69)
```
- session_id (TEXT PRIMARY KEY)
- text (TEXT)
- tokens_used (INTEGER) ← DEFINED BUT NEVER POPULATED
- model (TEXT)
- generated_at (INTEGER)
- bullet_json (TEXT)
- action_json (TEXT)
```

---

## Repository Functions - Need Token Parameters

### Ask Repository
**File**: `/home/user/Lucide-101214/src/features/ask/repositories/sqlite.repository.js`

**Lines 3-17**: `addAiMessage()` function
```javascript
// CURRENT (NO TOKEN SUPPORT):
function addAiMessage({ uid, sessionId, role, content, model = 'unknown' })

// NEEDS TO BE:
function addAiMessage({ 
  uid, sessionId, role, content, model = 'unknown',
  tokens = null,              // Total tokens
  prompt_tokens = null,       // Input tokens
  completion_tokens = null    // Output tokens
})
```

### Summary Repository
**File**: `/home/user/Lucide-101214/src/features/listen/summary/repositories/sqlite.repository.js`

**Lines 3-28**: `saveSummary()` function
```javascript
// CURRENT (NO TOKEN SUPPORT):
function saveSummary({ uid, sessionId, tldr, text, bullet_json, action_json, model })

// NEEDS TO BE:
function saveSummary({ 
  uid, sessionId, tldr, text, bullet_json, action_json, model,
  tokens_used = null,         // Total tokens
  prompt_tokens = null,       // Input tokens
  completion_tokens = null    // Output tokens
})
```

---

## Token Utilities (Estimation Only - No Real Tracking)

**File**: `/home/user/Lucide-101214/src/features/common/utils/tokenUtils.js`

**Lines 14-20**: `estimateTokens()` - Uses heuristic (~4 chars per token)
```javascript
// This is ESTIMATION, not actual usage from providers
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
```

**Lines 28-33**: `estimateTokensForArray()` - Batch estimation

---

## Token Field Naming Inconsistency

| Provider | Input Tokens | Output Tokens | Source |
|----------|---|---|---|
| OpenAI | `prompt_tokens` | `completion_tokens` | response.usage |
| Anthropic | `input_tokens` | `output_tokens` | response.usage |
| Gemini | `promptTokenCount` | `candidatesTokenCount` | result.usageMetadata |
| Ollama | N/A | N/A | Not available |

**⚠️ CRITICAL**: Normalization layer needed to convert all providers to standard fields

---

## Conversation History Service (No Token Integration)

**File**: `/home/user/Lucide-101214/src/features/common/services/conversationHistoryService.js`

- Manages session retrieval and search
- Does NOT track token usage
- Does NOT query token fields from database
- Could be extended to provide usage statistics

---

## Implementation Tasks (Priority Order)

### IMMEDIATE (HOURS 1-2)
1. Create `/src/features/common/services/tokenTrackingService.js`
   - Function: `extractTokenUsage(provider, response)`
   - Handle OpenAI, Anthropic, Gemini field mapping
   - Return normalized object with total_tokens, prompt_tokens, completion_tokens

2. Update repository function signatures to accept tokens
   - File: `/src/features/ask/repositories/sqlite.repository.js`
   - File: `/src/features/listen/summary/repositories/sqlite.repository.js`
   - Add optional token parameters (backward compatible)

### SHORT-TERM (HOURS 3-4)
3. Integrate token extraction in Summary Service (Line 176)
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
     tokens_used: usage?.total_tokens,
     prompt_tokens: usage?.prompt_tokens,
     completion_tokens: usage?.completion_tokens
   });
   ```

4. Integrate token extraction in Response Service (Line 158) - Optional
   - Create in-memory usage log for analytics

### MEDIUM-TERM (NEXT WEEK)
5. Handle streaming token gap (Ask Service Line 396)
   - Option A: Estimate tokens from actual response
   - Option B: Switch to non-streaming for token tracking
   - Option C: Use Portkey middleware

6. Create usage statistics repository
   - Aggregate tokens per user/provider/model/day/month
   - Calculate costs from pricing config

---

## Streaming Token Data Limitation

**Problem**: OpenAI streaming doesn't return usage data
- Ask Service uses streaming (Line 396)
- Summary Service uses non-streaming (Line 176) ✓
- Response Service uses non-streaming (Line 158) ✓

**Solutions**:
1. **Estimate after stream ends**: Use `estimateTokens(prompt + response)`
2. **Switch to non-streaming for critical requests**: Use non-streaming for Ask
3. **Use Portkey**: Portkey middleware tracks streaming usage
4. **Compute from models**: Some models allow post-hoc token calculation

---

## Key Files at a Glance

```
Factory & Providers:
  /src/features/common/ai/factory.js (185 lines)
  /src/features/common/ai/providers/openai.js (308 lines)
  /src/features/common/ai/providers/anthropic.js (328 lines)
  /src/features/common/ai/providers/gemini.js (329 lines)
  /src/features/common/ai/providers/ollama.js (342 lines)

Services:
  /src/features/ask/askService.js (572 lines) - Line 396: MAIN CALL
  /src/features/listen/summary/summaryService.js (463 lines) - Line 176: MAIN CALL
  /src/features/listen/response/responseService.js (259 lines) - Line 158: MAIN CALL

Repositories:
  /src/features/ask/repositories/sqlite.repository.js (28 lines)
  /src/features/listen/summary/repositories/sqlite.repository.js (40 lines)

Schema & Utilities:
  /src/features/common/config/schema.js (123 lines) - Token fields defined
  /src/features/common/utils/tokenUtils.js (71 lines) - Estimation only
  /src/features/common/services/conversationHistoryService.js (500+ lines)
```

---

## Next Steps

1. **Review** this analysis with the team
2. **Prioritize** which services need tracking (Summary > Response > Ask)
3. **Create** tokenTrackingService.js
4. **Update** repository signatures (backward compatible)
5. **Implement** extraction in Summary Service (easiest win)
6. **Test** with all provider types
7. **Document** cost calculation
8. **Build** usage dashboard

