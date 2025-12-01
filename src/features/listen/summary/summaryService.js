const { BrowserWindow } = require('electron');
const { getSystemPrompt } = require('../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../common/ai/factory');
const sessionRepository = require('../../common/repositories/session');
const summaryRepository = require('./repositories');
const modelStateService = require('../../common/services/modelStateService');
const tokenTrackingService = require('../../common/services/tokenTrackingService');

class SummaryService {
    constructor() {
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        this.conversationHistory = [];
        this.currentSessionId = null;

        // Fix NORMAL MEDIUM BUG-M21: Extract analysis history limit constant
        // Keep last 10 analysis results to prevent memory growth while maintaining context
        this.MAX_ANALYSIS_HISTORY = 10;

        // Fix NORMAL MEDIUM BUG-M22: Extract hardcoded followUps array to avoid duplication
        // Default follow-up actions presented to user after each analysis
        this.DEFAULT_FOLLOW_UPS = [
            '✉️ Draft a follow-up email',
            '✅ Generate action items',
            '📝 Show summary'
        ];

        // Callbacks
        this.onAnalysisComplete = null;
        this.onStatusUpdate = null;
    }

    /**
     * Fix LOW BUG-L7: Add JSDoc documentation for public API methods
     * Set callback functions for analysis events
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onAnalysisComplete - Called when analysis completes
     * @param {Function} callbacks.onStatusUpdate - Called when status changes
     */
    setCallbacks({ onAnalysisComplete, onStatusUpdate }) {
        // Fix MEDIUM BUG-M2: Validate that callbacks are actually functions
        if (onAnalysisComplete && typeof onAnalysisComplete !== 'function') {
            throw new Error('[SummaryService] onAnalysisComplete must be a function');
        }
        if (onStatusUpdate && typeof onStatusUpdate !== 'function') {
            throw new Error('[SummaryService] onStatusUpdate must be a function');
        }

        this.onAnalysisComplete = onAnalysisComplete;
        this.onStatusUpdate = onStatusUpdate;
    }

    /**
     * Set the current session ID for this summary service instance
     * Fix MEDIUM BUG-M3: Validate sessionId input
     * @param {string} sessionId - The session ID to associate with this summary
     */
    setSessionId(sessionId) {
        // Fix MEDIUM BUG-M3: Validate sessionId is a non-empty string
        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error('[SummaryService] sessionId must be a non-empty string');
        }
        if (sessionId.trim().length === 0) {
            throw new Error('[SummaryService] sessionId cannot be empty or whitespace');
        }

