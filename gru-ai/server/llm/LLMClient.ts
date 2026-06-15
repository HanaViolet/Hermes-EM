export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface LLMChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export class LLMClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: LLMConfig = {}) {
    this.baseUrl = (config.baseUrl ?? process.env.LLM_BASE_URL ?? 'http://maas.icompify.com:32788/v1').replace(/\/$/, '');
    this.apiKey = config.apiKey ?? process.env.LLM_API_KEY ?? '';
    this.model = config.model ?? process.env.LLM_MODEL ?? 'gpt-4o-mini';
    this.maxTokens = config.maxTokens ?? Number(process.env.LLM_MAX_TOKENS ?? 512);
    this.temperature = config.temperature ?? Number(process.env.LLM_TEMPERATURE ?? 0.7);
    this.timeoutMs = config.timeoutMs ?? Number(process.env.LLM_TIMEOUT_MS ?? 15_000);
    this.maxRetries = config.maxRetries ?? Number(process.env.LLM_MAX_RETRIES ?? 2);
  }

  async chat(messages: LLMMessage[], options: LLMChatOptions = {}): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model: options.model ?? this.model,
      messages,
      max_tokens: options.maxTokens ?? this.maxTokens,
      temperature: options.temperature ?? this.temperature,
    };

    let lastError: Error | undefined;
    const attempts = Math.max(1, this.maxRetries + 1);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`LLM API ${response.status}: ${text.slice(0, 200)}`);
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        };

        if (data.error?.message) {
          throw new Error(`LLM API error: ${data.error.message}`);
        }

        const content = data.choices?.[0]?.message?.content ?? '';
        if (content === '') {
          throw new Error('LLM API returned empty content');
        }
        return content;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < attempts - 1) {
          await sleep(500 * 2 ** attempt);
        }
      }
    }
    throw lastError ?? new Error('LLM request failed');
  }

  private fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    return fetch(url, { ...init, signal: controller.signal })
      .finally(() => clearTimeout(timeout));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
