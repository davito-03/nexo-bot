import { config } from "../../config.js";
import { logger } from "../../logger.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiResult {
  text: string;
  provider: string;
  model: string;
}

const coolUntil = new Map<string, number>();

function ready(id: string): boolean {
  return (coolUntil.get(id) ?? 0) <= Date.now();
}

function cool(id: string, ms: number): void {
  coolUntil.set(id, Date.now() + ms);
}

function isRateLimit(status: number, body: string): boolean {
  const t = body.toLowerCase();
  return status === 429 || t.includes("resource_exhausted") || t.includes("rate limit") || t.includes("quota");
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs = 14_000,
): Promise<{ status: number; json: Record<string, unknown>; raw: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const raw = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      json = {};
    }
    return { status: res.status, json, raw };
  } finally {
    clearTimeout(t);
  }
}

function openaiMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

async function openaiCompat(opts: {
  id: string;
  url: string;
  key?: string | null;
  model: string;
  messages: ChatMessage[];
  extraHeaders?: Record<string, string>;
  maxTokens?: number;
}): Promise<string | null> {
  if (!ready(opts.id)) return null;
  try {
    const { status, json, raw } = await postJson(
      opts.url,
      { ...(opts.key ? { Authorization: `Bearer ${opts.key}` } : {}), ...(opts.extraHeaders ?? {}) },
      {
        model: opts.model,
        messages: openaiMessages(opts.messages),
        max_tokens: opts.maxTokens ?? 700,
        temperature: 0.6,
      },
    );
    if (status >= 400) {
      if (isRateLimit(status, raw)) cool(opts.id, 90_000);
      else cool(opts.id, 20_000);
      logger.warn("IA", opts.id, status, raw.slice(0, 180));
      return null;
    }
    const choices = json.choices as { message?: { content?: string } }[] | undefined;
    const text = choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    logger.warn("IA timeout/error", opts.id, (err as Error).message);
    cool(opts.id, 15_000);
    return null;
  }
}

function geminiContents(messages: ChatMessage[]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  const contents = rest.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  return { system, contents };
}

async function geminiGenerate(key: string, model: string, messages: ChatMessage[]): Promise<string | null> {
  const id = `gemini:${key.slice(-6)}:${model}`;
  if (!ready(id) || !ready(`gemini-key:${key.slice(-6)}`)) return null;
  const { system, contents } = geminiContents(messages);
  try {
    const { status, json, raw } = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {},
      {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 700, temperature: 0.6 },
      },
    );
    if (status >= 400) {
      if (isRateLimit(status, raw)) {
        cool(id, 120_000);
        cool(`gemini-key:${key.slice(-6)}`, 120_000);
      } else cool(id, 20_000);
      logger.warn("IA", id, status, raw.slice(0, 180));
      return null;
    }
    const cands = json.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
    const text = cands?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return text || null;
  } catch (err) {
    logger.warn("IA timeout/error", id, (err as Error).message);
    cool(id, 15_000);
    return null;
  }
}

async function cohereChat(messages: ChatMessage[]): Promise<string | null> {
  if (!config.cohereKey) return null;
  const id = "cohere:command-r";
  if (!ready(id)) return null;
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  try {
    const { status, json, raw } = await postJson(
      "https://api.cohere.com/v2/chat",
      { Authorization: `Bearer ${config.cohereKey}` },
      {
        model: "command-r-08-2024",
        messages: rest.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        preamble: system || undefined,
        max_tokens: 700,
      },
    );
    if (status >= 400) {
      if (isRateLimit(status, raw)) cool(id, 90_000);
      else cool(id, 20_000);
      logger.warn("IA", id, status, raw.slice(0, 180));
      return null;
    }
    const msg = json.message as { content?: { text?: string }[] } | undefined;
    const text = msg?.content?.map((c) => c.text ?? "").join("").trim();
    return text || null;
  } catch (err) {
    logger.warn("IA timeout/error", id, (err as Error).message);
    cool(id, 15_000);
    return null;
  }
}

