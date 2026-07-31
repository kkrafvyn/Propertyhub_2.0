import { HttpError } from "./http.ts";

export type AiProvider = "openai" | "qwen";
export type AiSource = AiProvider | "local";

type ChatMessage = { role: string; content: string };

type VisionContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type VisionMessage = { role: string; content: string | VisionContentPart[] };

type ChatCompletionOptions = {
  messages: ChatMessage[];
  temperature?: number;
  responseFormat?: "text" | "json_object";
};

type VisionCompletionOptions = {
  messages: VisionMessage[];
  temperature?: number;
  responseFormat?: "text" | "json_object";
};

const PROVIDER_CONFIG: Record<
  AiProvider,
  { defaultModel: string; defaultBaseUrl: string; apiKeyEnv: string; modelEnv: string }
> = {
  openai: {
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
  },
  qwen: {
    defaultModel: "qwen-plus",
    defaultBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "QWEN_API_KEY",
    modelEnv: "QWEN_MODEL",
  },
};

function normalizeProvider(value: string | undefined): AiProvider | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "openai" || normalized === "qwen") {
    return normalized;
  }
  return null;
}

/** Resolve active LLM provider from AI_PROVIDER or available API keys. */
export function resolveAiProvider(): AiProvider | null {
  const explicit = normalizeProvider(Deno.env.get("AI_PROVIDER"));
  const hasOpenAi = Boolean(Deno.env.get("OPENAI_API_KEY")?.trim());
  const hasQwen = Boolean(Deno.env.get("QWEN_API_KEY")?.trim());

  if (explicit) {
    if (explicit === "openai" && hasOpenAi) return "openai";
    if (explicit === "qwen" && hasQwen) return "qwen";
    return null;
  }

  if (hasOpenAi && !hasQwen) return "openai";
  if (hasQwen && !hasOpenAi) return "qwen";
  if (hasOpenAi && hasQwen) return "openai";

  return null;
}

export function isLlmConfigured(provider = resolveAiProvider()): boolean {
  return provider !== null;
}

function getProviderConfig(provider: AiProvider) {
  const config = PROVIDER_CONFIG[provider];
  const apiKey = Deno.env.get(config.apiKeyEnv)?.trim();
  if (!apiKey) return null;

  const model = Deno.env.get(config.modelEnv)?.trim() || config.defaultModel;
  const baseUrl = (
    provider === "qwen"
      ? Deno.env.get("QWEN_BASE_URL")?.trim() || config.defaultBaseUrl
      : Deno.env.get("OPENAI_BASE_URL")?.trim() || config.defaultBaseUrl
  ).replace(/\/$/, "");

  return { provider, apiKey, model, baseUrl };
}

/** OpenAI-compatible chat completion for OpenAI or Qwen (DashScope). */
export async function chatCompletion(options: ChatCompletionOptions): Promise<string | null> {
  const provider = resolveAiProvider();
  if (!provider) return null;

  const config = getProviderConfig(provider);
  if (!config) return null;

  const body: Record<string, unknown> = {
    model: config.model,
    temperature: options.temperature ?? 0.4,
    messages: options.messages,
  };

  if (options.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new HttpError(
      502,
      `${config.provider} request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : null;
}

function resolveVisionModel(provider: AiProvider, textModel: string) {
  if (provider === "openai") {
    if (textModel.includes("gpt-4o")) return textModel;
    return Deno.env.get("OPENAI_VISION_MODEL")?.trim() || "gpt-4o-mini";
  }

  return Deno.env.get("QWEN_VISION_MODEL")?.trim() || "qwen-vl-plus";
}

/** OpenAI-compatible vision chat completion for document OCR / image analysis. */
export async function visionChatCompletion(
  options: VisionCompletionOptions,
): Promise<string | null> {
  const provider = resolveAiProvider();
  if (!provider) return null;

  const config = getProviderConfig(provider);
  if (!config) return null;

  const body: Record<string, unknown> = {
    model: resolveVisionModel(provider, config.model),
    temperature: options.temperature ?? 0.2,
    messages: options.messages,
  };

  if (options.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new HttpError(
      502,
      `${config.provider} vision request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : null;
}

export function smartModeHint(): string {
  const provider = resolveAiProvider();
  if (provider === "qwen") {
    return "Add QWEN_API_KEY to unlock smarter responses — guided help works without a key.";
  }
  return "Add OPENAI_API_KEY to unlock smarter responses — guided help works without a key.";
}
