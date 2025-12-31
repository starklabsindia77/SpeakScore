
import { db } from '../db';
import { AiConfigInput } from '@speakscore/shared';

type Provider = 'gemini' | 'openai' | 'claude';

interface ExtractionResult {
    name: string;
    email: string;
    phone?: string;
    skills: string[];
    rawText?: string;
}

export class AiService {
    private async getConfig(): Promise<AiConfigInput | null> {
        const setting = await db
            .selectFrom('platform_settings')
            .selectAll()
            .where('key', '=', 'ai_config')
            .executeTakeFirst();
        if (!setting?.value) return null;
        return typeof setting.value === 'string'
            ? JSON.parse(setting.value)
            : (setting.value as AiConfigInput);
    }

    async parseCV(text: string): Promise<ExtractionResult> {
        const config = await this.getConfig();
        if (!config) throw new Error('AI configuration not found');

        const prompt = `
      Extract the following details from the resume text below and return ONLY valid JSON:
      {
        "name": "Full Name",
        "email": "email@example.com",
        "phone": "Phone Number",
        "skills": ["Skill1", "Skill2"]
      }
      
      Resume Text:
      ${text.substring(0, 10000)}
    `;

        const result = await this.executeWithFailsafe(config, prompt);
        try {
            // Clean markdown code blocks if present
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('Failed to parse AI response:', result);
            throw new Error('Invalid AI response format');
        }
    }

    private async executeWithFailsafe(config: AiConfigInput, prompt: string): Promise<string> {
        const keys = config.apiKeys || [];
        if (keys.length === 0) throw new Error('No API keys configured');

        let lastError: any;
        for (const key of keys) {
            try {
                return await this.callProvider(config.provider, key, config, prompt);
            } catch (err) {
                console.warn(`AI request failed with key ending in ...${key.slice(-4)}:`, err);
                lastError = err;
                // Continue to next key
            }
        }
        throw lastError || new Error('All API keys failed');
    }

    private async callProvider(
        provider: Provider,
        apiKey: string,
        config: AiConfigInput,
        prompt: string
    ): Promise<string> {
        switch (provider) {
            case 'gemini':
                return this.callGemini(apiKey, config.model || 'gemini-1.5-pro', prompt);
            case 'openai':
                return this.callOpenAI(apiKey, config.model || 'gpt-4', prompt);
            case 'claude':
                return this.callClaude(apiKey, config.model || 'claude-3-opus-20240229', prompt);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.status} ${await response.text()}`);
        }

        const data = (await response.json()) as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    private async callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.status} ${await response.text()}`);
        }

        const data = (await response.json()) as any;
        return data.choices?.[0]?.message?.content || '';
    }

    private async callClaude(apiKey: string, model: string, prompt: string): Promise<string> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API Error: ${response.status} ${await response.text()}`);
        }

        const data = (await response.json()) as any;
        return data.content?.[0]?.text || '';
    }
}