        this.currentSessionId = sessionId;
    }

    /**
     * Send data to the listen window renderer process
     * @param {string} channel - IPC channel name
     * @param {*} data - Data to send
     */
    sendToRenderer(channel, data) {
        const { windowPool } = require('../../../window/windowManager');
        const listenWindow = windowPool?.get('listen');
        
        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
        }
    }

    /**
     * Add a conversation turn to the history for later analysis
     * @param {string} speaker - Speaker identifier: 'me' | 'them' (case insensitive)
     * @param {string} text - The transcribed text
     * @returns {void}
     */
    addConversationTurn(speaker, text) {
        // Validate inputs
        if (!text || typeof text !== 'string') {
            console.warn('[SummaryService] Invalid text parameter, skipping');
            return;
        }

        const normalizedSpeaker = speaker.toLowerCase();
        if (!['me', 'them'].includes(normalizedSpeaker)) {
            console.warn(`[SummaryService] Invalid speaker "${speaker}", skipping`);
            return;
        }

        const conversationText = `${normalizedSpeaker}: ${text.trim()}`;
        this.conversationHistory.push(conversationText);
        console.log(`💬 Added conversation text: ${conversationText}`);
        console.log(`📈 Total conversation history: ${this.conversationHistory.length} texts`);

        // Trigger analysis if needed (with error handling)
        this.triggerAnalysisIfNeeded().catch(error => {
            console.error('[SummaryService] Error in triggerAnalysisIfNeeded:', error);
        });
    }

    /**
     * Get the complete conversation history
     * @returns {Array<string>} Array of conversation turns in format "speaker: text"
     */
    getConversationHistory() {
        return this.conversationHistory;
    }

    /**
     * Reset all conversation history and analysis state
     * @returns {void}
     */
    resetConversationHistory() {
        this.conversationHistory = [];
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        console.log('🔄 Conversation history and analysis state reset');
    }

    /**
     * Fix NORMAL MEDIUM BUG-M20: Deduplicate maxTurns validation
     * Validates and sanitizes maxTurns parameter with default fallback
     * @param {number} maxTurns - Maximum number of turns to validate
     * @returns {number} - Validated maxTurns value (30 if invalid)
     * @private
     */
    _validateMaxTurns(maxTurns) {
        if (!Number.isInteger(maxTurns) || maxTurns <= 0) {
            console.warn(`[SummaryService] Invalid maxTurns value: ${maxTurns}, using default 30`);
            return 30;
        }
        return maxTurns;
    }

    /**
     * Converts conversation history into text to include in the prompt.
     * @param {Array<string>} conversationTexts - Array of conversation texts ["me: ~~~", "them: ~~~", ...]
     * @param {number} maxTurns - Maximum number of recent turns to include
     * @returns {string} - Formatted conversation string for the prompt
     */
    formatConversationForPrompt(conversationTexts, maxTurns = 30) {
        if (conversationTexts.length === 0) return '';

        // Fix HIGH MEDIUM BUG-M10 + NORMAL MEDIUM BUG-M20: Use centralized validation
        maxTurns = this._validateMaxTurns(maxTurns);

        return conversationTexts.slice(-maxTurns).join('\n');
    }

    async makeOutlineAndRequests(conversationTexts, maxTurns = 30) {
        console.log(`🔍 makeOutlineAndRequests called - conversationTexts: ${conversationTexts.length}`);

        if (conversationTexts.length === 0) {
            console.log('⚠️ No conversation texts available for analysis');
            return null;
        }

        // Fix HIGH MEDIUM BUG-M10 + NORMAL MEDIUM BUG-M20: Use centralized validation
        maxTurns = this._validateMaxTurns(maxTurns);

        const recentConversation = this.formatConversationForPrompt(conversationTexts, maxTurns);

        // Fix LOW BUG-L8: Translate Korean comment to English
        // Include previous analysis results in the prompt for context continuity
        let contextualPrompt = '';
        if (this.previousAnalysisResult) {
            contextualPrompt = `
Previous Analysis Context:
- Main Topic: ${this.previousAnalysisResult.topic.header}
- Key Points: ${this.previousAnalysisResult.summary.slice(0, 3).join(', ')}
- Last Actions: ${this.previousAnalysisResult.actions.slice(0, 2).join(', ')}

Please build upon this context while analyzing the new conversation segments.
`;
        }

        const basePrompt = getSystemPrompt('meeting_assistant', '', false);
        const systemPrompt = basePrompt.replace('{{CONVERSATION_HISTORY}}', recentConversation);

        try {
            if (this.currentSessionId) {
                await sessionRepository.touch(this.currentSessionId);
            }

            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key is not configured.');
            }
            console.log(`🤖 Sending analysis request to ${modelInfo.provider} using model ${modelInfo.model}`);

            const messages = [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: `${contextualPrompt}

Analyze the conversation and provide a comprehensive meeting intelligence summary. MUST include ALL sections:

**📋 Summary Overview**
- 3-5 concise bullet points capturing the essence (prioritize newest/most recent points)
- Focus on outcomes, not just topics

**🎯 Key Topic: [Dynamic Topic Name]**
- Main point 1 (specific, actionable insight)
- Main point 2 (specific, actionable insight)
- Main point 3 (specific, actionable insight)

**📝 Extended Context**
2-3 sentences providing deeper explanation, implications, or background that enriches understanding.

**✅ Action Items** (CRITICAL - Extract ALL tasks)
- [ ] **Task description** | Assigned to: [Person/Team] | Due: [Date/Timeframe]
(Look for: "will do", "should", "needs to", "must", "can you", "let's", "I'll")

**🔍 Decisions Made**
- **Decision 1**: What was decided, why, and any alternatives considered
- **Decision 2**: What was decided, why, and any alternatives considered

**❓ Comprehension Quiz** (3-5 intelligent questions)
1. **Question**: [Thought-provoking question requiring synthesis]
   - a) [Option A]
   - b) [Option B]
   - c) [Option C]
   - d) [Option D]
   *Answer: [Letter] - [Brief explanation]*

**💡 Contextual Insights**
- **Background**: Relevant information participants may not know
- **Implications**: What these decisions/discussions mean for the future
- **Risks**: Potential challenges or concerns
- **Opportunities**: Positive outcomes or possibilities

**❗ Unresolved Items**
- Open questions that need answers
- Blocked tasks awaiting decisions

**🔮 Suggested Follow-Up Questions**
1. [Clarifying question based on discussion]
2. [Probing question to deepen understanding]
3. [Forward-looking question about next steps]

Be thorough, specific, and actionable. Build upon previous analysis if provided.`,
                },
            ];

            console.log('🤖 Sending analysis request to AI...');

            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: 1024,
                timeout: 45000, // 45 second timeout (longer for detailed analysis)
                usePortkey: modelInfo.provider === 'openai-lucide',
                portkeyVirtualKey: modelInfo.provider === 'openai-lucide' ? modelInfo.apiKey : undefined,
            });

            const completion = await llm.chat(messages);

            // Track token usage and cost
            tokenTrackingService.trackUsage({
                provider: modelInfo.provider,
                model: modelInfo.model,
                response: completion,
                sessionId: this.currentSessionId,
                feature: 'summary'
            });

            const responseText = completion.content;
            // Fix MEDIUM BUG-M1: Log length instead of full content to avoid log pollution
            console.log(`✅ Analysis response received (${responseText.length} chars)`);
            const structuredData = this.parseResponseText(responseText, this.previousAnalysisResult);

            if (this.currentSessionId) {
                try {
                    // Fix CRITICAL BUG-C5: Add await to catch Promise rejections
                    await summaryRepository.saveSummary({
                        sessionId: this.currentSessionId,
                        text: responseText,
                        tldr: structuredData.summary.join('\n'),
                        bullet_json: JSON.stringify(structuredData.topic.bullets),
                        action_json: JSON.stringify(structuredData.actions),
                        model: modelInfo.model
                    });
                } catch (err) {
                    console.error('[DB] Failed to save summary:', err);
                }
            }

            // Store analysis results for context in future analyses
            this.previousAnalysisResult = structuredData;
            this.analysisHistory.push({
                timestamp: Date.now(),
                data: structuredData,
                conversationLength: conversationTexts.length,
            });

            if (this.analysisHistory.length > this.MAX_ANALYSIS_HISTORY) {
                this.analysisHistory.shift();
            }

            return structuredData;
        } catch (error) {
            console.error('❌ Error during analysis generation:', error.message);
            return this.previousAnalysisResult; // Return previous result on error as fallback
        }
    }

    parseResponseText(responseText, previousResult) {
        const structuredData = {
            summary: [],
            topic: { header: '', bullets: [] },
            extendedContext: '',
            actionItems: [],
            decisions: [],
            quiz: [],
            insights: {
                background: '',
                implications: '',
                risks: '',
                opportunities: ''
            },
            unresolvedItems: [],
            followUpQuestions: [],
            actions: [],
            followUps: this.DEFAULT_FOLLOW_UPS,
        };

        // Preserve previous result if available
        if (previousResult) {
            structuredData.topic.header = previousResult.topic.header || '';
            structuredData.summary = previousResult.summary ? [...previousResult.summary] : [];
        }

        try {
            const lines = responseText.split('\n');
            let currentSection = '';
            let currentQuizQuestion = null;
            let currentInsightType = null;

            for (const line of lines) {
                const trimmedLine = line.trim();

                // Section header detection
                if (trimmedLine.includes('📋 Summary Overview') || trimmedLine.startsWith('**Summary Overview**')) {
                    currentSection = 'summary-overview';
                    continue;
                } else if (trimmedLine.includes('🎯 Key Topic:') || trimmedLine.startsWith('**Key Topic:')) {
                    currentSection = 'topic';
                    const topicName = trimmedLine.match(/Key Topic:\s*(.+?)(?:\*\*)?$/)?.[1] || '';
                    if (topicName) {
                        structuredData.topic.header = topicName.trim();
                    }
                    continue;
                } else if (trimmedLine.includes('📝 Extended Context') || trimmedLine.startsWith('**Extended Context**')) {
                    currentSection = 'extended-context';
                    continue;
                } else if (trimmedLine.includes('✅ Action Items') || trimmedLine.startsWith('**Action Items**')) {
                    currentSection = 'action-items';
                    continue;
                } else if (trimmedLine.includes('🔍 Decisions Made') || trimmedLine.startsWith('**Decisions Made**')) {
                    currentSection = 'decisions';
                    continue;
                } else if (trimmedLine.includes('❓ Comprehension Quiz') || trimmedLine.startsWith('**Comprehension Quiz**')) {
                    currentSection = 'quiz';
                    continue;
                } else if (trimmedLine.includes('💡 Contextual Insights') || trimmedLine.startsWith('**Contextual Insights**')) {
                    currentSection = 'insights';
                    continue;
                } else if (trimmedLine.includes('❗ Unresolved Items') || trimmedLine.startsWith('**Unresolved Items**')) {
                    currentSection = 'unresolved';
                    continue;
                } else if (trimmedLine.includes('🔮 Suggested Follow-Up Questions') || trimmedLine.startsWith('**Suggested Follow-Up Questions**')) {
                    currentSection = 'follow-up-questions';
                    continue;
                }

                // Content parsing
                if (trimmedLine.startsWith('-') && currentSection === 'summary-overview') {
                    const summaryPoint = trimmedLine.substring(1).trim();
                    if (summaryPoint && !structuredData.summary.includes(summaryPoint)) {
                        structuredData.summary.unshift(summaryPoint);
                        if (structuredData.summary.length > 5) {
                            structuredData.summary.pop();
                        }
                    }
                } else if (trimmedLine.startsWith('-') && currentSection === 'topic') {
                    const bullet = trimmedLine.substring(1).trim();
                    if (bullet && structuredData.topic.bullets.length < 3) {
                        structuredData.topic.bullets.push(bullet);
                    }
                } else if (currentSection === 'extended-context' && trimmedLine && !trimmedLine.startsWith('**')) {
                    structuredData.extendedContext += (structuredData.extendedContext ? ' ' : '') + trimmedLine;
                } else if (currentSection === 'action-items' && (trimmedLine.startsWith('-') || trimmedLine.startsWith('- ['))) {
                    const actionMatch = trimmedLine.match(/^-\s*\[.\]\s*\*\*(.+?)\*\*\s*\|\s*Assigned to:\s*(.+?)\s*\|\s*Due:\s*(.+)$/);
                    if (actionMatch) {
                        structuredData.actionItems.push({
                            task: actionMatch[1].trim(),
                            assignedTo: actionMatch[2].trim(),
                            due: actionMatch[3].trim()
                        });
                    } else {
                        // Fallback for simpler format
                        const simpleAction = trimmedLine.replace(/^-\s*\[.\]\s*/, '').trim();
                        if (simpleAction) {
                            structuredData.actionItems.push({
                                task: simpleAction,
                                assignedTo: 'TBD',
                                due: 'TBD'
                            });
                        }
                    }
                } else if (currentSection === 'decisions' && trimmedLine.startsWith('-')) {
                    const decisionMatch = trimmedLine.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/);
                    if (decisionMatch) {
                        structuredData.decisions.push({
                            title: decisionMatch[1].trim(),
                            description: decisionMatch[2].trim()
                        });
                    } else {
                        const decision = trimmedLine.substring(1).trim();
                        if (decision) {
                            structuredData.decisions.push({
                                title: 'Decision',
                                description: decision
                            });
                        }
                    }
                } else if (currentSection === 'quiz') {
                    if (trimmedLine.match(/^\d+\.\s*\*\*Question\*\*/)) {
                        // New quiz question
                        const questionText = trimmedLine.replace(/^\d+\.\s*\*\*Question\*\*:\s*/, '').trim();
                        currentQuizQuestion = {
                            question: questionText,
                            options: [],
                            answer: ''
                        };
                        structuredData.quiz.push(currentQuizQuestion);
                    } else if (currentQuizQuestion && trimmedLine.match(/^\s*-\s*[a-d]\)/)) {
                        // Quiz option
                        const option = trimmedLine.replace(/^\s*-\s*/, '').trim();
                        currentQuizQuestion.options.push(option);
                    } else if (currentQuizQuestion && trimmedLine.startsWith('*Answer:')) {
                        // Quiz answer
                        currentQuizQuestion.answer = trimmedLine.replace(/^\*Answer:\s*/, '').replace(/\*$/, '').trim();
                    }
                } else if (currentSection === 'insights') {
                    if (trimmedLine.startsWith('- **Background**:')) {
                        currentInsightType = 'background';
                        structuredData.insights.background = trimmedLine.replace(/^- \*\*Background\*\*:\s*/, '').trim();
                    } else if (trimmedLine.startsWith('- **Implications**:')) {
                        currentInsightType = 'implications';
                        structuredData.insights.implications = trimmedLine.replace(/^- \*\*Implications\*\*:\s*/, '').trim();
                    } else if (trimmedLine.startsWith('- **Risks**:')) {
                        currentInsightType = 'risks';
                        structuredData.insights.risks = trimmedLine.replace(/^- \*\*Risks\*\*:\s*/, '').trim();
                    } else if (trimmedLine.startsWith('- **Opportunities**:')) {
                        currentInsightType = 'opportunities';
                        structuredData.insights.opportunities = trimmedLine.replace(/^- \*\*Opportunities\*\*:\s*/, '').trim();
                    }
                } else if (currentSection === 'unresolved' && trimmedLine.startsWith('-')) {
                    const item = trimmedLine.substring(1).trim();
                    if (item) {
                        structuredData.unresolvedItems.push(item);
                    }
                } else if (currentSection === 'follow-up-questions' && trimmedLine.match(/^\d+\./)) {
                    const question = trimmedLine.replace(/^\d+\.\s*/, '').trim();
                    if (question) {
                        structuredData.followUpQuestions.push(question);
                    }
                }
            }

            // Build actions array from parsed data
            structuredData.actions = [];

            // Add action items
            structuredData.actionItems.slice(0, 3).forEach(item => {
                structuredData.actions.push(`✅ ${item.task}`);
            });

            // Add follow-up questions
            structuredData.followUpQuestions.slice(0, 2).forEach(q => {
                structuredData.actions.push(`❓ ${q}`);
            });

            // Add default actions if empty
            if (structuredData.actions.length === 0) {
                structuredData.actions.push('✨ What should I say next?', '💬 Suggest follow-up questions');
            }

            // Limit to 5 actions
            structuredData.actions = structuredData.actions.slice(0, 5);

            // Validation and fallback to previous data
            if (structuredData.summary.length === 0 && previousResult) {
                structuredData.summary = previousResult.summary || [];
            }
            if (structuredData.topic.bullets.length === 0 && previousResult) {
                structuredData.topic.bullets = previousResult.topic.bullets || [];
            }
        } catch (error) {
            console.error('❌ Error parsing response text:', error);
            return (
                previousResult || {
                    summary: [],
                    topic: { header: 'Analysis in progress', bullets: [] },
                    extendedContext: '',
                    actionItems: [],
                    decisions: [],
                    quiz: [],
                    insights: { background: '', implications: '', risks: '', opportunities: '' },
                    unresolvedItems: [],
                    followUpQuestions: [],
                    actions: ['✨ What should I say next?', '💬 Suggest follow-up questions'],
                    followUps: this.DEFAULT_FOLLOW_UPS,
                }
            );
        }

        // Fix MEDIUM BUG-M1: Only log full data in debug mode to avoid log pollution
        if (process.env.LOG_LEVEL === 'debug') {
            console.log('📊 Final structured data:', JSON.stringify(structuredData, null, 2));
        } else {
            console.log(`📊 Structured data created: ${structuredData.summary.length} summary points, ${structuredData.actionItems.length} actions`);
        }
        return structuredData;
    }

    /**
     * Triggers analysis when conversation history reaches 5 texts.
     */
    async triggerAnalysisIfNeeded() {
        if (this.conversationHistory.length >= 5 && this.conversationHistory.length % 5 === 0) {
            console.log(`Triggering analysis - ${this.conversationHistory.length} conversation texts accumulated`);

            const data = await this.makeOutlineAndRequests(this.conversationHistory);
            if (data) {
                console.log('Sending structured data to renderer');
                this.sendToRenderer('summary-update', data);
                
                // Notify callback
                if (this.onAnalysisComplete) {
                    this.onAnalysisComplete(data);
                }
            } else {
                console.log('No analysis data returned');
            }
        }
    }

    getCurrentAnalysisData() {
        return {
            previousResult: this.previousAnalysisResult,
            history: this.analysisHistory,
            conversationLength: this.conversationHistory.length,
        };
    }
}

module.exports = SummaryService; 