async function cloudflareChat(messages: ChatMessage[]): Promise<string | null> {
  if (!config.cfToken || !config.cfAccountId) return null;
  const model = "@cf/meta/llama-3.1-8b-instruct";
  const id = `cf:${model}`;
  if (!ready(id)) return null;
  try {
    const { status, json, raw } = await postJson(
      `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/ai/run/${model}`,
      { Authorization: `Bearer ${config.cfToken}` },
      { messages: openaiMessages(messages) },
    );
    if (status >= 400) {
      if (isRateLimit(status, raw)) cool(id, 90_000);
      else cool(id, 20_000);
      logger.warn("IA", id, status, raw.slice(0, 180));
      return null;
    }
    const result = json.result as { response?: string } | undefined;
    const text = (result?.response ?? (json.response as string | undefined) ?? "").trim();
    return text || null;
  } catch (err) {
    logger.warn("IA timeout/error", id, (err as Error).message);
    cool(id, 15_000);
    return null;
  }
}

interface Attempt {
  provider: string;
  model: string;
  run: () => Promise<string | null>;
}

function buildAttempts(messages: ChatMessage[]): Attempt[] {
  const attempts: Attempt[] = [];

  if (config.localAiUrl) {
    attempts.push({
      provider: "local",
      model: config.localAiModel,
      run: () => openaiCompat({
        id: `local:${config.localAiModel}`,
        url: config.localAiUrl!.replace(/\/$/, "") + "/chat/completions",
        key: config.localAiKey,
        model: config.localAiModel,
        messages,
        maxTokens: 700,
      }),
    });
  }

  if (config.groqKey) {
    for (const model of ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "groq/compound-mini"]) {
      attempts.push({
        provider: "groq",
        model,
        run: () =>
          openaiCompat({
            id: `groq:${model}`,
            url: "https://api.groq.com/openai/v1/chat/completions",
            key: config.groqKey!,
            model,
            messages,
          }),
      });
    }
  }

  for (const key of config.geminiKeys) {
    for (const model of ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]) {
      attempts.push({
        provider: "gemini",
        model,
        run: () => geminiGenerate(key, model, messages),
      });
    }
  }

  if (config.openrouterKey) {
    for (const model of ["google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct", "openai/gpt-4o-mini"]) {
      attempts.push({
        provider: "openrouter",
        model,
        run: () =>
          openaiCompat({
            id: `openrouter:${model}`,
            url: "https://openrouter.ai/api/v1/chat/completions",
            key: config.openrouterKey!,
            model,
            messages,
            extraHeaders: {
              "HTTP-Referer": "https://nexo.local",
              "X-Title": "Nexo Discord Bot",
            },
          }),
      });
    }
  }

  if (config.cohereKey) {
    attempts.push({ provider: "cohere", model: "command-r-08-2024", run: () => cohereChat(messages) });
  }

  if (config.cfToken && config.cfAccountId) {
    attempts.push({ provider: "cloudflare", model: "@cf/meta/llama-3.1-8b-instruct", run: () => cloudflareChat(messages) });
  }

  if (config.openaiKey) {
    attempts.push({
      provider: "openai",
      model: "gpt-4o-mini",
      run: () =>
        openaiCompat({
          id: "openai:gpt-4o-mini",
          url: "https://api.openai.com/v1/chat/completions",
          key: config.openaiKey!,
          model: "gpt-4o-mini",
          messages,
        }),
    });
  }

  return attempts;
}

export function configuredProviders(): string[] {
  const out: string[] = [];
  if (config.localAiUrl) out.push(`Local (${config.localAiModel})`);
  if (config.groqKey) out.push("Groq");
  if (config.geminiKeys.length) out.push(`Gemini ×${config.geminiKeys.length}`);
  if (config.openrouterKey) out.push("OpenRouter");
  if (config.cohereKey) out.push("Cohere");
  if (config.cfToken && config.cfAccountId) out.push("Cloudflare");
  if (config.openaiKey) out.push("OpenAI mini");
  return out;
}

export function aiAvailable(): boolean {
  return configuredProviders().length > 0;
}

export async function completeChat(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<AiResult | null> {
  const payload: ChatMessage[] = [{ role: "system", content: opts.system }, ...opts.messages];
  for (const attempt of buildAttempts(payload)) {
    const text = await attempt.run();
    if (text) {
      logger.info(`IA ok · ${attempt.provider}/${attempt.model}`);
      return { text, provider: attempt.provider, model: attempt.model };
    }
  }
  logger.warn("IA: todos los proveedores fallaron");
  return null;
}
