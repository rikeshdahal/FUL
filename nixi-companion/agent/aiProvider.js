/*
  Pluggable AI provider abstraction.

  Credentials stay in the Electron main process. The renderer and the model
  never receive the API key. Supported providers:
    - gemini (default, existing project key)
    - openai-compatible (any /chat/completions endpoint)
    - ollama (local)
*/
'use strict';

const safety = require('./safetyPolicy');

function stripFences(text) {
  return String(text || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

class GeminiProvider {
  constructor(getConfig) {
    this.getConfig = getConfig;
    this.name = 'gemini';
  }

  get key() {
    const cfg = this.getConfig() || {};
    return cfg.agentApiKey || cfg.key || cfg.apiKey || '';
  }

  get model() {
    const cfg = this.getConfig() || {};
    return cfg.agentModel || cfg.model || 'gemini-2.5-flash';
  }

  async generate({ system, prompt, json = false, temperature = 0.4, maxTokens = 4096, timeoutMs = 60000 }) {
    const key = this.key;
    if (!key) return { ok: false, error: 'No Gemini API key is configured. Add one in Settings → AI model.' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(key)}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(json ? { responseMimeType: 'application/json' } : {})
        }
      };
      if (system) payload.systemInstruction = { parts: [{ text: system }] };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, error: safety.redactSecrets(data?.error?.message || `HTTP ${res.status}`), status: res.status };
      }
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
      if (!text.trim()) return { ok: false, error: 'The model returned an empty response.' };
      return { ok: true, text, model: this.model, provider: this.name };
    } catch (e) {
      return { ok: false, error: e.name === 'AbortError' ? 'The model request timed out.' : safety.redactSecrets(e.message) };
    } finally {
      clearTimeout(timer);
    }
  }
}

class OpenAICompatibleProvider {
  constructor(getConfig) {
    this.getConfig = getConfig;
    this.name = 'openai-compatible';
  }

  get config() {
    const cfg = this.getConfig() || {};
    return {
      key: cfg.agentApiKey || '',
      model: cfg.agentModel || 'gpt-4o-mini',
      baseUrl: (cfg.agentBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    };
  }

  async generate({ system, prompt, json = false, temperature = 0.4, maxTokens = 4096, timeoutMs = 60000 }) {
    const { key, model, baseUrl } = this.config;
    if (!key) return { ok: false, error: 'No API key is configured for the OpenAI-compatible provider.' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: safety.redactSecrets(data?.error?.message || `HTTP ${res.status}`), status: res.status };
      const text = data?.choices?.[0]?.message?.content || '';
      if (!text.trim()) return { ok: false, error: 'The model returned an empty response.' };
      return { ok: true, text, model, provider: this.name };
    } catch (e) {
      return { ok: false, error: e.name === 'AbortError' ? 'The model request timed out.' : safety.redactSecrets(e.message) };
    } finally {
      clearTimeout(timer);
    }
  }
}

class OllamaProvider {
  constructor(getConfig) {
    this.getConfig = getConfig;
    this.name = 'ollama';
  }

  get config() {
    const cfg = this.getConfig() || {};
    return {
      model: cfg.agentModel || 'llama3.2',
      baseUrl: (cfg.agentBaseUrl || 'http://127.0.0.1:11434').replace(/\/$/, '')
    };
  }

  async generate({ system, prompt, json = false, temperature = 0.4, timeoutMs = 120000 }) {
    const { model, baseUrl } = this.config;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(baseUrl + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature },
          format: json ? 'json' : undefined,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: `Ollama HTTP ${res.status}`, status: res.status };
      const text = data?.message?.content || '';
      if (!text.trim()) return { ok: false, error: 'Ollama returned an empty response.' };
      return { ok: true, text, model, provider: this.name };
    } catch (e) {
      return { ok: false, error: e.name === 'AbortError' ? 'Ollama request timed out.' : safety.redactSecrets(e.message) };
    } finally {
      clearTimeout(timer);
    }
  }
}

class ProviderRegistry {
  constructor(getConfig) {
    this.getConfig = getConfig;
    this.providers = {
      gemini: new GeminiProvider(getConfig),
      openai: new OpenAICompatibleProvider(getConfig),
      ollama: new OllamaProvider(getConfig)
    };
  }

  current() {
    const cfg = this.getConfig() || {};
    const name = String(cfg.agentProvider || 'gemini').toLowerCase();
    if (name === 'openai' || name === 'openai-compatible') return this.providers.openai;
    if (name === 'ollama' || name === 'local') return this.providers.ollama;
    return this.providers.gemini;
  }

  async generate(opts) {
    return this.current().generate(opts);
  }

  async generateJson(opts) {
    const result = await this.current().generate({ ...opts, json: true, temperature: opts.temperature == null ? 0.2 : opts.temperature });
    if (!result.ok) return result;
    try {
      return { ...result, data: JSON.parse(stripFences(result.text)) };
    } catch (e) {
      return { ok: false, error: `The model did not return valid JSON: ${e.message}`, raw: result.text.slice(0, 2000) };
    }
  }

  status() {
    const cfg = this.getConfig() || {};
    const provider = this.current();
    const key = provider.name === 'gemini'
      ? (cfg.agentApiKey || cfg.key || cfg.apiKey || '')
      : (cfg.agentApiKey || '');
    return {
      provider: provider.name,
      model: provider.model,
      configured: provider.name === 'ollama' ? true : !!key
    };
  }
}

module.exports = { ProviderRegistry, GeminiProvider, OpenAICompatibleProvider, OllamaProvider, stripFences };
